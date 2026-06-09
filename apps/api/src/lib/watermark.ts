import path from "path";
import fs from "fs";
import { logger } from "./logger";

const WATERMARK_PATH = path.join(process.cwd(), "assets", "watermark.png");

export function getWatermarkPath(): string | undefined {
  return fs.existsSync(WATERMARK_PATH) ? WATERMARK_PATH : undefined;
}

export async function ensureWatermark(): Promise<void> {
  if (fs.existsSync(WATERMARK_PATH)) return;

  const assetsDir = path.dirname(WATERMARK_PATH);
  fs.mkdirSync(assetsDir, { recursive: true });

  try {
    const sharp = (await import("sharp")).default;

    // 300×60 white pill with dark text
    const W = 300;
    const H = 60;
    const svg = `
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${W}" height="${H}" rx="12" ry="12" fill="rgba(0,0,0,0.6)"/>
  <text x="${W / 2}" y="${H / 2 + 6}" font-family="sans-serif" font-size="16"
        font-weight="bold" fill="white" text-anchor="middle">
    Made with AI Content Studio
  </text>
</svg>`;

    await sharp(Buffer.from(svg)).png().toFile(WATERMARK_PATH);
    logger.info("Watermark asset created", { path: WATERMARK_PATH });
  } catch (err) {
    logger.warn("Could not generate watermark asset", { err: (err as Error).message });
  }
}
