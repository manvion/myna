"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const WORKSPACE_TYPES = [
  { value: "REAL_ESTATE", label: "Real Estate", category: "HIGH_VALUE" },
  { value: "HEALTHCARE", label: "Healthcare", category: "HIGH_VALUE" },
  { value: "HOTEL", label: "Hotel", category: "HIGH_VALUE" },
  { value: "AUTOMOBILE", label: "Automobile", category: "HIGH_VALUE" },
  { value: "INTERIOR_DESIGN", label: "Interior Design", category: "HIGH_VALUE" },
  { value: "EDUCATION", label: "Education", category: "PROFESSIONAL" },
  { value: "PHOTOGRAPHY", label: "Photography", category: "PROFESSIONAL" },
  { value: "EVENTS", label: "Events", category: "PROFESSIONAL" },
  { value: "BUSINESS_SERVICES", label: "Business Services", category: "PROFESSIONAL" },
  { value: "TRAVEL", label: "Travel", category: "PROFESSIONAL" },
  { value: "JEWELRY", label: "Jewelry", category: "PROFESSIONAL" },
  { value: "RESTAURANT", label: "Restaurant", category: "STANDARD" },
  { value: "ECOMMERCE", label: "E-commerce", category: "STANDARD" },
  { value: "FITNESS_GYM", label: "Fitness & Gym", category: "STANDARD" },
  { value: "SALON_SPA", label: "Salon & Spa", category: "STANDARD" },
  { value: "FASHION", label: "Fashion", category: "STANDARD" },
  { value: "CREATOR", label: "Creator", category: "STANDARD" },
  { value: "PERSONAL", label: "Personal", category: "PERSONAL" },
];

const CATEGORY_LABELS: Record<string, string> = {
  HIGH_VALUE: "Premium Industries",
  PROFESSIONAL: "Professional Services",
  STANDARD: "Standard Business",
  PERSONAL: "Personal Use",
};

interface PriceData {
  tier: string;
  monthly: { amountCents: number; display: string };
  annual: { amountCents: number; display: string };
  country: string;
  quota: number | string;
}

const FREE_FEATURES = [
  "1 video generation lifetime",
  "Myna watermark",
  "WhatsApp bot access",
  "AI caption & hashtags",
  "Download only",
];

const GROWTH_FEATURES = [
  "30 videos per month",
  "No watermark",
  "All video styles",
  "AI reel scripts & captions",
  "30 hashtags per post",
  "Story sets & DM scripts",
  "WhatsApp broadcast copy",
  "Social scheduling",
];

const UNLIMITED_FEATURES = [
  "Unlimited video generations",
  "No watermark",
  "Priority processing queue",
  "All Growth features",
  "Full content kit (KIT command)",
  "Listing & portal descriptions",
  "Bulk content generation",
  "Analytics dashboard",
];

const COMPARE_ROWS = [
  { feature: "Videos per month", free: "1 lifetime", growth: "30", unlimited: "Unlimited" },
  { feature: "Watermark", free: "Myna branded", growth: "None", unlimited: "None" },
  { feature: "Reel scripts & captions", free: "âœ“", growth: "âœ“", unlimited: "âœ“" },
  { feature: "Hashtags (30 per post)", free: "âœ“", growth: "âœ“", unlimited: "âœ“" },
  { feature: "Full content kit (KIT)", free: "â€”", growth: "âœ“", unlimited: "âœ“" },
  { feature: "Listing/portal descriptions", free: "â€”", growth: "âœ“", unlimited: "âœ“" },
  { feature: "Story sets & DM scripts", free: "â€”", growth: "âœ“", unlimited: "âœ“" },
  { feature: "Priority queue", free: "â€”", growth: "â€”", unlimited: "âœ“" },
  { feature: "Social scheduling", free: "â€”", growth: "âœ“", unlimited: "âœ“" },
  { feature: "Analytics", free: "â€”", growth: "Basic", unlimited: "Full" },
];

