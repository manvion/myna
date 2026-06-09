import { Router, Request, Response } from "express";
import crypto from "crypto";
import { logger } from "../lib/logger";
import { redis } from "../lib/redis";
import { WhatsAppFlowEngine } from "../services/whatsapp-flow.service";

export const webhookRouter = Router();

// ── Webhook verification (GET) ────────────────────────────────────────────────
webhookRouter.get("/whatsapp", (req: Request, res: Response) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    logger.info("WhatsApp webhook verified");
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// ── Message receiver (POST) ───────────────────────────────────────────────────
webhookRouter.post("/whatsapp", async (req: Request, res: Response) => {
  // Verify signature
  const signature = req.headers["x-hub-signature-256"] as string;
  const rawBody = req.body as Buffer;

  if (!verifySignature(rawBody, signature)) {
    logger.warn("Invalid WhatsApp webhook signature");
    return res.sendStatus(401);
  }

  // Always respond 200 immediately — WhatsApp retries if we delay
  res.sendStatus(200);

  try {
    const payload = JSON.parse(rawBody.toString("utf8"));
    const entry = payload.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    if (!value?.messages?.length) return;

    const message = value.messages[0];
    const contact = value.contacts?.[0];
    const phone = message.from;
    const waMessageId = message.id;

    // Deduplicate: Meta retries failed deliveries — skip if already processed
    const dedupKey = `wa:msg:${waMessageId}`;
    const isNew = await redis.set(dedupKey, "1", "EX", 3600, "NX");
    if (!isNew) {
      logger.debug("Duplicate WhatsApp message, skipping", { waMessageId });
      return;
    }

    const flowEngine = new WhatsAppFlowEngine();
    await flowEngine.handleIncoming({
      phone,
      waMessageId,
      displayName: contact?.profile?.name,
      message,
    });
  } catch (err) {
    logger.error("Webhook processing error", { err: (err as Error).message });
  }
});

function verifySignature(rawBody: Buffer, signature: string): boolean {
  if (!signature) return false;
  const secret = process.env.WHATSAPP_APP_SECRET || "";
  if (!secret) {
    logger.warn("WHATSAPP_APP_SECRET not set — skipping signature verification");
    return true;
  }
  const expected = `sha256=${crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex")}`;
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}
