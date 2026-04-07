"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  useGetMetaAuthUrlQuery, useGetMetaAdAccountsQuery,
  useConnectMetaManualMutation, useDisconnectMetaAccountMutation,
} from "@/src/redux/api/metaAdsApi";
import { Button } from "@/src/elements/ui/button";
import { Input } from "@/src/elements/ui/input";
import { Label } from "@/src/elements/ui/label";
import CommonHeader from "@/src/shared/CommonHeader";
import ConfirmModal from "@/src/shared/ConfirmModal";
import { CheckCircle2, ExternalLink, Loader2, Plus, Unlink } from "lucide-react";
import { toast } from "sonner";

const MetaAccountsPage = () => {
  const router = useRouter();
  const [showManual, setShowManual] = useState(false);
  const [form, setForm] = useState({ ad_account_id: "", access_token: "", name: "" });
  const [disconnectInfo, setDisconnectInfo] = useState<{ id: string; name: string } | null>(null);

  const { data: urlData } = useGetMetaAuthUrlQuery();
  const { data: accountsRes, isLoading } = useGetMetaAdAccountsQuery();
  const [connectManual, { isLoading: isConnecting }] = useConnectMetaManualMutation();
  const [disconnect, { isLoading: isDisconnecting }] = useDisconnectMetaAccountMutation();

  const accounts = accountsRes?.data || [];

  const handleOAuth = () => { if (urlData?.url) window.location.href = urlData.url; else toast.error("Could not get OAuth URL"); };

  const handleManual = async () => {
    if (!form.ad_account_id || !form.access_token) { toast.error("Ad Account ID and Access Token required"); return; }
    try {
      await connectManual(form).unwrap();
      toast.success("Meta account connected!");
      setShowManual(false);
      setForm({ ad_account_id: "", access_token: "", name: "" });
    } catch (e: unknown) {
      const err = e as { data?: { message?: string } };
      toast.error(err?.data?.message || "Failed to connect");
    }
  };

  return (
    <div className="sm:p-8 p-4">
      <CommonHeader
        title="Meta Ad Accounts"
        description="Connect Facebook & Instagram ad accounts"
        backBtn
        isLoading={isLoading}
        rightContent={
          <div className="flex items-center gap-3">
            <Button variant="outline" className="h-11 gap-2 font-semibold" onClick={() => setShowManual(!showManual)}>
              <Plus size={14}/> Manual Token
            </Button>
            <Button className="h-11 px-4 gap-2 font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg" onClick={handleOAuth}>
              <span className="font-black">f</span> Continue with Facebook <ExternalLink size={13}/>
            </Button>
          </div>
        }
      />

      {showManual && (
        <div className="max-w-2xl bg-white dark:bg-(--card-color) rounded-xl border border-slate-100 dark:border-(--card-border-color) shadow-sm p-5 mb-6 space-y-4">
          <p className="text-xs font-black uppercase tracking-wider text-slate-400">Manual Connection</p>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Account Name (optional)</Label>
            <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. My Business Account"
              className="h-10 bg-slate-50/50 dark:border-none border-slate-200 rounded-lg" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Ad Account ID *</Label>
            <Input value={form.ad_account_id} onChange={e => setForm(p => ({ ...p, ad_account_id: e.target.value }))} placeholder="act_123456789"
              className="h-10 bg-slate-50/50 dark:border-none border-slate-200 rounded-lg font-mono text-xs" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Access Token *</Label>
            <Input value={form.access_token} onChange={e => setForm(p => ({ ...p, access_token: e.target.value }))} placeholder="Paste long-lived access token"
              className="h-10 bg-slate-50/50 dark:border-none border-slate-200 rounded-lg font-mono text-xs" />
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setShowManual(false)}>Cancel</Button>
            <Button className="flex-1 bg-primary text-white" onClick={handleManual} disabled={isConnecting || !form.ad_account_id || !form.access_token}>
              {isConnecting ? <Loader2 size={14} className="animate-spin mr-2"/> : null} Connect
            </Button>
          </div>
        </div>
      )}

      <div className="max-w-2xl bg-white dark:bg-(--card-color) rounded-xl border border-slate-100 dark:border-(--card-border-color) shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-50 dark:border-(--card-border-color)">
          <p className="text-sm font-black text-slate-800 dark:text-slate-200">Connected Accounts ({accounts.length})</p>
        </div>
        {isLoading ? (
          <div className="p-5 space-y-3">{[1,2].map(i => <div key={i} className="h-16 rounded-xl bg-slate-50 dark:bg-(--dark-body) animate-pulse"/>)}</div>
        ) : accounts.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm font-medium text-slate-400">No accounts connected yet</p>
            <p className="text-xs text-slate-400 mt-1">Use OAuth or manual token to connect</p>
          </div>
        ) : accounts.map(acc => (
          <div key={acc._id} className="flex items-center justify-between px-5 py-4 border-b border-slate-50 dark:border-(--card-border-color) last:border-none">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 flex items-center justify-center">
                <span className="font-black text-blue-600">f</span>
              </div>
              <div>
                <p className="font-bold text-sm text-slate-800 dark:text-slate-200">{acc.name}</p>
                <p className="text-[11px] text-slate-400">{acc.meta_ad_account_id} · {acc.currency} · {acc.connection_method}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-emerald-500"/>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-lg hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                onClick={() => setDisconnectInfo({ id: acc._id, name: acc.name })}>
                <Unlink size={13}/>
              </Button>
            </div>
          </div>
        ))}
      </div>

      <ConfirmModal isOpen={!!disconnectInfo} onClose={() => setDisconnectInfo(null)}
        onConfirm={async () => { try { await disconnect(disconnectInfo!.id).unwrap(); toast.success("Disconnected"); setDisconnectInfo(null); } catch { toast.error("Failed"); } }}
        isLoading={isDisconnecting} title="Disconnect Account" subtitle={`Disconnect "${disconnectInfo?.name}"?`} confirmText="Disconnect" variant="danger" />
    </div>
  );
};

export default MetaAccountsPage;