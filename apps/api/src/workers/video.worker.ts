import { Worker, Job } from "bullmq";
import path from "path";
import fs from "fs";
import axios from "axios";
import { v4 as uuid } from "uuid";
import { createRedisConnection } from "../lib/redis";
import { prisma } from "../lib/prisma";
import { logger } from "../lib/logger";
import { generateVideo, generatePreviewVideo, extractFrames, transcodeForWhatsApp, VideoSegment, generateQuoteCard, generateThumbnailImage } from "../services/ffmpeg.service";
import { describeImage, searchStockVideo, searchBackgroundMusic, synthesizeSpeech } from "../services/ai.service";
import { generateContentScript } from "../services/content-generator.service";
import { uploadFile, cleanupTempDir } from "../services/storage.service";
import { sendPreview } from "../services/whatsapp-flow.service";
import * as wa from "../services/whatsapp.service";
import { WORKSPACE_MUSIC_GENRES } from "../templates/prompts";
import { checkUserQuota, recordGeneration } from "../middleware/quota";

export interface VideoJobData {
  phone: string;
  userId: string;
  workspaceType: string;
  contentType: string;
  inputType: "image" | "video" | "text" | "audio" | "url";
  mediaId?: string;
  prompt?: string;
  sourceUrl?: string;
  audioType: "BACKGROUND_MUSIC" | "AI_VOICEOVER" | "USER_VOICE" | "NONE";
  audioId?: string;
  style?: string;
  iteration?: number;
  parentContentId?: string;
  bulkIndex?: number;
  bulkTotal?: number;
  language?: string;
  // Quote card
  quoteText?: string;
  quoteAuthor?: string;
  quoteStyle?: string;
  // Thumbnail
  thumbnailTitle?: string;
  thumbnailSubtitle?: string;
  thumbnailStyle?: string;
}

const TEMP_DIR = process.env.TEMP_DIR || "./storage/temp";

// ─── Music pool: curated Pixabay tracks cached per workspace ──────────────────

const MUSIC_POOL: Record<string, string[]> = {};

export async function prefetchMusicPool(): Promise<void> {
  const poolDir = path.join(TEMP_DIR, "music_pool");
  fs.mkdirSync(poolDir, { recursive: true });

  const musicQueries: Record<string, string[]> = {
    RESTAURANT:        ["acoustic upbeat food", "happy cooking background"],
    REAL_ESTATE:       ["elegant luxury cinematic", "calm piano ambient"],
    ECOMMERCE:         ["upbeat commercial trendy", "energetic shopping pop"],
    CREATOR:           ["viral trending upbeat", "motivational energetic"],
    BUSINESS_SERVICES: ["corporate professional", "motivational business"],
    EVENTS:            ["celebration party upbeat", "hype energetic crowd"],
    EDUCATION:         ["calm focus study", "inspirational learning"],
    PERSONAL:          ["warm emotional cinematic", "soft acoustic heartwarming"],
    FITNESS_GYM:       ["high energy workout pump", "motivational gym training"],
    SALON_SPA:         ["relaxing spa ambient", "calm beauty wellness"],
    FASHION:           ["stylish trendy fashion pop", "upbeat runway"],
    TRAVEL:            ["adventure travel cinematic", "wanderlust upbeat"],
    HEALTHCARE:        ["calm clinical ambient", "trust medical soft"],
    AUTOMOBILE:        ["powerful car driving cinematic", "energetic automotive"],
    PHOTOGRAPHY:       ["creative artistic ambient", "cinematic emotional photography"],
    INTERIOR_DESIGN:   ["elegant interior ambient", "modern design calm"],
    HOTEL:             ["luxury hotel lounge ambient", "warm hospitality piano"],
    JEWELRY:           ["elegant luxury jewelry cinematic", "romantic soft piano"],
  };

  await Promise.allSettled(
    Object.entries(musicQueries).map(async ([workspace, queries]) => {
      for (const query of queries) {
        try {
          const url = await searchBackgroundMusic(query);
          if (!url) continue;
          const dest = path.join(poolDir, `${workspace}_${uuid()}.mp3`);
          await downloadFile(url, dest);
          if (!MUSIC_POOL[workspace]) MUSIC_POOL[workspace] = [];
          MUSIC_POOL[workspace].push(dest);
          if (MUSIC_POOL[workspace].length >= 3) break; // 3 tracks per workspace
        } catch {
          // non-fatal
        }
      }
    })
  );
  logger.info("Music pool ready", { total: Object.values(MUSIC_POOL).flat().length });
}

