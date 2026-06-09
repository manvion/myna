"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const PLATFORM_COLORS: Record<string, string> = {
  INSTAGRAM: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  FACEBOOK: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  TIKTOK: "bg-gray-500/20 text-gray-300 border-gray-500/30",
  YOUTUBE: "bg-red-500/20 text-red-400 border-red-500/30",
  DOWNLOAD_ONLY: "bg-green-500/20 text-green-400 border-green-500/30",
};

const PLATFORM_ICONS: Record<string, string> = {
  INSTAGRAM: "📸", FACEBOOK: "📘", TIKTOK: "🎵", YOUTUBE: "▶️", DOWNLOAD_ONLY: "📥",
};

export default function CalendarPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    const token = localStorage.getItem("myna_token");
    if (!token) { router.push("/onboarding"); return; }

    Promise.all([
      fetch(`${API_URL}/api/user/me`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(`${API_URL}/api/content/scheduled`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ]).then(([u, s]) => {
      setUser(u);
      setPosts(s.posts || []);
    }).finally(() => setLoading(false));
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const postsByDay: Record<number, any[]> = {};
  posts.forEach(post => {
    const d = new Date(post.scheduledAt);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      if (!postsByDay[day]) postsByDay[day] = [];
      postsByDay[day].push(post);
    }
  });

  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen flex">
      <Sidebar user={user} />

      <main className="flex-1 md:ml-56 p-6 pb-24 md:pb-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Content Calendar</h1>
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="p-2 hover:bg-white/10 rounded-lg transition-colors">←</button>
              <span className="text-sm font-medium w-36 text-center">{MONTHS[month]} {year}</span>
              <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="p-2 hover:bg-white/10 rounded-lg transition-colors">→</button>
            </div>
          </div>

          <div className="glass rounded-2xl overflow-hidden">
            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-white/10">
              {DAYS.map(d => (
                <div key={d} className="p-3 text-center text-xs text-gray-500 font-medium">{d}</div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7">
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-[80px] border-b border-r border-white/5" />
              ))}

              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
                const dayPosts = postsByDay[day] || [];

                return (
                  <div key={day} className={`min-h-[80px] p-2 border-b border-r border-white/5 ${isToday ? "bg-green-500/5" : ""}`}>
                    <div className={`text-xs mb-1 w-6 h-6 flex items-center justify-center rounded-full ${isToday ? "bg-green-500 text-gray-950 font-bold" : "text-gray-400"}`}>
                      {day}
                    </div>
                    <div className="space-y-1">
                      {dayPosts.slice(0, 2).map((post: any) => (
                        <div key={post.id} className={`text-[10px] px-1.5 py-0.5 rounded border ${PLATFORM_COLORS[post.platform] || "bg-white/10 text-gray-300"} truncate`}>
                          {PLATFORM_ICONS[post.platform]} {post.content?.contentType || "Content"}
                        </div>
                      ))}
                      {dayPosts.length > 2 && (
                        <div className="text-[10px] text-gray-500">+{dayPosts.length - 2} more</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Upcoming posts list */}
          <div className="mt-6">
            <h2 className="text-lg font-semibold mb-4">Scheduled Posts</h2>
            {posts.length === 0 ? (
              <div className="glass rounded-xl p-8 text-center text-gray-500">
                <p className="text-4xl mb-3">📅</p>
                <p>No scheduled posts yet.</p>
                <p className="text-sm mt-1">Generate content on WhatsApp and choose "Schedule" when approving.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {posts.slice(0, 10).map((post: any) => (
                  <div key={post.id} className="glass rounded-xl p-4 flex items-center gap-4">
                    <span className="text-2xl">{PLATFORM_ICONS[post.platform]}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{post.content?.caption || "Scheduled post"}</div>
                      <div className="text-xs text-gray-500">{new Date(post.scheduledAt).toLocaleString()}</div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full border ${PLATFORM_COLORS[post.platform]}`}>
                      {post.platform}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full ${post.status === "PUBLISHED" ? "bg-green-500/20 text-green-400" : post.status === "FAILED" ? "bg-red-500/20 text-red-400" : "bg-yellow-500/20 text-yellow-400"}`}>
                      {post.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
