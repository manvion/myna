// Local Language Excellence — geographic moat via cultural adaptation

export interface LanguageConfig {
  code: string;
  name: string;
  nativeName: string;
  script: string;
  rtl: boolean;
  // Script detection Unicode ranges
  scriptRanges: [number, number][];
  // Cultural context injected into AI system prompt
  culturalContext: string;
  // Example hashtags in native script
  sampleHashtags: Record<string, string[]>; // workspace → hashtags
  // Greeting phrase
  greeting: string;
  // Confirmation message after language detection
  detectionMessage: string;
}

export const LANGUAGES: Record<string, LanguageConfig> = {
  Hindi: {
    code: "hi",
    name: "Hindi",
    nativeName: "हिन्दी",
    script: "devanagari",
    rtl: false,
    scriptRanges: [[0x0900, 0x097f]],
    culturalContext: `
- Generate all content in Hindi using Devanagari script.
- Use a mix of formal Hindi and Hinglish where natural (e.g., "viral content" not "वायरल सामग्री").
- Cultural references: Bollywood, cricket, family values, Indian festivals, desi food culture.
- Hooks work best with wordplay (श्लेष), curiosity gaps, and relatable daily-life moments.
- Common power words: "एकदम", "धमाका", "जादू", "कमाल", "धाँसू".
- Hashtags: mix Hindi script (#खाना #जिंदगी) with Hindi romanized (#desi #jugaad) and English.
- Tone: warm, enthusiastic, family-friendly unless specified otherwise.
- Festival hooks: reference current season, cricket match, or Bollywood release where relevant.`,
    sampleHashtags: {
      RESTAURANT: ["#खाना", "#खानाखज़ाना", "#देसीखाना", "#स्वाद", "#भोजन"],
      ECOMMERCE: ["#खरीदारी", "#ऑफर", "#सेल", "#डील", "#बेस्टप्राइस"],
      CREATOR: ["#जिंदगी", "#वायरल", "#ट्रेंडिंग", "#मेरीदुनिया", "#दिल"],
      PERSONAL: ["#परिवार", "#यादें", "#खुशियाँ", "#प्यार", "#जश्न"],
    },
    greeting: "नमस्ते! 🙏",
    detectionMessage: "🙏 मैंने हिंदी detect की! क्या सारा content हिंदी में बनाऊं?\n\nType *HINDI* to confirm, or *ENGLISH* to keep English.",
  },

  Tamil: {
    code: "ta",
    name: "Tamil",
    nativeName: "தமிழ்",
    script: "tamil",
    rtl: false,
    scriptRanges: [[0x0b80, 0x0bff]],
    culturalContext: `
- Generate all content in Tamil script.
- Cultural references: Kollywood cinema (Vijay, Ajith, Kamal Haasan), Tamil music (AR Rahman), Chennai street food, Pongal festival, Jallikattu pride.
- Use Tamglish (Tamil + English mix) naturally where it sounds authentic.
- Hooks: use Tamil proverbs (பழமொழி) or Kollywood dialogues as inspiration.
- Power words: "அமைப்பு", "வீர", "தலைவர்", "மாஸ்".
- Hashtags: Tamil script (#உணவு #வாழ்க்கை) + romanized (#kollywood #tamilfood).
- Festival sensitivity: Pongal, Karthigai Deepam, Aadi Perukku are significant.
- Tone: proud, vibrant, community-focused.`,
    sampleHashtags: {
      RESTAURANT: ["#உணவு", "#சாப்பாடு", "#தமிழ்சுவை", "#சென்னைசாப்பாடு", "#நாட்டுசத்து"],
      CREATOR: ["#வாழ்க்கை", "#கனவு", "#தமிழ்", "#கலை", "#ட்ரெண்டிங்"],
      PERSONAL: ["#குடும்பம்", "#அன்பு", "#நினைவுகள்", "#மகிழ்ச்சி", "#பண்டிகை"],
      ECOMMERCE: ["#வாங்கல்", "#சலுகை", "#தமிழ்நாடு", "#பொருள்கள்", "#விற்பனை"],
    },
    greeting: "வணக்கம்! 🙏",
    detectionMessage: "🙏 Tamil script detected! Shall I generate all content in Tamil?\n\nType *TAMIL* to confirm.",
  },

  Telugu: {
    code: "te",
    name: "Telugu",
    nativeName: "తెలుగు",
    script: "telugu",
    rtl: false,
    scriptRanges: [[0x0c00, 0x0c7f]],
    culturalContext: `
- Generate all content in Telugu script.
- Cultural references: Tollywood (Prabhas, Allu Arjun, Jr NTR), Hyderabadi biryani, Ugadi festival, Andhra/Telangana pride.
- Use Tenglish (Telugu + English) naturally.
- Power words: "అద్భుతం", "శానా", "బాగా", "మాస్".
- Festival sensitivity: Ugadi, Sankranti, Bathukamma are culturally significant.
- Hashtags: Telugu script (#తినుబండారాలు) + romanized (#tollywood #telugufood).
- Tone: enthusiastic, family-oriented, celebratory.`,
    sampleHashtags: {
      RESTAURANT: ["#తినుబండారాలు", "#హైదరాబాద్", "#ఆంధ్రవంట", "#బిర్యాని", "#స్వాదు"],
      CREATOR: ["#తెలుగు", "#జీవితం", "#ట్రెండింగ్", "#కళ", "#వైరల్"],
      PERSONAL: ["#కుటుంబం", "#ప్రేమ", "#జ్ఞాపకాలు", "#సంతోషం", "#పండుగ"],
      ECOMMERCE: ["#షాపింగ్", "#ఆఫర్", "#డీల్", "#తెలుగు", "#ఉత్పత్తులు"],
    },
    greeting: "నమస్కారం! 🙏",
    detectionMessage: "🙏 Telugu script detected! Generate content in Telugu?\n\nType *TELUGU* to confirm.",
  },

  Marathi: {
    code: "mr",
    name: "Marathi",
    nativeName: "मराठी",
    script: "devanagari",
    rtl: false,
    scriptRanges: [], // shares Devanagari with Hindi — detected via context
    culturalContext: `
- Generate all content in Marathi.
- Cultural references: Maharashtra pride, Pune/Mumbai culture, Ganesh Chaturthi (biggest festival), Vada Pav, MNS/Maratha identity, Marathi cinema.
- Use Marathinglish naturally where appropriate.
- Power words: "एकदम झक्कास", "भारी", "मस्त", "अप्रतिम".
- Festival sensitivity: Ganesh Chaturthi, Gudi Padwa, Diwali are especially important.
- Hashtags: Marathi (#खाणे #महाराष्ट्र) + English.
- Tone: proud, warm, community-focused.`,
    sampleHashtags: {
      RESTAURANT: ["#खाणे", "#वडापाव", "#महाराष्ट्र", "#पुणे", "#मुंबई"],
      CREATOR: ["#जीवन", "#मराठी", "#ट्रेंडिंग", "#विनोद", "#कला"],
      PERSONAL: ["#कुटुंब", "#आनंद", "#आठवणी", "#प्रेम", "#सण"],
      ECOMMERCE: ["#खरेदी", "#ऑफर", "#महाराष्ट्र", "#उत्पादन", "#सेल"],
    },
    greeting: "नमस्कार! 🙏",
    detectionMessage: "🙏 Marathi detected! Content in Marathi?\n\nType *MARATHI* to confirm.",
  },

  Bengali: {
    code: "bn",
    name: "Bengali",
    nativeName: "বাংলা",
    script: "bengali",
    rtl: false,
    scriptRanges: [[0x0980, 0x09ff]],
    culturalContext: `
- Generate all content in Bengali script.
- Cultural references: Durga Puja (biggest festival), Rabindranath Tagore, rosogolla, Bengali cinema, Kolkata/Dhaka culture, Pohela Boishakh (Bengali New Year).
- Use Benglish naturally.
- Power words: "অসাধারণ", "দারুণ", "ভালো", "মজার".
- Festival sensitivity: Durga Puja, Eid (for Bangladesh audience), Pohela Boishakh.
- Hashtags: Bengali script (#খাবার #বাংলা) + romanized.
- Tone: literary, warm, nostalgic, community-focused.`,
    sampleHashtags: {
      RESTAURANT: ["#খাবার", "#বাংলাখাবার", "#রান্না", "#কলকাতা", "#ঢাকা"],
      CREATOR: ["#জীবন", "#বাংলা", "#ট্রেন্ডিং", "#কলা", "#ভাইরাল"],
      PERSONAL: ["#পরিবার", "#ভালোবাসা", "#স্মৃতি", "#আনন্দ", "#উৎসব"],
      ECOMMERCE: ["#কেনাকাটা", "#অফার", "#বাংলাদেশ", "#পণ্য", "#ছাড়"],
    },
    greeting: "নমস্কার! 🙏",
    detectionMessage: "🙏 Bengali script detected! Content in Bengali?\n\nType *BENGALI* to confirm.",
  },

  Arabic: {
    code: "ar",
    name: "Arabic",
    nativeName: "العربية",
    script: "arabic",
    rtl: true,
    scriptRanges: [[0x0600, 0x06ff], [0x0750, 0x077f]],
    culturalContext: `
- Generate all content in Arabic (Modern Standard Arabic, with Gulf/Levant touches as appropriate).
- IMPORTANT: Arabic is RTL (right-to-left). Structure content so it reads naturally in RTL.
- Cultural context: Islamic values are central. Use "بإذن الله", "الحمد لله", "ماشاء الله" where appropriate.
- Ramadan content gets special treatment: iftar, suhoor, charity (zakat), spiritual reflection.
- Gulf market references: UAE, Saudi Arabia, Qatar luxury market consciousness.
- Halal certification is a key trust signal for food content.
- Avoid: alcohol references, gambling, immodest imagery descriptions.
- Power words: "رائع", "مذهل", "حصري", "فرصة لا تُفوَّت", "اختبر الفرق".
- Hashtags: Arabic (#أكل #حياة) + English transliterated (#halal #arabic).
- Tone: respectful, trust-building, aspirational. Family values are paramount.
- Numbers: use Eastern Arabic numerals (٠١٢٣٤٥٦٧٨٩) for authentic feel.`,
    sampleHashtags: {
      RESTAURANT: ["#أكل", "#مطعم", "#حلال", "#طعام_شهي", "#وجبة"],
      REAL_ESTATE: ["#عقارات", "#منزل_أحلامك", "#استثمار", "#دبي", "#الرياض"],
      CREATOR: ["#حياة", "#إبداع", "#ترند", "#محتوى", "#فيديو"],
      PERSONAL: ["#عائلة", "#ذكريات", "#حب", "#فرح", "#رمضان"],
      ECOMMERCE: ["#تسوق", "#عرض", "#خصم", "#جديد", "#حصري"],
    },
    greeting: "السلام عليكم! 🌙",
    detectionMessage: "🌙 Arabic script detected! Generate content in Arabic?\n\nType *ARABIC* to confirm.",
  },

  Indonesian: {
    code: "id",
    name: "Indonesian",
    nativeName: "Bahasa Indonesia",
    script: "latin",
    rtl: false,
    scriptRanges: [], // Latin script — detected via keyword patterns
    culturalContext: `
- Generate all content in Bahasa Indonesia.
- Cultural references: Indonesia as the world's largest Muslim-majority country, Batik culture, gojek/tokopedia digital economy, Bali tourism, local street food (warteg, nasi goreng, bakso).
- Use Indonesian internet slang naturally: "wkwk" (laughter), "auto", "gass", "mantul" (mantap betul).
- Ramadan and Lebaran (Eid) are the biggest commercial seasons — higher engagement during this period.
- Power words: "keren", "mantap", "viral", "auto", "gass", "bestie".
- Hashtags: Indonesian + English (#kuliner #viral #fyp #Indonesia).
- Tone: casual, friendly, enthusiastic. "Lo/gue" informal is fine for creator content; "Anda/kami" for business.`,
    sampleHashtags: {
      RESTAURANT: ["#kuliner", "#makanan", "#foodie", "#nusantara", "#enak"],
      CREATOR: ["#fyp", "#viral", "#konten", "#indonesia", "#trend"],
      PERSONAL: ["#keluarga", "#momen", "#bahagia", "#kenangan", "#lebaran"],
      ECOMMERCE: ["#belanja", "#promo", "#diskon", "#shopee", "#olshop"],
    },
    greeting: "Halo! 👋",
    detectionMessage: "👋 Indonesian detected! Content in Bahasa Indonesia?\n\nType *INDONESIAN* to confirm.",
  },

  Portuguese: {
    code: "pt-BR",
    name: "Portuguese",
    nativeName: "Português (Brasil)",
    script: "latin",
    rtl: false,
    scriptRanges: [],
    culturalContext: `
- Generate all content in Brazilian Portuguese (pt-BR). Use Brazil-specific slang and expressions.
- Cultural references: Carnival, futebol (especially Flamengo, Corinthians, Palmeiras), pagode/funk/sertanejo music, churrasco, açaí, Instagram influencer culture.
- Brazil has the highest WhatsApp adoption globally — content should feel native to Brazilian digital culture.
- Use Brazilian slang naturally: "top", "massa", "mano", "vibe", "lacrou", "gostoso".
- Power words: "incrível", "exclusivo", "você merece", "não perca", "de graça".
- Hashtags: Portuguese (#comida #vida) + English (#fyp #trending) + Brazilian tags (#BR #brasil).
- Tone: warm, enthusiastic, slightly playful. Brazilian content is high-energy and personal.`,
    sampleHashtags: {
      RESTAURANT: ["#comida", "#gastronomia", "#foodie", "#sabor", "#brasil"],
      CREATOR: ["#vida", "#conteudo", "#viral", "#fyp", "#trending"],
      PERSONAL: ["#família", "#amor", "#momentos", "#felicidade", "#celebração"],
      ECOMMERCE: ["#compras", "#promoção", "#desconto", "#oferta", "#brasil"],
    },
    greeting: "Olá! 👋",
    detectionMessage: "👋 Portuguese detected! Content in Português (Brasil)?\n\nType *PORTUGUESE* to confirm.",
  },

  Spanish: {
    code: "es",
    name: "Spanish",
    nativeName: "Español",
    script: "latin",
    rtl: false,
    scriptRanges: [],
    culturalContext: `
- Generate all content in Spanish. Default to Latin American Spanish (most WhatsApp users); adjust for Spain if specified.
- Cultural references: fútbol, telenovela drama, música (reggaeton, salsa, banda), tamales, quinceañeras, Día de los Muertos (Mexico), cumbia.
- Use relatable LatAm expressions: "¡Órale!", "¿Qué onda?", "chévere", "brutal", "bacano", "pura vida".
- Power words: "exclusivo", "increíble", "no te lo pierdas", "gratis", "hoy mismo".
- Hashtags: Spanish (#comida #vida) + English (#fyp #viral) + regional tags (#mexico #colombia #argentina).
- Tone: warm, passionate, community-focused. Family is central to Latin culture.`,
    sampleHashtags: {
      RESTAURANT: ["#comida", "#gastronomia", "#sabor", "#antojo", "#foodie"],
      CREATOR: ["#vida", "#viral", "#contenido", "#tendencia", "#fyp"],
      PERSONAL: ["#familia", "#amor", "#recuerdos", "#felicidad", "#celebración"],
      ECOMMERCE: ["#compras", "#oferta", "#descuento", "#nuevo", "#exclusivo"],
    },
    greeting: "¡Hola! 👋",
    detectionMessage: "👋 Spanish detected! Content in Español?\n\nType *SPANISH* to confirm.",
  },

  French: {
    code: "fr",
    name: "French",
    nativeName: "Français",
    script: "latin",
    rtl: false,
    scriptRanges: [],
    culturalContext: `
- Generate all content in French. Primary markets: France, Belgium, Francophone Africa (Senegal, Ivory Coast, Morocco), Quebec.
- Cultural references: cuisine française, fashion (Paris fashion week), football (les Bleus), African Francophone culture for MENA/West Africa audience.
- French content values elegance, craft, and quality over hype.
- Power words: "exclusif", "incontournable", "découvrez", "saveur", "authentique".
- Hashtags: French (#nourriture #mode) + English (#fyp #viral) + regional (#paris #senegal).
- Tone: sophisticated but approachable. Avoid excessive exclamation marks — French style is understated.`,
    sampleHashtags: {
      RESTAURANT: ["#nourriture", "#gastronomie", "#cuisine", "#saveur", "#foodie"],
      CREATOR: ["#vie", "#viral", "#contenu", "#tendance", "#créateur"],
      PERSONAL: ["#famille", "#amour", "#souvenirs", "#bonheur", "#fête"],
      ECOMMERCE: ["#shopping", "#promo", "#soldes", "#nouveau", "#exclusif"],
    },
    greeting: "Bonjour! 👋",
    detectionMessage: "👋 French detected! Content in Français?\n\nType *FRENCH* to confirm.",
  },

  English: {
    code: "en",
    name: "English",
    nativeName: "English",
    script: "latin",
    rtl: false,
    scriptRanges: [],
    culturalContext: "", // default — no injection needed
    sampleHashtags: {},
    greeting: "Hey! 👋",
    detectionMessage: "",
  },
};

