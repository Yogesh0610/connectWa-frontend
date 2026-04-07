"use client";

import { Badge } from "@/src/elements/ui/badge";
import { Button } from "@/src/elements/ui/button";
import { useGetLeadsQuery, useRetryLeadMutation } from "@/src/redux/api/AdleadsApi";
import CommonHeader from "@/src/shared/CommonHeader";
import ConfirmModal from "@/src/shared/ConfirmModal";
import { DataTable } from "@/src/shared/DataTable";
import { AdLead, AdLeadSource } from "@/src/types/Adleads";
import { Column } from "@/src/types/shared";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Facebook,
  Instagram,
  Loader2,
  RefreshCw,
  User,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import useDebounce from "@/src/utils/hooks/useDebounce";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/elements/ui/select";

const SOURCE_TYPE_CONFIG = {
  facebook: {
    label: "Facebook",
    icon: Facebook,
    badgeClass: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
  },
  instagram: {
    label: "Instagram",
    icon: Instagram,
    badgeClass: "bg-pink-50 text-pink-600 dark:bg-pink-900/20 dark:text-pink-400",
  },
  google: {
    label: "Google",
    icon: () => <span className="font-black text-xs">G</span>,
    badgeClass: "bg-red-50 text-red-500 dark:bg-red-900/20 dark:text-red-400",
  },
  csv: {
    label: "CSV",
    icon: () => <span className="text-xs">CSV</span>,
    badgeClass: "bg-slate-100 text-slate-600 dark:bg-(--dark-body) dark:text-gray-400",
  },
};

const STATUS_CONFIG = {
  processed: {
    label: "Processed",
    dotClass: "bg-emerald-500 animate-pulse",
    badgeClass: "bg-emerald-50 text-primary dark:bg-emerald-900/20 dark:text-emerald-400",
  },
  new: {
    label: "New",
    dotClass: "bg-blue-500",
    badgeClass: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
  },
  processing: {
    label: "Processing",
    dotClass: "bg-amber-500 animate-pulse",
    badgeClass: "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400",
  },
  failed: {
    label: "Failed",
    dotClass: "bg-red-500",
    badgeClass: "bg-red-50 text-red-500 dark:bg-red-900/20 dark:text-red-400",
  },
};

const AutomationDot = ({ done, label }: { done: boolean; label: string }) => (
  <span
    title={label}
    className={`inline-flex items-center justify-center w-5 h-5 rounded-md text-[9px] font-black transition-all ${
      done
        ? "bg-primary/10 text-primary dark:bg-primary/20"
        : "bg-slate-100 text-slate-300 dark:bg-(--dark-body) dark:text-slate-600"
    }`}
  >
    {label[0]}
  </span>
);

