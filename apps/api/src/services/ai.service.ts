import { createHash } from "crypto";
import { logger } from "../lib/logger";
import { redis } from "../lib/redis";

// ─── Provider strategy ────────────────────────────────────────────────────────
//
// Three fully independent free-tier providers stacked in sequence:
//
//   Tier 1 — Groq direct API
//     • LLaMA 3.3 70B: 30 req/min, 6K tokens/min, 14.4K req/day free
//     • Best latency, most reliable rate limits
//     • env: GROQ_API_KEY
//
//   Tier 2 — Google Gemini direct API
//     • Gemini 1.5 Flash: 1,500 req/day, 1M tokens/day free (AI Studio key)
//     • Vision capable, handles complex JSON well
//     • env: GEMINI_API_KEY
//
//   Tier 3 — OpenRouter free models
//     • Gemini 2.0 Flash / LLaMA 3.3 70B / Qwen 2.5 72B / Mistral 7B / LLaMA 3.1 8B
//     • Shared rate limits but 5-model cascade = high availability
//     • env: OPENROUTER_API_KEY
//
// Smart routing: SIMPLE prompts (captions, hashtags, replies) use Groq 8B — fast
// and doesn't touch the 70B quota. COMPLEX prompts (full suites, launch campaigns)
// use 70B. Vision always goes to Gemini first (best free vision).
//
// Redis cache: every response cached 24h. Same input = zero AI cost.
// Circuit breaker: failed model paused 5 min before retry.

// ─── Prompt complexity classification ────────────────────────────────────────

type PromptComplexity = "simple" | "complex";

// Keywords that signal a simple, short-output prompt
const SIMPLE_KEYWORDS = [
  "caption", "hashtag", "reply", "quote card", "translate", "poll",
  "thumbnail", "bio", "status", "daily special", "engagement",
];

function classifyComplexity(prompt: string): PromptComplexity {
  const lower = prompt.toLowerCase();
  return SIMPLE_KEYWORDS.some(k => lower.includes(k)) ? "simple" : "complex";
}

// ─── Groq models ──────────────────────────────────────────────────────────────

const GROQ_COMPLEX_MODEL = "llama-3.3-70b-versatile";  // 30 req/min free
const GROQ_SIMPLE_MODEL  = "llama-3.1-8b-instant";     // 30 req/min, very fast

// ─── Gemini models ────────────────────────────────────────────────────────────

const GEMINI_MODEL        = "gemini-1.5-flash";        // 1,500 req/day free
const GEMINI_VISION_MODEL = "gemini-1.5-flash";        // vision capable

// ─── OpenRouter free model cascade ───────────────────────────────────────────

const OPENROUTER_COMPLEX_MODELS = [
  "google/gemini-2.0-flash-exp:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "qwen/qwen2.5-72b-instruct:free",
  "mistralai/mistral-7b-instruct:free",
  "meta-llama/llama-3.1-8b-instruct:free",
] as const;

const OPENROUTER_SIMPLE_MODELS = [
  "mistralai/mistral-7b-instruct:free",
  "meta-llama/llama-3.1-8b-instruct:free",
  "google/gemini-2.0-flash-exp:free",
] as const;

const OPENROUTER_VISION_MODELS = [
  "google/gemini-2.0-flash-exp:free",
  "meta-llama/llama-3.2-11b-vision-instruct:free",
  "qwen/qwen2-vl-7b-instruct:free",
] as const;

// ─── Types ────────────────────────────────────────────────────────────────────

type ChatMessage = { role: "user" | "assistant"; content: string };

export interface CompletionOptions {
  messages: ChatMessage[];
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  json?: boolean;
  cacheKey?: string;
  cacheTtl?: number;
  skipCache?: boolean;
  complexity?: PromptComplexity; // override auto-detection
}

interface CompletionResult {
  text: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  cached?: boolean;
}

// ─── Singletons ───────────────────────────────────────────────────────────────

let _openrouterClient: any = null;
let _groqClient: any = null;
let _geminiClient: any = null;

async function getOpenRouterClient() {
  if (_openrouterClient) return _openrouterClient;
  const { default: OpenAI } = await import("openai");
  _openrouterClient = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY || "dummy-key",
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: {
      "HTTP-Referer": process.env.API_BASE_URL || "https://myna.app",
      "X-Title": "Myna AI Content Studio",
    },
    timeout: 15000,
  });
  return _openrouterClient;
}

async function getGroqClient() {
  if (_groqClient) return _groqClient;
  if (!process.env.GROQ_API_KEY) return null;
  const { default: Groq } = await import("groq-sdk");
  _groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY, timeout: 12000 });
  return _groqClient;
}

