"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  useGetSocialAccountsQuery,
  useCreateSocialPostMutation,
  usePublishSocialPostMutation,
  SocialAccount,
  SocialPage,
  PostTarget,
} from "@/src/redux/api/socialApi";
import { Button }   from "@/src/elements/ui/button";
import { Input }    from "@/src/elements/ui/input";
import { Textarea } from "@/src/elements/ui/textarea";
import { Badge }    from "@/src/elements/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/elements/ui/select";
import {
  LinkedinIcon, FacebookIcon, InstagramIcon, TwitterIcon,
  ImageIcon, Link2, Hash, Clock, Send, X, Plus, Building2, User2,
  CheckSquare, Square, Globe,
} from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────

const PLATFORM_ICON: Record<string, React.ReactNode> = {
  linkedin:  <LinkedinIcon  size={16} className="text-blue-700" />,
  facebook:  <FacebookIcon  size={16} className="text-indigo-600" />,
  instagram: <InstagramIcon size={16} className="text-pink-600" />,
  twitter:   <TwitterIcon   size={16} className="text-slate-700" />,
};

// Common IANA timezones for the picker
const TIMEZONES = [
  "UTC", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "America/Sao_Paulo", "Europe/London", "Europe/Paris", "Europe/Berlin", "Europe/Moscow",
  "Asia/Dubai", "Asia/Kolkata", "Asia/Singapore", "Asia/Tokyo", "Asia/Shanghai",
  "Australia/Sydney", "Pacific/Auckland",
];

// ── Account Card (profile + company pages) ────────────────────────────────────

