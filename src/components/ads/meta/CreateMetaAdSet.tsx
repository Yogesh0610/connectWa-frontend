"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCreateMetaAdSetMutation, useGetMetaAdAccountsQuery } from "@/src/redux/api/metaAdsApi";
import { Button } from "@/src/elements/ui/button";
import { Input } from "@/src/elements/ui/input";
import { Label } from "@/src/elements/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/elements/ui/select";
import CommonHeader from "@/src/shared/CommonHeader";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

const OPTIMIZATION_GOALS = [
  { value: "LEAD_GENERATION", label: "Lead Generation" },
  { value: "LINK_CLICKS",     label: "Link Clicks" },
  { value: "IMPRESSIONS",     label: "Impressions" },
  { value: "REACH",           label: "Reach" },
  { value: "CONVERSIONS",     label: "Conversions" },
];

const BILLING_EVENTS = [
  { value: "IMPRESSIONS", label: "Per 1,000 Impressions (CPM)" },
  { value: "LINK_CLICKS", label: "Per Link Click (CPC)" },
];

const CreateMetaAdSet = ({ campaignId }: { campaignId: string }) => {
  const router = useRouter();
  const { data: accountsRes } = useGetMetaAdAccountsQuery();
  const [createAdSet, { isLoading }] = useCreateMetaAdSetMutation();

  const [form, setForm] = useState({
    ad_account_id: "",
    name: "",
    daily_budget: "",
    optimization_goal: "LEAD_GENERATION",
    billing_event: "IMPRESSIONS",
    start_time: "",
    end_time: "",
  });

  const accounts = accountsRes?.data || [];
  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!form.ad_account_id || !form.name || !form.daily_budget) {
      toast.error("Account, name, and budget are required");
      return;
    }
    try {
      await createAdSet({
        campaign_id: campaignId,
        ad_account_id: form.ad_account_id,
        name: form.name,
        daily_budget: parseFloat(form.daily_budget),
        optimization_goal: form.optimization_goal,
        billing_event: form.billing_event,
        start_time: form.start_time || undefined,
        end_time: form.end_time || undefined,
      }).unwrap();
      toast.success("Ad set created");
      router.push(`/ads/meta/campaigns/${campaignId}/adsets`);
    } catch (e: unknown) {
      toast.error((e as { data?: { message?: string } })?.data?.message || "Failed to create ad set");
    }
  };

  return (
    <div className="sm:p-8 p-4 space-y-6 max-w-2xl">
      <CommonHeader title="Create Ad Set" description="Set up a new ad set for your campaign" backBtn />

      <div className="bg-white dark:bg-(--card-color) rounded-xl border border-slate-100 dark:border-(--card-border-color) shadow-sm p-6 space-y-5">
        <div className="space-y-2">
          <Label>Ad Account <span className="text-red-500">*</span></Label>
          <Select value={form.ad_account_id} onValueChange={(v) => set("ad_account_id", v)}>
            <SelectTrigger className="h-11"><SelectValue placeholder="Select account" /></SelectTrigger>
            <SelectContent>
              {accounts.map((a) => <SelectItem key={a._id} value={a._id}>{a.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Ad Set Name <span className="text-red-500">*</span></Label>
          <Input placeholder="e.g. India - Lead Gen - 18-35" value={form.name} onChange={(e) => set("name", e.target.value)} className="h-11" />
        </div>

        <div className="space-y-2">
          <Label>Daily Budget (₹) <span className="text-red-500">*</span></Label>
          <Input type="number" placeholder="e.g. 500" value={form.daily_budget} onChange={(e) => set("daily_budget", e.target.value)} className="h-11" />
        </div>

        <div className="space-y-2">
          <Label>Optimization Goal</Label>
          <Select value={form.optimization_goal} onValueChange={(v) => set("optimization_goal", v)}>
            <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
            <SelectContent>
              {OPTIMIZATION_GOALS.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Billing Event</Label>
          <Select value={form.billing_event} onValueChange={(v) => set("billing_event", v)}>
            <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
            <SelectContent>
              {BILLING_EVENTS.map((b) => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Start Date</Label>
            <Input type="datetime-local" value={form.start_time} onChange={(e) => set("start_time", e.target.value)} className="h-11" />
          </div>
          <div className="space-y-2">
            <Label>End Date</Label>
            <Input type="datetime-local" value={form.end_time} onChange={(e) => set("end_time", e.target.value)} className="h-11" />
          </div>
        </div>

        <Button onClick={handleSubmit} disabled={isLoading} className="h-11 px-6 gap-2 font-bold bg-blue-600 hover:bg-blue-700 text-white">
          {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Create Ad Set
        </Button>
      </div>
    </div>
  );
};

export default CreateMetaAdSet;