// ─── Script detection ──────────────────────────────────────────────────────────

export function detectLanguageFromScript(text: string): string | null {
  if (!text || text.length < 3) return null;

  const codePoints = [...text].map((c) => c.codePointAt(0) ?? 0);

  // Count characters in each script range
  const scriptCounts: Record<string, number> = {};
  for (const lang of Object.values(LANGUAGES)) {
    if (lang.scriptRanges.length === 0) continue;
    const count = codePoints.filter((cp) =>
      lang.scriptRanges.some(([start, end]) => cp >= start && cp <= end)
    ).length;
    if (count > 0) {
      scriptCounts[lang.name] = count;
    }
  }

  if (Object.keys(scriptCounts).length === 0) return null;

  // Marathi vs Hindi: both use Devanagari — check for Marathi-specific words
  const dominantScript = Object.entries(scriptCounts).sort((a, b) => b[1] - a[1])[0];

  // Need at least 2 non-latin characters to confidently detect
  if (dominantScript[1] < 2) return null;

  // Hindi vs Marathi disambiguation: Marathi uses ळ (U+0933), ् at certain positions
  if (dominantScript[0] === "Hindi") {
    const marathiMarkers = ["ळ", "ण्या", "आहे", "आणि", "काय", "नाही", "मला"];
    if (marathiMarkers.some((m) => text.includes(m))) return "Marathi";
  }

  return dominantScript[0];
}

