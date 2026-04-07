"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useGetGoogleAdAccountsQuery, useCreateGoogleCampaignMutation } from "@/src/redux/api/googleAdsApi";
import { Button } from "@/src/elements/ui/button";
import { Input } from "@/src/elements/ui/input";
import { Label } from "@/src/elements/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/elements/ui/select";
import CommonHeader from "@/src/shared/CommonHeader";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

const CAMPAIGN_TYPES = [
  { value: "SEARCH",          label: "Search" },
  { value: "DISPLAY",         label: "Display" },
  { value: "VIDEO",           label: "Video (YouTube)" },
  { value: "SHOPPING",        label: "Shopping" },
  { value: "PERFORMANCE_MAX", label: "Performance Max" },
];

const BIDDING_STRATEGIES = [
  { value: "MAXIMIZE_CONVERSIONS",      label: "Maximize Conversions" },
  { value: "MAXIMIZE_CONVERSION_VALUE", label: "Maximize Conversion Value" },
  { value: "TARGET_CPA",                label: "Target CPA" },
  { value: "TARGET_ROAS",               label: "Target ROAS" },
  { value: "MANUAL_CPC",                label: "Manual CPC" },
  { value: "ENHANCED_CPC",              label: "Enhanced CPC" },
];

const CreateGoogleCampaign = () => {
  const router = useRouter();
  const { data: accountsRes } = useGetGoogleAdAccountsQuery();
  const [create, { isLoading }] = useCreateGoogleCampaignMutation();
  const accounts = accountsRes?.data || [];

  const [form, setForm] = useState({
    ad_account_id: "", name: "", campaign_type: "SEARCH", budget_amount: "",
    budget_type: "DAILY", bidding_strategy: "MAXIMIZE_CONVERSIONS",
    target_cpa: "", target_roas: "", status: "PAUSED", start_date: "", end_date: "",
  });
  const set = (key: string, val: string) => setForm(p => ({ ...p, [key]: val }));

  const handleSubmit = async () => {
    if (!form.ad_account_id) { toast.error("Select an ad account"); return; }
    if (!form.name.trim()) { toast.error("Campaign name required"); return; }
    if (!form.budget_amount) { toast.error("Budget amount required"); return; }
    try {
      await create({
        ad_account_id: form.ad_account_id, name: form.name, campaign_type: form.campaign_type,
        budget_amount: Number(form.budget_amount), budget_type: form.budget_type,
        bidding_strategy: form.bidding_strategy, status: form.status,
        ...(form.target_cpa && { target_cpa: Number(form.target_cpa) }),
        ...(form.target_roas && { target_roas: Number(form.target_roas) }),
        ...(form.start_date && { start_date: form.start_date }),
        ...(form.end_date && { end_date: form.end_date }),
      }).unwrap();
      toast.success("Campaign created!");
      router.push("/ads/google");
    } catch (e: unknown) {
      const err = e as { data?: { message?: string } };
      toast.error(err?.data?.message || "Failed to create");
    }
  };

  return (
    <div className="sm:p-8 p-4">
      <CommonHeader
        title="Create Google Campaign"
        description="Set up a new Google Ads campaign"
        backBtn
        isLoading={isLoading}
        rightContent={
          <Button onClick={handleSubmit} disabled={isLoading} className="h-11 px-6 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg gap-2">
            {isLoading ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>} Create Campaign
          </Button>
        }
      />

      <div className="max-w-2xl space-y-5">
        <div className="bg-white dark:bg-(--card-color) rounded-xl border border-slate-100 dark:border-(--card-border-color) shadow-sm p-5 space-y-4">
          <p className="text-xs font-black uppercase tracking-wider text-slate-400">Account & Campaign</p>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Ad Account *</Label>
            <Select value={form.ad_account_id} onValueChange={(v) => set("ad_account_id", v)}>
              <SelectTrigger className="h-10 bg-slate-50/50 dark:border-none border-slate-200 rounded-lg">
                <SelectValue placeholder="Select Google Ads account..." />
              </SelectTrigger>
              <SelectContent className="dark:bg-(--card-color) dark:border-(--card-border-color)">
                {accounts.map(a => <SelectItem key={a._id} value={a._id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Campaign Name *</Label>
            <Input value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Brand Search Q2 2025"
              className="h-10 bg-slate-50/50 dark:border-none border-slate-200 rounded-lg" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Campaign Type *</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CAMPAIGN_TYPES.map(t => (
                <button key={t.value} onClick={() => set("campaign_type", t.value)}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${form.campaign_type===t.value ? "border-red-400 bg-red-50 dark:bg-red-900/10" : "border-slate-200 dark:border-(--card-border-color) hover:border-red-300"}`}>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{t.label}</p>
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Status</Label>
            <Select value={form.status} onValueChange={(v) => set("status", v)}>
              <SelectTrigger className="h-10 bg-slate-50/50 dark:border-none border-slate-200 rounded-lg"><SelectValue /></SelectTrigger>
              <SelectContent className="dark:bg-(--card-color) dark:border-(--card-border-color)">
                <SelectItem value="PAUSED">Paused (recommended)</SelectItem>
                <SelectItem value="ENABLED">Enabled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="bg-white dark:bg-(--card-color) rounded-xl border border-slate-100 dark:border-(--card-border-color) shadow-sm p-5 space-y-4">
          <p className="text-xs font-black uppercase tracking-wider text-slate-400">Budget & Bidding</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Budget (INR) *</Label>
              <Input type="number" value={form.budget_amount} onChange={e => set("budget_amount", e.target.value)}
                placeholder="500" className="h-10 bg-slate-50/50 dark:border-none border-slate-200 rounded-lg" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Budget Type</Label>
              <Select value={form.budget_type} onValueChange={(v) => set("budget_type", v)}>
                <SelectTrigger className="h-10 bg-slate-50/50 dark:border-none border-slate-200 rounded-lg"><SelectValue /></SelectTrigger>
                <SelectContent className="dark:bg-(--card-color) dark:border-(--card-border-color)">
                  <SelectItem value="DAILY">Daily</SelectItem>
                  <SelectItem value="TOTAL">Total</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Bidding Strategy</Label>
            <Select value={form.bidding_strategy} onValueChange={(v) => set("bidding_strategy", v)}>
              <SelectTrigger className="h-10 bg-slate-50/50 dark:border-none border-slate-200 rounded-lg"><SelectValue /></SelectTrigger>
              <SelectContent className="dark:bg-(--card-color) dark:border-(--card-border-color)">
                {BIDDING_STRATEGIES.map(b => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {form.bidding_strategy === "TARGET_CPA" && (
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Target CPA (INR)</Label>
              <Input type="number" value={form.target_cpa} onChange={e => set("target_cpa", e.target.value)}
                placeholder="100" className="h-10 bg-slate-50/50 dark:border-none border-slate-200 rounded-lg" />
            </div>
          )}
          {form.bidding_strategy === "TARGET_ROAS" && (
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Target ROAS (e.g. 3.5)</Label>
              <Input type="number" value={form.target_roas} onChange={e => set("target_roas", e.target.value)}
                placeholder="3.5" className="h-10 bg-slate-50/50 dark:border-none border-slate-200 rounded-lg" />
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-(--card-color) rounded-xl border border-slate-100 dark:border-(--card-border-color) shadow-sm p-5 space-y-4">
          <p className="text-xs font-black uppercase tracking-wider text-slate-400">Schedule (Optional)</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Start Date</Label>
              <Input type="date" value={form.start_date} onChange={e => set("start_date", e.target.value)}
                className="h-10 bg-slate-50/50 dark:border-none border-slate-200 rounded-lg" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">End Date</Label>
              <Input type="date" value={form.end_date} onChange={e => set("end_date", e.target.value)}
                className="h-10 bg-slate-50/50 dark:border-none border-slate-200 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateGoogleCampaign;