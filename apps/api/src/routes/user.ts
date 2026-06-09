import { Router, Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";

export const userRouter = Router();

// ── Auth middleware ────────────────────────────────────────────────────────────
function auth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    (req as any).userId = payload.userId;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

userRouter.get("/me", auth, async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: (req as any).userId },
    include: { workspace: { include: { brandProfile: true } }, socialAccounts: true },
  });
  if (!user) return res.status(404).json({ error: "User not found" });
  const { passwordHash, ...safe } = user as any;
  return res.json(safe);
});

userRouter.put("/workspace", auth, async (req: Request, res: Response) => {
  const { type, businessName, tone, targetAudience, primaryColor } = req.body;
  const userId = (req as any).userId;

  const workspace = await prisma.workspace.upsert({
    where: { userId },
    update: { type, businessName, tone, targetAudience, primaryColor },
    create: { userId, type, businessName, tone, targetAudience, primaryColor },
  });

  return res.json(workspace);
});

userRouter.patch("/brand", auth, async (req: Request, res: Response) => {
  const { businessName, tone, targetAudience, primaryColor, websiteUrl } = req.body;
  const userId = (req as any).userId;

  const workspace = await prisma.workspace.update({
    where: { userId },
    data: { businessName, tone, targetAudience, primaryColor },
  });

  if (websiteUrl) {
    await prisma.brandProfile.upsert({
      where: { workspaceId: workspace.id },
      update: { websiteUrl },
      create: { workspaceId: workspace.id, websiteUrl },
    });
  }

  return res.json({ success: true });
});

userRouter.get("/stats", auth, async (req: Request, res: Response) => {
  const userId = (req as any).userId;

  const [total, completed, processing, failed, thisMonth, allContent] = await Promise.all([
    prisma.generatedContent.count({ where: { userId } }),
    prisma.generatedContent.count({ where: { userId, jobStatus: "COMPLETED" } }),
    prisma.generatedContent.count({ where: { userId, jobStatus: "PROCESSING" } }),
    prisma.generatedContent.count({ where: { userId, jobStatus: "FAILED" } }),
    prisma.generatedContent.count({ where: { userId, createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } } }),
    prisma.generatedContent.findMany({ where: { userId }, select: { contentType: true, hashtags: true }, take: 200 }),
  ]);

  const byContentType: Record<string, number> = {};
  const hashtagCount: Record<string, number> = {};
  allContent.forEach(c => {
    byContentType[c.contentType] = (byContentType[c.contentType] || 0) + 1;
    if (Array.isArray(c.hashtags)) {
      (c.hashtags as string[]).forEach(tag => { hashtagCount[tag] = (hashtagCount[tag] || 0) + 1; });
    }
  });

  const topHashtags = Object.entries(hashtagCount).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([tag]) => tag);

  return res.json({ total, completed, processing, failed, thisMonth, byContentType, topHashtags });
});

userRouter.get("/content", auth, async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

  const [items, total] = await Promise.all([
    prisma.generatedContent.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.generatedContent.count({ where: { userId } }),
  ]);

  return res.json({ items, total, page, pages: Math.ceil(total / limit) });
});
