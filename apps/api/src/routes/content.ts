import { Router, Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";
import { postingQueue } from "../queues";

export const contentRouter = Router();

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

contentRouter.get("/scheduled", auth, async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const posts = await prisma.scheduledPost.findMany({
    where: { userId },
    include: { content: { select: { contentType: true, caption: true, thumbnailUrl: true } } },
    orderBy: { scheduledAt: "asc" },
    take: 100,
  });
  return res.json({ posts });
});

contentRouter.get("/:id", auth, async (req: Request, res: Response) => {
  const content = await prisma.generatedContent.findFirst({
    where: { id: req.params.id, userId: (req as any).userId },
  });
  if (!content) return res.status(404).json({ error: "Not found" });
  return res.json(content);
});

contentRouter.post("/:id/schedule", auth, async (req: Request, res: Response) => {
  const { platform, scheduledAt } = req.body;
  const userId = (req as any).userId;

  const content = await prisma.generatedContent.findFirst({
    where: { id: req.params.id, userId },
  });
  if (!content) return res.status(404).json({ error: "Content not found" });

  const scheduledPost = await prisma.scheduledPost.create({
    data: {
      userId,
      contentId: content.id,
      platform,
      scheduledAt: new Date(scheduledAt),
      status: "SCHEDULED",
    },
  });

  // Queue the posting job
  const delay = new Date(scheduledAt).getTime() - Date.now();
  await postingQueue.add(
    "post-content",
    { userId, contentId: content.id, platform },
    { delay: Math.max(0, delay) }
  );

  return res.json(scheduledPost);
});

contentRouter.post("/:id/post-now", auth, async (req: Request, res: Response) => {
  const { platform } = req.body;
  const userId = (req as any).userId;

  const content = await prisma.generatedContent.findFirst({
    where: { id: req.params.id, userId },
  });
  if (!content) return res.status(404).json({ error: "Content not found" });

  await postingQueue.add("post-content", { userId, contentId: content.id, platform }, { priority: 1 });
  return res.json({ queued: true });
});
