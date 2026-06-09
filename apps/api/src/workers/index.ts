import { videoWorker } from "./video.worker";
import { aiWorker } from "./ai.worker";
import { scrapingWorker } from "./scraping.worker";
import { postingWorker } from "./posting.worker";
import { logger } from "../lib/logger";
import { alert } from "../lib/notifications";

export function startWorkers() {
  const workers = [videoWorker, aiWorker, scrapingWorker, postingWorker];

  workers.forEach((worker) => {
    worker.on("completed", (job) => logger.info(`Job completed`, { queue: worker.name, jobId: job.id }));
    worker.on("failed", (job, err) => {
      logger.error(`Job failed`, { queue: worker.name, jobId: job?.id, err: err.message });
      alert.jobFailed(worker.name, job?.id || "unknown", err.message).catch(() => {});
    });
    worker.on("error", (err) => logger.error(`Worker error`, { queue: worker.name, err: err.message }));
  });

  logger.info("All workers started", { count: workers.length });
  return workers;
}
