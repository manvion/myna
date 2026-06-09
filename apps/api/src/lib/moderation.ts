import { logger } from "./logger";

export interface ModerationResult {
  safe: boolean;
  reason?: string;
  category?: "nudity" | "violence" | "hate" | "illegal" | "spam" | "self_harm" | "misinformation" | "adult";
}

// ─── Input banned patterns ────────────────────────────────────────────────────

const BANNED_PATTERNS: Array<{ pattern: RegExp; category: ModerationResult["category"] }> = [
  // Adult / sexual
  { pattern: /\b(nude|naked|porn|pornography|sex|xxx|adult.?content|explicit|nsfw|erotic|strip|undress|topless|OnlyFans|escort|prostitut|cam.?girl|cam.?boy|hentai|fetish|bdsm|lingerie.?model)\b/i, category: "adult" },

  // Violence / weapons
  { pattern: /\b(kill|murder|bomb|explosion|terror|terrorist|weapon|firearm|gun.?sale|knife.?attack|assault|massacre|suicide.?method|self.?harm|cut.?myself|how.?to.?die)\b/i, category: "violence" },

  // Hate speech
  { pattern: /\b(hate.?speech|racial.?slur|nazi|white.?supremac|antisemit|islamophob|casteist.?slur)\b/i, category: "hate" },

  // Illegal activities
  { pattern: /\b(drug.?deal|buy.?cocaine|buy.?heroin|sell.?meth|dark.?web|money.?launder|tax.?fraud|pyramid.?scheme|fake.?invoice|counterfeit|phish|hack.?account|stolen.?card|carding)\b/i, category: "illegal" },

  // Financial fraud / scam
  { pattern: /\b(guaranteed.?returns|double.?your.?money|ponzi|get.?rich.?quick|investment.?scam|forex.?scam|crypto.?guaranteed|100%.?profit)\b/i, category: "illegal" },

  // Child safety
  { pattern: /\b(minor|underage|child.?model|teen.?explicit|loli|shota)\b/i, category: "adult" },
];

// ─── Output compliance patterns (AI-generated content check) ─────────────────
// Catches fabricated claims the AI should never produce.
// Uses replace() not block — flags for user verification, doesn't kill the content.

