import express, { Request, Response, NextFunction } from "express";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { videoQueue, aiQueue, scrapingQueue, postingQueue } from "../queues";
import { prisma } from "../lib/prisma";
import { logger } from "../lib/logger";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import * as wa from "../services/whatsapp.service";
import nodemailer from "nodemailer";

export const adminRouter = express.Router();

// ─── BullMQ queue board (basic HTTP auth) ─────────────────────────────────────

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/admin/queues");
createBullBoard({
  queues: [
    new BullMQAdapter(videoQueue) as any,
    new BullMQAdapter(aiQueue) as any,
    new BullMQAdapter(scrapingQueue) as any,
    new BullMQAdapter(postingQueue) as any,
  ],
  serverAdapter,
});

adminRouter.use("/queues", (req: Request, res: Response, next: NextFunction) => {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return next();
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Basic ")) {
    res.setHeader("WWW-Authenticate", 'Basic realm="Myna Admin"');
    return res.status(401).send("Authentication required");
  }
  const credentials = Buffer.from(auth.slice(6), "base64").toString("utf8");
  const [, password] = credentials.split(":");
  if (password !== adminPassword) {
    res.setHeader("WWW-Authenticate", 'Basic realm="Myna Admin"');
    return res.status(401).send("Invalid credentials");
  }
  next();
}, serverAdapter.getRouter());

// ─── JWT auth middleware for admin API ────────────────────────────────────────

function adminJwt(req: Request & { adminId?: string }, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "No token" });
  try {
    const payload = jwt.verify(token, process.env.ADMIN_JWT_SECRET!) as any;
    req.adminId = payload.id;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

// ─── POST /admin/auth/login ────────────────────────────────────────────────────

adminRouter.post("/auth/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password required" });

  const admin = await prisma.adminUser.findUnique({ where: { email } });
  if (!admin) return res.status(401).json({ error: "Invalid credentials" });

  const valid = await bcrypt.compare(password, admin.passwordHash);
  if (!valid) return res.status(401).json({ error: "Invalid credentials" });

  await prisma.adminUser.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } });

  const token = jwt.sign(
    { id: admin.id, email: admin.email, role: admin.role },
    process.env.ADMIN_JWT_SECRET!,
    { expiresIn: "24h" }
  );
  res.json({ token, name: admin.name, role: admin.role });
});

// ─── POST /admin/auth/seed ─────────────────────────────────────────────────────
// One-time seed to create the first admin. Disabled once any admin exists.

adminRouter.post("/auth/seed", async (req: Request, res: Response) => {
  const count = await prisma.adminUser.count();
  if (count > 0) return res.status(403).json({ error: "Admin already seeded" });

  const { email, password, name } = req.body;
  if (!email || !password) return res.status(400).json({ error: "email and password required" });

  const passwordHash = await bcrypt.hash(password, 12);
  const admin = await prisma.adminUser.create({ data: { email, passwordHash, name: name || "Admin" } });
  res.json({ id: admin.id, email: admin.email });
});

// ─── All routes below require JWT ─────────────────────────────────────────────

adminRouter.use("/api", adminJwt as any);

// ─── GET /admin/api/stats ─────────────────────────────────────────────────────

adminRouter.get("/api/stats", async (_req: Request, res: Response) => {
  const [totalUsers, freeUsers, growthUsers, unlimitedUsers, blockedUsers, todaySignups, totalVideos] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { subscriptionTier: "FREE" } }),
    prisma.user.count({ where: { subscriptionTier: "GROWTH" } }),
    prisma.user.count({ where: { subscriptionTier: "UNLIMITED" } }),
    prisma.user.count({ where: { isBlocked: true } }),
    prisma.user.count({ where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } }),
    prisma.generatedContent.count({ where: { jobStatus: "COMPLETED" } }),
  ]);

  const queueCounts = await Promise.all([
    videoQueue.getJobCounts("waiting", "active", "failed"),
    aiQueue.getJobCounts("waiting", "active", "failed"),
  ]);

  res.json({
    users: { total: totalUsers, free: freeUsers, growth: growthUsers, unlimited: unlimitedUsers, blocked: blockedUsers, todaySignups },
    videos: { total: totalVideos },
    queues: { video: queueCounts[0], ai: queueCounts[1] },
  });
});

// ─── GET /admin/api/users ─────────────────────────────────────────────────────

adminRouter.get("/api/users", async (req: Request, res: Response) => {
  const { search, tier, blocked, page = "1", limit = "50" } = req.query as Record<string, string>;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where: any = {};
  if (search) where.OR = [
    { phone: { contains: search } },
    { name: { contains: search, mode: "insensitive" } },
    { email: { contains: search, mode: "insensitive" } },
  ];
  if (tier) where.subscriptionTier = tier;
  if (blocked === "true") where.isBlocked = true;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: "desc" },
      select: {
        id: true, phone: true, name: true, email: true,
        subscriptionTier: true, subscriptionValidUntil: true,
        videosThisMonth: true, totalGenerations: true, videoQuota: true,
        isBlocked: true, blockReason: true, adminNotes: true,
        createdAt: true,
        workspace: { select: { type: true, businessName: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  res.json({ users, total, page: parseInt(page), limit: parseInt(limit) });
});

// ─── GET /admin/api/users/:id ─────────────────────────────────────────────────

adminRouter.get("/api/users/:id", async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    include: {
      workspace: { include: { brandProfile: true } },
      generatedContent: { orderBy: { createdAt: "desc" }, take: 10, select: { id: true, contentType: true, jobStatus: true, createdAt: true, videoUrl: true } },
      whatsappMessages: { orderBy: { createdAt: "desc" }, take: 20, select: { id: true, direction: true, textBody: true, createdAt: true } },
    },
  });
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(user);
});

