"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface Stats {
  total: number;
  completed: number;
  processing: number;
  failed: number;
  thisMonth: number;
  byWorkspace: Record<string, number>;
  byContentType: Record<string, number>;
  topHashtags: string[];
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("myna_token");
    if (!token) { router.push("/onboarding"); return; }

    Promise.all([
      fetch(`${API_URL}/api/user/me`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(`${API_URL}/api/user/stats`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ]).then(([u, s]) => {
      setUser(u);
      setStats(s);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const quotaUsed = user?.videosThisMonth || 0;
  const quotaTotal = user?.videoQuota === -1 ? null : user?.videoQuota;
  const quotaPct = quotaTotal ? Math.min((quotaUsed / quotaTotal) * 100, 100) : 0;

  return (
    <div className="min-h-screen flex">
      <Sidebar user={user} />

      <main className="flex-1 md:ml-56 p-6 pb-24 md:pb-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">Analytics</h1>

          {/* Quota bar */}
          <div className="glass rounded-xl p-5 mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">This month's videos</span>
              <span className="text-sm font-medium">
                {quotaUsed} / {quotaTotal ?? "∞"}
              </span>
            </div>
            {quotaTotal && (
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${quotaPct > 80 ? "bg-red-500" : "bg-green-500"}`}
                  style={{ width: `${quotaPct}%` }}
                />
              </div>
            )}
            <p className="text-xs text-gray-500 mt-2">Plan: {user?.subscriptionTier || "FREE"}</p>
          </div>

          {/* Overview stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: "Total Videos", value: stats?.total ?? 0, icon: "🎬" },
              { label: "Completed", value: stats?.completed ?? 0, icon: "✅" },
              { label: "Processing", value: stats?.processing ?? 0, icon: "⚙️" },
              { label: "This Month", value: stats?.thisMonth ?? 0, icon: "📅" },
            ].map(({ label, value, icon }) => (
              <div key={label} className="glass rounded-xl p-4">
                <div className="text-2xl mb-1">{icon}</div>
                <div className="text-2xl font-bold">{value}</div>
                <div className="text-xs text-gray-400">{label}</div>
              </div>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* By content type */}
            <div className="glass rounded-xl p-5">
              <h2 className="font-semibold mb-4">By Content Type</h2>
              {stats?.byContentType && Object.entries(stats.byContentType).length > 0 ? (
                <div className="space-y-3">
                  {Object.entries(stats.byContentType).map(([type, count]) => {
                    const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                    return (
                      <div key={type}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-300">{type}</span>
                          <span className="text-gray-400">{count}</span>
                        </div>
                        <div className="h-1.5 bg-white/10 rounded-full">
                          <div className="h-full bg-green-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No data yet</p>
              )}
            </div>

            {/* Top hashtags */}
            <div className="glass rounded-xl p-5">
              <h2 className="font-semibold mb-4">Most Used Hashtags</h2>
              {stats?.topHashtags?.length ? (
                <div className="flex flex-wrap gap-2">
                  {stats.topHashtags.map(tag => (
                    <span key={tag} className="text-xs bg-white/10 text-gray-300 px-2.5 py-1 rounded-full">#{tag}</span>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">Generate some content first</p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
