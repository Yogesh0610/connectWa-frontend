"use client";

import { Badge } from "@/src/elements/ui/badge";
import { Button } from "@/src/elements/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/src/elements/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/src/elements/ui/dialog";
import { Input } from "@/src/elements/ui/input";
import { Label } from "@/src/elements/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/elements/ui/select";
import {
  useGetSourcesQuery,
  useConnectFacebookManualMutation,
  useSetupGoogleWebhookMutation,
  useDisconnectSourceMutation,
  useRefreshFbTokenMutation,
  useGetFbOAuthUrlQuery,
} from "@/src/redux/api/AdleadsApi";
import { useAppSelector } from "@/src/redux/hooks";
import CommonHeader from "@/src/shared/CommonHeader";
import ConfirmModal from "@/src/shared/ConfirmModal";
import { AdLeadSource } from "@/src/types/Adleads";
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Copy,
  Facebook,
  Instagram,
  Loader2,
  Plus,
  RefreshCw,
  Settings2,
  Unlink,
  Users,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import Can from "@/src/components/shared/Can";

type Platform = "facebook" | "instagram" | "google" | null;
type ConnectMethod = "oauth" | "manual" | "webhook";
type ConnectStep = 1 | 2 | 3;

const PLATFORM_CONFIG = {
  facebook: {
    label: "Facebook",
    color: "text-blue-600",
    bg: "bg-blue-500",
    lightBg: "bg-blue-50 dark:bg-blue-900/20",
    icon: Facebook,
  },
  instagram: {
    label: "Instagram",
    color: "text-pink-600",
    bg: "bg-gradient-to-br from-orange-400 via-pink-500 to-purple-600",
    lightBg: "bg-pink-50 dark:bg-pink-900/20",
    icon: Instagram,
  },
  google: {
    label: "Google Ads",
    color: "text-red-500",
    bg: "bg-red-500",
    lightBg: "bg-red-50 dark:bg-red-900/20",
    icon: () => (
      <span className="font-black text-sm leading-none">G</span>
    ),
  },
};

