"use client";

import { useEffect, useState, useRef } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type WaMsg = {
  id: number;
  from: "bot" | "user";
  type: "text" | "image" | "video" | "buttons" | "audio";
  text?: string;
  buttons?: string[];
  highlight?: boolean;
};

// ─── Scenario definitions ─────────────────────────────────────────────────────

const SCENARIOS: Array<{
  title: string;
  emoji: string;
  tag: string;
  color: string;
  messages: Omit<WaMsg, "id">[];
}> = [
  {
    title: "Send a photo → get a viral reel",
    emoji: "📸",
    tag: "Photo to Reel",
    color: "#22c55e",
    messages: [
      { from: "user", type: "image", text: "biryani.jpg" },
      { from: "bot", type: "text", text: "🔍 Analyzing your photo..." },
      { from: "bot", type: "text", text: '⚡ Generating viral reel with music...\n\n⏳ Preview in ~15 seconds' },
      { from: "bot", type: "video" },
      { from: "bot", type: "text", text: '📝 Caption:\n"This biryani is made from a 100-year-old secret recipe. One bite and you\'ll understand why we\'re always sold out! 🔥"\n\n#biryani #foodporn #viral' },
      { from: "bot", type: "buttons", text: "How do you want to proceed?", buttons: ["👍 Approve & Post", "🔄 Regenerate", "🎨 Change Style"] },
    ],
  },
  {
    title: "Type a command → get ad copy",
    emoji: "🎯",
    tag: "Ad Copy",
    color: "#a855f7",
    messages: [
      { from: "user", type: "text", text: "AD Summer sale 40% off all dresses" },
      { from: "bot", type: "text", text: "🎯 Writing your ad copy in 3 variants..." },
      { from: "bot", type: "text", text: "🎯 Ad Copy — 3 Variants:\n\n📱 Short:\nDresses up to 40% off! ☀️\nShop now before it's gone.\n👉 Tap to grab your deal\n\n📰 Medium:\nSummer Sale is LIVE! Get premium dresses at 40% off. Limited stock — don't wait!\n👉 Shop the collection now\n\n📄 Long (Traffic):\nYour wardrobe refresh starts here. This summer, we're making style affordable — 40% off our most-loved dresses, today only." },
    ],
  },
  {
    title: "Send URL → get 30-day plan",
    emoji: "🌐",
    tag: "Content Matrix",
    color: "#f59e0b",
    messages: [
      { from: "user", type: "text", text: "https://myrestaurant.com" },
      { from: "bot", type: "text", text: "🌐 Analyzing myrestaurant.com...\n\nThis takes ~60 seconds.\n\nGenerating:\n• 10 Reels\n• 20 Posts\n• 30-day calendar" },
      { from: "bot", type: "text", text: "✅ Content Matrix ready!\n\n📅 Week 1:\n• Mon — Behind the kitchen (Reel)\n• Wed — Chef's secret ingredient (Post)\n• Fri — Weekend special reveal (Reel)\n\n📅 Week 2:\n• Tue — Customer story (Post)\n• Thu — Recipe teaser (Reel)\n\n🔥 10 reels + 20 posts total!" },
    ],
  },
  {
    title: "Voice note → full transcript + reel",
    emoji: "🎤",
    tag: "Voice Note",
    color: "#06b6d4",
    messages: [
      { from: "user", type: "audio" },
      { from: "bot", type: "text", text: "🎤 Transcribing your voice note..." },
      { from: "bot", type: "text", text: '📝 Transcript:\n"We just launched our new summer menu with 5 brand new dishes inspired by coastal flavors..."\n\n✨ Generating reel from your voice!' },
      { from: "bot", type: "video" },
      { from: "bot", type: "buttons", text: "Your voice reel is ready! 🎬", buttons: ["👍 Post to Instagram", "📥 Download", "🔄 Try Again"] },
    ],
  },
  {
    title: "CALENDAR → 7-day content plan",
    emoji: "📅",
    tag: "Calendar",
    color: "#f43f5e",
    messages: [
      { from: "user", type: "text", text: "CALENDAR" },
      { from: "bot", type: "text", text: "📅 Building your 7-day content calendar..." },
      { from: "bot", type: "text", text: "📅 This Week: Showcase Your Story\n\nMonday — Behind-the-scenes reel\n_\"How we prepare 500 biryanis daily\"_\n📌 Process video (8pm)\n\nTuesday — Customer spotlight post\n_\"Meet our 1000th customer!\"_\n📌 Photo + caption (12pm)\n\nWednesday — Recipe reel\n_\"3 ingredients that make our curry special\"_\n📌 Short reel (7pm)\n\n...and 4 more days!\n\n💡 Tip: Post Reels between 6–9pm for maximum reach." },
    ],
  },

  // ── Language demos ────────────────────────────────────────────────────────────

  {
    title: "Hindi auto-detected → viral Hindi reel",
    emoji: "🇮🇳",
    tag: "हिन्दी",
    color: "#f97316",
    messages: [
      { from: "user", type: "image", text: "biryani_special.jpg" },
      { from: "user", type: "text", text: "मेरी नई बिरयानी के लिए viral content बनाओ!" },
      { from: "bot", type: "text", text: "🌍 Hindi script detected!\nक्या सारा content हिंदी में बनाऊं?\n\nDetected: हिन्दी (Devanagari)" },
      { from: "bot", type: "buttons", text: "Language preference:", buttons: ["✅ हाँ, हिंदी में", "🇬🇧 Keep English"] },
      { from: "user", type: "text", text: "✅ हाँ, हिंदी में" },
      { from: "bot", type: "text", text: "🙏 नमस्ते! Content अब हिंदी में बनेगा।\n\n⚡ Viral reel generating..." },
      { from: "bot", type: "video" },
      { from: "bot", type: "text", text: "🪝 Hook:\n\"100 साल पुरानी रेसिपी से बनी बिरयानी — एक बाइट और समझ जाएंगे क्यों हम हमेशा sold out रहते हैं! 🔥\"\n\n📝 Caption:\nये बिरयानी सिर्फ खाना नहीं, एक experience है। दादी की रेसिपी, आज का ज़ायका। 🍛✨\n\n#️⃣ #खाना #बिरयानी #खानाखज़ाना #viral #foodie #देसीखाना" },
    ],
  },

  {
    title: "Arabic Ramadan ad → RTL Arabic copy",
    emoji: "🌙",
    tag: "العربية",
    color: "#8b5cf6",
    messages: [
      { from: "user", type: "text", text: "AD رمضان خاص: إفطار للعائلة" },
      { from: "bot", type: "text", text: "🎯 Writing Ramadan ad in Arabic (RTL)...\n\nبالعربية — ماشاء الله!" },
      { from: "bot", type: "text", text: "🎯 إعلان رمضان — 3 نسخ:\n\n📱 قصير:\nإفطار رمضان المميز 🌙\nوجبة العائلة الكاملة بأسعار خاصة.\n👉 احجز طاولتك الآن\n\n📰 متوسط:\nهذا رمضان، اجمع عائلتك على أشهى مائدة إفطار. بيريانى، كباب، حلويات شرقية — كل شيء حلال وطازج.\n👉 احجز قبل نفاد الماكن\n\n💡 وسوم:\n#رمضان #إفطار #حلال #مطعم #عائلة #وقت_الطعام" },
      { from: "bot", type: "buttons", text: "اختر النسخة المناسبة:", buttons: ["✅ نشر الآن", "🔄 إعادة توليد", "📥 تحميل"] },
    ],
  },

  {
    title: "Tamil photo → Kollywood-style reel",
    emoji: "🎬",
    tag: "தமிழ்",
    color: "#ec4899",
    messages: [
      { from: "user", type: "image", text: "saapadu.jpg" },
      { from: "user", type: "text", text: "இந்த உணவுக்கு viral caption வேண்டும்!" },
      { from: "bot", type: "text", text: "🙏 Tamil script detected!\nவணக்கம்! Content தமிழில் generate பண்ணட்டுமா?\n\nDetected: தமிழ் (Tamil script)" },
      { from: "bot", type: "buttons", text: "மொழி தேர்வு:", buttons: ["✅ ஆம், தமிழில்", "🇬🇧 Keep English"] },
      { from: "user", type: "text", text: "✅ ஆம், தமிழில்" },
      { from: "bot", type: "video" },
      { from: "bot", type: "text", text: "🪝 Hook:\n\"ஒரு வாய் சாப்பிட்டால் திரும்ப வர தோணும் — அது தான் எங்க சமையல் ரகசியம்! 🍛🔥\"\n\n📝 Caption:\nசென்னையின் சுவை இங்கே தான் இருக்கு! நாட்டுக்கோழி குழம்பு, சுடச்சுட சாதம், நெய் — perfect combo.\n\n#️⃣ #உணவு #சாப்பாடு #சென்னை #தமிழ்சுவை #viral #kollywood" },
    ],
  },

  {
    title: "Português → conteúdo viral brasileiro",
    emoji: "🇧🇷",
    tag: "Português",
    color: "#10b981",
    messages: [
      { from: "user", type: "text", text: "BULK nova coleção de verão" },
      { from: "bot", type: "text", text: "🎬 Gerando 3 variações de conteúdo em Português...\n\n⏳ Aguarde ~45 segundos" },
      { from: "bot", type: "video" },
      { from: "bot", type: "text", text: "🎬 Variação 1/3:\n\n🪝 Hook:\n\"Essa coleção de verão vai deixar você sem ar! ☀️🔥\"\n\n📝 Caption:\nVerão chegou e a gente não tá pra brincadeira! Nova coleção com peças que você vai amar — cores vibrantes, qualidade top, preço que cabe no bolso. 🌊✨\n\n#️⃣ #moda #verão #brasil #viral #fyp #tendência #compras" },
      { from: "bot", type: "text", text: "🎬 Variação 2/3 chegando...\n\n🪝 \"POV: você acabou de encontrar a roupa perfeita pro verão 🌴\"\n\n🎬 Variação 3/3:\n🪝 \"Aprovado até pela sua melhor amiga! ✅\"\n\n💡 Dica: poste entre 18h–21h para maior alcance no Brasil!" },
    ],
  },
];

