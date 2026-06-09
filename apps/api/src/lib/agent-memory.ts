import { redis } from "./redis";
import { prisma } from "./prisma";

export interface AgentMemory {
  userId: string;
  // What they do most
  recentIntents: string[];
  topIntent: string | null;
  preferredStyle: string | null;
  // Activity stats
  contentCreatedThisWeek: number;
  contentCreatedTotal: number;
  lastContentAt: string | null;
  daysSinceLastContent: number;
  // Quality signal
  approvalRate: number; // % approved vs regenerated
  // Agent state
  pendingFollowUp: string | null;
  weeklyPlanSentAt: string | null;
  language: string;
}

const MEMORY_TTL = 60 * 60 * 24 * 30; // 30 days

export async function getAgentMemory(userId: string): Promise<AgentMemory> {
  const cached = await redis.get(`agent:memory:${userId}`);
  if (cached) {
    const m = JSON.parse(cached) as AgentMemory;
    // Always recompute daysSinceLastContent so it stays fresh
    m.daysSinceLastContent = m.lastContentAt
      ? Math.floor((Date.now() - new Date(m.lastContentAt).getTime()) / 86400000)
      : 999;
    return m;
  }
  return buildMemoryFromDB(userId);
}

export async function buildMemoryFromDB(userId: string): Promise<AgentMemory> {
  const [user, history] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.generatedContent.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: { jobStatus: true, contentType: true, createdAt: true },
    }),
  ]);

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const thisWeek = history.filter(c => new Date(c.createdAt) > weekAgo);
  const completed = history.filter(c => c.jobStatus === "COMPLETED");
  const lastContent = history[0]?.createdAt ?? null;

  const memory: AgentMemory = {
    userId,
    recentIntents: [],
    topIntent: null,
    preferredStyle: null,
    contentCreatedThisWeek: thisWeek.length,
    contentCreatedTotal: history.length,
    lastContentAt: lastContent?.toISOString() ?? null,
    daysSinceLastContent: lastContent
      ? Math.floor((Date.now() - new Date(lastContent).getTime()) / 86400000)
      : 999,
    approvalRate: history.length > 0 ? completed.length / history.length : 0,
    pendingFollowUp: null,
    weeklyPlanSentAt: null,
    language: (user as any)?.language || "English",
  };

  await redis.setex(`agent:memory:${userId}`, MEMORY_TTL, JSON.stringify(memory));
  return memory;
}

export async function updateAgentMemory(userId: string, update: Partial<AgentMemory>): Promise<void> {
  const current = await getAgentMemory(userId);
  const updated: AgentMemory = { ...current, ...update };

  if (update.recentIntents?.length) {
    updated.recentIntents = [...update.recentIntents, ...current.recentIntents].slice(0, 20);
    // Recompute top intent
    const counts = updated.recentIntents.reduce((acc, intent) => {
      acc[intent] = (acc[intent] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    updated.topIntent = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  }

  await redis.setex(`agent:memory:${userId}`, MEMORY_TTL, JSON.stringify(updated));
}

export async function invalidateMemory(userId: string): Promise<void> {
  await redis.del(`agent:memory:${userId}`);
}

export function summarizeMemory(memory: AgentMemory): string {
  const parts: string[] = [];
  if (memory.contentCreatedThisWeek > 0) {
    parts.push(`${memory.contentCreatedThisWeek} pieces this week`);
  }
  if (memory.daysSinceLastContent < 999) {
    parts.push(`last created ${memory.daysSinceLastContent}d ago`);
  }
  if (memory.topIntent) {
    parts.push(`uses ${memory.topIntent} most`);
  }
  if (memory.approvalRate > 0) {
    parts.push(`${Math.round(memory.approvalRate * 100)}% approval rate`);
  }
  return parts.join(" | ") || "new user";
}
