import { Worker, Job } from "bullmq";
import path from "path";
import fs from "fs";
import { createRedisConnection } from "../lib/redis";
import { prisma } from "../lib/prisma";
import { logger } from "../lib/logger";
import { transcribeAudio, chat, describeImage } from "../services/ai.service";
import { WhatsAppFlowEngine } from "../services/whatsapp-flow.service";
import * as wa from "../services/whatsapp.service";
import { buildCaptionOnlyPrompt } from "../templates/prompts";

export const aiWorker = new Worker(
  "ai-tasks",
  async (job: Job) => {
    const { type, phone, audioId } = job.data;

    // ── caption-only: download image → describe → write caption ──────────────
    if (job.name === "caption-only") {
      const { mediaId, userId, workspaceType } = job.data;
      logger.info("Generating caption only", { jobId: job.id, phone, mediaId });

      try {
        const { default: axios } = await import("axios");
        const { data: meta } = await axios.get(`https://graph.facebook.com/v19.0/${mediaId}`, {
          headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}` },
        });
        const { data } = await axios.get(meta.url, {
          headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}` },
          responseType: "arraybuffer",
        });
        const base64 = Buffer.from(data).toString("base64");
        const description = await describeImage(base64).catch(() => "a great piece of content");

        const prompt = buildCaptionOnlyPrompt(description, workspaceType);
        const result = await chat({ messages: [{ role: "user", content: prompt }], json: true });
        const parsed = JSON.parse(result.text);

        await wa.sendText(
          phone,
          `📝 *Caption:*\n${parsed.caption}\n\n` +
          `📢 *CTA:* ${parsed.cta}\n\n` +
          `#️⃣ ${(parsed.hashtags as string[]).map((h) => `#${h}`).join(" ")}`
        );
      } catch (err) {
        logger.error("Caption-only failed", { jobId: job.id, err: (err as Error).message });
        await wa.sendText(phone, "⚠️ Couldn't generate caption. Send me a description of your image instead.");
      }
      return;
    }

    if (type === "transcribe") {
      logger.info("Transcribing audio", { jobId: job.id, phone });

      const engine = new WhatsAppFlowEngine();
      const ctx = await engine.getContext(phone);

      // Download audio file
      const { default: axios } = await import("axios");
      const { data: meta } = await axios.get(`https://graph.facebook.com/v19.0/${audioId}`, {
        headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}` },
      });
      const { data } = await axios.get(meta.url, {
        headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}` },
        responseType: "arraybuffer",
      });
      const audioPath = path.join(process.env.TEMP_DIR || "./storage/temp", `audio_${audioId}.ogg`);
      fs.mkdirSync(path.dirname(audioPath), { recursive: true });
      fs.writeFileSync(audioPath, Buffer.from(data));

      const transcript = await transcribeAudio(audioPath);
      fs.unlinkSync(audioPath);

      if (!transcript) {
        await wa.sendText(phone, "⚠️ Couldn't transcribe your voice note. Please try again or type your message.");
        return;
      }

      // Update context with transcript and push to next step
      await engine.setContext(phone, {
        flow: "CONTENT_TYPE_SELECT",
        data: { ...ctx.data, prompt: transcript, inputType: "text" },
      });

      const user = await prisma.user.findUnique({ where: { phone }, include: { workspace: true } });
      if (!user?.workspace) return;

      await wa.sendText(phone, `📝 Transcribed: _"${transcript.slice(0, 100)}"_`);

      const buttons: wa.WaButton[] = [
        { id: "ct_reel", title: "🎬 Viral Reel" },
        { id: "ct_offer", title: "📢 Promo Post" },
        { id: "ct_listing", title: "📸 Regular Post" },
      ];
      await wa.sendButtons(phone, "What type of content should I create?", buttons, "Choose Content Type");
    }
  },
  { connection: createRedisConnection(), concurrency: 5 }
);
