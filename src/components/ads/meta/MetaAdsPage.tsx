"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useGetMetaAdsQuery } from "@/src/redux/api/metaAdsApi";
import { Button } from "@/src/elements/ui/button";
import { Badge } from "@/src/elements/ui/badge";
import CommonHeader from "@/src/shared/CommonHeader";
import { DataTable } from "@/src/shared/DataTable";
import { Column } from "@/src/types/shared";
import { Eye, Plus } from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; dot: string; badge: string }> = {
  ACTIVE:  { label: "Active",  dot: "bg-emerald-500 animate-pulse", badge: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400" },
  PAUSED:  { label: "Paused",  dot: "bg-amber-400",                 badge: "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400" },
  DELETED: { label: "Deleted", dot: "bg-red-400",                   badge: "bg-red-50 text-red-500 dark:bg-red-900/20 dark:text-red-400" },
};

const MetaAdsPage = ({ campaignId, adsetId }: { campaignId: string; adsetId: string }) => {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const { data: adsRes, isLoading, isFetching, refetch } = useGetMetaAdsQuery({ adset_id: adsetId });
  const ads = adsRes?.data || [];

  const columns: Column<typeof ads[0]>[] = [
    {
      header: "Ad Name", accessorKey: "name",
      cell: (row) => (
        <div className="flex flex-col gap-0.5 py-1">
          <span className="font-bold text-sm text-slate-800 dark:text-slate-200">{row.name}</span>
          <span className="text-[10px] text-slate-400 font-mono">{row.meta_ad_id}</span>
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
      header: "Creative Type", accessorKey: "creative",
      cell: (row) => {
        const type = (row.creative as { format?: string })?.format || "Image";
        return <span className="text-xs text-slate-500 capitalize">{type}</span>;
      },
    },
    {
      header: "Created", accessorKey: "createdAt",
      cell: (row) => <span className="text-xs text-slate-400">{new Date(row.createdAt).toLocaleDateString()}</span>,
    },
    {
      header: "Actions",
      cell: () => (
        <div className="flex items-center gap-1.5 justify-end pr-2">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg hover:bg-primary/10 hover:text-primary">
            <Eye size={13} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="sm:p-8 p-4 space-y-6">
      <CommonHeader
        title="Ads"
        description="Manage ads in this ad set"
        onRefresh={() => refetch()}
        isLoading={isLoading}
        backBtn
        rightContent={
          <Button className="h-11 px-4 gap-2 font-bold text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            onClick={() => router.push(`/ads/meta/campaigns/${campaignId}/adsets/${adsetId}/ads/create`)}>
            <Plus size={13} /> New Ad
          </Button>
        }
      />
      <div className="bg-white dark:bg-(--card-color) rounded-xl border border-slate-100 dark:border-(--card-border-color) shadow-sm overflow-hidden">
        <DataTable data={ads} columns={columns} isLoading={isLoading} isFetching={isFetching}
          totalCount={ads.length} page={page} limit={limit} onPageChange={setPage} onLimitChange={setLimit}
          getRowId={(item) => item._id} emptyMessage="No ads yet. Create your first ad."
          className="border-none shadow-none rounded-none" />
      </div>
    </div>
  );
};

export default MetaAdsPage;
