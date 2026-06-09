import ffmpeg from "fluent-ffmpeg";
import path from "path";
import fs from "fs";
import { v4 as uuid } from "uuid";
import { logger } from "../lib/logger";

const FFMPEG_PATH = process.env.FFMPEG_PATH || "ffmpeg";
const FFPROBE_PATH = process.env.FFPROBE_PATH || "ffprobe";
const TEMP_DIR = process.env.TEMP_DIR || "./storage/temp";
const OUTPUT_DIR = process.env.OUTPUT_DIR || "./storage/output";

ffmpeg.setFfmpegPath(FFMPEG_PATH);
ffmpeg.setFfprobePath(FFPROBE_PATH);

export type AspectRatio = "9:16" | "1:1" | "16:9";

export interface VideoSegment {
  imagePath?: string;
  videoPath?: string;
  duration: number;        // seconds
  transitionType?: "fade" | "cut" | "slide";
}

export type VideoStyle = "modern" | "bold" | "minimal" | "trendy" | "cinematic" | "neon" | "retro" | "corporate";

// Per-style color grade applied after segment concat — pure FFmpeg, zero cost
const STYLE_COLOR_GRADES: Record<string, string> = {
  modern:    "eq=brightness=0.02:contrast=1.05:saturation=1.1",
  bold:      "eq=contrast=1.2:saturation=1.4",
  minimal:   "eq=contrast=0.95:saturation=0.75:brightness=0.03",
  trendy:    "eq=saturation=1.3:contrast=1.1",
  cinematic: "curves=all='0/0 0.3/0.25 0.7/0.65 1/0.9',eq=saturation=0.85",
  neon:      "eq=saturation=1.5:contrast=1.2:brightness=-0.03",
  retro:     "curves=r='0/0.05 0.5/0.58 1/0.95':g='0/0 0.5/0.45 1/0.85':b='0/0 0.5/0.35 1/0.7'",
  corporate: "eq=brightness=0.02:contrast=1.05:saturation=0.9",
};

export interface VideoOptions {
  segments: VideoSegment[];
  audioPath?: string;
  audioVolume?: number;    // 0.0 – 1.0, default 0.8
  subtitleText?: string;
  subtitleStyle?: VideoStyle;
  watermarkPath?: string;
  aspectRatio?: AspectRatio;
  outputFps?: number;      // default 30
  outputBitrate?: string;  // default "2M"
  maxDurationSec?: number; // default 60
  brandColor?: string;     // hex, default "#ffffff"
}

export interface PreviewVideoOptions {
  segments: VideoSegment[];
  audioPath?: string;
  subtitleText?: string;
  aspectRatio?: AspectRatio;
  brandColor?: string;
  outputPath: string;     // caller provides path
}

