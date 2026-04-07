"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  useGetGoogleCampaignsQuery, useGetGoogleAdAccountsQuery,
  useUpdateGoogleCampaignStatusMutation, useSyncGoogleCampaignsMutation,
} from "@/src/redux/api/googleAdsApi";
import { Button } from "@/src/elements/ui/button";
import { Badge } from "@/src/elements/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/elements/ui/select";
import CommonHeader from "@/src/shared/CommonHeader";
import { DataTable } from "@/src/shared/DataTable";
import { Column } from "@/src/types/shared";
import { BarChart3, Pause, Play, Plus } from "lucide-react";
import { toast } from "sonner";

const STATUS_CFG: Record<string, { label: string; dot: string; badge: string }> = {
  ENABLED: { label: "Active",  dot: "bg-emerald-500 animate-pulse", badge: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400" },
  PAUSED:  { label: "Paused",  dot: "bg-amber-400",                 badge: "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400" },
  REMOVED: { label: "Removed", dot: "bg-slate-400",                 badge: "bg-slate-100 text-slate-500 dark:bg-(--dark-body) dark:text-slate-400" },
};

const CAMPAIGN_TYPES = ["SEARCH","DISPLAY","SHOPPING","VIDEO","PERFORMANCE_MAX"];

const GoogleCampaignsPage = () => {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [accountFilter, setAccountFilter] = useState("");

  const { data: accountsRes } = useGetGoogleAdAccountsQuery();
  const { data: campaignsRes, isLoading, isFetching, refetch } = useGetGoogleCampaignsQuery({
    ad_account_id: accountFilter||undefined, status: statusFilter||undefined,
    campaign_type: typeFilter||undefined, search: searchTerm||undefined, page, limit,
  });
  const [updateStatus] = useUpdateGoogleCampaignStatusMutation();
  const [sync] = useSyncGoogleCampaignsMutation();

  const accounts = accountsRes?.data || [];
  const campaigns = campaignsRes?.data || [];
  const total = campaignsRes?.pagination?.total || 0;

  const handleToggle = async (id: string, current: string) => {
    try { await updateStatus({ id, status: current==="ENABLED"?"PAUSED":"ENABLED" }).unwrap(); toast.success("Updated"); }
    catch { toast.error("Failed"); }
  };

  const columns: Column<typeof campaigns[0]>[] = [
    {
      header: "Campaign", accessorKey: "name",
      cell: (row) => (
        <div className="flex flex-col gap-0.5 py-1">
          <span className="font-bold text-sm text-slate-800 dark:text-slate-200">{row.name}</span>
          <span className="text-[10px] text-slate-400">{row.campaign_type?.replace(/_/g," ")}</span>
        </div>
      ),
    },
    {
      header: "Status", accessorKey: "status",
      cell: (row) => {
        const cfg = STATUS_CFG[row.status] || STATUS_CFG.PAUSED;
        return <div className="flex items-center gap-2"><div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`}/><Badge variant="outline" className={`text-[10px] font-bold border-none px-2 py-0 h-5 ${cfg.badge}`}>{cfg.label}</Badge></div>;
      },
    },
    {
      header: "Budget", accessorKey: "budget_amount",
      cell: (row) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-bold text-sm text-slate-800 dark:text-slate-200">₹{((row.budget_amount||0)/1_000_000).toLocaleString()}</span>
          <span className="text-[10px] text-slate-400">{row.budget_type||"Daily"}</span>
        </div>
      ),
    },
    {
      header: "Performance", accessorKey: "stats",
      cell: (row) => (
        <div className="flex items-center gap-4 text-xs">
          <div><p className="font-bold text-slate-800 dark:text-slate-200">{(row.stats?.impressions||0).toLocaleString()}</p><p className="text-[9px] text-slate-400 uppercase">Impr.</p></div>
          <div><p className="font-bold text-slate-800 dark:text-slate-200">{(row.stats?.clicks||0).toLocaleString()}</p><p className="text-[9px] text-slate-400 uppercase">Clicks</p></div>
          <div><p className="font-bold text-slate-800 dark:text-slate-200">{row.stats?.conversions||0}</p><p className="text-[9px] text-slate-400 uppercase">Conv.</p></div>
          <div><p className="font-bold text-slate-800 dark:text-slate-200">₹{((row.stats?.spend_micros||0)/1_000_000).toFixed(0)}</p><p className="text-[9px] text-slate-400 uppercase">Spend</p></div>
        </div>
      ),
    },
    {
      header: "Actions",
      cell: (row) => (
        <div className="flex items-center gap-1.5 justify-end pr-2">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg hover:bg-primary/10 hover:text-primary"
            onClick={() => router.push(`/ads/google/campaigns/${row._id}/adgroups`)}><BarChart3 size={13}/></Button>
          <Button variant="ghost" size="sm"
            className={`h-8 w-8 p-0 rounded-lg ${row.status==="ENABLED" ? "hover:bg-amber-50 hover:text-amber-500" : "hover:bg-emerald-50 hover:text-emerald-500"}`}
            onClick={() => handleToggle(row._id, row.status)}>
            {row.status==="ENABLED" ? <Pause size={13}/> : <Play size={13}/>}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="sm:p-8 p-4 space-y-6">
      <CommonHeader
        title="Google Campaigns"
        description="Manage your Google Ads campaigns"
        onSearch={(v) => { setSearchTerm(v); setPage(1); }}
        searchTerm={searchTerm}
        searchPlaceholder="Search campaigns..."
        onRefresh={() => { refetch(); toast.success("Refreshed"); }}
        onSync={async () => { if (!accountFilter) { toast.error("Select an account first"); return; } try { await sync(accountFilter).unwrap(); toast.success("Synced"); } catch { toast.error("Sync failed"); } }}
        isLoading={isLoading}
        backBtn
        rightContent={
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={accountFilter} onValueChange={(v) => { setAccountFilter(v==="all"?"":v); setPage(1); }}>
              <SelectTrigger className="h-11 w-44 bg-white dark:bg-(--card-color) rounded-lg text-sm border-slate-200 dark:border-(--card-border-color)">
                <SelectValue placeholder="All accounts" />
              </SelectTrigger>
              <SelectContent className="dark:bg-(--card-color) dark:border-(--card-border-color)">
                <SelectItem value="all">All Accounts</SelectItem>
                {accounts.map(a => <SelectItem key={a._id} value={a._id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v==="all"?"":v); setPage(1); }}>
              <SelectTrigger className="h-11 w-36 bg-white dark:bg-(--card-color) rounded-lg text-sm border-slate-200 dark:border-(--card-border-color)">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent className="dark:bg-(--card-color) dark:border-(--card-border-color)">
                <SelectItem value="all">All Types</SelectItem>
                {CAMPAIGN_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g," ")}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button className="h-11 px-4 gap-2 font-bold text-sm bg-red-500 hover:bg-red-600 text-white rounded-lg"
              onClick={() => router.push("/ads/google/campaigns/create")}>
              <Plus size={13}/> New Campaign
            </Button>
          </div>
        }
      />
      <div className="bg-white dark:bg-(--card-color) rounded-xl border border-slate-100 dark:border-(--card-border-color) shadow-sm overflow-hidden">
        <DataTable data={campaigns} columns={columns} isLoading={isLoading} isFetching={isFetching}
          totalCount={total} page={page} limit={limit} onPageChange={setPage} onLimitChange={setLimit}
          getRowId={(item) => item._id} emptyMessage="No campaigns found."
          className="border-none shadow-none rounded-none" />
      </div>
    </div>
  );
};

export default GoogleCampaignsPage;