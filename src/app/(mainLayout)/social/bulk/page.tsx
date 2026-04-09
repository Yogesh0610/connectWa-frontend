"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useBulkSchedulePostsMutation, useGetSocialAccountsQuery, SocialAccount, SocialPage, PostTarget } from "@/src/redux/api/socialApi";
import { Button } from "@/src/elements/ui/button";
import { Input }  from "@/src/elements/ui/input";
import { Textarea } from "@/src/elements/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/elements/ui/select";
import { Badge } from "@/src/elements/ui/badge";
import { Plus, Trash2, Clock, CheckSquare, Square, Building2, User2, LinkedinIcon, Globe, Send } from "lucide-react";

const TIMEZONES = [
  "UTC", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "America/Sao_Paulo", "Europe/London", "Europe/Paris", "Europe/Berlin", "Europe/Moscow",
  "Asia/Dubai", "Asia/Kolkata", "Asia/Singapore", "Asia/Tokyo", "Australia/Sydney",
];

interface DraftPost {
  id:           string;
  title:        string;
  content:      string;
  hashtags:     string;
  link_url:     string;
  scheduled_at: string;
  timezone:     string;
}

const blankPost = (): DraftPost => ({
  id:           crypto.randomUUID(),
  title:        "",
  content:      "",
  hashtags:     "",
  link_url:     "",
  scheduled_at: "",
  timezone:     Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
});

// Spread scheduled_at by minutes offset from first post
function distributeTime(posts: DraftPost[], intervalMinutes: number): DraftPost[] {
  const base = new Date(posts[0]?.scheduled_at || Date.now());
  return posts.map((p, i) => {
    const d = new Date(base.getTime() + i * intervalMinutes * 60_000);
    return { ...p, scheduled_at: d.toISOString().slice(0, 16) };
  });
}

