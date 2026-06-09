import { logger } from "./logger";

const NTFY_URL = process.env.NTFY_URL || "https://ntfy.sh";
const NTFY_TOPIC = process.env.NTFY_TOPIC || "myna-alerts";

interface NotifyOptions {
  title: string;
  message: string;
  priority?: "min" | "low" | "default" | "high" | "urgent";
  tags?: string[];
}

export async function notify(opts: NotifyOptions): Promise<void> {
  if (!process.env.NTFY_TOPIC) return; // silently skip if not configured

  try {
    const { default: axios } = await import("axios");
    await axios.post(`${NTFY_URL}/${NTFY_TOPIC}`, opts.message, {
      headers: {
        Title: opts.title,
        Priority: opts.priority || "default",
        Tags: (opts.tags || []).join(","),
        ...(process.env.NTFY_TOKEN ? { Authorization: `Bearer ${process.env.NTFY_TOKEN}` } : {}),
      },
      timeout: 5000,
    });
  } catch (err) {
    // Never let notification failure break the main flow
    logger.debug("Ntfy notification failed (non-fatal)", { err: (err as Error).message });
  }
}

export const alert = {
  jobFailed: (jobName: string, jobId: string, err: string) =>
    notify({
      title: `❌ Job failed: ${jobName}`,
      message: `Job ${jobId} failed: ${err}`,
      priority: "high",
      tags: ["x", "warning"],
    }),

  quotaExceeded: (userId: string, tier: string) =>
    notify({
      title: "📊 Quota exceeded",
      message: `User ${userId} (${tier}) hit video quota`,
      priority: "default",
      tags: ["chart_with_upwards_trend"],
    }),

  newSignup: (phone: string) =>
    notify({
      title: "🎉 New user signed up",
      message: `Phone: ${phone}`,
      priority: "default",
      tags: ["tada"],
    }),

  paymentReceived: (userId: string, plan: string, amount: string) =>
    notify({
      title: `💰 Payment: ${amount}`,
      message: `User ${userId} upgraded to ${plan}`,
      priority: "high",
      tags: ["moneybag"],
    }),
};
