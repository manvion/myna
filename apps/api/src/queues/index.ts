import { Queue } from "bullmq";
import { createRedisConnection } from "../lib/redis";

const connection = createRedisConnection();

const defaultJobOptions = {
  removeOnComplete: { age: 24 * 3600, count: 100 },
  removeOnFail: { age: 7 * 24 * 3600 },
};

export const videoQueue = new Queue("video-generation", { connection, defaultJobOptions });
export const aiQueue = new Queue("ai-tasks", { connection, defaultJobOptions });
export const scrapingQueue = new Queue("web-scraping", { connection, defaultJobOptions });
export const postingQueue = new Queue("social-posting", { connection, defaultJobOptions });

export const QUEUE_NAMES = {
  VIDEO: "video-generation",
  AI: "ai-tasks",
  SCRAPING: "web-scraping",
  POSTING: "social-posting",
} as const;
