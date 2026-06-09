import { prisma } from "../lib/prisma";
import { isQuotaExceeded, getUpgradeMessage } from "../lib/pricing";
import { alert } from "../lib/notifications";
import * as wa from "../services/whatsapp.service";

// Reset monthly counters — called from scheduler on 1st of each month
export async function resetMonthlyQuotas(): Promise<void> {
  await prisma.user.updateMany({
    where: { subscriptionTier: { in: ["GROWTH" as any] } },
    data: { videosThisMonth: 0 },
  });
}

export interface QuotaCheckResult {
  allowed: boolean;
  reason?: "blocked" | "quota_exceeded";
}

// Core function used by WhatsApp flow before any generation
export async function checkUserQuota(userId: string, webUrl: string): Promise<QuotaCheckResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { workspace: true },
  });
  if (!user) return { allowed: false, reason: "blocked" };

  if (user.isBlocked) {
    if (user.phone) {
      await wa.sendText(user.phone,
        `⛔ Your account has been suspended.\n\nReason: ${user.blockReason || "Policy violation."}\n\nContact support if you believe this is an error.`
      ).catch(() => {});
    }
    return { allowed: false, reason: "blocked" };
  }

  // Treat subscription as expired if validUntil is in the past (paid users only)
  const tier = user.subscriptionTier as string;
  const effectiveTier =
    tier !== "FREE" && user.subscriptionValidUntil && user.subscriptionValidUntil < new Date()
      ? "FREE"
      : tier;

  if (effectiveTier !== tier && user.phone) {
    await prisma.user.update({
      where: { id: userId },
      data: { subscriptionTier: "FREE" as any, videoQuota: 1 },
    }).catch(() => {});
  }

  const exceeded = isQuotaExceeded(effectiveTier, user.videosThisMonth, user.totalGenerations);

  if (exceeded) {
    const workspaceType = (user.workspace as any)?.type || "RESTAURANT";
    const msg = getUpgradeMessage(workspaceType, effectiveTier, webUrl);
    if (user.phone) {
      await wa.sendText(user.phone, msg).catch(() => {});
    }
    alert.quotaExceeded(userId, tier).catch(() => {});
    return { allowed: false, reason: "quota_exceeded" };
  }

  return { allowed: true };
}

// Increment generation count after successful generation
export async function recordGeneration(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      videosThisMonth: { increment: 1 },
      totalGenerations: { increment: 1 },
    },
  });
}