const OUTPUT_BANNED_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  // Fabricated financial guarantees
  { pattern: /\b(guaranteed.{0,20}(profit|return|income|earning)|100%.{0,20}(profit|return|safe|risk.?free)|double.{0,20}(your.{0,5})?(money|investment)|no.?risk.{0,10}invest)\b/i, reason: "Fabricated financial guarantee" },

  // Medical / health outcome claims
  { pattern: /\b(clinically.?proven|FDA.?approved|FSSAI.?certified|doctor.?recommended|scientifically.?proven|guaranteed.{0,15}results?|lose.{0,5}\d+.{0,10}(kg|kgs|lbs|pounds).{0,15}(week|day|month)|cures?\s+\w+|treats?\s+(cancer|diabetes|hypertension|depression|arthritis))\b/i, reason: "Unsubstantiated medical/health claim" },

  // Invented fitness results
  { pattern: /\b(lose.{0,5}\d+.{0,5}(kg|lbs).{0,10}in.{0,5}\d+.{0,10}(day|week|month)|guaranteed.{0,15}(weight.?loss|fat.?loss|muscle.?gain))\b/i, reason: "Fabricated fitness outcome — user must verify actual client results" },

  // Fake certifications / awards / rankings
  { pattern: /\b(#1.{0,10}in.{0,30}(world|india|asia|country|city|mumbai|delhi|bangalore)|world.?['']?s?\s+best|award.?winning|iso.?certified|nabl.?accredited|nabh.?accredited)\b/i, reason: "Unverified award or certification claim" },

  // Invented property specifics the model may add
  { pattern: /\b(\d{3,4}\s*sqft|\d{1,2}(bhk|bhk)?.{0,5}(carpet|built.?up)|vastu.?compliant|rera.?approved|occ.?cert)\b/i, reason: "Property specification — verify all figures with actual listing data" },

  // Invented price figures (catches things like ₹X.X Cr, $X,XXX)
  { pattern: /₹\s*\d+(\.\d+)?\s*(cr|lakh|lac|crore|l\b)|(\$|€|£)\s*\d[\d,]+/i, reason: "Price figure — confirm this matches your actual pricing before publishing" },

  // Fabricated testimonials / fake quotes
  { pattern: /[""]([A-Z][a-z]+\s[A-Z][a-z]+|[A-Z][a-z]+)\s*,\s*(client|customer|patient|student|guest|member)\b/i, reason: "Quoted testimonial — ensure this is a real client quote, not AI-generated" },

  // Misleading before/after weight/revenue numbers
  { pattern: /\b(from.{0,10}\d+.{0,10}(kg|lbs).{0,10}to.{0,10}\d+|lost.{0,5}\d+.{0,5}(kg|lbs|pounds)|gained.{0,5}₹?\d+.{0,10}(lakh|cr|million))\b/i, reason: "Specific before/after figure — verify this matches the actual client outcome" },

  // Adult content in output
  { pattern: /\b(nude|naked|sexual|explicit|porn|erotic|nsfw|adult.?content|strip.?show)\b/i, reason: "Adult content in output" },

  // Legal / investment advice
  { pattern: /\b(guaranteed.{0,10}returns?|assured.{0,10}returns?|risk.?free.{0,10}invest|this.{0,10}is.{0,10}not.{0,10}financial.?advice)\b/i, reason: "Investment/financial advice — add proper disclaimer before publishing" },
];

// ─── Input text moderation ────────────────────────────────────────────────────

export async function moderateText(text: string): Promise<ModerationResult> {
  for (const { pattern, category } of BANNED_PATTERNS) {
    if (pattern.test(text)) {
      logger.warn("Text moderation blocked", { category, text: text.slice(0, 50) });
      return {
        safe: false,
        category,
        reason: "Your message contains content that cannot be processed.",
      };
    }
  }
  return { safe: true };
}

// ─── Output compliance check ──────────────────────────────────────────────────
// Called AFTER AI generates content, before sending to user.
// Strips or flags problematic claims rather than blocking entirely.

export function checkOutputCompliance(text: string): { clean: string; warnings: string[] } {
  const warnings: string[] = [];
  let clean = text;

  for (const { pattern, reason } of OUTPUT_BANNED_PATTERNS) {
    if (pattern.test(clean)) {
      warnings.push(reason);
      // Replace the flagged phrase with a placeholder reminder
      clean = clean.replace(pattern, (match) => `[Verify: ${match}]`);
    }
  }

  return { clean, warnings };
}

// ─── Vision moderation ────────────────────────────────────────────────────────

const VISION_MODERATION_PROMPT = `Analyze this image for content safety. Check strictly for:
1. Nudity or sexual content (any exposure, suggestive poses)
2. Graphic violence or gore
3. Hate symbols, extremist imagery
4. Drug paraphernalia or illegal items
5. Illegal activity in progress
6. Content involving minors in inappropriate contexts

Respond ONLY with valid JSON: { "safe": true/false, "category": "nudity|violence|hate|illegal|none", "reason": "one sentence if unsafe, empty if safe" }
Be conservative on nudity and content involving minors. If genuinely unclear, mark safe.`;

export async function moderateImage(base64Image: string, mimeType = "image/jpeg"): Promise<ModerationResult> {
  try {
    // Gemini first — best free vision for moderation
    if (process.env.GEMINI_API_KEY) {
      const { GoogleGenerativeAI } = await import("@google/generative-ai");
      const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genai.getGenerativeModel({
        model: "gemini-1.5-flash",
        generationConfig: { responseMimeType: "application/json" },
      });
      const result = await model.generateContent({
        contents: [{
          role: "user",
          parts: [
            { inlineData: { mimeType, data: base64Image } },
            { text: VISION_MODERATION_PROMPT },
          ],
        }],
      });
      const parsed = JSON.parse(result.response.text());
      return {
        safe: parsed.safe !== false,
        category: parsed.category !== "none" ? parsed.category : undefined,
        reason: parsed.reason,
      };
    }

    // OpenRouter vision fallback
    if (process.env.OPENROUTER_API_KEY) {
      const { default: OpenAI } = await import("openai");
      const client = new OpenAI({
        apiKey: process.env.OPENROUTER_API_KEY,
        baseURL: "https://openrouter.ai/api/v1",
        defaultHeaders: { "HTTP-Referer": process.env.API_BASE_URL || "https://myna.app", "X-Title": "Myna" },
      });
      const res = await client.chat.completions.create({
        model: "meta-llama/llama-3.2-11b-vision-instruct:free",
        messages: [{
          role: "user",
          content: [
            { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Image}` } },
            { type: "text", text: VISION_MODERATION_PROMPT },
          ],
        }],
        max_tokens: 150,
        response_format: { type: "json_object" },
      });
      const parsed = JSON.parse(res.choices[0].message.content || "{}");
      return {
        safe: parsed.safe !== false,
        category: parsed.category !== "none" ? parsed.category : undefined,
        reason: parsed.reason,
      };
    }

    logger.warn("No vision API for moderation — image allowed through unmoderated");
    return { safe: true };
  } catch (err) {
    logger.warn("Moderation check failed — allowing through", { err: (err as Error).message });
    return { safe: true }; // fail open so API errors don't block users
  }
}

// ─── User-facing messages ─────────────────────────────────────────────────────

export function getModerationMessage(result: ModerationResult): string {
  const messages: Record<string, string> = {
    adult:         "❌ This content contains adult material that violates our guidelines.\n\nMyna is a professional content creation tool. Please send appropriate business or personal content.",
    nudity:        "❌ This image contains content that violates our guidelines.\n\nPlease send appropriate content suitable for social media.",
    violence:      "❌ This content contains violent or graphic material that cannot be processed.",
    hate:          "❌ This content violates our community guidelines and cannot be processed.",
    illegal:       "❌ This content cannot be processed as it may relate to illegal activity.",
    spam:          "❌ This content was flagged as spam and cannot be processed.",
    misinformation:"⚠️ This content contains claims we cannot verify. Please ensure all information is accurate before publishing.",
    self_harm:     "We noticed this content may relate to distress. If you're struggling, please reach out for support.\n\n🇮🇳 iCall: 9152987821\n🌍 Crisis Text Line: text HOME to 741741",
  };
  return messages[result.category || ""] || "❌ This content cannot be processed. Please send appropriate content.";
}

export function getComplianceWarningMessage(warnings: string[]): string {
  return (
    `⚠️ *Compliance check:* Some claims in this content need your verification before posting:\n\n` +
    warnings.map(w => `• ${w}`).join("\n") +
    `\n\n_Items marked [Verify: ...] should be confirmed with real data before publishing._`
  );
}