async function getGeminiClient() {
  if (_geminiClient) return _geminiClient;
  if (!process.env.GEMINI_API_KEY) return null;
  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  _geminiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  return _geminiClient;
}

// ─── Circuit breaker ──────────────────────────────────────────────────────────

const CIRCUIT_TTL = 300; // 5 minutes

async function isProviderOpen(key: string): Promise<boolean> {
  try { return !(await redis.get(`cb:${key}`)); } catch { return true; }
}

async function tripProvider(key: string): Promise<void> {
  try { await redis.set(`cb:${key}`, "1", "EX", CIRCUIT_TTL); } catch {}
}

// ─── Response cache ───────────────────────────────────────────────────────────

function buildCacheKey(opts: CompletionOptions): string {
  if (opts.cacheKey) return `aicache:${opts.cacheKey}`;
  const payload = JSON.stringify({
    s: opts.systemPrompt,
    m: opts.messages,
    t: Math.round((opts.temperature ?? 0.7) * 10),
    j: opts.json,
  });
  return `aicache:${createHash("md5").update(payload).digest("hex")}`;
}

async function getCached(key: string): Promise<string | null> {
  try { return await redis.get(key); } catch { return null; }
}

async function setCached(key: string, value: string, ttl: number): Promise<void> {
  try { await redis.set(key, value, "EX", ttl); } catch {}
}

// ─── JSON extraction (handles markdown fences) ────────────────────────────────

function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  const start = text.search(/[{[]/);
  if (start !== -1) {
    const end = Math.max(text.lastIndexOf("}"), text.lastIndexOf("]"));
    if (end !== -1 && end > start) return text.slice(start, end + 1);
  }
  return text;
}

// ─── Fallback JSON when all providers fail ────────────────────────────────────

function jsonFallback(): string {
  return JSON.stringify({
    hook: "Something amazing is coming — you won't want to miss this!",
    script: ["Discover what everyone is talking about.", "This changes everything.", "Join thousands who already know."],
    caption: "Exciting news! Stay tuned for something special. Drop a ❤️ if you're ready!",
    hashtags: ["viral", "trending", "content", "socialmedia", "amazing"],
    cta: "Follow for more!",
  });
}

// ─── Provider 1: Groq direct ──────────────────────────────────────────────────

async function tryGroq(
  messages: any[],
  complexity: PromptComplexity,
  opts: CompletionOptions,
): Promise<CompletionResult | null> {
  const cbKey = `groq:${complexity}`;
  if (!(await isProviderOpen(cbKey))) return null;

  const groq = await getGroqClient();
  if (!groq) return null;

  const model = complexity === "simple" ? GROQ_SIMPLE_MODEL : GROQ_COMPLEX_MODEL;

  try {
    const res = await Promise.race([
      groq.chat.completions.create({
        model,
        messages,
        temperature: opts.temperature ?? 0.7,
        max_tokens: opts.maxTokens ?? 2048,
        ...(opts.json ? { response_format: { type: "json_object" } } : {}),
      }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 10000)),
    ]) as any;

    let text = res.choices?.[0]?.message?.content || "";
    if (opts.json) text = extractJson(text);
    if (!text) return null;

    return {
      text,
      provider: `groq/${model}`,
      inputTokens: res.usage?.prompt_tokens || 0,
      outputTokens: res.usage?.completion_tokens || 0,
    };
  } catch (err: any) {
    const isRate = err?.status === 429 || err?.message?.includes("rate");
    if (isRate) await tripProvider(cbKey);
    logger.warn(`Groq failed (${model})`, { err: err?.message });
    return null;
  }
}

// ─── Provider 2: Gemini direct ────────────────────────────────────────────────

async function tryGemini(
  messages: any[],
  opts: CompletionOptions,
  imageBase64?: string,
): Promise<CompletionResult | null> {
  const cbKey = "gemini";
  if (!(await isProviderOpen(cbKey))) return null;

  const genAI = await getGeminiClient();
  if (!genAI) return null;

  try {
    const model = genAI.getGenerativeModel({
      model: imageBase64 ? GEMINI_VISION_MODEL : GEMINI_MODEL,
      generationConfig: {
        temperature: opts.temperature ?? 0.7,
        maxOutputTokens: opts.maxTokens ?? 2048,
        ...(opts.json ? { responseMimeType: "application/json" } : {}),
      },
    });

    // Build prompt from messages
    const systemMsg = messages.find((m: any) => m.role === "system")?.content || "";
    const userMsgs = messages.filter((m: any) => m.role !== "system");
    const fullPrompt = [
      systemMsg,
      ...userMsgs.map((m: any) => m.content),
    ].filter(Boolean).join("\n\n");

    let result: any;
    if (imageBase64) {
      result = await Promise.race([
        model.generateContent([
          fullPrompt,
          { inlineData: { data: imageBase64, mimeType: "image/jpeg" } },
        ]),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 15000)),
      ]);
    } else {
      result = await Promise.race([
        model.generateContent(fullPrompt),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 12000)),
      ]);
    }

    let text = result.response?.text() || "";
    if (opts.json) text = extractJson(text);
    if (!text) return null;

    return {
      text,
      provider: `gemini/${GEMINI_MODEL}`,
      inputTokens: result.response?.usageMetadata?.promptTokenCount || 0,
      outputTokens: result.response?.usageMetadata?.candidatesTokenCount || 0,
    };
  } catch (err: any) {
    const isRate = err?.status === 429 || err?.message?.includes("quota") || err?.message?.includes("rate");
    if (isRate) await tripProvider(cbKey);
    logger.warn("Gemini failed", { err: err?.message });
    return null;
  }
}