function AccountCard({ account, selected, onToggle }: {
  account: SocialAccount;
  selected: string[];
  onToggle: (key: string, target: PostTarget) => void;
}) {
  const profileKey      = `${account._id}:profile`;
  const profileSelected = selected.includes(profileKey);

  const profileTarget: PostTarget = {
    social_account_id: account._id,
    platform:          account.platform,
    account_type:      "profile",
    account_id:        account.account_id,
    account_name:      account.account_name,
    linkedin_urn:      account.linkedin_urn ?? undefined,
  };

  return (
    <div className="rounded-xl border border-slate-200 dark:border-(--card-border-color) bg-white dark:bg-(--card-color) overflow-hidden">
      {/* Profile row */}
      <button onClick={() => onToggle(profileKey, profileTarget)}
        className={`w-full flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-left ${profileSelected ? "bg-primary/5" : ""}`}>
        {profileSelected ? <CheckSquare size={16} className="text-primary flex-shrink-0" /> : <Square size={16} className="text-slate-300 flex-shrink-0" />}
        {account.profile_picture
          ? <img src={account.profile_picture} className="w-8 h-8 rounded-full object-cover" alt={account.account_name} />
          : <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">{PLATFORM_ICON[account.platform]}</div>
        }
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{account.account_name}</p>
          <p className="text-xs text-slate-400 flex items-center gap-1"><User2 size={10} /> Personal Profile</p>
        </div>
        {PLATFORM_ICON[account.platform]}
      </button>

      {/* Company pages */}
      {account.pages?.map((page: SocialPage) => {
        const pageKey      = `${account._id}:${page.page_id}`;
        const pageSelected = selected.includes(pageKey);
        const pageTarget: PostTarget = {
          social_account_id: account._id,
          platform:          account.platform,
          account_type:      "company",
          account_id:        page.page_id,
          account_name:      page.page_name,
          linkedin_urn:      page.linkedin_urn ?? undefined,
        };
        return (
          <button key={pageKey} onClick={() => onToggle(pageKey, pageTarget)}
            className={`w-full flex items-center gap-3 p-3 border-t border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-left ${pageSelected ? "bg-primary/5" : ""}`}>
            {pageSelected ? <CheckSquare size={16} className="text-primary flex-shrink-0" /> : <Square size={16} className="text-slate-300 flex-shrink-0" />}
            {page.page_picture
              ? <img src={page.page_picture} className="w-8 h-8 rounded-lg object-cover" alt={page.page_name} />
              : <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center"><Building2 size={14} className="text-slate-500" /></div>
            }
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{page.page_name}</p>
              <p className="text-xs text-slate-400 flex items-center gap-1"><Building2 size={10} /> Company Page</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ── Main Composer ─────────────────────────────────────────────────────────────

export default function PostComposer() {
  const router = useRouter();
  const { data: accountsData } = useGetSocialAccountsQuery();
  const [createPost]  = useCreateSocialPostMutation();
  const [publishPost] = usePublishSocialPostMutation();

  const accounts: SocialAccount[] = accountsData?.data || [];

  // Form state
  const [title,         setTitle]         = useState("");
  const [content,       setContent]       = useState("");
  const [linkUrl,       setLinkUrl]       = useState("");
  const [hashtagInput,  setHashtagInput]  = useState("");
  const [hashtags,      setHashtags]      = useState<string[]>([]);
  const [scheduledAt,   setScheduledAt]   = useState("");
  const [timezone,      setTimezone]      = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
  );
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [showHashtags,  setShowHashtags]  = useState(false);
  const [showSchedule,  setShowSchedule]  = useState(false);

  // Selected targets
  const [selectedKeys,    setSelectedKeys]    = useState<string[]>([]);
  const [selectedTargets, setSelectedTargets] = useState<PostTarget[]>([]);

  // Media
  const [mediaFiles,    setMediaFiles]    = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleTarget = useCallback((key: string, target: PostTarget) => {
    setSelectedKeys(prev => {
      if (prev.includes(key)) {
        setSelectedTargets(t => t.filter(x => !(x.social_account_id === target.social_account_id && x.account_id === target.account_id)));
        return prev.filter(k => k !== key);
      }
      setSelectedTargets(t => [...t, target]);
      return [...prev, key];
    });
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setMediaFiles(prev => [...prev, ...files].slice(0, 10));
    files.forEach(f => {
      const reader = new FileReader();
      reader.onload = (ev) => setMediaPreviews(prev => [...prev, (ev.target?.result as string)].slice(0, 10));
      reader.readAsDataURL(f);
    });
  };

  const removeMedia = (idx: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== idx));
    setMediaPreviews(prev => prev.filter((_, i) => i !== idx));
  };

  const addHashtag = () => {
    const tag = hashtagInput.trim().replace(/^#/, "");
    if (tag && !hashtags.includes(tag)) setHashtags(prev => [...prev, tag]);
    setHashtagInput("");
  };

  const buildFormData = () => {
    const fd = new FormData();
    if (title)       fd.append("title",    title);
    fd.append("content",    content);
    if (linkUrl)     fd.append("link_url", linkUrl);
    if (scheduledAt) fd.append("scheduled_at", scheduledAt);
    fd.append("timezone",  timezone);
    fd.append("hashtags",  JSON.stringify(hashtags));
    fd.append("targets",   JSON.stringify(selectedTargets));
    mediaFiles.forEach(f => fd.append("media", f));
    return fd;
  };

  const validate = () => {
    if (!content.trim())        { toast.error("Write some content first"); return false; }
    if (!selectedTargets.length){ toast.error("Select at least one account"); return false; }
    return true;
  };

  const handleSaveDraft = async () => {
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      await createPost(buildFormData()).unwrap();
      toast.success("Draft saved");
      router.push("/social");
    } catch (e: unknown) {
      toast.error((e as { data?: { message?: string } })?.data?.message || "Failed to save draft");
    } finally { setIsSubmitting(false); }
  };

  const handleSchedule = async () => {
    if (!validate()) return;
    if (!scheduledAt) { toast.error("Select a scheduled time"); return; }
    setIsSubmitting(true);
    try {
      await createPost(buildFormData()).unwrap();
      toast.success("Post scheduled!");
      router.push("/social");
    } catch (e: unknown) {
      toast.error((e as { data?: { message?: string } })?.data?.message || "Failed to schedule");
    } finally { setIsSubmitting(false); }
  };

  const handlePublishNow = async () => {
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      const res = await createPost(buildFormData()).unwrap();
      await publishPost(res.data._id).unwrap();
      toast.success("Published!");
      router.push("/social");
    } catch (e: unknown) {
      toast.error((e as { data?: { message?: string } })?.data?.message || "Failed to publish");
    } finally { setIsSubmitting(false); }
  };

  const charCount = content.length;
  const charLimit = 3000;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Create Post</h1>
          <p className="text-sm text-slate-500 mt-1">Publish to LinkedIn, Twitter, Facebook, and more</p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Composer ──────────────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">
          <Input placeholder="Post title (internal, optional)"
            value={title} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
            className="h-10 bg-slate-50 dark:bg-transparent dark:border-(--card-border-color)" />

          <div className="rounded-xl border border-slate-200 dark:border-(--card-border-color) bg-white dark:bg-(--card-color) overflow-hidden">
            <Textarea
              placeholder="Write your post... LinkedIn supports long-form text. Twitter limit: 280 chars."
              value={content}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setContent(e.target.value)}
              className="min-h-[180px] border-0 rounded-none resize-none bg-transparent focus-visible:ring-0 text-sm"
            />

            {/* Media previews */}
            {mediaPreviews.length > 0 && (
              <div className="flex flex-wrap gap-2 px-3 pb-3">
                {mediaPreviews.map((src, i) => (
                  <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                    <img src={src} className="w-full h-full object-cover" alt={`media ${i}`} />
                    <button onClick={() => removeMedia(i)}
                      className="absolute top-0.5 right-0.5 p-0.5 bg-black/60 rounded-full text-white hover:bg-black">
                      <X size={10} />
                    </button>
                  </div>
                ))}
                {mediaPreviews.length < 10 && (
                  <button onClick={() => fileRef.current?.click()}
                    className="w-20 h-20 rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:border-primary hover:text-primary transition-colors">
                    <Plus size={20} />
                  </button>
                )}
              </div>
            )}

            {/* Hashtags */}
            {hashtags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 px-3 pb-3">
                {hashtags.map(h => (
                  <Badge key={h} variant="secondary" className="gap-1 text-xs text-blue-700 bg-blue-50 dark:bg-blue-900/20">
                    #{h}
                    <button onClick={() => setHashtags(prev => prev.filter(x => x !== h))}><X size={9} /></button>
                  </Badge>
                ))}
              </div>
            )}

            {/* Link input */}
            {showLinkInput && (
              <div className="px-3 pb-3">
                <div className="flex gap-2 items-center p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <Link2 size={14} className="text-slate-400 flex-shrink-0" />
                  <Input placeholder="https://example.com" value={linkUrl}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLinkUrl(e.target.value)}
                    className="h-8 text-sm border-0 bg-transparent p-0 focus-visible:ring-0" />
                  <button onClick={() => { setShowLinkInput(false); setLinkUrl(""); }} className="text-slate-400 hover:text-slate-600"><X size={14} /></button>
                </div>
              </div>
            )}

            {/* Hashtag input */}
            {showHashtags && (
              <div className="px-3 pb-3">
                <div className="flex gap-2 items-center p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <Hash size={14} className="text-slate-400 flex-shrink-0" />
                  <Input placeholder="Add hashtag (press Enter)" value={hashtagInput}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setHashtagInput(e.target.value)}
                    onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === "Enter") { e.preventDefault(); addHashtag(); } }}
                    className="h-8 text-sm border-0 bg-transparent p-0 focus-visible:ring-0" />
                  <Button size="sm" variant="ghost" onClick={addHashtag} className="h-7 px-2 text-xs">Add</Button>
                </div>
              </div>
            )}

            {/* Schedule + timezone */}
            {showSchedule && (
              <div className="px-3 pb-3 space-y-2">
                <div className="flex gap-2 items-center p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <Clock size={14} className="text-slate-400 flex-shrink-0" />
                  <input type="datetime-local" value={scheduledAt}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setScheduledAt(e.target.value)}
                    className="flex-1 text-sm bg-transparent outline-none text-slate-700 dark:text-slate-300" />
                  <button onClick={() => { setShowSchedule(false); setScheduledAt(""); }} className="text-slate-400 hover:text-slate-600"><X size={14} /></button>
                </div>
                {/* Timezone */}
                <div className="flex gap-2 items-center p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <Globe size={14} className="text-slate-400 flex-shrink-0" />
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger className="h-7 border-0 bg-transparent text-xs focus:ring-0 p-0 shadow-none">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-(--card-color) dark:border-(--card-border-color) max-h-52">
                      {TIMEZONES.map(tz => (
                        <SelectItem key={tz} value={tz} className="text-xs">{tz}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Toolbar */}
            <div className="flex items-center justify-between px-3 py-2 border-t border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-1">
                <input ref={fileRef} type="file" multiple accept="image/*,video/mp4,video/mov" className="hidden" onChange={handleFileChange} />
                <button onClick={() => fileRef.current?.click()} title="Add image/video"
                  className={`p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${mediaPreviews.length ? "text-primary" : "text-slate-400"}`}>
                  <ImageIcon size={16} />
                </button>
                <button onClick={() => setShowLinkInput(v => !v)} title="Add link"
                  className={`p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${showLinkInput ? "text-primary" : "text-slate-400"}`}>
                  <Link2 size={16} />
                </button>
                <button onClick={() => setShowHashtags(v => !v)} title="Add hashtags"
                  className={`p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${showHashtags || hashtags.length ? "text-primary" : "text-slate-400"}`}>
                  <Hash size={16} />
                </button>
                <button onClick={() => setShowSchedule(v => !v)} title="Schedule post"
                  className={`p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${showSchedule || scheduledAt ? "text-primary" : "text-slate-400"}`}>
                  <Clock size={16} />
                </button>
              </div>
              <span className={`text-xs tabular-nums ${charCount > charLimit * 0.9 ? "text-red-500 font-medium" : "text-slate-400"}`}>
                {charCount}/{charLimit}
              </span>
            </div>
          </div>

          {/* Scheduled info banner */}
          {scheduledAt && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 text-xs text-blue-700 dark:text-blue-300">
              <Clock size={13} />
              Scheduled for <strong>{new Date(scheduledAt).toLocaleString()}</strong> · {timezone}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 justify-end">
            <Button variant="outline" onClick={handleSaveDraft} disabled={isSubmitting}>Save Draft</Button>
            {scheduledAt ? (
              <Button onClick={handleSchedule} disabled={isSubmitting} className="gap-2">
                <Clock size={14} /> Schedule Post
              </Button>
            ) : (
              <Button onClick={handlePublishNow} disabled={isSubmitting} className="gap-2">
                <Send size={14} /> Post Now
              </Button>
            )}
          </div>
        </div>

        {/* ── Account Picker ────────────────────────────────────────────────── */}
        <div>
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
            Publish to <span className="text-primary">({selectedTargets.length} selected)</span>
          </h3>

          {accounts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 p-6 text-center">
              <LinkedinIcon size={28} className="mx-auto mb-2 text-slate-300" />
              <p className="text-sm text-slate-500 mb-3">No accounts connected</p>
              <a href="/social/accounts" className="text-xs text-primary underline">Connect an account</a>
            </div>
          ) : (
            <div className="space-y-3">
              {accounts.map(account => (
                <AccountCard key={account._id} account={account} selected={selectedKeys} onToggle={toggleTarget} />
              ))}
            </div>
          )}

          {/* LinkedIn tips */}
          <div className="mt-4 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800">
            <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1.5">LinkedIn Tips</p>
            <ul className="text-xs text-blue-600 dark:text-blue-400 space-y-1 list-disc list-inside">
              <li>500–1000 chars gets 3× more reach</li>
              <li>3–5 relevant hashtags</li>
              <li>Images increase engagement by 2×</li>
              <li>Best time: Tue–Thu, 8–10 am</li>
            </ul>
          </div>

          {/* Twitter tips */}
          <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Twitter / X</p>
            <p className="text-xs text-slate-500">280 char limit · hashtags and link auto-appended · no image upload via basic API</p>
          </div>
        </div>
      </div>
    </div>
  );
}