const AdLeadSourcesPage = () => {
  const router = useRouter();
  const { selectedWorkspace } = useAppSelector((state) => state.workspace);
  const userId = selectedWorkspace?.user_id;

  const [searchTerm, setSearchTerm] = useState("");
  const [connectOpen, setConnectOpen] = useState(false);
  const [connectStep, setConnectStep] = useState<ConnectStep>(1);
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>(null);
  const [connectMethod, setConnectMethod] = useState<ConnectMethod>("oauth");
  const [disconnectSourceId, setDisconnectSourceId] = useState<string | null>(null);
  const [refreshSourceId, setRefreshSourceId] = useState<string | null>(null);
  const [googleWebhookInfo, setGoogleWebhookInfo] = useState<{ webhook_url: string; webhook_secret: string; instructions: string[] } | null>(null);

  // Manual form
  const [manualForm, setManualForm] = useState({ page_id: "", page_access_token: "", name: "", source_type: "facebook" as "facebook" | "instagram" });
  // Google form
  const [googleForm, setGoogleForm] = useState({ customer_id: "", source_name: "" });

  const { data: sourcesResult, isLoading, refetch, error: sourcesError } = useGetSourcesQuery();
  const sources: AdLeadSource[] = sourcesResult?.data || [];

  const [connectFbManual, { isLoading: isConnectingManual }] = useConnectFacebookManualMutation();
  const [setupGoogle, { isLoading: isSettingupGoogle }] = useSetupGoogleWebhookMutation();
  const [disconnectSource, { isLoading: isDisconnecting }] = useDisconnectSourceMutation();
  const [refreshToken, { isLoading: isRefreshing }] = useRefreshFbTokenMutation();

  const { data: oauthUrlData, error: oauthUrlError, isLoading: isOauthLoading } = useGetFbOAuthUrlQuery(undefined, { skip: !connectOpen || selectedPlatform === "google" || connectStep !== 2 });

  useEffect(() => {
    if (sourcesError) {
      const err = sourcesError as { data?: { message?: string }; message?: string };
      toast.error(err?.data?.message || err?.message || "Failed to fetch sources", { id: "sources-error" });
    }
  }, [sourcesError]);

  const filteredSources = useMemo(() => {
    if (!searchTerm) return sources;
    const lower = searchTerm.toLowerCase();
    return sources.filter((s) => s.name.toLowerCase().includes(lower) || s.source_type.toLowerCase().includes(lower));
  }, [sources, searchTerm]);

  const resetConnectModal = () => {
    setConnectStep(1);
    setSelectedPlatform(null);
    setConnectMethod("oauth");
    setManualForm({ page_id: "", page_access_token: "", name: "", source_type: "facebook" });
    setGoogleForm({ customer_id: "", source_name: "" });
    setGoogleWebhookInfo(null);
  };

  const handleOAuthLogin = () => {
    if (oauthUrlData?.url) {
      window.location.href = oauthUrlData.url;
    } else {
      const errMsg = (oauthUrlError as { data?: { message?: string } })?.data?.message;
      toast.error(errMsg || "Could not get OAuth URL. Please configure Facebook App ID in WABA settings.");
    }
  };

  const handleManualConnect = async () => {
    try {
      await connectFbManual(manualForm).unwrap();
      toast.success("Source connected successfully!");
      setConnectOpen(false);
      resetConnectModal();
      refetch();
    } catch (error: unknown) {
      const err = error as { data?: { message?: string } };
      toast.error(err?.data?.message || "Failed to connect source");
    }
  };

  const handleGoogleSetup = async () => {
    try {
      const result = await setupGoogle({ customer_id: googleForm.customer_id, source_name: googleForm.source_name }).unwrap();
      setGoogleWebhookInfo(result.data);
      setConnectStep(3);
    } catch (error: unknown) {
      const err = error as { data?: { message?: string } };
      toast.error(err?.data?.message || "Failed to setup Google webhook");
    }
  };

  const handleDisconnect = async () => {
    if (!disconnectSourceId) return;
    try {
      await disconnectSource(disconnectSourceId).unwrap();
      toast.success("Source disconnected");
      setDisconnectSourceId(null);
    } catch (error: unknown) {
      const err = error as { data?: { message?: string } };
      toast.error(err?.data?.message || "Failed to disconnect source");
    }
  };

  const handleRefreshToken = async () => {
    if (!refreshSourceId) return;
    try {
      await refreshToken(refreshSourceId).unwrap();
      toast.success("Token refreshed successfully!");
      setRefreshSourceId(null);
      refetch();
    } catch (error: unknown) {
      const err = error as { data?: { message?: string } };
      toast.error(err?.data?.message || "Failed to refresh token");
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const getSourceIcon = (source: AdLeadSource) => {
    const Icon = PLATFORM_CONFIG[source.source_type]?.icon || Users;
    return <Icon size={22} className="transition-transform group-hover:scale-110" />;
  };

  return (
    <div className="sm:p-8 p-4 space-y-8">
      <CommonHeader
        title="Ad Lead Sources"
        description="Connect Facebook, Instagram & Google Ads to capture leads in real-time"
        onSearch={setSearchTerm}
        searchTerm={searchTerm}
        searchPlaceholder="Search sources..."
        onRefresh={refetch}
        isLoading={isLoading}
        rightContent={
          <div className="flex items-center gap-3 flex-wrap ml-auto sm:ml-0 rtl:mr-auto rtl:ml-0">
            <Can permission="create.ad_leads">
              <Button
                onClick={() => { resetConnectModal(); setConnectOpen(true); }}
                className="flex ml-auto rtl:mr-auto rtl:ml-0 sm:ml-0 items-center gap-2 px-5 bg-primary text-white h-12 rounded-lg font-bold transition-all active:scale-95 group"
              >
                <Plus size={18} className="group-hover:rotate-90 transition-transform" />
                <span>Connect Source</span>
              </Button>
            </Can>
            <Button
              variant="outline"
              onClick={() => router.push("/ad-leads/leads")}
              className="flex items-center gap-2 px-5 h-12 rounded-lg font-bold transition-all"
            >
              <Users size={18} />
              <span>View Leads</span>
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="animate-spin text-primary" size={40} />
          <p className="text-gray-500">Loading sources...</p>
        </div>
      ) : sourcesError ? (
        <div className="flex flex-col items-center justify-center py-20 bg-red-50/30 rounded-lg border-2 border-dashed border-red-100 dark:bg-(--card-color) dark:border-(--card-border-color)">
          <div className="p-4 bg-red-50 rounded-lg text-red-400 mb-4 dark:bg-red-900/20">
            <AlertCircle size={48} />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Error fetching sources</h3>
          <p className="text-gray-500 max-w-xs text-center mt-2">We encountered an error while trying to fetch your connected ad sources.</p>
          <Button variant="outline" onClick={refetch} className="mt-6 px-4.5 py-5">Try Again</Button>
        </div>
      ) : filteredSources.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
          {filteredSources.map((source) => {
            const config = PLATFORM_CONFIG[source.source_type];
            const Icon = config?.icon || Users;
            const total = source.stats?.total ?? 0;
            const processed = source.stats?.processed ?? 0;
            const failed = source.stats?.failed ?? 0;

            return (
              <Card
                key={source._id}
                className={`group relative overflow-hidden transition-all duration-300 border shadow-sm hover:shadow-lg rounded-lg ${
                  source.is_active
                    ? "border-primary/20 bg-primary/2 dark:bg-primary/5"
                    : "border-slate-100 dark:border-(--card-border-color) bg-white dark:bg-(--card-color)"
                }`}
              >
                <CardHeader className="p-5 pb-0">
                  <div className="flex justify-between items-start mb-4">
                    <div className={`p-3 rounded-lg transition-colors duration-300 ${source.is_active ? `${config?.bg} text-white shadow-lg` : `${config?.lightBg} ${config?.color} group-hover:${config?.bg} group-hover:text-white`}`}>
                      <Icon size={22} className="transition-transform group-hover:scale-110" />
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      {source.is_active ? (
                        <Badge className="bg-emerald-50 text-primary border-none px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider dark:bg-emerald-900/20 dark:text-emerald-400">
                          <CheckCircle2 size={12} className="mr-1.5" /> Active
                        </Badge>
                      ) : (
                        <Badge className="bg-slate-100 text-slate-500 border-none px-2.5 py-1 rounded-full text-[10px] font-bold uppercase dark:bg-(--dark-body) dark:text-gray-500">
                          Inactive
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-wider border-slate-200 dark:border-(--card-border-color) text-slate-400 px-2 py-0.5 rounded-full">
                        {source.connection_method}
                      </Badge>
                    </div>
                  </div>

                  <CardTitle className="text-lg font-bold text-slate-900 dark:text-amber-50 group-hover:text-primary transition-colors leading-tight truncate pr-2" title={source.name}>
                    {source.name}
                  </CardTitle>
                  <p className="text-xs text-slate-500 mt-0.5 capitalize font-medium">{config?.label}</p>
                </CardHeader>

                <CardContent className="p-5 pt-3 space-y-4">
                  {source.fb_page_id && (
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Page ID</span>
                      <span className="text-[11px] font-mono text-slate-500 bg-slate-100 dark:bg-(--dark-body) dark:text-gray-500 px-2 py-0.5 rounded-md">{source.fb_page_id}</span>
                    </div>
                  )}
                  {source.google_customer_id && (
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Customer ID</span>
                      <span className="text-[11px] font-mono text-slate-500 bg-slate-100 dark:bg-(--dark-body) dark:text-gray-500 px-2 py-0.5 rounded-md">{source.google_customer_id}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 dark:bg-(--table-hover) rounded-lg border border-slate-100/50 dark:border-none">
                    <div className="text-center">
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-200">{total}</p>
                      <p className="text-[9px] text-slate-500 uppercase tracking-tight font-medium">Total</p>
                    </div>
                    <div className="text-center border-x border-slate-200/50 dark:border-white/5">
                      <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{processed}</p>
                      <p className="text-[9px] text-slate-500 uppercase tracking-tight font-medium">Done</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-bold text-red-500">{failed}</p>
                      <p className="text-[9px] text-slate-500 uppercase tracking-tight font-medium">Failed</p>
                    </div>
                  </div>

                  {/* Automation summary */}
                  <div className="flex flex-wrap gap-1.5">
                    {source.automation?.save_as_contact && (
                      <span className="text-[9px] font-bold uppercase tracking-wide bg-primary/10 text-primary px-2 py-0.5 rounded-full">Contact</span>
                    )}
                    {source.automation?.send_whatsapp_template_id && (
                      <span className="text-[9px] font-bold uppercase tracking-wide bg-green-50 text-green-600 px-2 py-0.5 rounded-full dark:bg-green-900/20 dark:text-green-400">WhatsApp</span>
                    )}
                    {source.automation?.add_to_campaign_id && (
                      <span className="text-[9px] font-bold uppercase tracking-wide bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full dark:bg-blue-900/20 dark:text-blue-400">Campaign</span>
                    )}
                    {source.automation?.trigger_chatbot_id && (
                      <span className="text-[9px] font-bold uppercase tracking-wide bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full dark:bg-purple-900/20 dark:text-purple-400">Chatbot</span>
                    )}
                  </div>
                </CardContent>

                <CardFooter className="p-5 pt-0 flex flex-col gap-2">
                  <Can permission="update.ad_leads">
                    <div className="flex gap-2 w-full">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 h-9 gap-1.5 rounded-lg font-semibold text-xs border-slate-200 dark:border-(--card-border-color) hover:bg-primary/5 hover:border-primary/30 hover:text-primary transition-all"
                        onClick={() => router.push(`/ad-leads/sources/${source._id}/automation`)}
                      >
                        <Settings2 size={13} /> Automation
                      </Button>
                      {source.connection_method !== "webhook" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 w-9 p-0 rounded-lg border-slate-200 dark:border-(--card-border-color) hover:bg-amber-50 hover:border-amber-200 hover:text-amber-600 transition-all"
                          title="Refresh Token"
                          onClick={() => setRefreshSourceId(source._id)}
                        >
                          <RefreshCw size={13} />
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 w-9 p-0 rounded-lg border-red-100 bg-red-50/50 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all dark:bg-red-900/10 dark:border-none"
                        title="Disconnect"
                        onClick={() => setDisconnectSourceId(source._id)}
                      >
                        <Unlink size={13} />
                      </Button>
                    </div>
                  </Can>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full h-9 gap-1.5 text-xs font-semibold text-slate-500 hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
                    onClick={() => router.push(`/ad-leads/leads?source_id=${source._id}`)}
                  >
                    View Leads <ChevronRight size={13} />
                  </Button>
                </CardFooter>

                <div className="absolute inset-0 pointer-events-none border-2 border-primary/0 group-hover:border-primary/10 rounded-lg transition-all duration-300" />
              </Card>
            );
          })}

          {/* Add new source card */}
          <Can permission="create.ad_leads">
            <Card
              className="group relative overflow-hidden transition-all duration-300 border border-dashed border-slate-200 dark:border-(--card-border-color) bg-slate-50/50 dark:bg-(--card-color) hover:border-primary/40 hover:bg-primary/2 cursor-pointer rounded-lg shadow-sm flex flex-col items-center justify-center min-h-[260px]"
              onClick={() => { resetConnectModal(); setConnectOpen(true); }}
            >
              <div className="p-4 rounded-full bg-primary/10 text-primary mb-3 group-hover:scale-110 transition-transform">
                <Plus size={24} />
              </div>
              <p className="text-sm font-bold text-slate-500 group-hover:text-primary transition-colors">Connect New Source</p>
              <p className="text-xs text-slate-400 mt-1">Facebook · Instagram · Google</p>
            </Card>
          </Can>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 bg-gray-50/50 rounded-lg border-2 border-dashed border-gray-100 dark:bg-(--card-color) dark:border-(--card-border-color)">
          <div className="p-4 bg-gray-100 rounded-full text-gray-400 mb-4 dark:bg-(--dark-body)">
            <Zap size={48} className="text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {searchTerm ? `No results for "${searchTerm}"` : "No sources connected"}
          </h3>
          <p className="text-gray-500 max-w-xs text-center mt-2">
            {searchTerm
              ? "Try a different search term."
              : "Connect your Facebook, Instagram or Google Ads account to start capturing leads automatically."}
          </p>
          {searchTerm ? (
            <Button variant="ghost" className="mt-4 text-primary font-bold" onClick={() => setSearchTerm("")}>Clear Search</Button>
          ) : (
            <Can permission="create.ad_leads">
              <Button className="mt-6 bg-primary text-white px-6 h-11 rounded-lg font-bold" onClick={() => { resetConnectModal(); setConnectOpen(true); }}>
                <Plus size={16} className="mr-2" /> Connect First Source
              </Button>
            </Can>
          )}
        </div>
      )}

      {/* ── Connect Source Modal ── */}
      <Dialog open={connectOpen} onOpenChange={(open) => { if (!open) { setConnectOpen(false); resetConnectModal(); } }}>
        <DialogContent className="sm:max-w-lg dark:bg-(--card-color) dark:border-(--card-border-color)">
          <DialogHeader>
            <DialogTitle>{connectStep === 1 ? "Choose Platform" : connectStep === 2 ? "Connect Method" : "Setup Complete"}</DialogTitle>
            <DialogDescription>
              {connectStep === 1 ? "Select an ad platform to connect" : connectStep === 2 ? "Choose how you want to connect" : "Your source is ready"}
            </DialogDescription>
          </DialogHeader>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-2">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  s < connectStep ? "bg-primary text-white" : s === connectStep ? "bg-primary text-white" : "bg-slate-100 dark:bg-(--dark-body) text-slate-400"
                }`}>
                  {s < connectStep ? <CheckCircle2 size={12} /> : s}
                </div>
                {s < 3 && <div className={`flex-1 h-0.5 w-8 rounded ${s < connectStep ? "bg-primary" : "bg-slate-100 dark:bg-(--dark-body)"}`} />}
              </div>
            ))}
          </div>

          {/* Step 1: Platform */}
          {connectStep === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {(["facebook", "instagram", "google"] as const).map((p) => {
                  const config = PLATFORM_CONFIG[p];
                  const Icon = config.icon;
                  return (
                    <button
                      key={p}
                      onClick={() => setSelectedPlatform(p)}
                      className={`p-4 rounded-lg border-2 text-center transition-all ${
                        selectedPlatform === p
                          ? "border-primary bg-primary/5 dark:bg-primary/10"
                          : "border-slate-200 dark:border-(--card-border-color) hover:border-primary/40 hover:bg-slate-50 dark:hover:bg-(--table-hover)"
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-lg ${config.bg} text-white flex items-center justify-center mx-auto mb-2`}>
                        <Icon size={20} />
                      </div>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{config.label}</p>
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => { setConnectOpen(false); resetConnectModal(); }}>Cancel</Button>
                <Button className="flex-1 bg-primary text-white" disabled={!selectedPlatform} onClick={() => setConnectStep(2)}>Next</Button>
              </div>
            </div>
          )}

          {/* Step 2: Method */}
          {connectStep === 2 && selectedPlatform !== "google" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {(["oauth", "manual"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setConnectMethod(m)}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      connectMethod === m
                        ? "border-primary bg-primary/5 dark:bg-primary/10"
                        : "border-slate-200 dark:border-(--card-border-color) hover:border-primary/40"
                    }`}
                  >
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">{m === "oauth" ? "OAuth Login" : "Manual Token"}</p>
                    <p className="text-xs text-slate-500">{m === "oauth" ? "Login with Facebook — recommended" : "Paste Page ID & token"}</p>
                  </button>
                ))}
              </div>

              {connectMethod === "oauth" ? (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800/30 text-sm text-blue-700 dark:text-blue-400">
                  You will be redirected to Facebook to select pages and grant permissions.
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Source Type</Label>
                    <Select value={manualForm.source_type} onValueChange={(v) => setManualForm((p) => ({ ...p, source_type: v as "facebook" | "instagram" }))}>
                      <SelectTrigger className="h-10 bg-slate-50/50 dark:border-none border-slate-200 rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-(--card-color) dark:border-(--card-border-color)">
                        <SelectItem value="facebook">Facebook</SelectItem>
                        <SelectItem value="instagram">Instagram</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Source Name</Label>
                    <Input value={manualForm.name} onChange={(e) => setManualForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Marketing Page" className="h-10 bg-slate-50/50 dark:border-none border-slate-200 rounded-lg" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Page ID</Label>
                    <Input value={manualForm.page_id} onChange={(e) => setManualForm((p) => ({ ...p, page_id: e.target.value }))} placeholder="e.g. 104827361920" className="h-10 bg-slate-50/50 dark:border-none border-slate-200 rounded-lg" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Page Access Token</Label>
                    <Input value={manualForm.page_access_token} onChange={(e) => setManualForm((p) => ({ ...p, page_access_token: e.target.value }))} placeholder="Paste long-lived page token" className="h-10 bg-slate-50/50 dark:border-none border-slate-200 rounded-lg font-mono text-xs" />
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setConnectStep(1)}>Back</Button>
                {connectMethod === "oauth" ? (
                  <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" onClick={handleOAuthLogin} disabled={isOauthLoading}>
                    {isOauthLoading ? <Loader2 size={15} className="animate-spin mr-2" /> : <Facebook size={16} className="mr-2" />}
                    Continue with Facebook
                  </Button>
                ) : (
                  <Button className="flex-1 bg-primary text-white" onClick={handleManualConnect} disabled={isConnectingManual || !manualForm.page_id || !manualForm.page_access_token}>
                    {isConnectingManual ? <Loader2 size={15} className="animate-spin mr-2" /> : null}
                    Connect
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Google */}
          {connectStep === 2 && selectedPlatform === "google" && (
            <div className="space-y-4">
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-100 dark:border-amber-800/30 text-sm text-amber-700 dark:text-amber-400">
                We will generate a unique webhook URL and secret key for you to paste in Google Ads console.
              </div>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Source Name</Label>
                  <Input value={googleForm.source_name} onChange={(e) => setGoogleForm((p) => ({ ...p, source_name: e.target.value }))} placeholder="e.g. Google Ads Main" className="h-10 bg-slate-50/50 dark:border-none border-slate-200 rounded-lg" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Google Ads Customer ID</Label>
                  <Input value={googleForm.customer_id} onChange={(e) => setGoogleForm((p) => ({ ...p, customer_id: e.target.value }))} placeholder="e.g. 123-456-7890" className="h-10 bg-slate-50/50 dark:border-none border-slate-200 rounded-lg font-mono" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setConnectStep(1)}>Back</Button>
                <Button className="flex-1 bg-primary text-white" onClick={handleGoogleSetup} disabled={isSettingupGoogle || !googleForm.customer_id}>
                  {isSettingupGoogle ? <Loader2 size={15} className="animate-spin mr-2" /> : null}
                  Generate Webhook
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Google webhook info */}
          {connectStep === 3 && googleWebhookInfo && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-100 dark:border-emerald-800/30 flex items-center gap-3">
                <CheckCircle2 size={20} className="text-primary shrink-0" />
                <p className="text-sm text-emerald-700 dark:text-emerald-400 font-medium">Source created! Paste these details in Google Ads console.</p>
              </div>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Webhook URL</Label>
                  <div className="flex gap-2">
                    <code className="flex-1 text-xs bg-slate-100 dark:bg-(--dark-body) rounded-lg px-3 py-2.5 text-slate-600 dark:text-gray-400 font-mono break-all">{googleWebhookInfo.webhook_url}</code>
                    <Button variant="outline" size="sm" className="shrink-0 h-9 w-9 p-0" onClick={() => copyToClipboard(googleWebhookInfo.webhook_url, "Webhook URL")}>
                      <Copy size={14} />
                    </Button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Secret Key</Label>
                  <div className="flex gap-2">
                    <code className="flex-1 text-xs bg-slate-100 dark:bg-(--dark-body) rounded-lg px-3 py-2.5 text-slate-600 dark:text-gray-400 font-mono break-all">{googleWebhookInfo.webhook_secret}</code>
                    <Button variant="outline" size="sm" className="shrink-0 h-9 w-9 p-0" onClick={() => copyToClipboard(googleWebhookInfo.webhook_secret, "Secret Key")}>
                      <Copy size={14} />
                    </Button>
                  </div>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-(--table-hover) rounded-lg text-xs text-slate-500 space-y-1">
                  {googleWebhookInfo.instructions.map((step, i) => (
                    <p key={i}>{step}</p>
                  ))}
                </div>
              </div>
              <Button className="w-full bg-primary text-white h-11 rounded-lg font-bold" onClick={() => { setConnectOpen(false); resetConnectModal(); refetch(); }}>
                Done
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Disconnect confirm */}
      <ConfirmModal
        isOpen={!!disconnectSourceId}
        onClose={() => setDisconnectSourceId(null)}
        onConfirm={handleDisconnect}
        isLoading={isDisconnecting}
        title="Disconnect Source"
        subtitle="Are you sure you want to disconnect this source? All future leads from this source will stop being captured."
        confirmText="Disconnect"
        variant="danger"
      />

      {/* Refresh token confirm */}
      <ConfirmModal
        isOpen={!!refreshSourceId}
        onClose={() => setRefreshSourceId(null)}
        onConfirm={handleRefreshToken}
        isLoading={isRefreshing}
        title="Refresh Token"
        subtitle="This will refresh the Facebook page access token, extending it by another 60 days."
        confirmText="Refresh"
        variant="primary"
      />
    </div>
  );
};

export default AdLeadSourcesPage;