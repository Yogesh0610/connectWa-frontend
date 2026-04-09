"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import {
  useGetSocialAccountsQuery,
  useGetLinkedInAuthUrlQuery,
  useGetTwitterAuthUrlQuery,
  useDisconnectSocialAccountMutation,
  useRefreshSocialAccountMutation,
  SocialAccount,
} from "@/src/redux/api/socialApi";
import { LinkedinIcon, FacebookIcon, InstagramIcon, TwitterIcon, Plus, Trash2, RefreshCw, AlertTriangle } from "lucide-react";
import { Button } from "@/src/elements/ui/button";
import { Badge } from "@/src/elements/ui/badge";
import { useSearchParams } from "next/navigation";
import { format } from "date-fns";

const PLATFORM_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  linkedin:  { label: "LinkedIn",    icon: <LinkedinIcon  size={18} />, color: "text-blue-700 bg-blue-50 dark:bg-blue-900/20" },
  facebook:  { label: "Facebook",    icon: <FacebookIcon  size={18} />, color: "text-indigo-700 bg-indigo-50 dark:bg-indigo-900/20" },
  instagram: { label: "Instagram",   icon: <InstagramIcon size={18} />, color: "text-pink-700 bg-pink-50 dark:bg-pink-900/20" },
  twitter:   { label: "X (Twitter)", icon: <TwitterIcon   size={18} />, color: "text-slate-700 bg-slate-100 dark:bg-slate-800" },
};

export default function SocialAccountsPage() {
  const searchParams = useSearchParams();
  const { data, isLoading, refetch } = useGetSocialAccountsQuery();
  const { data: linkedInAuthData }   = useGetLinkedInAuthUrlQuery();
  const { data: twitterAuthData }    = useGetTwitterAuthUrlQuery();
  const [disconnect, { isLoading: isDisconnecting }] = useDisconnectSocialAccountMutation();
  const [refresh,    { isLoading: isRefreshing    }] = useRefreshSocialAccountMutation();

  const accounts: SocialAccount[] = data?.data || [];

  useEffect(() => {
    const connected = searchParams.get("connected");
    const error     = searchParams.get("error");
    if (connected) { toast.success(`${connected} account connected!`); refetch(); }
    if (error)     toast.error(`OAuth error: ${error}`);
  }, [searchParams, refetch]);

  const handleLinkedInConnect = () => {
    const url = linkedInAuthData?.data?.url;
    if (url) window.location.href = url;
  };

  const handleTwitterConnect = () => {
    const url = twitterAuthData?.data?.url;
    if (url) window.location.href = url;
  };

  const handleDisconnect = async (id: string, name: string) => {
    if (!confirm(`Disconnect "${name}"?`)) return;
    try {
      await disconnect(id).unwrap();
      toast.success("Account disconnected");
    } catch { toast.error("Failed to disconnect"); }
  };

  const handleRefresh = async (id: string) => {
    try {
      await refresh(id).unwrap();
      toast.success("Account refreshed");
      refetch();
    } catch { toast.error("Failed to refresh account"); }
  };

  const isTokenExpiringSoon = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt).getTime() < Date.now() + 7 * 24 * 60 * 60 * 1000;
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Social Accounts</h1>
          <p className="text-sm text-slate-500 mt-1">Connect your social media accounts to post content</p>
        </div>
      </div>

      {/* Connect buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <button onClick={handleLinkedInConnect}
          className="flex items-center gap-3 p-4 rounded-xl border-2 border-dashed border-blue-200 dark:border-blue-800 hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all text-left">
          <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-700">
            <LinkedinIcon size={20} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">LinkedIn</p>
            <p className="text-xs text-slate-400">Profile & Company Pages</p>
          </div>
          <Plus size={14} className="ml-auto text-slate-400" />
        </button>

        <button onClick={handleTwitterConnect}
          className="flex items-center gap-3 p-4 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-slate-400 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-all text-left">
          <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700">
            <TwitterIcon size={20} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">X (Twitter)</p>
            <p className="text-xs text-slate-400">Profile</p>
          </div>
          <Plus size={14} className="ml-auto text-slate-400" />
        </button>

        {["Facebook", "Instagram"].map(p => (
          <div key={p} className="flex items-center gap-3 p-4 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 opacity-50 cursor-not-allowed">
            <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
              {p === "Facebook" ? <FacebookIcon size={20} /> : <InstagramIcon size={20} />}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{p}</p>
              <p className="text-xs text-slate-400">Coming soon</p>
            </div>
          </div>
        ))}
      </div>

      {/* Connected accounts */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="h-20 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      ) : accounts.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <LinkedinIcon size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No accounts connected yet</p>
          <p className="text-sm">Click above to connect your first account</p>
        </div>
      ) : (
        <div className="space-y-3">
          {accounts.map((account: SocialAccount) => {
            const meta = PLATFORM_META[account.platform] || PLATFORM_META.linkedin;
            const expiringSoon = isTokenExpiringSoon(account.token_expires_at);
            const reconnectHandler = account.platform === "linkedin" ? handleLinkedInConnect : handleTwitterConnect;
            return (
              <div key={account._id}
                className="flex items-start gap-4 p-4 rounded-xl border border-slate-200 dark:border-(--card-border-color) bg-white dark:bg-(--card-color)">
                {/* Avatar */}
                <div className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${meta.color}`}>
                  {account.profile_picture
                    ? <img src={account.profile_picture} className="w-full h-full rounded-full object-cover" alt={account.account_name} />
                    : meta.icon}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-800 dark:text-white text-sm">{account.account_name}</span>
                    <Badge variant="secondary" className="text-xs capitalize">{account.account_type}</Badge>
                    <Badge variant="secondary" className={`text-xs ${meta.color}`}>{meta.label}</Badge>
                  </div>
                  {expiringSoon && (
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-amber-600 flex items-center gap-1">
                        <AlertTriangle size={11} /> Token expires soon — reconnect to avoid posting failures
                      </p>
                      <button onClick={reconnectHandler}
                        className="text-xs text-primary underline hover:no-underline">
                        Reconnect
                      </button>
                    </div>
                  )}
                  {account.token_expires_at && !expiringSoon && (
                    <p className="text-xs text-slate-400 mt-0.5">
                      Token valid until {format(new Date(account.token_expires_at), "MMM d, yyyy")}
                    </p>
                  )}
                  {account.pages?.length > 0 && (
                    <p className="text-xs text-slate-400 mt-1">
                      {account.pages.length} company page{account.pages.length > 1 ? "s" : ""}: {account.pages.map((p: { page_name: string }) => p.page_name).join(", ")}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {account.platform === "linkedin" && (
                    <Button size="icon" variant="ghost" onClick={() => handleRefresh(account._id)}
                      disabled={isRefreshing} title="Refresh pages" className="h-8 w-8">
                      <RefreshCw size={14} />
                    </Button>
                  )}
                  <Button size="icon" variant="ghost" onClick={() => handleDisconnect(account._id, account.account_name)}
                    disabled={isDisconnecting} className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Token lifecycle note */}
      <div className="mt-8 p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/30">
        <p className="text-xs text-slate-500 font-medium mb-1">About access tokens</p>
        <ul className="text-xs text-slate-400 space-y-0.5 list-disc list-inside">
          <li>LinkedIn tokens expire after ~60 days. No automatic refresh — you&apos;ll need to reconnect.</li>
          <li>X (Twitter) tokens refresh automatically in the background while you&apos;re active.</li>
          <li>You&apos;ll be notified 7 days before a token expires.</li>
        </ul>
      </div>
    </div>
  );
}
