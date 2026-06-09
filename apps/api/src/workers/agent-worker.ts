import { prisma } from "../lib/prisma";
import { logger } from "../lib/logger";
import * as wa from "../services/whatsapp.service";
import {
  generateProactiveNudge,
  generateWeeklyPlan,
} from "../services/agent.service";
import { getAgentMemory, buildMemoryFromDB } from "../lib/agent-memory";

// ─── Daily nudge runner ────────────────────────────────────────────────────────
// Called by scheduler at 9am — sends personalised agent nudge to opted-in users

export async function runDailyNudges(): Promise<void> {
  const users = await prisma.user.findMany({
    where: { isActive: true, phone: { not: "" }, workspace: { isNot: null } },
    include: { workspace: { include: { brandProfile: true } } },
    take: 500,
  }) as any[];

  const opted = users.filter(u => (u.workspace?.brandProfile as any)?.dailyNudge === true);
  logger.info(`Running agent daily nudges for ${opted.length} users`);

  for (const user of opted) {
    if (!user.phone || !user.workspace) continue;
    try {
      const language = (user as any).language || "English";
      const nudge = await generateProactiveNudge(user.id, user.workspace.type, language);
      if (nudge) {
        await wa.sendText(user.phone, nudge);
        logger.info("Agent nudge sent", { userId: user.id });
      }
    } catch (err) {
      logger.error("Agent nudge failed", { userId: user.id, err: (err as Error).message });
    }
    await new Promise(r => setTimeout(r, 300));
  }
}

// ─── Weekly plan runner ────────────────────────────────────────────────────────
// Called every Monday at 8:30am — sends a full 5-day content plan

export async function runWeeklyPlans(): Promise<void> {
  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      phone: { not: "" },
      workspace: { isNot: null },
      generatedContent: { some: { jobStatus: "COMPLETED" } },
    },
    include: { workspace: { include: { brandProfile: true } } },
    take: 500,
  }) as any[];

  const opted = users.filter(u => (u.workspace?.brandProfile as any)?.dailyNudge === true);
  logger.info(`Sending weekly plans to ${opted.length} users`);

  for (const user of opted) {
    if (!user.phone || !user.workspace) continue;
    try {
      const memory = await getAgentMemory(user.id);
      if (memory.weeklyPlanSentAt) {
        const daysSince = Math.floor((Date.now() - new Date(memory.weeklyPlanSentAt).getTime()) / 86400000);
        if (daysSince < 6) continue;
      }
      const language = (user as any).language || "English";
      const plan = await generateWeeklyPlan(user.id, user.workspace.type, language);
      if (plan) {
        await wa.sendText(user.phone, plan);
        logger.info("Weekly plan sent", { userId: user.id });
      }
    } catch (err) {
      logger.error("Weekly plan failed", { userId: user.id, err: (err as Error).message });
    }
    await new Promise(r => setTimeout(r, 300));
  }
}

// ─── Re-engagement runner ──────────────────────────────────────────────────────
// Finds users inactive 3-7 days who don't already get daily nudges

export async function runReengagement(): Promise<void> {
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      phone: { not: "" },
      workspace: { isNot: null },
      generatedContent: {
        some: {
          createdAt: { gte: sevenDaysAgo, lt: threeDaysAgo },
          jobStatus: "COMPLETED",
        },
      },
    },
    include: { workspace: { include: { brandProfile: true } } },
    take: 200,
  }) as any[];

  // Skip users who already get daily nudges
  const candidates = users.filter(u => !(u.workspace?.brandProfile as any)?.dailyNudge);
  logger.info(`Re-engagement: ${candidates.length} inactive users`);

  for (const user of candidates) {
    if (!user.phone || !user.workspace) continue;
    try {
      const language = (user as any).language || "English";
      const nudge = await generateProactiveNudge(user.id, user.workspace.type, language);
      if (nudge) {
        await wa.sendText(user.phone, nudge);
        logger.info("Re-engagement sent", { userId: user.id });
      }
    } catch (err) {
      logger.error("Re-engagement failed", { userId: user.id, err: (err as Error).message });
    }
    await new Promise(r => setTimeout(r, 500));
  }
}

// ─── Memory warm-up ────────────────────────────────────────────────────────────
// Rebuilds Redis memory cache for active users at startup

export async function warmAgentMemoryCache(): Promise<void> {
  const activeUsers = await prisma.user.findMany({
    where: {
      workspace: { isNot: null },
      generatedContent: {
        some: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
      },
    },
    select: { id: true },
    take: 1000,
  });

  logger.info(`Warming agent memory for ${activeUsers.length} users`);
  for (const user of activeUsers) {
    try { await buildMemoryFromDB(user.id); } catch { /* non-critical */ }
  }
}
