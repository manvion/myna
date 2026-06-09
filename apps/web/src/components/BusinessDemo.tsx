"use client";

import { useEffect, useRef, useState } from "react";

type WaMsg = { id: number; from: "bot" | "user"; type: "text" | "image" | "video" | "buttons" | "audio"; text?: string; buttons?: string[] };

const BUSINESSES: Array<{
  id: string;
  icon: string;
  label: string;
  tagline: string;
  color: string;
  command: string;
  commandLabel: string;
  messages: Omit<WaMsg, "id">[];
  results: string[];
}> = [
  {
    id: "real_estate",
    icon: "🏠",
    label: "Real Estate",
    tagline: "Property photo → viral tour reel + portal listing + open house broadcast in 30 seconds",
    color: "#f59e0b",
    command: "📸 Photo of the sea-view living room",
    commandLabel: "Photo",
    messages: [
      { from: "user", type: "image", text: "juhu_seaview_living.jpg" },
      { from: "user", type: "text", text: "3BHK sea-view, Juhu, ₹6.5Cr, private pool, open house this Saturday 11am–2pm" },
      { from: "bot", type: "text", text: "🏠 *Analyzing your listing photo...*\n\n📸 Detected: luxury living room · sea view · natural light · premium finishes\n\n⚡ Generating: property tour reel · caption · portal listing · open house broadcast\n\n~20 seconds." },
      { from: "bot", type: "video" },
      { from: "bot", type: "text", text: "🪝 *Reel Hook:*\n\"₹6.5Cr for a Juhu sea-view with a private pool? Here's why this sells in days, not weeks...\"\n\n📝 *Caption:*\nWaking up to the Arabian Sea every morning isn't a dream — it's 3BHK in Juhu.\n\n🌊 Unobstructed sea view\n🏊 Private pool\n🛏 3 Bedrooms, 3 Baths\n💰 ₹6.5 Cr\n🗓 Open House: Sat 11am–2pm\n\n#JuhuProperty #MumbaiRealestate #SeaViewHome #LuxuryLiving #PropertyTour #OpenHouse" },
      { from: "bot", type: "text", text: "📋 *Portal Listing (MagicBricks / 99acres ready):*\n\nPremium 3BHK sea-facing residence in Juhu's most sought-after address. Features include private pool, panoramic Arabian Sea views, and high-end finishes.\n\n✅ 3 Bed · 3 Bath\n✅ Private Pool\n✅ Unobstructed Sea View\n✅ [SPECIFY: carpet area] sq ft\n✅ [SPECIFY: building & floor]\n✅ [SPECIFY: possession/OC status]\n\n⚠️ All details to be verified by buyer. Prices subject to change. Agent licence: [SPECIFY]." },
      { from: "bot", type: "buttons", text: "Your property kit is ready! 🏠", buttons: ["📲 Post reel to Instagram", "📢 Open house broadcast", "📋 Copy portal listing"] },
    ],
    results: ["60-sec property tour reel", "Caption + 30 hashtags", "Portal-ready listing", "Open house broadcast", "Story set (5 slides)", "Photo shot list"],
  },
  {
    id: "restaurant",
    icon: "🍽",
    label: "Restaurant",
    tagline: "Send a dish photo → get viral reel + menu copy + broadcast in seconds",
    color: "#ef4444",
    command: "Photo of signature biryani",
    commandLabel: "Photo",
    messages: [
      { from: "user", type: "image", text: "biryani_special.jpg" },
      { from: "bot", type: "text", text: "🔍 Analyzing your dish...\n\n⚡ Generating viral food reel with trending hooks..." },
      { from: "bot", type: "video" },
      { from: "bot", type: "text", text: "🪝 Hook:\n\"This biryani is made from a 100-year-old family recipe. One bite and you'll understand why we're always sold out. 🔥\"\n\n📝 Caption:\nDum-cooked for 4 hours. Every grain tells a story. Our Signature Biryani — available Friday to Sunday only.\n\n📞 Reserve your plate: [SPECIFY: number]\n\n#biryani #foodporn #mumbaifood #viral #reels" },
      { from: "bot", type: "buttons", text: "How do you want to proceed?", buttons: ["👍 Post to Instagram", "📢 WhatsApp Broadcast", "🔄 Regenerate"] },
    ],
    results: ["Viral reel (60 sec)", "Caption + hashtags", "Broadcast message", "Story set", "Menu description", "Delivery launch copy"],
  },
  {
    id: "salon",
    icon: "💅",
    label: "Salon & Spa",
    tagline: "Before/after → viral transformation reel + booking link in 30 seconds",
    color: "#ec4899",
    command: "TRANSFORMATION client before-after colour",
    commandLabel: "TRANSFORMATION",
    messages: [
      { from: "user", type: "image", text: "before_after_client.jpg" },
      { from: "user", type: "text", text: "TRANSFORMATION — balayage colour + blow dry" },
      { from: "bot", type: "text", text: "✨ Creating your *Transformation Reel*...\n\n⏳ Preview in ~15 seconds" },
      { from: "bot", type: "video" },
      { from: "bot", type: "text", text: "🪝 Hook:\n\"POV: you walked in wanting a change and walked out feeling like a completely different person ✨\"\n\n📝 Caption:\nBefore → After. Our signature balayage + blow dry. This is what confidence looks like.\n\n📅 Book your transformation:\n👉 [SPECIFY: booking link]\n\n#balayage #haircolor #transformation #salonlife #blowdry #hairgoals" },
      { from: "bot", type: "buttons", text: "Your transformation reel is ready! 💇‍♀️", buttons: ["👍 Post to Instagram", "📥 Download", "🔄 New Style"] },
    ],
    results: ["Transformation reel", "Before/after caption", "Booking CTA", "Story teaser", "Service menu post", "Testimonial reel"],
  },
  {
    id: "ecommerce",
    icon: "📦",
    label: "E-commerce",
    tagline: "Product photo → viral drop announcement + 3 ad variants in 30 seconds",
    color: "#8b5cf6",
    command: "LAUNCH summer handbag collection",
    commandLabel: "LAUNCH command",
    messages: [
      { from: "user", type: "image", text: "product_handbag.jpg" },
      { from: "user", type: "text", text: "LAUNCH new summer handbag collection — 40% off for 48 hours" },
      { from: "bot", type: "text", text: "🚀 Generating *Product Launch Kit*...\n\n📦 Creating: reel + 3 ad variants + stories + broadcast" },
      { from: "bot", type: "video" },
      { from: "bot", type: "text", text: "🎯 *Ad Copy — 3 Variants:*\n\n📱 Short:\nSummer bags. 40% off. 48 hours only. ☀️\n👉 Shop now before it sells out.\n\n📰 Medium:\nThe collection you've been waiting for is finally here — and it's 40% off for the next 48 hours. Limited stock.\n👉 Tap to shop.\n\n📄 Traffic:\nSummer isn't complete without the right bag. Our new collection just dropped and for the next 48 hours, every piece is 40% off. Free shipping. Easy returns." },
      { from: "bot", type: "buttons", text: "Your launch kit is ready! 🚀", buttons: ["👍 Post to Instagram", "📢 Broadcast to customers", "📥 Download all"] },
    ],
    results: ["Product launch reel", "3 ad copy variants", "Flash sale broadcast", "Story countdown", "Hashtag pack (30)", "Gift guide post"],
  },
  {
    id: "fitness",
    icon: "💪",
    label: "Fitness & Gym",
    tagline: "Client transformation → motivational reel + membership promo in 30 seconds",
    color: "#f97316",
    command: "TRANSFORMATION 90-day client result",
    commandLabel: "TRANSFORMATION",
    messages: [
      { from: "user", type: "image", text: "client_result_90days.jpg" },
      { from: "user", type: "text", text: "TRANSFORMATION — John, 90-day transformation, lost 18kg" },
      { from: "bot", type: "text", text: "💪 Creating *Transformation Reel*...\n\n⏳ Preview in ~15 seconds" },
      { from: "bot", type: "video" },
      { from: "bot", type: "text", text: "🪝 Hook:\n\"John walked into our gym 90 days ago. Here's what happened next 🔥\"\n\n📝 Caption:\n90 days. 18kg down. John didn't just lose weight — he found a new version of himself.\n\nWant results like this? DM us *JOIN* to start your transformation.\n\n#fitness #transformation #weightloss #gym #motivation #results" },
      { from: "bot", type: "buttons", text: "Your reel is ready! 💪", buttons: ["👍 Post to Instagram", "📢 Send to lead list", "🔄 Regenerate"] },
    ],
    results: ["Transformation reel", "Motivational caption", "Membership CTA", "Challenge post", "Class promo", "Tip reel"],
  },
  {
    id: "interior_design",
    icon: "🏡",
    label: "Interior Design",
    tagline: "Project reveal → before/after reel + portfolio post in 30 seconds",
    color: "#06b6d4",
    command: "REVEAL living room renovation project",
    commandLabel: "REVEAL command",
    messages: [
      { from: "user", type: "image", text: "living_room_after.jpg" },
      { from: "user", type: "text", text: "REVEAL 3-month living room renovation — modern minimalist style" },
      { from: "bot", type: "text", text: "🏡 Creating *Project Reveal Reel*...\n\n⏳ Preview in ~15 seconds" },
      { from: "bot", type: "video" },
      { from: "bot", type: "text", text: "🪝 Hook:\n\"3 months. 1 living room. A complete transformation you won't believe 👀\"\n\n📝 Caption:\nFrom dated to dreamy. This modern minimalist transformation took 3 months of careful planning, custom joinery, and impeccable sourcing. The result? A space our client cries happy tears in.\n\n📩 DM *PROJECT* to start yours.\n\n#interiordesign #renovation #modernhome #homedecor #beforeafter #designinspo" },
      { from: "bot", type: "buttons", text: "Your reveal reel is ready! 🏠", buttons: ["👍 Post to Instagram", "📌 Add to portfolio", "🔄 Regenerate"] },
    ],
    results: ["Project reveal reel", "Portfolio caption", "Client inquiry CTA", "Before/after story", "Moodboard post", "Process reel"],
  },
  {
    id: "education",
    icon: "🎓",
    label: "Education",
    tagline: "Course launch → enrollment reel + student testimonial in 30 seconds",
    color: "#10b981",
    command: "LAUNCH digital marketing course — 50 seats",
    commandLabel: "LAUNCH command",
    messages: [
      { from: "user", type: "text", text: "LAUNCH digital marketing course — 50 seats, starts July 1, ₹12,000" },
      { from: "bot", type: "text", text: "🎓 Creating *Course Launch Kit*...\n\n📦 Building: reel + enrollment caption + broadcast + stories" },
      { from: "bot", type: "video" },
      { from: "bot", type: "text", text: "🪝 Hook:\n\"50 seats. Starts July 1. This is your sign to stop scrolling and start learning 📱\"\n\n📝 Caption:\nOur complete Digital Marketing course is open for enrollment. 8 weeks. Live sessions. Real projects. Career-ready skills.\n\n🎯 Seats: 50 only\n📅 Starts: July 1\n💰 ₹12,000 (EMI available)\n\nDM *ENROLL* or tap the link in bio.\n\n#digitalmarketing #onlinecourse #learning #career #marketing #skills" },
      { from: "bot", type: "buttons", text: "Your course launch kit is ready! 🎓", buttons: ["👍 Post to Instagram", "📢 Broadcast to leads", "📥 Download"] },
    ],
    results: ["Course launch reel", "Enrollment caption", "Lead broadcast", "Scholarship post", "Student result reel", "Webinar promo"],
  },
  {
    id: "hotel",
    icon: "🏨",
    label: "Hotel",
    tagline: "Property photo → booking promo + package post in 30 seconds",
    color: "#d97706",
    command: "KIT Monsoon Getaway package 2 nights ₹8,500",
    commandLabel: "KIT command",
    messages: [
      { from: "user", type: "image", text: "pool_view_monsoon.jpg" },
      { from: "user", type: "text", text: "KIT Monsoon Getaway — 2 nights + breakfast + pool access ₹8,500 per couple" },
      { from: "bot", type: "text", text: "📦 Generating *Hotel Content Kit*...\n\n⏳ Building: reel + caption + booking broadcast + listing description\n\nAbout 20 seconds." },
      { from: "bot", type: "video" },
      { from: "bot", type: "text", text: "🪝 Hook:\n\"Imagine waking up to the sound of rain, a pool view, and breakfast in bed — for just ₹8,500 🌧️\"\n\n📝 Caption:\nMonsoon magic is real. Our Monsoon Getaway package:\n🛏 2 nights luxury stay\n☕ Breakfast for 2\n🏊 Pool access\n💰 ₹8,500 per couple all-inclusive\n\n📅 Book before June 30 for guaranteed availability.\n📞 [SPECIFY: booking number]\n\n#monsoon #hotelstay #weekendgetaway #couplegoals #luxury #travel" },
      { from: "bot", type: "buttons", text: "Your hotel kit is ready! 🏨", buttons: ["👍 Post to Instagram", "📢 Broadcast to guests", "📥 Download"] },
    ],
    results: ["Property reel", "Package caption", "Guest broadcast", "Review request", "Seasonal promo", "Room tour reel"],
  },
];

