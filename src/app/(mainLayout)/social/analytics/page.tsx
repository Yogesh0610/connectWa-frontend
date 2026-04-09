"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";
import { useGetSocialAnalyticsQuery } from "@/src/redux/api/socialApi";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/elements/ui/select";
import { LinkedinIcon, FacebookIcon, InstagramIcon, TwitterIcon, TrendingUp, Heart, MessageCircle, Share2, Eye, BarChart3 } from "lucide-react";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

const PLATFORM_COLOR: Record<string, string> = {
  linkedin:  "#0077b5",
  facebook:  "#4f46e5",
  instagram: "#ec4899",
  twitter:   "#64748b",
};

const PLATFORM_ICON: Record<string, React.ReactNode> = {
  linkedin:  <LinkedinIcon  size={16} className="text-blue-700" />,
  facebook:  <FacebookIcon  size={16} className="text-indigo-600" />,
  instagram: <InstagramIcon size={16} className="text-pink-600" />,
  twitter:   <TwitterIcon   size={16} className="text-slate-600" />,
};

function StatCard({ label, value, icon, sub }: { label: string; value: number | string; icon: React.ReactNode; sub?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-(--card-border-color) bg-white dark:bg-(--card-color) p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-slate-500 mb-1">{label}</p>
          <p className="text-2xl font-bold text-slate-800 dark:text-white">{value}</p>
          {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
        </div>
        <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-500">{icon}</div>
      </div>
    </div>
  );
}

export default function SocialAnalyticsPage() {
  const [days, setDays] = useState("30");
  const { data, isLoading } = useGetSocialAnalyticsQuery({ days: Number(days) });

  const analytics = data?.data;
  const stats     = analytics?.overview?.stats;
  const byPlatform = analytics?.overview?.byPlatform || {};
  const timeline  = analytics?.timeline || [];
  const topPosts  = analytics?.topPosts || [];
  const pvp       = analytics?.profileVsPage;

  // Engagement timeline chart options
  const timelineOptions: ApexOptions = {
    chart: { type: "area", height: 280, toolbar: { show: false }, background: "transparent", fontFamily: "Inter, sans-serif" },
    colors: ["#6366f1", "#10b981", "#f59e0b"],
    fill: { type: "gradient", gradient: { opacityFrom: 0.4, opacityTo: 0.05 } },
    stroke: { width: 2, curve: "smooth" },
    dataLabels: { enabled: false },
    xaxis: {
      categories: timeline.map((t: { date: string }) => t.date),
      labels: { style: { colors: "#94a3b8", fontSize: "11px" } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: { labels: { style: { colors: "#94a3b8", fontSize: "11px" } } },
    grid: { borderColor: "#e2e8f0", strokeDashArray: 4 },
    legend: { position: "top", fontSize: "12px" },
    tooltip: { theme: "dark" },
  };

  const timelineSeries = [
    { name: "Likes",       data: timeline.map((t: { likes: number }) => t.likes) },
    { name: "Comments",    data: timeline.map((t: { comments: number }) => t.comments) },
    { name: "Impressions", data: timeline.map((t: { impressions: number }) => t.impressions) },
  ];

  // Profile vs Page radar chart
  const pvpOptions: ApexOptions = {
    chart: { type: "bar", height: 200, toolbar: { show: false }, background: "transparent", fontFamily: "Inter, sans-serif" },
    colors: ["#6366f1", "#10b981"],
    plotOptions: { bar: { horizontal: false, columnWidth: "40%", borderRadius: 6 } },
    dataLabels: { enabled: false },
    xaxis: { categories: ["Posts", "Likes", "Comments", "Shares", "Impressions"],
             labels: { style: { colors: "#94a3b8", fontSize: "11px" } } },
    yaxis: { labels: { style: { colors: "#94a3b8", fontSize: "11px" } } },
    grid: { borderColor: "#e2e8f0", strokeDashArray: 4 },
    legend: { position: "top" },
    tooltip: { theme: "dark" },
  };

  const pvpSeries = pvp ? [
    { name: "Profile", data: [pvp.profile.posts, pvp.profile.likes, pvp.profile.comments, pvp.profile.shares, pvp.profile.impressions] },
    { name: "Pages",   data: [pvp.page.posts,    pvp.page.likes,    pvp.page.comments,    pvp.page.shares,    pvp.page.impressions   ] },
  ] : [];

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        {[1,2,3].map(i => <div key={i} className="h-32 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Analytics</h1>
          <p className="text-sm text-slate-500 mt-1">Social media performance overview</p>
        </div>
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="w-32 h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="dark:bg-(--card-color) dark:border-(--card-border-color)">
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Post status summary */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <StatCard label="Total Posts"    value={stats.total}     icon={<BarChart3 size={18} />} />
          <StatCard label="Published"      value={stats.published} icon={<TrendingUp size={18} className="text-green-500" />} sub="live" />
          <StatCard label="Scheduled"      value={stats.scheduled} icon={<Eye size={18} className="text-blue-500" />} sub="pending" />
          <StatCard label="Failed"         value={stats.failed}    icon={<Share2 size={18} className="text-red-500" />} sub="retryable" />
          <StatCard label="Drafts"         value={stats.draft}     icon={<MessageCircle size={18} className="text-slate-400" />} />
        </div>
      )}

      {/* Per-platform breakdown */}
      {Object.keys(byPlatform).length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {Object.entries(byPlatform).map(([platform, data]) => {
            const d = data as { posts: number; likes: number; comments: number; shares: number; impressions: number; engagement_rate: number };
            return (
              <div key={platform} className="rounded-xl border border-slate-200 dark:border-(--card-border-color) bg-white dark:bg-(--card-color) p-4">
                <div className="flex items-center gap-2 mb-3">
                  {PLATFORM_ICON[platform]}
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 capitalize">{platform}</span>
                  <span className="ml-auto text-xs font-bold text-primary">{d.engagement_rate}%</span>
                </div>
                <div className="space-y-1.5 text-xs text-slate-500">
                  <div className="flex justify-between"><span>Posts</span><span className="font-medium text-slate-700 dark:text-slate-200">{d.posts}</span></div>
                  <div className="flex justify-between"><span>Likes</span><span className="font-medium text-slate-700 dark:text-slate-200">{d.likes.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Comments</span><span className="font-medium text-slate-700 dark:text-slate-200">{d.comments.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Shares</span><span className="font-medium text-slate-700 dark:text-slate-200">{d.shares.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Impressions</span><span className="font-medium text-slate-700 dark:text-slate-200">{d.impressions.toLocaleString()}</span></div>
                </div>
                {/* Mini engagement bar */}
                <div className="mt-3 h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${Math.min(d.engagement_rate * 10, 100)}%`, background: PLATFORM_COLOR[platform] || "#6366f1" }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Engagement timeline */}
      {timeline.length > 0 && (
        <div className="rounded-xl border border-slate-200 dark:border-(--card-border-color) bg-white dark:bg-(--card-color) p-5">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">Engagement Over Time</h2>
          <ReactApexChart type="area" series={timelineSeries} options={timelineOptions} height={260} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile vs Page */}
        {pvp && (pvp.profile.posts > 0 || pvp.page.posts > 0) && (
          <div className="rounded-xl border border-slate-200 dark:border-(--card-border-color) bg-white dark:bg-(--card-color) p-5">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">Profile vs Company Pages</h2>
            <div className="flex gap-6 text-xs text-slate-500 mb-3">
              <span>Profile: <strong className="text-indigo-500">{pvp.profile.engagement_rate}%</strong> eng. rate</span>
              <span>Pages: <strong className="text-green-500">{pvp.page.engagement_rate}%</strong> eng. rate</span>
            </div>
            <ReactApexChart type="bar" series={pvpSeries} options={pvpOptions} height={200} />
          </div>
        )}

        {/* Top posts */}
        {topPosts.length > 0 && (
          <div className="rounded-xl border border-slate-200 dark:border-(--card-border-color) bg-white dark:bg-(--card-color) p-5">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Top Performing Posts</h2>
            <div className="space-y-3">
              {topPosts.map((post: { _id: string; content: string; platforms: string[]; total_engagement: number; engagement_rate: number; analytics: { likes: number; comments: number; shares: number } }, rank: number) => (
                <div key={post._id} className="flex items-start gap-3">
                  <span className="text-lg font-bold text-slate-200 dark:text-slate-600 w-6 flex-shrink-0">#{rank + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">{post.content}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                      <span className="flex items-center gap-0.5"><Heart size={10} /> {post.analytics.likes}</span>
                      <span className="flex items-center gap-0.5"><MessageCircle size={10} /> {post.analytics.comments}</span>
                      <span className="flex items-center gap-0.5"><Share2 size={10} /> {post.analytics.shares}</span>
                      <span className="ml-auto font-semibold text-primary">{post.engagement_rate}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Empty state */}
      {!isLoading && !stats?.published && (
        <div className="text-center py-16 text-slate-400">
          <BarChart3 size={44} className="mx-auto mb-3 opacity-20" />
          <p className="font-medium">No published posts yet</p>
          <p className="text-sm">Publish posts and refresh analytics to see data here</p>
        </div>
      )}
    </div>
  );
}
