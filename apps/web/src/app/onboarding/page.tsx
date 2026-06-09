"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const WORKSPACES = [
  { id: "RESTAURANT", icon: "🍔", label: "Restaurant / Food", desc: "Food photos, menu promos, viral reels" },
  { id: "REAL_ESTATE", icon: "🏠", label: "Real Estate", desc: "Property tours, listing posts, market tips" },
  { id: "ECOMMERCE", icon: "📦", label: "Ecommerce / Products", desc: "Product reels, sale posts, unboxing content" },
  { id: "CREATOR", icon: "🎥", label: "Creator / Influencer", desc: "Viral reels, brand deals, audience growth" },
  { id: "BUSINESS_SERVICES", icon: "💼", label: "Business Services", desc: "Authority content, lead gen, brand building" },
  { id: "EVENTS", icon: "📢", label: "Events / Promotions", desc: "Teasers, ticket promos, highlight reels" },
  { id: "EDUCATION", icon: "🎓", label: "Education / Coaching", desc: "Course promos, tips reels, testimonials" },
  { id: "PERSONAL", icon: "🏡", label: "Personal / Family", desc: "Birthday reels, memories, WhatsApp status, family moments" },
];

type Step = "phone" | "workspace" | "done";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [selectedWs, setSelectedWs] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [whatsappLink, setWhatsappLink] = useState("");

  async function handlePhoneSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed");
      localStorage.setItem("myna_token", data.token);
      setStep("workspace");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleWorkspaceSelect(wsId: string) {
    setSelectedWs(wsId);
    setLoading(true);
    try {
      const token = localStorage.getItem("myna_token");
      await fetch(`${API_URL}/api/user/workspace`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ type: wsId }),
      });
      // Build WhatsApp deep link to start the bot
      const waNumber = process.env.NEXT_PUBLIC_WA_NUMBER || "1234567890";
      setWhatsappLink(`https://wa.me/${waNumber}?text=Hi!+I+just+signed+up+for+AI+Content+Studio`);
      setStep("done");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="flex gap-2 mb-8">
          {(["phone", "workspace", "done"] as Step[]).map((s, i) => (
            <div key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${
              ["phone", "workspace", "done"].indexOf(step) >= i ? "bg-green-500" : "bg-white/10"
            }`} />
          ))}
        </div>

        {/* Step 1: Phone + Name */}
        {step === "phone" && (
          <div className="animate-slide-up">
            <h1 className="text-3xl font-black mb-2">Get Started</h1>
            <p className="text-gray-400 mb-8">Enter your WhatsApp number to connect.</p>

            <form onSubmit={handlePhoneSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Your Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Business or your name"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-green-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">WhatsApp Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  required
                  pattern="\+[0-9]{8,15}"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-green-500 transition-colors"
                />
                <p className="text-xs text-gray-600 mt-1">Include country code (e.g. +91 for India)</p>
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-green-500 hover:bg-green-400 disabled:opacity-50 text-gray-950 font-bold py-3.5 rounded-xl transition-colors"
              >
                {loading ? "Setting up..." : "Continue →"}
              </button>
            </form>
          </div>
        )}

        {/* Step 2: Workspace */}
        {step === "workspace" && (
          <div className="animate-slide-up">
            <h1 className="text-3xl font-black mb-2">Choose Your Workspace</h1>
            <p className="text-gray-400 mb-6">This customizes all AI templates, tones &amp; content for your business type.</p>

            <div className="space-y-3">
              {WORKSPACES.map((ws) => (
                <button
                  key={ws.id}
                  onClick={() => handleWorkspaceSelect(ws.id)}
                  disabled={loading}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${
                    selectedWs === ws.id
                      ? "border-green-500 bg-green-500/10"
                      : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
                  }`}
                >
                  <span className="text-3xl">{ws.icon}</span>
                  <div>
                    <div className="font-semibold">{ws.label}</div>
                    <div className="text-sm text-gray-400">{ws.desc}</div>
                  </div>
                  {selectedWs === ws.id && loading && (
                    <span className="ml-auto text-green-400 text-sm">Setting up...</span>
                  )}
                </button>
              ))}
            </div>

            {error && <p className="text-red-400 text-sm mt-4">{error}</p>}
          </div>
        )}

        {/* Step 3: Done */}
        {step === "done" && (
          <div className="animate-slide-up text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h1 className="text-3xl font-black mb-3">You're All Set!</h1>
            <p className="text-gray-400 mb-8">
              Your{" "}
              <span className="text-green-400 font-semibold">
                {WORKSPACES.find((w) => w.id === selectedWs)?.label}
              </span>{" "}
              workspace is ready. Open WhatsApp to start creating content!
            </p>

            <div className="glass rounded-2xl p-6 mb-6 text-left space-y-3">
              <h3 className="font-semibold text-green-400">What you can do now:</h3>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>📸 Send a photo → get a viral reel</li>
                <li>🌐 Send your website URL → get 30-day content plan</li>
                <li>🎥 Send a video → get edited with music & captions</li>
                <li>✍️ Type a prompt → get posts, captions & hashtags</li>
              </ul>
            </div>

            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full bg-green-500 hover:bg-green-400 text-gray-950 font-bold py-4 rounded-xl text-lg transition-all hover:scale-105 mb-3"
            >
              📱 Open WhatsApp →
            </a>
            <button
              onClick={() => router.push("/dashboard")}
              className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
            >
              View Dashboard
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