// ─── Provider 3: OpenRouter cascade ──────────────────────────────────────────

async function tryOpenRouter(
  messages: any[],
  complexity: PromptComplexity,
  opts: CompletionOptions,
): Promise<CompletionResult | null> {
  const client = await getOpenRouterClient();
  const models = complexity === "simple" ? OPENROUTER_SIMPLE_MODELS : OPENROUTER_COMPLEX_MODELS;

  for (const model of models) {
    const cbKey = `or:${model}`;
    if (!(await isProviderOpen(cbKey))) continue;

    try {
      const res = await Promise.race([
        client.chat.completions.create({
          model,
          messages,
          temperature: opts.temperature ?? 0.7,
          max_tokens: opts.maxTokens ?? 2048,
          ...(opts.json && !model.includes("gemini")
            ? { response_format: { type: "json_object" } }
            : {}),
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 10000)),
      ]) as any;

      let text = res.choices?.[0]?.message?.content || "";
      if (opts.json) text = extractJson(text);
      if (!text) continue;

      return {
        text,
        provider: `openrouter/${model}`,
        inputTokens: res.usage?.prompt_tokens || 0,
        outputTokens: res.usage?.completion_tokens || 0,
      };
    } catch (err: any) {
      const isRate = err?.status === 429 || err?.message?.includes("rate") || err?.message?.includes("quota");
      if (isRate || err?.status === 503 || err?.message?.includes("timeout")) {
        await tripProvider(`or:${model}`);
      }
      logger.warn(`OpenRouter failed (${model})`, { err: err?.message });
    }
  }

  return null;
}

// ─── Main chat function ───────────────────────────────────────────────────────

export async function chat(opts: CompletionOptions): Promise<CompletionResult> {
  // 1. Cache check
  if (!opts.skipCache) {
    const cacheKey = buildCacheKey(opts);
    const cached = await getCached(cacheKey);
    if (cached) {
      return { text: cached, provider: "cache", inputTokens: 0, outputTokens: 0, cached: true };
    }
  }

  const messages: any[] = [];
  if (opts.systemPrompt) messages.push({ role: "system", content: opts.systemPrompt });
  messages.push(...opts.messages);

  const complexity = opts.complexity ?? classifyComplexity(
    opts.messages.map(m => m.content).join(" ")
  );

  // 2. Try providers in order: Groq → Gemini → OpenRouter
  const result =
    await tryGroq(messages, complexity, opts) ||
    await tryGemini(messages, opts) ||
    await tryOpenRouter(messages, complexity, opts);

  if (result) {
    // Cache the result
    if (!opts.skipCache) {
      const cacheKey = buildCacheKey(opts);
      await setCached(cacheKey, result.text, opts.cacheTtl ?? 86400);
    }
    logger.debug("AI response", { provider: result.provider, complexity, cached: false });
    return result;
  }

  // 3. All providers failed — safe fallback, never throws
  logger.error("All AI providers exhausted, using static fallback");
  const fallback = opts.json
    ? jsonFallback()
    : "I couldn't generate content right now. Please try again in a moment! 🙏";
  return { text: fallback, provider: "fallback", inputTokens: 0, outputTokens: 0 };
}

// ─── Vision: describe image ───────────────────────────────────────────────────

const VISION_PROMPT = "Describe this image for marketing content creation. Focus on: main subject, mood, setting, visual style, colors. Be concise (2-3 sentences). Start directly with the description.";