export interface VideoResult {
  outputPath: string;
  durationSeconds: number;
  fileSizeBytes: number;
  thumbnailPath: string;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function generateVideo(opts: VideoOptions): Promise<VideoResult> {
  const jobId = uuid();
  const tempDir = path.join(TEMP_DIR, jobId);
  fs.mkdirSync(tempDir, { recursive: true });

  try {
    const { width, height } = getResolution(opts.aspectRatio || "9:16");

    // 1. Normalise all segments to the target resolution
    const normalisedPaths = await normaliseSegments(opts.segments, tempDir, width, height);

    // 2. Concatenate segments with xfade transitions
    const concatPath = path.join(tempDir, "concat.mp4");
    await concatSegments(normalisedPaths, opts.segments, concatPath, width, height);

    // 3. Color grade (style-specific, fail-open)
    const gradedPath = path.join(tempDir, "graded.mp4");
    await applyColorGrade(concatPath, gradedPath, opts.subtitleStyle || "modern");

    // 4. Add audio layer
    const audioPath = path.join(tempDir, "with_audio.mp4");
    await addAudio(gradedPath, opts.audioPath, audioPath, opts.audioVolume ?? 0.8);

    // 5. Overlay subtitles / captions — animated progressive reveal
    const TRANSITION_DUR = 0.5;
    const videoDuration = opts.segments.reduce((s, seg) => s + seg.duration, 0)
      - Math.max(0, opts.segments.length - 1) * TRANSITION_DUR;

    const captionPath = path.join(tempDir, "with_captions.mp4");
    if (opts.subtitleText) {
      await burnSubtitles(audioPath, opts.subtitleText, captionPath, opts.subtitleStyle || "modern", opts.brandColor, width, height, videoDuration);
    } else {
      fs.copyFileSync(audioPath, captionPath);
    }

    // 5. Add watermark
    const outputName = `myna_${jobId}.mp4`;
    const outputPath = path.join(OUTPUT_DIR, outputName);
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    if (opts.watermarkPath && fs.existsSync(opts.watermarkPath)) {
      await addWatermark(captionPath, opts.watermarkPath, outputPath, width, height);
    } else {
      fs.copyFileSync(captionPath, outputPath);
    }

    // 6. Generate thumbnail
    const thumbnailPath = path.join(OUTPUT_DIR, `thumb_${jobId}.jpg`);
    await extractThumbnail(outputPath, thumbnailPath);

    const stat = fs.statSync(outputPath);
    const duration = await getVideoDuration(outputPath);

    logger.info("Video generated", { jobId, outputPath, duration, size: stat.size });

    return {
      outputPath,
      durationSeconds: duration,
      fileSizeBytes: stat.size,
      thumbnailPath,
    };
  } finally {
    // Cleanup temp
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

// Fast 480p preview — no watermark, lower bitrate, just the hook subtitle
export async function generatePreviewVideo(opts: PreviewVideoOptions): Promise<void> {
  const PREVIEW_W = 540;
  const PREVIEW_H = 960;
  const tempDir = path.join(TEMP_DIR, `prev_${uuid()}`);
  fs.mkdirSync(tempDir, { recursive: true });

  try {
    const normalisedPaths = await normaliseSegments(opts.segments, tempDir, PREVIEW_W, PREVIEW_H);
    const concatPath = path.join(tempDir, "concat.mp4");
    await concatSegments(normalisedPaths, opts.segments, concatPath, PREVIEW_W, PREVIEW_H);

    const audioPath = path.join(tempDir, "with_audio.mp4");
    await addAudio(concatPath, opts.audioPath, audioPath, 0.6);

    const captionPath = opts.subtitleText ? path.join(tempDir, "captioned.mp4") : audioPath;
    if (opts.subtitleText) {
      await burnSubtitles(audioPath, opts.subtitleText, captionPath, "modern", opts.brandColor, PREVIEW_W, PREVIEW_H);
    }

    // Transcode to WhatsApp-compatible at low bitrate for speed
    await new Promise<void>((resolve, reject) => {
      ffmpeg(captionPath)
        .inputOptions(["-hwaccel", "auto"])
        .outputOptions(["-c:v", "libx264", "-c:a", "aac", "-movflags", "+faststart", "-profile:v", "baseline", "-level", "3.0", "-pix_fmt", "yuv420p", "-b:v", "600k", "-b:a", "96k", "-preset", "ultrafast"])
        .output(opts.outputPath)
        .on("end", () => resolve())
        .on("error", reject)
        .run();
    });
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

// Extract a single JPEG frame at 1 second (or 0s if shorter) for fast moderation.
// Returns the frame path, or null if FFmpeg fails.
export async function extractFirstFrame(videoPath: string): Promise<string | null> {
  const framePath = path.join(TEMP_DIR, `mod_frame_${uuid()}.jpg`);
  return new Promise((resolve) => {
    ffmpeg(videoPath)
      .outputOptions(["-ss", "00:00:01", "-vframes", "1", "-q:v", "2"])
      .output(framePath)
      .on("end", () => resolve(framePath))
      .on("error", () => resolve(null)) // fail open — caller handles null
      .run();
  });
}

export async function extractFrames(videoPath: string, count = 4): Promise<string[]> {
  const outDir = path.join(TEMP_DIR, `frames_${uuid()}`);
  fs.mkdirSync(outDir, { recursive: true });

  const duration = await getVideoDuration(videoPath);
  const interval = duration / (count + 1);

  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .outputOptions([
        "-vf", `fps=1/${interval}`,
        "-vframes", String(count),
        "-q:v", "2",
      ])
      .output(path.join(outDir, "frame_%03d.jpg"))
      .on("end", () => {
        const frames = fs.readdirSync(outDir)
          .filter((f) => f.endsWith(".jpg"))
          .sort()
          .map((f) => path.join(outDir, f));
        resolve(frames);
      })
      .on("error", reject)
      .run();
  });
}

export async function convertAspectRatio(inputPath: string, ratio: AspectRatio): Promise<string> {
  const { width, height } = getResolution(ratio);
  const outputPath = path.join(TEMP_DIR, `converted_${uuid()}.mp4`);

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions([
        "-vf", `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`,
        "-c:a", "copy",
        "-preset", "fast",
      ])
      .output(outputPath)
      .on("end", () => resolve(outputPath))
      .on("error", reject)
      .run();
  });
}

export async function getVideoDuration(videoPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, meta) => {
      if (err) return reject(err);
      resolve(meta.format.duration || 0);
    });
  });
}

