"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useGetMetaAdAccountsQuery, useCreateMetaCampaignMutation } from "@/src/redux/api/metaAdsApi";
import { Button } from "@/src/elements/ui/button";
import { Input } from "@/src/elements/ui/input";
import { Label } from "@/src/elements/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/elements/ui/select";
import CommonHeader from "@/src/shared/CommonHeader";
import { Loader2, Save, Info } from "lucide-react";
import { toast } from "sonner";

// ── Meta API enums from docs ───────────────────────────────────────────────────

const OBJECTIVES = [
  { value: "OUTCOME_LEADS",         label: "Lead Generation",   desc: "Collect leads for your business" },
  { value: "OUTCOME_AWARENESS",     label: "Brand Awareness",   desc: "Show ads to people likely to remember them" },
  { value: "OUTCOME_ENGAGEMENT",    label: "Engagement",        desc: "Get more messages, video views, post interactions" },
  { value: "OUTCOME_TRAFFIC",       label: "Traffic",           desc: "Send people to a destination on/off Facebook" },
  { value: "OUTCOME_SALES",         label: "Sales",             desc: "Find people likely to purchase your product" },
  { value: "OUTCOME_APP_PROMOTION", label: "App Promotion",     desc: "Find new users for your app" },
];

// Per docs: bid strategies available for AUCTION buying type
const BID_STRATEGIES_AUCTION = [
  { value: "LOWEST_COST_WITHOUT_CAP",  label: "Lowest Cost (Auto)", desc: "Maximum results without bid limits" },
  { value: "LOWEST_COST_WITH_BID_CAP", label: "Bid Cap",            desc: "Results while capping your actual bids" },
  { value: "COST_CAP",                 label: "Cost Cap",            desc: "Maintain target costs" },
  { value: "LOWEST_COST_WITH_MIN_ROAS",label: "Min ROAS",            desc: "Minimum return on ad spend" },
];

// RESERVED only supports IMPRESSIONS billing; limited bid strategies
const BID_STRATEGIES_RESERVED = [
  { value: "FIXED_CPM", label: "Fixed CPM", desc: "Fixed cost per 1,000 impressions" },
];

// Per Meta docs: HOUSING, EMPLOYMENT, CREDIT require special_ad_category
const SPECIAL_AD_CATEGORIES = [
  { value: "NONE",                       label: "None — General ad" },
  { value: "HOUSING",                    label: "Housing — Rentals, real estate, home equity" },
  { value: "EMPLOYMENT",                 label: "Employment — Jobs, internships, professional certifications" },
  { value: "CREDIT",                     label: "Credit — Credit cards, loans, financing" },
  { value: "ISSUES_ELECTIONS_POLITICS",  label: "Issues, Elections & Politics" },
];

// ── Component ──────────────────────────────────────────────────────────────────

