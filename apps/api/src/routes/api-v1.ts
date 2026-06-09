import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";
import { videoQueue } from "../queues";
import { logger } from "../lib/logger";

export const apiV1Router = Router();

// API key auth (Agency tier only)
function requireApiKey(req: Request & { userId?: string }, res: Response, next: any) {
  const apiKey = req.headers["x-api-key"] as string;
  if (!apiKey) return res.status(401).json({ error: "Missing X-API-Key header" });

  try {
    const decoded = jwt.verify(apiKey, process.env.JWT_SECRET!) as { userId: string; tier: string };
    if (!["AGENCY", "PRO"].includes(decoded.tier)) {
      return res.status(403).json({ error: "API access requires Pro or Agency plan" });
    }
    req.userId = decoded.userId;
    next();
  } catch {
    res.status(401).json({ error: "Invalid API key" });
  }
}

// POST /v1/content/generate
apiV1Router.post("/content/generate", requireApiKey, async (req: Request & { userId?: string }, res: Response) => {
  const { workspace_type, input_type, prompt, content_type, audio_type, style } = req.body;

  if (!workspace_type || !content_type) {
    return res.status(400).json({ error: "workspace_type and content_type are required" });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return res.status(404).json({ error: "User not found" });

    const job = await videoQueue.add("generate-video", {
      phone: user.phone,
      userId: user.id,
      workspaceType: workspace_type,
      contentType: content_type,
      inputType: input_type || "text",
      prompt,
      audioType: audio_type || "NONE",
      style,
    });

    res.json({
      job_id: job.id,
      status: "queued",
      estimated_seconds: 60,
      webhook: null,
    });
  } catch (err) {
    logger.error("API v1 generate error", { err: (err as Error).message });
    res.status(500).json({ error: "Failed to enqueue job" });
  }
});

// GET /v1/content/:jobId
apiV1Router.get("/content/:jobId", requireApiKey, async (req: Request & { userId?: string }, res: Response) => {
  const content = await prisma.generatedContent.findFirst({
    where: { jobId: req.params.jobId, userId: req.userId },
  });

  if (!content) return res.status(404).json({ error: "Not found" });

  res.json({
    job_id: req.params.jobId,
    status: content.jobStatus,
    video_url: content.videoUrl,
    thumbnail_url: content.thumbnailUrl,
    caption: content.caption,
    hashtags: content.hashtags,
    hook: content.hook,
    created_at: content.createdAt,
  });
});

// POST /v1/schedule
apiV1Router.post("/schedule", requireApiKey, async (req: Request & { userId?: string }, res: Response) => {
  const { content_id, platform, scheduled_at } = req.body;

  if (!content_id || !platform || !scheduled_at) {
    return res.status(400).json({ error: "content_id, platform, and scheduled_at are required" });
  }

  const scheduledPost = await prisma.scheduledPost.create({
    data: {
      userId: req.userId!,
      contentId: content_id,
      platform: platform.toUpperCase(),
      scheduledAt: new Date(scheduled_at),
      status: "SCHEDULED",
    },
  });

  res.json({ scheduled_post_id: scheduledPost.id, scheduled_at: scheduledPost.scheduledAt });
});

// GET /v1/account
apiV1Router.get("/account", requireApiKey, async (req: Request & { userId?: string }, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { id: true, subscriptionTier: true, videosThisMonth: true, videoQuota: true },
  });
  res.json(user);
});