export async function transcodeForWhatsApp(inputPath: string): Promise<string> {
  const outputPath = inputPath.replace(/\.[^.]+$/, "_wa.mp4");
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .inputOptions(["-hwaccel", "auto"])
      .outputOptions([
        "-c:v", "libx264",
        "-c:a", "aac",
        "-movflags", "+faststart", // required for streaming
        "-profile:v", "baseline",
        "-level", "3.0",
        "-pix_fmt", "yuv420p",
        "-b:v", "1M",
        "-b:a", "128k",
      ])
      .output(outputPath)
      .on("end", () => resolve(outputPath))
      .on("error", reject)
      .run();
  });
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function getResolution(ratio: AspectRatio): { width: number; height: number } {
  const map = { "9:16": { width: 1080, height: 1920 }, "1:1": { width: 1080, height: 1080 }, "16:9": { width: 1920, height: 1080 } };
  return map[ratio];
}

async function normaliseSegments(
  segments: VideoSegment[],
  tempDir: string,
  width: number,
  height: number
): Promise<string[]> {
  return Promise.all(
    segments.map(async (seg, i) => {
      const out = path.join(tempDir, `seg_${i}.mp4`);

      if (seg.imagePath) {
        // Still image → video
        await imageToVideo(seg.imagePath, out, seg.duration, width, height);
      } else if (seg.videoPath) {
        // Video → normalise resolution + trim
        await normaliseVideo(seg.videoPath, out, seg.duration, width, height);
      }
      return out;
    })
  );
}

function imageToVideo(imgPath: string, out: string, duration: number, w: number, h: number): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(imgPath)
      .loop(duration)
      .inputOptions(["-hwaccel", "auto"])
      .outputOptions([
        "-vf", `scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2,zoompan=z='min(zoom+0.0005,1.05)':d=${Math.round(duration * 25)}:s=${w}x${h}`,
        "-c:v", "libx264",
        "-t", String(duration),
        "-pix_fmt", "yuv420p",
        "-r", "30",
      ])
      .output(out)
      .on("end", () => resolve())
      .on("error", reject)
      .run();
  });
}

function normaliseVideo(inputPath: string, out: string, maxDuration: number, w: number, h: number): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .inputOptions(["-hwaccel", "auto"])
      .outputOptions([
        "-vf", `scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2`,
        "-c:v", "libx264",
        "-t", String(maxDuration),
        "-pix_fmt", "yuv420p",
        "-r", "30",
      ])
      .output(out)
      .on("end", () => resolve())
      .on("error", reject)
      .run();
  });
}

