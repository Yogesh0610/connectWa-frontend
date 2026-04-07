"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  useCreateMetaAdMutation, useUploadMetaImageMutation,
  useGetMetaAdAccountsQuery, useGetMetaAdSetsQuery,
} from "@/src/redux/api/metaAdsApi";
import { Button } from "@/src/elements/ui/button";
import { Input } from "@/src/elements/ui/input";
import { Label } from "@/src/elements/ui/label";
import { Textarea } from "@/src/elements/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/elements/ui/select";
import CommonHeader from "@/src/shared/CommonHeader";
import { ImagePlus, Loader2, Save, X } from "lucide-react";
import { toast } from "sonner";

const CTA_OPTIONS = [
  { value: "LEARN_MORE",      label: "Learn More" },
  { value: "SIGN_UP",         label: "Sign Up" },
  { value: "CONTACT_US",      label: "Contact Us" },
  { value: "GET_QUOTE",       label: "Get Quote" },
  { value: "APPLY_NOW",       label: "Apply Now" },
  { value: "BOOK_TRAVEL",     label: "Book Now" },
  { value: "DOWNLOAD",        label: "Download" },
  { value: "GET_OFFER",       label: "Get Offer" },
  { value: "SUBSCRIBE",       label: "Subscribe" },
  { value: "WATCH_MORE",      label: "Watch More" },
];