const CreateMetaCampaign = () => {
  const router = useRouter();
  const { data: accountsRes } = useGetMetaAdAccountsQuery();
  const [create, { isLoading }] = useCreateMetaCampaignMutation();
  const accounts = accountsRes?.data || [];

  const [form, setForm] = useState({
    ad_account_id:        "",
    name:                 "",
    objective:            "OUTCOME_LEADS",
    status:               "PAUSED",
    buying_type:          "AUCTION",
    bid_strategy:         "LOWEST_COST_WITHOUT_CAP",
    special_ad_category:  "NONE",
    budgetType:           "daily",
    daily_budget:         "",
    lifetime_budget:      "",
    start_time:           "",
    end_time:             "",
  });

  const set = (key: string, val: string) => setForm(p => ({ ...p, [key]: val }));

  const bidStrategies = form.buying_type === "RESERVED" ? BID_STRATEGIES_RESERVED : BID_STRATEGIES_AUCTION;

  // Lifetime budget required when buying_type = RESERVED
  const requiresLifetimeBudget = form.buying_type === "RESERVED";

  const handleBuyingTypeChange = (val: string) => {
    setForm(p => ({
      ...p,
      buying_type: val,
      bid_strategy: val === "RESERVED" ? "FIXED_CPM" : "LOWEST_COST_WITHOUT_CAP",
      budgetType: val === "RESERVED" ? "lifetime" : p.budgetType,
    }));
  };

  const handleSubmit = async () => {
    if (!form.ad_account_id) { toast.error("Select an ad account"); return; }
    if (!form.name.trim())   { toast.error("Campaign name required"); return; }
    const budgetVal = form.budgetType === "daily" ? form.daily_budget : form.lifetime_budget;
    if (!budgetVal || Number(budgetVal) <= 0) { toast.error("Enter a valid budget amount"); return; }
    if (requiresLifetimeBudget && form.budgetType !== "lifetime") {
      toast.error("Reserved buying type requires a lifetime budget");
      return;
    }

    try {
      await create({
        ad_account_id:       form.ad_account_id,
        name:                form.name,
        objective:           form.objective,
        status:              form.status,
        buying_type:         form.buying_type,
        bid_strategy:        form.bid_strategy,
        special_ad_categories: form.special_ad_category === "NONE" ? [] : [form.special_ad_category],
        ...(form.budgetType === "daily"    && { daily_budget:    Number(form.daily_budget) }),
        ...(form.budgetType === "lifetime" && { lifetime_budget: Number(form.lifetime_budget) }),
        ...(form.start_time && { start_time: form.start_time }),
        ...(form.end_time   && { end_time:   form.end_time }),
      }).unwrap();
      toast.success("Campaign created!");
      router.push("/ads/meta");
    } catch (e: unknown) {
      const err = e as { data?: { message?: string } };
      toast.error(err?.data?.message || "Failed to create campaign");
    }
  };

  const selectedObj = OBJECTIVES.find(o => o.value === form.objective);
  const selectedStrategy = bidStrategies.find(b => b.value === form.bid_strategy);

  return (
    <div className="sm:p-8 p-4">
      <CommonHeader
        title="Create Meta Campaign"
        description="Set up a new Facebook / Instagram ad campaign"
        backBtn
        isLoading={isLoading}
        rightContent={
          <Button onClick={handleSubmit} disabled={isLoading}
            className="h-11 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg gap-2">
            {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Create Campaign
          </Button>
        }
      />

      <div className="max-w-2xl space-y-5 mt-6">

        {/* ── Ad Account ─────────────────────────────────────────────────── */}
        <Section title="Account">
          <Field label="Ad Account *">
            <Select value={form.ad_account_id} onValueChange={v => set("ad_account_id", v)}>
              <SelectTrigger className="h-10 bg-slate-50/50 dark:border-none border-slate-200 rounded-lg">
                <SelectValue placeholder="Select ad account..." />
              </SelectTrigger>
              <SelectContent className="dark:bg-(--card-color) dark:border-(--card-border-color)">
                {accounts.map(a => <SelectItem key={a._id} value={a._id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </Section>

        {/* ── Campaign Info ──────────────────────────────────────────────── */}
        <Section title="Campaign">
          <Field label="Campaign Name *">
            <Input value={form.name} onChange={e => set("name", e.target.value)}
              placeholder="e.g. Summer Lead Gen 2025"
              className="h-10 bg-slate-50/50 dark:border-none border-slate-200 rounded-lg" />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Objective *">
              <Select value={form.objective} onValueChange={v => set("objective", v)}>
                <SelectTrigger className="h-10 bg-slate-50/50 dark:border-none border-slate-200 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="dark:bg-(--card-color) dark:border-(--card-border-color)">
                  {OBJECTIVES.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
              {selectedObj && (
                <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-1">
                  <Info size={10} /> {selectedObj.desc}
                </p>
              )}
            </Field>

            <Field label="Status">
              <Select value={form.status} onValueChange={v => set("status", v)}>
                <SelectTrigger className="h-10 bg-slate-50/50 dark:border-none border-slate-200 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="dark:bg-(--card-color) dark:border-(--card-border-color)">
                  <SelectItem value="PAUSED">Paused (recommended)</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          {/* Special Ad Categories — required by Meta for protected categories */}
          <Field label="Special Ad Category">
            <Select value={form.special_ad_category} onValueChange={v => set("special_ad_category", v)}>
              <SelectTrigger className="h-10 bg-slate-50/50 dark:border-none border-slate-200 rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="dark:bg-(--card-color) dark:border-(--card-border-color)">
                {SPECIAL_AD_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {form.special_ad_category !== "NONE" && (
              <p className="text-[11px] text-amber-600 flex items-center gap-1 mt-1">
                <Info size={10} /> Meta restricts targeting options for this category per policy requirements.
              </p>
            )}
          </Field>
        </Section>

        {/* ── Buying Type & Budget ───────────────────────────────────────── */}
        <Section title="Buying Type & Budget">
          {/* Buying type */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { v: "AUCTION", label: "Auction", desc: "Bid against other advertisers (most flexible)" },
              { v: "RESERVED", label: "Reserved", desc: "Fixed CPM, guaranteed delivery" },
            ].map(b => (
              <button key={b.v} onClick={() => handleBuyingTypeChange(b.v)}
                className={`p-3 rounded-lg border-2 text-left transition-all ${form.buying_type === b.v
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                  : "border-slate-200 dark:border-(--card-border-color) hover:border-blue-300"}`}>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{b.label}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{b.desc}</p>
              </button>
            ))}
          </div>

          {/* Budget type — RESERVED forces lifetime */}
          <div className="grid grid-cols-2 gap-3">
            {["daily", "lifetime"].map(type => (
              <button key={type} disabled={requiresLifetimeBudget && type === "daily"}
                onClick={() => set("budgetType", type)}
                className={`p-3 rounded-lg border-2 text-left transition-all disabled:opacity-40 disabled:cursor-not-allowed
                  ${form.budgetType === type
                    ? "border-primary bg-primary/5 dark:bg-primary/10"
                    : "border-slate-200 dark:border-(--card-border-color) hover:border-primary/30"}`}>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 capitalize">{type} Budget</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{type === "daily" ? "Spend per day" : "Total spend for campaign"}</p>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Amount (INR) *">
              <Input type="number" min={1}
                value={form.budgetType === "daily" ? form.daily_budget : form.lifetime_budget}
                onChange={e => set(form.budgetType === "daily" ? "daily_budget" : "lifetime_budget", e.target.value)}
                placeholder={form.budgetType === "daily" ? "Min ₹41/day" : "e.g. 10000"}
                className="h-10 bg-slate-50/50 dark:border-none border-slate-200 rounded-lg" />
              <p className="text-[11px] text-slate-400 mt-1">
                Meta minimum: ₹41/day for most objectives (₹206/day for low-frequency actions)
              </p>
            </Field>

            <Field label="Bid Strategy">
              <Select value={form.bid_strategy} onValueChange={v => set("bid_strategy", v)}>
                <SelectTrigger className="h-10 bg-slate-50/50 dark:border-none border-slate-200 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="dark:bg-(--card-color) dark:border-(--card-border-color)">
                  {bidStrategies.map(b => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}
                </SelectContent>
              </Select>
              {selectedStrategy && (
                <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-1">
                  <Info size={10} /> {selectedStrategy.desc}
                </p>
              )}
            </Field>
          </div>
        </Section>

        {/* ── Schedule (optional) ────────────────────────────────────────── */}
        <Section title="Schedule (optional)">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start Date">
              <Input type="datetime-local" value={form.start_time}
                onChange={e => set("start_time", e.target.value)}
                className="h-10 bg-slate-50/50 dark:border-none border-slate-200 rounded-lg" />
            </Field>
            <Field label="End Date">
              <Input type="datetime-local" value={form.end_time}
                onChange={e => set("end_time", e.target.value)}
                className="h-10 bg-slate-50/50 dark:border-none border-slate-200 rounded-lg" />
            </Field>
          </div>
        </Section>

      </div>
    </div>
  );
};

// ── Shared layout helpers ──────────────────────────────────────────────────────
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

export default CreateMetaCampaign;