async function concatSegments(
  paths: string[],
  segments: VideoSegment[],
  outputPath: string,
  w: number,
  h: number
): Promise<void> {
  if (paths.length === 1) {
    fs.copyFileSync(paths[0], outputPath);
    return;
  }

  // xfade filter chain — smooth dissolve/slide transitions between segments
  const TRANSITION_DUR = 0.5;
  const TRANSITIONS = ["dissolve", "fade", "slideleft", "wipeup", "slideright"];
  const filters: string[] = [];
  let prevLabel = "0:v";
  let offset = 0;

  for (let i = 1; i < paths.length; i++) {
    offset += segments[i - 1].duration - TRANSITION_DUR;
    const isLast = i === paths.length - 1;
    const outLabel = isLast ? "vout" : `xf${i}`;
    const transition = TRANSITIONS[i % TRANSITIONS.length];
    filters.push(
      `[${prevLabel}][${i}:v]xfade=transition=${transition}:duration=${TRANSITION_DUR}:offset=${offset.toFixed(2)}[${outLabel}]`
    );
    prevLabel = outLabel;
  }

  const xfadeConcat = () => new Promise<void>((resolve, reject) => {
    const cmd = ffmpeg();
    paths.forEach(p => cmd.input(p));
    cmd
      .complexFilter(filters.join(";"))
      .outputOptions(["-map", "[vout]", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "fast"])
      .output(outputPath)
      .on("end", () => resolve())
      .on("error", reject)
      .run();
  });

  const streamConcat = () => {
    const listPath = outputPath.replace(".mp4", "_list.txt");
    fs.writeFileSync(listPath, paths.map(p => `file '${p.replace(/\\/g, "/")}'`).join("\n"));
    return new Promise<void>((resolve, reject) => {
      ffmpeg()
        .input(listPath)
        .inputOptions(["-f", "concat", "-safe", "0"])
        .outputOptions(["-c", "copy"])
        .output(outputPath)
        .on("end", () => { try { fs.unlinkSync(listPath); } catch {} resolve(); })
        .on("error", reject)
        .run();
    });
  };

  try {
    await xfadeConcat();
  } catch (err) {
    // Older FFmpeg builds may not have xfade — fall back to hard-cut concat
    logger.warn("xfade unavailable, using hard-cut concat", { err: (err as Error).message });
    await streamConcat();
  }
}

async function applyColorGrade(inputPath: string, outputPath: string, style: string): Promise<void> {
  const grade = STYLE_COLOR_GRADES[style];
  if (!grade) { fs.copyFileSync(inputPath, outputPath); return; }
  return new Promise((resolve) => {
    ffmpeg(inputPath)
      .videoFilter(grade)
      .outputOptions(["-c:a", "copy", "-preset", "fast"])
      .output(outputPath)
      .on("end", () => resolve())
      .on("error", () => { fs.copyFileSync(inputPath, outputPath); resolve(); }) // fail-open
      .run();
  });
}

async function addAudio(videoPath: string, audioPath: string | undefined, outputPath: string, volume: number): Promise<void> {
  if (!audioPath || !fs.existsSync(audioPath)) {
    fs.copyFileSync(videoPath, outputPath);
    return;
  }

  const videoDuration = await getVideoDuration(videoPath);

  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .input(audioPath)
      .complexFilter([
        `[1:a]volume=${volume},aloop=loop=-1:size=2e+09,atrim=end=${videoDuration}[aout]`,
      ])
      .outputOptions([
        "-map", "0:v",
        "-map", "[aout]",
        "-c:v", "copy",
        "-c:a", "aac",
        "-b:a", "128k",
        "-shortest",
      ])
      .output(outputPath)
      .on("end", () => resolve())
      .on("error", reject)
      .run();
  });
}

