"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  useCreateMetaAdMutation,
  useUploadMetaImageMutation,
  useGetMetaAdAccountsQuery,
  useGetMetaAdSetsQuery,
  useGetMetaLeadFormsQuery,
} from "@/src/redux/api/metaAdsApi";
import { Button } from "@/src/elements/ui/button";
import { Input } from "@/src/elements/ui/input";
import { Label } from "@/src/elements/ui/label";
import { Textarea } from "@/src/elements/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/elements/ui/select";
import CommonHeader from "@/src/shared/CommonHeader";
import { Image, ImagePlus, Info, Loader2, Play, Save, X, LayoutGrid } from "lucide-react";
import { toast } from "sonner";

// ─────────────────────────────────────────────────────────────────────────────
// Meta Ad Formats
// Reference: Meta Marketing API — Ad Creative spec
// ─────────────────────────────────────────────────────────────────────────────

const AD_FORMATS = [
  { value: "SINGLE_IMAGE", label: "Single Image",  icon: Image,      desc: "One image with headline, text, and CTA" },
  { value: "SINGLE_VIDEO", label: "Single Video",  icon: Play,       desc: "Video with caption and CTA" },
  { value: "CAROUSEL",     label: "Carousel",      icon: LayoutGrid, desc: "2–10 scrollable cards, each with own image/link" },
  { value: "LEAD_GEN",     label: "Lead Form",     icon: ImagePlus,  desc: "Instant form inside Facebook — no landing page needed" },
];

// ─── CTA options ──────────────────────────────────────────────────────────────
// Full list of valid call_to_action types per Meta API
const ALL_CTA = [
  { value: "LEARN_MORE",         label: "Learn More" },
  { value: "SIGN_UP",            label: "Sign Up" },
  { value: "CONTACT_US",         label: "Contact Us" },
  { value: "GET_QUOTE",          label: "Get Quote" },
  { value: "APPLY_NOW",          label: "Apply Now" },
  { value: "BOOK_TRAVEL",        label: "Book Now" },
  { value: "DOWNLOAD",           label: "Download" },
  { value: "GET_OFFER",          label: "Get Offer" },
  { value: "SUBSCRIBE",          label: "Subscribe" },
  { value: "WATCH_MORE",         label: "Watch More" },
  { value: "SHOP_NOW",           label: "Shop Now" },
  { value: "ORDER_NOW",          label: "Order Now" },
  { value: "GET_DIRECTIONS",     label: "Get Directions" },
  { value: "CALL_NOW",           label: "Call Now" },
  { value: "MESSAGE_PAGE",       label: "Send Message" },
  { value: "WHATSAPP_MESSAGE",   label: "Send WhatsApp Message" },
  { value: "OPEN_LINK",          label: "Open Link" },
  { value: "SEE_MORE",           label: "See More" },
  { value: "LISTEN_NOW",         label: "Listen Now" },
  { value: "PLAY_GAME",          label: "Play Game" },
  { value: "REQUEST_TIME",       label: "Request Time" },
  { value: "GET_SHOWTIMES",      label: "Get Showtimes" },
  { value: "INSTALL_MOBILE_APP", label: "Install App" },
  { value: "USE_MOBILE_APP",     label: "Open App" },
  { value: "INSTALL_APP",        label: "Install Desktop App" },
];

// CTA values valid for Lead Gen format
const LEAD_GEN_CTA = [
  { value: "SIGN_UP",    label: "Sign Up" },
  { value: "SUBSCRIBE",  label: "Subscribe" },
  { value: "APPLY_NOW",  label: "Apply Now" },
  { value: "GET_QUOTE",  label: "Get Quote" },
  { value: "CONTACT_US", label: "Contact Us" },
  { value: "LEARN_MORE", label: "Learn More" },
];

// ─── Types ────────────────────────────────────────────────────────────────────
type CarouselCard = {
  headline: string;
  description: string;
  link_url: string;
  image_hash: string;
  image_preview: string;
  call_to_action: string;
};

const emptyCard = (): CarouselCard => ({
  headline: "", description: "", link_url: "",
  image_hash: "", image_preview: "", call_to_action: "LEARN_MORE",
});