function getMusicFromPool(workspaceType: string): string | null {
  const pool = MUSIC_POOL[workspaceType];
  if (!pool?.length) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

// ─── Stock footage pool: 5 clips per workspace pre-fetched at startup ─────────

const STOCK_POOL: Record<string, string[]> = {};
const STOCK_QUERIES: Record<string, string> = {
  RESTAURANT:        "food restaurant cooking",
  REAL_ESTATE:       "house property modern interior",
  ECOMMERCE:         "shopping product lifestyle",
  CREATOR:           "content creator lifestyle",
  BUSINESS_SERVICES: "business office professional",
  EVENTS:            "event celebration party",
  EDUCATION:         "learning education study",
  PERSONAL:          "family lifestyle heartwarming",
  FITNESS_GYM:       "gym fitness workout training",
  SALON_SPA:         "beauty salon spa hair treatment",
  FASHION:           "fashion clothing style outfit",
  TRAVEL:            "travel destination nature landscape",
  HEALTHCARE:        "healthcare doctor clinic medical",
  AUTOMOBILE:        "car vehicle driving road",
  PHOTOGRAPHY:       "camera photography portrait studio",
  INTERIOR_DESIGN:   "interior design furniture modern room",
  HOTEL:             "hotel luxury resort pool",
  JEWELRY:           "jewelry gold diamond luxury close-up",
};

export async function prefetchStockPool(): Promise<void> {
  logger.info("Prefetching stock footage pool...");
  const poolDir = path.join(TEMP_DIR, "stock_pool");
  fs.mkdirSync(poolDir, { recursive: true });

  await Promise.allSettled(
    Object.entries(STOCK_QUERIES).map(async ([workspace, query]) => {
      try {
        const stockUrl = await searchStockVideo(query);
        if (!stockUrl) return;
        const dest = path.join(poolDir, `${workspace}_${uuid()}.mp4`);
        await downloadFile(stockUrl, dest);
        if (!STOCK_POOL[workspace]) STOCK_POOL[workspace] = [];
        STOCK_POOL[workspace].push(dest);
      } catch (err) {
        logger.warn("Failed to prefetch stock", { workspace, err: (err as Error).message });
      }
    })
  );
  logger.info("Stock pool ready", { total: Object.values(STOCK_POOL).flat().length });
}

function getFromPool(workspaceType: string): string | null {
  const pool = STOCK_POOL[workspaceType];
  if (!pool?.length) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

// Return up to N distinct clips from the pool (or fewer if pool is small)
function getMultipleFromPool(workspaceType: string, count: number): string[] {
  const pool = STOCK_POOL[workspaceType];
  if (!pool?.length) return [];
  if (pool.length <= count) return [...pool];
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// ─── Worker ───────────────────────────────────────────────────────────────────

export const videoWorker = new Worker<VideoJobData>(
  "video-generation",
  async (job: Job<VideoJobData>) => {
    const data = job.data;
    const jobTempDir = path.join(TEMP_DIR, `job_${job.id}`);
    fs.mkdirSync(jobTempDir, { recursive: true });

    logger.info("Video job started", { jobId: job.id, phone: data.phone });

    const user = await prisma.user.findUnique({
      where: { id: data.userId },
      include: { workspace: true },
    });

    // Quota + block check
    const webUrl = process.env.NEXT_PUBLIC_WEB_URL || "https://myna.app";
    const quota = await checkUserQuota(data.userId, webUrl);
    if (!quota.allowed) return;

    // ── Quote card shortcut (image, no video pipeline) ────────────────────────
    if (data.contentType === "QUOTE_CARD" && data.quoteText) {
      const outPath = path.join(TEMP_DIR, `quote_${uuid()}.jpg`);
      try {
        await generateQuoteCard(data.quoteText, data.quoteAuthor || "", data.quoteStyle || "minimal_dark", outPath);
        const imageKey = `quote_${uuid()}.jpg`;
        const imageUrl = await uploadFile(outPath, imageKey, "image/jpeg");
        await prisma.generatedContent.create({
          data: { userId: data.userId, contentType: "POST" as any, jobStatus: "COMPLETED", caption: data.quoteText, videoUrl: imageUrl, thumbnailUrl: imageUrl, jobId: job.id },
        });
        await wa.sendMedia(data.phone, "image", imageUrl, `💬 *Your Quote Card*\n\n${data.quoteText}\n\n📲 Save and share!`);
        await recordGeneration(data.userId).catch(() => {});
        return;
      } catch (err) {
        await wa.sendText(data.phone, "⚠️ Couldn't generate quote card. Please try again.");
        return;
      } finally {
        if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
      }
    }

    // ── Thumbnail shortcut (image, no video pipeline) ─────────────────────────
    if (data.contentType === "THUMBNAIL" && data.thumbnailTitle) {
      const outPath = path.join(TEMP_DIR, `thumb_${uuid()}.jpg`);
      try {
        await generateThumbnailImage(data.thumbnailTitle, data.thumbnailSubtitle || "", data.thumbnailStyle || "dark_pro", outPath);
        const imageKey = `thumbnail_${uuid()}.jpg`;
        const imageUrl = await uploadFile(outPath, imageKey, "image/jpeg");
        await prisma.generatedContent.create({
          data: { userId: data.userId, contentType: "POST" as any, jobStatus: "COMPLETED", caption: data.thumbnailTitle, videoUrl: imageUrl, thumbnailUrl: imageUrl, jobId: job.id },
        });
        await wa.sendMedia(data.phone, "image", imageUrl, `🖼️ *Your Thumbnail*\n\n${data.thumbnailTitle}\n\n📲 Save and use it!`);
        await recordGeneration(data.userId).catch(() => {});
        return;
      } catch (err) {
        await wa.sendText(data.phone, "⚠️ Couldn't generate thumbnail. Please try again.");
        return;
      } finally {
        if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
      }
    }

    const contentRecord = await prisma.generatedContent.create({
      data: {
        userId: data.userId,
        contentType: data.contentType as any,
        jobStatus: "PROCESSING",
        jobId: job.id,
        audioType: data.audioType as any,
        aspectRatio: "PORTRAIT_9_16",
        style: data.style,
        iteration: data.iteration || 1,
        parentId: data.parentContentId,
      },
    });

    try {
      await job.updateProgress(10);

      // ── 1. Get source media ────────────────────────────────────────────────
      let mediaDescription = "";
      let localMediaPath: string | null = null;
      const segments: VideoSegment[] = [];

      if (data.inputType === "image" && data.mediaId) {
        localMediaPath = await downloadWhatsAppMedia(data.mediaId, jobTempDir);
        const imageBase64 = fs.readFileSync(localMediaPath).toString("base64");
        mediaDescription = await describeImage(imageBase64).catch(
          () => `${data.workspaceType.replace(/_/g, " ")} marketing image`
        );
        segments.push({ imagePath: localMediaPath, duration: 5 });

        await prisma.mediaUpload.create({
          data: { userId: data.userId, whatsappMediaId: data.mediaId, localPath: localMediaPath, mimeType: "image/jpeg", caption: mediaDescription },
        });

      } else if (data.inputType === "video" && data.mediaId) {
        localMediaPath = await downloadWhatsAppMedia(data.mediaId, jobTempDir);
        const frames = await extractFrames(localMediaPath, 2);
        const frameBase64 = fs.readFileSync(frames[0]).toString("base64");
        mediaDescription = await describeImage(frameBase64).catch(() => `${data.workspaceType} video`);
        segments.push({ videoPath: localMediaPath, duration: 15 });

      } else {
        mediaDescription = data.prompt || `${data.workspaceType} marketing content`;

        // Build a 3-clip multi-segment reel (5s each = 15s total with xfade transitions)
        const TARGET_CLIPS = 3;
        const CLIP_DURATION = 5;

        // 1. Seed from the pre-fetched pool
        const poolClips = getMultipleFromPool(data.workspaceType, TARGET_CLIPS)
          .filter(p => fs.existsSync(p));

        const clipPaths: string[] = [...poolClips];

        // 2. Top up from Pexels if pool didn't have enough
        if (clipPaths.length < TARGET_CLIPS) {
          const baseQuery = STOCK_QUERIES[data.workspaceType] || "business";
          const fallbackQueries = [baseQuery, `${baseQuery} lifestyle`, `${baseQuery} product`];
          for (const query of fallbackQueries) {
            if (clipPaths.length >= TARGET_CLIPS) break;
            try {
              const url = await searchStockVideo(query);
              if (!url) continue;
              const dest = path.join(jobTempDir, `stock_${clipPaths.length}.mp4`);
              await downloadFile(url, dest);
              clipPaths.push(dest);
            } catch { /* non-fatal */ }
          }
        }

        // 3. Build segments — fall back to gradient image if no clips found
        if (clipPaths.length > 0) {
          clipPaths.forEach(p => segments.push({ videoPath: p, duration: CLIP_DURATION }));
        } else {
          segments.push({ imagePath: await createGradientImage(data.workspaceType, jobTempDir), duration: 15 });
        }
      }

      await job.updateProgress(30);

      // ── 2. Parallel: script + music download ──────────────────────────────
      const genre = WORKSPACE_MUSIC_GENRES[data.workspaceType] || "upbeat";

      const [generated, musicPath] = await Promise.all([
        generateContentScript({ workspaceType: data.workspaceType, contentType: data.contentType, mediaDescription, style: data.style, userPrompt: data.prompt, language: data.language }),
        data.audioType === "BACKGROUND_MUSIC"
          ? Promise.resolve(
              getMusicFromPool(data.workspaceType) ||
              // Pool miss: fall back to live download
              await searchBackgroundMusic(genre).then(url => url ? downloadFile(url, path.join(jobTempDir, `music.mp3`)) : null).catch(() => null)
            )
          : Promise.resolve(null),
      ]);

      // Voiceover needs the script text — runs after script gen
      let audioPath: string | null = musicPath;
      if (data.audioType === "AI_VOICEOVER") {
        const voicePath = path.join(jobTempDir, `voice.wav`);
        await synthesizeSpeech(generated.script, voicePath).catch(() => {});
        audioPath = fs.existsSync(voicePath) ? voicePath : null;
      }

      await job.updateProgress(55);

      // ── Phase A: 480p preview → send to WhatsApp now (≈15s total) ─────────
      const previewPath = path.join(jobTempDir, "preview_wa.mp4");
      await generatePreviewVideo({
        segments,
        audioPath: audioPath ?? undefined,
        subtitleText: generated.hook,
        aspectRatio: "9:16",
        brandColor: user?.workspace?.primaryColor || "#ffffff",
        outputPath: previewPath,
      });

      const previewKey = `preview_${uuid()}.mp4`;
      const previewUrl = await uploadFile(previewPath, previewKey, "video/mp4");

      await prisma.generatedContent.update({
        where: { id: contentRecord.id },
        data: { hook: generated.hook, script: generated.script, caption: generated.caption, hashtags: generated.hashtags, callToAction: generated.cta, postVariants: generated.postVariants, videoUrl: previewUrl },
      });

      const bulkLabel = data.bulkIndex ? ` (Variation ${data.bulkIndex}/${data.bulkTotal || 3})` : "";
      await sendPreview(data.phone, contentRecord.id, previewUrl, generated.caption + bulkLabel);
      await job.updateProgress(75);

      // ── Phase B: Full 1080p (runs while user reviews preview) ─────────────
      const watermarkPath = getWatermarkPath(user);

      const result = await generateVideo({
        segments,
        audioPath: audioPath ?? undefined,
        audioVolume: 0.7,
        subtitleText: generated.caption.slice(0, 150),
        subtitleStyle: (data.style as any) || "modern",
        watermarkPath,
        aspectRatio: "9:16",
        brandColor: user?.workspace?.primaryColor || "#ffffff",
      });

      const waPath = await transcodeForWhatsApp(result.outputPath);
      const videoKey = `video_${uuid()}.mp4`;
      const thumbKey = `thumb_${uuid()}.jpg`;

      const [videoUrl, thumbUrl] = await Promise.all([
        uploadFile(waPath, videoKey, "video/mp4"),
        uploadFile(result.thumbnailPath, thumbKey, "image/jpeg"),
      ]);

      await prisma.generatedContent.update({
        where: { id: contentRecord.id },
        data: { jobStatus: "COMPLETED", videoPath: waPath, videoUrl, thumbnailUrl: thumbUrl, durationSeconds: result.durationSeconds, voiceoverText: data.audioType === "AI_VOICEOVER" ? generated.script : undefined },
      });

      await recordGeneration(data.userId).catch(() => {});

      await job.updateProgress(100);
      logger.info("Video job completed", { jobId: job.id, contentId: contentRecord.id });

    } catch (err) {
      await prisma.generatedContent.update({
        where: { id: contentRecord.id },
        data: { jobStatus: "FAILED", jobError: (err as Error).message },
      });
      throw err;
    } finally {
      cleanupTempDir(jobTempDir);
    }
  },
  {
    connection: createRedisConnection(),
    concurrency: 2,
    limiter: { max: 10, duration: 60000 },
  }
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getWatermarkPath(user: any): string | undefined {
  if (user?.workspace?.watermarkUrl) return user.workspace.watermarkUrl;
  if (user?.subscriptionTier === "FREE") {
    const p = path.join(process.cwd(), "assets", "watermark.png");
    return fs.existsSync(p) ? p : undefined;
  }
  return undefined;
}

async function downloadWhatsAppMedia(mediaId: string, tempDir: string): Promise<string> {
  const { data: meta } = await axios.get(`https://graph.facebook.com/v19.0/${mediaId}`, {
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}` },
  });
  const { data } = await axios.get(meta.url, {
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}` },
    responseType: "arraybuffer",
  });
  const ext = meta.mime_type?.split("/")[1] || "jpg";
  const localPath = path.join(tempDir, `upload.${ext}`);
  fs.writeFileSync(localPath, Buffer.from(data));
  return localPath;
}

async function downloadFile(url: string, dest: string): Promise<string> {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const { data } = await axios.get(url, { responseType: "arraybuffer", timeout: 30000 });
  fs.writeFileSync(dest, Buffer.from(data));
  return dest;
}

async function createGradientImage(workspaceType: string, tempDir: string): Promise<string> {
  const sharp = (await import("sharp")).default;
  const colors: Record<string, [number, number, number]> = {
    RESTAURANT:        [255, 99,  71],  REAL_ESTATE:     [70,  130, 180],
    ECOMMERCE:         [147, 112, 219], CREATOR:         [255, 165, 0  ],
    BUSINESS_SERVICES: [60,  60,  60],  EVENTS:          [220, 20,  60 ],
    EDUCATION:         [34,  139, 34],  PERSONAL:        [236, 72,  153],
    FITNESS_GYM:       [255, 69,  0  ], SALON_SPA:       [218, 165, 195],
    FASHION:           [30,  30,  30 ], TRAVEL:          [0,   153, 204],
    HEALTHCARE:        [0,   128, 128], AUTOMOBILE:      [45,  45,  45 ],
    PHOTOGRAPHY:       [20,  20,  20 ], INTERIOR_DESIGN: [139, 119, 101],
    HOTEL:             [180, 140, 90 ], JEWELRY:         [184, 134, 11 ],
  };
  const [r, g, b] = colors[workspaceType] || [100, 100, 100];
  const outPath = path.join(tempDir, `gradient.jpg`);
  await sharp({ create: { width: 1080, height: 1920, channels: 3, background: { r, g, b } } }).jpeg().toFile(outPath);
  return outPath;
}
