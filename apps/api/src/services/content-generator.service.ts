import { chat } from "./ai.service";
import { redis } from "../lib/redis";
import { buildContentPrompt, WORKSPACE_SYSTEM_PROMPTS, ContentGenerationInput } from "../templates/prompts";
import { buildLanguageSystemPrompt, getNativeHashtags } from "../lib/languages";
import { logger } from "../lib/logger";
import { WorkspaceType } from "@prisma/client";
import crypto from "crypto";

export interface GeneratedScript {
  hook: string;
  script: string;
  caption: string;
  hashtags: string[];
  cta: string;
  postVariants: Array<{ platform: string; text: string }>;
}

const CACHE_TTL = 3600; // 1 hour
const MAX_CACHE_ENTRIES = 500;

export async function generateContentScript(input: ContentGenerationInput): Promise<GeneratedScript> {
  const baseSystemPrompt = WORKSPACE_SYSTEM_PROMPTS[input.workspaceType as WorkspaceType]
    || WORKSPACE_SYSTEM_PROMPTS.BUSINESS_SERVICES;

  // Inject language-specific cultural context into system prompt
  const languageContext = input.language ? buildLanguageSystemPrompt(input.language) : "";
  const systemPrompt = baseSystemPrompt + languageContext;

  const userPrompt = buildContentPrompt(input);

  // Redis prompt cache: ~30% hit rate for repeated workspace+style combos
  const langSuffix = input.language && input.language !== "English" ? `:${input.language}` : "";
  const cacheKey = `prompt:${input.workspaceType}:${input.contentType}:${input.style || "default"}${langSuffix}:${crypto.createHash("md5").update(input.mediaDescription || input.userPrompt || "").digest("hex")}`;

  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      logger.debug("Prompt cache hit", { cacheKey });
      return JSON.parse(cached);
    }
  } catch { /* non-fatal */ }

  const result = await chat({
    systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
    json: true,
    temperature: 0.8,
    maxTokens: 2048,
  });

  let parsed: GeneratedScript;
  try {
    const raw = JSON.parse(result.text);
    parsed = {
      hook: raw.hook || "Check this out! 🔥",
      script: raw.script || raw.caption || "",
      caption: raw.caption || "",
      hashtags: Array.isArray(raw.hashtags) ? raw.hashtags.slice(0, 20) : [],
      cta: raw.cta || "Follow for more!",
      postVariants: Array.isArray(raw.postVariants) ? raw.postVariants : [],
    };
  } catch {
    logger.warn("Failed to parse AI JSON response, using fallback");
    return buildFallbackContent(input);
  }

  // Cache only non-user-specific results (no mediaDescription = generic prompt)
  if (!input.mediaDescription) {
    try {
      await redis.set(cacheKey, JSON.stringify(parsed), "EX", CACHE_TTL);
    } catch { /* non-fatal */ }
  }

  return parsed;
}

function buildFallbackContent(input: ContentGenerationInput): GeneratedScript {
  const englishHashtags = FALLBACK_HASHTAGS[input.workspaceType] || ["marketing", "business", "viral"];
  const nativeHashtags = input.language ? getNativeHashtags(input.language, input.workspaceType) : [];
  const hashtags = [...nativeHashtags, ...englishHashtags].slice(0, 20);
  return {
    hook: "You won't believe this! 🔥",
    script: input.mediaDescription || input.userPrompt || "Check out our latest content!",
    caption: `${input.userPrompt || input.mediaDescription || "Amazing content"}! ✨\n\nFollow us for more!`,
    hashtags,
    cta: "Follow for daily content! 👆",
    postVariants: [
      { platform: "instagram", text: `${input.userPrompt || "Amazing content"}! ✨ Follow for more!` },
      { platform: "tiktok", text: `${input.userPrompt || "Amazing content"}! Follow for more content!` },
      { platform: "facebook", text: `${input.userPrompt || "Amazing content"}! Like and share if you agree!` },
    ],
  };
}

const FALLBACK_HASHTAGS: Record<string, string[]> = {
  RESTAURANT: ["food", "foodie", "restaurant", "foodphotography", "delicious", "yummy", "instafood", "foodlover", "chef", "cooking", "foodstagram", "tasty", "eat", "dinner", "lunch"],
  REAL_ESTATE: ["realestate", "property", "home", "house", "investment", "realtor", "homebuying", "luxuryhomes", "propertyinvestment", "newhome", "dreamhome", "interiordesign", "architecture", "forsale", "realty"],
  ECOMMERCE: ["shopping", "onlineshopping", "deals", "sale", "product", "buy", "discount", "offer", "ecommerce", "shop", "fashion", "lifestyle", "trending", "musthave", "new"],
  CREATOR: ["content", "creator", "viral", "trending", "socialmedia", "influencer", "youtube", "instagram", "tiktok", "reels", "contentcreator", "grow", "tips", "tutorial", "behindthescenes"],
  BUSINESS_SERVICES: ["business", "entrepreneur", "startup", "marketing", "growth", "success", "leadership", "smallbusiness", "tips", "strategy", "productivity", "hustle", "motivation", "b2b", "services"],
  EVENTS: ["event", "party", "celebration", "concert", "festival", "tickets", "live", "experience", "nightlife", "entertainment", "fun", "weekend", "vibes", "exclusive", "dontmissout"],
  EDUCATION: ["education", "learning", "course", "skills", "online", "training", "coaching", "mentor", "growth", "knowledge", "study", "career", "development", "tips", "howto"],
  PERSONAL: ["family", "love", "memories", "moments", "birthday", "celebration", "life", "happiness", "joy", "together", "kids", "parents", "home", "blessed", "grateful"],
};
