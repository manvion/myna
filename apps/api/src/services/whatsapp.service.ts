import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import { logger } from "../lib/logger";

const BASE_URL = "https://graph.facebook.com/v19.0";
const PHONE_ID = () => process.env.WHATSAPP_PHONE_NUMBER_ID!;
const TOKEN = () => process.env.WHATSAPP_ACCESS_TOKEN!;

function headers() {
  return { Authorization: `Bearer ${TOKEN()}`, "Content-Type": "application/json" };
}

// ─── Message types ────────────────────────────────────────────────────────────

export type WaButton = { id: string; title: string };

export async function sendText(to: string, body: string): Promise<string> {
  const res = await api().post(`/${PHONE_ID()}/messages`, {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body },
  });
  return res.data.messages?.[0]?.id;
}

export async function sendButtons(
  to: string,
  body: string,
  buttons: WaButton[],
  header?: string,
  footer?: string
): Promise<string> {
  const res = await api().post(`/${PHONE_ID()}/messages`, {
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "button",
      ...(header ? { header: { type: "text", text: header } } : {}),
      body: { text: body },
      ...(footer ? { footer: { text: footer } } : {}),
      action: {
        buttons: buttons.slice(0, 3).map((b) => ({
          type: "reply",
          reply: { id: b.id, title: b.title.slice(0, 20) },
        })),
      },
    },
  });
  return res.data.messages?.[0]?.id;
}

export async function sendList(
  to: string,
  body: string,
  buttonLabel: string,
  sections: Array<{ title: string; rows: Array<{ id: string; title: string; description?: string }> }>
): Promise<string> {
  const res = await api().post(`/${PHONE_ID()}/messages`, {
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "list",
      body: { text: body },
      action: { button: buttonLabel, sections },
    },
  });
  return res.data.messages?.[0]?.id;
}

export async function sendMedia(
  to: string,
  type: "image" | "video" | "document",
  mediaUrl: string,
  caption?: string,
  filename?: string
): Promise<string> {
  const res = await api().post(`/${PHONE_ID()}/messages`, {
    messaging_product: "whatsapp",
    to,
    type,
    [type]: {
      link: mediaUrl,
      ...(caption ? { caption } : {}),
      ...(filename ? { filename } : {}),
    },
  });
  return res.data.messages?.[0]?.id;
}

export async function sendTemplate(
  to: string,
  templateName: string,
  languageCode: string,
  components?: object[]
): Promise<string> {
  const res = await api().post(`/${PHONE_ID()}/messages`, {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: templateName,
      language: { code: languageCode },
      components,
    },
  });
  return res.data.messages?.[0]?.id;
}

export async function markAsRead(messageId: string): Promise<void> {
  await api().post(`/${PHONE_ID()}/messages`, {
    messaging_product: "whatsapp",
    status: "read",
    message_id: messageId,
  });
}

export async function downloadMedia(mediaId: string): Promise<Buffer> {
  const { data: meta } = await api().get(`/${mediaId}`);
  const { data } = await axios.get(meta.url, {
    headers: { Authorization: `Bearer ${TOKEN()}` },
    responseType: "arraybuffer",
  });
  return Buffer.from(data);
}

export async function uploadMedia(filePath: string, mimeType: string): Promise<string> {
  const form = new FormData();
  form.append("messaging_product", "whatsapp");
  form.append("file", fs.createReadStream(filePath), { contentType: mimeType });
  const res = await api().post(`/${PHONE_ID()}/media`, form, {
    headers: { ...form.getHeaders(), Authorization: `Bearer ${TOKEN()}` },
  });
  return res.data.id;
}

function api() {
  return axios.create({
    baseURL: BASE_URL,
    headers: headers(),
    timeout: 30000,
  });
}