const ManageLeads = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sourceIdParam = searchParams.get("source_id") || undefined;

  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 500);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [sourceTypeFilter, setSourceTypeFilter] = useState<string>("");
  const [retryLeadInfo, setRetryLeadInfo] = useState<{ id: string; name: string } | null>(null);

  const {
    data: leadsResult,
    isLoading,
    isFetching,
    refetch,
    error: queryError,
  } = useGetLeadsQuery({
    page,
    limit,
    search: debouncedSearch || undefined,
    status: statusFilter || undefined,
    source_type: sourceTypeFilter || undefined,
    source_id: sourceIdParam,
  });

  const [retryLead, { isLoading: isRetrying }] = useRetryLeadMutation();

  useEffect(() => {
    if (queryError) {
      const err = queryError as { data?: { message?: string }; message?: string };
      toast.error(err?.data?.message || err?.message || "Failed to fetch leads");
    }
  }, [queryError]);

  const leads: AdLead[] = leadsResult?.data || [];
  const totalCount = leadsResult?.pagination?.total || 0;

  const columns: Column<AdLead>[] = [
    {
      header: "Lead",
      accessorKey: "lead_data",
      cell: (row) => {
        const { name, phone, email, city } = row.lead_data;
        return (
          <div className="flex items-center gap-4 py-1">
            <div className="relative h-10 w-10 min-w-10 rounded-full bg-primary/10 border border-primary/20 dark:border-primary/10 flex items-center justify-center shrink-0">
              <User size={18} className="text-primary" />
            </div>
            <div className="flex flex-col gap-0.5 max-w-[200px]">
              <span className="font-bold text-slate-900 dark:text-slate-100 truncate">{name || "Unknown"}</span>
              <span className="text-[11px] text-slate-500 truncate">{phone || email || "No contact info"}</span>
              {city && <span className="text-[10px] text-slate-400">{city}</span>}
            </div>
          </div>
        );
      },
    },
    {
      header: "Source",
      accessorKey: "source_type",
      cell: (row) => {
        const config = SOURCE_TYPE_CONFIG[row.source_type];
        const Icon = config?.icon || User;
        const sourceName = typeof row.source_id === "object" ? (row.source_id as AdLeadSource)?.name : null;
        return (
          <div className="flex flex-col gap-1">
            <Badge variant="outline" className={`inline-flex items-center gap-1.5 border-none px-2.5 py-1 rounded-full text-[10px] font-bold w-fit ${config?.badgeClass}`}>
              <Icon size={10} />
              {config?.label}
            </Badge>
            {sourceName && <span className="text-[10px] text-slate-400 truncate max-w-[120px]">{sourceName}</span>}
          </div>
        );
      },
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: (row) => {
        const config = STATUS_CONFIG[row.status];
        return (
          <div className="flex items-center gap-2">
            <div className={`h-1.5 w-1.5 rounded-full ${config?.dotClass}`} />
            <Badge
              variant="outline"
              className={`capitalize text-[10px] font-bold border-none px-2 py-0 h-5 ${config?.badgeClass}`}
            >
              {config?.label}
            </Badge>
          </div>
        );
      },
    },
    {
      header: "Automation",
      accessorKey: "automation_log",
      cell: (row) => (
        <div className="flex items-center gap-1.5">
          <AutomationDot done={row.automation_log?.contact_saved} label="Contact" />
          <AutomationDot done={row.automation_log?.whatsapp_sent} label="WhatsApp" />
          <AutomationDot done={row.automation_log?.campaign_added} label="Campaign" />
          <AutomationDot done={row.automation_log?.chatbot_triggered} label="Bot" />
        </div>
      ),
    },
    {
      header: "Ad Info",
      accessorKey: "platform_form_id",
      cell: (row) => (
        <div className="flex flex-col gap-0.5">
          {row.platform_form_id && (
            <code className="text-[10px] font-mono bg-slate-100 dark:bg-(--dark-body) px-1.5 py-0.5 rounded text-slate-500 dark:text-gray-500">
              Form: {row.platform_form_id.slice(-6)}
            </code>
          )}
          {row.platform_campaign_id && (
            <code className="text-[10px] font-mono bg-slate-100 dark:bg-(--dark-body) px-1.5 py-0.5 rounded text-slate-500 dark:text-gray-500">
              Camp: {row.platform_campaign_id.slice(-6)}
            </code>
          )}
        </div>
      ),
    },
    {
      header: "Date",
      accessorKey: "createdAt",
      cell: (row) => (
        <div className="flex items-center gap-1.5 text-slate-400">
          <Clock size={11} />
          <span className="text-[11px]">
            {new Date(row.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          </span>
        </div>
      ),
    },
    {
      header: "Actions",
      cell: (row) => (
        <div className="flex justify-end gap-2 pr-2">
          {row.status === "failed" && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-9 p-0 rounded-lg bg-amber-50/50 hover:bg-amber-500 text-amber-400 hover:text-white transition-all duration-300 border border-amber-100/30 dark:hover:bg-amber-900/20 dark:bg-amber-900/10 dark:border-none"
              onClick={() => setRetryLeadInfo({ id: row._id, name: row.lead_data?.name || "this lead" })}
              title="Retry Processing"
            >
              <RefreshCw size={14} />
            </Button>
          )}
          {row.status === "failed" && row.failure_reason && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-9 p-0 rounded-lg bg-red-50/50 text-red-400 hover:bg-red-500 hover:text-white transition-all duration-300 border border-red-100/30 dark:bg-red-900/10 dark:border-none"
              title={row.failure_reason}
            >
              <AlertCircle size={14} />
            </Button>
          )}
          {row.status === "processed" && row.contact_id && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 px-3 rounded-lg bg-emerald-50 hover:bg-primary text-primary hover:text-white transition-all duration-300 text-xs font-bold border-none dark:bg-emerald-900/10"
              onClick={() => router.push(`/contacts?id=${row.contact_id}`)}
            >
              <CheckCircle2 size={12} className="mr-1" /> Contact
            </Button>
          )}
        </div>
      ),
    },
  ];

  const handleRetry = async () => {
    if (!retryLeadInfo) return;
    try {
      await retryLead(retryLeadInfo.id).unwrap();
      toast.success("Lead retry initiated");
      setRetryLeadInfo(null);
    } catch (error: unknown) {
      const err = error as { data?: { message?: string } };
      toast.error(err?.data?.message || "Failed to retry lead");
    }
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setPage(1);
  };

  const handleRefresh = () => {
    refetch();
    toast.success("Leads refreshed");
  };

  return (
    <div className="sm:p-8 p-4 space-y-8">
      <CommonHeader
        title="Ad Leads"
        description="All captured leads from Facebook, Instagram & Google Ads"
        onSearch={handleSearch}
        searchTerm={searchTerm}
        searchPlaceholder="Search by name, phone, email..."
        onRefresh={handleRefresh}
        isLoading={isLoading}
        backBtn
        rightContent={
          <div className="flex items-center gap-2 ml-auto sm:ml-0 flex-wrap">
            {/* Status filter */}
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v === "all" ? "" : v); setPage(1); }}>
              <SelectTrigger className="h-10 w-36 bg-white dark:bg-(--card-color) border-slate-200 dark:border-(--card-border-color) rounded-lg text-sm">
                <SelectValue placeholder="All status" />
              </SelectTrigger>
              <SelectContent className="dark:bg-(--card-color) dark:border-(--card-border-color)">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="processed">Processed</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>

            {/* Source type filter */}
            <Select value={sourceTypeFilter} onValueChange={(v) => { setSourceTypeFilter(v === "all" ? "" : v); setPage(1); }}>
              <SelectTrigger className="h-10 w-36 bg-white dark:bg-(--card-color) border-slate-200 dark:border-(--card-border-color) rounded-lg text-sm">
                <SelectValue placeholder="All sources" />
              </SelectTrigger>
              <SelectContent className="dark:bg-(--card-color) dark:border-(--card-border-color)">
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="facebook">Facebook</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="google">Google</SelectItem>
                <SelectItem value="csv">CSV</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      />

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Leads", value: totalCount, color: "text-slate-900 dark:text-slate-100" },
          { label: "Processed", value: leads.filter((l) => l.status === "processed").length, color: "text-primary" },
          { label: "Pending", value: leads.filter((l) => l.status === "new" || l.status === "processing").length, color: "text-amber-500" },
          { label: "Failed", value: leads.filter((l) => l.status === "failed").length, color: "text-red-500" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white dark:bg-(--card-color) rounded-lg border border-slate-100 dark:border-(--card-border-color) shadow-sm p-4">
            <p className={`text-2xl font-black ${stat.color}`}>{isLoading ? <Loader2 size={18} className="animate-spin" /> : stat.value}</p>
            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wide mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden dark:bg-(--card-color) dark:border-(--card-border-color)">
        <DataTable
          data={leads}
          columns={columns}
          isLoading={isLoading}
          isFetching={isFetching}
          totalCount={totalCount}
          page={page}
          limit={limit}
          onPageChange={setPage}
          onLimitChange={setLimit}
          getRowId={(item) => item._id}
          emptyMessage={
            searchTerm
              ? `No leads found matching "${searchTerm}"`
              : statusFilter
              ? `No leads with status "${statusFilter}"`
              : "No leads captured yet. Connect an ad source to start."
          }
          className="border-none shadow-none rounded-none"
        />
      </div>

      <ConfirmModal
        isOpen={!!retryLeadInfo}
        onClose={() => setRetryLeadInfo(null)}
        onConfirm={handleRetry}
        isLoading={isRetrying}
        title="Retry Lead Processing"
        subtitle={`Retry processing for "${retryLeadInfo?.name}"? This will attempt to save as contact and run automation rules again.`}
        confirmText="Retry"
        variant="primary"
      />
    </div>
  );
};

export default ManageLeads;