export async function describeImage(base64Image: string, mimeType = "image/jpeg"): Promise<string> {
  // Gemini first — best free vision model
  const geminiResult = await tryGemini(
    [{ role: "user", content: VISION_PROMPT }],
    { messages: [{ role: "user", content: VISION_PROMPT }] },
    base64Image,
  );
  if (geminiResult?.text) return geminiResult.text;

  // OpenRouter vision cascade fallback
  const client = await getOpenRouterClient();
  for (const model of OPENROUTER_VISION_MODELS) {
    const cbKey = `or:${model}`;
    if (!(await isProviderOpen(cbKey))) continue;

    try {
      const res = await Promise.race([
        client.chat.completions.create({
          model,
          messages: [{
            role: "user",
            content: [
              { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Image}` } },
              { type: "text", text: VISION_PROMPT },
            ],
          }],
          max_tokens: 300,
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("vision timeout")), 12000)),
      ]) as any;

      const text = res.choices?.[0]?.message?.content || "";
      if (text) return text;
    } catch (err: any) {
      await tripProvider(cbKey);
      logger.warn(`Vision model failed (${model})`, { err: err?.message });
    }
  }

  return "A compelling visual asset featuring high-quality imagery suitable for social media marketing.";
}

// ─── Speech-to-text ───────────────────────────────────────────────────────────

export async function transcribeAudio(audioPath: string): Promise<string> {
  // Groq Whisper — free, 100 req/min
  if (process.env.GROQ_API_KEY) {
    try {
      const { default: Groq } = await import("groq-sdk");
      const fs = await import("fs");
      const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
      const transcription = await groq.audio.transcriptions.create({
        file: fs.createReadStream(audioPath) as any,
        model: "whisper-large-v3-turbo",
      });
      return transcription.text || "";
    } catch (err) {
      logger.warn("Groq Whisper failed", { err: (err as Error).message });
    }
  }

  // Local Whisper CLI fallback
  try {
    const { execSync } = await import("child_process");
    const path = await import("path");
    const fs = await import("fs");
    execSync(`whisper "${audioPath}" --model base --output_format txt --output_dir /tmp`, { timeout: 60000 });
    const base = path.basename(audioPath, path.extname(audioPath));
    const txtPath = `/tmp/${base}.txt`;
    return fs.existsSync(txtPath) ? fs.readFileSync(txtPath, "utf8").trim() : "";
  } catch {
    return "";
  }
}

// ─── Text-to-speech ───────────────────────────────────────────────────────────

export async function synthesizeSpeech(text: string, outputPath: string): Promise<void> {
  const { execSync } = await import("child_process");
  const piperModel = process.env.PIPER_MODEL || "/opt/piper/models/en_US-lessac-medium.onnx";
  const safe = text.replace(/'/g, " ").replace(/"/g, " ").slice(0, 500);

  // Piper TTS — local, unlimited, zero cost
  try {
    execSync(`echo '${safe}' | piper --model ${piperModel} --output_file '${outputPath}'`, { timeout: 30000 });
    return;
  } catch {
    logger.warn("Piper TTS unavailable");
  }

  // Edge TTS — Microsoft, free, no API key
  try {
    execSync(`edge-tts --text "${safe}" --write-media "${outputPath}" --voice en-US-AriaNeural`, { timeout: 30000 });
    return;
  } catch {
    logger.warn("Edge TTS unavailable");
  }

  // Silence fallback so FFmpeg doesn't crash
  const fs = await import("fs");
  if (!fs.existsSync(outputPath)) {
    execSync(`ffmpeg -f lavfi -i anullsrc=r=44100:cl=stereo -t 5 -q:a 9 -acodec libmp3lame '${outputPath}' -y 2>/dev/null || true`);
  }
}

// ─── Stock media ──────────────────────────────────────────────────────────────

export async function searchStockVideo(query: string, orientation = "portrait"): Promise<string | null> {
  if (!process.env.PEXELS_API_KEY) return null;
  try {
    const { default: axios } = await import("axios");
    const res = await axios.get("https://api.pexels.com/videos/search", {
      headers: { Authorization: process.env.PEXELS_API_KEY },
      params: { query, per_page: 5, orientation },
      timeout: 8000,
    });
    const videos = res.data?.videos;
    if (!videos?.length) return null;
    const video = videos[Math.floor(Math.random() * Math.min(videos.length, 3))];
    const file = video.video_files?.find((f: any) => f.quality === "hd") || video.video_files?.[0];
    return file?.link || null;
  } catch {
    return null;
  }
}

export async function searchBackgroundMusic(query: string): Promise<string | null> {
  if (!process.env.PIXABAY_API_KEY) return null;
  try {
    const { default: axios } = await import("axios");
    const res = await axios.get("https://pixabay.com/api/music/", {
      params: { key: process.env.PIXABAY_API_KEY, q: query, category: "music", per_page: 5 },
      timeout: 8000,
    });
    const hits = res.data?.hits;
    if (!hits?.length) return null;
    return hits[Math.floor(Math.random() * Math.min(hits.length, 3))].audio || null;
  } catch {
    return null;
  }
}
