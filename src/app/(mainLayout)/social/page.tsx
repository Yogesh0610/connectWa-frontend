"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  useGetSocialPostsQuery,
  usePublishSocialPostMutation,
  useDeleteSocialPostMutation,
  useRefreshPostAnalyticsMutation,
  useRetryFailedPostMutation,
  SocialPost,
  PostTarget,
} from "@/src/redux/api/socialApi";
import { Button } from "@/src/elements/ui/button";
import { Badge }  from "@/src/elements/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/elements/ui/select";
import { LinkedinIcon, FacebookIcon, InstagramIcon, TwitterIcon, Plus, Trash2, Send, BarChart2, Calendar, Clock, CheckCircle2, RefreshCw, RotateCcw } from "lucide-react";

const STATUS_COLOR: Record<string, string> = {
  draft:               "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  scheduled:           "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  publishing:          "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  published:           "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  partially_published: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  failed:              "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

const PLATFORM_ICON: Record<string, React.ReactNode> = {
  linkedin:  <LinkedinIcon  size={14} className="text-blue-700" />,
  facebook:  <FacebookIcon  size={14} className="text-indigo-600" />,
  instagram: <InstagramIcon size={14} className="text-pink-600" />,
  twitter:   <TwitterIcon   size={14} className="text-slate-700" />,
};

export default function SocialPostsPage() {
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, refetch } = useGetSocialPostsQuery(
    { status: statusFilter || undefined, page, limit: 15 }
  );
  const [publishPost,       { isLoading: isPublishing }] = usePublishSocialPostMutation();
  const [deletePost,        { isLoading: isDeleting   }] = useDeleteSocialPostMutation();
  const [refreshAnalytics]                               = useRefreshPostAnalyticsMutation();
  const [retryPost]                                      = useRetryFailedPostMutation();

  const posts: SocialPost[] = data?.data || [];
  const total               = data?.pagination?.total || 0;
  const totalPages          = Math.ceil(total / 15);

  const handlePublish = async (post: SocialPost) => {
    try {
      await publishPost(post._id).unwrap();
      toast.success("Post published!");
    } catch (e: unknown) {
      toast.error((e as { data?: { message?: string } })?.data?.message || "Failed to publish");
    }
  };

  const handleRetry = async (post: SocialPost) => {
    try {
      await retryPost(post._id).unwrap();
      toast.success("Post queued for retry");
    } catch (e: unknown) {
      toast.error((e as { data?: { message?: string } })?.data?.message || "Failed to retry");
    }
  };

  const handleDelete = async (post: SocialPost) => {
    if (!confirm(`Delete this post?`)) return;
    try {
      await deletePost(post._id).unwrap();
      toast.success("Post deleted");
    } catch { toast.error("Failed to delete post"); }
  };

  const handleRefreshAnalytics = async (post: SocialPost) => {
    try {
      await refreshAnalytics(post._id).unwrap();
      toast.success("Analytics refreshed");
    } catch { toast.error("Failed to refresh analytics"); }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Social Posts</h1>
          <p className="text-sm text-slate-500 mt-1">{total} post{total !== 1 ? "s" : ""} total</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/social/analytics">
            <Button variant="outline" size="sm" className="gap-1.5"><BarChart2 size={14} /> Analytics</Button>
          </Link>
          <Link href="/social/bulk">
            <Button variant="outline" size="sm">Bulk Schedule</Button>
          </Link>
          <Link href="/social/accounts">
            <Button variant="outline" size="sm">Accounts</Button>
          </Link>
          <Link href="/social/create">
            <Button size="sm" className="gap-2"><Plus size={14} /> New Post</Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <Select value={statusFilter} onValueChange={(v: string) => { setStatusFilter(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-44 h-9 text-sm">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent className="dark:bg-(--card-color) dark:border-(--card-border-color)">
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="partially_published">Partial</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="ghost" size="sm" onClick={() => refetch()} className="gap-1.5 text-slate-500">
          <RefreshCw size={13} /> Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-24 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />)}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <LinkedinIcon size={44} className="mx-auto mb-3 opacity-20" />
          <p className="font-medium text-slate-600 dark:text-slate-300">No posts yet</p>
          <p className="text-sm mb-4">Create your first social media post</p>
          <Link href="/social/create">
            <Button size="sm" className="gap-2"><Plus size={14} /> Create Post</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map(post => (
            <div key={post._id}
              className="rounded-xl border border-slate-200 dark:border-(--card-border-color) bg-white dark:bg-(--card-color) p-4">
              <div className="flex items-start gap-4">
                {post.media?.[0]?.url && (
                  <img src={post.media[0].url} alt="" className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    {post.title && <span className="font-semibold text-sm text-slate-800 dark:text-white">{post.title}</span>}
                    <Badge className={`text-xs ${STATUS_COLOR[post.status]}`}>
                      {post.status.replace(/_/g, " ")}
                    </Badge>
                    <div className="flex items-center gap-1">
                      {post.targets.map((t: PostTarget, i: number) => (
                        <span key={i} title={`${t.account_name} (${t.status})`}
                          className={t.status === "failed" ? "opacity-40 text-red-500" : t.status === "published" ? "opacity-100" : "opacity-50"}>
                          {PLATFORM_ICON[t.platform] || <LinkedinIcon size={14} />}
                        </span>
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">{post.content}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                    {post.scheduled_at && (
                      <span className="flex items-center gap-1">
                        <Calendar size={11} /> {format(new Date(post.scheduled_at), "MMM d, yyyy h:mm a")}
                      </span>
                    )}
                    {post.published_at && (
                      <span className="flex items-center gap-1">
                        <CheckCircle2 size={11} className="text-green-500" />
                        {format(new Date(post.published_at), "MMM d, yyyy h:mm a")}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock size={11} /> {format(new Date(post.createdAt), "MMM d")}
                    </span>
                  </div>
                  {["published", "partially_published"].includes(post.status) && post.targets.some((t: PostTarget) => t.analytics) && (
                    <div className="flex items-center gap-4 mt-1.5 text-xs text-slate-500">
                      {post.targets.map((t: PostTarget, i: number) => t.analytics && t.status === "published" ? (
                        <span key={i} className="flex items-center gap-1">
                          {PLATFORM_ICON[t.platform]} {t.analytics.likes}♥ {t.analytics.comments}💬 {t.analytics.shares}🔁
                          {t.analytics.impressions > 0 && ` · ${t.analytics.impressions} views`}
                        </span>
                      ) : null)}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {["draft", "scheduled"].includes(post.status) && (
                    <Button size="sm" variant="outline" onClick={() => handlePublish(post)}
                      disabled={isPublishing} className="gap-1.5 h-8 text-xs">
                      <Send size={12} /> Post Now
                    </Button>
                  )}
                  {post.status === "failed" && (
                    <Button size="sm" variant="outline" onClick={() => handleRetry(post)}
                      className="gap-1.5 h-8 text-xs text-amber-600 border-amber-300 hover:bg-amber-50">
                      <RotateCcw size={12} /> Retry
                    </Button>
                  )}
                  {["published", "partially_published"].includes(post.status) && (
                    <Button size="icon" variant="ghost" onClick={() => handleRefreshAnalytics(post)}
                      title="Refresh analytics" className="h-8 w-8">
                      <BarChart2 size={14} />
                    </Button>
                  )}
                  <Button size="icon" variant="ghost" onClick={() => handleDelete(post)}
                    disabled={isDeleting}
                    className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
          <span className="text-sm text-slate-500">{page} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}
