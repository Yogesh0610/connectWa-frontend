"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  useCreateMetaAdSetMutation,
  useGetMetaAdAccountsQuery,
  useGetMetaCampaignByIdQuery,
  useGetMetaAccountPagesQuery,
} from "@/src/redux/api/metaAdsApi";
import { Button } from "@/src/elements/ui/button";
import { Input } from "@/src/elements/ui/input";
import { Label } from "@/src/elements/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/elements/ui/select";
import CommonHeader from "@/src/shared/CommonHeader";
import { Loader2, Save, Info, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

// ─────────────────────────────────────────────────────────────────────────────
// Meta Outcomes-based Advertising (OBA) — verified valid combinations
// Source: Meta Marketing API reference + billing-events docs
//
// Rules:
//  • optimization_goal must be valid for the campaign's objective
//  • billing_event must be valid for the chosen optimization_goal
//  • Some goals require promoted_object (page_id / pixel_id / app_id)
//  • IMPRESSIONS is a valid optimization_goal (not just a billing_event) for
//    objectives that pay per impression (AWARENESS, TRAFFIC, ENGAGEMENT)
// ─────────────────────────────────────────────────────────────────────────────

type GoalDef = {
  value: string;
  label: string;
  needsPageId?: boolean;
  needsPixelId?: boolean;
  needsAppId?: boolean;
};

// Only universally valid goals are included. Goals requiring special
// whitelists (AD_RECALL_LIFT) or complex additional setup (CONVERSATIONS)
// are excluded to prevent error 100/2490408.
const OBJECTIVE_GOALS: Record<string, GoalDef[]> = {
  OUTCOME_LEADS: [
    { value: "LEAD_GENERATION",    label: "Lead Generation (Instant Form)", needsPageId: true },
    { value: "LINK_CLICKS",        label: "Link Clicks" },
    { value: "LANDING_PAGE_VIEWS", label: "Landing Page Views" },
  ],
  OUTCOME_TRAFFIC: [
    { value: "LINK_CLICKS",        label: "Link Clicks" },
    { value: "LANDING_PAGE_VIEWS", label: "Landing Page Views" },
    { value: "IMPRESSIONS",        label: "Impressions (maximum reach for traffic)" },
    { value: "POST_ENGAGEMENT",    label: "Post Engagement" },
  ],
  OUTCOME_AWARENESS: [
    { value: "REACH",              label: "Reach" },
    { value: "IMPRESSIONS",        label: "Impressions" },
    { value: "THRUPLAY",           label: "ThruPlay (video ≥15s or complete)" },
    { value: "VIDEO_VIEWS",        label: "Video Views" },
  ],
  OUTCOME_ENGAGEMENT: [
    { value: "POST_ENGAGEMENT",    label: "Post Engagement" },
    { value: "PAGE_LIKES",         label: "Page Likes", needsPageId: true },
    { value: "VIDEO_VIEWS",        label: "Video Views" },
    { value: "IMPRESSIONS",        label: "Impressions" },
    { value: "LINK_CLICKS",        label: "Link Clicks" },
  ],
  OUTCOME_SALES: [
    { value: "OFFSITE_CONVERSIONS", label: "Conversions (requires Pixel)", needsPixelId: true },
    { value: "VALUE",               label: "Value / ROAS (requires Pixel)",  needsPixelId: true },
    { value: "LINK_CLICKS",         label: "Link Clicks (no Pixel required)" },
    { value: "LANDING_PAGE_VIEWS",  label: "Landing Page Views" },
    { value: "IMPRESSIONS",         label: "Impressions" },
  ],
  OUTCOME_APP_PROMOTION: [
    { value: "APP_INSTALLS",       label: "App Installs", needsAppId: true },
    { value: "LINK_CLICKS",        label: "Link Clicks" },
  ],
};

const DEFAULT_GOALS: GoalDef[] = [
  { value: "LINK_CLICKS",  label: "Link Clicks" },
  { value: "IMPRESSIONS",  label: "Impressions" },
];

// Billing events allowed per optimization_goal (per Meta billing-events docs)
// All goals allow IMPRESSIONS. Only a few allow additional options.
const GOAL_BILLING_EVENTS: Record<string, { value: string; label: string }[]> = {
  // IMPRESSIONS-only goals
  LEAD_GENERATION:    [{ value: "IMPRESSIONS", label: "Per 1,000 Impressions (CPM)" }],
  QUALITY_LEAD:       [{ value: "IMPRESSIONS", label: "Per 1,000 Impressions (CPM)" }],
  OFFSITE_CONVERSIONS:[{ value: "IMPRESSIONS", label: "Per 1,000 Impressions (CPM)" }],
  VALUE:              [{ value: "IMPRESSIONS", label: "Per 1,000 Impressions (CPM)" }],
  REACH:              [{ value: "IMPRESSIONS", label: "Per 1,000 Impressions (CPM)" }],
  IMPRESSIONS:        [{ value: "IMPRESSIONS", label: "Per 1,000 Impressions (CPM)" }],
  LANDING_PAGE_VIEWS: [{ value: "IMPRESSIONS", label: "Per 1,000 Impressions (CPM)" }],
  PAGE_LIKES:         [{ value: "IMPRESSIONS", label: "Per 1,000 Impressions (CPM)" },
                       { value: "PAGE_LIKES",  label: "Per Page Like" }],
  POST_ENGAGEMENT:    [{ value: "IMPRESSIONS", label: "Per 1,000 Impressions (CPM)" }],
  APP_INSTALLS:       [{ value: "IMPRESSIONS", label: "Per 1,000 Impressions (CPM)" }],
  VIDEO_VIEWS:        [{ value: "IMPRESSIONS", label: "Per 1,000 Impressions (CPM)" }],
  // Goals allowing additional billing options
  LINK_CLICKS: [
    { value: "IMPRESSIONS", label: "Per 1,000 Impressions (CPM)" },
    { value: "LINK_CLICKS", label: "Per Link Click (CPC)" },
  ],
  THRUPLAY: [
    { value: "IMPRESSIONS", label: "Per 1,000 Impressions (CPM)" },
    { value: "THRUPLAY",    label: "Per ThruPlay" },
  ],
};

const DEFAULT_BILLING = [{ value: "IMPRESSIONS", label: "Per 1,000 Impressions (CPM)" }];
const NEEDS_BID_AMOUNT = new Set(["LOWEST_COST_WITH_BID_CAP", "COST_CAP", "LOWEST_COST_WITH_MIN_ROAS"]);

const COUNTRIES = [
  { value: "IN", label: "India" },
  { value: "US", label: "United States" },
  { value: "GB", label: "United Kingdom" },
  { value: "CA", label: "Canada" },
  { value: "AU", label: "Australia" },
  { value: "SG", label: "Singapore" },
  { value: "AE", label: "United Arab Emirates" },
  { value: "PK", label: "Pakistan" },
  { value: "BD", label: "Bangladesh" },
  { value: "LK", label: "Sri Lanka" },
  { value: "NG", label: "Nigeria" },
  { value: "ZA", label: "South Africa" },
  { value: "DE", label: "Germany" },
  { value: "FR", label: "France" },
  { value: "SA", label: "Saudi Arabia" },
];

// ── Component ──────────────────────────────────────────────────────────────────
const CreateMetaAdSet = ({ campaignId }: { campaignId: string }) => {
  const router = useRouter();
  const { data: accountsRes } = useGetMetaAdAccountsQuery();
  const { data: campaignRes } = useGetMetaCampaignByIdQuery(campaignId);
  const [createAdSet, { isLoading }] = useCreateMetaAdSetMutation();

  const campaign      = campaignRes?.data;
  const objective     = campaign?.objective || "";
  const bidStrategy   = campaign?.bid_strategy || "";
  const availableGoals = OBJECTIVE_GOALS[objective] || DEFAULT_GOALS;

  const [form, setForm] = useState({
    ad_account_id:     "",
    name:              "",
    budgetType:        "daily",
    daily_budget:      "",
    lifetime_budget:   "",
    bid_amount:        "",
    optimization_goal: "",   // set by useEffect below — NEVER set during render
    billing_event:     "IMPRESSIONS",
    start_time:        "",
    end_time:          "",
    page_id:           "",
    pixel_id:          "",
    app_id:            "",
    age_min:           "18",
    age_max:           "65",
    gender:            "all",
    country:           "IN",
    device_platforms:  "all",
  });
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  // ── Auto-select first valid goal when campaign loads ──────────────────────
  // IMPORTANT: this must be in useEffect, not inline in render.
  // Calling setForm during render causes React to drop the update or
  // trigger infinite re-renders — form.optimization_goal stays "" on submit.
  useEffect(() => {
    if (!availableGoals.length) return;
    const firstGoal    = availableGoals[0].value;
    const firstBilling = (GOAL_BILLING_EVENTS[firstGoal] || DEFAULT_BILLING)[0].value;
    setForm(p => {
      if (p.optimization_goal) return p; // already set — don't overwrite user's choice
      return { ...p, optimization_goal: firstGoal, billing_event: firstBilling };
    });
  }, [objective]); // re-run only when objective changes

  const { data: pagesRes } = useGetMetaAccountPagesQuery(
    { ad_account_id: form.ad_account_id },
    { skip: !form.ad_account_id }
  );
  const pages = pagesRes?.data || [];

  const selectedGoalDef    = availableGoals.find(g => g.value === form.optimization_goal);
  const needsPageId        = selectedGoalDef?.needsPageId  ?? false;
  const needsPixelId       = selectedGoalDef?.needsPixelId ?? false;
  const needsAppId         = selectedGoalDef?.needsAppId   ?? false;
  const availableBillings  = GOAL_BILLING_EVENTS[form.optimization_goal] || DEFAULT_BILLING;
  const showBidAmount      = NEEDS_BID_AMOUNT.has(bidStrategy);

  const handleGoalChange = (goal: string) => {
    const billings = GOAL_BILLING_EVENTS[goal] || DEFAULT_BILLING;
    setForm(p => ({ ...p, optimization_goal: goal, billing_event: billings[0].value, page_id: "", pixel_id: "", app_id: "" }));
  };

  const handleSubmit = async () => {
    if (!form.ad_account_id) { toast.error("Select an ad account"); return; }
    if (!form.name.trim())   { toast.error("Ad set name is required"); return; }
    if (!form.optimization_goal) { toast.error("Select an optimization goal"); return; }

    const budgetVal = form.budgetType === "daily" ? form.daily_budget : form.lifetime_budget;
    if (!budgetVal || Number(budgetVal) <= 0) { toast.error("Enter a valid budget"); return; }

    if (needsPageId && !form.page_id) {
      toast.error(`"${selectedGoalDef?.label}" requires selecting a Facebook Page`);
      return;
    }
    if (needsPixelId && !form.pixel_id.trim()) {
      toast.error(`"${selectedGoalDef?.label}" requires a Meta Pixel ID`);
      return;
    }
    if (needsAppId && !form.app_id.trim()) {
      toast.error(`"${selectedGoalDef?.label}" requires an App ID`);
      return;
    }

    const genders: number[] = form.gender === "all" ? [] : [Number(form.gender)];
    const devicePlatforms = form.device_platforms === "all" ? ["mobile", "desktop"] : [form.device_platforms];

    const promoted_object =
      needsPageId  && form.page_id  ? { page_id: form.page_id } :
      needsPixelId && form.pixel_id ? { pixel_id: form.pixel_id, custom_event_type: "PURCHASE" } :
      needsAppId   && form.app_id   ? { application_id: form.app_id } :
      undefined;

    try {
      await createAdSet({
        campaign_id:       campaignId,
        ad_account_id:     form.ad_account_id,
        name:              form.name,
        optimization_goal: form.optimization_goal,
        billing_event:     form.billing_event,
        status:            "PAUSED",
        ...(form.budgetType === "daily"    && { daily_budget:    parseFloat(form.daily_budget) }),
        ...(form.budgetType === "lifetime" && { lifetime_budget: parseFloat(form.lifetime_budget) }),
        ...(showBidAmount && form.bid_amount && { bid_amount: parseFloat(form.bid_amount) }),
        ...(form.start_time && { start_time: form.start_time }),
        ...(form.end_time   && { end_time:   form.end_time }),
        ...(promoted_object && { promoted_object }),
        targeting: {
          age_min:             Number(form.age_min),
          age_max:             Number(form.age_max),
          ...(genders.length && { genders }),
          geo_locations:       { countries: [form.country] },
          device_platforms:    devicePlatforms,
          publisher_platforms: ["facebook", "instagram"],
        },
      }).unwrap();
      toast.success("Ad set created successfully");
      router.push(`/ads/meta/campaigns/${campaignId}/adsets`);
    } catch (e: unknown) {
      const msg = (e as { data?: { message?: string } })?.data?.message || "Failed to create ad set";
      toast.error(msg);
    }
  };

  return (
    <div className="sm:p-8 p-4 space-y-5">
      <CommonHeader
        title="Create Ad Set"
        description="Set up targeting, budget, and schedule"
        backBtn
        rightContent={
          <Button onClick={handleSubmit} disabled={isLoading || !form.optimization_goal}
            className="h-11 px-6 gap-2 font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
            {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Create Ad Set
          </Button>
        }
      />

      {/* Campaign context */}
      {campaign && (
        <div className="max-w-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-3 flex items-center gap-3">
          <Info size={15} className="text-blue-500 shrink-0" />
          <p className="text-sm text-blue-700 dark:text-blue-300">
            Campaign: <span className="font-bold">{campaign.name}</span>
            {objective && ` · ${objective.replace("OUTCOME_", "")}`}
            {bidStrategy && ` · ${bidStrategy.replace(/_/g, " ")}`}
          </p>
        </div>
      )}

      <div className="max-w-2xl space-y-5">

        {/* ── Basic Info ─────────────────────────────────────────────────── */}
        <Section title="Basic Info">
          <Field label="Ad Account *">
            <Select value={form.ad_account_id} onValueChange={v => set("ad_account_id", v)}>
              <SelectTrigger className="h-10 bg-slate-50/50 dark:border-none border-slate-200 rounded-lg">
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent className="dark:bg-(--card-color) dark:border-(--card-border-color)">
                {(accountsRes?.data || []).map(a => <SelectItem key={a._id} value={a._id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Ad Set Name *">
            <Input placeholder="e.g. India · Lead Gen · 18-35"
              value={form.name} onChange={e => set("name", e.target.value)}
              className="h-10 bg-slate-50/50 dark:border-none border-slate-200 rounded-lg" />
          </Field>
        </Section>

        {/* ── Optimization & Billing ─────────────────────────────────────── */}
        <Section title="Optimization & Billing">

          <Field label="Optimization Goal *">
            {!objective ? (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <AlertTriangle size={14} className="text-amber-500 shrink-0" />
                <p className="text-xs text-amber-700 dark:text-amber-300">Campaign data loading…</p>
              </div>
            ) : (
              <Select value={form.optimization_goal} onValueChange={handleGoalChange}>
                <SelectTrigger className="h-10 bg-slate-50/50 dark:border-none border-slate-200 rounded-lg">
                  <SelectValue placeholder="Select goal..." />
                </SelectTrigger>
                <SelectContent className="dark:bg-(--card-color) dark:border-(--card-border-color)">
                  {availableGoals.map(g => (
                    <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-1">
              <Info size={10} /> Goals are filtered to only what Meta allows for this campaign objective.
            </p>
          </Field>

          {/* Page — required for LEAD_GENERATION, PAGE_LIKES */}
          {needsPageId && (
            <Field label="Facebook Page *">
              {pages.length > 0 ? (
                <Select value={form.page_id} onValueChange={v => set("page_id", v)}>
                  <SelectTrigger className="h-10 bg-slate-50/50 dark:border-none border-slate-200 rounded-lg">
                    <SelectValue placeholder="Select page..." />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-(--card-color) dark:border-(--card-border-color)">
                    {pages.map(p => <SelectItem key={p.page_id} value={p.page_id}>{p.page_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                  <AlertTriangle size={14} className="text-amber-500 shrink-0" />
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    {form.ad_account_id
                      ? "No pages found. Link a Facebook Page to this ad account first."
                      : "Select an ad account to load available pages."}
                  </p>
                </div>
              )}
            </Field>
          )}

          {/* Pixel ID — required for OFFSITE_CONVERSIONS, VALUE */}
          {needsPixelId && (
            <Field label="Meta Pixel ID *">
              <Input placeholder="e.g. 1234567890123456"
                value={form.pixel_id} onChange={e => set("pixel_id", e.target.value)}
                className="h-10 bg-slate-50/50 dark:border-none border-slate-200 rounded-lg" />
              <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-1">
                <Info size={10} /> Find Pixel ID in Meta Business Suite → Events Manager → Data Sources.
              </p>
            </Field>
          )}

          {/* App ID — required for APP_INSTALLS */}
          {needsAppId && (
            <Field label="App ID *">
              <Input placeholder="e.g. 1234567890"
                value={form.app_id} onChange={e => set("app_id", e.target.value)}
                className="h-10 bg-slate-50/50 dark:border-none border-slate-200 rounded-lg" />
              <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-1">
                <Info size={10} /> Find App ID in Meta for Developers → My Apps.
              </p>
            </Field>
          )}

          <Field label="Billing Event">
            <Select value={form.billing_event} onValueChange={v => set("billing_event", v)}>
              <SelectTrigger className="h-10 bg-slate-50/50 dark:border-none border-slate-200 rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="dark:bg-(--card-color) dark:border-(--card-border-color)">
                {availableBillings.map(b => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>

          {showBidAmount && (
            <Field label={`Bid Amount (₹) — required for ${bidStrategy.replace(/_/g, " ")}`}>
              <Input type="number" min={1} placeholder="e.g. 25"
                value={form.bid_amount} onChange={e => set("bid_amount", e.target.value)}
                className="h-10 bg-slate-50/50 dark:border-none border-slate-200 rounded-lg" />
            </Field>
          )}
        </Section>

        {/* ── Budget ─────────────────────────────────────────────────────── */}
        <Section title="Budget">
          <div className="grid grid-cols-2 gap-3">
            {["daily", "lifetime"].map(type => (
              <button key={type} onClick={() => set("budgetType", type)}
                className={`p-3 rounded-lg border-2 text-left transition-all ${form.budgetType === type
                  ? "border-primary bg-primary/5 dark:bg-primary/10"
                  : "border-slate-200 dark:border-(--card-border-color) hover:border-primary/30"}`}>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 capitalize">{type} Budget</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{type === "daily" ? "Spend per day" : "Total spend"}</p>
              </button>
            ))}
          </div>
          <Field label="Amount (INR) *">
            <Input type="number" min={1}
              value={form.budgetType === "daily" ? form.daily_budget : form.lifetime_budget}
              onChange={e => set(form.budgetType === "daily" ? "daily_budget" : "lifetime_budget", e.target.value)}
              placeholder={form.budgetType === "daily" ? "Min ₹41/day" : "e.g. 10000"}
              className="h-10 bg-slate-50/50 dark:border-none border-slate-200 rounded-lg" />
          </Field>
        </Section>

        {/* ── Targeting ──────────────────────────────────────────────────── */}
        <Section title="Audience Targeting">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Min Age (18–65)">
              <Input type="number" min={18} max={65} value={form.age_min}
                onChange={e => set("age_min", e.target.value)}
                className="h-10 bg-slate-50/50 dark:border-none border-slate-200 rounded-lg" />
            </Field>
            <Field label="Max Age (18–65)">
              <Input type="number" min={18} max={65} value={form.age_max}
                onChange={e => set("age_max", e.target.value)}
                className="h-10 bg-slate-50/50 dark:border-none border-slate-200 rounded-lg" />
            </Field>
          </div>
          <Field label="Gender">
            <Select value={form.gender} onValueChange={v => set("gender", v)}>
              <SelectTrigger className="h-10 bg-slate-50/50 dark:border-none border-slate-200 rounded-lg"><SelectValue /></SelectTrigger>
              <SelectContent className="dark:bg-(--card-color) dark:border-(--card-border-color)">
                <SelectItem value="all">All Genders</SelectItem>
                <SelectItem value="1">Male only</SelectItem>
                <SelectItem value="2">Female only</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Country">
            <Select value={form.country} onValueChange={v => set("country", v)}>
              <SelectTrigger className="h-10 bg-slate-50/50 dark:border-none border-slate-200 rounded-lg"><SelectValue /></SelectTrigger>
              <SelectContent className="dark:bg-(--card-color) dark:border-(--card-border-color)">
                {COUNTRIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Device Platforms">
            <Select value={form.device_platforms} onValueChange={v => set("device_platforms", v)}>
              <SelectTrigger className="h-10 bg-slate-50/50 dark:border-none border-slate-200 rounded-lg"><SelectValue /></SelectTrigger>
              <SelectContent className="dark:bg-(--card-color) dark:border-(--card-border-color)">
                <SelectItem value="all">All (Mobile + Desktop)</SelectItem>
                <SelectItem value="mobile">Mobile only</SelectItem>
                <SelectItem value="desktop">Desktop only</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </Section>

        {/* ── Schedule ───────────────────────────────────────────────────── */}
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

export default CreateMetaAdSet;
