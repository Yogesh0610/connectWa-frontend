"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  useGetMetaAdAccountsQuery,
  useGetMetaCampaignsQuery,
  useDisconnectMetaAccountMutation,
  useSyncMetaCampaignsMutation,
  useUpdateMetaCampaignStatusMutation,
  useDeleteMetaCampaignMutation,
} from "@/src/redux/api/metaAdsApi";
import {
  useGetGoogleAdAccountsQuery,
  useGetGoogleCampaignsQuery,
  useDisconnectGoogleAccountMutation,
  useSyncGoogleCampaignsMutation,
  useUpdateGoogleCampaignStatusMutation,
  useDeleteGoogleCampaignMutation,
} from "@/src/redux/api/googleAdsApi";
import { Button } from "@/src/elements/ui/button";
import { Badge } from "@/src/elements/ui/badge";
import CommonHeader from "@/src/shared/CommonHeader";
import ConfirmModal from "@/src/shared/ConfirmModal";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/src/elements/ui/dropdown-menu";
import {
  BarChart3, ChevronDown, ExternalLink, Globe, Loader2, Megaphone,
  Pause, Play, Plus, Trash2, TrendingUp, Unlink, Users, Zap,
} from "lucide-react";
import { toast } from "sonner";

const STATUS_CONFIG: Record<string, { label: string; dot: string; badge: string }> = {
  ACTIVE:  { label: "Active",  dot: "bg-emerald-500 animate-pulse", badge: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400" },
  ENABLED: { label: "Active",  dot: "bg-emerald-500 animate-pulse", badge: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400" },
  PAUSED:  { label: "Paused",  dot: "bg-amber-400",                 badge: "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400" },
  DELETED: { label: "Deleted", dot: "bg-red-400",                   badge: "bg-red-50 text-red-500 dark:bg-red-900/20 dark:text-red-400" },
  REMOVED: { label: "Removed", dot: "bg-slate-400",                 badge: "bg-slate-100 text-slate-500 dark:bg-(--dark-body) dark:text-slate-400" },
};

const PLATFORM_CONFIG = {
  meta:   { label: "Meta",   bg: "bg-blue-50 dark:bg-blue-900/20",   border: "border-blue-100 dark:border-blue-800/30",   icon: () => <span className="font-black text-blue-600 text-sm">f</span> },
  google: { label: "Google", bg: "bg-red-50 dark:bg-red-900/20",     border: "border-red-100 dark:border-red-800/30",     icon: () => <span className="font-black text-red-500 text-sm">G</span> },
};

// Meta budget is in paise (÷100), Google budget is in micros (÷1,000,000)
const formatBudget = (amount?: number, platform: "meta" | "google" = "meta") => {
  if (!amount) return "—";
  const divisor = platform === "google" ? 1_000_000 : 100;
  return `₹${(amount / divisor).toLocaleString("en-IN")}`;
};

const formatNum = (n?: number) => {
  if (!n) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
};

const StatCard = ({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: React.ElementType; color: string }) => (
  <div className="bg-white dark:bg-(--card-color) rounded-xl border border-slate-100 dark:border-(--card-border-color) shadow-sm p-5 flex items-center gap-4">
    <div className={`p-3 rounded-xl ${color}`}><Icon size={20} /></div>
    <div>
      <p className="text-2xl font-black text-slate-900 dark:text-slate-100">{value}</p>
      <p className="text-xs text-slate-500 font-bold uppercase tracking-wide mt-0.5">{label}</p>
    </div>
  </div>
);

const AdsManager = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"all" | "meta" | "google">("all");
  const [disconnectInfo, setDisconnectInfo] = useState<{ id: string; platform: "meta" | "google"; name: string } | null>(null);
  const [deleteCampaignInfo, setDeleteCampaignInfo] = useState<{ id: string; name: string; platform: "meta" | "google" } | null>(null);

  const { data: metaAccountsRes, isLoading: metaAccountsLoading } = useGetMetaAdAccountsQuery();
  const { data: metaCampaignsRes, isLoading: metaCampaignsLoading, refetch: refetchMeta } = useGetMetaCampaignsQuery();
  const [disconnectMeta, { isLoading: isDisconnectingMeta }] = useDisconnectMetaAccountMutation();
  const [syncMeta] = useSyncMetaCampaignsMutation();
  const [updateMetaStatus] = useUpdateMetaCampaignStatusMutation();
  const [deleteMeta, { isLoading: isDeletingMeta }] = useDeleteMetaCampaignMutation();

  const { data: googleAccountsRes, isLoading: googleAccountsLoading } = useGetGoogleAdAccountsQuery();
  const { data: googleCampaignsRes, isLoading: googleCampaignsLoading, refetch: refetchGoogle } = useGetGoogleCampaignsQuery();
  const [disconnectGoogle, { isLoading: isDisconnectingGoogle }] = useDisconnectGoogleAccountMutation();
  const [syncGoogle] = useSyncGoogleCampaignsMutation();
  const [updateGoogleStatus] = useUpdateGoogleCampaignStatusMutation();
  const [deleteGoogle, { isLoading: isDeletingGoogle }] = useDeleteGoogleCampaignMutation();

  const metaAccounts = metaAccountsRes?.data || [];
  const googleAccounts = googleAccountsRes?.data || [];
  const metaCampaigns = metaCampaignsRes?.data || [];
  const googleCampaigns = googleCampaignsRes?.data || [];
  const isLoading = metaAccountsLoading || googleAccountsLoading || metaCampaignsLoading || googleCampaignsLoading;

  const totalAccounts = metaAccounts.length + googleAccounts.length;
  const totalCampaigns = metaCampaigns.length + googleCampaigns.length;
  const activeCampaigns = [...metaCampaigns.filter(c => c.status === "ACTIVE"), ...googleCampaigns.filter(c => c.status === "ENABLED")].length;
  const totalSpend = metaCampaigns.reduce((sum, c) => sum + Number(c.stats?.spend || 0), 0);

  const handleDisconnect = async () => {
    if (!disconnectInfo) return;
    try {
      if (disconnectInfo.platform === "meta") await disconnectMeta(disconnectInfo.id).unwrap();
      else await disconnectGoogle(disconnectInfo.id).unwrap();
      toast.success("Account disconnected");
      setDisconnectInfo(null);
    } catch { toast.error("Failed to disconnect"); }
  };

  const handleRefresh = () => { refetchMeta(); refetchGoogle(); toast.success("Refreshed"); };

  const AccountCard = ({ account, platform }: { account: { _id: string; name: string; currency?: string }; platform: "meta" | "google" }) => {
    const cfg = PLATFORM_CONFIG[platform];
    const Icon = cfg.icon;
    return (
      <div className={`flex items-center justify-between p-3.5 rounded-xl border ${cfg.border} ${cfg.bg}`}>
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg bg-white dark:bg-(--card-color) border ${cfg.border} flex items-center justify-center shadow-sm`}><Icon /></div>
          <div>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate max-w-[150px]">{account.name}</p>
            <p className="text-[10px] text-slate-500">{cfg.label} · {account.currency || "—"}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-lg hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
          onClick={() => setDisconnectInfo({ id: account._id, platform, name: account.name })}>
          <Unlink size={12} />
        </Button>
      </div>
    );
  };

  const CampaignRow = ({ id, name, status, platform, budget, impressions, clicks, spend, onToggle, onDelete }: {
    id: string; name: string; status: string; platform: "meta" | "google";
    budget?: number; impressions?: number; clicks?: number; spend?: number;
    onToggle: () => void; onDelete: () => void;
  }) => {
    const sc = STATUS_CONFIG[status] || STATUS_CONFIG.PAUSED;
    const pc = PLATFORM_CONFIG[platform];
    const Icon = pc.icon;
    const isActive = status === "ACTIVE" || status === "ENABLED";
    return (
      <div className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50/80 dark:hover:bg-(--table-hover) transition-colors border-b border-slate-50 dark:border-(--card-border-color) last:border-none group">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${pc.bg} border ${pc.border}`}><Icon /></div>
          <div className="min-w-0">
            <p className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate">{name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <div className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
              <Badge variant="outline" className={`text-[10px] font-bold border-none px-1.5 py-0 h-4 ${sc.badge}`}>{sc.label}</Badge>
            </div>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-6 text-right">
          <div><p className="text-xs font-black text-slate-800 dark:text-slate-200">{formatNum(impressions)}</p><p className="text-[9px] text-slate-400 uppercase font-bold">Impr.</p></div>
          <div><p className="text-xs font-black text-slate-800 dark:text-slate-200">{formatNum(clicks)}</p><p className="text-[9px] text-slate-400 uppercase font-bold">Clicks</p></div>
          <div><p className="text-xs font-black text-slate-800 dark:text-slate-200">₹{formatNum(spend)}</p><p className="text-[9px] text-slate-400 uppercase font-bold">Spend</p></div>
          <div><p className="text-xs font-black text-slate-800 dark:text-slate-200">{formatBudget(budget, platform)}</p><p className="text-[9px] text-slate-400 uppercase font-bold">Budget</p></div>
        </div>
        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="sm" className={`h-8 w-8 p-0 rounded-lg ${isActive ? "hover:bg-amber-50 hover:text-amber-500" : "hover:bg-emerald-50 hover:text-emerald-500"}`} onClick={onToggle}>
            {isActive ? <Pause size={13} /> : <Play size={13} />}
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg hover:bg-slate-100 dark:hover:bg-(--dark-body)"
            onClick={() => router.push(`/ads/campaigns/${id}?platform=${platform}`)}>
            <ExternalLink size={13} />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg hover:bg-red-50 hover:text-red-500" onClick={onDelete}>
            <Trash2 size={13} />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="sm:p-8 p-4 space-y-8">
      <CommonHeader
        title="Ads Manager"
        description="Manage Meta & Google ad campaigns in one place"
        onRefresh={handleRefresh}
        isLoading={isLoading}
        rightContent={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="h-11 px-4 rounded-lg font-bold text-sm bg-primary text-white gap-2 shadow-lg shadow-primary/20">
                <Plus size={14} /> Connect Account <ChevronDown size={12} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="dark:bg-(--card-color) dark:border-(--card-border-color)">
              <DropdownMenuItem onClick={() => router.push("/ads/meta/accounts")} className="gap-2 font-semibold cursor-pointer">
                <span className="font-black text-blue-600">f</span> Connect Meta Account
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/ads/google/accounts")} className="gap-2 font-semibold cursor-pointer">
                <span className="font-black text-red-500">G</span> Connect Google Account
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      {// Stats
      }
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Connected Accounts" value={totalAccounts}  icon={Globe}     color="bg-primary/10 text-primary" />
        <StatCard label="Total Campaigns"    value={totalCampaigns} icon={Megaphone} color="bg-blue-100 text-blue-600 dark:bg-blue-900/30" />
        <StatCard label="Active Campaigns"   value={activeCampaigns} icon={Zap}      color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30" />
        <StatCard label="Total Spend"        value={`₹${formatNum(totalSpend)}`} icon={TrendingUp} color="bg-amber-100 text-amber-600 dark:bg-amber-900/30" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {// Accounts sidebar
        }
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white dark:bg-(--card-color) rounded-xl border border-slate-100 dark:border-(--card-border-color) shadow-sm p-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-black uppercase tracking-wider text-slate-400">Accounts</p>
              <Badge variant="outline" className="text-[10px] font-bold border-none bg-slate-100 dark:bg-(--dark-body) text-slate-500">{totalAccounts}</Badge>
            </div>
            {isLoading ? (
              <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-14 rounded-xl bg-slate-100 dark:bg-(--dark-body) animate-pulse" />)}</div>
            ) : totalAccounts === 0 ? (
              <div className="py-8 text-center">
                <Globe size={24} className="text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-400 font-medium">No accounts connected</p>
                <Button size="sm" className="mt-3 h-8 text-xs bg-primary text-white rounded-lg" onClick={() => router.push("/ads/meta/accounts")}>Connect Now</Button>
              </div>
            ) : (
              <div className="space-y-2">
                {metaAccounts.map(acc => <AccountCard key={acc._id} account={acc} platform="meta" />)}
                {googleAccounts.map(acc => <AccountCard key={acc._id} account={acc} platform="google" />)}
              </div>
            )}
          </div>
          <div className="bg-white dark:bg-(--card-color) rounded-xl border border-slate-100 dark:border-(--card-border-color) shadow-sm p-4 space-y-1">
            <p className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">Quick Links</p>
            {[
              { label: "Meta Campaigns",  path: "/ads/meta",            icon: Megaphone, color: "text-blue-600" },
              { label: "Google Campaigns",path: "/ads/google",          icon: BarChart3, color: "text-red-500" },
              { label: "Lead Forms",      path: "/ads/meta/lead-forms", icon: Users,     color: "text-purple-600" },
            ].map(item => (
              <button key={item.path} onClick={() => router.push(item.path)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-(--table-hover) transition-colors text-left">
                <item.icon size={15} className={item.color} />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {// Campaigns table
        }
        <div className="lg:col-span-3">
          <div className="bg-white dark:bg-(--card-color) rounded-xl border border-slate-100 dark:border-(--card-border-color) shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50 dark:border-(--card-border-color)">
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-(--dark-body) rounded-lg p-1">
                {(["all","meta","google"] as const).map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold capitalize transition-all ${activeTab === tab ? "bg-white dark:bg-(--card-color) text-slate-900 dark:text-slate-100 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                    {tab === "all" ? `All (${totalCampaigns})` : tab === "meta" ? `Meta (${metaCampaigns.length})` : `Google (${googleCampaigns.length})`}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" className="h-8 px-3 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg gap-1" onClick={() => router.push("/ads/meta/campaigns/create")}>
                  <Plus size={11} /> Meta
                </Button>
                <Button size="sm" className="h-8 px-3 text-xs font-bold bg-red-500 hover:bg-red-600 text-white rounded-lg gap-1" onClick={() => router.push("/ads/google/campaigns/create")}>
                  <Plus size={11} /> Google
                </Button>
              </div>
            </div>
            {isLoading ? (
              <div className="p-5 space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 rounded-xl bg-slate-50 dark:bg-(--dark-body) animate-pulse" />)}</div>
            ) : totalCampaigns === 0 ? (
              <div className="py-20 text-center">
                <Megaphone size={32} className="text-slate-200 dark:text-slate-700 mx-auto mb-3" />
                <p className="text-sm font-bold text-slate-400">No campaigns yet</p>
              </div>
            ) : (
              <div>
                {(activeTab === "all" || activeTab === "meta") && metaCampaigns.map(c => (
                  <CampaignRow key={c._id} id={c._id} name={c.name} status={c.status} platform="meta"
                    budget={c.daily_budget || c.lifetime_budget} impressions={c.stats?.impressions} clicks={c.stats?.clicks} spend={Number(c.stats?.spend || 0)}
                    onToggle={async () => { try { await updateMetaStatus({ id: c._id, status: c.status === "ACTIVE" ? "PAUSED" : "ACTIVE" }).unwrap(); toast.success("Updated"); } catch { toast.error("Failed"); } }}
                    onDelete={() => setDeleteCampaignInfo({ id: c._id, name: c.name, platform: "meta" })} />
                ))}
                {(activeTab === "all" || activeTab === "google") && googleCampaigns.map(c => (
                  <CampaignRow key={c._id} id={c._id} name={c.name} status={c.status} platform="google"
                    budget={c.budget_amount} impressions={c.stats?.impressions} clicks={c.stats?.clicks} spend={c.stats?.spend_micros ? c.stats.spend_micros / 1_000_000 : 0}
                    onToggle={async () => { try { await updateGoogleStatus({ id: c._id, status: c.status === "ENABLED" ? "PAUSED" : "ENABLED" }).unwrap(); toast.success("Updated"); } catch { toast.error("Failed"); } }}
                    onDelete={() => setDeleteCampaignInfo({ id: c._id, name: c.name, platform: "google" })} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmModal isOpen={!!disconnectInfo} onClose={() => setDisconnectInfo(null)} onConfirm={handleDisconnect}
        isLoading={isDisconnectingMeta || isDisconnectingGoogle} title="Disconnect Account"
        subtitle={`Disconnect "${disconnectInfo?.name}"? Campaigns will stop syncing.`} confirmText="Disconnect" variant="danger" />
      <ConfirmModal isOpen={!!deleteCampaignInfo} onClose={() => setDeleteCampaignInfo(null)}
        onConfirm={async () => {
          try {
            if (deleteCampaignInfo!.platform === "meta") {
              await deleteMeta(deleteCampaignInfo!.id).unwrap();
            } else {
              await deleteGoogle(deleteCampaignInfo!.id).unwrap();
            }
            toast.success("Deleted");
            setDeleteCampaignInfo(null);
          } catch { toast.error("Failed"); }
        }}
        isLoading={isDeletingMeta || isDeletingGoogle} title="Delete Campaign" subtitle={`Delete "${deleteCampaignInfo?.name}"?`} confirmText="Delete" variant="danger" />
    </div>
  );
};

export default AdsManager;