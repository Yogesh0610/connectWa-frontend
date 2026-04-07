"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useGetGoogleAuthUrlQuery, useGetGoogleOAuthAccountsQuery,
  useSaveGoogleOAuthAccountsMutation, useGetGoogleAdAccountsQuery, useDisconnectGoogleAccountMutation,
} from "@/src/redux/api/googleAdsApi";
import { Button } from "@/src/elements/ui/button";
import CommonHeader from "@/src/shared/CommonHeader";
import ConfirmModal from "@/src/shared/ConfirmModal";
import { CheckCircle2, Loader2, Unlink } from "lucide-react";
import { toast } from "sonner";

const GoogleAccountsPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isSelectStep = searchParams.get("step") === "select";
  const [selected, setSelected] = useState<string[]>([]);
  const [disconnectInfo, setDisconnectInfo] = useState<{ id: string; name: string } | null>(null);

  const { data: urlData } = useGetGoogleAuthUrlQuery();
  const { data: oauthAccountsRes, isLoading: oauthLoading } = useGetGoogleOAuthAccountsQuery(undefined, { skip: !isSelectStep });
  const { data: accountsRes, isLoading } = useGetGoogleAdAccountsQuery();
  const [saveAccounts, { isLoading: isSaving }] = useSaveGoogleOAuthAccountsMutation();
  const [disconnect, { isLoading: isDisconnecting }] = useDisconnectGoogleAccountMutation();

  const oauthAccounts = oauthAccountsRes?.data || [];
  const accounts = accountsRes?.data || [];

  const handleOAuth = () => { if (urlData?.url) window.location.href = urlData.url; else toast.error("Could not get OAuth URL"); };

  const handleSave = async () => {
    if (!selected.length) { toast.error("Select at least one account"); return; }
    try {
      await saveAccounts({ selected_customer_ids: selected }).unwrap();
      toast.success(`${selected.length} account(s) connected!`);
      router.push("/ads/google");
    } catch (e: unknown) {
      const err = e as { data?: { message?: string } };
      toast.error(err?.data?.message || "Failed to save");
    }
  };

  const toggleSelect = (id: string) => setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  return (
    <div className="sm:p-8 p-4">
      <CommonHeader
        title="Google Ad Accounts"
        description="Connect your Google Ads accounts"
        backBtn
        isLoading={isLoading || oauthLoading}
        rightContent={
          isSelectStep ? (
            <div className="flex items-center gap-3">
              <Button variant="outline" className="h-11" onClick={() => router.back()}>Cancel</Button>
              <Button className="h-11 px-6 bg-primary text-white font-bold rounded-lg" onClick={handleSave} disabled={isSaving || !selected.length}>
                {isSaving ? <Loader2 size={14} className="animate-spin mr-2"/> : null}
                Connect {selected.length > 0 ? `(${selected.length})` : ""} Account{selected.length !== 1 ? "s" : ""}
              </Button>
            </div>
          ) : (
            <Button className="h-11 px-4 gap-2 font-bold bg-red-500 hover:bg-red-600 text-white rounded-lg" onClick={handleOAuth}>
              <span className="font-black">G</span> Connect with Google
            </Button>
          )
        }
      />

      {isSelectStep ? (
        <div className="max-w-2xl bg-white dark:bg-(--card-color) rounded-xl border border-slate-100 dark:border-(--card-border-color) shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-50 dark:border-(--card-border-color)">
            <p className="font-black text-slate-800 dark:text-slate-200">Select Accounts to Connect</p>
            <p className="text-xs text-slate-500 mt-0.5">Choose which accounts you want to manage</p>
          </div>
          {oauthLoading ? (
            <div className="p-8 flex justify-center"><Loader2 size={24} className="animate-spin text-primary"/></div>
          ) : (
            <div className="divide-y divide-slate-50 dark:divide-(--card-border-color)">
              {oauthAccounts.map(acc => (
                <div key={acc.customer_id} onClick={() => toggleSelect(acc.customer_id)}
                  className={`flex items-center justify-between px-5 py-4 cursor-pointer transition-colors ${selected.includes(acc.customer_id) ? "bg-primary/5 dark:bg-primary/10" : "hover:bg-slate-50 dark:hover:bg-(--table-hover)"}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${selected.includes(acc.customer_id) ? "bg-primary border-primary" : "border-slate-300 dark:border-slate-600"}`}>
                      {selected.includes(acc.customer_id) && <CheckCircle2 size={12} className="text-white"/>}
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30 flex items-center justify-center">
                      <span className="font-black text-red-500">G</span>
                    </div>
                    <div>
                      <p className="font-bold text-sm text-slate-800 dark:text-slate-200">{acc.name}</p>
                      <p className="text-[11px] text-slate-400">{acc.customer_id} · {acc.currency} {acc.is_manager ? "· Manager" : ""}</p>
                    </div>
                  </div>
                  {("is_test" in acc && acc.is_test === true) && <span className="text-[10px] font-bold bg-amber-100 text-amber-600 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">Test</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="max-w-2xl bg-white dark:bg-(--card-color) rounded-xl border border-slate-100 dark:border-(--card-border-color) shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-50 dark:border-(--card-border-color)">
            <p className="text-sm font-black text-slate-800 dark:text-slate-200">Connected Accounts ({accounts.length})</p>
          </div>
          {isLoading ? (
            <div className="p-5 space-y-3">{[1,2].map(i => <div key={i} className="h-16 rounded-xl bg-slate-50 dark:bg-(--dark-body) animate-pulse"/>)}</div>
          ) : accounts.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm font-medium text-slate-400">No accounts connected yet</p>
              <p className="text-xs text-slate-400 mt-1">Click "Connect with Google" to get started</p>
            </div>
          ) : accounts.map(acc => (
            <div key={acc._id} className="flex items-center justify-between px-5 py-4 border-b border-slate-50 dark:border-(--card-border-color) last:border-none">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30 flex items-center justify-center">
                  <span className="font-black text-red-500">G</span>
                </div>
                <div>
                  <p className="font-bold text-sm text-slate-800 dark:text-slate-200">{acc.name}</p>
                  <p className="text-[11px] text-slate-400">{acc.google_customer_id} · {acc.currency} · {acc.timezone}</p>
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
      )}

      <ConfirmModal isOpen={!!disconnectInfo} onClose={() => setDisconnectInfo(null)}
        onConfirm={async () => { try { await disconnect(disconnectInfo!.id).unwrap(); toast.success("Disconnected"); setDisconnectInfo(null); } catch { toast.error("Failed"); } }}
        isLoading={isDisconnecting} title="Disconnect Account" subtitle={`Disconnect "${disconnectInfo?.name}"?`} confirmText="Disconnect" variant="danger" />
    </div>
  );
};

export default GoogleAccountsPage;