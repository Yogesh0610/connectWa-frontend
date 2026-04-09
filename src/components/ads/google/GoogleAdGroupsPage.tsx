"use client";
import { useState } from "react";
import {
  useGetGoogleAdGroupsQuery,
  useUpdateGoogleAdGroupStatusMutation,
} from "@/src/redux/api/googleAdsApi";
import { Button } from "@/src/elements/ui/button";
import { Badge } from "@/src/elements/ui/badge";
import CommonHeader from "@/src/shared/CommonHeader";
import { DataTable } from "@/src/shared/DataTable";
import { Column } from "@/src/types/shared";
import { Pause, Play, Tag } from "lucide-react";
import { toast } from "sonner";

const STATUS_CFG: Record<string, { label: string; dot: string; badge: string }> = {
  ENABLED: { label: "Enabled", dot: "bg-emerald-500 animate-pulse", badge: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400" },
  PAUSED:  { label: "Paused",  dot: "bg-amber-400",                 badge: "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400" },
  REMOVED: { label: "Removed", dot: "bg-slate-400",                 badge: "bg-slate-100 text-slate-500 dark:bg-(--dark-body) dark:text-slate-400" },
};

const MATCH_TYPE_BADGE: Record<string, string> = {
  EXACT:  "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
  PHRASE: "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400",
  BROAD:  "bg-slate-100 text-slate-500 dark:bg-(--dark-body) dark:text-slate-400",
};

const GoogleAdGroupsPage = ({ campaignId }: { campaignId: string }) => {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const { data: res, isLoading, isFetching, refetch } = useGetGoogleAdGroupsQuery({ campaign_id: campaignId });
  const [updateStatus] = useUpdateGoogleAdGroupStatusMutation();

  const adGroups = res?.data || [];
  const total = res?.total || adGroups.length;

  const handleToggle = async (id: string, current: string) => {
    try {
      await updateStatus({ id, status: current === "ENABLED" ? "PAUSED" : "ENABLED" }).unwrap();
      toast.success("Status updated");
    } catch {
      toast.error("Failed to update status");
    }
  };

  const columns: Column<typeof adGroups[0]>[] = [
    {
      header: "Ad Group", accessorKey: "name",
      cell: (row) => (
        <div className="flex flex-col gap-0.5 py-1">
          <span className="font-bold text-sm text-slate-800 dark:text-slate-200">{row.name}</span>
          <span className="text-[10px] text-slate-400">{row.ad_group_type?.replace(/_/g, " ")}</span>
        </div>
      ),
    },
    {
      header: "Status", accessorKey: "status",
      cell: (row) => {
        const cfg = STATUS_CFG[row.status] || STATUS_CFG.PAUSED;
        return (
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            <Badge variant="outline" className={`text-[10px] font-bold border-none px-2 py-0 h-5 ${cfg.badge}`}>{cfg.label}</Badge>
          </div>
        );
      },
    },
    {
      header: "Keywords", accessorKey: "keywords",
      cell: (row) => {
        const kws = row.keywords || [];
        if (!kws.length) return <span className="text-slate-400 text-xs">No keywords</span>;
        return (
          <div className="flex flex-wrap gap-1 py-1 max-w-xs">
            {kws.slice(0, 5).map((kw, i) => (
              <span key={i} className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded ${MATCH_TYPE_BADGE[kw.match_type] || MATCH_TYPE_BADGE.BROAD}`}>
                <Tag size={9} />{kw.text}
              </span>
            ))}
            {kws.length > 5 && (
              <span className="text-[10px] text-slate-400 self-center">+{kws.length - 5} more</span>
            )}
          </div>
        );
      },
    },
    {
      header: "Actions",
      cell: (row) => (
        <div className="flex items-center gap-1.5 justify-end pr-2">
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 w-8 p-0 rounded-lg ${row.status === "ENABLED" ? "hover:bg-amber-50 hover:text-amber-500" : "hover:bg-emerald-50 hover:text-emerald-500"}`}
            onClick={() => handleToggle(row._id, row.status)}
          >
            {row.status === "ENABLED" ? <Pause size={13} /> : <Play size={13} />}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="sm:p-8 p-4 space-y-6">
      <CommonHeader
        title="Ad Groups"
        description="Manage ad groups for this campaign"
        onRefresh={() => { refetch(); toast.success("Refreshed"); }}
        isLoading={isLoading}
        backBtn
      />
      <div className="bg-white dark:bg-(--card-color) rounded-xl border border-slate-100 dark:border-(--card-border-color) shadow-sm overflow-hidden">
        <DataTable
          data={adGroups}
          columns={columns}
          isLoading={isLoading}
          isFetching={isFetching}
          totalCount={total}
          page={page}
          limit={limit}
          onPageChange={setPage}
          onLimitChange={setLimit}
          getRowId={(item) => item._id}
          emptyMessage="No ad groups found for this campaign."
          className="border-none shadow-none rounded-none"
        />
      </div>
    </div>
  );
};

export default GoogleAdGroupsPage;
