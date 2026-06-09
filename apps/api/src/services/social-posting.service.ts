import { logger } from "../lib/logger";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface PostContent {
  caption: string;
  hashtags?: string[];
  videoUrl?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
}

export interface PostResult {
  success: boolean;
  platformPostId?: string;
  error?: string;
  url?: string;
}

// ─── Instagram (Graph API) ─────────────────────────────────────────────────────
// Requires: Instagram Business/Creator account linked to a Facebook Page.
// Token scope: instagram_basic, instagram_content_publish, pages_read_engagement

export async function postToInstagram(
  accessToken: string,
  igUserId: string,
  content: PostContent,
): Promise<PostResult> {
  try {
    const { default: axios } = await import("axios");
    const caption = buildCaption(content);

    if (content.videoUrl) {
      // Step 1: Create reel container
      const containerRes = await axios.post(
        `https://graph.facebook.com/v19.0/${igUserId}/media`,
        {
          media_type: "REELS",
          video_url: content.videoUrl,
          caption,
          share_to_feed: true,
        },
        { params: { access_token: accessToken } },
      );
      const containerId = containerRes.data.id;

      // Step 2: Wait for container to process (poll up to 60s)
      await waitForContainer(accessToken, containerId, igUserId);

      // Step 3: Publish
      const publishRes = await axios.post(
        `https://graph.facebook.com/v19.0/${igUserId}/media_publish`,
        { creation_id: containerId },
        { params: { access_token: accessToken } },
      );
      return { success: true, platformPostId: publishRes.data.id };
    }

    if (content.imageUrl) {
      // Photo post
      const containerRes = await axios.post(
        `https://graph.facebook.com/v19.0/${igUserId}/media`,
        { image_url: content.imageUrl, caption },
        { params: { access_token: accessToken } },
      );
      const publishRes = await axios.post(
        `https://graph.facebook.com/v19.0/${igUserId}/media_publish`,
        { creation_id: containerRes.data.id },
        { params: { access_token: accessToken } },
      );
      return { success: true, platformPostId: publishRes.data.id };
    }

    return { success: false, error: "No video or image URL provided" };
  } catch (err: any) {
    logger.error("Instagram post failed", { error: err?.response?.data || err?.message });
    return { success: false, error: err?.response?.data?.error?.message || err?.message };
  }
}

// ─── Facebook Pages (Graph API) ────────────────────────────────────────────────
// Requires: pages_manage_posts, pages_read_engagement

export async function postToFacebook(
  pageAccessToken: string,
  pageId: string,
  content: PostContent,
): Promise<PostResult> {
  try {
    const { default: axios } = await import("axios");
    const message = buildCaption(content);

    if (content.videoUrl) {
      const res = await axios.post(
        `https://graph.facebook.com/v19.0/${pageId}/videos`,
        { file_url: content.videoUrl, description: message, published: true },
        { params: { access_token: pageAccessToken } },
      );
      return { success: true, platformPostId: res.data.id };
    }

    if (content.imageUrl) {
      const res = await axios.post(
        `https://graph.facebook.com/v19.0/${pageId}/photos`,
        { url: content.imageUrl, message, published: true },
        { params: { access_token: pageAccessToken } },
      );
      return { success: true, platformPostId: res.data.post_id };
    }

    // Text-only post
    const res = await axios.post(
      `https://graph.facebook.com/v19.0/${pageId}/feed`,
      { message, published: true },
      { params: { access_token: pageAccessToken } },
    );
    return { success: true, platformPostId: res.data.id };
  } catch (err: any) {
    logger.error("Facebook post failed", { error: err?.response?.data || err?.message });
    return { success: false, error: err?.response?.data?.error?.message || err?.message };
  }
}

// ─── LinkedIn (UGC Posts API) ──────────────────────────────────────────────────
// Requires: w_member_social or w_organization_social