function PhoneMockup({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative" style={{ width: 260 }}>
      <div className="relative rounded-[2.8rem] p-2.5"
        style={{
          background: "linear-gradient(145deg, #1e1e1e, #080808)",
          boxShadow: "0 0 0 1px #2a2a2a, 0 0 0 2.5px #111, 0 40px 80px rgba(0,0,0,0.8)",
        }}>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 rounded-b-3xl z-20 flex items-center justify-center gap-1.5"
          style={{ background: "#080808" }}>
          <div className="w-2 h-2 rounded-full bg-gray-800 ring-1 ring-gray-700" />
          <div className="w-1.5 h-1.5 rounded-full bg-gray-700" />
        </div>
        <div className="rounded-[2.2rem] overflow-hidden" style={{ height: 500, background: "#111b21" }}>
          {children}
        </div>
        <div className="mx-auto mt-2 w-12 h-1 rounded-full bg-gray-800" />
      </div>
    </div>
  );
}

function WhatsAppConvo({ messages, showTyping, color }: { messages: WaMsg[]; showTyping: boolean; color: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, showTyping]);

  return (
    <div className="h-full flex flex-col" style={{ background: "#111b21" }}>
      <div className="flex items-center justify-between px-4 pt-7 pb-1 text-[9px] text-gray-500" style={{ background: "#1f2c33" }}>
        <span className="font-medium">9:41</span>
        <div className="flex items-center gap-1">
          <span>▐▐▐</span><span>🔋</span>
        </div>
      </div>
      <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ background: "#1f2c33", borderColor: "rgba(255,255,255,0.05)" }}>
        <span className="text-xs text-gray-400">←</span>
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm" style={{ background: "linear-gradient(135deg, #25d366, #128c7e)" }}>🤖</div>
        <div className="flex-1">
          <div className="text-white text-[12px] font-semibold leading-none">Myna AI Studio</div>
          <div className="text-[9px] mt-0.5" style={{ color: "#25d366" }}>● online</div>
        </div>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-2.5 py-2 space-y-1.5"
        style={{ background: `radial-gradient(ellipse at 50% 0%, ${color}08 0%, transparent 60%), #0d1418` }}>
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"}`}
            style={{ animation: "msg-appear 0.2s ease-out" }}>
            {msg.type === "image" ? (
              <div className="rounded-xl flex flex-col items-center justify-center gap-1"
                style={{ background: "#1f2c33", width: 120, height: 90 }}>
                <span className="text-2xl">📸</span>
                <span className="text-[8px] text-gray-500">{msg.text}</span>
              </div>
            ) : msg.type === "video" ? (
              <div className="rounded-xl relative flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #1a2830, #0d1b24)", width: 130, height: 96 }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm"
                  style={{ background: "rgba(255,255,255,0.15)" }}>▶</div>
                <div className="absolute bottom-0 left-0 h-0.5 rounded-full"
                  style={{ background: color, width: "60%" }} />
                <span className="absolute bottom-1.5 right-2 text-[8px] text-gray-400">0:15</span>
              </div>
            ) : msg.type === "buttons" ? (
              <div className="rounded-xl overflow-hidden" style={{ maxWidth: 190 }}>
                <div className="px-2.5 py-1.5 text-[10px] text-gray-200 leading-relaxed" style={{ background: "#1f2c33" }}>{msg.text}</div>
                <div style={{ background: "#253340" }}>
                  {msg.buttons?.map((btn, i) => (
                    <div key={i} className="px-2.5 py-1.5 text-center text-[10px] font-medium border-t first:border-t-0"
                      style={{ borderColor: "rgba(255,255,255,0.06)", color: i === 0 ? color : "#53bdeb", background: i === 0 ? `${color}10` : "transparent" }}>
                      {btn}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="px-2.5 py-1.5 text-[10px] leading-[1.4] whitespace-pre-line"
                style={{
                  maxWidth: 190,
                  background: msg.from === "bot" ? "#1f2c33" : "#005c4b",
                  color: "rgba(255,255,255,0.9)",
                  borderRadius: msg.from === "bot" ? "3px 12px 12px 12px" : "12px 3px 12px 12px",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.3)",
                }}>
                {msg.text}
                <span className="block text-[7px] text-right mt-0.5 opacity-40">9:41 {msg.from === "bot" ? "✓✓" : ""}</span>
              </div>
            )}
          </div>
        ))}
        {showTyping && (
          <div className="flex justify-start" style={{ animation: "msg-appear 0.15s ease-out" }}>
            <div className="px-2.5 py-2 rounded-xl rounded-tl-sm flex gap-1 items-center" style={{ background: "#1f2c33" }}>
              {[0, 0.25, 0.5].map((delay, i) => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-gray-400"
                  style={{ animation: `typing-dot 1.1s infinite ${delay}s` }} />
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="flex items-center gap-1.5 px-2 py-2" style={{ background: "#1f2c33", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <div className="text-gray-500 text-sm px-0.5">😊</div>
        <div className="flex-1 rounded-full px-2.5 py-1 text-[10px] text-gray-600" style={{ background: "#2a3942" }}>Message</div>
        <div className="text-gray-500 text-sm">📎</div>
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm" style={{ background: "#25d366" }}>🎤</div>
      </div>
    </div>
  );
}

export function BusinessDemo() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [messages, setMessages] = useState<WaMsg[]>([]);
  const [showTyping, setShowTyping] = useState(false);
  const mountedRef = useRef(true);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const biz = BUSINESSES[activeIdx];

  function clearTimers() {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }

  function addTimer(delay: number, fn: () => void) {
    const id = setTimeout(() => { if (mountedRef.current) fn(); }, delay);
    timersRef.current.push(id);
  }

  function runDemo(idx: number) {
    clearTimers();
    setMessages([]);
    setShowTyping(false);
    setActiveIdx(idx);
    const sc = BUSINESSES[idx];
    let t = 400;
    let msgId = 0;

    for (const msg of sc.messages) {
      const len = msg.text?.length || 0;
      const typingMs = msg.type === "video" ? 1000 : len > 200 ? 1200 : len > 80 ? 800 : 550;
      if (msg.from === "bot") {
        addTimer(t, () => setShowTyping(true));
        t += typingMs;
        addTimer(t, () => {
          setShowTyping(false);
          setMessages(prev => [...prev, { id: msgId++, ...msg } as WaMsg]);
        });
        t += 150;
      } else {
        addTimer(t, () => setMessages(prev => [...prev, { id: msgId++, ...msg } as WaMsg]));
        t += 500;
      }
      t += msg.from === "user" ? 400 : 180;
    }
  }

  useEffect(() => {
    mountedRef.current = true;
    runDemo(0);
    return () => { mountedRef.current = false; clearTimers(); };
  }, []);

  return (
    <div className="max-w-6xl mx-auto">
      {/* Business tabs */}
      <div className="flex flex-wrap justify-center gap-2 mb-10">
        {BUSINESSES.map((b, i) => (
          <button key={b.id} onClick={() => runDemo(i)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200"
            style={{
              background: activeIdx === i ? `${b.color}20` : "rgba(255,255,255,0.04)",
              color: activeIdx === i ? b.color : "rgba(255,255,255,0.4)",
              border: `1px solid ${activeIdx === i ? b.color + "50" : "rgba(255,255,255,0.08)"}`,
              transform: activeIdx === i ? "scale(1.04)" : "scale(1)",
            }}>
            <span>{b.icon}</span>
            <span className="hidden sm:inline">{b.label}</span>
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-10 items-center">
        {/* Left: explanation */}
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-4xl">{biz.icon}</span>
              <div>
                <h3 className="text-2xl font-bold">{biz.label}</h3>
                <p className="text-gray-400 text-sm mt-0.5">{biz.tagline}</p>
              </div>
            </div>
          </div>

          <div className="glass rounded-xl p-4 border border-white/10">
            <p className="text-xs text-gray-500 mb-1.5">User types on WhatsApp:</p>
            <div className="flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-sm"
                style={{ background: "linear-gradient(135deg, #25d366, #128c7e)" }}>
                {biz.icon}
              </div>
              <code className="text-sm font-mono leading-relaxed" style={{ color: biz.color }}>
                {biz.command}
              </code>
            </div>
          </div>

          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">What you receive in 30 seconds:</p>
            <div className="grid grid-cols-2 gap-2">
              {biz.results.map(r => (
                <div key={r} className="flex items-center gap-2 text-sm text-gray-300">
                  <span className="text-green-400 flex-shrink-0">✓</span>
                  {r}
                </div>
              ))}
            </div>
          </div>

          <button onClick={() => runDemo(activeIdx)}
            className="text-sm px-4 py-2 rounded-lg border transition-colors"
            style={{ borderColor: `${biz.color}40`, color: biz.color, background: `${biz.color}10` }}>
            ↺ Replay demo
          </button>
        </div>

        {/* Right: phone mockup */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 blur-3xl rounded-full transition-colors duration-700"
              style={{ background: `${biz.color}18`, transform: "scale(0.75) translateY(8%)" }} />
            <PhoneMockup>
              <WhatsAppConvo messages={messages} showTyping={showTyping} color={biz.color} />
            </PhoneMockup>
          </div>
        </div>
      </div>
    </div>
  );
}