// ─── POST /admin/api/users/:id/block ─────────────────────────────────────────

adminRouter.post("/api/users/:id/block", async (req: Request, res: Response) => {
  const { reason } = req.body;
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { isBlocked: true, blockReason: reason || "Blocked by admin" },
  });
  if (user.phone) {
    await wa.sendText(user.phone,
      `⛔ Your account has been suspended.\n\nReason: ${reason || "Policy violation."}\n\nContact support if you believe this is an error.`
    ).catch(() => {});
  }
  logger.info("Admin blocked user", { userId: user.id, reason });
  res.json({ success: true });
});

// ─── POST /admin/api/users/:id/unblock ───────────────────────────────────────

adminRouter.post("/api/users/:id/unblock", async (req: Request, res: Response) => {
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { isBlocked: false, blockReason: null },
  });
  if (user.phone) {
    await wa.sendText(user.phone, `✅ Your account has been reinstated. Welcome back!`).catch(() => {});
  }
  logger.info("Admin unblocked user", { userId: user.id });
  res.json({ success: true });
});

// ─── PATCH /admin/api/users/:id/tier ─────────────────────────────────────────

adminRouter.patch("/api/users/:id/tier", async (req: Request, res: Response) => {
  const { tier } = req.body;
  if (!["FREE", "GROWTH", "UNLIMITED"].includes(tier)) {
    return res.status(400).json({ error: "Invalid tier. Use FREE, GROWTH, or UNLIMITED." });
  }
  const quotaMap: Record<string, number> = { FREE: 1, GROWTH: 30, UNLIMITED: -1 };
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: {
      subscriptionTier: tier as any,
      videoQuota: quotaMap[tier],
      ...(tier !== "FREE" ? { subscriptionValidUntil: new Date(Date.now() + 366 * 24 * 60 * 60 * 1000) } : { subscriptionValidUntil: null }),
    },
  });
  if (user.phone) {
    const msg = tier === "FREE"
      ? `⚠️ Your plan has been changed to Free. Reply *UPGRADE* to see paid plans.`
      : `✅ Your plan has been updated to *${tier === "UNLIMITED" ? "Unlimited" : "Growth"}*. Enjoy!`;
    await wa.sendText(user.phone, msg).catch(() => {});
  }
  logger.info("Admin changed user tier", { userId: user.id, tier });
  res.json({ success: true, tier });
});

// ─── PATCH /admin/api/users/:id/notes ────────────────────────────────────────

adminRouter.patch("/api/users/:id/notes", async (req: Request, res: Response) => {
  const { notes } = req.body;
  await prisma.user.update({ where: { id: req.params.id }, data: { adminNotes: notes } });
  res.json({ success: true });
});

// ─── Email campaigns ──────────────────────────────────────────────────────────

function getMailTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

// POST /admin/api/email/campaigns
adminRouter.post("/api/email/campaigns", async (req: Request, res: Response) => {
  const { subject, body, targetTier, targetCategory } = req.body;
  if (!subject || !body) return res.status(400).json({ error: "subject and body required" });
  const campaign = await prisma.emailCampaign.create({
    data: { subject, body, targetTier: targetTier || null, targetCategory: targetCategory || null },
  });
  res.json(campaign);
});

// GET /admin/api/email/campaigns
adminRouter.get("/api/email/campaigns", async (_req: Request, res: Response) => {
  const campaigns = await prisma.emailCampaign.findMany({ orderBy: { createdAt: "desc" } });
  res.json(campaigns);
});

// POST /admin/api/email/campaigns/:id/send
adminRouter.post("/api/email/campaigns/:id/send", async (req: Request, res: Response) => {
  const campaign = await prisma.emailCampaign.findUnique({ where: { id: req.params.id } });
  if (!campaign) return res.status(404).json({ error: "Campaign not found" });
  if (campaign.status === "SENT") return res.status(400).json({ error: "Already sent" });

  const where: any = { email: { not: null } };
  if (campaign.targetTier) where.subscriptionTier = campaign.targetTier;
  if (campaign.targetCategory) where.pricingCategory = campaign.targetCategory;

  const users = await prisma.user.findMany({ where, select: { email: true, name: true } });
  const transport = getMailTransport();

  let sentCount = 0;
  for (const user of users) {
    if (!user.email) continue;
    try {
      await transport.sendMail({
        from: process.env.SMTP_FROM || "Myna <hello@myna.app>",
        to: user.email,
        subject: campaign.subject,
        html: campaign.body.replace(/\{\{name\}\}/g, user.name || "there"),
      });
      sentCount++;
    } catch (err) {
      logger.warn("Email send failed", { email: user.email, err: (err as Error).message });
    }
  }

  await prisma.emailCampaign.update({
    where: { id: campaign.id },
    data: { status: "SENT", sentAt: new Date(), sentCount },
  });
  logger.info("Email campaign sent", { campaignId: campaign.id, sentCount });
  res.json({ success: true, sentCount });
});

// ─── POST /admin/api/users/:id/message ───────────────────────────────────────
// Send a direct WhatsApp message to a user from admin

adminRouter.post("/api/users/:id/message", async (req: Request, res: Response) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "text required" });
  const user = await prisma.user.findUnique({ where: { id: req.params.id }, select: { phone: true } });
  if (!user?.phone) return res.status(404).json({ error: "User not found or no phone" });
  await wa.sendText(user.phone, text);
  res.json({ success: true });
});