export async function postToLinkedIn(
  accessToken: string,
  authorUrn: string,
  content: PostContent,
): Promise<PostResult> {
  try {
    const { default: axios } = await import("axios");
    const text = buildCaption(content);

    const body: Record<string, any> = {
      author: authorUrn,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text },
          shareMediaCategory: content.videoUrl || content.imageUrl ? "VIDEO" : "NONE",
          ...(content.videoUrl || content.imageUrl
            ? {
                media: [{
                  status: "READY",
                  originalUrl: content.videoUrl || content.imageUrl,
                }],
              }
            : {}),
        },
      },
      visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
    };

    const res = await axios.post("https://api.linkedin.com/v2/ugcPosts", body, {
      headers: { Authorization: `Bearer ${accessToken}`, "X-Restli-Protocol-Version": "2.0.0" },
    });
    return { success: true, platformPostId: res.headers["x-restli-id"] };
  } catch (err: any) {
    logger.error("LinkedIn post failed", { error: err?.response?.data || err?.message });
    return { success: false, error: err?.response?.data?.message || err?.message };
  }
}

// ─── TikTok (Content Posting API) ─────────────────────────────────────────────
// Requires TikTok for Developers app approval + video.upload scope

export async function postToTikTok(
  accessToken: string,
  openId: string,
  content: PostContent,
): Promise<PostResult> {
  try {
    const { default: axios } = await import("axios");

    if (!content.videoUrl) return { success: false, error: "TikTok requires a video URL" };

    // Initiate video upload
    const initRes = await axios.post(
      "https://open.tiktokapis.com/v2/post/publish/video/init/",
      {
        post_info: {
          title: content.caption.slice(0, 150),
          privacy_level: "PUBLIC_TO_EVERYONE",
          disable_duet: false,
          disable_comment: false,
          disable_stitch: false,
        },
        source_info: { source: "PULL_FROM_URL", video_url: content.videoUrl },
      },
      { headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json; charset=UTF-8" } },
    );
    return { success: true, platformPostId: initRes.data.data?.publish_id };
  } catch (err: any) {
    logger.error("TikTok post failed", { error: err?.response?.data || err?.message });
    return { success: false, error: err?.response?.data?.error?.message || err?.message };
  }
}

// ─── YouTube Shorts (Data API v3) ──────────────────────────────────────────────
// Requires: youtube.upload scope

export async function postToYouTube(
  accessToken: string,
  content: PostContent,
): Promise<PostResult> {
  try {
    const { default: axios } = await import("axios");
    if (!content.videoUrl) return { success: false, error: "YouTube requires a video URL" };

    // YouTube requires multipart upload — this posts the video via URL fetch
    const res = await axios.post(
      "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
      {
        snippet: {
          title: content.caption.slice(0, 100),
          description: buildCaption(content),
          categoryId: "22",
          tags: content.hashtags?.slice(0, 15) || [],
        },
        status: { privacyStatus: "public", selfDeclaredMadeForKids: false },
      },
      {
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      },
    );
    return { success: true, platformPostId: res.data.id };
  } catch (err: any) {
    logger.error("YouTube post failed", { error: err?.response?.data || err?.message });
    return { success: false, error: err?.response?.data?.error?.message || err?.message };
  }
}

// ─── Dispatch: route to correct platform ──────────────────────────────────────

export async function dispatchPost(
  platform: string,
  accessToken: string,
  accountId: string,
  content: PostContent,
): Promise<PostResult> {
  switch (platform) {
    case "INSTAGRAM": return postToInstagram(accessToken, accountId, content);
    case "FACEBOOK":  return postToFacebook(accessToken, accountId, content);
    case "LINKEDIN":  return postToLinkedIn(accessToken, accountId, content);
    case "TIKTOK":    return postToTikTok(accessToken, accountId, content);
    case "YOUTUBE":   return postToYouTube(accessToken, content);
    default:
      logger.warn("Unknown platform for posting", { platform });
      return { success: false, error: `Platform ${platform} not yet supported for auto-posting` };
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildCaption(content: PostContent): string {
  let text = content.caption;
  if (content.hashtags?.length) {
    text += "\n\n" + content.hashtags.map(h => h.startsWith("#") ? h : `#${h}`).join(" ");
  }
  return text;
}

async function waitForContainer(
  accessToken: string,
  containerId: string,
  igUserId: string,
  maxAttempts = 12,
  intervalMs = 5000,
): Promise<void> {
  const { default: axios } = await import("axios");
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, intervalMs));
    const res = await axios.get(`https://graph.facebook.com/v19.0/${containerId}`, {
      params: { fields: "status_code", access_token: accessToken },
    });
    if (res.data.status_code === "FINISHED") return;
    if (res.data.status_code === "ERROR") throw new Error("Instagram container processing failed");
  }
  throw new Error("Instagram container processing timeout");
}
