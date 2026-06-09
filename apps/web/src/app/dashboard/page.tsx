"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const WORKSPACE_ICONS: Record<string, string> = {
  RESTAURANT: "🍔", REAL_ESTATE: "🏠", ECOMMERCE: "📦",
  CREATOR: "🎥", BUSINESS_SERVICES: "💼", EVENTS: "📢",
  EDUCATION: "🎓", PERSONAL: "🏡",
};

interface Content {
  id: string;
  contentType: string;
  jobStatus: string;
  caption?: string;
  thumbnailUrl?: string;
  videoUrl?: string;
  createdAt: string;
  hook?: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [content, setContent] = useState<Content[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "COMPLETED" | "PROCESSING" | "FAILED">("ALL");

  useEffect(() => {
    const token = localStorage.getItem("myna_token");
    if (!token) { router.push("/onboarding"); return; }

    Promise.all([
      fetch(`${API_URL}/api/user/me`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(`${API_URL}/api/user/content`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ]).then(([u, c]) => {
      setUser(u);
      setContent(c.items || []);
    }).catch(() => router.push("/onboarding"))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Loading your content...</p>
        </div>
      </div>
    );
  }

  const workspace = user?.workspace;
  const waNumber = process.env.NEXT_PUBLIC_WA_NUMBER;
  const quotaUsed = user?.videosThisMonth || 0;
  const quotaTotal = user?.videoQuota === -1 ? null : (user?.videoQuota || 5);
  const quotaPct = quotaTotal ? Math.min((quotaUsed / quotaTotal) * 100, 100) : 0;
  const tier = user?.subscriptionTier || "FREE";

  const filtered = filter === "ALL" ? content : content.filter(c => c.jobStatus === filter);

  return (
    <div className="min-h-screen flex">
      <Sidebar user={user} />

      <main className="flex-1 md:ml-56 p-4 md:p-8 pb-20 md:pb-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black">
              {WORKSPACE_ICONS[workspace?.type] || "🚀"} {workspace?.type?.replace(/_/g, " ")} Dashboard
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Welcome back, {user?.name?.split(" ")[0] || "there"}
            </p>
          </div>
          <a
            href={waNumber ? `https://wa.me/${waNumber}` : "#"}
            target="_blank"
            className="bg-green-500 hover:bg-green-400 text-gray-950 font-bold px-4 py-2.5 rounded-lg text-sm transition-colors whitespace-nowrap"
          >
            📱 Create Content
          </a>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Created", value: content.length, icon: "🎬" },
            { label: "Completed", value: content.filter(c => c.jobStatus === "COMPLETED").length, icon: "✅" },
            { label: "This Month", value: quotaUsed, icon: "📅" },
            { label: "Plan", value: tier, icon: tier === "FREE" ? "🆓" : tier === "STARTER" ? "⭐" : "💎" },
          ].map((stat) => (
            <div key={stat.label} className="glass rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <span>{stat.icon}</span>
                <p className="text-gray-400 text-xs">{stat.label}</p>
              </div>
              <p className="text-xl font-bold">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Quota bar */}
        {quotaTotal && (
          <div className="glass rounded-xl p-4 mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Monthly usage</span>
              <span className="text-sm font-semibold">
                {quotaUsed} / {quotaTotal} videos
                {tier === "FREE" && (
                  <a href="/pricing" className="ml-3 text-green-400 hover:text-green-300 text-xs">Upgrade →</a>
                )}
              </span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${quotaPct > 80 ? "bg-red-500" : quotaPct > 50 ? "bg-yellow-500" : "bg-green-500"}`}
                style={{ width: `${quotaPct}%` }}
              />
            </div>
          </div>
        )}

        {/* Content grid */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Generated Content</h2>
          <div className="flex gap-2">
            {(["ALL", "COMPLETED", "PROCESSING", "FAILED"] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-xs px-3 py-1 rounded-full transition-colors ${
                  filter === f ? "bg-green-500 text-gray-950 font-semibold" : "glass text-gray-400 hover:text-gray-200"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center">
            <div className="text-5xl mb-4">📱</div>
            <h3 className="text-xl font-bold mb-2">
              {filter === "ALL" ? "No content yet" : `No ${filter.toLowerCase()} content`}
            </h3>
            <p className="text-gray-400 mb-6">
              {filter === "ALL"
                ? "Send a photo, video, or idea on WhatsApp to get started!"
                : "Try changing the filter above."}
            </p>
            {filter === "ALL" && waNumber && (
              <a
                href={`https://wa.me/${waNumber}`}
                target="_blank"
                className="bg-green-500 hover:bg-green-400 text-gray-950 font-bold px-6 py-3 rounded-xl transition-colors"
              >
                Open WhatsApp →
              </a>
            )}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((item) => (
              <div key={item.id} className="glass rounded-xl overflow-hidden group">
                {item.thumbnailUrl ? (
                  <div className="aspect-video bg-gray-900 overflow-hidden">
                    <img src={item.thumbnailUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  </div>
                ) : (
                  <div className="aspect-video bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                    <span className="text-4xl">
                      {item.contentType === "REEL" ? "🎬" : item.contentType === "POST" ? "📸" : item.contentType === "QUOTE_CARD" ? "💬" : item.contentType === "THUMBNAIL" ? "🖼️" : "🎥"}
                    </span>
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold bg-white/10 px-2 py-0.5 rounded-full">
                      {item.contentType}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      item.jobStatus === "COMPLETED" ? "bg-green-500/20 text-green-400" :
                      item.jobStatus === "PROCESSING" ? "bg-yellow-500/20 text-yellow-400 animate-pulse" :
                      item.jobStatus === "FAILED" ? "bg-red-500/20 text-red-400" :
                      "bg-gray-500/20 text-gray-400"
                    }`}>
                      {item.jobStatus === "PROCESSING" ? "⏳ Processing" : item.jobStatus}
                    </span>
                  </div>
                  {item.hook && (
                    <p className="text-sm font-medium text-white line-clamp-1 mb-1">"{item.hook}"</p>
                  )}
                  {item.caption && (
                    <p className="text-xs text-gray-400 line-clamp-2">{item.caption}</p>
                  )}
                  <p className="text-xs text-gray-600 mt-2">
                    {new Date(item.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                  {item.videoUrl && item.jobStatus === "COMPLETED" && (
                    <a
                      href={item.videoUrl}
                      target="_blank"
                      className="mt-3 flex items-center justify-center gap-1 text-xs font-semibold text-green-400 hover:text-green-300 transition-colors bg-green-500/10 rounded-lg py-1.5"
                    >
                      📥 Download
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
