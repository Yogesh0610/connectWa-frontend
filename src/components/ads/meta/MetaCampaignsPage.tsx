"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  useGetMetaCampaignsQuery, useGetMetaAdAccountsQuery,
  useUpdateMetaCampaignStatusMutation, useDeleteMetaCampaignMutation, useSyncMetaCampaignsMutation,
} from "@/src/redux/api/metaAdsApi";
import { Button } from "@/src/elements/ui/button";
import { Badge } from "@/src/elements/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/elements/ui/select";
import CommonHeader from "@/src/shared/CommonHeader";
import ConfirmModal from "@/src/shared/ConfirmModal";
import { DataTable } from "@/src/shared/DataTable";
import { Column } from "@/src/types/shared";
import { BarChart3, Loader2, Pause, Play, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import useDebounce from "@/src/utils/hooks/useDebounce";

const STATUS_CONFIG: Record<string, { label: string; dot: string; badge: string }> = {
  ACTIVE:  { label: "Active",  dot: "bg-emerald-500 animate-pulse", badge: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400" },
  PAUSED:  { label: "Paused",  dot: "bg-amber-400",                 badge: "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400" },
  DELETED: { label: "Deleted", dot: "bg-red-400",                   badge: "bg-red-50 text-red-500 dark:bg-red-900/20 dark:text-red-400" },
};

const MetaCampaignsPage = () => {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 400);
  const [statusFilter, setStatusFilter] = useState("");
  const [accountFilter, setAccountFilter] = useState("");
  const [deleteInfo, setDeleteInfo] = useState<{ id: string; name: string } | null>(null);

  const { data: accountsRes } = useGetMetaAdAccountsQuery();
  const { data: campaignsRes, isLoading, isFetching, refetch } = useGetMetaCampaignsQuery({
    ad_account_id: accountFilter || undefined, status: statusFilter || undefined,
    search: debouncedSearch || undefined, page, limit,
  });
  const [updateStatus] = useUpdateMetaCampaignStatusMutation();
  const [deleteCampaign, { isLoading: isDeleting }] = useDeleteMetaCampaignMutation();
  const [sync, { isLoading: isSyncing }] = useSyncMetaCampaignsMutation();

  const accounts = accountsRes?.data || [];
  const campaigns = campaignsRes?.data || [];
  const total = campaignsRes?.pagination?.total || 0;

  const handleToggleStatus = async (id: string, current: string) => {
    try { await updateStatus({ id, status: current === "ACTIVE" ? "PAUSED" : "ACTIVE" }).unwrap(); toast.success("Updated"); }
    catch { toast.error("Failed to update status"); }
  };

  const columns: Column<typeof campaigns[0]>[] = [
    {
      header: "Campaign", accessorKey: "name",
      cell: (row) => (
        <div className="flex flex-col gap-0.5 py-1">
          <span className="font-bold text-sm text-slate-800 dark:text-slate-200">{row.name}</span>
          <span className="text-[10px] text-slate-400">{row.objective?.replace("OUTCOME_","")}</span>
        </div>
      ),
    },
    {
      header: "Status", accessorKey: "status",
      cell: (row) => {
        const cfg = STATUS_CONFIG[row.status] || STATUS_CONFIG.PAUSED;
        return (
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            <Badge variant="outline" className={`text-[10px] font-bold border-none px-2 py-0 h-5 ${cfg.badge}`}>{cfg.label}</Badge>
          </div>
        );
      },
    },
    {
      header: "Budget", accessorKey: "daily_budget",
      cell: (row) => {
        const budget = row.daily_budget || row.lifetime_budget;
        return budget
          ? <div className="flex flex-col"><span className="font-bold text-sm text-slate-800 dark:text-slate-200">₹{(budget/100).toLocaleString()}</span><span className="text-[10px] text-slate-400">{row.daily_budget ? "Daily" : "Lifetime"}</span></div>
          : <span className="text-slate-400">—</span>;
      },
    },
    {
      header: "Performance", accessorKey: "stats",
      cell: (row) => (
        <div className="flex items-center gap-4 text-xs">
          <div><p className="font-bold text-slate-800 dark:text-slate-200">{(row.stats?.impressions||0).toLocaleString()}</p><p className="text-[9px] text-slate-400 uppercase">Impr.</p></div>
          <div><p className="font-bold text-slate-800 dark:text-slate-200">{(row.stats?.clicks||0).toLocaleString()}</p><p className="text-[9px] text-slate-400 uppercase">Clicks</p></div>
          <div><p className="font-bold text-slate-800 dark:text-slate-200">{row.stats?.leads||0}</p><p className="text-[9px] text-slate-400 uppercase">Leads</p></div>
          <div><p className="font-bold text-slate-800 dark:text-slate-200">₹{Number(row.stats?.spend||0).toFixed(0)}</p><p className="text-[9px] text-slate-400 uppercase">Spend</p></div>
        </div>
      ),
    },
    {
      header: "Actions",
      cell: (row) => (
        <div className="flex items-center gap-1.5 justify-end pr-2">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg hover:bg-primary/10 hover:text-primary"
            onClick={() => router.push(`/ads/meta/campaigns/${row._id}/adsets`)}><BarChart3 size={13} /></Button>
          <Button variant="ghost" size="sm"
            className={`h-8 w-8 p-0 rounded-lg ${row.status==="ACTIVE" ? "hover:bg-amber-50 hover:text-amber-500" : "hover:bg-emerald-50 hover:text-emerald-500"}`}
            onClick={() => handleToggleStatus(row._id, row.status)}>
            {row.status==="ACTIVE" ? <Pause size={13}/> : <Play size={13}/>}
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg hover:bg-red-50 hover:text-red-500"
            onClick={() => setDeleteInfo({ id: row._id, name: row.name })}><Trash2 size={13}/></Button>
        </div>
      ),
    },
  ];

  return (
    <div className="sm:p-8 p-4 space-y-6">
      <CommonHeader
        title="Meta Campaigns"
        description="Manage your Facebook & Instagram ad campaigns"
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
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v==="all"?"":v); setPage(1); }}>
              <SelectTrigger className="h-11 w-36 bg-white dark:bg-(--card-color) rounded-lg text-sm border-slate-200 dark:border-(--card-border-color)">
                <SelectValue placeholder="All status" />
              </SelectTrigger>
              <SelectContent className="dark:bg-(--card-color) dark:border-(--card-border-color)">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="PAUSED">Paused</SelectItem>
              </SelectContent>
            </Select>
            <Button className="h-11 px-4 gap-2 font-bold text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              onClick={() => router.push("/ads/meta/campaigns/create")}>
              <Plus size={13}/> New Campaign
            </Button>
          </div>
        }
      />
      <div className="bg-white dark:bg-(--card-color) rounded-xl border border-slate-100 dark:border-(--card-border-color) shadow-sm overflow-hidden">
        <DataTable data={campaigns} columns={columns} isLoading={isLoading} isFetching={isFetching}
          totalCount={total} page={page} limit={limit} onPageChange={setPage} onLimitChange={setLimit}
          getRowId={(item) => item._id} emptyMessage="No campaigns found. Create your first Meta campaign."
          className="border-none shadow-none rounded-none" />
      </div>
      <ConfirmModal isOpen={!!deleteInfo} onClose={() => setDeleteInfo(null)}
        onConfirm={async () => { try { await deleteCampaign(deleteInfo!.id).unwrap(); toast.success("Deleted"); setDeleteInfo(null); } catch { toast.error("Failed"); } }}
        isLoading={isDeleting} title="Delete Campaign" subtitle={`Delete "${deleteInfo?.name}"?`} confirmText="Delete" variant="danger" />
    </div>
  );
};

export default MetaCampaignsPage;