import { Worker, Job } from "bullmq";
import { createRedisConnection } from "../lib/redis";
import { prisma } from "../lib/prisma";
import { logger } from "../lib/logger";
import * as wa from "../services/whatsapp.service";
import { dispatchPost, PostContent } from "../services/social-posting.service";

export const postingWorker = new Worker(
  "social-posting",
  async (job: Job) => {
    const { userId, contentId, platform, accountId } = job.data;

    const content = await prisma.generatedContent.findUnique({ where: { id: contentId } });
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!content || !user) throw new Error("Content or user not found");

    // DOWNLOAD_ONLY — no social account, just send the video back
    if (platform === "DOWNLOAD_ONLY") {
      if (content.videoUrl) {
        await wa.sendMedia(user.phone, "video", content.videoUrl, "📥 Your video is ready to download!");
      }
      return;
    }

    // Find the social account — prefer by accountId if provided, fall back to platform+userId
    const account = accountId
      ? await prisma.socialAccount.findUnique({ where: { id: accountId } })
      : await prisma.socialAccount.findFirst({ where: { userId, platform, isActive: true } });

    if (!account) throw new Error(`No active ${platform} account found`);

    const postContent: PostContent = {
      caption: content.caption || "",
      hashtags: (content.hashtags as string[]) || [],
      videoUrl: content.videoUrl || undefined,
      imageUrl: undefined,
    };

    logger.info("Dispatching post", { userId, platform, contentId });

    const result = await dispatchPost(platform, account.accessToken, account.accountId, postContent);

    if (result.success) {
      await prisma.scheduledPost.updateMany({
        where: { contentId, platform },
        data: {
          status: "PUBLISHED",
          publishedAt: new Date(),
          platformPostId: result.platformPostId,
        },
      });
      await prisma.generatedContent.update({
        where: { id: contentId },
        data: { approvedAt: new Date() },
      });
      await wa.sendText(
        user.phone,
        `✅ Posted to *${platform}*!\n\n${result.platformPostId ? `Post ID: ${result.platformPostId}` : ""}`.trim()
      );
    } else {
      await prisma.scheduledPost.updateMany({
        where: { contentId, platform },
        data: { status: "FAILED", errorMessage: result.error },
      });
      await wa.sendText(user.phone, `⚠️ Failed to post to ${platform}.\n\nReason: ${result.error || "Unknown error"}\n\nPlease try again or post manually.`);
      throw new Error(result.error || `${platform} posting failed`);
    }
  },
  { connection: createRedisConnection(), concurrency: 3 }
);