// ─── Build cultural context injection for AI prompts ──────────────────────────

export function buildLanguageSystemPrompt(language: string): string {
  const lang = LANGUAGES[language];
  if (!lang || !lang.culturalContext) return "";

  return `\n\n## Language & Cultural Context\nLanguage: ${lang.name} (${lang.nativeName})\n${lang.culturalContext.trim()}`;
}

// ─── Get native-script hashtags for a workspace ───────────────────────────────

export function getNativeHashtags(language: string, workspaceType: string): string[] {
  const lang = LANGUAGES[language];
  if (!lang) return [];
  return lang.sampleHashtags[workspaceType] || lang.sampleHashtags.CREATOR || [];
}

// ─── Language-aware content instruction ──────────────────────────────────────

export function buildLanguageInstruction(language: string): string {
  if (language === "English") return "";
  const lang = LANGUAGES[language];
  if (!lang) return "";

  const nativeHashtagNote = Object.values(lang.sampleHashtags)[0]?.length
    ? `\n- Include 3-5 hashtags in ${lang.nativeName} script alongside English hashtags (e.g., ${Object.values(lang.sampleHashtags)[0]?.slice(0, 3).join(" ")}).`
    : "";

  return `\n\n**IMPORTANT — Output Language:** Generate ALL content (hook, caption, script) in ${lang.name} (${lang.nativeName}).${lang.rtl ? " Content is RTL." : ""}${nativeHashtagNote}`;
}
