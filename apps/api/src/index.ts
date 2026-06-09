import "dotenv/config";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import path from "path";
import fs from "fs";
import { logger } from "./lib/logger";
import { prisma } from "./lib/prisma";
import { redis } from "./lib/redis";
import { webhookRouter } from "./routes/webhook";
import { authRouter } from "./routes/auth";
import { userRouter } from "./routes/user";
import { contentRouter } from "./routes/content";
import { oauthRouter } from "./routes/oauth";
import { apiV1Router } from "./routes/api-v1";
import { stripeRouter } from "./routes/stripe";
import { adminRouter } from "./routes/admin";
import { startWorkers } from "./workers";
import { startScheduler } from "./scheduler";
import { prefetchStockPool, prefetchMusicPool } from "./workers/video.worker";
import { ensureWatermark } from "./lib/watermark";
import { warmAgentMemoryCache } from "./workers/agent-worker";

// ── Required env guard ────────────────────────────────────────────────────────
const REQUIRED_ENV = ["DATABASE_URL", "REDIS_URL", "WHATSAPP_ACCESS_TOKEN", "ADMIN_JWT_SECRET"];
const missing = REQUIRED_ENV.filter(k => !process.env[k]);
if (missing.length) {
  console.error(`Fatal: missing required env vars: ${missing.join(", ")}`);
  process.exit(1);
}

const app = express();
app.set("trust proxy", 1);
const PORT = parseInt(process.env.PORT || process.env.API_PORT || "3001");

// ── Ensure required directories exist ─────────────────────────────────────────
["./storage/uploads", "./storage/output", "./storage/temp", "./logs"].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ── Security middleware ────────────────────────────────────────────────────────
app.use(helmet());
app.use((req, res, next) => {
  if (req.method === "OPTIONS") res.setHeader("Cache-Control", "no-store");
  next();
});
app.use(cors({ origin: true, credentials: true }));

// ── Raw body routes (must be before express.json) ────────────────────────────
app.use("/webhook/whatsapp", express.raw({ type: "application/json" }));
app.use("/api/stripe/webhook", express.raw({ type: "application/json" }));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// ── Logging ───────────────────────────────────────────────────────────────────
app.use(morgan("combined", { stream: { write: (msg) => logger.http(msg.trim()) } }));

// ── Rate limiting ─────────────────────────────────────────────────────────────
app.use("/api/", rateLimit({ windowMs: 15 * 60 * 1000, max: 100, standardHeaders: true, legacyHeaders: false }));
app.use("/webhook/", rateLimit({ windowMs: 1 * 60 * 1000, max: 200 }));

// ── Static file serving ───────────────────────────────────────────────────────
app.use("/storage", express.static(path.join(process.cwd(), "storage")));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/webhook", webhookRouter);
app.use("/api/auth", authRouter);
app.use("/api/user", userRouter);
app.use("/api/content", contentRouter);
app.use("/api/oauth", oauthRouter);
app.use("/api/stripe", stripeRouter);
app.use("/admin", adminRouter);
app.use("/v1", apiV1Router);

app.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    await redis.ping();
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({ status: "error", message: (err as Error).message });
  }
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error("Unhandled error", { err: err.message, stack: err.stack });
  res.status(500).json({ error: "Internal server error" });
});

// ── Bootstrap ─────────────────────────────────────────────────────────────────
async function bootstrap() {
  await redis.connect();
  const workers = startWorkers();
  startScheduler();
  // Pre-warm stock footage pool + generate watermark in background (non-blocking)
  prefetchStockPool().catch((err) => logger.warn("Stock pool prefetch failed", { err }));
  prefetchMusicPool().catch((err) => logger.warn("Music pool prefetch failed", { err }));
  ensureWatermark().catch((err) => logger.warn("Watermark gen failed", { err }));
  warmAgentMemoryCache().catch((err) => logger.warn("Agent memory warm-up failed", { err }));
  const server = app.listen(PORT, () => logger.info(`API server running on port ${PORT}`));

  // Graceful shutdown: drain in-flight requests + BullMQ workers before exit
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received — shutting down gracefully`);
    server.close(async () => {
      try {
        if (Array.isArray(workers)) {
          await Promise.all(workers.map((w: any) => w.close()));
        }
        await prisma.$disconnect();
        await redis.quit();
        logger.info("Shutdown complete");
        process.exit(0);
      } catch (err) {
        logger.error("Error during shutdown", { err });
        process.exit(1);
      }
    });
    setTimeout(() => { logger.error("Forced shutdown after timeout"); process.exit(1); }, 30000);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

bootstrap().catch((err) => {
  logger.error("Failed to start server", { err });
  process.exit(1);
});
