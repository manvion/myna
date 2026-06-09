import fs from "fs";
import path from "path";
import { logger } from "../lib/logger";

const STORAGE_TYPE = process.env.STORAGE_TYPE || "local";
const LOCAL_PATH = process.env.STORAGE_LOCAL_PATH || "./storage";
const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3001";

// ─── Upload a file and return its public URL ──────────────────────────────────

export async function uploadFile(
  localPath: string,
  key: string,
  mimeType = "video/mp4"
): Promise<string> {
  if (STORAGE_TYPE === "cloudflare-r2") {
    return uploadToR2(localPath, key, mimeType);
  }
  return uploadToLocal(localPath, key);
}

export async function deleteFile(key: string): Promise<void> {
  if (STORAGE_TYPE === "cloudflare-r2") {
    await deleteFromR2(key);
  } else {
    const filePath = path.join(LOCAL_PATH, "output", key);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
}

// ─── Local storage ────────────────────────────────────────────────────────────

function uploadToLocal(localPath: string, key: string): string {
  const destDir = path.join(LOCAL_PATH, "output");
  fs.mkdirSync(destDir, { recursive: true });
  const dest = path.join(destDir, key);
  if (localPath !== dest) fs.copyFileSync(localPath, dest);
  return `${API_BASE_URL}/storage/output/${key}`;
}

// ─── Cloudflare R2 ────────────────────────────────────────────────────────────

async function getR2Client() {
  const { S3Client } = await import("@aws-sdk/client-s3");
  return new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

async function uploadToR2(localPath: string, key: string, mimeType: string): Promise<string> {
  const { PutObjectCommand } = await import("@aws-sdk/client-s3");
  const client = await getR2Client();
  const fileBuffer = fs.readFileSync(localPath);

  await client.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
    Body: fileBuffer,
    ContentType: mimeType,
    CacheControl: "public, max-age=31536000",
  }));

  const publicUrl = process.env.R2_PUBLIC_URL;
  if (publicUrl) return `${publicUrl}/${key}`;
  return `https://${process.env.R2_BUCKET_NAME}.${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${key}`;
}

async function deleteFromR2(key: string): Promise<void> {
  const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
  const client = await getR2Client();
  await client.send(new DeleteObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
  }));
  logger.debug("Deleted from R2", { key });
}

// ─── Cleanup local temp files after upload ────────────────────────────────────

export function cleanupTempFiles(...paths: (string | undefined)[]): void {
  for (const p of paths) {
    if (p && fs.existsSync(p)) {
      try { fs.unlinkSync(p); } catch { /* ignore */ }
    }
  }
}

export function cleanupTempDir(dir: string): void {
  if (fs.existsSync(dir)) {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ }
  }
}
