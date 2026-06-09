import Link from "next/link";
import { OnboardingDemo } from "@/components/OnboardingDemo";
import { BusinessDemo } from "@/components/BusinessDemo";

const STATS = [
  { value: "60s", label: "Photo to viral reel" },
  { value: "18+", label: "Business types" },
  { value: "30", label: "Hashtags per post" },
  { value: "6", label: "Languages supported" },
];

const FEATURES = [
  {
    icon: "🎬",
    title: "Viral Reels in 60 Seconds",
    desc: "Send a photo or video. Get a script, AI voiceover, background music, captions, and 30 hashtags — all inside WhatsApp.",
  },
  {
    icon: "📦",
    title: "Full Content Kit (KIT command)",
    desc: "One command delivers: reel script · Instagram caption · story set (5 slides) · WhatsApp broadcast · DM script · LinkedIn post · portal listing.",
  },
  {
    icon: "🌐",
    title: "Website → 30-Day Plan",
    desc: "Send your website URL. Get 10 reels, 20 posts, and a full content calendar — analysed from your actual business.",
  },
  {
    icon: "📋",
    title: "Portal-Ready Listings",
    desc: "Real estate, hotel, and business users get structured descriptions ready for MagicBricks, 99acres, Booking.com, and Google My Business.",
  },
  {
    icon: "🌍",
    title: "6 Languages, Auto-Detected",
    desc: "Type in Hindi, Arabic, Tamil, Portuguese, or English. Myna detects your script and generates everything in your language.",
  },
  {
    icon: "📅",
    title: "Auto-Schedule & Post",
    desc: "Approve a reel on WhatsApp and it automatically posts to Instagram, TikTok, YouTube, or Facebook — no dashboard needed.",
  },
];

const STEPS = [
  {
    num: "1",
    icon: "📲",
    title: "Start on WhatsApp",
    desc: "Message your Myna number to set up your workspace. Takes 60 seconds. No app download, no dashboard to learn.",
  },
  {
    num: "2",
    icon: "📸",
    title: "Send a Photo, Video, or Idea",
    desc: "A dish photo, a property listing, a product shot — or just type what you want. Myna understands context.",
  },
  {
    num: "3",
    icon: "⚡",
    title: "AI Creates Your Content",
    desc: "In 30–60 seconds you receive a full content kit: reel, caption, hashtags, story set, broadcast message, and more.",
  },
  {
    num: "4",
    icon: "✅",
    title: "Approve and It Auto-Posts",
    desc: "Tap Approve in WhatsApp. Your content posts to Instagram, TikTok, and YouTube automatically.",
  },
];

const WORKSPACES = [
  { icon: "🏠", label: "Real Estate" },
  { icon: "🍽", label: "Restaurant" },
  { icon: "💅", label: "Salon & Spa" },
  { icon: "📦", label: "E-commerce" },
  { icon: "💪", label: "Fitness & Gym" },
  { icon: "🏡", label: "Interior Design" },
  { icon: "🎓", label: "Education" },
  { icon: "🏨", label: "Hotel" },
  { icon: "🚗", label: "Automobile" },
  { icon: "🏥", label: "Healthcare" },
  { icon: "💍", label: "Jewelry" },
  { icon: "📸", label: "Photography" },
  { icon: "✈️", label: "Travel" },
  { icon: "🎬", label: "Creator" },
  { icon: "🎟", label: "Events" },
  { icon: "👔", label: "Fashion" },
  { icon: "💼", label: "Business" },
  { icon: "👤", label: "Personal" },
];

