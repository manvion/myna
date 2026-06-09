"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://myna-production-d05b.up.railway.app";

const PLATFORMS = [
  { id: "instagram", label: "Instagram", icon: "ðŸ“¸", color: "from-pink-500 to-purple-600", desc: "Post Reels and feed photos" },
  { id: "facebook", label: "Facebook", icon: "ðŸ“˜", color: "from-blue-600 to-blue-800", desc: "Post videos and updates" },
  { id: "tiktok", label: "TikTok", icon: "ðŸŽµ", color: "from-gray-800 to-gray-950", desc: "Post short-form videos" },
  { id: "youtube", label: "YouTube", icon: "â–¶ï¸", color: "from-red-600 to-red-800", desc: "Post Shorts and videos" },
];

export default function ConnectPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [connected, setConnected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("myna_token");
    if (!token) { router.push("/onboarding"); return; }

    Promise.all([
      fetch(`${API_URL}/api/user/me`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(`${API_URL}/api/oauth/accounts`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ]).then(([u, a]) => {
      setUser(u);
      setConnected((a.accounts || []).map((acc: any) => acc.platform.toLowerCase()));
    }).finally(() => setLoading(false));

    // Handle OAuth callback params
    const params = new URLSearchParams(window.location.search);
    const success = params.get("success");
    const error = params.get("error");
    if (success) window.history.replaceState({}, "", "/connect");
    if (error) window.history.replaceState({}, "", "/connect");
  }, []);

  function connectPlatform(platformId: string) {
    const token = localStorage.getItem("myna_token");
    window.location.href = `${API_URL}/api/oauth/${platformId}/connect?token=${token}`;
  }

  async function disconnectPlatform(platformId: string) {
    const token = localStorage.getItem("myna_token");
    await fetch(`${API_URL}/api/oauth/${platformId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    setConnected(prev => prev.filter(p => p !== platformId));
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen flex">
      <Sidebar user={user} />

      <main className="flex-1 md:ml-56 p-6 pb-24 md:pb-6">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold mb-2">Connect Social Accounts</h1>
          <p className="text-gray-400 mb-8">Connect your accounts so Myna can auto-post approved content.</p>

          <div className="space-y-4">
            {PLATFORMS.map((platform) => {
              const isConnected = connected.includes(platform.id);
              return (
                <div key={platform.id} className="glass rounded-xl p-5 flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${platform.color} flex items-center justify-center text-2xl`}>
                    {platform.icon}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium flex items-center gap-2">
                      {platform.label}
                      {isConnected && (
                        <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">Connected</span>
                      )}
                    </div>
                    <p className="text-gray-400 text-sm">{platform.desc}</p>
                  </div>
                  {isConnected ? (
                    <button
                      onClick={() => disconnectPlatform(platform.id)}
                      className="text-sm text-gray-500 hover:text-red-400 border border-white/10 rounded-lg px-4 py-2 transition-colors"
                    >
                      Disconnect
                    </button>
                  ) : (
                    <button
                      onClick={() => connectPlatform(platform.id)}
                      className="text-sm bg-green-500 hover:bg-green-400 text-gray-950 font-semibold rounded-lg px-4 py-2 transition-colors"
                    >
                      Connect
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-8 glass rounded-xl p-5">
            <h2 className="font-semibold mb-2">How it works</h2>
            <ul className="text-gray-400 text-sm space-y-2">
              <li>1. Connect your social accounts above</li>
              <li>2. Generate content via WhatsApp</li>
              <li>3. Approve and choose "Post Now" or "Schedule"</li>
              <li>4. Myna auto-posts to all connected platforms</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
