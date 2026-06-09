import cron from "node-cron";
import { addDays } from "date-fns";
import { prisma } from "./lib/prisma";
import { redis } from "./lib/redis";
import { postingQueue } from "./queues";
import { logger } from "./lib/logger";
import { resetMonthlyQuotas } from "./middleware/quota";
import { getUpcomingFestivals } from "./lib/festivals";
import * as wa from "./services/whatsapp.service";
import { WORKSPACE_QUICK_ACTIONS } from "./templates/prompts";
import {
  runDailyNudges,
  runWeeklyPlans,
  runReengagement,
  warmAgentMemoryCache,
} from "./workers/agent-worker";

export function startScheduler(): void {
  // Every minute: check for due scheduled posts (distributed-lock-safe)
  cron.schedule("* * * * *", async () => {
    try {
      const duePosts = await prisma.scheduledPost.findMany({
        where: {
          status: "SCHEDULED",
          scheduledAt: { lte: new Date() },
        },
        take: 50,
      });

      for (const post of duePosts) {
        // Distributed lock: only one instance processes each post
        const lock = await redis.set(`lock:scheduler:${post.id}`, "1", "EX", 30, "NX");
        if (!lock) continue;

        await postingQueue.add("post-content", {
          userId: post.userId,
          contentId: post.contentId,
          platform: post.platform,
        }, { priority: 2 });

        await prisma.scheduledPost.update({
          where: { id: post.id },
          data: { status: "PUBLISHED" },
        });

        logger.info("Dispatched scheduled post", { postId: post.id, platform: post.platform });
      }
    } catch (err) {
      logger.error("Scheduler error", { err: (err as Error).message });
    }
  });

  // Daily at 2am: refresh social tokens expiring within 7 days
  cron.schedule("0 2 * * *", async () => {
    try {
      const expiringSoon = await prisma.socialAccount.findMany({
        where: { tokenExpiresAt: { lte: addDays(new Date(), 7) }, isActive: true },
      });
      for (const account of expiringSoon) {
        logger.warn("Social token expiring soon — manual refresh required", {
          accountId: account.id,
          platform: account.platform,
          expiresAt: account.tokenExpiresAt,
        });
      }
    } catch (err) {
      logger.error("Token refresh check error", { err: (err as Error).message });
    }
  });

  // 1st of each month: reset video usage counters
  cron.schedule("0 0 1 * *", async () => {
    try {
      await resetMonthlyQuotas();
      logger.info("Monthly video quotas reset");
    } catch (err) {
      logger.error("Quota reset error", { err: (err as Error).message });
    }
  });

  // Daily at 3am: cleanup expired conversation states
  cron.schedule("0 3 * * *", async () => {
    try {
      const deleted = await prisma.conversationState.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      });
      logger.info("Cleaned up expired conversations", { count: deleted.count });
    } catch (err) {
      logger.error("Cleanup error", { err: (err as Error).message });
    }
  });

  // Daily at 3:30am UTC (= 9am IST): festival alerts + daily nudge
  cron.schedule("30 3 * * *", async () => {
    const PAGE_SIZE = 200;
    let cursor: string | undefined;

    try {
      const upcomingFestivals = getUpcomingFestivals(14);

      // Paginate users — never load all at once
      while (true) {
        const users = await prisma.user.findMany({
          where: { isActive: true, phone: { not: "" } },
          include: { workspace: { include: { brandProfile: true } } } as any,
          take: PAGE_SIZE,
          ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
          orderBy: { id: "asc" },
        });

        if (!users.length) break;
        cursor = users[users.length - 1].id;

        for (const user of users as any[]) {
          if (!user.phone || !user.workspace) continue;

          // Festival alert (once per festival per user, Redis-deduped)
          for (const festival of upcomingFestivals) {
            const festKey = `festival:${user.id}:${festival.name}`;
            const sent = await redis.get(festKey);
            if (!sent) {
              const daysUntil = Math.ceil((new Date(festival.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
              const idea = festival.contentIdea[user.workspace.type] || "Create festive content";
              await wa.sendText(
                user.phone,
                `${festival.emoji} *${festival.name} is in ${daysUntil} days!*\n\n` +
                `Content idea: _${idea}_\n\n` +
                `Reply *FESTIVAL* to generate it now 🚀`
              );
              await redis.set(festKey, "1", "EX", 86400 * (daysUntil + 1));
            }
          }

          // Daily nudge handled separately by agent worker below
        }

        if (users.length < PAGE_SIZE) break;
      }
    } catch (err) {
      logger.error("Daily nudge error", { err: (err as Error).message });
    }
  });

  // Daily at 3:30am UTC (9am IST): agent-powered personalised nudges
  cron.schedule("30 3 * * *", async () => {
    try { await runDailyNudges(); } catch (err) {
      logger.error("Agent daily nudge error", { err: (err as Error).message });
    }
  });

  // Every Monday at 3am UTC (8:30am IST): weekly content plan
  cron.schedule("0 3 * * 1", async () => {
    try { await runWeeklyPlans(); } catch (err) {
      logger.error("Agent weekly plan error", { err: (err as Error).message });
    }
  });

  // Daily at 5am UTC: re-engage users inactive for 3+ days
  cron.schedule("0 5 * * *", async () => {
    try { await runReengagement(); } catch (err) {
      logger.error("Agent re-engagement error", { err: (err as Error).message });
    }
  });

  // Daily at 4am UTC: cleanup stuck PROCESSING jobs older than 1 hour
  cron.schedule("0 4 * * *", async () => {
    try {
      const stuckBefore = new Date(Date.now() - 60 * 60 * 1000);
      const result = await prisma.generatedContent.updateMany({
        where: { jobStatus: "PROCESSING", updatedAt: { lt: stuckBefore } },
        data: { jobStatus: "FAILED", jobError: "Timed out — job was stuck in PROCESSING" },
      });
      if (result.count > 0) logger.warn("Reset stuck jobs", { count: result.count });
    } catch (err) {
      logger.error("Stuck job cleanup error", { err: (err as Error).message });
    }
  });

  logger.info("Scheduler started");
}