const FAQS = [
  {
    q: "Do I need to install an app?",
    a: "No. Myna runs entirely inside WhatsApp. You message your Myna number and everything happens in the chat — zero apps, zero dashboards.",
  },
  {
    q: "How long does it take to generate a reel?",
    a: "30–60 seconds from photo to preview video. You get a WhatsApp message with the reel, caption, and hashtags ready to review.",
  },
  {
    q: "Do I need to know anything about content creation?",
    a: "No. Just describe what you want to promote. Myna handles hooks, scripts, captions, hashtags, and even the video edit.",
  },
  {
    q: "What does the free plan include?",
    a: "One full video generation — reel, caption, story set, hashtags. With the Myna watermark. Enough to see the product work before you decide.",
  },
  {
    q: "How is pricing calculated?",
    a: "Based on your business type (Real Estate and Healthcare pay more than a Restaurant because the value is higher) and your country (PPP pricing — India pays less than UAE). Select your business on the pricing page to see your exact price.",
  },
  {
    q: "Does it work for businesses outside India?",
    a: "Yes. Myna works in any country where WhatsApp is available. Pricing adjusts automatically for your region. Language auto-detected from your first message.",
  },
  {
    q: "Can I post to Instagram, TikTok, and YouTube automatically?",
    a: "Yes. Connect your social accounts once through the web dashboard. After that, approve a reel on WhatsApp and it auto-posts to all connected platforms.",
  },
  {
    q: "Is the content legally safe? Will it make up fake information?",
    a: "Myna has built-in compliance checks. It never fabricates prices, health claims, or testimonials. Any uncertain detail is flagged as [SPECIFY: detail] for you to fill in.",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-x-hidden">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 glass border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="font-bold text-lg">
            <span className="gradient-text">Myna</span>
            <span className="text-gray-500 font-normal text-sm ml-2">AI Content Studio</span>
          </span>
          <div className="flex items-center gap-3">
            <Link href="/pricing" className="hidden sm:block text-sm text-gray-400 hover:text-white transition-colors">Pricing</Link>
            <Link href="/onboarding" className="bg-green-500 hover:bg-green-400 text-gray-950 font-semibold px-4 py-2 rounded-lg text-sm transition-colors">
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ──────────────────────────────────────────────────────── */}
      <section className="pt-32 pb-16 px-6 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-full px-4 py-1.5 text-sm text-green-400 mb-8">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            WhatsApp-Native AI Content Studio
          </div>
          <h1 className="text-5xl md:text-7xl font-black leading-[1.06] mb-6 tracking-tight">
            Turn Any Photo Into<br />
            <span className="gradient-text">Viral Content</span><br />
            via WhatsApp
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-4 leading-relaxed">
            Send a photo on WhatsApp. In 60 seconds you get a <strong className="text-white">viral reel, Instagram caption, 30 hashtags, story set, broadcast message, and listing description</strong> — ready to post.
          </p>
          <p className="text-gray-600 text-sm mb-10">
            No app to install. No dashboard to learn. Just WhatsApp.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/onboarding"
              className="bg-green-500 hover:bg-green-400 text-gray-950 font-bold px-8 py-4 rounded-xl text-lg transition-all hover:scale-105 glow flex items-center justify-center gap-2">
              <span>Start Free on WhatsApp</span>
              <span>→</span>
            </Link>
            <a href="#how-it-works"
              className="glass hover:bg-white/10 px-8 py-4 rounded-xl text-lg transition-colors flex items-center justify-center gap-2">
              <span>See How It Works</span>
            </a>
          </div>
          <p className="text-gray-600 text-xs mt-5">Free plan included · No credit card · Works in 6 languages</p>
        </div>
      </section>

      {/* ── STATS ─────────────────────────────────────────────────────── */}
      <section className="py-10 px-6 border-y border-white/5">
        <div className="max-w-3xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {STATS.map(s => (
            <div key={s.label}>
              <div className="text-3xl md:text-4xl font-black gradient-text">{s.value}</div>
              <div className="text-gray-500 text-sm mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── LIVE DEMO ─────────────────────────────────────────────────── */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-full px-4 py-1.5 text-sm text-green-400 mb-4">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              Live Demo
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-3">Watch It Happen in Real Time</h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              This is a live simulation of actual Myna conversations — including multilingual support, KIT commands, and content matrix generation.
            </p>
          </div>
          <OnboardingDemo />
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-bold mb-3">How It Works</h2>
            <p className="text-gray-400">Four steps. Everything on WhatsApp. Zero learning curve.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map((step, i) => (
              <div key={step.num} className="relative">
                {i < STEPS.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-full w-full h-px border-t border-dashed border-white/10 z-0" style={{ width: "calc(100% - 3rem)", left: "calc(100% - 1rem)" }} />
                )}
                <div className="glass rounded-2xl p-6 relative z-10 h-full">
                  <div className="text-2xl mb-3">{step.icon}</div>
                  <div className="text-xs font-bold text-gray-600 mb-1.5 tracking-wider">STEP {step.num}</div>
                  <h3 className="font-bold mb-2 text-white">{step.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BUSINESS DEMOS ────────────────────────────────────────────── */}
      <section className="py-20 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-3">Built for Your Industry</h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              Select your business type and watch a live simulation of exactly what Myna delivers — specific to your industry, your content, your commands.
            </p>
          </div>
          <BusinessDemo />
        </div>
      </section>

      {/* ── FEATURES GRID ─────────────────────────────────────────────── */}
      <section className="py-20 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-3">Everything in One WhatsApp Chat</h2>
            <p className="text-gray-400">No juggling between Canva, ChatGPT, CapCut, and schedulers. One bot does it all.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map(f => (
              <div key={f.title} className="glass rounded-2xl p-6 border border-white/10 hover:border-green-500/20 transition-colors">
                <div className="text-3xl mb-3">{f.icon}</div>
                <h3 className="font-bold mb-2">{f.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WORKSPACE GRID ────────────────────────────────────────────── */}
      <section className="py-16 px-6 border-t border-white/5">
        <div className="max-w-4xl mx-auto text-center mb-10">
          <h2 className="text-3xl font-bold mb-3">18 Business Types, One Bot</h2>
          <p className="text-gray-400">
            Every template, hook, and content format is calibrated for your specific industry — not generic.
          </p>
        </div>
        <div className="max-w-4xl mx-auto grid grid-cols-3 sm:grid-cols-6 gap-3">
          {WORKSPACES.map(ws => (
            <div key={ws.label} className="glass rounded-xl p-3 text-center hover:bg-white/8 transition-colors">
              <div className="text-2xl mb-1">{ws.icon}</div>
              <div className="text-[10px] text-gray-400 font-medium leading-tight">{ws.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CONTENT MATRIX HIGHLIGHT ──────────────────────────────────── */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="glass rounded-3xl p-10 md:p-14 border border-white/10 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-transparent pointer-events-none" />
            <div className="relative grid md:grid-cols-2 gap-10 items-center">
              <div>
                <div className="text-4xl mb-4">🌐</div>
                <h2 className="text-3xl font-bold mb-4">Send Your Website URL → Get a 30-Day Content Plan</h2>
                <p className="text-gray-400 leading-relaxed mb-6">
                  Myna scrapes your website, understands your business, and generates a complete Content Matrix: 10 reels, 20 posts, and a full 30-day posting calendar — in about 60 seconds.
                </p>
                <ul className="space-y-2 text-sm text-gray-300">
                  {["10 reel scripts with hooks", "20 post captions", "30-day posting calendar", "Platform-specific copy (Instagram, LinkedIn, WhatsApp)"].map(f => (
                    <li key={f} className="flex items-center gap-2.5">
                      <span className="text-green-400">✓</span> {f}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="glass rounded-2xl p-5 border border-white/10 font-mono text-sm space-y-2">
                <div className="text-green-400">You → Myna</div>
                <div className="text-gray-300 pl-3">https://myrestaurant.com</div>
                <div className="text-gray-500 text-xs mt-3">60 seconds later...</div>
                <div className="text-blue-400 mt-2">Myna →</div>
                <div className="text-gray-300 pl-3 space-y-1 text-xs leading-relaxed">
                  <div>✅ <strong>Content Matrix ready!</strong></div>
                  <div className="text-gray-500 mt-1">📅 Week 1:</div>
                  <div>• Mon — Behind the kitchen (Reel)</div>
                  <div>• Wed — Chef's secret ingredient (Post)</div>
                  <div>• Fri — Weekend special reveal (Reel)</div>
                  <div className="text-gray-600 mt-1">...28 more days of content</div>
                  <div className="text-green-400 mt-1">🔥 10 reels + 20 posts total</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── COMPLIANCE & SAFETY ───────────────────────────────────────── */}
      <section className="py-16 px-6 border-t border-white/5">
        <div className="max-w-4xl mx-auto glass rounded-2xl p-8 border border-white/10">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-2xl font-bold mb-4">Safe, Honest Content — Always</h2>
              <p className="text-gray-400 text-sm leading-relaxed mb-4">
                Myna never fabricates prices, testimonials, or health claims. Anything it doesn't know is flagged as <code className="bg-white/5 px-1.5 py-0.5 rounded text-amber-400">[SPECIFY: detail]</code> so you fill in the real facts.
              </p>
              <p className="text-gray-500 text-sm">
                Real Estate listings end with "Subject to verification. Contact agent for current details."
                Healthcare posts never make medical claims.
              </p>
            </div>
            <div className="space-y-3">
              {[
                { icon: "🚫", text: "Never fabricates prices or numbers" },
                { icon: "🚫", text: "Never writes fake testimonials" },
                { icon: "🚫", text: "Never makes health or legal claims" },
                { icon: "✅", text: "Flags unknowns as [SPECIFY: detail]" },
                { icon: "✅", text: "Adds verification disclaimer on listings" },
                { icon: "✅", text: "Content moderation on all media uploads" },
              ].map(r => (
                <div key={r.text} className="flex items-center gap-3 text-sm text-gray-300">
                  <span>{r.icon}</span>
                  <span>{r.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING TEASER ────────────────────────────────────────────── */}
      <section className="py-20 px-6 border-t border-white/5">
        <div className="max-w-4xl mx-auto text-center mb-12">
          <h2 className="text-4xl font-bold mb-3">Simple Pricing</h2>
          <p className="text-gray-400 max-w-xl mx-auto">
            Start free. Upgrade when you're ready. Prices adjust for your country and business type — a real estate agency pays more than a restaurant because the value delivered is higher.
          </p>
        </div>
        <div className="max-w-3xl mx-auto grid md:grid-cols-3 gap-6">
          {[
            {
              name: "Free",
              price: "$0",
              period: "forever",
              desc: "Try it out",
              features: ["1 video generation", "Myna watermark", "Full content kit preview"],
              cta: "Start Free",
              href: "/onboarding",
              highlight: false,
            },
            {
              name: "Growth",
              price: "from $19",
              period: "/ month",
              desc: "For active businesses",
              features: ["30 videos/month", "No watermark", "All commands + KIT", "Auto-scheduling"],
              cta: "See Your Price",
              href: "/pricing",
              highlight: true,
            },
            {
              name: "Unlimited",
              price: "from $49",
              period: "/ month",
              desc: "For agencies & power users",
              features: ["Unlimited videos", "Priority queue", "All Growth features", "Bulk generation"],
              cta: "See Your Price",
              href: "/pricing",
              highlight: false,
            },
          ].map(p => (
            <div key={p.name} className={`glass rounded-2xl p-6 border ${p.highlight ? "border-green-500/40" : "border-white/10"} ${p.highlight ? "glow" : ""}`}>
              {p.highlight && <div className="text-xs font-bold text-green-400 mb-2 uppercase tracking-wider">Most Popular</div>}
              <h3 className="font-bold text-lg">{p.name}</h3>
              <div className="flex items-baseline gap-1 my-2">
                <span className="text-2xl font-black">{p.price}</span>
                <span className="text-gray-500 text-sm">{p.period}</span>
              </div>
              <p className="text-xs text-gray-500 mb-4">{p.desc}</p>
              <ul className="space-y-1.5 mb-6">
                {p.features.map(f => (
                  <li key={f} className="text-sm text-gray-300 flex items-center gap-2">
                    <span className="text-green-400">✓</span> {f}
                  </li>
                ))}
              </ul>
              <Link href={p.href}
                className={`block text-center py-2.5 rounded-xl text-sm font-semibold transition-colors ${p.highlight ? "bg-green-500 hover:bg-green-400 text-gray-950" : "border border-white/20 hover:border-white/40"}`}>
                {p.cta}
              </Link>
            </div>
          ))}
        </div>
        <p className="text-center text-gray-600 text-xs mt-6">
          Prices shown are for standard businesses. Real Estate, Healthcare, and Hotel pay more. See exact pricing →{" "}
          <Link href="/pricing" className="text-green-500 hover:text-green-400">/pricing</Link>
        </p>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────────── */}
      <section className="py-20 px-6 border-t border-white/5">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {FAQS.map(faq => (
              <div key={faq.q} className="glass rounded-xl p-5 border border-white/10">
                <h3 className="font-semibold text-white mb-2">{faq.q}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ─────────────────────────────────────────────────── */}
      <section className="py-24 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <div className="text-6xl mb-6">📱</div>
          <h2 className="text-4xl md:text-5xl font-black mb-4 leading-tight">
            Your next viral post<br />starts with one photo.
          </h2>
          <p className="text-gray-400 mb-10 text-lg">
            Open WhatsApp. Message your Myna number. Done in 60 seconds.
          </p>
          <Link href="/onboarding"
            className="inline-flex items-center gap-3 bg-green-500 hover:bg-green-400 text-gray-950 font-bold px-10 py-5 rounded-xl text-xl transition-all hover:scale-105 glow">
            <span>Get Started Free</span>
            <span>→</span>
          </Link>
          <p className="text-gray-600 text-sm mt-5">No credit card · Free plan included · Works in any country</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-10 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-gray-500 text-sm">
            © 2026 WhatsApp AI Content Studio (Myna). Built for creators & businesses worldwide.
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-600">
            <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
            <Link href="/onboarding" className="hover:text-white transition-colors">Get Started</Link>
            <Link href="/admin/login" className="hover:text-white transition-colors">Admin</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
