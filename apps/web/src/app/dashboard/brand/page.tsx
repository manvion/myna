"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://myna-production-d05b.up.railway.app";

export default function BrandPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [workspace, setWorkspace] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({
    businessName: "",
    tone: "professional",
    targetAudience: "",
    primaryColor: "#22c55e",
    websiteUrl: "",
  });

  useEffect(() => {
    const token = localStorage.getItem("myna_token");
    if (!token) { router.push("/onboarding"); return; }

    fetch(`${API_URL}/api/user/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(u => {
        setUser(u);
        const ws = u.workspace;
        setWorkspace(ws);
        if (ws) {
          setForm({
            businessName: ws.businessName || "",
            tone: ws.tone || "professional",
            targetAudience: ws.targetAudience || "",
            primaryColor: ws.primaryColor || "#22c55e",
            websiteUrl: u.brandProfile?.websiteUrl || "",
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    const token = localStorage.getItem("myna_token");
    await fetch(`${API_URL}/api/user/brand`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const TONES = ["professional", "friendly", "luxurious", "playful", "authoritative", "trendy"];

  return (
    <div className="min-h-screen flex">
      <Sidebar user={user} />

      <main className="flex-1 md:ml-56 p-6 pb-24 md:pb-6">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold mb-2">Brand Kit</h1>
          <p className="text-gray-400 mb-8">Your brand identity shapes every piece of AI-generated content.</p>

          <div className="space-y-6">
            {/* Business name */}
            <div className="glass rounded-xl p-5">
              <label className="block text-sm font-medium mb-2">Business Name</label>
              <input
                type="text"
                value={form.businessName}
                onChange={e => setForm({ ...form, businessName: e.target.value })}
                placeholder="e.g. Mumbai Street Kitchen"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-green-500/50 transition-colors"
              />
            </div>

            {/* Brand tone */}
            <div className="glass rounded-xl p-5">
              <label className="block text-sm font-medium mb-3">Brand Voice</label>
              <div className="grid grid-cols-3 gap-2">
                {TONES.map(tone => (
                  <button
                    key={tone}
                    onClick={() => setForm({ ...form, tone })}
                    className={`py-2 px-3 rounded-lg text-sm capitalize transition-colors ${
                      form.tone === tone
                        ? "bg-green-500/20 text-green-400 border border-green-500/40"
                        : "bg-white/5 text-gray-400 border border-white/10 hover:border-white/20"
                    }`}
                  >
                    {tone}
                  </button>
                ))}
              </div>
            </div>

            {/* Target audience */}
            <div className="glass rounded-xl p-5">
              <label className="block text-sm font-medium mb-2">Target Audience</label>
              <input
                type="text"
                value={form.targetAudience}
                onChange={e => setForm({ ...form, targetAudience: e.target.value })}
                placeholder="e.g. Young professionals aged 25-35 in Mumbai"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-green-500/50 transition-colors"
              />
            </div>

            {/* Brand color */}
            <div className="glass rounded-xl p-5">
              <label className="block text-sm font-medium mb-3">Brand Color</label>
              <div className="flex items-center gap-4">
                <input
                  type="color"
                  value={form.primaryColor}
                  onChange={e => setForm({ ...form, primaryColor: e.target.value })}
                  className="w-12 h-12 rounded-lg cursor-pointer border-0 bg-transparent"
                />
                <div>
                  <p className="text-sm font-mono">{form.primaryColor}</p>
                  <p className="text-xs text-gray-500">Used for caption overlays and watermarks</p>
                </div>
                <div className="ml-auto flex gap-2">
                  {["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"].map(c => (
                    <button key={c} onClick={() => setForm({ ...form, primaryColor: c })} className="w-7 h-7 rounded-full border-2 border-transparent hover:border-white/40 transition-colors" style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
            </div>

            {/* Website */}
            <div className="glass rounded-xl p-5">
              <label className="block text-sm font-medium mb-2">Website URL</label>
              <input
                type="url"
                value={form.websiteUrl}
                onChange={e => setForm({ ...form, websiteUrl: e.target.value })}
                placeholder="https://yourbusiness.com"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-green-500/50 transition-colors"
              />
              <p className="text-xs text-gray-500 mt-2">Send this URL on WhatsApp to auto-generate a content matrix from your website.</p>
            </div>

            <button
              onClick={save}
              disabled={saving}
              className="w-full bg-green-500 hover:bg-green-400 disabled:opacity-50 text-gray-950 font-semibold py-3 rounded-xl transition-colors"
            >
              {saving ? "Saving..." : saved ? "Saved!" : "Save Brand Kit"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