export default function PricingPage() {
  const [workspaceType, setWorkspaceType] = useState("RESTAURANT");
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const [prices, setPrices] = useState<{ growth?: PriceData; unlimited?: PriceData }>({});
  const [loading, setLoading] = useState(false);
  const [checkingOut, setCheckingOut] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://myna-production-d05b.up.railway.app";

  useEffect(() => {
    const userId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
    if (!userId) return;
    setLoading(true);
    Promise.all([
      fetch(`${apiUrl}/api/stripe/price?userId=${userId}&plan=GROWTH`).then(r => r.json()),
      fetch(`${apiUrl}/api/stripe/price?userId=${userId}&plan=UNLIMITED`).then(r => r.json()),
    ])
      .then(([growth, unlimited]) => setPrices({ growth, unlimited }))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [workspaceType, apiUrl]);

  async function handleCheckout(plan: "GROWTH" | "UNLIMITED") {
    const userId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
    if (!userId) {
      window.location.href = "/onboarding";
      return;
    }
    setCheckingOut(plan);
    try {
      const res = await fetch(`${apiUrl}/api/stripe/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, plan, billing }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      alert("Failed to start checkout. Please try again.");
    } finally {
      setCheckingOut(null);
    }
  }

  const selectedCategory = WORKSPACE_TYPES.find(w => w.value === workspaceType)?.category || "STANDARD";

  const growthDisplay = billing === "annual"
    ? prices.growth?.annual?.display
    : prices.growth?.monthly?.display;
  const unlimitedDisplay = billing === "annual"
    ? prices.unlimited?.annual?.display
    : prices.unlimited?.monthly?.display;

  return (
    <main className="min-h-screen">
      <nav className="fixed top-0 inset-x-0 z-50 glass border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-bold text-lg"><span className="gradient-text">Myna</span></Link>
          <Link href="/onboarding" className="bg-green-500 hover:bg-green-400 text-gray-950 font-semibold px-4 py-2 rounded-lg text-sm transition-colors">
            Get Started Free
          </Link>
        </div>
      </nav>

      <div className="pt-32 pb-20 px-6">
        <div className="max-w-5xl mx-auto">

          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Pricing built for your business</h1>
            <p className="text-gray-400 text-lg">Prices adjust based on your industry. Select your business type below.</p>
          </div>

          {/* Workspace selector */}
          <div className="glass rounded-2xl p-6 mb-8 border border-white/10">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
              <div>
                <p className="text-sm text-gray-400 mb-1">Your business type</p>
                <select
                  value={workspaceType}
                  onChange={(e) => setWorkspaceType(e.target.value)}
                  className="bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
                >
                  {Object.entries(
                    WORKSPACE_TYPES.reduce((acc, w) => {
                      if (!acc[w.category]) acc[w.category] = [];
                      acc[w.category].push(w);
                      return acc;
                    }, {} as Record<string, typeof WORKSPACE_TYPES>)
                  ).map(([cat, items]) => (
                    <optgroup key={cat} label={CATEGORY_LABELS[cat]}>
                      {items.map(w => (
                        <option key={w.value} value={w.value}>{w.label}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div className="md:ml-auto">
                <p className="text-sm text-gray-400 mb-1">Billing cycle</p>
                <div className="flex rounded-lg overflow-hidden border border-white/20">
                  <button
                    onClick={() => setBilling("monthly")}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${billing === "monthly" ? "bg-green-500 text-gray-950" : "hover:bg-white/5"}`}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setBilling("annual")}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${billing === "annual" ? "bg-green-500 text-gray-950" : "hover:bg-white/5"}`}
                  >
                    Annual
                    <span className="ml-1.5 bg-green-500/20 text-green-400 text-xs px-1.5 py-0.5 rounded">
                      2 months free
                    </span>
                  </button>
                </div>
              </div>
            </div>
            {prices.growth?.country && prices.growth.country !== "US" && (
              <p className="text-xs text-gray-500 mt-3">
                Prices adjusted for {prices.growth.country} via purchasing power parity.
              </p>
            )}
          </div>

          {/* Plan cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-16">

            {/* Free */}
            <div className="glass rounded-2xl p-6 border border-white/10">
              <div className="mb-6">
                <h3 className="font-bold text-lg text-gray-300">Free</h3>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-4xl font-bold">$0</span>
                  <span className="text-gray-400 text-sm">/forever</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Try it out, no credit card</p>
              </div>
              <ul className="space-y-2.5 mb-8">
                {FREE_FEATURES.map(f => (
                  <li key={f} className="text-sm text-gray-400 flex items-start gap-2">
                    <span className="text-gray-600 mt-0.5">âœ“</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/onboarding"
                className="block text-center py-3 rounded-xl text-sm font-semibold border border-white/20 hover:border-white/40 transition-colors"
              >
                Get Started Free
              </Link>
            </div>

            {/* Growth */}
            <div className="relative glass rounded-2xl p-6 border border-green-500/50 glow">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-500 text-gray-950 text-xs font-bold px-4 py-1 rounded-full">
                Most Popular
              </div>
              <div className="mb-6">
                <h3 className="font-bold text-lg">Growth</h3>
                <div className="flex items-baseline gap-1 mt-2">
                  {loading ? (
                    <span className="text-4xl font-bold text-gray-600 animate-pulse">...</span>
                  ) : (
                    <>
                      <span className="text-4xl font-bold">{growthDisplay || "$19"}</span>
                      <span className="text-gray-400 text-sm">/{billing === "annual" ? "yr" : "mo"}</span>
                    </>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {billing === "annual" ? "Billed annually Â· 2 months free" : "Billed monthly"}
                </p>
              </div>
              <ul className="space-y-2.5 mb-8">
                {GROWTH_FEATURES.map(f => (
                  <li key={f} className="text-sm text-gray-300 flex items-start gap-2">
                    <span className="text-green-400 mt-0.5">âœ“</span>
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleCheckout("GROWTH")}
                disabled={checkingOut !== null}
                className="w-full py-3 rounded-xl text-sm font-semibold bg-green-500 hover:bg-green-400 text-gray-950 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {checkingOut === "GROWTH" ? "Redirecting..." : `Start Growth Plan`}
              </button>
            </div>

            {/* Unlimited */}
            <div className="glass rounded-2xl p-6 border border-purple-500/30">
              <div className="mb-6">
                <h3 className="font-bold text-lg">Unlimited</h3>
                <div className="flex items-baseline gap-1 mt-2">
                  {loading ? (
                    <span className="text-4xl font-bold text-gray-600 animate-pulse">...</span>
                  ) : (
                    <>
                      <span className="text-4xl font-bold">{unlimitedDisplay || "$49"}</span>
                      <span className="text-gray-400 text-sm">/{billing === "annual" ? "yr" : "mo"}</span>
                    </>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {billing === "annual" ? "Billed annually Â· 2 months free" : "Billed monthly"}
                </p>
              </div>
              <ul className="space-y-2.5 mb-8">
                {UNLIMITED_FEATURES.map(f => (
                  <li key={f} className="text-sm text-gray-300 flex items-start gap-2">
                    <span className="text-purple-400 mt-0.5">âœ“</span>
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleCheckout("UNLIMITED")}
                disabled={checkingOut !== null}
                className="w-full py-3 rounded-xl text-sm font-semibold border border-purple-500/50 hover:border-purple-400 hover:bg-purple-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {checkingOut === "UNLIMITED" ? "Redirecting..." : `Get Unlimited`}
              </button>
            </div>
          </div>

          {/* Comparison table */}
          <h2 className="text-2xl font-bold text-center mb-8">Full feature comparison</h2>
          <div className="glass rounded-2xl overflow-hidden border border-white/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left p-4 text-gray-400 font-medium w-1/2">Feature</th>
                  <th className="p-4 text-center font-medium text-gray-400">Free</th>
                  <th className="p-4 text-center font-semibold text-green-400">Growth</th>
                  <th className="p-4 text-center font-semibold text-purple-400">Unlimited</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE_ROWS.map((row, i) => (
                  <tr key={row.feature} className={i % 2 === 0 ? "bg-white/[0.02]" : ""}>
                    <td className="p-4 text-gray-300">{row.feature}</td>
                    <td className="p-4 text-center text-gray-500">{row.free}</td>
                    <td className="p-4 text-center text-gray-300">{row.growth}</td>
                    <td className="p-4 text-center text-gray-300">{row.unlimited}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="text-center mt-10 space-y-3">
            <p className="text-gray-500 text-sm">
              Secure payments via Stripe Â· Cancel anytime Â· Prices in USD Â· Adjust by country
            </p>
            <p className="text-gray-600 text-xs">
              Real estate, healthcare, and premium industries are priced for higher-value businesses.
              Personal and standard businesses get lower rates.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
