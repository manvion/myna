export type WorkspaceType =
  | "RESTAURANT"
  | "REAL_ESTATE"
  | "ECOMMERCE"
  | "CREATOR"
  | "BUSINESS_SERVICES"
  | "EVENTS"
  | "EDUCATION";

export type ContentType =
  | "REEL"
  | "POST"
  | "STORY"
  | "YOUTUBE_SHORT"
  | "TIKTOK"
  | "MARKETING_IMAGE"
  | "CAPTION_PACK";

export type AudioType = "BACKGROUND_MUSIC" | "USER_VOICE" | "AI_VOICEOVER" | "NONE";
export type AspectRatio = "PORTRAIT_9_16" | "SQUARE_1_1" | "LANDSCAPE_16_9";
export type JobStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
export type Platform = "INSTAGRAM" | "FACEBOOK" | "TIKTOK" | "YOUTUBE" | "DOWNLOAD_ONLY";

export interface GeneratedContent {
  id: string;
  userId: string;
  contentType: ContentType;
  jobStatus: JobStatus;
  hook?: string;
  script?: string;
  caption?: string;
  hashtags?: string[];
  callToAction?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  iteration: number;
  createdAt: string;
}

export interface VideoJobPayload {
  phone: string;
  userId: string;
  workspaceType: WorkspaceType;
  contentType: ContentType;
  inputType: "image" | "video" | "text" | "audio" | "url";
  mediaId?: string;
  prompt?: string;
  sourceUrl?: string;
  audioType: AudioType;
  style?: string;
  iteration?: number;
}

export interface WhatsAppMessage {
  id: string;
  from: string;
  type: "text" | "image" | "video" | "audio" | "interactive" | "document";
  text?: { body: string };
  image?: { id: string; mime_type: string };
  video?: { id: string; mime_type: string };
  audio?: { id: string; mime_type: string };
  interactive?: {
    type: "button_reply" | "list_reply";
    button_reply?: { id: string; title: string };
    list_reply?: { id: string; title: string };
  };
  timestamp: string;
}