function burnSubtitles(
  videoPath: string,
  text: string,
  outputPath: string,
  style: string,
  brandColor: string = "#ffffff",
  width: number,
  height: number,
  videoDuration?: number,
): Promise<void> {
  const fontPath = process.env.FFMPEG_FONT_PATH;
  const ff = fontPath ? `:fontfile=${fontPath}` : "";
  const fs_ = Math.round(height * 0.045);
  const styleMap: Record<string, string> = {
    modern:    `fontsize=${fs_}:fontcolor=white:bordercolor=black:borderw=4${ff}`,
    bold:      `fontsize=${Math.round(height * 0.055)}:fontcolor=yellow:bordercolor=black:borderw=6${ff}`,
    minimal:   `fontsize=${Math.round(height * 0.04)}:fontcolor=white:alpha=0.85${ff}`,
    trendy:    `fontsize=${Math.round(height * 0.05)}:fontcolor=white:bordercolor=0x00ff88:borderw=3${ff}`,
    cinematic: `fontsize=${Math.round(height * 0.038)}:fontcolor=0xffd700:bordercolor=black:borderw=2:alpha=0.95${ff}`,
    neon:      `fontsize=${fs_}:fontcolor=0x00ffff:shadowcolor=0x00ffff:shadowx=0:shadowy=0:bordercolor=black:borderw=3${ff}`,
    retro:     `fontsize=${fs_}:fontcolor=0xffa500:bordercolor=0x8b0000:borderw=4${ff}`,
    corporate: `fontsize=${Math.round(height * 0.038)}:fontcolor=white:bordercolor=0x003366:borderw=3${ff}`,
  };

  const yPos = height - Math.round(height * 0.2);
  const baseStyle = styleMap[style] || styleMap.modern;

  // Progressive reveal: split long text into time-windowed chunks
  // Short text (≤8 words) — show whole time. Longer — reveal in chunks.
  const clean = (t: string) => t.replace(/'/g, " ").replace(/:/g, " ").replace(/\n/g, " ").trim();
  const words = clean(text).slice(0, 200).split(/\s+/).filter(Boolean);
  const dur = videoDuration || 15;

  let drawTextFilter: string;

  if (words.length <= 8 || !videoDuration) {
    const safeText = words.join(" ");
    drawTextFilter = `drawtext=text='${safeText}':${baseStyle}:x=(w-text_w)/2:y=${yPos}:line_spacing=10:fix_bounds=true`;
  } else {
    // Split into 3 time-window chunks
    const chunkSize = Math.ceil(words.length / 3);
    const chunks = [
      words.slice(0, chunkSize).join(" "),
      words.slice(chunkSize, chunkSize * 2).join(" "),
      words.slice(chunkSize * 2).join(" "),
    ].filter(Boolean);

    const segDur = dur / chunks.length;
    drawTextFilter = chunks
      .map((chunk, i) => {
        const start = (i * segDur).toFixed(2);
        const end   = ((i + 1) * segDur).toFixed(2);
        return `drawtext=text='${chunk}':${baseStyle}:x=(w-text_w)/2:y=${yPos}:line_spacing=10:fix_bounds=true:enable='between(t,${start},${end})'`;
      })
      .join(",");
  }

  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .videoFilter(drawTextFilter)
      .outputOptions(["-c:a", "copy", "-preset", "fast"])
      .output(outputPath)
      .on("end", () => resolve())
      .on("error", reject)
      .run();
  });
}

function addWatermark(videoPath: string, logoPath: string, outputPath: string, width: number, height: number): Promise<void> {
  const logoSize = Math.round(width * 0.12);
  const padding = Math.round(width * 0.03);

  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .input(logoPath)
      .complexFilter([
        `[1:v]scale=${logoSize}:${logoSize}[logo]`,
        `[0:v][logo]overlay=x=${padding}:y=${padding}:format=auto,format=yuv420p[v]`,
      ])
      .outputOptions(["-map", "[v]", "-map", "0:a?", "-c:a", "copy", "-preset", "fast"])
      .output(outputPath)
      .on("end", () => resolve())
      .on("error", reject)
      .run();
  });
}

function extractThumbnail(videoPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .screenshots({ timestamps: ["00:00:01"], filename: path.basename(outputPath), folder: path.dirname(outputPath), size: "?x480" })
      .on("end", () => resolve())
      .on("error", reject);
  });
}

// ─── Quote card image generator ───────────────────────────────────────────────

