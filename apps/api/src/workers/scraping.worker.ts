import { Worker, Job } from "bullmq";
import { createRedisConnection } from "../lib/redis";
import { prisma } from "../lib/prisma";
import { logger } from "../lib/logger";
import { scrapeWebsite } from "../services/scraper.service";
import { chat } from "../services/ai.service";
import { CONTENT_MATRIX_PROMPT } from "../templates/prompts";
import * as wa from "../services/whatsapp.service";
import { videoQueue } from "../queues";

export const scrapingWorker = new Worker(
  "web-scraping",
  async (job: Job) => {
    const { phone, userId, url, workspaceType } = job.data;
    logger.info("Scraping website", { jobId: job.id, url });

    try {
      // 1. Scrape
      await wa.sendText(phone, `🔍 Analyzing your website...`);
      const scraped = await scrapeWebsite(url);

      await job.updateProgress(40);

      // 2. Save brand profile
      const workspace = await prisma.workspace.findUnique({ where: { userId } });
      if (!workspace) throw new Error("Workspace not found");

      await prisma.brandProfile.upsert({
        where: { workspaceId: workspace.id },
        update: {
          websiteUrl: url,
          scrapedAt: new Date(),
          businessSummary: scraped.description,
          services: scraped.services,
          products: scraped.products,
          offers: scraped.offers,
          scrapedImages: scraped.images,
        },
        create: {
          workspaceId: workspace.id,
          websiteUrl: url,
          scrapedAt: new Date(),
          businessSummary: scraped.description,
          services: scraped.services,
          products: scraped.products,
          offers: scraped.offers,
          scrapedImages: scraped.images,
        },
      });

      await job.updateProgress(60);

      // 3. Generate 30-day content matrix
      await wa.sendText(phone, `🧠 Building your 30-day content plan...`);
      const matrixResponse = await chat({
        systemPrompt: CONTENT_MATRIX_PROMPT(workspaceType),
        messages: [{
          role: "user",
          content: `Business: ${scraped.title}\nDescription: ${scraped.description}\nServices: ${scraped.services.join(", ")}\nOffers: ${scraped.offers.join(", ")}\n\nGenerate a 30-day content matrix with 10 reels, 20 posts. Return as JSON.`,
        }],
        json: true,
        maxTokens: 4096,
      });

      let contentMatrix: any;
      try {
        contentMatrix = JSON.parse(matrixResponse.text);
      } catch {
        contentMatrix = { error: "parse_failed", raw: matrixResponse.text.slice(0, 500) };
      }

      await prisma.brandProfile.update({
        where: { workspaceId: workspace.id },
        data: { contentMatrix },
      });

      await job.updateProgress(80);

      // 4. Queue first 3 reels automatically
      await wa.sendText(phone, `🎬 Generating your first 3 reels...`);

      const reelPrompts = contentMatrix?.reels?.slice(0, 3) || [
        `${scraped.title} brand introduction reel`,
        `Top services at ${scraped.title}`,
        `Why choose ${scraped.title}`,
      ];

      for (const prompt of reelPrompts) {
        await videoQueue.add("generate-video", {
          phone,
          userId,
          workspaceType,
          contentType: "REEL",
          inputType: "text",
          prompt: typeof prompt === "string" ? prompt : prompt.topic,
          audioType: "BACKGROUND_MUSIC",
          style: "trendy",
        });
      }

      // 5. Send summary
      const summary = [
        `✅ *Website analyzed!*`,
        ``,
        `📊 *Brand Profile Created:*`,
        `• Business: ${scraped.title}`,
        `• Services found: ${scraped.services.length}`,
        `• Products found: ${scraped.products.length}`,
        `• Offers detected: ${scraped.offers.length}`,
        ``,
        `📅 *30-Day Content Plan Ready*`,
        `• 10 Reels planned`,
        `• 20 Posts planned`,
        ``,
        `🎬 Generating your first 3 reels now...`,
      ].join("\n");

      await wa.sendText(phone, summary);
    } catch (err) {
      logger.error("Scraping job failed", { err: (err as Error).message });
      await wa.sendText(phone, `⚠️ Failed to analyze the website. Please check the URL and try again.`);
      throw err;
    }
  },
  { connection: createRedisConnection(), concurrency: 2 }
);