// ─── Component ────────────────────────────────────────────────────────────────
const CreateMetaAd = ({ campaignId, adsetId }: { campaignId: string; adsetId: string }) => {
  const router = useRouter();
  const fileRef    = useRef<HTMLInputElement>(null);
  const cardRefs   = useRef<(HTMLInputElement | null)[]>([]);

  const { data: accountsRes } = useGetMetaAdAccountsQuery();
  useGetMetaAdSetsQuery({ campaign_id: campaignId }); // preload adsets cache
  const [createAd,     { isLoading }]   = useCreateMetaAdMutation();
  const [uploadImage,  { isLoading: isUploading }] = useUploadMetaImageMutation();

  const [form, setForm] = useState({
    name:               "",
    ad_account_id:      "",
    page_id:            "",
    instagram_actor_id: "",   // optional — enables Instagram placement
    format:             "SINGLE_IMAGE",
    primary_text:       "",
    headline:           "",
    description:        "",
    call_to_action:     "LEARN_MORE",
    link_url:           "",
    image_hash:         "",
    image_preview:      "",
    video_id:           "",
    lead_gen_form_id:   "",
    status:             "PAUSED",
  });
  const [cards, setCards] = useState<CarouselCard[]>([emptyCard(), emptyCard()]);
  const [uploadingCard, setUploadingCard] = useState<number | null>(null);

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const accounts       = accountsRes?.data || [];
  const selectedAcc    = accounts.find(a => a._id === form.ad_account_id);
  const pages          = selectedAcc?.meta_pages || [];
  const selectedPage   = pages.find(p => p.page_id === form.page_id);
  const igActors       = selectedPage?.instagram_actor_id
    ? [{ id: selectedPage.instagram_actor_id, label: `@${selectedPage.page_name} (Instagram)` }]
    : [];

  // Lead forms — only fetch when page is selected and format is LEAD_GEN
  const { data: leadFormsRes } = useGetMetaLeadFormsQuery(
    { ad_account_id: form.ad_account_id, page_id: form.page_id },
    { skip: !form.ad_account_id || !form.page_id || form.format !== "LEAD_GEN" }
  );
  const leadForms = leadFormsRes?.data || [];

  const ctaOptions = form.format === "LEAD_GEN" ? LEAD_GEN_CTA : ALL_CTA;

  // ── Image upload (main) ──────────────────────────────────────────────────
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!form.ad_account_id) { toast.error("Select an ad account first"); return; }
    const fd = new FormData();
    fd.append("image", file);
    fd.append("ad_account_id", form.ad_account_id);
    try {
      const res = await uploadImage(fd).unwrap();
      setForm(p => ({ ...p, image_hash: res.data.hash, image_preview: res.data.url }));
      toast.success("Image uploaded");
    } catch { toast.error("Image upload failed"); }
  };

  // ── Carousel card image upload ───────────────────────────────────────────
  const handleCardImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, idx: number) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!form.ad_account_id) { toast.error("Select an ad account first"); return; }
    setUploadingCard(idx);
    const fd = new FormData();
    fd.append("image", file);
    fd.append("ad_account_id", form.ad_account_id);
    try {
      const res = await uploadImage(fd).unwrap();
      setCards(prev => prev.map((c, i) => i === idx
        ? { ...c, image_hash: res.data.hash, image_preview: res.data.url }
        : c));
      toast.success(`Card ${idx + 1} image uploaded`);
    } catch { toast.error(`Card ${idx + 1} image upload failed`); }
    finally { setUploadingCard(null); }
  };

  const addCard    = () => setCards(p => [...p, emptyCard()]);
  const removeCard = (i: number) => setCards(p => p.filter((_, idx) => idx !== i));
  const setCard    = (i: number, k: keyof CarouselCard, v: string) =>
    setCards(p => p.map((c, idx) => idx === i ? { ...c, [k]: v } : c));

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!form.name.trim())      { toast.error("Ad name is required"); return; }
    if (!form.ad_account_id)    { toast.error("Select an ad account"); return; }
    if (!form.page_id)          { toast.error("Select a Facebook Page"); return; }
    if (!form.primary_text.trim()) { toast.error("Primary text (ad copy) is required"); return; }

    if (form.format === "SINGLE_IMAGE" && !form.image_hash) {
      toast.error("Upload an image for Single Image ads");
      return;
    }
    if (form.format === "SINGLE_VIDEO" && !form.video_id.trim()) {
      toast.error("Enter a Video ID for Single Video ads");
      return;
    }
    if (form.format === "LEAD_GEN" && !form.lead_gen_form_id) {
      toast.error("Select a Lead Form");
      return;
    }
    if (form.format === "CAROUSEL") {
      if (cards.length < 2) { toast.error("Carousel requires at least 2 cards"); return; }
      if (cards.some(c => !c.image_hash)) { toast.error("Upload images for all carousel cards"); return; }
      if (cards.some(c => !c.headline.trim())) { toast.error("All carousel cards need a headline"); return; }
    }

    // Build payload — flat, matching what the backend service expects
    const payload: Record<string, unknown> = {
      adset_id:           adsetId,
      ad_account_id:      form.ad_account_id,
      name:               form.name,
      format:             form.format,
      status:             form.status,
      page_id:            form.page_id,
      primary_text:       form.primary_text,
      headline:           form.headline,
      description:        form.description || undefined,
      call_to_action:     form.call_to_action,
      ...(form.instagram_actor_id && { instagram_actor_id: form.instagram_actor_id }),
    };

    if (form.format === "SINGLE_IMAGE") {
      payload.image_hash = form.image_hash;
      payload.link_url   = form.link_url;
    } else if (form.format === "SINGLE_VIDEO") {
      payload.video_id = form.video_id;
      payload.link_url = form.link_url;
    } else if (form.format === "LEAD_GEN") {
      payload.image_hash        = form.image_hash || undefined;
      payload.lead_gen_form_id  = form.lead_gen_form_id;
    } else if (form.format === "CAROUSEL") {
      payload.link_url      = form.link_url;
      payload.carousel_cards = cards.map(c => ({
        image_hash:    c.image_hash,
        headline:      c.headline,
        description:   c.description,
        link_url:      c.link_url || form.link_url,
        call_to_action: c.call_to_action,
      }));
    }

    try {
      await createAd(payload).unwrap();
      toast.success("Ad created successfully!");
      router.push(`/ads/meta/campaigns/${campaignId}/adsets/${adsetId}/ads`);
    } catch (e: unknown) {
      toast.error((e as { data?: { message?: string } })?.data?.message || "Failed to create ad");
    }
  };

  return (
    <div className="sm:p-8 p-4 space-y-5">
      <CommonHeader
        title="Create Ad"
        description="Build your Facebook / Instagram ad creative"
        backBtn
        rightContent={
          <Button onClick={handleSubmit} disabled={isLoading || isUploading}
            className="h-11 px-6 gap-2 font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
            {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Create Ad
          </Button>
        }
      />

      <div className="max-w-2xl space-y-5">

        {/* ── Basic ──────────────────────────────────────────────────────── */}
        <Section title="Basic Info">
          <Field label="Ad Name *">
            <Input placeholder="e.g. Summer Lead Gen - Image - India"
              value={form.name} onChange={e => set("name", e.target.value)}
              className="h-10 bg-slate-50/50 dark:border-none border-slate-200 rounded-lg" />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Ad Account *">
              <Select value={form.ad_account_id}
                onValueChange={v => setForm(p => ({ ...p, ad_account_id: v, page_id: "", instagram_actor_id: "", lead_gen_form_id: "" }))}>
                <SelectTrigger className="h-10 bg-slate-50/50 dark:border-none border-slate-200 rounded-lg">
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent className="dark:bg-(--card-color) dark:border-(--card-border-color)">
                  {accounts.map(a => <SelectItem key={a._id} value={a._id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Facebook Page *">
              <Select value={form.page_id}
                onValueChange={v => setForm(p => ({ ...p, page_id: v, instagram_actor_id: "", lead_gen_form_id: "" }))}
                disabled={!pages.length}>
                <SelectTrigger className="h-10 bg-slate-50/50 dark:border-none border-slate-200 rounded-lg">
                  <SelectValue placeholder={pages.length ? "Select page" : "Select account first"} />
                </SelectTrigger>
                <SelectContent className="dark:bg-(--card-color) dark:border-(--card-border-color)">
                  {pages.map(p => <SelectItem key={p.page_id} value={p.page_id}>{p.page_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </div>

          {/* Instagram placement (optional) */}
          {igActors.length > 0 && (
            <Field label="Instagram Account (optional)">
              <Select value={form.instagram_actor_id} onValueChange={v => set("instagram_actor_id", v)}>
                <SelectTrigger className="h-10 bg-slate-50/50 dark:border-none border-slate-200 rounded-lg">
                  <SelectValue placeholder="None — Facebook only" />
                </SelectTrigger>
                <SelectContent className="dark:bg-(--card-color) dark:border-(--card-border-color)">
                  <SelectItem value="">None — Facebook only</SelectItem>
                  {igActors.map(a => <SelectItem key={a.id} value={a.id}>{a.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-1">
                <Info size={10} /> Selecting this enables Instagram placement for the ad.
              </p>
            </Field>
          )}

          <Field label="Status">
            <Select value={form.status} onValueChange={v => set("status", v)}>
              <SelectTrigger className="h-10 bg-slate-50/50 dark:border-none border-slate-200 rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="dark:bg-(--card-color) dark:border-(--card-border-color)">
                <SelectItem value="PAUSED">Paused (recommended — review before activating)</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </Section>

        {/* ── Format ─────────────────────────────────────────────────────── */}
        <Section title="Ad Format">
          <div className="grid grid-cols-2 gap-3">
            {AD_FORMATS.map(f => {
              const Icon = f.icon;
              return (
                <button key={f.value} onClick={() => set("format", f.value)}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${form.format === f.value
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                    : "border-slate-200 dark:border-(--card-border-color) hover:border-blue-300"}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Icon size={14} className={form.format === f.value ? "text-blue-600" : "text-slate-400"} />
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{f.label}</p>
                  </div>
                  <p className="text-[10px] text-slate-400">{f.desc}</p>
                </button>
              );
            })}
          </div>
        </Section>

        {/* ── Ad Copy ────────────────────────────────────────────────────── */}
        <Section title="Ad Copy">
          <Field label="Primary Text *">
            <Textarea placeholder="Main copy shown above the image/video (125 chars recommended)"
              value={form.primary_text} onChange={e => set("primary_text", e.target.value)}
              rows={3} className="resize-none bg-slate-50/50 dark:border-none border-slate-200 rounded-lg" />
            <p className="text-[11px] text-slate-400 mt-1">{form.primary_text.length} / 125 recommended</p>
          </Field>

          {form.format !== "CAROUSEL" && (
            <>
              <Field label={`Headline${form.format !== "LEAD_GEN" ? " *" : ""}`}>
                <Input placeholder="Short, punchy headline (40 chars recommended)"
                  value={form.headline} onChange={e => set("headline", e.target.value)}
                  className="h-10 bg-slate-50/50 dark:border-none border-slate-200 rounded-lg" />
                <p className="text-[11px] text-slate-400 mt-1">{form.headline.length} / 40 recommended</p>
              </Field>

              <Field label="Description (optional)">
                <Input placeholder="Supporting text below headline (30 chars recommended)"
                  value={form.description} onChange={e => set("description", e.target.value)}
                  className="h-10 bg-slate-50/50 dark:border-none border-slate-200 rounded-lg" />
              </Field>
            </>
          )}

          <Field label="Call to Action">
            <Select value={form.call_to_action} onValueChange={v => set("call_to_action", v)}>
              <SelectTrigger className="h-10 bg-slate-50/50 dark:border-none border-slate-200 rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="dark:bg-(--card-color) dark:border-(--card-border-color)">
                {ctaOptions.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </Section>

        {/* ── Media & Destination ────────────────────────────────────────── */}
        {form.format === "SINGLE_IMAGE" && (
          <Section title="Image & Destination">
            <ImageUploadField
              label="Ad Image *"
              preview={form.image_preview}
              uploading={isUploading}
              fileRef={fileRef}
              onPickFile={() => fileRef.current?.click()}
              onClear={() => setForm(p => ({ ...p, image_hash: "", image_preview: "" }))}
              onChange={handleImageUpload}
              hint="Recommended: 1200×628px, JPG/PNG, max 30 MB. Ratio 1.91:1 for Feed."
            />
            <Field label="Destination URL">
              <Input placeholder="https://yoursite.com/landing-page"
                value={form.link_url} onChange={e => set("link_url", e.target.value)}
                className="h-10 bg-slate-50/50 dark:border-none border-slate-200 rounded-lg" />
            </Field>
          </Section>
        )}

        {form.format === "SINGLE_VIDEO" && (
          <Section title="Video & Destination">
            <Field label="Video ID *">
              <Input placeholder="Meta video ID (upload via Meta Business Manager)"
                value={form.video_id} onChange={e => set("video_id", e.target.value)}
                className="h-10 bg-slate-50/50 dark:border-none border-slate-200 rounded-lg" />
              <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-1">
                <Info size={10} /> Upload video in Meta Business Suite → Creative Hub, then copy the Video ID.
              </p>
            </Field>
            <Field label="Destination URL">
              <Input placeholder="https://yoursite.com/landing-page"
                value={form.link_url} onChange={e => set("link_url", e.target.value)}
                className="h-10 bg-slate-50/50 dark:border-none border-slate-200 rounded-lg" />
            </Field>
          </Section>
        )}

        {form.format === "LEAD_GEN" && (
          <Section title="Lead Form & Image">
            <Field label="Lead Form *">
              {leadForms.length > 0 ? (
                <Select value={form.lead_gen_form_id} onValueChange={v => set("lead_gen_form_id", v)}>
                  <SelectTrigger className="h-10 bg-slate-50/50 dark:border-none border-slate-200 rounded-lg">
                    <SelectValue placeholder="Select a lead form..." />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-(--card-color) dark:border-(--card-border-color)">
                    {leadForms.map(f => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.name} ({f.leads_count} leads)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    {!form.page_id
                      ? "Select a Facebook Page to load lead forms."
                      : "No lead forms found. Create one in Meta Ads Manager → Lead Ads Forms, or use the Lead Forms section in this portal."}
                  </p>
                </div>
              )}
            </Field>
            <ImageUploadField
              label="Ad Image (optional but recommended)"
              preview={form.image_preview}
              uploading={isUploading}
              fileRef={fileRef}
              onPickFile={() => fileRef.current?.click()}
              onClear={() => setForm(p => ({ ...p, image_hash: "", image_preview: "" }))}
              onChange={handleImageUpload}
              hint="Recommended: 1200×628px. Shown above the form."
            />
          </Section>
        )}

        {form.format === "CAROUSEL" && (
          <Section title="Carousel Cards">
            <p className="text-[11px] text-slate-400 flex items-center gap-1">
              <Info size={10} /> 2–10 cards required. Each card can have its own image, headline, and link.
            </p>
            <Field label="Default Destination URL (used when card has no URL)">
              <Input placeholder="https://yoursite.com"
                value={form.link_url} onChange={e => set("link_url", e.target.value)}
                className="h-10 bg-slate-50/50 dark:border-none border-slate-200 rounded-lg" />
            </Field>

            <div className="space-y-4">
              {cards.map((card, idx) => (
                <div key={idx} className="border border-slate-200 dark:border-(--card-border-color) rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Card {idx + 1}</p>
                    {cards.length > 2 && (
                      <button onClick={() => removeCard(idx)}
                        className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {/* Card image */}
                  <input ref={el => { cardRefs.current[idx] = el; }} type="file" accept="image/*" className="hidden"
                    onChange={e => handleCardImageUpload(e, idx)} />
                  {card.image_preview ? (
                    <div className="relative h-32 rounded-lg overflow-hidden border border-slate-200 dark:border-(--card-border-color)">
                      <img src={card.image_preview} alt={`Card ${idx + 1}`} className="w-full h-full object-cover" />
                      <button onClick={() => setCard(idx, "image_hash", "") || setCard(idx, "image_preview", "")}
                        className="absolute top-1.5 right-1.5 p-1 bg-white/80 hover:bg-white rounded-full">
                        <X size={11} />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => cardRefs.current[idx]?.click()}
                      disabled={uploadingCard === idx}
                      className="w-full h-24 rounded-lg border-2 border-dashed border-slate-200 dark:border-(--card-border-color) flex flex-col items-center justify-center gap-1.5 text-slate-400 hover:border-blue-400 hover:text-blue-400 transition-colors">
                      {uploadingCard === idx ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />}
                      <span className="text-[11px]">{uploadingCard === idx ? "Uploading…" : "Upload card image *"}</span>
                    </button>
                  )}

                  <Input placeholder="Card headline *"
                    value={card.headline} onChange={e => setCard(idx, "headline", e.target.value)}
                    className="h-9 text-sm bg-slate-50/50 dark:border-none border-slate-200 rounded-lg" />
                  <Input placeholder="Card description (optional)"
                    value={card.description} onChange={e => setCard(idx, "description", e.target.value)}
                    className="h-9 text-sm bg-slate-50/50 dark:border-none border-slate-200 rounded-lg" />
                  <Input placeholder="Card URL (leave empty to use default)"
                    value={card.link_url} onChange={e => setCard(idx, "link_url", e.target.value)}
                    className="h-9 text-sm bg-slate-50/50 dark:border-none border-slate-200 rounded-lg" />
                  <Select value={card.call_to_action} onValueChange={v => setCard(idx, "call_to_action", v)}>
                    <SelectTrigger className="h-9 text-sm bg-slate-50/50 dark:border-none border-slate-200 rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-(--card-color) dark:border-(--card-border-color)">
                      {ALL_CTA.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            {cards.length < 10 && (
              <Button variant="outline" onClick={addCard}
                className="w-full h-10 border-dashed border-slate-300 text-slate-500 hover:border-blue-400 hover:text-blue-500 rounded-lg text-sm">
                + Add Card ({cards.length}/10)
              </Button>
            )}
          </Section>
        )}

      </div>

      {/* Hidden file input for main image */}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
    </div>
  );
};

// ── Shared helpers ─────────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-(--card-color) rounded-xl border border-slate-100 dark:border-(--card-border-color) shadow-sm p-5 space-y-4">
      <p className="text-xs font-black uppercase tracking-wider text-slate-400">{title}</p>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</Label>
      {children}
    </div>
  );
}

function ImageUploadField({ label, preview, uploading, fileRef, onPickFile, onClear, onChange, hint }: {
  label: string; preview: string; uploading: boolean;
  fileRef: React.RefObject<HTMLInputElement | null>;
  onPickFile: () => void; onClear: () => void;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  hint?: string;
}) {
  return (
    <Field label={label}>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onChange} />
      {preview ? (
        <div className="relative w-full h-48 rounded-lg overflow-hidden border border-slate-200 dark:border-(--card-border-color)">
          <img src={preview} alt="Ad preview" className="w-full h-full object-cover" />
          <button onClick={onClear}
            className="absolute top-2 right-2 p-1.5 bg-white/80 hover:bg-white rounded-full shadow">
            <X size={12} />
          </button>
        </div>
      ) : (
        <button onClick={onPickFile} disabled={uploading}
          className="w-full h-32 rounded-lg border-2 border-dashed border-slate-200 dark:border-(--card-border-color) flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-blue-400 hover:text-blue-400 transition-colors">
          {uploading ? <Loader2 size={20} className="animate-spin" /> : <ImagePlus size={20} />}
          <span className="text-xs">{uploading ? "Uploading…" : "Click to upload"}</span>
        </button>
      )}
      {hint && <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-1"><Info size={10} /> {hint}</p>}
    </Field>
  );
}

export default CreateMetaAd;