const CreateMetaAd = ({ campaignId, adsetId }: { campaignId: string; adsetId: string }) => {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: accountsRes } = useGetMetaAdAccountsQuery();
  const { data: adsetRes } = useGetMetaAdSetsQuery({ campaign_id: campaignId });
  const [createAd, { isLoading }] = useCreateMetaAdMutation();
  const [uploadImage, { isLoading: isUploading }] = useUploadMetaImageMutation();

  const [form, setForm] = useState({
    name: "",
    ad_account_id: "",
    page_id: "",
    primary_text: "",
    headline: "",
    description: "",
    call_to_action: "LEARN_MORE",
    link_url: "",
    image_hash: "",
    image_preview: "",
  });

  const accounts = accountsRes?.data || [];
  const selectedAccount = accounts.find((a) => a._id === form.ad_account_id);
  const pages = selectedAccount?.meta_pages || [];

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!form.ad_account_id) { toast.error("Select an ad account first"); return; }

    const formData = new FormData();
    formData.append("image", file);
    formData.append("ad_account_id", form.ad_account_id);

    try {
      const res = await uploadImage(formData).unwrap();
      setForm((p) => ({ ...p, image_hash: res.data.hash, image_preview: res.data.url }));
      toast.success("Image uploaded");
    } catch {
      toast.error("Image upload failed");
    }
  };

  const handleSubmit = async () => {
    if (!form.name || !form.ad_account_id || !form.page_id || !form.primary_text || !form.headline) {
      toast.error("Name, account, page, text and headline are required");
      return;
    }
    try {
      await createAd({
        adset_id: adsetId,
        ad_account_id: form.ad_account_id,
        name: form.name,
        page_id: form.page_id,
        primary_text: form.primary_text,
        headline: form.headline,
        description: form.description,
        call_to_action: form.call_to_action,
        link_url: form.link_url,
        ...(form.image_hash && { image_hash: form.image_hash }),
      }).unwrap();
      toast.success("Ad created successfully");
      router.push(`/ads/meta/campaigns/${campaignId}/adsets/${adsetId}/ads`);
    } catch (e: unknown) {
      toast.error((e as { data?: { message?: string } })?.data?.message || "Failed to create ad");
    }
  };

  return (
    <div className="sm:p-8 p-4 space-y-6 max-w-2xl">
      <CommonHeader title="Create Ad" description="Create a new ad for your ad set" backBtn />

      <div className="bg-white dark:bg-(--card-color) rounded-xl border border-slate-100 dark:border-(--card-border-color) shadow-sm p-6 space-y-5">

        {/* Ad Name */}
        <div className="space-y-2">
          <Label>Ad Name <span className="text-red-500">*</span></Label>
          <Input placeholder="e.g. Summer Lead Ad - Image" value={form.name} onChange={(e) => set("name", e.target.value)} className="h-11" />
        </div>

        {/* Ad Account */}
        <div className="space-y-2">
          <Label>Ad Account <span className="text-red-500">*</span></Label>
          <Select value={form.ad_account_id} onValueChange={(v) => setForm((p) => ({ ...p, ad_account_id: v, page_id: "" }))}>
            <SelectTrigger className="h-11"><SelectValue placeholder="Select account" /></SelectTrigger>
            <SelectContent>
              {accounts.map((a) => <SelectItem key={a._id} value={a._id}>{a.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Facebook Page */}
        <div className="space-y-2">
          <Label>Facebook Page <span className="text-red-500">*</span></Label>
          <Select value={form.page_id} onValueChange={(v) => set("page_id", v)} disabled={!pages.length}>
            <SelectTrigger className="h-11"><SelectValue placeholder={pages.length ? "Select page" : "Select account first"} /></SelectTrigger>
            <SelectContent>
              {pages.map((p) => <SelectItem key={p.page_id} value={p.page_id}>{p.page_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Image Upload */}
        <div className="space-y-2">
          <Label>Ad Image</Label>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          {form.image_preview ? (
            <div className="relative w-full h-48 rounded-lg overflow-hidden border border-slate-200 dark:border-(--card-border-color)">
              <img src={form.image_preview} alt="Ad preview" className="w-full h-full object-cover" />
              <Button variant="ghost" size="sm" className="absolute top-2 right-2 h-7 w-7 p-0 bg-white/80 hover:bg-white rounded-full"
                onClick={() => setForm((p) => ({ ...p, image_hash: "", image_preview: "" }))}>
                <X size={12} />
              </Button>
            </div>
          ) : (
            <button onClick={() => fileRef.current?.click()} disabled={isUploading}
              className="w-full h-32 rounded-lg border-2 border-dashed border-slate-200 dark:border-(--card-border-color) flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-blue-400 hover:text-blue-400 transition-colors">
              {isUploading ? <Loader2 size={20} className="animate-spin" /> : <ImagePlus size={20} />}
              <span className="text-xs">{isUploading ? "Uploading..." : "Click to upload image"}</span>
            </button>
          )}
        </div>

        {/* Primary Text */}
        <div className="space-y-2">
          <Label>Primary Text <span className="text-red-500">*</span></Label>
          <Textarea placeholder="Main ad copy that appears above the image..." value={form.primary_text}
            onChange={(e) => set("primary_text", e.target.value)} rows={3} className="resize-none" />
        </div>

        {/* Headline */}
        <div className="space-y-2">
          <Label>Headline <span className="text-red-500">*</span></Label>
          <Input placeholder="e.g. Get a Free Quote Today" value={form.headline} onChange={(e) => set("headline", e.target.value)} className="h-11" />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label>Description</Label>
          <Input placeholder="Optional supporting text below headline" value={form.description} onChange={(e) => set("description", e.target.value)} className="h-11" />
        </div>

        {/* CTA */}
        <div className="space-y-2">
          <Label>Call to Action</Label>
          <Select value={form.call_to_action} onValueChange={(v) => set("call_to_action", v)}>
            <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CTA_OPTIONS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Link URL */}
        <div className="space-y-2">
          <Label>Destination URL</Label>
          <Input placeholder="https://yourwebsite.com/landing-page" value={form.link_url} onChange={(e) => set("link_url", e.target.value)} className="h-11" />
        </div>

        <Button onClick={handleSubmit} disabled={isLoading || isUploading}
          className="h-11 px-6 gap-2 font-bold bg-blue-600 hover:bg-blue-700 text-white">
          {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Create Ad
        </Button>
      </div>
    </div>
  );
};

export default CreateMetaAd;