// ─── Phone Frame ──────────────────────────────────────────────────────────────

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative" style={{ width: 280 }}>
      <div
        className="relative rounded-[3rem] p-3"
        style={{
          background: "linear-gradient(145deg, #1a1a1a, #0a0a0a)",
          boxShadow: "0 0 0 1px #333, 0 0 0 3px #111, 0 50px 100px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.08)",
        }}>
        {/* Camera notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-7 rounded-b-3xl z-20 flex items-center justify-center gap-2"
          style={{ background: "#0a0a0a" }}>
          <div className="w-2.5 h-2.5 rounded-full bg-gray-800 ring-1 ring-gray-700" />
          <div className="w-1.5 h-1.5 rounded-full bg-gray-700" />
        </div>
        {/* Screen */}
        <div className="rounded-[2.4rem] overflow-hidden" style={{ height: 560, background: "#111b21" }}>
          {children}
        </div>
        {/* Home indicator */}
        <div className="mx-auto mt-2 w-16 h-1 rounded-full bg-gray-700" />
      </div>
      {/* Side buttons */}
      <div className="absolute right-0 top-28 w-[3px] h-14 rounded-l-sm" style={{ background: "#222" }} />
      <div className="absolute left-0 top-24 w-[3px] h-10 rounded-r-sm" style={{ background: "#222" }} />
      <div className="absolute left-0 top-36 w-[3px] h-10 rounded-r-sm" style={{ background: "#222" }} />
    </div>
  );
}