const QUOTE_STYLES: Record<string, { bg: string; fg: string; border: string }> = {
  minimal_dark:    { bg: "0x0f0f0f", fg: "white", border: "0x22c55e" },
  bold_gradient:   { bg: "0x1a1a2e", fg: "0xffd700", border: "0xff6b6b" },
  elegant_white:   { bg: "white", fg: "0x1a1a1a", border: "0x6366f1" },
  neon_glow:       { bg: "0x0d0d0d", fg: "0x00ffcc", border: "0x00ffcc" },
  warm_cream:      { bg: "0xfff8e7", fg: "0x3d2b1f", border: "0xd4a853" },
};

export async function generateQuoteCard(
  quoteText: string,
  author: string,
  style: string,
  outputPath: string
): Promise<void> {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  const { bg, fg, border } = QUOTE_STYLES[style] || QUOTE_STYLES.minimal_dark;
  const w = 1080, h = 1080;
  const safe = quoteText.replace(/'/g, "").replace(/:/g, " ").replace(/\n/g, " ").slice(0, 120);
  const safeAuthor = author ? `— ${author}`.replace(/'/g, "").slice(0, 50) : "";
  const fontSize = safe.length > 80 ? 44 : safe.length > 50 ? 52 : 62;

  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(`color=c=${bg}:size=${w}x${h}:rate=1`)
      .inputOptions(["-f", "lavfi"])
      .videoFilter([
        `drawtext=text='${safe}':fontcolor=${fg}:fontsize=${fontSize}:x=(w-text_w)/2:y=(h-text_h)/2-60:line_spacing=16:fix_bounds=true:font=DejaVu Sans:style=Bold`,
        `drawtext=text='${safeAuthor}':fontcolor=${border}:fontsize=32:x=(w-text_w)/2:y=(h/2)+80:fix_bounds=true`,
        `drawbox=x=80:y=90:w=${w - 160}:h=4:color=${border}:t=fill`,
        `drawbox=x=80:y=${h - 94}:w=${w - 160}:h=4:color=${border}:t=fill`,
      ].join(","))
      .outputOptions(["-frames:v", "1", "-q:v", "2"])
      .output(outputPath)
      .on("end", () => resolve())
      .on("error", reject)
      .run();
  });
}

// ─── Thumbnail image generator ─────────────────────────────────────────────────

const THUMB_STYLES: Record<string, { bg: string; textColor: string; accent: string }> = {
  red_bold:      { bg: "0xcc0000", textColor: "white", accent: "0xff4444" },
  dark_pro:      { bg: "0x0a0a0a", textColor: "white", accent: "0x22c55e" },
  bright_pop:    { bg: "0xffdd00", textColor: "0x111111", accent: "0xff4500" },
  minimal_clean: { bg: "white", textColor: "0x1a1a1a", accent: "0x6366f1" },
  fire_gradient: { bg: "0x1a0000", textColor: "0xffa500", accent: "0xff4500" },
};

export async function generateThumbnailImage(
  title: string,
  subtitle: string,
  style: string,
  outputPath: string
): Promise<void> {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  const { bg, textColor, accent } = THUMB_STYLES[style] || THUMB_STYLES.dark_pro;
  const w = 1280, h = 720;
  const safeTitle = title.replace(/'/g, "").replace(/:/g, " ").toUpperCase().slice(0, 50);
  const safeSub = subtitle.replace(/'/g, "").replace(/:/g, " ").slice(0, 60);

  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(`color=c=${bg}:size=${w}x${h}:rate=1`)
      .inputOptions(["-f", "lavfi"])
      .videoFilter([
        `drawtext=text='${safeTitle}':fontcolor=${textColor}:fontsize=84:x=(w-text_w)/2:y=(h-text_h)/2-50:fix_bounds=true:font=DejaVu Sans:style=Bold`,
        `drawtext=text='${safeSub}':fontcolor=${accent}:fontsize=42:x=(w-text_w)/2:y=(h/2)+60:fix_bounds=true`,
        `drawbox=x=0:y=${h - 12}:w=${w}:h=12:color=${accent}:t=fill`,
      ].join(","))
      .outputOptions(["-frames:v", "1", "-q:v", "2"])
      .output(outputPath)
      .on("end", () => resolve())
      .on("error", reject)
      .run();
  });
}