export default function BulkSchedulePage() {
  const router = useRouter();
  const { data: accountsData } = useGetSocialAccountsQuery();
  const [bulkSchedule, { isLoading }] = useBulkSchedulePostsMutation();

  const accounts: SocialAccount[] = accountsData?.data || [];

  const [posts,    setPosts]    = useState<DraftPost[]>([blankPost()]);
  const [selectedKeys,    setSelectedKeys]    = useState<string[]>([]);
  const [selectedTargets, setSelectedTargets] = useState<PostTarget[]>([]);
  const [interval, setInterval_] = useState("60");

  const addPost    = () => setPosts(p => [...p, blankPost()]);
  const removePost = (id: string) => setPosts(p => p.filter(x => x.id !== id));
  const updatePost = (id: string, field: keyof DraftPost, value: string) =>
    setPosts(p => p.map(x => x.id === id ? { ...x, [field]: value } : x));

  const handleDistribute = () => {
    const mins = Number(interval) || 60;
    setPosts(prev => distributeTime(prev, mins));
  };

  const toggleTarget = (key: string, target: PostTarget) => {
    setSelectedKeys(prev => {
      if (prev.includes(key)) {
        setSelectedTargets(t => t.filter(x => !(x.social_account_id === target.social_account_id && x.account_id === target.account_id)));
        return prev.filter(k => k !== key);
      }
      setSelectedTargets(t => [...t, target]);
      return [...prev, key];
    });
  };

  const handleSubmit = async () => {
    if (!selectedTargets.length) { toast.error("Select at least one account"); return; }
    const invalid = posts.findIndex(p => !p.content.trim() || !p.scheduled_at);
    if (invalid !== -1) { toast.error(`Post #${invalid + 1}: content and scheduled time are required`); return; }

    try {
      const payload = posts.map(p => ({
        title:        p.title || undefined,
        content:      p.content,
        hashtags:     p.hashtags ? p.hashtags.split(/[\s,]+/).filter(Boolean).map(h => h.replace(/^#/, "")) : [],
        link_url:     p.link_url || undefined,
        targets:      selectedTargets,
        scheduled_at: new Date(p.scheduled_at).toISOString(),
        timezone:     p.timezone,
      }));

      const result = await bulkSchedule({ posts: payload }).unwrap();
      toast.success(`${result.data.created} post${result.data.created !== 1 ? "s" : ""} scheduled!`);
      if (result.data.failed > 0) toast.warning(`${result.data.failed} post(s) failed`);
      router.push("/social");
    } catch (e: unknown) {
      toast.error((e as { data?: { message?: string } })?.data?.message || "Failed to schedule posts");
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Bulk Schedule</h1>
          <p className="text-sm text-slate-500 mt-1">Schedule multiple posts at once</p>
        </div>
        <Button variant="ghost" onClick={() => router.back()}>Cancel</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Posts list ─────────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">
          {/* Time distributor */}
          <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-(--card-border-color) bg-white dark:bg-(--card-color)">
            <Clock size={15} className="text-slate-400 flex-shrink-0" />
            <span className="text-xs text-slate-600 dark:text-slate-400">Auto-space posts every</span>
            <Input type="number" min={1} value={interval}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInterval_(e.target.value)}
              className="w-20 h-7 text-sm text-center" />
            <span className="text-xs text-slate-500">min</span>
            <Button size="sm" variant="outline" onClick={handleDistribute} className="h-7 text-xs ml-auto">
              Distribute Times
            </Button>
          </div>

          {posts.map((post, idx) => (
            <div key={post.id}
              className="rounded-xl border border-slate-200 dark:border-(--card-border-color) bg-white dark:bg-(--card-color) p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Post #{idx + 1}</span>
                {posts.length > 1 && (
                  <button onClick={() => removePost(post.id)} className="text-red-400 hover:text-red-600">
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
              <Input placeholder="Title (optional)" value={post.title}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updatePost(post.id, "title", e.target.value)}
                className="h-8 text-sm bg-slate-50 dark:bg-transparent" />
              <Textarea placeholder="Post content *" value={post.content}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updatePost(post.id, "content", e.target.value)}
                className="min-h-[80px] text-sm bg-slate-50 dark:bg-transparent resize-none" />
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="#hashtag1 #hashtag2" value={post.hashtags}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updatePost(post.id, "hashtags", e.target.value)}
                  className="h-8 text-sm bg-slate-50 dark:bg-transparent" />
                <Input placeholder="Link URL (optional)" value={post.link_url}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updatePost(post.id, "link_url", e.target.value)}
                  className="h-8 text-sm bg-slate-50 dark:bg-transparent" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-transparent">
                  <Clock size={13} className="text-slate-400 flex-shrink-0" />
                  <input type="datetime-local" value={post.scheduled_at}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updatePost(post.id, "scheduled_at", e.target.value)}
                    className="flex-1 text-xs bg-transparent outline-none text-slate-700 dark:text-slate-300" />
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-transparent">
                  <Globe size={13} className="text-slate-400 flex-shrink-0" />
                  <Select value={post.timezone} onValueChange={(v: string) => updatePost(post.id, "timezone", v)}>
                    <SelectTrigger className="h-6 border-0 bg-transparent text-xs focus:ring-0 p-0 shadow-none flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-(--card-color) dark:border-(--card-border-color) max-h-48">
                      {TIMEZONES.map(tz => (
                        <SelectItem key={tz} value={tz} className="text-xs">{tz}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          ))}

          <button onClick={addPost}
            className="w-full p-3 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-400 hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2 text-sm">
            <Plus size={15} /> Add Another Post
          </button>

          <div className="flex justify-between items-center pt-2">
            <Badge variant="secondary" className="text-xs">{posts.length} post{posts.length !== 1 ? "s" : ""}</Badge>
            <Button onClick={handleSubmit} disabled={isLoading} className="gap-2">
              <Send size={14} /> Schedule {posts.length} Post{posts.length !== 1 ? "s" : ""}
            </Button>
          </div>
        </div>

        {/* ── Account Picker ─────────────────────────────────────────────── */}
        <div>
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
            Publish to <span className="text-primary">({selectedTargets.length} selected)</span>
          </h3>
          <p className="text-xs text-slate-400 mb-3">Same accounts applied to all posts</p>

          {accounts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 p-6 text-center">
              <LinkedinIcon size={24} className="mx-auto mb-2 text-slate-300" />
              <p className="text-sm text-slate-500 mb-2">No accounts connected</p>
              <a href="/social/accounts" className="text-xs text-primary underline">Connect an account</a>
            </div>
          ) : (
            <div className="space-y-3">
              {accounts.map((account: SocialAccount) => {
                const profileKey = `${account._id}:profile`;
                const profileSelected = selectedKeys.includes(profileKey);
                const profileTarget: PostTarget = {
                  social_account_id: account._id,
                  platform: account.platform, account_type: "profile",
                  account_id: account.account_id, account_name: account.account_name,
                  linkedin_urn: account.linkedin_urn ?? undefined,
                };
                return (
                  <div key={account._id} className="rounded-xl border border-slate-200 dark:border-(--card-border-color) bg-white dark:bg-(--card-color) overflow-hidden">
                    <button onClick={() => toggleTarget(profileKey, profileTarget)}
                      className={`w-full flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-left ${profileSelected ? "bg-primary/5" : ""}`}>
                      {profileSelected ? <CheckSquare size={15} className="text-primary flex-shrink-0" /> : <Square size={15} className="text-slate-300 flex-shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{account.account_name}</p>
                        <p className="text-xs text-slate-400 flex items-center gap-1"><User2 size={10} /> Profile · {account.platform}</p>
                      </div>
                    </button>
                    {account.pages?.map((page: SocialPage) => {
                      const pageKey = `${account._id}:${page.page_id}`;
                      const pageSelected = selectedKeys.includes(pageKey);
                      const pageTarget: PostTarget = {
                        social_account_id: account._id,
                        platform: account.platform, account_type: "company",
                        account_id: page.page_id, account_name: page.page_name,
                        linkedin_urn: page.linkedin_urn ?? undefined,
                      };
                      return (
                        <button key={pageKey} onClick={() => toggleTarget(pageKey, pageTarget)}
                          className={`w-full flex items-center gap-3 p-3 border-t border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-left ${pageSelected ? "bg-primary/5" : ""}`}>
                          {pageSelected ? <CheckSquare size={15} className="text-primary flex-shrink-0" /> : <Square size={15} className="text-slate-300 flex-shrink-0" />}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{page.page_name}</p>
                            <p className="text-xs text-slate-400 flex items-center gap-1"><Building2 size={10} /> Company Page</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
