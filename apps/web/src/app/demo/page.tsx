import Link from "next/link";
import { OnboardingDemo } from "@/components/OnboardingDemo";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Live Demo — WhatsApp AI Content Studio",
  description: "See how Myna creates viral reels in Hindi, Arabic, Tamil, Portuguese — all inside WhatsApp, in 15 seconds",
};

export default function DemoPage() {
  return (
    <main className="min-h-screen py-16 px-4">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 glass border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-bold text-lg">
            <span className="gradient-text">Myna</span>
            <span className="text-gray-500 font-normal text-sm ml-2">AI Content Studio</span>
          </Link>
          <Link
            href="/onboarding"
            className="bg-green-500 hover:bg-green-400 text-gray-950 font-semibold px-4 py-2 rounded-lg text-sm transition-colors">
            Get Started Free
          </Link>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto pt-16">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-full px-4 py-1.5 text-sm text-green-400 mb-6">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            Live Feature Demo
          </div>
          <h1 className="text-4xl md:text-5xl font-black mb-4">
            Everything Happens<br />
            <span className="gradient-text">on WhatsApp</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-md mx-auto">
            No dashboard. No app. Just send a message in <span className="text-white font-semibold">any language</span> — get viral content in 15 seconds.
          </p>
          {/* Language flags */}
          <div className="flex flex-wrap justify-center gap-2 mt-5">
            {[
              { flag: "🇮🇳", lang: "हिन्दी" },
              { flag: "🌙", lang: "العربية" },
              { flag: "🎬", lang: "தமிழ்" },
              { flag: "🇧🇷", lang: "Português" },
              { flag: "🇮🇩", lang: "Bahasa" },
              { flag: "🇪🇸", lang: "Español" },
              { flag: "🇫🇷", lang: "Français" },
              { flag: "🇧🇩", lang: "বাংলা" },
            ].map(({ flag, lang }) => (
              <span key={lang} className="glass text-xs px-2.5 py-1 rounded-full text-gray-300">
                {flag} {lang}
              </span>
            ))}
          </div>
        </div>

        {/* Demo */}
        <OnboardingDemo />

        {/* Feature highlights below phone */}
        <div className="mt-16 grid grid-cols-2 gap-4">
          {[
            { icon: "⚡", title: "15-second preview", desc: "480p preview sent instantly while 1080p renders in background" },
            { icon: "🆓", title: "Free AI models only", desc: "Gemini Flash + LLaMA 3.3 — zero paid API costs" },
            { icon: "🌍", title: "10 languages", desc: "Type HINDI, ARABIC, TAMIL — content switches instantly" },
            { icon: "📅", title: "30-day calendar", desc: "Send your website URL → full content plan generated" },
            { icon: "🎯", title: "25+ commands", desc: "BULK, QUOTE, THUMBNAIL, AD, EMAIL, HASHTAGS and more" },
            { icon: "🚀", title: "Auto-post", desc: "Approve in WhatsApp → posts to Instagram, TikTok, YouTube" },
          ].map(f => (
            <div key={f.title} className="glass rounded-xl p-4">
              <div className="text-2xl mb-2">{f.icon}</div>
              <div className="font-semibold text-sm mb-1">{f.title}</div>
              <div className="text-xs text-gray-400">{f.desc}</div>
            </div>
          ))}
        </div>

        {/* Language moat section */}
        <div className="mt-12 glass rounded-2xl p-6">
          <div className="text-center mb-5">
            <div className="text-2xl mb-2">🌍</div>
            <h2 className="font-bold text-lg mb-1">Auto-Detects Your Language</h2>
            <p className="text-gray-400 text-sm">Type in Hindi, Arabic, Tamil, or Portuguese — Myna detects the script and switches automatically.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { lang: "Hindi", script: "\"मेरी बिरयानी viral करो\"", output: "#खाना #बिरयानी #viral", flag: "🇮🇳" },
              { lang: "Arabic", script: "\"AD رمضان خاص\"", output: "#رمضان #إفطار #حلال", flag: "🌙" },
              { lang: "Tamil", script: "\"இந்த சாப்பாட்டுக்கு caption\"", output: "#உணவு #சாப்பாடு #viral", flag: "🎬" },
              { lang: "Português", script: "\"BULK nova coleção\"", output: "#moda #brasil #viral", flag: "🇧🇷" },
            ].map(({ lang, script, output, flag }) => (
              <div key={lang} className="bg-white/5 rounded-xl p-3">
                <div className="text-xs text-gray-500 mb-1">{flag} {lang}</div>
                <div className="text-xs text-white font-mono mb-2 leading-relaxed opacity-80">{script}</div>
                <div className="text-[10px] text-green-400">{output}</div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <Link
            href="/onboarding"
            className="inline-block bg-green-500 hover:bg-green-400 text-gray-950 font-bold px-10 py-4 rounded-xl text-lg transition-all hover:scale-105 glow">
            Try It Free on WhatsApp →
          </Link>
          <p className="text-gray-600 text-sm mt-3">No credit card. Setup in 60 seconds.</p>
        </div>
      </div>
    </main>
  );
}
