"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useGetMetaAdAccountsQuery, useCreateMetaCampaignMutation } from "@/src/redux/api/metaAdsApi";
import { Button } from "@/src/elements/ui/button";
import { Input } from "@/src/elements/ui/input";
import { Label } from "@/src/elements/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/elements/ui/select";
import CommonHeader from "@/src/shared/CommonHeader";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

const OBJECTIVES = [
  { value: "OUTCOME_LEADS",        label: "Lead Generation" },
  { value: "OUTCOME_AWARENESS",    label: "Brand Awareness" },
  { value: "OUTCOME_ENGAGEMENT",   label: "Engagement" },
  { value: "OUTCOME_TRAFFIC",      label: "Traffic" },
  { value: "OUTCOME_SALES",        label: "Sales" },
  { value: "OUTCOME_APP_PROMOTION",label: "App Promotion" },
];

const BID_STRATEGIES = [
  { value: "LOWEST_COST_WITHOUT_CAP",    label: "Lowest Cost (Auto)" },
  { value: "LOWEST_COST_WITH_BID_CAP",   label: "Lowest Cost with Bid Cap" },
  { value: "COST_CAP",                   label: "Cost Cap" },
];

const CreateMetaCampaign = () => {
  const router = useRouter();
  const { data: accountsRes } = useGetMetaAdAccountsQuery();
  const [create, { isLoading }] = useCreateMetaCampaignMutation();
  const accounts = accountsRes?.data || [];

  const [form, setForm] = useState({
    ad_account_id: "", name: "", objective: "OUTCOME_LEADS", status: "PAUSED",
    bid_strategy: "LOWEST_COST_WITHOUT_CAP", budgetType: "daily", daily_budget: "", lifetime_budget: "",
  });
  const set = (key: string, val: string) => setForm(p => ({ ...p, [key]: val }));

  const handleSubmit = async () => {
    if (!form.ad_account_id) { toast.error("Select an ad account"); return; }
    if (!form.name.trim()) { toast.error("Campaign name required"); return; }
    if (!form.daily_budget && !form.lifetime_budget) { toast.error("Enter a budget amount"); return; }
    try {
      await create({
        ad_account_id: form.ad_account_id, name: form.name, objective: form.objective,
        status: form.status, bid_strategy: form.bid_strategy,
        ...(form.budgetType==="daily" && { daily_budget: Number(form.daily_budget) }),
        ...(form.budgetType==="lifetime" && { lifetime_budget: Number(form.lifetime_budget) }),
      }).unwrap();
      toast.success("Campaign created!");
      router.push("/ads/meta");
    } catch (e: unknown) {
      const err = e as { data?: { message?: string } };
      toast.error(err?.data?.message || "Failed to create campaign");
    }
  };

  return (
    <div className="sm:p-8 p-4">
      <CommonHeader
        title="Create Meta Campaign"
        description="Set up a new Facebook / Instagram ad campaign"
        backBtn
        isLoading={isLoading}
        rightContent={
          <Button onClick={handleSubmit} disabled={isLoading} className="h-11 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg gap-2">
            {isLoading ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>} Create Campaign
          </Button>
        }
      />

      <div className="max-w-2xl space-y-5">
        <div className="bg-white dark:bg-(--card-color) rounded-xl border border-slate-100 dark:border-(--card-border-color) shadow-sm p-5 space-y-4">
          <p className="text-xs font-black uppercase tracking-wider text-slate-400">Account</p>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Ad Account *</Label>
            <Select value={form.ad_account_id} onValueChange={(v) => set("ad_account_id", v)}>
              <SelectTrigger className="h-10 bg-slate-50/50 dark:border-none border-slate-200 rounded-lg">
                <SelectValue placeholder="Select ad account..." />
              </SelectTrigger>
              <SelectContent className="dark:bg-(--card-color) dark:border-(--card-border-color)">
                {accounts.map(a => <SelectItem key={a._id} value={a._id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="bg-white dark:bg-(--card-color) rounded-xl border border-slate-100 dark:border-(--card-border-color) shadow-sm p-5 space-y-4">
          <p className="text-xs font-black uppercase tracking-wider text-slate-400">Campaign Info</p>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Campaign Name *</Label>
            <Input value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Summer Lead Gen 2025"
              className="h-10 bg-slate-50/50 dark:border-none border-slate-200 rounded-lg" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Objective *</Label>
              <Select value={form.objective} onValueChange={(v) => set("objective", v)}>
                <SelectTrigger className="h-10 bg-slate-50/50 dark:border-none border-slate-200 rounded-lg"><SelectValue /></SelectTrigger>
                <SelectContent className="dark:bg-(--card-color) dark:border-(--card-border-color)">
                  {OBJECTIVES.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Status</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger className="h-10 bg-slate-50/50 dark:border-none border-slate-200 rounded-lg"><SelectValue /></SelectTrigger>
                <SelectContent className="dark:bg-(--card-color) dark:border-(--card-border-color)">
                  <SelectItem value="PAUSED">Paused (recommended)</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-(--card-color) rounded-xl border border-slate-100 dark:border-(--card-border-color) shadow-sm p-5 space-y-4">
          <p className="text-xs font-black uppercase tracking-wider text-slate-400">Budget</p>
          <div className="grid grid-cols-2 gap-3">
            {["daily","lifetime"].map(type => (
              <button key={type} onClick={() => set("budgetType", type)}
                className={`p-3 rounded-lg border-2 text-left transition-all ${form.budgetType===type ? "border-primary bg-primary/5 dark:bg-primary/10" : "border-slate-200 dark:border-(--card-border-color) hover:border-primary/30"}`}>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 capitalize">{type} Budget</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{type==="daily" ? "Spend per day" : "Total spend"}</p>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Amount (INR) *</Label>
              <Input type="number" value={form.budgetType==="daily" ? form.daily_budget : form.lifetime_budget}
                onChange={e => set(form.budgetType==="daily" ? "daily_budget" : "lifetime_budget", e.target.value)}
                placeholder="500" className="h-10 bg-slate-50/50 dark:border-none border-slate-200 rounded-lg" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Bid Strategy</Label>
              <Select value={form.bid_strategy} onValueChange={(v) => set("bid_strategy", v)}>
                <SelectTrigger className="h-10 bg-slate-50/50 dark:border-none border-slate-200 rounded-lg"><SelectValue /></SelectTrigger>
                <SelectContent className="dark:bg-(--card-color) dark:border-(--card-border-color)">
                  {BID_STRATEGIES.map(b => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateMetaCampaign;