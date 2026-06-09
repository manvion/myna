import { Router, Request, Response } from "express";
import axios from "axios";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";
import { logger } from "../lib/logger";

export const oauthRouter = Router();

const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL || "http://localhost:3000";

function getUserIdFromToken(req: Request): string | null {
  const token = req.headers.authorization?.replace("Bearer ", "") || req.query.state as string;
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    return decoded.userId;
  } catch {
    return null;
  }
}

// ── Instagram OAuth ────────────────────────────────────────────────────────────

oauthRouter.get("/instagram/connect", (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const params = new URLSearchParams({
    client_id: process.env.INSTAGRAM_APP_ID!,
    redirect_uri: `${process.env.API_BASE_URL}/api/oauth/instagram/callback`,
    scope: "instagram_basic,instagram_content_publish,pages_read_engagement",
    response_type: "code",
    state: token || "",
  });
  res.redirect(`https://api.instagram.com/oauth/authorize?${params}`);
});

oauthRouter.get("/instagram/callback", async (req: Request, res: Response) => {
  const { code, state } = req.query as { code: string; state: string };
  if (!code) return res.redirect(`${WEB_URL}/connect?error=no_code`);

  const userId = state ? (() => { try { return (jwt.verify(state, process.env.JWT_SECRET!) as any).userId; } catch { return null; } })() : null;
  if (!userId) return res.redirect(`${WEB_URL}/connect?error=invalid_state`);

  try {
    // Exchange code for short-lived token
    const tokenRes = await axios.post("https://api.instagram.com/oauth/access_token", new URLSearchParams({
      client_id: process.env.INSTAGRAM_APP_ID!,
      client_secret: process.env.INSTAGRAM_APP_SECRET!,
      grant_type: "authorization_code",
      redirect_uri: `${process.env.API_BASE_URL}/api/oauth/instagram/callback`,
      code,
    }), { headers: { "Content-Type": "application/x-www-form-urlencoded" } });

    const shortToken = tokenRes.data.access_token;
    const igUserId = tokenRes.data.user_id;

    // Exchange for long-lived token (60 days)
    const longRes = await axios.get("https://graph.instagram.com/access_token", {
      params: { grant_type: "ig_exchange_token", client_secret: process.env.INSTAGRAM_APP_SECRET, access_token: shortToken },
    });

    const longToken = longRes.data.access_token;
    const expiresAt = new Date(Date.now() + longRes.data.expires_in * 1000);

    // Get account name
    const profileRes = await axios.get(`https://graph.instagram.com/${igUserId}`, {
      params: { fields: "id,username", access_token: longToken },
    });

    await prisma.socialAccount.upsert({
      where: { userId_platform: { userId, platform: "INSTAGRAM" } },
      create: { userId, platform: "INSTAGRAM", accountId: igUserId, accountName: profileRes.data.username, accessToken: longToken, tokenExpiresAt: expiresAt, isActive: true },
      update: { accessToken: longToken, tokenExpiresAt: expiresAt, isActive: true, accountName: profileRes.data.username },
    });

    res.redirect(`${WEB_URL}/connect?success=instagram`);
  } catch (err) {
    logger.error("Instagram OAuth error", { err: (err as Error).message });
    res.redirect(`${WEB_URL}/connect?error=instagram_failed`);
  }
});

// ── Facebook OAuth ─────────────────────────────────────────────────────────────

oauthRouter.get("/facebook/connect", (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const params = new URLSearchParams({
    client_id: process.env.FACEBOOK_APP_ID!,
    redirect_uri: `${process.env.API_BASE_URL}/api/oauth/facebook/callback`,
    scope: "pages_manage_posts,pages_read_engagement,publish_video",
    response_type: "code",
    state: token || "",
  });
  res.redirect(`https://www.facebook.com/v19.0/dialog/oauth?${params}`);
});

oauthRouter.get("/facebook/callback", async (req: Request, res: Response) => {
  const { code, state } = req.query as { code: string; state: string };
  if (!code) return res.redirect(`${WEB_URL}/connect?error=no_code`);

  const userId = state ? (() => { try { return (jwt.verify(state, process.env.JWT_SECRET!) as any).userId; } catch { return null; } })() : null;
  if (!userId) return res.redirect(`${WEB_URL}/connect?error=invalid_state`);

  try {
    const tokenRes = await axios.get("https://graph.facebook.com/v19.0/oauth/access_token", {
      params: { client_id: process.env.FACEBOOK_APP_ID, client_secret: process.env.FACEBOOK_APP_SECRET, redirect_uri: `${process.env.API_BASE_URL}/api/oauth/facebook/callback`, code },
    });

    const accessToken = tokenRes.data.access_token;

    const meRes = await axios.get("https://graph.facebook.com/me", {
      params: { fields: "id,name", access_token: accessToken },
    });

    await prisma.socialAccount.upsert({
      where: { userId_platform: { userId, platform: "FACEBOOK" } },
      create: { userId, platform: "FACEBOOK", accountId: meRes.data.id, accountName: meRes.data.name, accessToken, isActive: true },
      update: { accessToken, isActive: true, accountName: meRes.data.name },
    });

    res.redirect(`${WEB_URL}/connect?success=facebook`);
  } catch (err) {
    logger.error("Facebook OAuth error", { err: (err as Error).message });
    res.redirect(`${WEB_URL}/connect?error=facebook_failed`);
  }
});

// ── TikTok OAuth ───────────────────────────────────────────────────────────────

oauthRouter.get("/tiktok/connect", (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const params = new URLSearchParams({
    client_key: process.env.TIKTOK_CLIENT_KEY!,
    redirect_uri: `${process.env.API_BASE_URL}/api/oauth/tiktok/callback`,
    scope: "video.upload,user.info.basic",
    response_type: "code",
    state: token || "",
  });
  res.redirect(`https://www.tiktok.com/auth/authorize?${params}`);
});

oauthRouter.get("/tiktok/callback", async (req: Request, res: Response) => {
  const { code, state } = req.query as { code: string; state: string };
  if (!code) return res.redirect(`${WEB_URL}/connect?error=no_code`);

  const userId = state ? (() => { try { return (jwt.verify(state, process.env.JWT_SECRET!) as any).userId; } catch { return null; } })() : null;
  if (!userId) return res.redirect(`${WEB_URL}/connect?error=invalid_state`);

  try {
    const tokenRes = await axios.post("https://open-api.tiktok.com/oauth/access_token/", {
      client_key: process.env.TIKTOK_CLIENT_KEY,
      client_secret: process.env.TIKTOK_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
    });

    const { access_token, open_id, expires_in, refresh_token } = tokenRes.data.data;

    await prisma.socialAccount.upsert({
      where: { userId_platform: { userId, platform: "TIKTOK" } },
      create: { userId, platform: "TIKTOK", accountId: open_id, accountName: open_id, accessToken: access_token, refreshToken: refresh_token, tokenExpiresAt: new Date(Date.now() + expires_in * 1000), isActive: true },
      update: { accessToken: access_token, refreshToken: refresh_token, tokenExpiresAt: new Date(Date.now() + expires_in * 1000), isActive: true },
    });

    res.redirect(`${WEB_URL}/connect?success=tiktok`);
  } catch (err) {
    logger.error("TikTok OAuth error", { err: (err as Error).message });
    res.redirect(`${WEB_URL}/connect?error=tiktok_failed`);
  }
});

// ── Disconnect a platform ──────────────────────────────────────────────────────

oauthRouter.delete("/:platform", async (req: Request, res: Response) => {
  const userId = getUserIdFromToken(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const platform = req.params.platform.toUpperCase();
  await prisma.socialAccount.updateMany({
    where: { userId, platform: platform as any },
    data: { isActive: false },
  });

  res.json({ success: true });
});

// ── List connected accounts ────────────────────────────────────────────────────

oauthRouter.get("/accounts", async (req: Request, res: Response) => {
  const userId = getUserIdFromToken(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const accounts = await prisma.socialAccount.findMany({
    where: { userId, isActive: true },
    select: { platform: true, accountName: true, tokenExpiresAt: true, createdAt: true },
  });

  res.json({ accounts });
});