// ─── WhatsApp Interface ───────────────────────────────────────────────────────

function WhatsAppUI({
  messages,
  showTyping,
  scenario,
}: {
  messages: WaMsg[];
  showTyping: boolean;
  scenario: (typeof SCENARIOS)[number];
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages, showTyping]);

  return (
    <div className="h-full flex flex-col" style={{ background: "#111b21" }}>
      {/* Status bar */}
      <div className="flex items-center justify-between px-5 pt-8 pb-1.5 text-[10px] text-gray-400"
        style={{ background: "#1f2c33" }}>
        <span className="font-medium">9:41</span>
        <div className="flex items-center gap-1.5">
          <span>▐▐▐▐</span>
          <span className="text-xs">📶</span>
          <span>🔋</span>
        </div>
      </div>

      {/* WhatsApp Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b"
        style={{ background: "#1f2c33", borderColor: "rgba(255,255,255,0.05)" }}>
        <button className="text-gray-400 text-sm mr-1">←</button>
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-base"
          style={{ background: "linear-gradient(135deg, #25d366, #128c7e)" }}>
          🤖
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-white text-[13px] font-semibold leading-none">Myna AI Studio</div>
          <div className="text-[10px] mt-0.5" style={{ color: "#25d366" }}>● online</div>
        </div>
        <div className="flex gap-3 text-gray-400 text-base">
          <span>📹</span>
          <span>☎</span>
          <span>⋮</span>
        </div>
      </div>

      {/* Scenario tag */}
      <div className="flex justify-center py-2">
        <span className="text-[9px] font-semibold px-3 py-1 rounded-full"
          style={{ background: `${scenario.color}20`, color: scenario.color, border: `1px solid ${scenario.color}30` }}>
          {scenario.emoji} {scenario.tag}
        </span>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 pb-2 space-y-2"
        style={{
          background: `radial-gradient(ellipse at 50% 0%, ${scenario.color}08 0%, transparent 60%), #0d1418`,
        }}>
        {messages.map(msg => (
          <div key={msg.id}
            className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"}`}
            style={{ animation: "msg-appear 0.2s ease-out" }}>
            {msg.type === "image" ? (
              <div className="rounded-xl overflow-hidden flex flex-col items-center justify-center gap-1.5"
                style={{ background: "#1f2c33", width: 140, height: 105, boxShadow: "0 2px 8px rgba(0,0,0,0.4)" }}>
                <span className="text-3xl">📸</span>
                <span className="text-[9px] text-gray-500">{msg.text}</span>
                <div className="flex items-center gap-1">
                  <div className="w-1 h-1 rounded-full" style={{ background: scenario.color }} />
                  <span className="text-[9px] text-gray-500">Sent</span>
                </div>
              </div>
            ) : msg.type === "audio" ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{ background: "#005c4b", minWidth: 150, boxShadow: "0 2px 8px rgba(0,0,0,0.3)" }}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm"
                  style={{ background: "rgba(255,255,255,0.15)" }}>
                  🎤
                </div>
                <div className="flex-1">
                  <div className="flex gap-0.5 items-end h-4">
                    {[3, 6, 4, 8, 5, 7, 3, 6, 4, 5, 8, 3].map((h, i) => (
                      <div key={i} className="w-0.5 rounded-sm" style={{ height: h, background: "rgba(255,255,255,0.5)" }} />
                    ))}
                  </div>
                  <div className="text-[9px] text-green-300/70 mt-0.5">0:12</div>
                </div>
              </div>
            ) : msg.type === "video" ? (
              <div className="rounded-xl overflow-hidden relative"
                style={{ background: "linear-gradient(135deg, #1a2830, #0d1b24)", width: 150, height: 110, boxShadow: "0 4px 16px rgba(0,0,0,0.5)" }}>
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-base"
                    style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(4px)" }}>
                    ▶
                  </div>
                  <span className="text-[9px] text-gray-400">preview.mp4 · 0:15</span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-0.5"
                  style={{ background: `linear-gradient(to right, ${scenario.color}, transparent)`, width: "65%" }} />
              </div>
            ) : msg.type === "buttons" ? (
              <div className="rounded-xl overflow-hidden" style={{ maxWidth: 200 }}>
                <div className="px-3 py-2 text-[11px] text-gray-200 leading-relaxed"
                  style={{ background: "#1f2c33" }}>
                  {msg.text}
                </div>
                <div style={{ background: "#253340" }}>
                  {msg.buttons?.map((btn, i) => (
                    <div key={i}
                      className="px-3 py-2 text-center text-[11px] font-medium border-t first:border-t-0 transition-all"
                      style={{
                        borderColor: "rgba(255,255,255,0.06)",
                        color: i === 0 ? scenario.color : "#53bdeb",
                        background: i === 0 ? `${scenario.color}10` : "transparent",
                      }}>
                      {btn}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div
                className="px-3 py-2 text-[11px] leading-[1.45] whitespace-pre-line"
                style={{
                  maxWidth: 200,
                  background: msg.from === "bot" ? "#1f2c33" : "#005c4b",
                  color: "rgba(255,255,255,0.9)",
                  borderRadius: msg.from === "bot" ? "3px 14px 14px 14px" : "14px 3px 14px 14px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                }}>
                {msg.text}
                <span className="block text-[8px] text-right mt-1 opacity-40">
                  {msg.from === "bot" ? "9:41" : "9:40"} {msg.from === "bot" ? "✓✓" : ""}
                </span>
              </div>
            )}
          </div>
        ))}

        {/* Typing dots */}
        {showTyping && (
          <div className="flex justify-start" style={{ animation: "msg-appear 0.15s ease-out" }}>
            <div className="px-3 py-2.5 rounded-xl rounded-tl-sm flex gap-1 items-center"
              style={{ background: "#1f2c33" }}>
              {[0, 0.25, 0.5].map((delay, i) => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-gray-400"
                  style={{ animation: `typing-dot 1.1s infinite ${delay}s` }} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Input bar */}
      <div className="flex items-center gap-2 px-2 py-2.5"
        style={{ background: "#1f2c33", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="text-gray-400 text-base px-1">😊</div>
        <div className="flex-1 rounded-full px-3 py-1.5 text-[11px] text-gray-500"
          style={{ background: "#2a3942" }}>
          Message
        </div>
        <div className="text-gray-400 text-base">📎</div>
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
          style={{ background: "#25d366" }}>
          🎤
        </div>
      </div>
    </div>
  );
}

// ─── Main exported component ──────────────────────────────────────────────────

export function OnboardingDemo() {
  const [scenarioIdx, setScenarioIdx] = useState(0);
  const [messages, setMessages] = useState<WaMsg[]>([]);
  const [showTyping, setShowTyping] = useState(false);
  const mountedRef = useRef(true);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const scenario = SCENARIOS[scenarioIdx];

  function clearAll() {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }

  function addTimer(delay: number, fn: () => void) {
    const id = setTimeout(() => { if (mountedRef.current) fn(); }, delay);
    timersRef.current.push(id);
  }

  function runScenario(idx: number) {
    clearAll();
    setMessages([]);
    setShowTyping(false);
    setScenarioIdx(idx);

    const sc = SCENARIOS[idx];
    let t = 600;
    let msgId = 0;

    const showMsg = (msg: Omit<WaMsg, "id">, typingMs = 700) => {
      if (msg.from === "bot") {
        // Show typing first
        addTimer(t, () => setShowTyping(true));
        t += typingMs;
        addTimer(t, () => {
          setShowTyping(false);
          setMessages(prev => [...prev, { id: msgId++, ...msg } as WaMsg]);
        });
        t += 200;
      } else {
        addTimer(t, () => {
          setMessages(prev => [...prev, { id: msgId++, ...msg } as WaMsg]);
        });
        t += 600;
      }
    };

    for (const msg of sc.messages) {
      const len = msg.text?.length || 0;
      const typingTime = msg.type === "buttons" ? 400 :
        msg.type === "video" ? 1200 :
        len > 250 ? 1400 :
        len > 100 ? 950 : 650;
      showMsg(msg, typingTime);
      // slightly longer pause after user messages that trigger detection
      t += msg.from === "user" ? 500 : 250;
    }

    // Move to next scenario after pause
    t += 3000;
    addTimer(t, () => {
      runScenario((idx + 1) % SCENARIOS.length);
    });
  }

  useEffect(() => {
    mountedRef.current = true;
    runScenario(0);
    return () => {
      mountedRef.current = false;
      clearAll();
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Scenario tabs */}
      <div className="flex flex-wrap justify-center gap-2 max-w-xl px-4">
        {SCENARIOS.map((sc, i) => (
          <button
            key={i}
            onClick={() => runScenario(i)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300"
            style={{
              background: scenarioIdx === i ? `${sc.color}20` : "rgba(255,255,255,0.05)",
              color: scenarioIdx === i ? sc.color : "rgba(255,255,255,0.4)",
              border: `1px solid ${scenarioIdx === i ? sc.color + "40" : "rgba(255,255,255,0.08)"}`,
              transform: scenarioIdx === i ? "scale(1.05)" : "scale(1)",
            }}>
            <span>{sc.emoji}</span>
            <span>{sc.tag}</span>
          </button>
        ))}
      </div>

      {/* Phone */}
      <div className="relative">
        {/* Glow behind phone */}
        <div
          className="absolute inset-0 blur-3xl rounded-full transition-colors duration-1000"
          style={{ background: `${scenario.color}20`, transform: "scale(0.8) translateY(10%)" }}
        />
        <PhoneFrame>
          <WhatsAppUI
            messages={messages}
            showTyping={showTyping}
            scenario={scenario}
          />
        </PhoneFrame>
      </div>

      {/* Current scenario label */}
      <div className="text-center">
        <p className="text-gray-300 text-sm font-medium">{scenario.emoji} {scenario.title}</p>
        <div className="flex justify-center gap-1.5 mt-2">
          {SCENARIOS.map((_, i) => (
            <div
              key={i}
              className="h-1 rounded-full transition-all duration-500"
              style={{
                width: scenarioIdx === i ? 20 : 6,
                background: scenarioIdx === i ? scenario.color : "rgba(255,255,255,0.15)",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
