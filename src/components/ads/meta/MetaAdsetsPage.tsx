"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  useGetMetaAdSetsQuery,
  useUpdateMetaAdSetStatusMutation,
  useDeleteMetaAdSetMutation,
} from "@/src/redux/api/metaAdsApi";
import { Button } from "@/src/elements/ui/button";
import { Badge } from "@/src/elements/ui/badge";
import CommonHeader from "@/src/shared/CommonHeader";
import ConfirmModal from "@/src/shared/ConfirmModal";
import { DataTable } from "@/src/shared/DataTable";
import { Column } from "@/src/types/shared";
import { Eye, Pause, Play, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const STATUS_CONFIG: Record<string, { label: string; dot: string; badge: string }> = {
  ACTIVE:  { label: "Active",  dot: "bg-emerald-500 animate-pulse", badge: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400" },
  PAUSED:  { label: "Paused",  dot: "bg-amber-400",                 badge: "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400" },
  DELETED: { label: "Deleted", dot: "bg-red-400",                   badge: "bg-red-50 text-red-500 dark:bg-red-900/20 dark:text-red-400" },
};

const MetaAdsetsPage = ({ campaignId }: { campaignId: string }) => {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [deleteInfo, setDeleteInfo] = useState<{ id: string; name: string } | null>(null);

  const { data: adsetsRes, isLoading, isFetching, refetch } = useGetMetaAdSetsQuery({ campaign_id: campaignId, page, limit });
  const [updateStatus] = useUpdateMetaAdSetStatusMutation();
  const [deleteAdSet, { isLoading: isDeleting }] = useDeleteMetaAdSetMutation();

  const adsets = adsetsRes?.data || [];
  const total = adsetsRes?.pagination?.total || 0;

  const handleToggleStatus = async (id: string, current: string) => {
    try { await updateStatus({ id, status: current === "ACTIVE" ? "PAUSED" : "ACTIVE" }).unwrap(); toast.success("Updated"); }
    catch { toast.error("Failed to update status"); }
  };

  const columns: Column<typeof adsets[0]>[] = [
    {
      header: "Ad Set", accessorKey: "name",
      cell: (row) => (
        <div className="flex flex-col gap-0.5 py-1">
          <span className="font-bold text-sm text-slate-800 dark:text-slate-200">{row.name}</span>
          <span className="text-[10px] text-slate-400">{row.optimization_goal?.replace(/_/g, " ")}</span>
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
        const budget = row.daily_budget;
        return budget
          ? <span className="font-bold text-sm text-slate-800 dark:text-slate-200">₹{(budget / 100).toLocaleString()}/day</span>
          : <span className="text-slate-400">—</span>;
      },
    },
    {
      header: "Billing", accessorKey: "billing_event",
      cell: (row) => <span className="text-xs text-slate-500">{row.billing_event?.replace(/_/g, " ") || "—"}</span>,
    },
    {
      header: "Actions",
      cell: (row) => (
        <div className="flex items-center gap-1.5 justify-end pr-2">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg hover:bg-primary/10 hover:text-primary"
            onClick={() => router.push(`/ads/meta/campaigns/${campaignId}/adsets/${row._id}/ads`)}>
            <Eye size={13} />
          </Button>
          <Button variant="ghost" size="sm"
            className={`h-8 w-8 p-0 rounded-lg ${row.status === "ACTIVE" ? "hover:bg-amber-50 hover:text-amber-500" : "hover:bg-emerald-50 hover:text-emerald-500"}`}
            onClick={() => handleToggleStatus(row._id, row.status)}>
            {row.status === "ACTIVE" ? <Pause size={13} /> : <Play size={13} />}
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg hover:bg-red-50 hover:text-red-500"
            onClick={() => setDeleteInfo({ id: row._id, name: row.name })}><Trash2 size={13} /></Button>
        </div>
      ),
    },
  ];

  return (
    <div className="sm:p-8 p-4 space-y-6">
      <CommonHeader
        title="Ad Sets"
        description="Manage ad sets for this campaign"
        onRefresh={() => { refetch(); toast.success("Refreshed"); }}
        isLoading={isLoading}
        backBtn
        rightContent={
          <Button className="h-11 px-4 gap-2 font-bold text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            onClick={() => router.push(`/ads/meta/campaigns/${campaignId}/adsets/create`)}>
            <Plus size={13} /> New Ad Set
          </Button>
        }
      />
      <div className="bg-white dark:bg-(--card-color) rounded-xl border border-slate-100 dark:border-(--card-border-color) shadow-sm overflow-hidden">
        <DataTable data={adsets} columns={columns} isLoading={isLoading} isFetching={isFetching}
          totalCount={total} page={page} limit={limit} onPageChange={setPage} onLimitChange={setLimit}
          getRowId={(item) => item._id} emptyMessage="No ad sets found. Create your first ad set."
          className="border-none shadow-none rounded-none" />
      </div>
      <ConfirmModal isOpen={!!deleteInfo} onClose={() => setDeleteInfo(null)}
        onConfirm={async () => { try { await deleteAdSet(deleteInfo!.id).unwrap(); toast.success("Deleted"); setDeleteInfo(null); } catch { toast.error("Failed"); } }}
        isLoading={isDeleting} title="Delete Ad Set" subtitle={`Delete "${deleteInfo?.name}"?`} confirmText="Delete" variant="danger" />
    </div>
  );
};

export default MetaAdsetsPage;
