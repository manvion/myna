import { prisma } from "../lib/prisma";
import { logger } from "../lib/logger";
import * as wa from "./whatsapp.service";
import { videoQueue, aiQueue, scrapingQueue, postingQueue } from "../queues";
import { WorkspaceType } from "@prisma/client";
import { alert } from "../lib/notifications";
import {
  WORKSPACE_QUICK_ACTIONS,
  buildCaptionOnlyPrompt,
  buildRepurposePrompt,
  buildSeriesPrompt,
  buildBroadcastPrompt,
  buildAdCopyPrompt,
  buildWeeklyCalendarPrompt,
  buildHashtagsPrompt,
  buildBioPrompt,
  buildPollPrompt,
  buildCommentReplyPrompt,
  buildTranslationPrompt,
  buildQuotePrompt,
  buildThumbnailPrompt,
  buildScriptPrompt,
  buildEmailPrompt,
  buildPropertySuitePrompt,
  buildMortgagePostPrompt,
  buildNeighborhoodGuidePrompt,
  buildDishSuitePrompt,
  buildCateringPrompt,
  buildDeliveryLaunchPrompt,
  buildProductLaunchPrompt,
  buildProductComparePrompt,
  buildGiftGuidePrompt,
  buildViralHookPrompt,
  buildGiveawayPrompt,
  buildCollabPrompt,
  buildSoldPrompt,
  buildOpenHousePrompt,
  buildOfferPrompt,
  buildTicketsPrompt,
  buildFreeClassPrompt,
  buildCaseStudyPrompt,
  buildWebinarPrompt,
  buildLineupRevealPrompt,
  buildEventRecapPrompt,
  buildCourseLaunchPrompt,
  buildStudentResultPrompt,
  buildWeddingContentPrompt,
  buildTributePrompt,
  buildGraduationPrompt,
  buildTestimonialPrompt,
  buildRenovationPrompt,
  buildGrandOpeningPrompt,
  buildCreatorChallengePrompt,
  buildQAPrompt,
  buildServiceProcessPrompt,
  buildVenueRevealPrompt,
  buildEarlyBirdPrompt,
  buildSponsorPrompt,
  buildScholarshipPrompt,
  buildAchievementPrompt,
  // Universal kit
  buildContentKitPrompt,
  // Fitness & Gym
  buildFitnessTransformationPrompt,
  buildFitnessClassPrompt,
  // Salon & Spa
  buildSalonServicePrompt,
  buildSalonBookingPrompt,
  // Fashion
  buildFashionDropPrompt,
  buildFashionLookbookPrompt,
  // Travel
  buildTravelPackagePrompt,
  buildTravelDestinationPrompt,
  // Healthcare
  buildHealthAwarenessPrompt,
  buildHealthAppointmentPrompt,
  // Automobile
  buildVehicleShowcasePrompt,
  buildServiceCenterPrompt,
  // Photography
  buildPhotographyPortfolioPrompt,
  buildPhotographyBookingPrompt,
  // Interior Design
  buildInteriorProjectPrompt,
  buildInteriorPortfolioPrompt,
  // Hotel
  buildHotelPackagePrompt,
  buildHotelReviewPrompt,
  // Jewelry
  buildJewelryCollectionPrompt,
  buildJewelryCustomPrompt,
} from "../templates/prompts";
import { chat, describeImage } from "./ai.service";
import { extractFirstFrame } from "./ffmpeg.service";
import { getNearestFestival } from "../lib/festivals";
import { moderateText, moderateImage, getModerationMessage, checkOutputCompliance, getComplianceWarningMessage } from "../lib/moderation";
import { checkRelevance } from "../lib/relevance";
import { detectLanguageFromScript, LANGUAGES } from "../lib/languages";
import { processWithAgent, generateFollowUpSuggestion } from "./agent.service";
import { updateAgentMemory } from "../lib/agent-memory";
import { calculatePrice, getUpgradeMessage } from "../lib/pricing";
import { checkUserQuota, recordGeneration } from "../middleware/quota";

// ─── Compliance-safe send helper ──────────────────────────────────────────────
// Runs output compliance check on any AI-generated text before delivery.
// Replaces flagged phrases with [Verify: ...] and sends a warning follow-up.

async function sendSafe(phone: string, text: string): Promise<void> {
  const { clean, warnings } = checkOutputCompliance(text);
  await wa.sendText(phone, clean);
  if (warnings.length > 0) {
    await wa.sendText(phone, getComplianceWarningMessage(warnings));
  }
}

// ─── Flow definitions ─────────────────────────────────────────────────────────

type FlowStep =
  | "GREETING"
  | "IDLE"
  | "AWAITING_INPUT"
  | "AWAITING_LANG"
  | "AWAITING_PLATFORM"
  | "CONTENT_TYPE_SELECT"
  | "AUDIO_SELECT"
  | "ASPECT_SELECT"
  | "AWAITING_GENERATION"
  | "AWAITING_CAPTION"
  | "AWAITING_DISCLAIMER"
  | "AWAITING_RELEVANCE_CONFIRM"
  | "AWAITING_BRANDING"
  | "PREVIEW"
  | "POST_APPROVAL";

interface IncomingMessage {
  phone: string;
  waMessageId: string;
  displayName?: string;
  message: any;
}

interface ConversationCtx {
  flow: FlowStep;
  data: Record<string, any>;
}

// ─── Workspace button configs ─────────────────────────────────────────────────

const WORKSPACE_CONTENT_BUTTONS: Record<WorkspaceType, wa.WaButton[]> = {
  RESTAURANT: [
    { id: "ct_reel", title: "🎬 Viral Reel" },
    { id: "ct_menu", title: "🍽 Menu Promo" },
    { id: "ct_offer", title: "📢 Offer Post" },
  ],
  REAL_ESTATE: [
    { id: "ct_reel", title: "🎬 Property Tour" },
    { id: "ct_listing", title: "🏠 Listing Post" },
    { id: "ct_offer", title: "💰 Deal Promo" },
  ],
  ECOMMERCE: [
    { id: "ct_reel", title: "🎬 Product Reel" },
    { id: "ct_listing", title: "📦 Product Post" },
    { id: "ct_offer", title: "🔖 Sale Promo" },
  ],
  CREATOR: [
    { id: "ct_reel", title: "🎬 Viral Reel" },
    { id: "ct_listing", title: "📸 Content Post" },
    { id: "ct_offer", title: "🎯 Collab Ad" },
  ],
  BUSINESS_SERVICES: [
    { id: "ct_reel", title: "🎬 Brand Reel" },
    { id: "ct_listing", title: "💼 Service Post" },
    { id: "ct_offer", title: "📢 Promo Post" },
  ],
  EVENTS: [
    { id: "ct_reel", title: "🎬 Event Teaser" },
    { id: "ct_listing", title: "📅 Event Post" },
    { id: "ct_offer", title: "🎟 Ticket Promo" },
  ],
  EDUCATION: [
    { id: "ct_reel", title: "🎬 Edu Reel" },
    { id: "ct_listing", title: "📚 Course Post" },
    { id: "ct_offer", title: "🎓 Enroll Promo" },
  ],
  PERSONAL: [
    { id: "ct_reel", title: "🎬 Memory Reel" },
    { id: "ct_listing", title: "📸 Photo Post" },
    { id: "ct_offer", title: "💌 Status Story" },
  ],
  FITNESS_GYM: [
    { id: "ct_reel", title: "🎬 Workout Reel" },
    { id: "ct_listing", title: "💪 Class Promo" },
    { id: "ct_offer", title: "📢 Membership" },
  ],
  SALON_SPA: [
    { id: "ct_reel", title: "🎬 Service Reel" },
    { id: "ct_listing", title: "✨ Treatment Post" },
    { id: "ct_offer", title: "📅 Booking Promo" },
  ],
  FASHION: [
    { id: "ct_reel", title: "🎬 Collection Reel" },
    { id: "ct_listing", title: "👗 Lookbook Post" },
    { id: "ct_offer", title: "🔖 Sale Promo" },
  ],
  TRAVEL: [
    { id: "ct_reel", title: "🎬 Destination Reel" },
    { id: "ct_listing", title: "✈️ Package Post" },
    { id: "ct_offer", title: "🏖️ Special Deal" },
  ],
  HEALTHCARE: [
    { id: "ct_reel", title: "🎬 Awareness Reel" },
    { id: "ct_listing", title: "🏥 Service Post" },
    { id: "ct_offer", title: "📅 Book Appt" },
  ],
  AUTOMOBILE: [
    { id: "ct_reel", title: "🎬 Vehicle Reel" },
    { id: "ct_listing", title: "🚗 Showcase Post" },
    { id: "ct_offer", title: "🔧 Service Offer" },
  ],
  PHOTOGRAPHY: [
    { id: "ct_reel", title: "🎬 Portfolio Reel" },
    { id: "ct_listing", title: "📸 Gallery Post" },
    { id: "ct_offer", title: "📅 Book Session" },
  ],
  INTERIOR_DESIGN: [
    { id: "ct_reel", title: "🎬 Project Reel" },
    { id: "ct_listing", title: "🛋️ Portfolio Post" },
    { id: "ct_offer", title: "🏠 New Project" },
  ],
  HOTEL: [
    { id: "ct_reel", title: "🎬 Hotel Reel" },
    { id: "ct_listing", title: "🏨 Package Post" },
    { id: "ct_offer", title: "🌟 Special Offer" },
  ],
  JEWELRY: [
    { id: "ct_reel", title: "🎬 Collection Reel" },
    { id: "ct_listing", title: "💎 Piece Showcase" },
    { id: "ct_offer", title: "🎁 Gift Special" },
  ],
};

import { WORKSPACE_LABELS } from "../lib/workspace-labels";

// ─── Photo enhancement helper ─────────────────────────────────────────────────
// Sharp-based image enhancement + branded bottom overlay for KIT photo flow.

async function enhancePhotoWithOverlay(imageBuffer: Buffer, label: string, workspaceType: string): Promise<Buffer> {
  const { default: sharp } = await import("sharp");
  const metadata = await sharp(imageBuffer).metadata();
  const width = metadata.width || 800;
  const height = metadata.height || 600;

  const overlayH = Math.max(60, Math.round(height * 0.11));
  const fontSize = Math.max(16, Math.round(overlayH * 0.36));
  const subFontSize = Math.max(11, Math.round(overlayH * 0.26));
  const wsLabel = workspaceType.replace(/_/g, " ");

  // Escape XML special chars to avoid SVG injection
  const safe = (t: string) => t.replace(/[<>&"']/g, (c) => (({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;" } as Record<string, string>)[c] ?? c));
  const safeLabel = safe(label.length > 45 ? label.slice(0, 45) + "…" : label);

  const svgOverlay = `<svg width="${width}" height="${overlayH}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${width}" height="${overlayH}" fill="rgba(0,0,0,0.68)"/>
    <text x="18" y="${Math.round(overlayH * 0.57)}" font-family="Arial,Helvetica,sans-serif" font-size="${fontSize}" font-weight="bold" fill="#ffffff">${safeLabel}</text>
    <text x="18" y="${Math.round(overlayH * 0.88)}" font-family="Arial,Helvetica,sans-serif" font-size="${subFontSize}" fill="#aaaaaa">${safe(wsLabel)} · Powered by Myna</text>
  </svg>`;

  return sharp(imageBuffer)
    .modulate({ brightness: 1.07, saturation: 1.12 })
    .linear(1.06, -5)
    .composite([{ input: Buffer.from(svgOverlay), gravity: "south" }])
    .jpeg({ quality: 88 })
    .toBuffer();
}

// ─── Flow Engine ──────────────────────────────────────────────────────────────

export class WhatsAppFlowEngine {
  async handleIncoming(incoming: IncomingMessage): Promise<void> {
    const { phone, waMessageId, message, displayName } = incoming;

    try {
      await wa.markAsRead(waMessageId);

      // Save message to DB
      const user = await this.getOrCreateUser(phone, displayName);
      await prisma.whatsAppMessage.create({
        data: {
          userId: user.id,
          waMessageId,
          waPhoneNumber: phone,
          direction: "INBOUND",
          messageType: message.type,
          textBody: message.text?.body,
          mediaId: message.image?.id || message.video?.id || message.audio?.id,
          selectedButton: message.interactive?.button_reply?.id || message.interactive?.list_reply?.id,
        },
      });

      const ctx = await this.getContext(phone);

      // Auto-detect language from script on first few messages (if still English default)
      if (user.language === "English" || !user.language) {
        const textBody = message.text?.body || message.image?.caption || message.video?.caption || "";
        if (textBody.length > 3) {
          const detected = detectLanguageFromScript(textBody);
          if (detected && detected !== "English" && LANGUAGES[detected]) {
            // Save detected script but only auto-confirm after user responds to prompt
            await prisma.user.update({ where: { id: user.id }, data: { detectedScript: LANGUAGES[detected].script } as any });
            if (!ctx.data.langDetectionSent) {
              await wa.sendButtons(
                phone,
                LANGUAGES[detected].detectionMessage,
                [
                  { id: `lang_confirm_${detected}`, title: `✅ Yes, ${detected}` },
                  { id: "lang_keep_english", title: "🇬🇧 Keep English" },
                ],
                "Language Detected"
              );
              await this.setContext(phone, { ...ctx, data: { ...ctx.data, langDetectionSent: true, detectedLang: detected } });
              return;
            }
          }
        }
      }

      // No account or no workspace → send to web signup, not WhatsApp onboarding
      if (!user.workspace) {
        await this.handleNoAccount(phone, user, ctx);
        return;
      }

      // First ever WhatsApp message from a registered user → greet + disclaimer
      if (ctx.flow === "GREETING") {
        await this.sendWelcomeBack(phone, user);
        await this.sendDisclaimer(phone);
        await this.setContext(phone, { flow: "AWAITING_DISCLAIMER", data: {} });
        return;
      }

      // Disclaimer pending — require acceptance before any content generation
      if (ctx.flow === "AWAITING_DISCLAIMER") {
        const buttonId = message.interactive?.button_reply?.id;
        if (buttonId === "disclaimer_accept") {
          await prisma.user.update({ where: { id: user.id }, data: { onboardingStep: "COMPLETED" } });
          await this.setContext(phone, { flow: "IDLE", data: {} });
          await wa.sendText(phone, "✅ You're all set!\n\nSend me a *photo or video* and I'll create content instantly.\n\nOr pick what you'd like to make 👇");
          await this.sendWorkspaceMenu(phone, user.workspace.type as WorkspaceType);
          return;
        }
        if (buttonId === "disclaimer_decline") {
          await wa.sendText(phone, "No problem. You can review our Terms of Service at myna.app/terms anytime. Message us again when you're ready to get started.");
          return;
        }
        // They sent something else while disclaimer is pending — remind them
        await this.sendDisclaimer(phone);
        return;
      }

      await this.handleMainFlow(phone, user, message, ctx);
    } catch (err) {
      logger.error("Flow engine error", { phone, err: (err as Error).message });
      await wa.sendText(phone, "⚠️ Something went wrong. Please try again.");
    }
  }

  // ─── No account: redirect to web signup ─────────────────────────────────────

  private async handleNoAccount(phone: string, user: any, ctx: ConversationCtx) {
    const webUrl = process.env.NEXT_PUBLIC_WEB_URL || "https://myna.app";
    if (ctx.flow !== "GREETING") return; // only send once
    await wa.sendButtons(
      phone,
      `👋 Hey! To start creating AI content, set up your free account first — takes 60 seconds.\n\n` +
      `Pick your business type, connect your socials, and you're ready. No credit card needed.`,
      [{ id: "signup_link", title: "🚀 Get Started Free" }],
      `👉 ${webUrl}/signup`
    );
    await this.setContext(phone, { flow: "IDLE", data: {} }); // prevent repeat sends
  }

  // ─── Legal disclaimer (sent once on first use) ───────────────────────────────

  private async sendDisclaimer(phone: string) {
    const webUrl = process.env.NEXT_PUBLIC_WEB_URL || "https://myna.app";
    await wa.sendButtons(
      phone,
      `📋 *Before we start — please read:*\n\n` +
      `By using AI Content Studio you confirm:\n\n` +
      `✅ You own or have rights to all content you share\n` +
      `✅ You take full responsibility for content you generate and publish\n` +
      `✅ You will not use this service to create harmful, deceptive, or illegal content\n` +
      `✅ You understand AI-generated content may not always be accurate\n\n` +
      `We do not store your media beyond processing and do not share your content with third parties.\n\n` +
      `📄 Full terms: ${webUrl}/terms`,
      [
        { id: "disclaimer_accept", title: "✅ I Agree" },
        { id: "disclaimer_decline", title: "❌ No Thanks" },
      ],
      "Terms of Use"
    );
  }

  // ─── First WhatsApp message from registered user ──────────────────────────────

  private async sendWelcomeBack(phone: string, user: any) {
    const name = user.name?.split(" ")[0] || "there";
    const workspace = user.workspace;
    await wa.sendButtons(
      phone,
      `Hey *${name}*! 👋\n\n` +
      `Just send me a *photo*, *video*, or *describe what you want* — I'll create the content.\n\n` +
      `Or tap below to pick what to make today 👇`,
      [{ id: `guide_more_${workspace.type}`, title: "📋 What can you make?" }],
      `Your ${WORKSPACE_LABELS[workspace.type as WorkspaceType]} AI studio is ready`
    );
  }

  // ─── Main flow ───────────────────────────────────────────────────────────────

  private async handleMainFlow(phone: string, user: any, message: any, ctx: ConversationCtx) {
    const { flow } = ctx;
    const workspace = user.workspace;

    // Handle button replies at any step
    const buttonId = message.interactive?.button_reply?.id || message.interactive?.list_reply?.id;

    // ── AWAITING_RELEVANCE_CONFIRM ─────────────────────────────────────────
    if (flow === "AWAITING_RELEVANCE_CONFIRM") {
        if (buttonId === "relevance_continue") {
          await this.checkAndPromptBranding(phone, user, workspace, ctx.data);
        } else {
          await this.setContext(phone, { flow: "IDLE", data: {} });
          await wa.sendText(phone, "Cancelled. Send me content that matches your workspace when you're ready! 🚀");
        }
        return;
      }

      // Branding response
      if (flow === "AWAITING_BRANDING") {
        const webUrl = process.env.NEXT_PUBLIC_WEB_URL || "https://myna.app";
        if (buttonId === "brand_setup") {
          await this.setContext(phone, { flow: "IDLE", data: {} });
          await wa.sendText(phone, `⚙️ Set up your permanent brand kit here:\n${webUrl}/dashboard/brand\n\nOnce done, your logo and details will be added automatically to every video!`);
          return;
        }
        if (buttonId === "brand_yes") {
          await wa.sendText(phone, "🏷️ Got it! Type your *business name* and optionally your *tagline* (e.g. \"Spice Route Kitchen | Authentic Biryani Since 2015\")");
          await this.setContext(phone, { flow: "AWAITING_BRANDING", data: { ...ctx.data, awaitingBrandName: true } });
          return;
        }
        if (ctx.data.awaitingBrandName && message.text?.body) {
          const parts = message.text.body.split("|");
          const brandName = parts[0]?.trim();
          const brandTagline = parts[1]?.trim() || "";
          await this.dispatchVideoJob(phone, user, workspace, { ...ctx.data, brandName, brandTagline, watermarkText: brandName, awaitingBrandName: undefined });
          return;
        }
        // brand_no → generate without branding
        await this.dispatchVideoJob(phone, user, workspace, ctx.data);
        return;
      }

    // ── AWAITING_INPUT ────────────────────────────────────────────────────
    // User picked a guided menu option and we asked for details.
    // After collecting details, ask which language to generate content in.
    if (flow === "AWAITING_INPUT" && message.text?.body) {
      const details = message.text.body.trim();
      const pending = ctx.data.pendingCommand as string;
      const storedLang = (user as any).language || "English";
      await this.setContext(phone, { flow: "AWAITING_LANG", data: { pendingCommand: pending, pendingDetails: details } });
      await wa.sendButtons(
        phone,
        `🌐 Generate this content in which language?`,
        [
          { id: "lang_gen_English", title: "🇬🇧 English" },
          { id: "lang_gen_Hindi",   title: "🇮🇳 Hindi" },
          { id: `lang_gen_${storedLang}`, title: storedLang === "English" || storedLang === "Hindi" ? "🌍 Other Language" : `🌍 ${storedLang}` },
        ],
        "Content Language"
      );
      return;
    }

    // ── AWAITING_LANG ─────────────────────────────────────────────────────
    // User is picking content language after providing details.
    if (flow === "AWAITING_LANG") {
      let lang: string | null = null;

      if (buttonId?.startsWith("lang_gen_")) {
        const raw = buttonId.replace("lang_gen_", "");
        if (raw === (user as any).language || raw === "English" || raw === "Hindi") {
          lang = raw === "Other Language" ? null : raw;
        } else {
          lang = raw;
        }
        if (!lang || lang === "Other Language") {
          await this.setContext(phone, { flow: "AWAITING_LANG", data: { ...ctx.data, awaitingLangText: true } });
          await wa.sendText(phone, "🌐 Type your language:\n\nExamples: _Tamil, Arabic, Marathi, Bengali, Portuguese, French, Spanish, Indonesian_");
          return;
        }
      } else if (ctx.data.awaitingLangText && message.text?.body) {
        lang = message.text.body.trim().split(/[\s,]+/)[0];
      }

      if (lang) {
        const { pendingCommand, pendingDetails } = ctx.data;
        const syntheticMessage = { ...message, text: { body: `${pendingCommand} ${pendingDetails}` } };
        const newCtx: ConversationCtx = { flow: "IDLE", data: { generationLanguage: lang } };
        await this.setContext(phone, newCtx);
        await this.handleMainFlow(phone, user, syntheticMessage, newCtx);
        return;
      }
    }

    // ── AWAITING_PLATFORM ─────────────────────────────────────────────────
    // User is selecting which social platform to post to.
    if (flow === "AWAITING_PLATFORM" && buttonId?.startsWith("platform_post_")) {
      const accountId = buttonId.replace("platform_post_", "");
      const account = await prisma.socialAccount.findUnique({ where: { id: accountId } });
      if (!account) {
        await wa.sendText(phone, "⚠️ Account not found. Please reconnect your social account.");
        await this.setContext(phone, { flow: "IDLE", data: {} });
        return;
      }
      await postingQueue.add("post-content", {
        userId: user.id,
        contentId: ctx.data.contentId,
        platform: account.platform,
        accountId: account.id,
      }, { priority: 1 });
      await wa.sendText(phone, `🚀 Posting to *${account.platform}* (@${account.accountName})...\n\nI'll notify you when it's live.`);
      await this.setContext(phone, { flow: "IDLE", data: {} });
      await this.sendWorkspaceMenu(phone, workspace.type as WorkspaceType);
      return;
    }

    // ── IDLE ──────────────────────────────────────────────────────────────
    if (flow === "IDLE") {

      // ── Guided menu list replies (guide_*) ─────────────────────────────────
      // User tapped an option from the interactive list menu.
      // Ask for details conversationally, then process as a real command.
      if (buttonId?.startsWith("guide_")) {
        const GUIDED_PROMPTS: Record<string, { command: string; ask: string }> = {
          // Real estate
          guide_property:     { command: "PROPERTY",     ask: "Tell me about the property:\n\n*Bedrooms · Size · Area · Price · Key features*\n\nExample: _3BHK 1200sqft Bandra West ₹2.5Cr sea view_" },
          guide_sold:         { command: "SOLD",         ask: "What did you sell?\n\nExample: _3BHK Bandra West ₹4.2Cr, sold in 6 days, 4 offers received_" },
          guide_openhouse:    { command: "OPENHOUSE",    ask: "What's the property and when is the open house?\n\nExample: _3BHK Powai, Saturday 11am–2pm_" },
          guide_testimonial:  { command: "TESTIMONIAL",  ask: "Client name and what result they got?\n\nExample: _Ravi Kumar, sold in 3 days above asking price_" },
          guide_neighborhood: { command: "NEIGHBORHOOD", ask: "Which area/locality?\n\nExample: _Bandra West Mumbai_" },
          // Restaurant
          guide_dish:         { command: "DISH",         ask: "What dish do you want to feature?\n\nExample: _Paneer Butter Masala_" },
          guide_offer:        { command: "OFFER",        ask: "What's the deal?\n\nExample: _Buy 1 Get 1 Biryani, today 6–9pm only_" },
          guide_opening:      { command: "OPENING",      ask: "Restaurant name, opening date, and launch offer?\n\nExample: _Spice Garden, December 20, 30% off all orders on day 1_" },
          // Ecommerce
          guide_launch:       { command: "LAUNCH",       ask: "Product name and price?\n\nExample: _Red Sports Shoes 1999_" },
          guide_gifting:      { command: "GIFTING",      ask: "Occasion and budget range?\n\nExample: _birthday 500–2000_" },
          // Creator
          guide_viral:        { command: "VIRAL",        ask: "Topic and your niche?\n\nExample: _morning routine, lifestyle creator_" },
          guide_giveaway:     { command: "GIVEAWAY",     ask: "What's the prize?\n\nExample: _iPhone 15 + AirPods_" },
          guide_challenge:    { command: "CHALLENGE",    ask: "Challenge topic and niche?\n\nExample: _30-day fitness, health creator_" },
          // Business services
          guide_casestudy:    { command: "CASESTUDY",   ask: "Client name, result, and your service?\n\nExample: _TechCorp, 200% more leads, social media marketing_" },
          guide_webinar:      { command: "WEBINAR",      ask: "Webinar topic, date, and price?\n\nExample: _Social Media Marketing, Saturday 5pm, Free_" },
          guide_process:      { command: "PROCESS",      ask: "Service name and your steps?\n\nExample: _SEO Audit, competitor research, on-page fixes, content plan, reporting_" },
          // Events
          guide_lineup:       { command: "LINEUP",       ask: "Artists, event name, and date?\n\nExample: _DJ Snake + Nucleya, SunBurn Festival, Dec 20_" },
          guide_tickets:      { command: "TICKETS",      ask: "Event name, date, and ticket details?\n\nExample: _SunBurn 2025, December 20–21 Goa, ₹2999 onwards_" },
          guide_earlybird:    { command: "EARLYBIRD",    ask: "Event name, discount, and deadline?\n\nExample: _Goa Music Fest, 35% off, December 1_" },
          // Education
          guide_course:       { command: "COURSE",       ask: "Course name, price, and who it's for?\n\nExample: _Digital Marketing Masterclass, ₹2999, working professionals_" },
          guide_freeclass:    { command: "FREECLASS",    ask: "Topic and date?\n\nExample: _Instagram Growth for Small Businesses, Saturday 5pm_" },
          guide_result:       { command: "RESULT",       ask: "Student name, before, after, and course name?\n\nExample: _Priya Sharma, unemployed 6 months, landed ₹8L job, Python course_" },
          // Personal
          guide_wedding:      { command: "WEDDING",      ask: "Couple names, date, and venue?\n\nExample: _Rahul & Priya, December 15, Taj Mumbai_" },
          guide_graduation:   { command: "GRADUATION",   ask: "Name, degree, and university?\n\nExample: _Rahul, B.Tech Computer Science, IIT Bombay_" },
          guide_achievement:  { command: "ACHIEVEMENT",  ask: "Name and what they achieved?\n\nExample: _Priya, got into IIT Bombay with AIR 42_" },
          // Restaurant extras
          guide_catering:     { command: "CATERING",     ask: "What type of events do you cater for?\n\nExample: _corporate events_ or _weddings_" },
          guide_delivery:     { command: "DELIVERY",     ask: "Which delivery platform are you launching on?\n\nExample: _Swiggy_ or _Zomato_" },
          // Ecommerce extras
          guide_compare:      { command: "COMPARE",      ask: "Which two products to compare?\n\nExample: _iPhone 15 vs Samsung S24_" },
          // Creator extras
          guide_collab:       { command: "COLLAB",       ask: "Brand name and what product are you promoting?\n\nExample: _Nike, Air Max running shoes_" },
          guide_qanda:        { command: "QANDA",        ask: "What topic and your niche?\n\nExample: _how to grow on Instagram, lifestyle creator_" },
          // Events extras
          guide_venue:        { command: "VENUE",        ask: "Venue name, event name, and date?\n\nExample: _NSCI Dome Mumbai, TechFest 2025, January 15_" },
          guide_sponsor:      { command: "SPONSOR",      ask: "Brand name and your event?\n\nExample: _Red Bull, SunBurn Festival 2025_" },
          guide_recap:        { command: "RECAP",        ask: "Event name and highlights?\n\nExample: _Music Night, 500 attendees, 3 live performances_" },
          // Universal tools
          guide_calendar:     { command: "CALENDAR",     ask: "Any specific goal for this week? (or just press send to get a general plan)\n\nExample: _promote our new winter collection_" },
          guide_ad:           { command: "AD",           ask: "What product or offer do you want to advertise?\n\nExample: _20% off all shoes this weekend_" },
          guide_hashtags:     { command: "HASHTAGS",     ask: "What's your post or topic about?\n\nExample: _luxury real estate Mumbai_" },
          guide_broadcast:    { command: "BROADCAST",    ask: "What do you want to broadcast to your customers?\n\nExample: _Diwali sale — 30% off this week_" },
          guide_kit:          { command: "KIT",          ask: "Tell me what to create a full content kit for:\n\nBe specific — include key details, highlights, and any numbers you want mentioned.\n\nExample: _4BHK sea-view apartment Juhu ₹6.5Cr private pool, open house Saturday_" },
          // Fitness & Gym
          guide_transformation: { command: "TRANSFORMATION", ask: "Client name, their starting point, and what they achieved?\n\nExample: _Ravi, struggled with weight for 5 years, lost 18kg in 4 months with our program_" },
          guide_fitnessclass:   { command: "FITNESSCLASS",   ask: "Class name, time/schedule, and price?\n\nExample: _HIIT Bootcamp, Monday 6am and Saturday 8am, ₹1500/month_" },
          // Salon & Spa
          guide_salonservice:   { command: "SALONSERVICE",   ask: "Treatment name, duration, and price?\n\nExample: _Keratin Hair Treatment, 90 minutes, ₹3500_" },
          guide_salonbooking:   { command: "SALONBOOKING",   ask: "What slots are available?\n\nExample: _Thursday-Sunday afternoons, both senior and junior stylists available_" },
          // Fashion
          guide_drop:           { command: "FASHIONDROP",   ask: "Collection name and price range?\n\nExample: _Winter Luxe Collection, ₹1299–₹4999_" },
          guide_lookbook:       { command: "LOOKBOOK",       ask: "Season or theme for this lookbook?\n\nExample: _Summer 2025 — coastal vibes_" },
          // Travel
          guide_package:        { command: "PACKAGE",        ask: "Destination, duration, and starting price?\n\nExample: _Bali, 5 nights, ₹45,000 per person_" },
          guide_destination:    { command: "DESTINATION",    ask: "Which destination to feature?\n\nExample: _Meghalaya — the Scotland of India_" },
          // Healthcare
          guide_awareness:      { command: "AWARENESS",      ask: "What health topic to raise awareness about?\n\nExample: _Diabetes prevention — 3 diet changes that help_" },
          guide_appointment:    { command: "APPOINTMENT",    ask: "Your specialty and available slots?\n\nExample: _Physiotherapy, weekday mornings and Saturday all day_" },
          // Automobile
          guide_vehicle:        { command: "VEHICLE",        ask: "Vehicle name, price, and top 3 features?\n\nExample: _Hyundai Creta 2025, ₹10.5L onwards, sunroof, ADAS, 18km/l mileage_" },
          guide_servicecenter:  { command: "SERVICECENTER",  ask: "Service type and current offer?\n\nExample: _Free AC check + coolant top-up, valid this month_" },
          // Photography
          guide_portfolio:      { command: "PORTFOLIO",      ask: "What type of shoot to showcase?\n\nExample: _Wedding photography — candid moments_" },
          guide_photobooking:   { command: "PHOTOBOOKING",   ask: "Available dates and package options?\n\nExample: _December weekends open, packages from ₹15,000_" },
          // Interior Design
          guide_project:        { command: "PROJECT",        ask: "Space type, design style, and anything notable?\n\nExample: _3BHK apartment, Japandi minimal style, transformed from builder-grade to magazine-worthy_" },
          guide_interiorportfolio: { command: "INTERIORPORTFOLIO", ask: "What design style defines your portfolio?\n\nExample: _Contemporary Indian fusion — mix of traditional crafts with modern architecture_" },
          // Hotel
          guide_hotelpackage:   { command: "HOTELPACKAGE",   ask: "Package name, number of nights, and price?\n\nExample: _Monsoon Escape — 2 nights, breakfast + spa included, ₹8,999 per couple_" },
          guide_hotelreview:    { command: "HOTELREVIEW",    ask: "Guest name and what they loved most?\n\nExample: _Priya & Rahul, celebrated anniversary, loved the rooftop dinner and sunrise view from the room_" },
          // Jewelry
          guide_collection:     { command: "COLLECTION",     ask: "Collection name and price range?\n\nExample: _Eternal Love Collection, engagement rings ₹25,000–₹2,50,000_" },
          guide_customjewelry:  { command: "CUSTOMJEWELRY",  ask: "Describe the piece — what was it, who for, what occasion?\n\nExample: _Custom gold mangalsutra redesigned for a bride, incorporated grandmother's old chain_" },
        };

        if (buttonId.startsWith("guide_menu_") || buttonId === "guide_menu") {
          await this.sendWorkspaceMenu(phone, workspace.type as WorkspaceType);
          return;
        }
        if (buttonId.startsWith("guide_more_")) {
          await this.sendMoreMenu(phone, workspace.type as WorkspaceType);
          return;
        }

        const entry = GUIDED_PROMPTS[buttonId];
        if (entry) {
          await this.setContext(phone, { flow: "AWAITING_INPUT", data: { pendingCommand: entry.command } });
          await wa.sendText(phone, entry.ask);
          return;
        }
      }

      // Language detection confirmation
      if (buttonId?.startsWith("lang_confirm_")) {
        const lang = buttonId.replace("lang_confirm_", "");
        if (LANGUAGES[lang]) {
          await prisma.user.update({ where: { id: user.id }, data: { language: lang } as any });
          await this.setContext(phone, { flow: "IDLE", data: {} });
          await wa.sendText(phone, `${LANGUAGES[lang].greeting} Content will now be generated in *${lang}* (${LANGUAGES[lang].nativeName})!\n\nSend me a photo, video, or idea — I'll create content in ${lang}. 🚀\n\nType *ENGLISH* to switch back anytime.`);
          return;
        }
      }
      if (buttonId === "lang_keep_english") {
        await this.setContext(phone, { flow: "IDLE", data: {} });
        await wa.sendText(phone, "🇬🇧 Staying in English! Send me a photo, video, or idea to start creating.");
        return;
      }

      if (buttonId === "festival_generate") {
        const webUrl = process.env.NEXT_PUBLIC_WEB_URL || "https://myna.app";
        const quota = await checkUserQuota(user.id, webUrl);
        if (!quota.allowed) return;
        const { festivalPrompt, festivalName } = ctx.data;
        await wa.sendText(phone, `${festivalName ? `🎉 *${festivalName}* content` : "Festival content"} generating...\n\n⏳ Preview in ~15 seconds`);
        await this.setContext(phone, { flow: "AWAITING_GENERATION", data: { inputType: "text", prompt: festivalPrompt, contentType: "REEL", audioType: "BACKGROUND_MUSIC" } });
        await videoQueue.add("generate-video", {
          phone, userId: user.id, workspaceType: workspace.type,
          inputType: "text", prompt: festivalPrompt, contentType: "REEL", audioType: "BACKGROUND_MUSIC",
        }, { attempts: 3, backoff: { type: "exponential", delay: 5000 } });
        return;
      }
      if (buttonId === "festival_skip") {
        await wa.sendText(phone, "No problem! Send me a photo, video, or idea whenever you're ready 🚀");
        return;
      }

      if (buttonId === "upgrade_now") {
        const webUrl = process.env.NEXT_PUBLIC_WEB_URL || "https://myna.app";
        const workspaceType = (workspace as any)?.type || "RESTAURANT";
        const growth = calculatePrice(workspaceType, "GROWTH", phone);
        const unlimited = calculatePrice(workspaceType, "UNLIMITED", phone);
        await wa.sendText(
          phone,
          `💎 *Upgrade your plan*\n\n` +
          `📦 *Growth* — ${growth.displayPrice}/month\n30 videos/month · No watermark · All features\n\n` +
          `🚀 *Unlimited* — ${unlimited.displayPrice}/month\nUnlimited videos · No watermark · Priority queue\n\n` +
          `👉 ${webUrl}/pricing\n\nOr reply *UPGRADE* to see pricing details.`
        );
        return;
      }

      if (message.text?.body?.toUpperCase() === "UPGRADE") {
        const webUrl = process.env.NEXT_PUBLIC_WEB_URL || "https://myna.app";
        const workspaceType = (workspace as any)?.type || "RESTAURANT";
        const growth = calculatePrice(workspaceType, "GROWTH", phone);
        const unlimited = calculatePrice(workspaceType, "UNLIMITED", phone);
        await wa.sendText(
          phone,
          `💳 *Choose your plan:*\n\n` +
          `📦 *Growth* — ${growth.displayPrice}/month\n   30 videos/month · No watermark · All features\n   → ${webUrl}/pricing?plan=growth\n\n` +
          `🚀 *Unlimited* — ${unlimited.displayPrice}/month\n   Unlimited videos · No watermark · Priority queue\n   → ${webUrl}/pricing?plan=unlimited\n\n` +
          `_Prices shown in your local currency via PPP · billed in USD_`
        );
        return;
      }

      if (message.text?.body?.toUpperCase() === "REFERRAL" || message.text?.body?.toUpperCase() === "REFER") {
        const webUrl = process.env.NEXT_PUBLIC_WEB_URL || "https://myna.app";
        await wa.sendText(phone, `🎁 *Your referral link:*\n${webUrl}/signup?ref=${user.referralCode}\n\nShare this with friends. When they sign up, you both get *+5 free videos/month*!`);
        return;
      }

      // ── Text command shortcuts ─────────────────────────────────────────────
      const rawText: string = message.text?.body?.trim() || "";
      const cmd = rawText.toUpperCase();
      // Language: use per-generation selection if set, else user's stored preference
      const language: string = (ctx.data.generationLanguage as string) || (user as any).language || "English";

      // MENU — show workspace-specific quick actions
      if (cmd === "MENU" || cmd === "HELP") {
        await this.sendWorkspaceMenu(phone, workspace.type as WorkspaceType);
        return;
      }

      // CAPTION — send photo + type CAPTION to get caption only (no video)
      if (cmd === "CAPTION") {
        await this.setContext(phone, { flow: "AWAITING_CAPTION", data: {} });
        await wa.sendText(phone, "📝 Send me the photo or describe your content — I'll write you the perfect caption + hashtags.");
        return;
      }

      // REPURPOSE — remix last approved content into story + linkedin + tweet
      if (cmd === "REPURPOSE") {
        await this.handleRepurpose(phone, user.id, workspace.type);
        return;
      }

      // SERIES [topic] — generate 5-part connected content
      if (cmd.startsWith("SERIES ")) {
        const topic = rawText.slice(7).trim();
        await this.handleSeriesStart(phone, user, workspace, topic);
        return;
      }

      // FESTIVAL — check upcoming festival and suggest content
      if (cmd === "FESTIVAL" || cmd === "SEASONAL") {
        await this.handleFestivalSuggestion(phone, user, workspace);
        return;
      }

      // DAILY ON / DAILY OFF — toggle morning nudge
      if (cmd === "DAILY ON") {
        await prisma.user.update({ where: { id: user.id }, data: { dailyNudge: true } as any });
        await wa.sendText(phone, "✅ Daily nudge activated! I'll message you every morning at 9am to create today's content.\n\nReply *DAILY OFF* to stop anytime.");
        return;
      }
      if (cmd === "DAILY OFF") {
        await prisma.user.update({ where: { id: user.id }, data: { dailyNudge: false } as any });
        await wa.sendText(phone, "✅ Daily nudge turned off. Message me anytime you want to create content!");
        return;
      }

      // COUNTDOWN [event] [date] — auto-schedule countdown series
      if (cmd.startsWith("COUNTDOWN ")) {
        const parts = rawText.slice(10).trim();
        await this.handleCountdownSeries(phone, user, workspace, parts);
        return;
      }

      // HISTORY — show last 5 generated content pieces
      if (cmd === "HISTORY") {
        const history = await prisma.generatedContent.findMany({
          where: { userId: user.id, jobStatus: "COMPLETED" },
          orderBy: { createdAt: "desc" },
          take: 5,
        });
        if (!history.length) {
          await wa.sendText(phone, "No content generated yet. Send me a photo or idea to get started! 🚀");
        } else {
          const lines = history.map((c, i) => {
            const date = c.createdAt.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
            const preview = c.hook ? `"${c.hook.slice(0, 50)}..."` : c.caption?.slice(0, 50) || "Content";
            return `${i + 1}. ${date} — ${preview}${c.videoUrl ? "\n   📥 " + c.videoUrl : ""}`;
          });
          await wa.sendText(phone, `📚 *Your last ${history.length} content pieces:*\n\n${lines.join("\n\n")}`);
        }
        return;
      }

      // KIT [details] — full content kit: reel + caption + hashtags + stories + broadcast + DM
      if (cmd.startsWith("KIT ") || cmd === "KIT") {
        const details = rawText.startsWith("KIT ") ? rawText.slice(4).trim() : "";
        if (!details) {
          await wa.sendText(phone, `📦 *Full Content Kit*\n\nTell me what the kit is about. Include key details:\n\n• Who/What it's for\n• Key highlights or features\n• Any numbers you want included\n\nExample: *KIT 4BHK sea-view apartment Juhu ₹6.5Cr private pool, open house this Saturday 11am–2pm*`);
          return;
        }
        const webUrl = process.env.NEXT_PUBLIC_WEB_URL || "https://myna.app";
        const quota = await checkUserQuota(user.id, webUrl);
        if (!quota.allowed) return;
        await wa.sendText(phone, `📦 Generating your *complete content kit* in ${language}...\n\n⏳ Building: reel script · caption · 30 hashtags · story set · broadcast · DM script · LinkedIn post\n\nAbout 20 seconds.`);
        try {
          const prompt = buildContentKitPrompt(details, workspace.type, language);
          const result = await chat({ messages: [{ role: "user", content: prompt }], json: true, maxTokens: 3500 });
          const kit = JSON.parse(result.text);
          await sendSafe(phone, `🎬 *Reel Script:*\n\n🪝 Hook: ${kit.hook}\n\n${kit.reel_script}`);
          await sendSafe(phone,
            `📝 *Instagram Caption:*\n${kit.caption}\n\n` +
            `#️⃣ *Hashtags (${(kit.hashtags as string[]).length}):*\n${(kit.hashtags as string[]).map((h: string) => h.startsWith("#") ? h : `#${h}`).join(" ")}`
          );
          await sendSafe(phone, `📱 *Story Set (5 slides):*\n${(kit.story_set as string[]).map((s: string, i: number) => `${i + 1}. ${s}`).join("\n")}`);
          await sendSafe(phone, `📢 *WhatsApp Broadcast:*\n${kit.broadcast}\n\n💬 *DM Reply Script:*\n${kit.dm_script}`);
          if (kit.linkedin_post) await sendSafe(phone, `💼 *LinkedIn Post:*\n${kit.linkedin_post}`);
          if (kit.listing_description) await sendSafe(phone, `📋 *Listing / Portal Description:*\n\n${kit.listing_description}`);
          if (kit.photo_directions) await sendSafe(phone, `📸 *Photo Shot List:*\n\n${kit.photo_directions}`);
          await wa.sendText(phone, `✅ *Your full kit is ready!*\n\nSend a photo or video to turn the reel script into a video 🎬`);
          await recordGeneration(user.id).catch(() => {});
        } catch { await wa.sendText(phone, "⚠️ Try: KIT [your key details — be specific about what you want to promote]"); }
        await this.sendWorkspaceMenu(phone, workspace.type as WorkspaceType);
        return;
      }

      // BROADCAST [topic] — write a WhatsApp broadcast message
      if (cmd.startsWith("BROADCAST ")) {
        const topic = rawText.slice(10).trim();
        await wa.sendText(phone, "✍️ Writing your broadcast message...");
        try {
          const prompt = buildBroadcastPrompt(topic, workspace.type);
          const result = await chat({ messages: [{ role: "user", content: prompt }], json: true });
          const parsed = JSON.parse(result.text);
          await sendSafe(phone, `📢 *WhatsApp Broadcast Message:*\n\n${parsed.message}\n\n💡 *CTA:* ${parsed.cta}\n\n_Copy and paste this into your WhatsApp broadcast list._`);
        } catch {
          await wa.sendText(phone, "⚠️ Couldn't generate broadcast. Try: BROADCAST [your topic or offer]");
        }
        await this.sendWorkspaceMenu(phone, workspace.type as WorkspaceType);
        return;
      }

      // AD [topic] — generate Facebook/Instagram ad copy
      if (cmd.startsWith("AD ")) {
        const topic = rawText.slice(3).trim();
        await wa.sendText(phone, "🎯 Writing your ad copy...");
        try {
          const prompt = buildAdCopyPrompt(topic, workspace.type);
          const result = await chat({ messages: [{ role: "user", content: prompt }], json: true });
          const ad = JSON.parse(result.text);
          await sendSafe(
            phone,
            `🎯 *Ad Copy — 3 Variants:*\n\n` +
            `📱 *Short (Story/Banner):*\n${ad.short.headline}\n${ad.short.body}\n👉 ${ad.short.cta}\n\n` +
            `📰 *Medium (Feed):*\n${ad.medium.headline}\n${ad.medium.body}\n👉 ${ad.medium.cta}\n\n` +
            `📄 *Long (Traffic/Conversion):*\n${ad.long.headline}\n${ad.long.body}\n👉 ${ad.long.cta}`
          );
        } catch {
          await wa.sendText(phone, "⚠️ Couldn't generate ad copy. Try: AD [your product or offer]");
        }
        await this.sendWorkspaceMenu(phone, workspace.type as WorkspaceType);
        return;
      }

      // CALENDAR — 7-day content calendar
      if (cmd === "CALENDAR" || cmd.startsWith("CALENDAR ")) {
        const goal = cmd.startsWith("CALENDAR ") ? rawText.slice(9).trim() : "";
        await wa.sendText(phone, "📅 Building your 7-day content calendar...");
        try {
          const prompt = buildWeeklyCalendarPrompt(workspace.type, goal);
          const result = await chat({ messages: [{ role: "user", content: prompt }], json: true });
          const cal = JSON.parse(result.text);
          const dayLines = (cal.days as any[]).map((d: any) =>
            `*${d.day}* — ${d.content_type}\n_${d.hook}_\n📌 ${d.topic} (${d.best_time})`
          ).join("\n\n");
          await sendSafe(
            phone,
            `📅 *This Week: ${cal.week_theme}*\n\n${dayLines}\n\n💡 *Tip:* ${cal.tip}\n\n_Type SERIES [topic] to start a multi-part series, or SPECIAL to create today's content!_`
          );
        } catch {
          await wa.sendText(phone, "⚠️ Couldn't generate calendar. Try again!");
        }
        await this.sendWorkspaceMenu(phone, workspace.type as WorkspaceType);
        return;
      }

      // HASHTAGS [topic] — 30-hashtag strategy
      if (cmd.startsWith("HASHTAGS ")) {
        const topic = rawText.slice(9).trim();
        await wa.sendText(phone, "🔍 Researching hashtag strategy...");
        try {
          const prompt = buildHashtagsPrompt(topic, workspace.type);
          const result = await chat({ messages: [{ role: "user", content: prompt }], json: true });
          const tags = JSON.parse(result.text);
          await sendSafe(
            phone,
            `#️⃣ *Hashtag Strategy for: ${topic}*\n\n` +
            `📊 *Strategy:* ${tags.strategy}\n\n` +
            `🔴 Large reach:\n${tags.large.map((t: string) => `#${t}`).join(" ")}\n\n` +
            `🟡 Targeted:\n${tags.medium.map((t: string) => `#${t}`).join(" ")}\n\n` +
            `🟢 Niche:\n${tags.niche.map((t: string) => `#${t}`).join(" ")}\n\n` +
            `🔵 Micro:\n${tags.micro.map((t: string) => `#${t}`).join(" ")}\n\n` +
            `📋 *Copy-paste ready:*\n${tags.ready_to_paste}`
          );
        } catch {
          await wa.sendText(phone, "⚠️ Try: HASHTAGS [your topic or post description]");
        }
        await this.sendWorkspaceMenu(phone, workspace.type as WorkspaceType);
        return;
      }

      // BIO — optimize social media bio
      if (cmd.startsWith("BIO")) {
        const currentBio = rawText.slice(3).trim() || "Please help me write a great bio";
        await wa.sendText(phone, "✍️ Optimizing your bio for every platform...");
        try {
          const prompt = buildBioPrompt(currentBio, workspace.type);
          const result = await chat({ messages: [{ role: "user", content: prompt }], json: true });
          const bio = JSON.parse(result.text);
          await sendSafe(
            phone,
            `📝 *Bio Rewrites:*\n\n` +
            `📸 *Instagram:*\n${bio.instagram}\n\n` +
            `🐦 *Twitter/X:*\n${bio.twitter}\n\n` +
            `💼 *LinkedIn:*\n${bio.linkedin}\n\n` +
            `💬 *WhatsApp Business:*\n${bio.whatsapp}\n\n` +
            `💡 *Tip:* ${bio.tip}`
          );
        } catch {
          await wa.sendText(phone, "⚠️ Try: BIO [your current bio, or just BIO to get suggestions]");
        }
        await this.sendWorkspaceMenu(phone, workspace.type as WorkspaceType);
        return;
      }

      // POLL [topic] — generate poll and engagement questions
      if (cmd.startsWith("POLL ")) {
        const topic = rawText.slice(5).trim();
        await wa.sendText(phone, "🗳️ Creating poll ideas...");
        try {
          const prompt = buildPollPrompt(topic, workspace.type);
          const result = await chat({ messages: [{ role: "user", content: prompt }], json: true });
          const polls = JSON.parse(result.text);
          const pollLines = (polls.polls as any[]).map((p: any) => {
            if (p.option_a) return `*${p.type}:*\n${p.question}\nA) ${p.option_a} vs B) ${p.option_b}`;
            if (p.prompt) return `*${p.type}:*\n${p.prompt}`;
            return `*${p.type}:*\n${p.question}${p.context ? ` (${p.context})` : ""}`;
          }).join("\n\n");
          await sendSafe(phone, `🗳️ *5 Engagement Ideas for: ${topic}*\n\n${pollLines}`);
        } catch {
          await wa.sendText(phone, "⚠️ Try: POLL [your topic]");
        }
        await this.sendWorkspaceMenu(phone, workspace.type as WorkspaceType);
        return;
      }

      // REPLY [comment] — suggest comment replies
      if (cmd.startsWith("REPLY ")) {
        const comment = rawText.slice(6).trim();
        await wa.sendText(phone, "💬 Writing reply options...");
        try {
          const prompt = buildCommentReplyPrompt(comment, workspace.type);
          const result = await chat({ messages: [{ role: "user", content: prompt }], json: true });
          const replies = JSON.parse(result.text);
          await sendSafe(
            phone,
            `💬 *3 Reply Options:*\n\n` +
            `1️⃣ *Short & warm:*\n${replies.short}\n\n` +
            `2️⃣ *Helpful:*\n${replies.informative}\n\n` +
            `3️⃣ *Engaging:*\n${replies.witty}\n\n` +
            `⏰ *Best time to reply:* ${replies.tip}`
          );
        } catch {
          await wa.sendText(phone, "⚠️ Try: REPLY [paste the comment here]");
        }
        await this.sendWorkspaceMenu(phone, workspace.type as WorkspaceType);
        return;
      }

      // TRANSLATE [language] — translate last generated content
      if (cmd.startsWith("TRANSLATE ")) {
        const targetLanguage = rawText.slice(10).trim();
        const last = await prisma.generatedContent.findFirst({
          where: { userId: user.id, jobStatus: "COMPLETED" },
          orderBy: { createdAt: "desc" },
        });
        if (!last?.hook || !last?.caption) {
          await wa.sendText(phone, "No content to translate yet. Create some content first, then use TRANSLATE [language]");
          return;
        }
        await wa.sendText(phone, `🌍 Translating to ${targetLanguage}...`);
        try {
          const prompt = buildTranslationPrompt({
            hook: last.hook || "",
            caption: last.caption || "",
            hashtags: (last.hashtags as string[]) || [],
          }, targetLanguage);
          const result = await chat({ messages: [{ role: "user", content: prompt }], json: true });
          const translated = JSON.parse(result.text);
          await sendSafe(
            phone,
            `🌍 *Translated to ${targetLanguage}:*\n\n` +
            `🪝 *Hook:*\n${translated.hook}\n\n` +
            `📝 *Caption:*\n${translated.caption}\n\n` +
            `#️⃣ *Hashtags:*\n${translated.hashtags.map((h: string) => `#${h}`).join(" ")}\n\n` +
            (translated.note ? `💡 *Note:* ${translated.note}` : "")
          );
        } catch {
          await wa.sendText(phone, "⚠️ Try: TRANSLATE Hindi (or Tamil, Arabic, Portuguese, etc.)");
        }
        await this.sendWorkspaceMenu(phone, workspace.type as WorkspaceType);
        return;
      }

      // QUOTE [text] — beautiful quote card image
      if (cmd.startsWith("QUOTE ")) {
        const quoteText = rawText.slice(6).trim();
        if (!quoteText) {
          await wa.sendText(phone, "💭 Usage: *QUOTE your inspiring text here*\n\nExample: QUOTE Success is not final, failure is not fatal.");
          return;
        }
        await wa.sendText(phone, "🖼️ Creating your quote card...");
        try {
          const prompt = buildQuotePrompt(quoteText, workspace.type);
          const result = await chat({ messages: [{ role: "user", content: prompt }], json: true });
          const q = JSON.parse(result.text);
          await this.setContext(phone, { flow: "AWAITING_GENERATION", data: { inputType: "text", prompt: quoteText, contentType: "QUOTE_CARD", audioType: "NONE", quoteText: q.quote, quoteAuthor: q.author, quoteStyle: q.style } });
          await videoQueue.add("generate-video", {
            phone, userId: user.id, workspaceType: workspace.type,
            inputType: "text", prompt: quoteText, contentType: "QUOTE_CARD", audioType: "NONE",
            quoteText: q.quote, quoteAuthor: q.author, quoteStyle: q.style,
          }, { attempts: 3, backoff: { type: "exponential", delay: 5000 } });
        } catch {
          await wa.sendText(phone, "⚠️ Try: QUOTE [your inspiring text]");
        }
        return;
      }

      // THUMBNAIL [title] — YouTube / Reel thumbnail
      if (cmd.startsWith("THUMBNAIL ")) {
        const title = rawText.slice(10).trim();
        await wa.sendText(phone, "🖼️ Designing your thumbnail...");
        try {
          const prompt = buildThumbnailPrompt(title, workspace.type);
          const result = await chat({ messages: [{ role: "user", content: prompt }], json: true });
          const th = JSON.parse(result.text);
          await this.setContext(phone, { flow: "AWAITING_GENERATION", data: { inputType: "text", prompt: title, contentType: "THUMBNAIL", audioType: "NONE", thumbnailTitle: th.title, thumbnailSubtitle: th.subtitle, thumbnailStyle: th.style } });
          await videoQueue.add("generate-video", {
            phone, userId: user.id, workspaceType: workspace.type,
            inputType: "text", prompt: title, contentType: "THUMBNAIL", audioType: "NONE",
            thumbnailTitle: th.title, thumbnailSubtitle: th.subtitle, thumbnailStyle: th.style,
          }, { attempts: 3, backoff: { type: "exponential", delay: 5000 } });
        } catch {
          await wa.sendText(phone, "⚠️ Try: THUMBNAIL [your video title]");
        }
        return;
      }

      // BULK — generate 3 content variations at once
      if (cmd === "BULK" || cmd.startsWith("BULK ")) {
        const topic = cmd.startsWith("BULK ") ? rawText.slice(5).trim() : "";
        const actualTopic = topic || `${WORKSPACE_LABELS[workspace.type as WorkspaceType]} content ideas`;
        await wa.sendText(phone, `🎬 Generating *3 content variations* for: ${actualTopic}\n\n⏳ About 45 seconds...`);
        for (let i = 0; i < 3; i++) {
          await videoQueue.add("generate-video", {
            phone, userId: user.id, workspaceType: workspace.type,
            inputType: "text", prompt: actualTopic, contentType: "REEL", audioType: "BACKGROUND_MUSIC",
            bulkIndex: i + 1, bulkTotal: 3,
          }, { attempts: 2, delay: i * 8000, backoff: { type: "exponential", delay: 5000 } });
        }
        return;
      }

      // TEMPLATE — show pre-made templates for the workspace
      if (cmd === "TEMPLATE" || cmd === "TEMPLATES") {
        const actions = WORKSPACE_QUICK_ACTIONS[workspace.type as string] || {};
        const templateList = Object.entries(actions).map(([key, a]) =>
          `📌 *${key}*\n_${a.label}_`
        ).join("\n\n");
        await wa.sendText(
          phone,
          `📋 *Content Templates for ${WORKSPACE_LABELS[workspace.type as WorkspaceType]}:*\n\n${templateList}\n\n` +
          `💡 Just type the keyword to instantly generate that content!\n\n` +
          `Or send any photo/video/idea for custom content.`
        );
        return;
      }

      // SCRIPT [topic] — full video script
      if (cmd.startsWith("SCRIPT ")) {
        const topic = rawText.slice(7).trim();
        await wa.sendText(phone, "📝 Writing your full video script...");
        try {
          const prompt = buildScriptPrompt(topic, workspace.type);
          const result = await chat({ messages: [{ role: "user", content: prompt }], maxTokens: 1500 });
          await sendSafe(phone, `🎬 *Full Script: ${topic}*\n\n${result.text}\n\n_Copy this and use it for your video! Send the script back with a video to generate the reel._`);
        } catch {
          await wa.sendText(phone, "⚠️ Try: SCRIPT [your video topic]");
        }
        await this.sendWorkspaceMenu(phone, workspace.type as WorkspaceType);
        return;
      }

      // EMAIL [topic] — email marketing copy
      if (cmd.startsWith("EMAIL ")) {
        const topic = rawText.slice(6).trim();
        await wa.sendText(phone, "📧 Writing your email copy...");
        try {
          const prompt = buildEmailPrompt(topic, workspace.type);
          const result = await chat({ messages: [{ role: "user", content: prompt }], json: true });
          const email = JSON.parse(result.text);
          await sendSafe(
            phone,
            `📧 *Email Marketing Copy:*\n\n` +
            `📌 *Subject Line:* ${email.subject}\n\n` +
            `👋 *Preview text:* ${email.preview}\n\n` +
            `📝 *Body:*\n${email.body}\n\n` +
            `👉 *CTA:* ${email.cta}\n\n` +
            `📊 *PS:* ${email.ps}`
          );
        } catch {
          await wa.sendText(phone, "⚠️ Try: EMAIL [your topic or offer]");
        }
        await this.sendWorkspaceMenu(phone, workspace.type as WorkspaceType);
        return;
      }

      // ── REAL ESTATE category commands ───────────────────────────────────────

      // PROPERTY [details] — full property listing suite
      if (cmd.startsWith("PROPERTY ")) {
        const details = rawText.slice(9).trim();
        if (!details) { await wa.sendText(phone, "🏠 Usage: *PROPERTY 3BHK 1200sqft Bandra West ₹2.5Cr sea view*"); return; }
        await wa.sendText(phone, "🏠 Generating complete property suite...\n\n⏳ ~20 seconds");
        try {
          const language = (user as any).language || "English";
          const prompt = buildPropertySuitePrompt(details, language);
          const result = await chat({ messages: [{ role: "user", content: prompt }], json: true, maxTokens: 2000 });
          const suite = JSON.parse(result.text);
          await sendSafe(phone, `🎬 *Reel Script:*\n${suite.listing_reel}\n\n📝 *Property Description:*\n${suite.property_description}`);
          await sendSafe(phone, `📢 *WhatsApp Broadcast:*\n${suite.whatsapp_broadcast}`);
          if (suite.story_set?.length) await sendSafe(phone, `📱 *Story Set (5 slides):*\n${suite.story_set.map((s: string, i: number) => `${i+1}. ${s}`).join("\n")}`);
          if (suite.dm_script) await sendSafe(phone, `💬 *DM Script:*\n${suite.dm_script}`);
          await wa.sendText(phone, "📸 Send the property photos and I'll turn the reel script into a full video!");
        } catch { await wa.sendText(phone, "⚠️ Try: PROPERTY [bedrooms, size, area, price, key features]"); }
        await this.sendWorkspaceMenu(phone, workspace.type as WorkspaceType);
        return;
      }

      // MORTGAGE [price] [area] — mortgage breakdown post
      if (cmd.startsWith("MORTGAGE ")) {
        const parts = rawText.slice(9).trim().split(" ");
        const price = parts[0] || "50 lakhs";
        const area = parts.slice(1).join(" ") || workspace.city || "your city";
        await wa.sendText(phone, "💰 Calculating mortgage breakdown...");
        try {
          const prompt = buildMortgagePostPrompt(price, area);
          const result = await chat({ messages: [{ role: "user", content: prompt }], json: true });
          const m = JSON.parse(result.text);
          await sendSafe(phone,
            `💰 *Mortgage Breakdown: ${price}*\n\n📊 Monthly EMI: ${m.monthly_emi}\n💵 Down payment: ${m.down_payment}\n📈 Interest cost: ${m.total_interest}\n\n📋 *Post Caption:*\n${m.caption}\n\n🏠 *Rent vs Buy:*\n${m.rent_vs_buy}\n\n📊 *Carousel slides:*\n${(m.carousel_slides as string[]).map((s: string, i: number) => `${i+1}. ${s}`).join("\n")}`
          );
        } catch { await wa.sendText(phone, "⚠️ Try: MORTGAGE 50lakhs Andheri West"); }
        await this.sendWorkspaceMenu(phone, workspace.type as WorkspaceType);
        return;
      }

      // NEIGHBORHOOD [area] — neighborhood lifestyle guide
      if (cmd.startsWith("NEIGHBORHOOD ")) {
        const area = rawText.slice(13).trim();
        if (!area) { await wa.sendText(phone, "🗺️ Usage: *NEIGHBORHOOD Bandra West Mumbai*"); return; }
        await wa.sendText(phone, `🗺️ Creating ${area} neighborhood guide...`);
        try {
          const prompt = buildNeighborhoodGuidePrompt(area, workspace.type);
          const result = await chat({ messages: [{ role: "user", content: prompt }], json: true });
          const n = JSON.parse(result.text);
          await sendSafe(phone,
            `🗺️ *${area} Neighborhood Guide*\n\n🌟 Lifestyle: ${n.lifestyle}\n🏫 Schools: ${n.schools}\n🚇 Transport: ${n.transport}\n💹 Investment: ${n.investment_outlook}\n💎 Hidden gems: ${n.hidden_gems}\n\n📝 Caption:\n${n.caption}`
          );
        } catch { await wa.sendText(phone, "⚠️ Try: NEIGHBORHOOD Bandra West Mumbai"); }
        await this.sendWorkspaceMenu(phone, workspace.type as WorkspaceType);
        return;
      }

      // SOLD [property details] — sold listing celebration post
      if (cmd.startsWith("SOLD ")) {
        const details = rawText.slice(5).trim();
        if (!details) { await wa.sendText(phone, "🏆 Usage: *SOLD 3BHK Bandra West ₹4.2Cr, 6 days, 4 offers*"); return; }
        await wa.sendText(phone, "🏆 Creating your SOLD post...");
        try {
          const prompt = buildSoldPrompt(details);
          const result = await chat({ messages: [{ role: "user", content: prompt }], json: true });
          const sold = JSON.parse(result.text);
          await sendSafe(phone, `🏆 *Reel Script:*\n${sold.reel_script}\n\n📝 *Caption:*\n${sold.caption}`);
          if (sold.story_set?.length) await sendSafe(phone, `📱 *Stories:*\n${(sold.story_set as string[]).join("\n")}`);
        } catch { await wa.sendText(phone, "⚠️ Try: SOLD 3BHK Andheri ₹2.1Cr, sold in 4 days, 3 offers"); }
        await this.sendWorkspaceMenu(phone, workspace.type as WorkspaceType);
        return;
      }

      // OPENHOUSE [details] — open house announcement
      if (cmd.startsWith("OPENHOUSE ")) {
        const details = rawText.slice(10).trim();
        if (!details) { await wa.sendText(phone, "🏠 Usage: *OPENHOUSE 3BHK Powai this Saturday 11am-2pm*"); return; }
        await wa.sendText(phone, "🏠 Creating open house announcement...");
        try {
          const prompt = buildOpenHousePrompt(details);
          const result = await chat({ messages: [{ role: "user", content: prompt }], json: true });
          const oh = JSON.parse(result.text);
          await sendSafe(phone, `🏠 *Reel Script:*\n${oh.reel_script}\n\n📝 *Caption:*\n${oh.caption}`);
          await sendSafe(phone, `📢 *Broadcast Invite:*\n${oh.broadcast_message}`);
          if (oh.story_countdown?.length) await sendSafe(phone, `📱 *Story Countdown:*\n${(oh.story_countdown as string[]).join("\n")}`);
        } catch { await wa.sendText(phone, "⚠️ Try: OPENHOUSE 4BHK Juhu Saturday 11am-3pm sea facing"); }
        await this.sendWorkspaceMenu(phone, workspace.type as WorkspaceType);
        return;
      }

      // ── RESTAURANT category commands ─────────────────────────────────────────

      // DISH [name] — viral dish content suite
      if (cmd.startsWith("DISH ")) {
        const dishName = rawText.slice(5).trim();
        if (!dishName) { await wa.sendText(phone, "🍽 Usage: *DISH Paneer Butter Masala*"); return; }
        await wa.sendText(phone, `🍽 Creating full content suite for *${dishName}*...`);
        try {
          const language = (user as any).language || "English";
          const prompt = buildDishSuitePrompt(dishName, workspace.type, language);
          const result = await chat({ messages: [{ role: "user", content: prompt }], json: true, maxTokens: 1800 });
          const dish = JSON.parse(result.text);
          await sendSafe(phone, `🎬 *Viral Reel Script:*\n${dish.viral_reel}\n\n📋 *Menu Description:*\n${dish.menu_post}`);
          if (dish.delivery_copy) await sendSafe(phone, `🛵 *Delivery Platform Copy:*\n${dish.delivery_copy}`);
          if (dish.story_poll) await sendSafe(phone, `📱 *Story Poll:*\n${dish.story_poll}`);
          await wa.sendText(phone, "📸 Send a photo of the dish to generate the full reel video!");
        } catch { await wa.sendText(phone, "⚠️ Try: DISH [your dish name, e.g. Chicken Biryani]"); }
        await this.sendWorkspaceMenu(phone, workspace.type as WorkspaceType);
        return;
      }

      // CATERING [event type] — catering promotion
      if (cmd.startsWith("CATERING ")) {
        const eventType = rawText.slice(9).trim() || "corporate events";
        await wa.sendText(phone, "🍱 Creating catering promotion...");
        try {
          const prompt = buildCateringPrompt(eventType, workspace.type);
          const result = await chat({ messages: [{ role: "user", content: prompt }], json: true });
          const cat = JSON.parse(result.text);
          await sendSafe(phone,
            `🍱 *Catering Promo: ${eventType}*\n\n🎬 Reel hook: ${cat.reel_hook}\n\n📝 Caption:\n${cat.caption}\n\n📋 Menu highlight: ${cat.menu_highlight}\n\n📞 CTA: ${cat.cta}`
          );
        } catch { await wa.sendText(phone, "⚠️ Try: CATERING corporate events (or weddings, birthday parties, etc.)"); }
        await this.sendWorkspaceMenu(phone, workspace.type as WorkspaceType);
        return;
      }

      // DELIVERY [platform] — delivery app launch promo
      if (cmd.startsWith("DELIVERY ")) {
        const platform = rawText.slice(9).trim() || "Swiggy/Zomato";
        await wa.sendText(phone, `🛵 Creating delivery launch promo for *${platform}*...`);
        try {
          const prompt = buildDeliveryLaunchPrompt(platform, workspace.type);
          const result = await chat({ messages: [{ role: "user", content: prompt }], json: true });
          const del = JSON.parse(result.text);
          await sendSafe(phone,
            `🛵 *Now on ${platform}!*\n\n🎬 Reel hook: ${del.reel_hook}\n\n📝 Caption:\n${del.caption}\n\n🎁 Launch offer: ${del.offer}\n\n💬 WhatsApp story: ${del.wa_story}`
          );
        } catch { await wa.sendText(phone, "⚠️ Try: DELIVERY Swiggy (or Zomato, Dunzo, etc.)"); }
        await this.sendWorkspaceMenu(phone, workspace.type as WorkspaceType);
        return;
      }

      // OFFER [deal] — flash sale, daily special, or promotional offer post
      if (cmd.startsWith("OFFER ")) {
        const offer = rawText.slice(6).trim();
        if (!offer) { await wa.sendText(phone, "🔥 Usage: *OFFER Buy 1 Get 1 Biryani today only*"); return; }
        await wa.sendText(phone, `🔥 Creating offer post for: *${offer}*...`);
        try {
          const prompt = buildOfferPrompt(offer, workspace.type);
          const result = await chat({ messages: [{ role: "user", content: prompt }], json: true });
          const ofr = JSON.parse(result.text);
          await sendSafe(phone, `🔥 *Reel Hook:*\n${ofr.reel_hook}\n\n📝 *Caption:*\n${ofr.caption}`);
          await sendSafe(phone, `📢 *Broadcast:*\n${ofr.broadcast_message}\n\n📱 *Stories:*\n${(ofr.story_set as string[]).join("\n")}`);
        } catch { await wa.sendText(phone, "⚠️ Try: OFFER 50% off all starters tonight 6-9pm"); }
        await this.sendWorkspaceMenu(phone, workspace.type as WorkspaceType);
        return;
      }

      // ── ECOMMERCE category commands ──────────────────────────────────────────

      // LAUNCH [product] [price] — 3-phase product launch
      if (cmd.startsWith("LAUNCH ")) {
        const rest = rawText.slice(7).trim();
        const priceSep = rest.lastIndexOf(" ");
        const product = priceSep > 0 ? rest.slice(0, priceSep).trim() : rest;
        const price = priceSep > 0 ? rest.slice(priceSep + 1).trim() : "contact for price";
        if (!product) { await wa.sendText(phone, "🚀 Usage: *LAUNCH Red Sports Shoes 1999*"); return; }
        await wa.sendText(phone, `🚀 Building 3-phase launch for *${product}*...`);
        try {
          const prompt = buildProductLaunchPrompt(product, price);
          const result = await chat({ messages: [{ role: "user", content: prompt }], json: true, maxTokens: 2000 });
          const launch = JSON.parse(result.text);
          await sendSafe(phone, `📅 *Phase 1 — Teaser (Day 1-2):*\n${launch.teaser.caption}\n\n🎯 *Phase 2 — Launch Day:*\n${launch.launch_day.caption}`);
          await sendSafe(phone, `📈 *Phase 3 — Follow-up:*\n${launch.follow_up.caption}\n\n🎬 Reel hook: ${launch.launch_day.reel_hook}`);
        } catch { await wa.sendText(phone, "⚠️ Try: LAUNCH [product name] [price]"); }
        await this.sendWorkspaceMenu(phone, workspace.type as WorkspaceType);
        return;
      }


      // COMPARE [product1] vs [product2] — comparison post
      if (cmd.startsWith("COMPARE ")) {
        const rest = rawText.slice(8).trim();
        const vsSep = rest.toLowerCase().indexOf(" vs ");
        const product1 = vsSep > 0 ? rest.slice(0, vsSep).trim() : rest;
        const product2 = vsSep > 0 ? rest.slice(vsSep + 4).trim() : "competitor";
        await wa.sendText(phone, `⚖️ Creating comparison content for *${product1}* vs *${product2}*...`);
        try {
          const prompt = buildProductComparePrompt(product1, product2);
          const result = await chat({ messages: [{ role: "user", content: prompt }], json: true });
          const cmp = JSON.parse(result.text);
          await sendSafe(phone,
            `⚖️ *${product1} vs ${product2}*\n\n🎬 Reel hook: ${cmp.reel_hook}\n\n📝 Caption:\n${cmp.caption}\n\n🏆 Winner: ${cmp.verdict}`
          );
        } catch { await wa.sendText(phone, "⚠️ Try: COMPARE iPhone 15 vs Samsung S24"); }
        await this.sendWorkspaceMenu(phone, workspace.type as WorkspaceType);
        return;
      }

      // GIFTING [occasion] [price range] — gift guide
      if (cmd.startsWith("GIFTING ")) {
        const rest = rawText.slice(8).trim();
        const parts = rest.split(" ");
        const priceRange = parts[parts.length - 1]?.match(/^\d+/) ? parts.pop()! : "500-2000";
        const occasion = parts.join(" ") || "birthday";
        await wa.sendText(phone, `🎁 Creating gift guide for *${occasion}*...`);
        try {
          const prompt = buildGiftGuidePrompt(occasion, priceRange);
          const result = await chat({ messages: [{ role: "user", content: prompt }], json: true });
          const guide = JSON.parse(result.text);
          const gifts = (guide.gift_ideas as string[]).map((g: string, i: number) => `${i+1}. ${g}`).join("\n");
          await sendSafe(phone,
            `🎁 *Gift Guide: ${occasion}*\n\n${gifts}\n\n🎬 Reel hook: ${guide.reel_hook}\n\n📝 Caption:\n${guide.caption}`
          );
        } catch { await wa.sendText(phone, "⚠️ Try: GIFTING birthday 500-2000 (or wedding, anniversary)"); }
        await this.sendWorkspaceMenu(phone, workspace.type as WorkspaceType);
        return;
      }

      // ── CREATOR category commands ────────────────────────────────────────────

      // VIRAL [topic] — 10 viral hook variations
      if (cmd.startsWith("VIRAL ")) {
        const rest = rawText.slice(6).trim();
        const commaSep = rest.indexOf(",");
        const topic = commaSep > 0 ? rest.slice(0, commaSep).trim() : rest;
        const niche = commaSep > 0 ? rest.slice(commaSep + 1).trim() : workspace.type.toLowerCase();
        await wa.sendText(phone, `🔥 Generating 10 viral hooks for *${topic}*...`);
        try {
          const prompt = buildViralHookPrompt(topic, niche);
          const result = await chat({ messages: [{ role: "user", content: prompt }], json: true });
          const hooks = JSON.parse(result.text);
          const hookList = (hooks.hooks as Array<{ hook: string; formula: string }>)
            .map((h, i) => `${i+1}. ${h.hook}\n   _Formula: ${h.formula}_`)
            .join("\n\n");
          await sendSafe(phone, `🔥 *10 Viral Hooks for: ${topic}*\n\n${hookList}`);
        } catch { await wa.sendText(phone, "⚠️ Try: VIRAL morning routine, lifestyle (topic, niche)"); }
        await this.sendWorkspaceMenu(phone, workspace.type as WorkspaceType);
        return;
      }

      // GIVEAWAY [prize] — giveaway announcement post
      if (cmd.startsWith("GIVEAWAY ")) {
        const prize = rawText.slice(9).trim();
        if (!prize) { await wa.sendText(phone, "🎁 Usage: *GIVEAWAY iPhone 15 + AirPods*"); return; }
        await wa.sendText(phone, `🎁 Creating giveaway post for *${prize}*...`);
        try {
          const prompt = buildGiveawayPrompt(prize, workspace.type);
          const result = await chat({ messages: [{ role: "user", content: prompt }], json: true });
          const gw = JSON.parse(result.text);
          await sendSafe(phone, `🎁 *Giveaway Reel Script:*\n${gw.reel_script}\n\n📝 *Caption:*\n${gw.caption}`);
          const rules = (gw.entry_rules as string[]).map((r: string, i: number) => `${i+1}. ${r}`).join("\n");
          await sendSafe(phone, `📋 *Entry Rules:*\n${rules}\n\n📱 *Stories:*\n${(gw.story_set as string[]).join("\n")}`);
        } catch { await wa.sendText(phone, "⚠️ Try: GIVEAWAY iPhone 15 (or any prize)"); }
        await this.sendWorkspaceMenu(phone, workspace.type as WorkspaceType);
        return;
      }

      // COLLAB [brand] [product] — brand collaboration announcement
      if (cmd.startsWith("COLLAB ")) {
        const rest = rawText.slice(7).trim();
        const commaSep = rest.indexOf(",");
        const brandName = commaSep > 0 ? rest.slice(0, commaSep).trim() : rest;
        const product = commaSep > 0 ? rest.slice(commaSep + 1).trim() : "their product";
        await wa.sendText(phone, `🤝 Creating collab post with *${brandName}*...`);
        try {
          const prompt = buildCollabPrompt(brandName, product);
          const result = await chat({ messages: [{ role: "user", content: prompt }], json: true });
          const collab = JSON.parse(result.text);
          await sendSafe(phone, `🤝 *Collab Reel Script:*\n${collab.reel_script}\n\n📝 *Caption:*\n${collab.caption}\n\n⚠️ *Disclosure:* ${collab.disclosure_line}`);
          if (collab.story_set?.length) await sendSafe(phone, `📱 *Stories:*\n${(collab.story_set as string[]).join("\n")}`);
        } catch { await wa.sendText(phone, "⚠️ Try: COLLAB Nike, Air Max running shoes"); }
        await this.sendWorkspaceMenu(phone, workspace.type as WorkspaceType);
        return;
      }

      // ── BUSINESS SERVICES category commands ──────────────────────────────────

      // CASESTUDY [client] [result] [service] — case study content
      if (cmd.startsWith("CASESTUDY ")) {
        const rest = rawText.slice(10).trim();
        const parts = rest.split(",").map((p: string) => p.trim());
        const client = parts[0] || "a client";
        const result_text = parts[1] || "3x revenue growth";
        const service = parts[2] || workspace.type.toLowerCase();
        await wa.sendText(phone, "📈 Writing your case study content...");
        try {
          const prompt = buildCaseStudyPrompt(client, result_text, service);
          const result = await chat({ messages: [{ role: "user", content: prompt }], json: true });
          const cs = JSON.parse(result.text);
          await sendSafe(phone, `🎬 *Reel Script:*\n${cs.reel_script}\n\n💼 *LinkedIn Post:*\n${cs.linkedin_post}`);
          await sendSafe(phone, `📱 *WhatsApp Pitch:*\n${cs.whatsapp_pitch}\n\n⭐ *Testimonial:*\n${cs.testimonial}`);
        } catch { await wa.sendText(phone, "⚠️ Try: CASESTUDY TechCorp, 200% leads, social media marketing"); }
        await this.sendWorkspaceMenu(phone, workspace.type as WorkspaceType);
        return;
      }

      // WEBINAR [topic] [date] [price] — webinar promo sequence
      if (cmd.startsWith("WEBINAR ")) {
        const rest = rawText.slice(8).trim();
        const parts = rest.split(",").map((p: string) => p.trim());
        const topic = parts[0] || rest;
        const date = parts[1] || "next Saturday";
        const price = parts[2] || "Free";
        await wa.sendText(phone, `🎤 Creating webinar promo for *${topic}*...`);
        try {
          const prompt = buildWebinarPrompt(topic, date, price);
          const result = await chat({ messages: [{ role: "user", content: prompt }], json: true, maxTokens: 1800 });
          const web = JSON.parse(result.text);
          await sendSafe(phone, `🎬 *Reel Hook:*\n${web.reel_hook}\n\n📧 *Email 1:*\n${web.email_sequence?.[0] || web.email1 || ""}`);
          await sendSafe(phone, `💬 *WhatsApp Invite:*\n${web.wa_invite}\n\n📱 *Story Countdown:*\n${web.story_countdown}`);
        } catch { await wa.sendText(phone, "⚠️ Try: WEBINAR Social Media Marketing, Saturday 5pm, Free"); }
        await this.sendWorkspaceMenu(phone, workspace.type as WorkspaceType);
        return;
      }

      // ── EVENTS category commands ─────────────────────────────────────────────

      // LINEUP [artists] — event lineup reveal
      if (cmd.startsWith("LINEUP ")) {
        const rest = rawText.slice(7).trim();
        const commaSep = rest.indexOf(",");
        const artists = commaSep > 0 ? rest.slice(0, commaSep).trim() : rest;
        const eventName = commaSep > 0 ? rest.slice(commaSep + 1).trim() : "The Event";
        const eventParts = eventName.split(",");
        const actualEventName = eventParts[0]?.trim() || "The Event";
        const eventDate = eventParts[1]?.trim() || "coming soon";
        await wa.sendText(phone, `🎤 Creating lineup reveal for *${actualEventName}*...`);
        try {
          const prompt = buildLineupRevealPrompt(artists, actualEventName, eventDate);
          const result = await chat({ messages: [{ role: "user", content: prompt }], json: true });
          const lineup = JSON.parse(result.text);
          await sendSafe(phone,
            `🎤 *${actualEventName} Lineup Reveal*\n\n🎬 Reel hook: ${lineup.reel_hook}\n\n📝 Caption:\n${lineup.caption}\n\n📱 Stories: ${(lineup.story_sequence as string[])?.join(" → ") || ""}`
          );
        } catch { await wa.sendText(phone, "⚠️ Try: LINEUP DJ Snake + Nucleya, SunBurn Festival, Dec 20"); }
        await this.sendWorkspaceMenu(phone, workspace.type as WorkspaceType);
        return;
      }

      // RECAP [event] — post-event recap content
      if (cmd.startsWith("RECAP ")) {
        const rest = rawText.slice(6).trim();
        const commaSep = rest.indexOf(",");
        const eventName = commaSep > 0 ? rest.slice(0, commaSep).trim() : rest;
        const highlights = commaSep > 0 ? rest.slice(commaSep + 1).trim() : "amazing moments";
        await wa.sendText(phone, `🎉 Creating recap content for *${eventName}*...`);
        try {
          const prompt = buildEventRecapPrompt(eventName, highlights);
          const result = await chat({ messages: [{ role: "user", content: prompt }], json: true });
          const recap = JSON.parse(result.text);
          await sendSafe(phone,
            `🎉 *${eventName} Recap*\n\n🎬 Reel hook: ${recap.reel_hook}\n\n📝 Caption:\n${recap.caption}\n\n💬 Thank you message:\n${recap.thank_you}`
          );
        } catch { await wa.sendText(phone, "⚠️ Try: RECAP Music Night, 500 attendees, 3 live performances"); }
        await this.sendWorkspaceMenu(phone, workspace.type as WorkspaceType);
        return;
      }

      // TICKETS [event] [date] [details] — ticket sale launch post
      if (cmd.startsWith("TICKETS ")) {
        const rest = rawText.slice(8).trim();
        const parts = rest.split(",").map((p: string) => p.trim());
        const eventName = parts[0] || rest;
        const date = parts[1] || "coming soon";
        const details = parts[2] || "";
        await wa.sendText(phone, `🎟 Creating ticket launch content for *${eventName}*...`);
        try {
          const prompt = buildTicketsPrompt(eventName, date, details);
          const result = await chat({ messages: [{ role: "user", content: prompt }], json: true });
          const tix = JSON.parse(result.text);
          await sendSafe(phone, `🎟 *Reel Script:*\n${tix.reel_script}\n\n📝 *Caption:*\n${tix.caption}`);
          await sendSafe(phone, `📢 *Broadcast:*\n${tix.broadcast_message}\n\n📱 *Stories:*\n${(tix.story_set as string[]).join("\n")}`);
        } catch { await wa.sendText(phone, "⚠️ Try: TICKETS SunBurn 2025, December 20-21, Goa (₹2999 onwards)"); }
        await this.sendWorkspaceMenu(phone, workspace.type as WorkspaceType);
        return;
      }

      // ── EDUCATION category commands ──────────────────────────────────────────

      // COURSE [name] [price] [target student] — course launch campaign
      if (cmd.startsWith("COURSE ")) {
        const rest = rawText.slice(7).trim();
        const parts = rest.split(",").map((p: string) => p.trim());
        const courseName = parts[0] || rest;
        const price = parts[1] || "₹999";
        const targetStudent = parts[2] || "beginners";
        await wa.sendText(phone, `🎓 Building launch campaign for *${courseName}*...`);
        try {
          const prompt = buildCourseLaunchPrompt(courseName, price, targetStudent);
          const result = await chat({ messages: [{ role: "user", content: prompt }], json: true, maxTokens: 2000 });
          const course = JSON.parse(result.text);
          await sendSafe(phone, `🎬 *Launch Reel:*\n${course.reel_script}\n\n📋 *Curriculum:*\n${course.curriculum_post}`);
          await sendSafe(phone, `💬 *Objection Handler:*\n${course.objection_handler}\n\n📅 *4-Day Sequence:*\n${(course.wa_sequence as string[]).map((s: string, i: number) => `Day ${i+1}: ${s}`).join("\n")}`);
        } catch { await wa.sendText(phone, "⚠️ Try: COURSE Digital Marketing Masterclass, ₹2999, working professionals"); }
        await this.sendWorkspaceMenu(phone, workspace.type as WorkspaceType);
        return;
      }

      // RESULT [student] [before] [after] — student success story
      if (cmd.startsWith("RESULT ")) {
        const rest = rawText.slice(7).trim();
        const parts = rest.split(",").map((p: string) => p.trim());
        const studentName = parts[0] || "Student";
        const before = parts[1] || "struggling";
        const after = parts[2] || "transformed";
        const courseName = parts[3] || workspace.type.toLowerCase();
        await wa.sendText(phone, "⭐ Creating student success story...");
        try {
          const prompt = buildStudentResultPrompt(studentName, before, after, courseName);
          const result = await chat({ messages: [{ role: "user", content: prompt }], json: true });
          const sr = JSON.parse(result.text);
          await sendSafe(phone, `⭐ *${studentName}'s Transformation:*\n\n🎬 Reel hook: ${sr.reel_hook}\n\n📝 Caption:\n${sr.caption}\n\n💬 Testimonial: ${sr.testimonial}`);
        } catch { await wa.sendText(phone, "⚠️ Try: RESULT Priya Sharma, unemployed for 6 months, landed ₹8L job, Python course"); }
        await this.sendWorkspaceMenu(phone, workspace.type as WorkspaceType);
        return;
      }

      // FREECLASS [topic] [date] — free class / workshop promotional content
      if (cmd.startsWith("FREECLASS ")) {
        const rest = rawText.slice(10).trim();
        const commaSep = rest.indexOf(",");
        const topic = commaSep > 0 ? rest.slice(0, commaSep).trim() : rest;
        const date = commaSep > 0 ? rest.slice(commaSep + 1).trim() : "this weekend";
        await wa.sendText(phone, `🎓 Creating free class promo for *${topic}*...`);
        try {
          const prompt = buildFreeClassPrompt(topic, date);
          const result = await chat({ messages: [{ role: "user", content: prompt }], json: true });
          const fc = JSON.parse(result.text);
          await sendSafe(phone, `🎓 *Reel Script:*\n${fc.reel_script}\n\n📝 *Caption:*\n${fc.caption}`);
          await sendSafe(phone, `📢 *Broadcast:*\n${fc.broadcast_message}\n\n📱 *Stories:*\n${(fc.story_set as string[]).join("\n")}`);
        } catch { await wa.sendText(phone, "⚠️ Try: FREECLASS Instagram Growth for Small Businesses, Saturday 5pm"); }
        await this.sendWorkspaceMenu(phone, workspace.type as WorkspaceType);
        return;
      }

      // ── PERSONAL category commands ────────────────────────────────────────────

      // WEDDING [partner1] & [partner2] [date] [venue] — wedding content suite
      if (cmd.startsWith("WEDDING ")) {
        const rest = rawText.slice(8).trim();
        const parts = rest.split(",").map((p: string) => p.trim());
        const names = parts[0] || rest;
        const nameParts = names.split(/&|and/i).map((n: string) => n.trim());
        const partner1 = nameParts[0] || "Partner 1";
        const partner2 = nameParts[1] || "Partner 2";
        const date = parts[1] || "our special day";
        const venue = parts[2] || "our venue";
        await wa.sendText(phone, "💍 Creating your wedding content suite...");
        try {
          const prompt = buildWeddingContentPrompt(partner1, partner2, date, venue);
          const result = await chat({ messages: [{ role: "user", content: prompt }], json: true, maxTokens: 1800 });
          const wedding = JSON.parse(result.text);
          await sendSafe(phone, `💍 *Save The Date:*\n${wedding.save_the_date}\n\n🎬 *Wedding Day Post:*\n${wedding.wedding_day_post}`);
          if (wedding.highlight_reel) await sendSafe(phone, `🎬 *Highlight Reel Script:*\n${wedding.highlight_reel}`);
          if (wedding.story_countdown) await sendSafe(phone, `📱 *Story Countdown:*\n${(wedding.story_countdown as string[]).join("\n")}`);
        } catch { await wa.sendText(phone, "⚠️ Try: WEDDING Rahul & Priya, December 15, Taj Mumbai"); }
        await this.sendWorkspaceMenu(phone, workspace.type as WorkspaceType);
        return;
      }

      // TRIBUTE [name] [relationship] [memory] — memorial/tribute content
      if (cmd.startsWith("TRIBUTE ")) {
        const rest = rawText.slice(8).trim();
        const parts = rest.split(",").map((p: string) => p.trim());
        const name = parts[0] || rest;
        const relationship = parts[1] || "beloved";
        const memory = parts[2] || "forever in our hearts";
        await wa.sendText(phone, "🕊️ Creating a heartfelt tribute...");
        try {
          const prompt = buildTributePrompt(name, relationship, memory);
          const result = await chat({ messages: [{ role: "user", content: prompt }], json: true });
          const tribute = JSON.parse(result.text);
          await sendSafe(phone,
            `🕊️ *In Memory of ${name}:*\n\n📝 *Post:*\n${tribute.tribute_post}\n\n💬 *Quote:*\n${tribute.memory_quote}\n\n📱 *Story:*\n${tribute.story_caption}`
          );
        } catch { await wa.sendText(phone, "⚠️ Try: TRIBUTE Grandmother, my grandmother, her love for cooking"); }
        await this.sendWorkspaceMenu(phone, workspace.type as WorkspaceType);
        return;
      }

      // GRADUATION [name] [degree] [university] — graduation celebration
      if (cmd.startsWith("GRADUATION ")) {
        const rest = rawText.slice(11).trim();
        const parts = rest.split(",").map((p: string) => p.trim());
        const name = parts[0] || rest;
        const degree = parts[1] || "degree";
        const university = parts[2] || "university";
        await wa.sendText(phone, "🎓 Creating graduation celebration content...");
        try {
          const prompt = buildGraduationPrompt(name, degree, university);
          const result = await chat({ messages: [{ role: "user", content: prompt }], json: true });
          const grad = JSON.parse(result.text);
          await sendSafe(phone,
            `🎓 *Congratulations ${name}!*\n\n🎬 Reel: ${grad.reel_script}\n\n📝 Post:\n${grad.congratulations_post?.caption || grad.congratulations_post}\n\n💌 Message: ${grad.future_wish}`
          );
          if (grad.story_set?.length) await sendSafe(phone, `📱 Stories: ${(grad.story_set as string[]).join(" → ")}`);
        } catch { await wa.sendText(phone, "⚠️ Try: GRADUATION Rahul, B.Tech Computer Science, IIT Bombay"); }
        await this.sendWorkspaceMenu(phone, workspace.type as WorkspaceType);
        return;
      }

      // ── TESTIMONIAL [client, result] — shared Real Estate + Business Services ──
      if (cmd.startsWith("TESTIMONIAL ")) {
        const rest = rawText.slice(12).trim();
        const parts = rest.split(",").map((p: string) => p.trim());
        const clientName = parts[0] || "Client";
        const result_text = parts[1] || "great experience";
        await wa.sendText(phone, `⭐ Creating testimonial content for *${clientName}*...`);
        try {
          const prompt = buildTestimonialPrompt(clientName, result_text, workspace.type);
          const result = await chat({ messages: [{ role: "user", content: prompt }], json: true });
          const t = JSON.parse(result.text);
          await sendSafe(phone, `⭐ *Reel Script:*\n${t.reel_script}\n\n💬 *Quote Card:*\n"${t.quote_card?.quote}"\n— ${t.quote_card?.attribution}`);
          await sendSafe(phone, `📝 *Caption:*\n${t.caption}\n\n📱 *Stories:*\n${(t.story_set as string[]).join("\n")}`);
        } catch { await wa.sendText(phone, "⚠️ Try: TESTIMONIAL Ravi Kumar, sold in 3 days above asking price"); }
        await this.sendWorkspaceMenu(phone, workspace.type as WorkspaceType);
        return;
      }

      // ── RENOVATION [type, details] — Real Estate ──────────────────────────────
      if (cmd.startsWith("RENOVATION ")) {
        const rest = rawText.slice(11).trim();
        const parts = rest.split(",").map((p: string) => p.trim());
        const propertyType = parts[0] || "apartment";
        const renovationDone = parts.slice(1).join(", ") || "full renovation";
        await wa.sendText(phone, `🔨 Creating renovation before/after content...`);
        try {
          const prompt = buildRenovationPrompt(propertyType, renovationDone);
          const result = await chat({ messages: [{ role: "user", content: prompt }], json: true });
          const r = JSON.parse(result.text);
          await sendSafe(phone, `🔨 *Reel Script:*\n${r.reel_script}\n\n📝 *Caption:*\n${r.caption}`);
          if (r.carousel_slides?.length) await sendSafe(phone, `📊 *Carousel (5 slides):*\n${(r.carousel_slides as string[]).map((s: string, i: number) => `${i+1}. ${s}`).join("\n")}`);
        } catch { await wa.sendText(phone, "⚠️ Try: RENOVATION 2BHK Bandra, kitchen remodel, new flooring, fresh paint"); }
        await this.sendWorkspaceMenu(phone, workspace.type as WorkspaceType);
        return;
      }

      // ── OPENING [name, date, offer] — Restaurant grand opening ────────────────
      if (cmd.startsWith("OPENING ")) {
        const rest = rawText.slice(8).trim();
        const parts = rest.split(",").map((p: string) => p.trim());
        const restaurantName = parts[0] || workspace.city || "our restaurant";
        const date = parts[1] || "this weekend";
        const offer = parts[2] || "50% off all items on opening day";
        await wa.sendText(phone, `🎉 Creating grand opening campaign for *${restaurantName}*...`);
        try {
          const prompt = buildGrandOpeningPrompt(restaurantName, date, offer);
          const result = await chat({ messages: [{ role: "user", content: prompt }], json: true, maxTokens: 1800 });
          const op = JSON.parse(result.text);
          await sendSafe(phone, `🎉 *Opening Reel:*\n${op.announcement_reel?.script || op.announcement_reel}\n\n📅 *7-Day Countdown:*\n${(op.countdown_posts as string[]).map((s: string, i: number) => `${i+1}. ${s}`).join("\n")}`);
          await sendSafe(phone, `📝 *Opening Day Caption:*\n${op.opening_day_caption}\n\n📢 *Broadcast:*\n${op.whatsapp_broadcast}`);
        } catch { await wa.sendText(phone, "⚠️ Try: OPENING Spice Garden Café, December 20, 30% off all orders on day 1"); }
        await this.sendWorkspaceMenu(phone, workspace.type as WorkspaceType);
        return;
      }

      // ── QANDA [topic] — Creator Q&A session ──────────────────────────────────
      if (cmd.startsWith("QANDA ")) {
        const rest = rawText.slice(6).trim();
        const commaSep = rest.indexOf(",");
        const topic = commaSep > 0 ? rest.slice(0, commaSep).trim() : rest;
        const niche = commaSep > 0 ? rest.slice(commaSep + 1).trim() : workspace.type.toLowerCase();
        if (!topic) { await wa.sendText(phone, "❓ Usage: *QANDA content creation tips, lifestyle creator*"); return; }
        await wa.sendText(phone, `❓ Creating Q&A content for *${topic}*...`);
        try {
          const prompt = buildQAPrompt(topic, niche);
          const result = await chat({ messages: [{ role: "user", content: prompt }], json: true });
          const qa = JSON.parse(result.text);
          await sendSafe(phone, `❓ *Q&A Reel Script:*\n${qa.intro_reel?.script || qa.intro_reel}`);
          const qList = (qa.top_questions as Array<{question: string; answer: string}>)
            .map((q, i) => `*Q${i+1}: ${q.question}*\n${q.answer}`)
            .join("\n\n");
          await sendSafe(phone, `💬 *Top Questions + Answers:*\n\n${qList}`);
        } catch { await wa.sendText(phone, "⚠️ Try: QANDA how to grow on Instagram, lifestyle creator"); }
        await this.sendWorkspaceMenu(phone, workspace.type as WorkspaceType);
        return;
      }

      // ── CHALLENGE [topic, niche] — Creator/Education challenge launch ─────────
      if (cmd.startsWith("CHALLENGE ")) {
        const rest = rawText.slice(10).trim();
        const commaSep = rest.indexOf(",");
        const topic = commaSep > 0 ? rest.slice(0, commaSep).trim() : rest;
        const niche = commaSep > 0 ? rest.slice(commaSep + 1).trim() : workspace.type.toLowerCase();
        if (!topic) { await wa.sendText(phone, "🏆 Usage: *CHALLENGE 30-day fitness, health creator*"); return; }
        await wa.sendText(phone, `🏆 Creating challenge launch content for *${topic}*...`);
        try {
          const prompt = buildCreatorChallengePrompt(topic, niche);
          const result = await chat({ messages: [{ role: "user", content: prompt }], json: true });
          const ch = JSON.parse(result.text);
          await sendSafe(phone, `🏆 *Challenge Name:* ${ch.challenge_name}\n\n🎬 *Reel Script:*\n${ch.reel_script}`);
          const rules = (ch.rules as string[]).map((r: string, i: number) => `${i+1}. ${r}`).join("\n");
          await sendSafe(phone, `📋 *How to Join:*\n${rules}\n\n📝 *Caption:*\n${ch.caption}`);
        } catch { await wa.sendText(phone, "⚠️ Try: CHALLENGE 30-day fitness, health and wellness"); }
        await this.sendWorkspaceMenu(phone, workspace.type as WorkspaceType);
        return;
      }

      // ── PROCESS [service, steps] — Business Services how-we-work content ──────
      if (cmd.startsWith("PROCESS ")) {
        const rest = rawText.slice(8).trim();
        const commaSep = rest.indexOf(",");
        const serviceName = commaSep > 0 ? rest.slice(0, commaSep).trim() : rest;
        const steps = commaSep > 0 ? rest.slice(commaSep + 1).trim() : "discovery, strategy, execution, results";
        if (!serviceName) { await wa.sendText(phone, "⚙️ Usage: *PROCESS SEO Audit, competitor research, on-page fixes, content plan, reporting*"); return; }
        await wa.sendText(phone, `⚙️ Creating process explainer for *${serviceName}*...`);
        try {
          const prompt = buildServiceProcessPrompt(serviceName, steps, workspace.type);
          const result = await chat({ messages: [{ role: "user", content: prompt }], json: true });
          const p = JSON.parse(result.text);
          await sendSafe(phone, `⚙️ *Reel Script:*\n${p.reel_script}`);
          const slides = (p.carousel_post?.slides as string[]).map((s: string, i: number) => `${i+1}. ${s}`).join("\n");
          await sendSafe(phone, `📊 *Carousel Slides:*\n${slides}\n\n📝 *Caption:*\n${p.carousel_post?.caption || ""}`);
        } catch { await wa.sendText(phone, "⚠️ Try: PROCESS Social Media Management, strategy call, content creation, scheduling, monthly report"); }
        await this.sendWorkspaceMenu(phone, workspace.type as WorkspaceType);
        return;
      }

      // ── VENUE [venue, event, date] — Events venue reveal ──────────────────────
      if (cmd.startsWith("VENUE ")) {
        const rest = rawText.slice(6).trim();
        const parts = rest.split(",").map((p: string) => p.trim());
        const venueName = parts[0] || rest;
        const eventName = parts[1] || "the event";
        const date = parts[2] || "coming soon";
        if (!venueName) { await wa.sendText(phone, "🏟️ Usage: *VENUE NSCI Dome Mumbai, TechFest 2025, January 15*"); return; }
        await wa.sendText(phone, `🏟️ Creating venue reveal for *${eventName}*...`);
        try {
          const prompt = buildVenueRevealPrompt(venueName, eventName, date);
          const result = await chat({ messages: [{ role: "user", content: prompt }], json: true });
          const v = JSON.parse(result.text);
          await sendSafe(phone, `🏟️ *Reveal Reel:*\n${v.reveal_reel?.script || v.reveal_reel}\n\n📝 *Caption:*\n${v.caption}`);
          if (v.story_set?.length) await sendSafe(phone, `📱 *Stories:*\n${(v.story_set as string[]).join("\n")}`);
        } catch { await wa.sendText(phone, "⚠️ Try: VENUE Phoenix Palladium Rooftop, Mumbai Cocktail Night, Feb 14"); }
        await this.sendWorkspaceMenu(phone, workspace.type as WorkspaceType);
        return;
      }

      // ── EARLYBIRD [event, discount, deadline] — Events early bird promo ───────
      if (cmd.startsWith("EARLYBIRD ")) {
        const rest = rawText.slice(10).trim();
        const parts = rest.split(",").map((p: string) => p.trim());
        const eventName = parts[0] || rest;
        const discount = parts[1] || "30% off";
        const deadline = parts[2] || "this Sunday";
        if (!eventName) { await wa.sendText(phone, "🐦 Usage: *EARLYBIRD SunBurn Festival, 40% off, Sunday midnight*"); return; }
        await wa.sendText(phone, `🐦 Creating early bird promo for *${eventName}*...`);
        try {
          const prompt = buildEarlyBirdPrompt(eventName, discount, deadline);
          const result = await chat({ messages: [{ role: "user", content: prompt }], json: true });
          const eb = JSON.parse(result.text);
          await sendSafe(phone, `🐦 *Reel Script:*\n${eb.reel_script}\n\n📝 *Caption:*\n${eb.caption}`);
          await sendSafe(phone, `⏰ *Countdown Post:*\n${eb.countdown_post}\n\n📢 *Broadcast:*\n${eb.broadcast_message}`);
        } catch { await wa.sendText(phone, "⚠️ Try: EARLYBIRD Goa Music Fest, 35% off, December 1"); }
        await this.sendWorkspaceMenu(phone, workspace.type as WorkspaceType);
        return;
      }

      // ── SPONSOR [brand, event] — Events sponsor announcement ──────────────────
      if (cmd.startsWith("SPONSOR ")) {
        const rest = rawText.slice(8).trim();
        const commaSep = rest.indexOf(",");
        const brandName = commaSep > 0 ? rest.slice(0, commaSep).trim() : rest;
        const eventName = commaSep > 0 ? rest.slice(commaSep + 1).trim() : "the event";
        if (!brandName) { await wa.sendText(phone, "🤝 Usage: *SPONSOR Red Bull, SunBurn Festival 2025*"); return; }
        await wa.sendText(phone, `🤝 Creating sponsor announcement for *${brandName}*...`);
        try {
          const prompt = buildSponsorPrompt(brandName, eventName);
          const result = await chat({ messages: [{ role: "user", content: prompt }], json: true });
          const sp = JSON.parse(result.text);
          await sendSafe(phone, `🤝 *Announcement Reel:*\n${sp.announcement_reel?.script || sp.announcement_reel}\n\n📝 *Caption:*\n${sp.caption}`);
          if (sp.brand_tag_caption) await sendSafe(phone, `🔁 *Repost Version (for ${brandName}):*\n${sp.brand_tag_caption}`);
        } catch { await wa.sendText(phone, "⚠️ Try: SPONSOR JBL, Mumbai Electronic Music Fest"); }
        await this.sendWorkspaceMenu(phone, workspace.type as WorkspaceType);
        return;
      }

      // ── SCHOLARSHIP [name, amount, deadline] — Education scholarship promo ─────
      if (cmd.startsWith("SCHOLARSHIP ")) {
        const rest = rawText.slice(12).trim();
        const parts = rest.split(",").map((p: string) => p.trim());
        const scholarshipName = parts[0] || "scholarship";
        const amount = parts[1] || "₹10,000";
        const deadline = parts[2] || "next month";
        await wa.sendText(phone, `🏫 Creating scholarship announcement...`);
        try {
          const prompt = buildScholarshipPrompt(scholarshipName, amount, deadline);
          const result = await chat({ messages: [{ role: "user", content: prompt }], json: true });
          const sch = JSON.parse(result.text);
          await sendSafe(phone, `🏫 *Announcement Reel:*\n${sch.announcement_reel?.script || sch.announcement_reel}\n\n📝 *Caption:*\n${sch.caption}`);
          await sendSafe(phone, `📢 *Broadcast:*\n${sch.broadcast_message}\n\n📱 *Stories:*\n${(sch.application_story as string[]).join("\n")}`);
        } catch { await wa.sendText(phone, "⚠️ Try: SCHOLARSHIP Merit Scholarship 2025, ₹25,000, January 31"); }
        await this.sendWorkspaceMenu(phone, workspace.type as WorkspaceType);
        return;
      }

      // ── ACHIEVEMENT [name, achievement] — Personal achievement celebration ─────
      if (cmd.startsWith("ACHIEVEMENT ")) {
        const rest = rawText.slice(12).trim();
        const commaSep = rest.indexOf(",");
        const name = commaSep > 0 ? rest.slice(0, commaSep).trim() : rest;
        const achievement = commaSep > 0 ? rest.slice(commaSep + 1).trim() : "incredible achievement";
        if (!name) { await wa.sendText(phone, "🏅 Usage: *ACHIEVEMENT Rohan, scored 95% in board exams*"); return; }
        await wa.sendText(phone, `🏅 Celebrating *${name}*'s achievement...`);
        try {
          const prompt = buildAchievementPrompt(name, achievement);
          const result = await chat({ messages: [{ role: "user", content: prompt }], json: true });
          const ach = JSON.parse(result.text);
          await sendSafe(phone, `🏅 *Reel Script:*\n${ach.reel_script}\n\n📝 *Caption:*\n${ach.caption}`);
          await sendSafe(phone, `📱 *Stories:*\n${(ach.story_set as string[]).join("\n")}\n\n💬 *Status:*\n${ach.whatsapp_status}`);
        } catch { await wa.sendText(phone, "⚠️ Try: ACHIEVEMENT Priya, got into IIT Bombay with AIR 42"); }
        await this.sendWorkspaceMenu(phone, workspace.type as WorkspaceType);
        return;
      }

      // ── FITNESS & GYM commands ───────────────────────────────────────────────────

      if (cmd.startsWith("TRANSFORMATION ")) {
        const details = rawText.slice(15).trim();
        if (!details) { await wa.sendText(phone, "💪 Usage: *TRANSFORMATION Client name, starting point, what they achieved*\n\nExample: _Ravi, struggled with weight, lost 18kg in 4 months_"); return; }
        await wa.sendText(phone, "💪 Creating transformation story...");
        try {
          const prompt = buildFitnessTransformationPrompt(details, language);
          const result = await chat({ messages: [{ role: "user", content: prompt }], json: true, maxTokens: 1800 });
          const t = JSON.parse(result.text);
          await sendSafe(phone, `💪 *Reel Script:*\n${t.reel_script}\n\n📝 *Caption:*\n${t.caption}`);
          await sendSafe(phone, `📱 *Story Set:*\n${(t.story_set as string[]).map((s: string, i: number) => `${i+1}. ${s}`).join("\n")}\n\n📢 *Broadcast:*\n${t.broadcast}`);
        } catch { await wa.sendText(phone, "⚠️ Try: TRANSFORMATION Ravi, 30kg overweight, lost 18kg in 4 months with our program"); }
        await this.sendWorkspaceMenu(phone, workspace.type as WorkspaceType);
        return;
      }

      if (cmd.startsWith("FITNESSCLASS ")) {
        const rest = rawText.slice(13).trim();
        const parts = rest.split(",").map((p: string) => p.trim());
        const className = parts[0] || rest;
        const time = parts[1] || "[SPECIFY: schedule]";
        const price = parts[2] || "[SPECIFY: price]";
        if (!className) { await wa.sendText(phone, "🏋️ Usage: *FITNESSCLASS HIIT Bootcamp, Monday 6am + Saturday 8am, ₹1500/month*"); return; }
        await wa.sendText(phone, `🏋️ Creating class promo for *${className}*...`);
        try {
          const prompt = buildFitnessClassPrompt(className, time, price, language);
          const result = await chat({ messages: [{ role: "user", content: prompt }], json: true });
          const c = JSON.parse(result.text);
          await sendSafe(phone, `🏋️ *Reel Script:*\n${c.reel_script}\n\n📝 *Caption:*\n${c.caption}`);
          await sendSafe(phone, `📱 *Stories:*\n${(c.story_set as string[]).map((s: string, i: number) => `${i+1}. ${s}`).join("\n")}\n\n📢 *Broadcast:*\n${c.broadcast}`);
        } catch { await wa.sendText(phone, "⚠️ Try: FITNESSCLASS Yoga Flow, Tues + Thurs 7am, ₹800/session"); }
        await this.sendWorkspaceMenu(phone, workspace.type as WorkspaceType);
        return;
      }

      // ── SALON & SPA commands ─────────────────────────────────────────────────────

      if (cmd.startsWith("SALONSERVICE ")) {
        const rest = rawText.slice(13).trim();
        const parts = rest.split(",").map((p: string) => p.trim());
        const service = parts[0] || rest;
        const duration = parts[1] || "[SPECIFY: duration]";
        const price = parts[2] || "[SPECIFY: price]";
        if (!service) { await wa.sendText(phone, "✨ Usage: *SALONSERVICE Keratin Hair Treatment, 90 minutes, ₹3500*"); return; }
        await wa.sendText(phone, `✨ Creating showcase for *${service}*...`);
        try {
          const prompt = buildSalonServicePrompt(service, duration, price, language);
          const result = await chat({ messages: [{ role: "user", content: prompt }], json: true });
          const s = JSON.parse(result.text);
          await sendSafe(phone, `✨ *Reel Script:*\n${s.reel_script}\n\n📝 *Caption:*\n${s.caption}`);
          await sendSafe(phone, `📱 *Stories:*\n${(s.story_set as string[]).map((sl: string, i: number) => `${i+1}. ${sl}`).join("\n")}\n\n📢 *Broadcast:*\n${s.broadcast}`);
        } catch { await wa.sendText(phone, "⚠️ Try: SALONSERVICE Hair Colour + Treatment, 2 hours, ₹2800"); }
        await this.sendWorkspaceMenu(phone, workspace.type as WorkspaceType);
        return;
      }

      if (cmd.startsWith("SALONBOOKING ") || cmd === "SALONBOOKING") {
        const slots = rawText.startsWith("SALONBOOKING ") ? rawText.slice(13).trim() : "this week";
        await wa.sendText(phone, "📅 Creating booking promo...");
        try {
          const prompt = buildSalonBookingPrompt(slots, language);
          const result = await chat({ messages: [{ role: "user", content: prompt }], json: true });
          const b = JSON.parse(result.text);
          await sendSafe(phone, `📅 *Reel:*\n${b.reel_script}\n\n📝 *Caption:*\n${b.caption}`);
          await sendSafe(phone, `📱 *Stories:*\n${(b.story_set as string[]).map((s: string, i: number) => `${i+1}. ${s}`).join("\n")}\n\n📢 *Broadcast:*\n${b.broadcast}`);
        } catch { await wa.sendText(phone, "⚠️ Try: SALONBOOKING Thursday–Sunday afternoons available"); }
        await this.sendWorkspaceMenu(phone, workspace.type as WorkspaceType);
        return;
      }

      // ── FASHION commands ─────────────────────────────────────────────────────────

      // FASHIONDROP is the namespaced command; DROP also works when workspace is FASHION
      if (cmd.startsWith("FASHIONDROP ") || (cmd.startsWith("DROP ") && workspace.type === "FASHION")) {
        const raw = cmd.startsWith("FASHIONDROP ") ? rawText.slice(12).trim() : rawText.slice(5).trim();
        const commaSep = raw.lastIndexOf(",");
        const collection = commaSep > 0 ? raw.slice(0, commaSep).trim() : raw;
        const priceRange = commaSep > 0 ? raw.slice(commaSep + 1).trim() : "[SPECIFY: price range]";
        if (!collection) { await wa.sendText(phone, "👗 Usage: *DROP Winter Luxe Collection, ₹1299–₹4999*"); return; }
        await wa.sendText(phone, `👗 Creating drop content for *${collection}*...`);
        try {
          const prompt = buildFashionDropPrompt(collection, priceRange, language);
          const result = await chat({ messages: [{ role: "user", content: prompt }], json: true, maxTokens: 1800 });
          const d = JSON.parse(result.text);
          await sendSafe(phone, `👗 *Reel Script:*\n${d.reel_script}\n\n📝 *Caption:*\n${d.caption}`);
          await sendSafe(phone, `📱 *Stories:*\n${(d.story_set as string[]).map((s: string, i: number) => `${i+1}. ${s}`).join("\n")}\n\n📢 *Broadcast:*\n${d.broadcast}`);
        } catch { await wa.sendText(phone, "⚠️ Try: DROP Summer Vibes Collection, ₹999–₹3999"); }
        await this.sendWorkspaceMenu(phone, workspace.type as WorkspaceType);
        return;
      }

      if (cmd.startsWith("LOOKBOOK ")) {
        const season = rawText.slice(9).trim();
        if (!season) { await wa.sendText(phone, "📸 Usage: *LOOKBOOK Summer 2025 — coastal vibes*"); return; }
        await wa.sendText(phone, `📸 Creating lookbook content for *${season}*...`);
        try {
          const prompt = buildFashionLookbookPrompt(season, language);
          const result = await chat({ messages: [{ role: "user", content: prompt }], json: true });
          const lb = JSON.parse(result.text);
          await sendSafe(phone, `📸 *Reel Script:*\n${lb.reel_script}\n\n📝 *Caption:*\n${lb.caption}`);
          await sendSafe(phone, `📱 *Stories:*\n${(lb.story_set as string[]).map((s: string, i: number) => `${i+1}. ${s}`).join("\n")}\n\n📢 *Broadcast:*\n${lb.broadcast}`);
        } catch { await wa.sendText(phone, "⚠️ Try: LOOKBOOK Monsoon Edit 2025 — earthy tones"); }
        await this.sendWorkspaceMenu(phone, workspace.type as WorkspaceType);
        return;
      }

      // ── TRAVEL commands ──────────────────────────────────────────────────────────

      if (cmd.startsWith("PACKAGE ")) {
        const rest = rawText.slice(8).trim();
        const parts = rest.split(",").map((p: string) => p.trim());
        const destination = parts[0] || rest;
        const duration = parts[1] || "[SPECIFY: nights]";
        const price = parts[2] || "[SPECIFY: price]";
        if (!destination) { await wa.sendText(phone, "✈️ Usage: *PACKAGE Bali, 5 nights, ₹45,000 per person*"); return; }
        await wa.sendText(phone, `✈️ Creating package promo for *${destination}*...`);
        try {
          const prompt = buildTravelPackagePrompt(destination, duration, price, language);
          const result = await chat({ messages: [{ role: "user", content: prompt }], json: true, maxTokens: 1800 });
          const pkg = JSON.parse(result.text);
          await sendSafe(phone, `✈️ *Reel Script:*\n${pkg.reel_script}\n\n📝 *Caption:*\n${pkg.caption}`);
          await sendSafe(phone, `📱 *Stories:*\n${(pkg.story_set as string[]).map((s: string, i: number) => `${i+1}. ${s}`).join("\n")}\n\n📢 *Broadcast:*\n${pkg.broadcast}`);
        } catch { await wa.sendText(phone, "⚠️ Try: PACKAGE Kerala Backwaters, 4 nights 3 days, ₹28,000 per couple"); }
        await this.sendWorkspaceMenu(phone, workspace.type as WorkspaceType);
        return;
      }

      if (cmd.startsWith("DESTINATION ")) {
        const location = rawText.slice(12).trim();
        if (!location) { await wa.sendText(phone, "🗺️ Usage: *DESTINATION Meghalaya — the Scotland of India*"); return; }
        await wa.sendText(phone, `🗺️ Creating destination content for *${location}*...`);
        try {
          const prompt = buildTravelDestinationPrompt(location, language);
          const result = await chat({ messages: [{ role: "user", content: prompt }], json: true });
          const dest = JSON.parse(result.text);
          await sendSafe(phone, `🗺️ *Reel Script:*\n${dest.reel_script}\n\n📝 *Caption:*\n${dest.caption}`);
          await sendSafe(phone, `📱 *Stories:*\n${(dest.story_set as string[]).map((s: string, i: number) => `${i+1}. ${s}`).join("\n")}\n\n📢 *Broadcast:*\n${dest.broadcast}`);
        } catch { await wa.sendText(phone, "⚠️ Try: DESTINATION Coorg, Karnataka — coffee estates and waterfalls"); }
        await this.sendWorkspaceMenu(phone, workspace.type as WorkspaceType);
        return;
      }

      // ── HEALTHCARE commands ──────────────────────────────────────────────────────

      if (cmd.startsWith("AWARENESS ")) {
        const topic = rawText.slice(10).trim();
        if (!topic) { await wa.sendText(phone, "🏥 Usage: *AWARENESS Diabetes prevention — 3 diet changes that help*"); return; }
        await wa.sendText(phone, `🏥 Creating health awareness content for *${topic}*...`);
        try {
          const prompt = buildHealthAwarenessPrompt(topic, language);
          const result = await chat({ messages: [{ role: "user", content: prompt }], json: true });
          const aw = JSON.parse(result.text);
          await sendSafe(phone, `🏥 *Reel Script:*\n${aw.reel_script}\n\n📝 *Caption:*\n${aw.caption}`);
          await sendSafe(phone, `📱 *Stories:*\n${(aw.story_set as string[]).map((s: string, i: number) => `${i+1}. ${s}`).join("\n")}\n\n📢 *Broadcast:*\n${aw.broadcast}`);
        } catch { await wa.sendText(phone, "⚠️ Try: AWARENESS Hypertension — 5 early signs to watch for"); }
        await this.sendWorkspaceMenu(phone, workspace.type as WorkspaceType);
        return;
      }

      if (cmd.startsWith("APPOINTMENT ")) {
        const rest = rawText.slice(12).trim();
        const parts = rest.split(",").map((p: string) => p.trim());
        const specialty = parts[0] || rest;
        const availability = parts[1] || "weekdays";
        if (!specialty) { await wa.sendText(phone, "📅 Usage: *APPOINTMENT Physiotherapy, weekday mornings and Saturday*"); return; }
        await wa.sendText(phone, `📅 Creating appointment promo for *${specialty}*...`);
        try {
          const prompt = buildHealthAppointmentPrompt(specialty, availability, language);
          const result = await chat({ messages: [{ role: "user", content: prompt }], json: true });
          const apt = JSON.parse(result.text);
          await sendSafe(phone, `📅 *Reel Script:*\n${apt.reel_script}\n\n📝 *Caption:*\n${apt.caption}`);
          await sendSafe(phone, `📱 *Stories:*\n${(apt.story_set as string[]).map((s: string, i: number) => `${i+1}. ${s}`).join("\n")}\n\n📢 *Broadcast:*\n${apt.broadcast}`);
        } catch { await wa.sendText(phone, "⚠️ Try: APPOINTMENT Dental Consultation, Tuesday and Friday mornings"); }
        await this.sendWorkspaceMenu(phone, workspace.type as WorkspaceType);
        return;
      }

      // ── AUTOMOBILE commands ──────────────────────────────────────────────────────

      if (cmd.startsWith("VEHICLE ")) {
        const rest = rawText.slice(8).trim();
        const parts = rest.split(",").map((p: string) => p.trim());
        const vehicle = parts[0] || rest;
        const price = parts[1] || "[SPECIFY: price]";
        const features = parts.slice(2).join(", ") || "[SPECIFY: key features]";
        if (!vehicle) { await wa.sendText(phone, "🚗 Usage: *VEHICLE Hyundai Creta 2025, ₹10.5L onwards, sunroof, ADAS, 18km/l*"); return; }
        await wa.sendText(phone, `🚗 Creating showcase for *${vehicle}*...`);
        try {
          const prompt = buildVehicleShowcasePrompt(vehicle, price, features, language);
          const result = await chat({ messages: [{ role: "user", content: prompt }], json: true, maxTokens: 1800 });
          const v = JSON.parse(result.text);
          await sendSafe(phone, `🚗 *Reel Script:*\n${v.reel_script}\n\n📝 *Caption:*\n${v.caption}`);
          await sendSafe(phone, `📱 *Stories:*\n${(v.story_set as string[]).map((s: string, i: number) => `${i+1}. ${s}`).join("\n")}\n\n📢 *Broadcast:*\n${v.broadcast}`);
        } catch { await wa.sendText(phone, "⚠️ Try: VEHICLE Maruti Suzuki Brezza, ₹8.3L, sunroof, 17km/l, 5-star safety"); }
        await this.sendWorkspaceMenu(phone, workspace.type as WorkspaceType);
        return;
      }

      if (cmd.startsWith("SERVICECENTER ")) {
        const rest = rawText.slice(14).trim();
        const commaSep = rest.indexOf(",");
        const serviceType = commaSep > 0 ? rest.slice(0, commaSep).trim() : rest;
        const offer = commaSep > 0 ? rest.slice(commaSep + 1).trim() : "[SPECIFY: current offer]";
        if (!serviceType) { await wa.sendText(phone, "🔧 Usage: *SERVICECENTER AC check + coolant top-up, free this month with any service*"); return; }
        await wa.sendText(phone, `🔧 Creating service center promo for *${serviceType}*...`);
        try {
          const prompt = buildServiceCenterPrompt(serviceType, offer, language);
          const result = await chat({ messages: [{ role: "user", content: prompt }], json: true });
          const sc = JSON.parse(result.text);
          await sendSafe(phone, `🔧 *Reel Script:*\n${sc.reel_script}\n\n📝 *Caption:*\n${sc.caption}`);
          await sendSafe(phone, `📱 *Stories:*\n${(sc.story_set as string[]).map((s: string, i: number) => `${i+1}. ${s}`).join("\n")}\n\n📢 *Broadcast:*\n${sc.broadcast}`);
        } catch { await wa.sendText(phone, "⚠️ Try: SERVICECENTER Free car wash with any repair, valid this week"); }
        await this.sendWorkspaceMenu(phone, workspace.type as WorkspaceType);
        return;
      }

      // ── PHOTOGRAPHY commands ─────────────────────────────────────────────────────

      if (cmd.startsWith("PORTFOLIO ") || (cmd === "PORTFOLIO" && workspace.type === "PHOTOGRAPHY")) {
        const shootType = rawText.startsWith("PORTFOLIO ") ? rawText.slice(10).trim() : "portrait photography";
        if (!shootType) { await wa.sendText(phone, "📸 Usage: *PORTFOLIO Wedding photography — candid moments*"); return; }
        await wa.sendText(phone, `📸 Creating portfolio showcase for *${shootType}*...`);
        try {
          const prompt = buildPhotographyPortfolioPrompt(shootType, language);
          const result = await chat({ messages: [{ role: "user", content: prompt }], json: true });
          const pf = JSON.parse(result.text);
          await sendSafe(phone, `📸 *Reel Script:*\n${pf.reel_script}\n\n📝 *Caption:*\n${pf.caption}`);
          await sendSafe(phone, `📱 *Stories:*\n${(pf.story_set as string[]).map((s: string, i: number) => `${i+1}. ${s}`).join("\n")}\n\n📢 *Broadcast:*\n${pf.broadcast}`);
        } catch { await wa.sendText(phone, "⚠️ Try: PORTFOLIO maternity photography — glowing mamas"); }
        await this.sendWorkspaceMenu(phone, workspace.type as WorkspaceType);
        return;
      }

      if (cmd.startsWith("PHOTOBOOKING ")) {
        const rest = rawText.slice(13).trim();
        const commaSep = rest.indexOf(",");
        const availability = commaSep > 0 ? rest.slice(0, commaSep).trim() : rest;
        const packages = commaSep > 0 ? rest.slice(commaSep + 1).trim() : "[SPECIFY: packages]";
        if (!availability) { await wa.sendText(phone, "📅 Usage: *PHOTOBOOKING December weekends open, packages from ₹15,000*"); return; }
        await wa.sendText(phone, "📅 Creating booking promo...");
        try {
          const prompt = buildPhotographyBookingPrompt(availability, packages, language);
          const result = await chat({ messages: [{ role: "user", content: prompt }], json: true });
          const pb = JSON.parse(result.text);
          await sendSafe(phone, `📅 *Reel:*\n${pb.reel_script}\n\n📝 *Caption:*\n${pb.caption}`);
          await sendSafe(phone, `📱 *Stories:*\n${(pb.story_set as string[]).map((s: string, i: number) => `${i+1}. ${s}`).join("\n")}\n\n📢 *Broadcast:*\n${pb.broadcast}`);
        } catch { await wa.sendText(phone, "⚠️ Try: PHOTOBOOKING January slots available, wedding and maternity packages"); }
        await this.sendWorkspaceMenu(phone, workspace.type as WorkspaceType);
        return;
      }

      // ── INTERIOR DESIGN commands ─────────────────────────────────────────────────

      if (cmd.startsWith("PROJECT ") && workspace.type === "INTERIOR_DESIGN") {
        const rest = rawText.slice(8).trim();
        const parts = rest.split(",").map((p: string) => p.trim());
        const spaceType = parts[0] || rest;
        const designStyle = parts[1] || "[SPECIFY: design style]";
        if (!spaceType) { await wa.sendText(phone, "🛋️ Usage: *PROJECT 3BHK apartment, Japandi minimal style, transformed from builder-grade to magazine-worthy*"); return; }
        await wa.sendText(phone, `🛋️ Creating project showcase for *${spaceType}*...`);
        try {
          const prompt = buildInteriorProjectPrompt(spaceType, designStyle, language);
          const result = await chat({ messages: [{ role: "user", content: prompt }], json: true, maxTokens: 1800 });
          const p = JSON.parse(result.text);
          await sendSafe(phone, `🛋️ *Reel Script:*\n${p.reel_script}\n\n📝 *Caption:*\n${p.caption}`);
          await sendSafe(phone, `📱 *Stories:*\n${(p.story_set as string[]).map((s: string, i: number) => `${i+1}. ${s}`).join("\n")}\n\n📢 *Broadcast:*\n${p.broadcast}`);
        } catch { await wa.sendText(phone, "⚠️ Try: PROJECT Villa master bedroom, luxury contemporary, complete redesign"); }
        await this.sendWorkspaceMenu(phone, workspace.type as WorkspaceType);
        return;
      }

      if (cmd.startsWith("INTERIORPORTFOLIO ")) {
        const designStyle = rawText.slice(18).trim();
        if (!designStyle) { await wa.sendText(phone, "🏠 Usage: *INTERIORPORTFOLIO Contemporary Indian fusion — modern spaces with traditional craft*"); return; }
        await wa.sendText(phone, `🏠 Creating portfolio content for *${designStyle}*...`);
        try {
          const prompt = buildInteriorPortfolioPrompt(designStyle, language);
          const result = await chat({ messages: [{ role: "user", content: prompt }], json: true });
          const ip = JSON.parse(result.text);
          await sendSafe(phone, `🏠 *Reel Script:*\n${ip.reel_script}\n\n📝 *Caption:*\n${ip.caption}`);
          await sendSafe(phone, `📱 *Stories:*\n${(ip.story_set as string[]).map((s: string, i: number) => `${i+1}. ${s}`).join("\n")}\n\n📢 *Broadcast:*\n${ip.broadcast}`);
        } catch { await wa.sendText(phone, "⚠️ Try: INTERIORPORTFOLIO Minimalist luxury — less is more in every space"); }
        await this.sendWorkspaceMenu(phone, workspace.type as WorkspaceType);
        return;
      }

      // ── HOTEL commands ───────────────────────────────────────────────────────────

      if (cmd.startsWith("HOTELPACKAGE ")) {
        const rest = rawText.slice(13).trim();
        const parts = rest.split(",").map((p: string) => p.trim());
        const packageName = parts[0] || rest;
        const nights = parts[1] || "[SPECIFY: nights]";
        const price = parts[2] || "[SPECIFY: price]";
        if (!packageName) { await wa.sendText(phone, "🏨 Usage: *HOTELPACKAGE Monsoon Escape, 2 nights breakfast + spa, ₹8,999 per couple*"); return; }
        await wa.sendText(phone, `🏨 Creating package promo for *${packageName}*...`);
        try {
          const prompt = buildHotelPackagePrompt(packageName, nights, price, language);
          const result = await chat({ messages: [{ role: "user", content: prompt }], json: true, maxTokens: 1800 });
          const hp = JSON.parse(result.text);
          await sendSafe(phone, `🏨 *Reel Script:*\n${hp.reel_script}\n\n📝 *Caption:*\n${hp.caption}`);
          await sendSafe(phone, `📱 *Stories:*\n${(hp.story_set as string[]).map((s: string, i: number) => `${i+1}. ${s}`).join("\n")}\n\n📢 *Broadcast:*\n${hp.broadcast}`);
        } catch { await wa.sendText(phone, "⚠️ Try: HOTELPACKAGE Couple Retreat, 2 nights, breakfast + candlelight dinner, ₹12,500"); }
        await this.sendWorkspaceMenu(phone, workspace.type as WorkspaceType);
        return;
      }

      if (cmd.startsWith("HOTELREVIEW ")) {
        const rest = rawText.slice(12).trim();
        const commaSep = rest.indexOf(",");
        const guestName = commaSep > 0 ? rest.slice(0, commaSep).trim() : rest;
        const experience = commaSep > 0 ? rest.slice(commaSep + 1).trim() : "[SPECIFY: what they loved]";
        if (!guestName) { await wa.sendText(phone, "⭐ Usage: *HOTELREVIEW Priya & Rahul, celebrated anniversary, loved rooftop dinner and sunrise view*"); return; }
        await wa.sendText(phone, `⭐ Creating guest review content for *${guestName}*...`);
        try {
          const prompt = buildHotelReviewPrompt(guestName, experience, language);
          const result = await chat({ messages: [{ role: "user", content: prompt }], json: true });
          const hr = JSON.parse(result.text);
          await sendSafe(phone, `⭐ *Reel Script:*\n${hr.reel_script}\n\n📝 *Caption:*\n${hr.caption}`);
          await sendSafe(phone, `📱 *Stories:*\n${(hr.story_set as string[]).map((s: string, i: number) => `${i+1}. ${s}`).join("\n")}\n\n📢 *Broadcast:*\n${hr.broadcast}`);
        } catch { await wa.sendText(phone, "⚠️ Try: HOTELREVIEW Ananya & Karan, honeymoon stay, loved pool villa and private breakfast"); }
        await this.sendWorkspaceMenu(phone, workspace.type as WorkspaceType);
        return;
      }

      // ── JEWELRY commands ─────────────────────────────────────────────────────────

      if (cmd.startsWith("COLLECTION ") && workspace.type === "JEWELRY") {
        const rest = rawText.slice(11).trim();
        const commaSep = rest.lastIndexOf(",");
        const collectionName = commaSep > 0 ? rest.slice(0, commaSep).trim() : rest;
        const priceRange = commaSep > 0 ? rest.slice(commaSep + 1).trim() : "[SPECIFY: price range]";
        if (!collectionName) { await wa.sendText(phone, "💍 Usage: *COLLECTION Eternal Love Collection, engagement rings ₹25,000–₹2,50,000*"); return; }
        await wa.sendText(phone, `💍 Creating collection launch content for *${collectionName}*...`);
        try {
          const prompt = buildJewelryCollectionPrompt(collectionName, priceRange, language);
          const result = await chat({ messages: [{ role: "user", content: prompt }], json: true, maxTokens: 1800 });
          const jc = JSON.parse(result.text);
          await sendSafe(phone, `💍 *Reel Script:*\n${jc.reel_script}\n\n📝 *Caption:*\n${jc.caption}`);
          await sendSafe(phone, `📱 *Stories:*\n${(jc.story_set as string[]).map((s: string, i: number) => `${i+1}. ${s}`).join("\n")}\n\n📢 *Broadcast:*\n${jc.broadcast}`);
        } catch { await wa.sendText(phone, "⚠️ Try: COLLECTION Heritage Kundan Collection, necklace sets ₹18,000–₹85,000"); }
        await this.sendWorkspaceMenu(phone, workspace.type as WorkspaceType);
        return;
      }

      if (cmd.startsWith("CUSTOMJEWELRY ")) {
        const pieceDetails = rawText.slice(14).trim();
        if (!pieceDetails) { await wa.sendText(phone, "✨ Usage: *CUSTOMJEWELRY Custom gold mangalsutra redesigned for bride, incorporated grandmother's old chain*"); return; }
        await wa.sendText(phone, "✨ Creating custom jewelry content...");
        try {
          const prompt = buildJewelryCustomPrompt(pieceDetails, language);
          const result = await chat({ messages: [{ role: "user", content: prompt }], json: true });
          const cj = JSON.parse(result.text);
          await sendSafe(phone, `✨ *Reel Script:*\n${cj.reel_script}\n\n📝 *Caption:*\n${cj.caption}`);
          await sendSafe(phone, `📱 *Stories:*\n${(cj.story_set as string[]).map((s: string, i: number) => `${i+1}. ${s}`).join("\n")}\n\n📢 *Broadcast:*\n${cj.broadcast}`);
        } catch { await wa.sendText(phone, "⚠️ Try: CUSTOMJEWELRY Diamond solitaire ring designed for proposal, 0.5ct, yellow gold"); }
        await this.sendWorkspaceMenu(phone, workspace.type as WorkspaceType);
        return;
      }

      // Language toggle: HINDI / TAMIL / ARABIC / ENGLISH / INDONESIAN etc.
      const LANG_MAP: Record<string, string> = {
        "HINDI": "Hindi", "TAMIL": "Tamil", "ARABIC": "Arabic",
        "TELUGU": "Telugu", "MARATHI": "Marathi", "BENGALI": "Bengali",
        "PORTUGUESE": "Portuguese", "SPANISH": "Spanish", "FRENCH": "French",
        "INDONESIAN": "Indonesian", "BAHASA": "Indonesian",
        "ENGLISH": "English",
      };
      if (LANG_MAP[cmd]) {
        const lang = LANG_MAP[cmd];
        await prisma.user.update({ where: { id: user.id }, data: { language: lang } as any });
        await wa.sendText(phone, `🌍 Language set to *${lang}*! All future content will be generated in ${lang}.\n\nType *ENGLISH* to switch back anytime.`);
        return;
      }

      // STATS — show account stats
      if (cmd === "STATS" || cmd === "STATUS") {
        const stats = await prisma.generatedContent.groupBy({
          by: ["jobStatus"],
          where: { userId: user.id },
          _count: true,
        });
        const completed = stats.find(s => s.jobStatus === "COMPLETED")?._count || 0;
        const quota = user.videoQuota === -1 ? "Unlimited" : `${completed}/${user.videoQuota}`;
        const tier = user.subscriptionTier || "FREE";
        const webUrl = process.env.NEXT_PUBLIC_WEB_URL || "https://myna.app";
        await wa.sendText(
          phone,
          `📊 *Your Account Stats:*\n\n` +
          `🎬 Videos created: ${completed}\n` +
          `📦 Plan: ${tier}\n` +
          `🎯 Usage this month: ${quota}\n` +
          `💳 Renews: ${user.subscriptionValidUntil ? new Date(user.subscriptionValidUntil).toLocaleDateString("en-IN", { day: "numeric", month: "long" }) : "N/A"}\n\n` +
          (tier === "FREE" ? `⭐ Upgrade to Growth for 30 videos/month → ${webUrl}/pricing` : `✅ Thank you for being a ${tier} member!`)
        );
        return;
      }

      // Workspace-specific shortcuts (SPECIAL, RECIPE, SOLD, LISTED, etc.)
      const quickActions = WORKSPACE_QUICK_ACTIONS[workspace.type as string] || {};
      const matchedAction = Object.entries(quickActions).find(([key]) => cmd === key || cmd === key.toLowerCase());
      if (matchedAction) {
        const webUrl = process.env.NEXT_PUBLIC_WEB_URL || "https://myna.app";
        const quota = await checkUserQuota(user.id, webUrl);
        if (!quota.allowed) return;
        const [, action] = matchedAction;
        await wa.sendText(phone, `✨ Creating: *${action.label}*...\n\n⏳ Preview in ~15 seconds`);
        await this.setContext(phone, { flow: "AWAITING_GENERATION", data: { inputType: "text", prompt: action.prompt, contentType: action.contentType, audioType: "BACKGROUND_MUSIC" } });
        await videoQueue.add("generate-video", {
          phone, userId: user.id, workspaceType: workspace.type,
          inputType: "text", prompt: action.prompt, contentType: action.contentType, audioType: "BACKGROUND_MUSIC",
        }, { attempts: 3, backoff: { type: "exponential", delay: 5000 } });
        return;
      }

      const inputType = this.detectInputType(message);
      // Caption-awaiting mode: next image goes to caption-only
      if (ctx.flow === "AWAITING_CAPTION" && inputType === "image") {
        const mediaId = message.image?.id;
        await this.setContext(phone, { flow: "IDLE", data: {} });
        await aiQueue.add("caption-only", { phone, userId: user.id, mediaId, workspaceType: workspace.type }, { priority: 1 });
        await wa.sendText(phone, "✍️ Writing your caption...");
        return;
      }
      if (ctx.flow === "AWAITING_CAPTION" && inputType === "text") {
        const description = rawText;
        await this.setContext(phone, { flow: "IDLE", data: {} });
        const prompt = buildCaptionOnlyPrompt(description, workspace.type);
        try {
          const result = await chat({ messages: [{ role: "user", content: prompt }], json: true });
          const parsed = JSON.parse(result.text);
          await sendSafe(phone,
            `📝 *Caption:*\n${parsed.caption}\n\n` +
            `📢 *CTA:* ${parsed.cta}\n\n` +
            `#️⃣ ${parsed.hashtags.map((h: string) => `#${h}`).join(" ")}`
          );
        } catch {
          await wa.sendText(phone, "⚠️ Couldn't generate caption. Try again!");
        }
        return;
      }

      // No recognised media type and no exact command match
      // → hand off to agent for natural language understanding
      if (!inputType) {
        if (rawText) {
          const language = (user as any).language || "English";
          const action = await processWithAgent(rawText, user.id, workspace.type, language);
          if (action.type === "COMMAND" && action.command) {
            // Agent understood the intent — re-process as if user typed the command
            message = { ...message, text: { body: action.command } };
            await this.handleMainFlow(phone, user, message, ctx);
          } else {
            // Agent responded conversationally — show menu after so user knows what to do next
            await sendSafe(phone, action.response || "Send me a photo or video and I'll create content for you 🚀");
            await this.sendWorkspaceMenu(phone, workspace.type as WorkspaceType);
          }
        } else {
          await this.sendWorkspaceMenu(phone, workspace.type as WorkspaceType);
        }
        return;
      }

      // Handle website URL
      if (inputType === "url") {
        const url = this.extractUrl(message.text?.body);
        await this.setContext(phone, { flow: "CONTENT_TYPE_SELECT", data: { inputType: "url", sourceUrl: url } });
        await wa.sendButtons(phone, `🌐 Great! I'll analyze *${url}*\n\nWhat do you want to generate?`,
          [{ id: "ws_matrix", title: "📊 Content Matrix" }, { id: "ct_reel", title: "🎬 Viral Reel" }, { id: "ct_offer", title: "📢 Post" }],
          "Website Detected"
        );
        return;
      }

      // Handle media (image/video) — moderate → check relevance → branding → generate
      if (inputType === "image" || inputType === "video") {
        const mediaId = message.image?.id || message.video?.id;
        const caption = message.image?.caption || message.video?.caption || "";
        const intent = this.detectTextIntent(caption);

        // Moderation: download + check image (or extract first frame for video)
        await wa.sendText(phone, "🔍 Checking content...");
        let rawImageBuffer: Buffer | null = null;
        try {
          const mediaUrl = await this.getWhatsAppMediaUrl(mediaId!);
          if (mediaUrl) {
            const { default: axios } = await import("axios");
            const resp = await axios.get(mediaUrl, {
              responseType: "arraybuffer",
              headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}` },
            });

            // Capture image bytes for potential photo enhancement
            if (inputType === "image") rawImageBuffer = Buffer.from(resp.data);

            let base64: string;
            let mimeType = "image/jpeg";

            if (inputType === "video") {
              // Write video to temp file, extract first frame for vision moderation
              const { promises: fsp } = await import("fs");
              const os = await import("os");
              const path = await import("path");
              const tmpVideo = path.join(os.tmpdir(), `mod_video_${Date.now()}.mp4`);
              await fsp.writeFile(tmpVideo, Buffer.from(resp.data));
              const framePath = await extractFirstFrame(tmpVideo);
              await fsp.unlink(tmpVideo).catch(() => {});
              if (framePath) {
                base64 = (await fsp.readFile(framePath)).toString("base64");
                await fsp.unlink(framePath).catch(() => {});
              } else {
                // Frame extraction failed — use raw video bytes (Gemini handles video natively)
                base64 = Buffer.from(resp.data).toString("base64");
                mimeType = "video/mp4";
              }
            } else {
              base64 = Buffer.from(resp.data).toString("base64");
            }

            const modResult = await moderateImage(base64, mimeType);
            if (!modResult.safe) {
              await wa.sendText(phone, getModerationMessage(modResult));
              return;
            }

            // Relevance check: does this image match the workspace?
            const description = await describeImage(base64).catch(() => "");
            if (description) {
              const rel = checkRelevance(workspace.type, description);
              if (!rel.relevant && rel.confidence === "high") {
                await wa.sendButtons(
                  phone,
                  `⚠️ ${rel.suggestion || "This content doesn't seem to match your workspace."}\n\nDo you want to continue anyway?`,
                  [
                    { id: "relevance_continue", title: "✅ Continue Anyway" },
                    { id: "relevance_cancel", title: "❌ Cancel" },
                  ],
                  "Content Check"
                );
                await this.setContext(phone, { flow: "AWAITING_RELEVANCE_CONFIRM", data: { inputType, mediaId, contentType: intent.contentType, audioType: intent.audioType } });
                return;
              }
            }
          }
        } catch {
          // Moderation failed — allow through, log warning
          logger.warn("Media moderation error — allowing through", { mediaId });
        }

        // ── KIT from image: photo sent with "KIT [details]" as caption ─────────
        if (inputType === "image" && /^KIT\s+/i.test(caption) && rawImageBuffer) {
          const kitDetails = caption.replace(/^KIT\s+/i, "").trim();
          if (kitDetails) {
            const webUrl = process.env.NEXT_PUBLIC_WEB_URL || "https://myna.app";
            const quota = await checkUserQuota(user.id, webUrl);
            if (!quota.allowed) return;
            await wa.sendText(phone,
              `📦 Generating your *complete content kit* in ${language}...\n\n` +
              `✨ Enhancing photo + building:\nreel script · caption · 30 hashtags · story set · broadcast · DM · LinkedIn · listing description\n\n⏳ About 25 seconds.`
            );

            // Enhance and send the photo back in parallel with kit generation
            const photoPromise = (async () => {
              try {
                const enhanced = await enhancePhotoWithOverlay(rawImageBuffer!, kitDetails.slice(0, 45), workspace.type);
                const os = await import("os");
                const path = await import("path");
                const { promises: fsp } = await import("fs");
                const tmpPath = path.join(os.tmpdir(), `myna_enhanced_${Date.now()}.jpg`);
                await fsp.writeFile(tmpPath, enhanced);
                const uploadedId = await wa.uploadMedia(tmpPath, "image/jpeg");
                await fsp.unlink(tmpPath).catch(() => {});
                const { default: axiosLib } = await import("axios");
                await axiosLib.post(
                  `https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
                  { messaging_product: "whatsapp", to: phone, type: "image", image: { id: uploadedId, caption: "✨ *Enhanced by Myna* — ready to post" } },
                  { headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`, "Content-Type": "application/json" } }
                );
              } catch (err) {
                logger.warn("Photo enhancement failed — continuing with text kit", { err: (err as Error).message });
              }
            })();

            const kitPromise = (async () => {
              try {
                const prompt = buildContentKitPrompt(kitDetails, workspace.type, language);
                const result = await chat({ messages: [{ role: "user", content: prompt }], json: true, maxTokens: 3500 });
                const kit = JSON.parse(result.text);
                await sendSafe(phone, `🎬 *Reel Script:*\n\n🪝 Hook: ${kit.hook}\n\n${kit.reel_script}`);
                await sendSafe(phone,
                  `📝 *Instagram Caption:*\n${kit.caption}\n\n` +
                  `#️⃣ *Hashtags (${(kit.hashtags as string[]).length}):*\n${(kit.hashtags as string[]).map((h: string) => h.startsWith("#") ? h : `#${h}`).join(" ")}`
                );
                await sendSafe(phone, `📱 *Story Set (5 slides):*\n${(kit.story_set as string[]).map((s: string, i: number) => `${i + 1}. ${s}`).join("\n")}`);
                await sendSafe(phone, `📢 *WhatsApp Broadcast:*\n${kit.broadcast}\n\n💬 *DM Reply Script:*\n${kit.dm_script}`);
                if (kit.linkedin_post) await sendSafe(phone, `💼 *LinkedIn Post:*\n${kit.linkedin_post}`);
                if (kit.listing_description) await sendSafe(phone, `📋 *Listing / Portal Description:*\n\n${kit.listing_description}`);
                if (kit.photo_directions) await sendSafe(phone, `📸 *Photo Shot List:*\n\n${kit.photo_directions}`);
              } catch { await wa.sendText(phone, "⚠️ Kit generation failed. Try: send photo with caption 'KIT [your key details]'"); }
            })();

            await Promise.allSettled([photoPromise, kitPromise]);
            await wa.sendText(phone, `✅ *Your full kit is ready!*\n\nSend another photo or video to create the reel 🎬`);
            await recordGeneration(user.id).catch(() => {});
            await this.sendWorkspaceMenu(phone, workspace.type as WorkspaceType);
            return;
          }
        }

        // Branding check for business workspaces
        const brandingResult = await this.checkAndPromptBranding(phone, user, workspace, { inputType, mediaId, contentType: intent.contentType, audioType: intent.audioType });
        if (brandingResult === "prompted") return; // waiting for branding response
        return;
      }

      // Handle text prompt — moderate → branding → generate
      if (inputType === "text") {
        const text = rawText;

        // Text moderation
        const modResult = await moderateText(text);
        if (!modResult.safe) {
          await wa.sendText(phone, getModerationMessage(modResult));
          return;
        }

        const intent = this.detectTextIntent(text);
        const brandingResult = await this.checkAndPromptBranding(phone, user, workspace, { inputType: "text", prompt: text, contentType: intent.contentType, audioType: intent.audioType });
        if (brandingResult === "prompted") return;
        return;
      }

      // Handle voice note
      if (inputType === "audio") {
        const audioId = message.audio?.id;
        await this.setContext(phone, { flow: "AUDIO_SELECT", data: { inputType: "audio", audioId, audioType: "USER_VOICE" } });
        await wa.sendText(phone, "🎤 Received your voice note! Transcribing...");
        await aiQueue.add("transcribe", { phone, audioId }, { priority: 1 });
        return;
      }
    }

    // ── CONTENT_TYPE_SELECT ────────────────────────────────────────────────
    if (flow === "CONTENT_TYPE_SELECT" && buttonId) {
      if (buttonId === "ws_matrix") {
        // Trigger website content matrix
        const { sourceUrl } = ctx.data;
        await wa.sendText(phone, `🔍 Analyzing ${sourceUrl}... This takes ~60 seconds.\n\nI'll generate:\n• 10 Reels\n• 20 Posts\n• 30-day content plan`);
        await this.setContext(phone, { flow: "AWAITING_GENERATION", data: ctx.data });
        await scrapingQueue.add("scrape-website", { phone, userId: user.id, url: sourceUrl, workspaceType: workspace.type });
        return;
      }

      const contentTypeMap: Record<string, string> = {
        ct_reel: "REEL", ct_menu: "POST", ct_offer: "POST", ct_listing: "POST",
      };
      const contentType = contentTypeMap[buttonId] || "POST";

      await this.setContext(phone, { flow: "AUDIO_SELECT", data: { ...ctx.data, contentType } });
      await wa.sendButtons(phone,
        "🎵 Do you want audio in your video?",
        [
          { id: "audio_music", title: "🎵 Background Music" },
          { id: "audio_ai", title: "🤖 AI Voiceover" },
          { id: "audio_none", title: "🚫 No Audio" },
        ],
        "Audio Options"
      );
      return;
    }

    // ── AUDIO_SELECT ───────────────────────────────────────────────────────
    if (flow === "AUDIO_SELECT" && buttonId) {
      const webUrl = process.env.NEXT_PUBLIC_WEB_URL || "https://myna.app";
      const quota = await checkUserQuota(user.id, webUrl);
      if (!quota.allowed) {
        await this.setContext(phone, { flow: "IDLE", data: {} });
        return;
      }

      const audioTypeMap: Record<string, string> = {
        audio_music: "BACKGROUND_MUSIC",
        audio_ai: "AI_VOICEOVER",
        audio_none: "NONE",
      };
      const audioType = audioTypeMap[buttonId] || "NONE";
      await this.setContext(phone, { flow: "AWAITING_GENERATION", data: { ...ctx.data, audioType } });

      await wa.sendText(phone, "⚡ Generating your content... This takes 30–60 seconds.\n\nI'll send you a preview when it's ready!");

      // Dispatch to video generation queue
      await videoQueue.add("generate-video", {
        phone,
        userId: user.id,
        workspaceType: workspace.type,
        ...ctx.data,
        audioType,
      }, { attempts: 3, backoff: { type: "exponential", delay: 5000 } });
      return;
    }

    // ── PREVIEW ────────────────────────────────────────────────────────────
    if (flow === "PREVIEW" && buttonId) {
      // A/B hook pick
      if (ctx.data.awaitingHookPick && (buttonId === "hook_a" || buttonId === "hook_b")) {
        const variants = ctx.data.hookVariants as [string, string];
        const chosenHook = buttonId === "hook_a" ? variants[0] : variants[1];
        const { videoUrl, caption, contentId } = ctx.data;
        await wa.sendMedia(phone, "video", videoUrl, `🎬 *Here's your preview!*`);
        await wa.sendText(phone, `📝 *Caption:*\n${caption}\n\n🪝 *Hook:* ${chosenHook}`);
        await wa.sendButtons(phone,
          "How do you want to proceed?",
          [
            { id: "approve", title: "👍 Approve" },
            { id: "regenerate", title: "🔄 Regenerate" },
            { id: "change_style", title: "🎨 Change Style" },
          ],
          "Preview Ready ✨"
        );
        await this.setContext(phone, { flow: "PREVIEW", data: { ...ctx.data, awaitingHookPick: false, chosenHook } });
        return;
      }

      if (buttonId === "series_next") {
        const { seriesTopic, seriesPart, seriesTotalParts } = ctx.data;
        const nextPart = (seriesPart || 1) + 1;
        const prompt = buildSeriesPrompt(seriesTopic, nextPart, seriesTotalParts || 5, workspace.type);
        await wa.sendText(phone, `▶️ Generating *Part ${nextPart}/${seriesTotalParts}*...\n\n⏳ Preview in ~15 seconds`);
        await this.setContext(phone, { flow: "AWAITING_GENERATION", data: { ...ctx.data, seriesPart: nextPart, inputType: "text", prompt, contentType: "REEL", audioType: "BACKGROUND_MUSIC" } });
        await videoQueue.add("generate-video", {
          phone, userId: user.id, workspaceType: workspace.type,
          inputType: "text", prompt, contentType: "REEL", audioType: "BACKGROUND_MUSIC",
          seriesTopic, seriesPart: nextPart, seriesTotalParts,
        }, { attempts: 3, backoff: { type: "exponential", delay: 5000 } });
        return;
      }

      if (buttonId === "approve") {
        await this.setContext(phone, { flow: "POST_APPROVAL", data: ctx.data });
        await wa.sendButtons(phone, "🎉 Content approved! What next?",
          [
            { id: "post_now", title: "🚀 Post Now" },
            { id: "post_schedule", title: "⏰ Schedule" },
            { id: "post_download", title: "📥 Download" },
          ],
          "Publish Options"
        );
        // Agent follow-up: suggest what to do next based on what they just approved
        const approvedIntent = ctx.data.approvedIntent || ctx.data.contentType || "GENERAL";
        const language = (user as any).language || "English";
        generateFollowUpSuggestion(workspace.type, ctx.data.contentType, approvedIntent, language)
          .then(msg => wa.sendText(phone, msg))
          .catch(() => {});
        // Update memory
        updateAgentMemory(user.id, {
          recentIntents: [approvedIntent],
          lastContentAt: new Date().toISOString(),
          contentCreatedThisWeek: undefined,
        }).catch(() => {});
        return;
      }
      if (buttonId === "regenerate") {
        await wa.sendText(phone, "🔄 Regenerating with a different style...");
        await this.setContext(phone, { flow: "AWAITING_GENERATION", data: ctx.data });
        await videoQueue.add("generate-video", { phone, userId: user.id, ...ctx.data, iteration: (ctx.data.iteration || 1) + 1 }, { priority: 5 });
        return;
      }
      if (buttonId === "change_style") {
        await wa.sendList(phone, "🎨 Choose a visual style for your content:",
          "Pick Style",
          [{
            title: "Visual Styles",
            rows: [
              { id: "style_modern", title: "✨ Modern", description: "Clean subtitles, white border" },
              { id: "style_bold", title: "💥 Bold", description: "Yellow text, high contrast" },
              { id: "style_minimal", title: "🤍 Minimal", description: "Soft text, understated" },
              { id: "style_trendy", title: "🔥 Trendy", description: "Green glow, Gen Z vibes" },
              { id: "style_cinematic", title: "🎬 Cinematic", description: "Gold text, film feel" },
              { id: "style_neon", title: "💜 Neon", description: "Cyan glow, nightlife" },
              { id: "style_retro", title: "📼 Retro", description: "Orange, VHS nostalgia" },
              { id: "style_corporate", title: "💼 Corporate", description: "Navy border, professional" },
            ],
          }]
        );
        return;
      }
      if (buttonId?.startsWith("style_")) {
        const style = buttonId.replace("style_", "");
        await this.setContext(phone, { flow: "AWAITING_GENERATION", data: { ...ctx.data, style } });
        await videoQueue.add("generate-video", { phone, userId: user.id, ...ctx.data, style });
        await wa.sendText(phone, `🎨 Applying *${style}* style... Generating now!`);
        return;
      }
    }

    // ── POST_APPROVAL ──────────────────────────────────────────────────────
    if (flow === "POST_APPROVAL" && buttonId) {
      const { contentId } = ctx.data;
      if (buttonId === "post_now") {
        const PLATFORM_EMOJI: Record<string, string> = {
          INSTAGRAM: "📸", FACEBOOK: "📘", TIKTOK: "🎵",
          YOUTUBE: "▶️", LINKEDIN: "💼", TWITTER: "🐦",
        };
        const accounts = await prisma.socialAccount.findMany({
          where: { userId: user.id, isActive: true },
          take: 10,
        });
        if (!accounts.length) {
          const webUrl = process.env.NEXT_PUBLIC_WEB_URL || "https://myna.app";
          await wa.sendText(phone, `📱 *No social accounts connected yet.*\n\nConnect Instagram, Facebook, TikTok, YouTube or LinkedIn in your dashboard:\n👉 ${webUrl}/connect\n\nOr tap 📥 Download to save the video to your phone.`);
        } else if (accounts.length === 1) {
          const account = accounts[0];
          await postingQueue.add("post-content", {
            userId: user.id,
            contentId: ctx.data.contentId,
            platform: account.platform,
            accountId: account.id,
          }, { priority: 1 });
          await wa.sendText(phone, `🚀 Posting to *${account.platform}* (@${(account as any).accountName || account.platform})...\n\nI'll notify you when it's live.`);
          await this.setContext(phone, { flow: "IDLE", data: {} });
          await this.sendWorkspaceMenu(phone, workspace.type as WorkspaceType);
        } else if (accounts.length <= 3) {
          // 2–3 accounts: use buttons
          const buttons = accounts.map(a => ({
            id: `platform_post_${a.id}`,
            title: `${PLATFORM_EMOJI[a.platform] || "📤"} ${a.platform}`,
          }));
          await wa.sendButtons(phone, `📲 Which platform do you want to post to?`, buttons, "Choose Platform");
          await this.setContext(phone, { flow: "AWAITING_PLATFORM", data: ctx.data });
        } else {
          // 4+ accounts: use list so all platforms are visible
          const rows = accounts.map(a => ({
            id: `platform_post_${a.id}`,
            title: `${PLATFORM_EMOJI[a.platform] || "📤"} ${a.platform}`,
            description: `@${(a as any).accountName || a.platform}`,
          }));
          await wa.sendList(phone, "📲 Which platform do you want to post to?", "Choose platform", [{ title: "Your connected accounts", rows }]);
          await this.setContext(phone, { flow: "AWAITING_PLATFORM", data: ctx.data });
        }
      }
      if (buttonId === "post_schedule") {
        await wa.sendText(phone, "⏰ Scheduling feature: reply with your desired time (e.g. *Tomorrow 9am*)");
      }
      if (buttonId === "post_download") {
        const content = await prisma.generatedContent.findUnique({ where: { id: contentId } });
        if (content?.videoUrl) {
          await wa.sendMedia(phone, "video", content.videoUrl, content.caption || "Your content is ready! 🎉");
        }
        await this.setContext(phone, { flow: "IDLE", data: {} });
        await this.sendWorkspaceMenu(phone, workspace.type as WorkspaceType);
      }
      if (buttonId === "create_more") {
        await this.sendWorkspaceMenu(phone, workspace.type as WorkspaceType);
      }
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  // ─── Dispatch video job (shared entry point) ──────────────────────────────

  private async dispatchVideoJob(phone: string, user: any, workspace: any, jobData: Record<string, any>) {
    const label = jobData.contentType === "REEL" ? "viral reel" : jobData.contentType === "STORY" ? "status" : "post";
    const audioLabel = jobData.audioType === "BACKGROUND_MUSIC" ? "with background music" : jobData.audioType === "AI_VOICEOVER" ? "with AI voiceover" : "";
    const language = (user as any).language || "English";
    await this.setContext(phone, { flow: "AWAITING_GENERATION", data: jobData });
    await wa.sendText(phone, `✨ Generating your ${label} ${audioLabel}...\n\n⏳ Preview in ~15 seconds`);
    await videoQueue.add("generate-video", { phone, userId: user.id, workspaceType: workspace.type, language, ...jobData },
      { attempts: 3, backoff: { type: "exponential", delay: 5000 } }
    );
  }

  // ─── Branding check: ask business users if they want logo/details added ──────

  private readonly PERSONAL_WORKSPACES = new Set(["PERSONAL"]);

  private async checkAndPromptBranding(
    phone: string, user: any, workspace: any, jobData: Record<string, any>
  ): Promise<"prompted" | "dispatched"> {
    // Personal workspace — no branding needed
    if (this.PERSONAL_WORKSPACES.has(workspace.type)) {
      await this.dispatchVideoJob(phone, user, workspace, jobData);
      return "dispatched";
    }

    const brand = workspace.brandProfile as any || {};

    // Brand already fully set up → auto-apply silently
    if (brand.businessName && (brand.logoUrl || brand.watermarkText)) {
      await this.dispatchVideoJob(phone, user, workspace, {
        ...jobData,
        brandName: brand.businessName,
        brandTagline: brand.tagline || "",
        brandColor: brand.primaryColor || "#ffffff",
        watermarkText: brand.watermarkText || brand.businessName,
        logoUrl: brand.logoUrl || null,
      });
      return "dispatched";
    }

    // No branding set up — ask once per session (use context to avoid repeat prompts)
    await wa.sendButtons(
      phone,
      `🏷️ Do you want to add your *business name/logo* to this content?\n\n` +
      `• Your brand name and contact will appear on the video\n` +
      `• You can set up a permanent brand kit in your dashboard`,
      [
        { id: "brand_yes", title: "✅ Add Branding" },
        { id: "brand_no", title: "📹 No Branding" },
        { id: "brand_setup", title: "⚙️ Set Up Brand Kit" },
      ],
      "Add Your Branding?"
    );
    await this.setContext(phone, { flow: "AWAITING_BRANDING", data: jobData });
    return "prompted";
  }

  // ─── Resolve media URL from WhatsApp ─────────────────────────────────────

  private async getWhatsAppMediaUrl(mediaId: string): Promise<string | null> {
    try {
      const { default: axios } = await import("axios");
      const res = await axios.get(`https://graph.facebook.com/v19.0/${mediaId}`, {
        headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}` },
      });
      return res.data?.url || null;
    } catch {
      return null;
    }
  }

  // ─── Workspace menu ────────────────────────────────────────────────────────

  private async sendWorkspaceMenu(phone: string, workspaceType: WorkspaceType) {
    // Per-category: 2 primary buttons + "More" — only what that workspace actually needs.
    // No generic tools mixed in. Users can describe what they want in plain text anytime.
    type MenuConfig = {
      body: string;
      b1: { id: string; title: string };
      b2: { id: string; title: string };
      more: Array<{ id: string; title: string; description: string }>;
    };

    const MENU: Record<string, MenuConfig> = {
      REAL_ESTATE: {
        body: "Got a new listing? Just sold? Send me a photo or pick below 👇",
        b1: { id: "guide_property",  title: "🏠 New Listing" },
        b2: { id: "guide_sold",      title: "🏆 Just Sold" },
        more: [
          { id: "guide_openhouse",    title: "🚪 Open House",          description: "Announcement + story countdown" },
          { id: "guide_testimonial",  title: "⭐ Client Testimonial",  description: "Quote card + reel + stories" },
          { id: "guide_renovation",   title: "🔨 Before / After",      description: "Renovation reveal reel + carousel" },
          { id: "guide_neighborhood", title: "🗺️ Neighborhood Guide",  description: "Lifestyle post for any area" },
        ],
      },
      RESTAURANT: {
        body: "Send a dish photo or pick what to promote today 👇",
        b1: { id: "guide_dish",  title: "🍽️ Feature a Dish" },
        b2: { id: "guide_offer", title: "🔥 Today's Offer" },
        more: [
          { id: "guide_opening",  title: "🎉 Grand Opening",    description: "7-day launch campaign" },
          { id: "guide_catering", title: "🍱 Catering Promo",   description: "Promote catering services" },
          { id: "guide_delivery", title: "🛵 Delivery Launch",  description: "Swiggy / Zomato promo" },
        ],
      },
      ECOMMERCE: {
        body: "Launching a product? Running a sale? Pick below or send a photo 👇",
        b1: { id: "guide_launch",  title: "🚀 Launch Product" },
        b2: { id: "guide_gifting", title: "🎁 Gift Guide" },
        more: [
          { id: "guide_compare",   title: "⚖️ Compare Products",  description: "Side-by-side comparison post" },
          { id: "guide_broadcast", title: "📣 Broadcast Sale",     description: "Announce a sale to customers" },
        ],
      },
      CREATOR: {
        body: "What are you creating today? Pick below or describe it 👇",
        b1: { id: "guide_viral",    title: "🔥 Viral Hook Ideas" },
        b2: { id: "guide_giveaway", title: "🎁 Giveaway" },
        more: [
          { id: "guide_challenge", title: "🏆 Start a Challenge",  description: "Community challenge launch" },
          { id: "guide_collab",    title: "🤝 Brand Collab",       description: "Paid collab announcement" },
          { id: "guide_qanda",     title: "❓ Q&A Session",        description: "Q&A reel + top questions" },
        ],
      },
      BUSINESS_SERVICES: {
        body: "Got a win to share or a service to promote? Pick below 👇",
        b1: { id: "guide_casestudy",  title: "📈 Case Study" },
        b2: { id: "guide_webinar",    title: "🎤 Webinar Promo" },
        more: [
          { id: "guide_testimonial", title: "⭐ Client Testimonial", description: "Quote card + reel + stories" },
          { id: "guide_process",     title: "⚙️ How We Work",        description: "Process explainer carousel" },
        ],
      },
      EVENTS: {
        body: "Selling tickets or announcing something? Pick below 👇",
        b1: { id: "guide_tickets",  title: "🎟️ Sell Tickets" },
        b2: { id: "guide_lineup",   title: "🎤 Lineup Reveal" },
        more: [
          { id: "guide_earlybird", title: "🐦 Early Bird Promo",    description: "Urgency post + countdown" },
          { id: "guide_venue",     title: "🏟️ Venue Reveal",         description: "Venue reveal reel + stories" },
          { id: "guide_sponsor",   title: "🤝 Sponsor Announcement", description: "Sponsor reveal reel" },
          { id: "guide_recap",     title: "🎉 Event Recap",          description: "Post-event thank you post" },
        ],
      },
      EDUCATION: {
        body: "Launching a course or filling seats for a class? Pick below 👇",
        b1: { id: "guide_course",    title: "🎓 Course Launch" },
        b2: { id: "guide_freeclass", title: "📚 Free Class Promo" },
        more: [
          { id: "guide_result",      title: "⭐ Student Result",      description: "Success story post" },
          { id: "guide_scholarship", title: "🏫 Scholarship",         description: "Scholarship announcement" },
          { id: "guide_challenge",   title: "🏆 Learning Challenge",  description: "30-day challenge launch" },
        ],
      },
      PERSONAL: {
        body: "Share a moment — send a photo or pick the occasion 👇",
        b1: { id: "guide_wedding",    title: "💍 Wedding" },
        b2: { id: "guide_graduation", title: "🎓 Graduation" },
        more: [
          { id: "guide_achievement", title: "🏅 Achievement",  description: "Celebration reel + stories" },
          { id: "guide_tribute",     title: "🕊️ Tribute",      description: "Heartfelt memorial post" },
        ],
      },
      FITNESS_GYM: {
        body: "Got a transformation story or class to fill? Pick below 👇",
        b1: { id: "guide_transformation", title: "💪 Transformation Story" },
        b2: { id: "guide_fitnessclass",   title: "🏋️ Class Promo" },
        more: [
          { id: "guide_kit",      title: "📦 Full Content Kit",  description: "Reel + caption + 30 hashtags + stories + broadcast" },
          { id: "guide_giveaway", title: "🎁 Giveaway",          description: "Membership giveaway post" },
          { id: "guide_broadcast", title: "📣 Broadcast",        description: "Send a promo to customers" },
        ],
      },
      SALON_SPA: {
        body: "Showcase a treatment or fill your booking slots? Pick below 👇",
        b1: { id: "guide_salonservice", title: "✨ Showcase Treatment" },
        b2: { id: "guide_salonbooking", title: "📅 Fill Bookings" },
        more: [
          { id: "guide_kit",        title: "📦 Full Content Kit",    description: "Reel + caption + 30 hashtags + stories + broadcast" },
          { id: "guide_testimonial", title: "⭐ Client Result",       description: "Before/after testimonial reel" },
          { id: "guide_broadcast",   title: "📣 Broadcast Offer",     description: "Flash deal to your list" },
        ],
      },
      FASHION: {
        body: "Dropping a collection or styling a lookbook? Pick below 👇",
        b1: { id: "guide_drop",     title: "👗 New Drop" },
        b2: { id: "guide_lookbook", title: "📸 Lookbook" },
        more: [
          { id: "guide_kit",       title: "📦 Full Content Kit",  description: "Reel + caption + 30 hashtags + stories + broadcast" },
          { id: "guide_giveaway",  title: "🎁 Giveaway",          description: "Style giveaway post" },
          { id: "guide_broadcast", title: "📣 Broadcast Sale",    description: "Flash sale to your list" },
        ],
      },
      TRAVEL: {
        body: "Got a package to sell or a destination to feature? Pick below 👇",
        b1: { id: "guide_package",     title: "✈️ Sell a Package" },
        b2: { id: "guide_destination", title: "🗺️ Feature Destination" },
        more: [
          { id: "guide_kit",       title: "📦 Full Content Kit",  description: "Reel + caption + 30 hashtags + stories + broadcast" },
          { id: "guide_broadcast", title: "📣 Broadcast Deal",    description: "Send a travel deal to customers" },
          { id: "guide_testimonial", title: "⭐ Guest Story",     description: "Traveller testimonial post" },
        ],
      },
      HEALTHCARE: {
        body: "Share a health tip or fill your appointment slots? Pick below 👇",
        b1: { id: "guide_awareness",   title: "🏥 Health Awareness" },
        b2: { id: "guide_appointment", title: "📅 Book Appointments" },
        more: [
          { id: "guide_kit",        title: "📦 Full Content Kit",   description: "Reel + caption + 30 hashtags + stories + broadcast" },
          { id: "guide_testimonial", title: "⭐ Patient Story",      description: "Patient outcome testimonial" },
          { id: "guide_broadcast",   title: "📣 Broadcast",          description: "Health tip or offer broadcast" },
        ],
      },
      AUTOMOBILE: {
        body: "Showcasing a vehicle or promoting your service center? Pick below 👇",
        b1: { id: "guide_vehicle",       title: "🚗 Showcase Vehicle" },
        b2: { id: "guide_servicecenter", title: "🔧 Service Offer" },
        more: [
          { id: "guide_kit",        title: "📦 Full Content Kit",    description: "Reel + caption + 30 hashtags + stories + broadcast" },
          { id: "guide_testimonial", title: "⭐ Happy Customer",      description: "Customer testimonial reel" },
          { id: "guide_broadcast",   title: "📣 Broadcast Offer",     description: "Send a service deal to customers" },
        ],
      },
      PHOTOGRAPHY: {
        body: "Showcase your work or fill your calendar? Pick below 👇",
        b1: { id: "guide_portfolio",   title: "📸 Portfolio Reel" },
        b2: { id: "guide_photobooking", title: "📅 Fill Bookings" },
        more: [
          { id: "guide_kit",        title: "📦 Full Content Kit",    description: "Reel + caption + 30 hashtags + stories + broadcast" },
          { id: "guide_testimonial", title: "⭐ Client Story",        description: "Happy client testimonial" },
          { id: "guide_broadcast",   title: "📣 Availability Alert",  description: "Slots open broadcast" },
        ],
      },
      INTERIOR_DESIGN: {
        body: "Reveal a project or showcase your design style? Pick below 👇",
        b1: { id: "guide_project",           title: "🛋️ Project Reveal" },
        b2: { id: "guide_interiorportfolio", title: "🏠 Portfolio Reel" },
        more: [
          { id: "guide_kit",        title: "📦 Full Content Kit",    description: "Reel + caption + 30 hashtags + stories + broadcast" },
          { id: "guide_testimonial", title: "⭐ Client Testimonial",  description: "Client experience post" },
          { id: "guide_broadcast",   title: "📣 Broadcast",           description: "New project announcement" },
        ],
      },
      HOTEL: {
        body: "Promote a package or share a guest story? Pick below 👇",
        b1: { id: "guide_hotelpackage", title: "🏨 Promote Package" },
        b2: { id: "guide_hotelreview",  title: "⭐ Guest Review" },
        more: [
          { id: "guide_kit",       title: "📦 Full Content Kit",  description: "Reel + caption + 30 hashtags + stories + broadcast" },
          { id: "guide_broadcast", title: "📣 Broadcast Offer",   description: "Flash deal to past guests" },
          { id: "guide_earlybird", title: "🐦 Early Bird Deal",   description: "Seasonal advance booking promo" },
        ],
      },
      JEWELRY: {
        body: "Launch a collection or showcase a custom piece? Pick below 👇",
        b1: { id: "guide_collection",   title: "💍 New Collection" },
        b2: { id: "guide_customjewelry", title: "✨ Custom Piece" },
        more: [
          { id: "guide_kit",        title: "📦 Full Content Kit",   description: "Reel + caption + 30 hashtags + stories + broadcast" },
          { id: "guide_giveaway",   title: "🎁 Jewelry Giveaway",   description: "Giveaway to grow followers" },
          { id: "guide_broadcast",  title: "📣 Broadcast Offer",    description: "Festival or seasonal offer" },
        ],
      },
    };

    const cfg = MENU[workspaceType] || MENU.PERSONAL;

    await wa.sendButtons(
      phone,
      cfg.body,
      [
        cfg.b1,
        cfg.b2,
        { id: `guide_more_${workspaceType}`, title: "📋 More options" },
      ]
    );
  }

  private async sendMoreMenu(phone: string, workspaceType: WorkspaceType) {
    type MoreRow = { id: string; title: string; description: string };
    const MORE: Record<string, MoreRow[]> = {
      REAL_ESTATE: [
        { id: "guide_openhouse",    title: "🚪 Open House",          description: "Announcement + story countdown" },
        { id: "guide_testimonial",  title: "⭐ Client Testimonial",  description: "Quote card + reel + stories" },
        { id: "guide_renovation",   title: "🔨 Before / After",      description: "Renovation reveal reel + carousel" },
        { id: "guide_neighborhood", title: "🗺️ Neighborhood Guide",  description: "Lifestyle post for any area" },
      ],
      RESTAURANT: [
        { id: "guide_opening",  title: "🎉 Grand Opening",    description: "7-day launch campaign" },
        { id: "guide_catering", title: "🍱 Catering Promo",   description: "Promote catering services" },
        { id: "guide_delivery", title: "🛵 Delivery Launch",  description: "Swiggy / Zomato promo" },
      ],
      ECOMMERCE: [
        { id: "guide_compare",   title: "⚖️ Compare Products",  description: "Side-by-side comparison post" },
        { id: "guide_broadcast", title: "📣 Broadcast Sale",     description: "Announce a sale to customers" },
      ],
      CREATOR: [
        { id: "guide_challenge", title: "🏆 Start a Challenge",  description: "Community challenge launch" },
        { id: "guide_collab",    title: "🤝 Brand Collab",       description: "Paid collab announcement" },
        { id: "guide_qanda",     title: "❓ Q&A Session",        description: "Q&A reel + top questions" },
      ],
      BUSINESS_SERVICES: [
        { id: "guide_testimonial", title: "⭐ Client Testimonial", description: "Quote card + reel + stories" },
        { id: "guide_process",     title: "⚙️ How We Work",        description: "Process explainer carousel" },
      ],
      EVENTS: [
        { id: "guide_earlybird", title: "🐦 Early Bird Promo",    description: "Urgency post + countdown" },
        { id: "guide_venue",     title: "🏟️ Venue Reveal",         description: "Venue reveal reel + stories" },
        { id: "guide_sponsor",   title: "🤝 Sponsor Announcement", description: "Sponsor reveal reel" },
        { id: "guide_recap",     title: "🎉 Event Recap",          description: "Post-event thank you post" },
      ],
      EDUCATION: [
        { id: "guide_result",      title: "⭐ Student Result",      description: "Success story post" },
        { id: "guide_scholarship", title: "🏫 Scholarship",         description: "Scholarship announcement" },
        { id: "guide_challenge",   title: "🏆 Learning Challenge",  description: "30-day challenge launch" },
      ],
      PERSONAL: [
        { id: "guide_achievement", title: "🏅 Achievement",  description: "Celebration reel + stories" },
        { id: "guide_tribute",     title: "🕊️ Tribute",      description: "Heartfelt memorial post" },
      ],
      FITNESS_GYM: [
        { id: "guide_kit",       title: "📦 Full Content Kit",  description: "Reel + caption + 30 hashtags + stories + broadcast" },
        { id: "guide_giveaway",  title: "🎁 Membership Giveaway", description: "Giveaway post to grow followers" },
        { id: "guide_broadcast", title: "📣 Broadcast Offer",   description: "Flash promo to your contact list" },
      ],
      SALON_SPA: [
        { id: "guide_kit",         title: "📦 Full Content Kit",    description: "Reel + caption + 30 hashtags + stories + broadcast" },
        { id: "guide_testimonial", title: "⭐ Client Before/After",  description: "Transformation testimonial reel" },
        { id: "guide_broadcast",   title: "📣 Flash Offer",          description: "Last-minute slot deal" },
      ],
      FASHION: [
        { id: "guide_kit",       title: "📦 Full Content Kit",  description: "Reel + caption + 30 hashtags + stories + broadcast" },
        { id: "guide_giveaway",  title: "🎁 Style Giveaway",    description: "Product giveaway to boost reach" },
        { id: "guide_broadcast", title: "📣 Sale Broadcast",    description: "Flash sale to your WhatsApp list" },
      ],
      TRAVEL: [
        { id: "guide_kit",         title: "📦 Full Content Kit",  description: "Reel + caption + 30 hashtags + stories + broadcast" },
        { id: "guide_broadcast",   title: "📣 Deal Broadcast",    description: "Travel deal to your contact list" },
        { id: "guide_testimonial", title: "⭐ Traveller Story",    description: "Past client travel testimonial" },
      ],
      HEALTHCARE: [
        { id: "guide_kit",         title: "📦 Full Content Kit",   description: "Reel + caption + 30 hashtags + stories + broadcast" },
        { id: "guide_testimonial", title: "⭐ Patient Story",       description: "Patient outcome testimonial" },
        { id: "guide_broadcast",   title: "📣 Health Broadcast",   description: "Tip or offer to your list" },
      ],
      AUTOMOBILE: [
        { id: "guide_kit",         title: "📦 Full Content Kit",    description: "Reel + caption + 30 hashtags + stories + broadcast" },
        { id: "guide_testimonial", title: "⭐ Happy Customer",       description: "Customer testimonial reel" },
        { id: "guide_broadcast",   title: "📣 Service Deal",        description: "Flash service offer broadcast" },
      ],
      PHOTOGRAPHY: [
        { id: "guide_kit",         title: "📦 Full Content Kit",    description: "Reel + caption + 30 hashtags + stories + broadcast" },
        { id: "guide_testimonial", title: "⭐ Client Story",         description: "Happy client testimonial post" },
        { id: "guide_broadcast",   title: "📣 Slots Available",     description: "Availability announcement broadcast" },
      ],
      INTERIOR_DESIGN: [
        { id: "guide_kit",         title: "📦 Full Content Kit",    description: "Reel + caption + 30 hashtags + stories + broadcast" },
        { id: "guide_testimonial", title: "⭐ Client Testimonial",   description: "Client experience post" },
        { id: "guide_broadcast",   title: "📣 New Project Alert",   description: "Announce a new project" },
      ],
      HOTEL: [
        { id: "guide_kit",       title: "📦 Full Content Kit",  description: "Reel + caption + 30 hashtags + stories + broadcast" },
        { id: "guide_broadcast", title: "📣 Flash Deal",        description: "Limited time offer to past guests" },
        { id: "guide_earlybird", title: "🐦 Advance Booking",   description: "Early bird seasonal deal" },
      ],
      JEWELRY: [
        { id: "guide_kit",       title: "📦 Full Content Kit",   description: "Reel + caption + 30 hashtags + stories + broadcast" },
        { id: "guide_giveaway",  title: "🎁 Jewelry Giveaway",   description: "Giveaway to grow your following" },
        { id: "guide_broadcast", title: "📣 Festival Offer",     description: "Festival or seasonal offer broadcast" },
      ],
    };

    const rows = MORE[workspaceType] || [];
    if (!rows.length) {
      await wa.sendText(phone, "Just send a photo or describe what you want to create 🚀");
      return;
    }
    await wa.sendList(phone, "Pick what you need 👇", "See options", [{ title: "More options", rows }]);
  }

  // ─── Festival suggestion ───────────────────────────────────────────────────

  private async handleFestivalSuggestion(phone: string, user: any, workspace: any) {
    const festival = getNearestFestival();
    if (!festival) {
      await wa.sendText(phone, "No major festivals coming up in the next 30 days. Send me a photo or idea and I'll create content anytime! 🚀");
      return;
    }
    const idea = festival.contentIdea[workspace.type as string] || "Create festive content to connect with your audience";
    const daysUntil = Math.ceil((new Date(festival.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    await wa.sendButtons(
      phone,
      `${festival.emoji} *${festival.name} is in ${daysUntil} days!*\n\n` +
      `Content idea for you:\n_${idea}_\n\n` +
      `Want me to generate this now?`,
      [
        { id: "festival_generate", title: `${festival.emoji} Create Now` },
        { id: "festival_skip", title: "Maybe Later" },
      ],
      `${festival.name} Content`
    );
    await this.setContext(phone, { ...await this.getContext(phone), data: { festivalPrompt: idea, festivalName: festival.name } });
  }

  // ─── Series mode ──────────────────────────────────────────────────────────

  private async handleSeriesStart(phone: string, user: any, workspace: any, topic: string) {
    if (!topic) {
      await wa.sendText(phone, "Tell me the series topic. Example:\n*SERIES home buying tips for first-timers*");
      return;
    }
    await wa.sendText(phone, `🎬 *5-part series: "${topic}"*\n\nGenerating Part 1 now...\n⏳ Preview in ~15 seconds`);

    const prompt = buildSeriesPrompt(topic, 1, 5, workspace.type);
    await this.setContext(phone, { flow: "AWAITING_GENERATION", data: { seriesTopic: topic, seriesPart: 1, seriesTotalParts: 5, inputType: "text", prompt, contentType: "REEL", audioType: "BACKGROUND_MUSIC" } });
    await videoQueue.add("generate-video", {
      phone, userId: user.id, workspaceType: workspace.type,
      inputType: "text", prompt, contentType: "REEL", audioType: "BACKGROUND_MUSIC",
      seriesTopic: topic, seriesPart: 1, seriesTotalParts: 5,
    }, { attempts: 3, backoff: { type: "exponential", delay: 5000 } });
  }

  // ─── Repurpose last content ────────────────────────────────────────────────

  private async handleRepurpose(phone: string, userId: string, workspaceType: string) {
    const last = await prisma.generatedContent.findFirst({
      where: { userId, jobStatus: "COMPLETED" },
      orderBy: { createdAt: "desc" },
    });

    if (!last?.hook || !last?.caption || !last?.script) {
      await wa.sendText(phone, "No completed content found to repurpose. Create something first and then use REPURPOSE!");
      return;
    }

    await wa.sendText(phone, "🔄 Repurposing your last content into 3 formats...");

    try {
      const prompt = buildRepurposePrompt({ hook: last.hook, caption: last.caption, script: last.script || "" }, workspaceType);
      const result = await chat({ messages: [{ role: "user", content: prompt }], json: true });
      const parsed = JSON.parse(result.text);

      await wa.sendText(
        phone,
        `♻️ *Repurposed into 3 formats:*\n\n` +
        `📱 *Instagram Story:*\n${parsed.story.text}\n👉 ${parsed.story.cta}\n\n` +
        `💼 *LinkedIn/Facebook:*\n${parsed.linkedin.caption}\n${parsed.linkedin.hashtags.map((h: string) => `#${h}`).join(" ")}\n\n` +
        `🐦 *Short Post/Tweet:*\n${parsed.tweet}`
      );
    } catch {
      await wa.sendText(phone, "⚠️ Repurpose failed. Try again!");
    }
  }

  // ─── Countdown series ─────────────────────────────────────────────────────

  private async handleCountdownSeries(phone: string, user: any, workspace: any, input: string) {
    await wa.sendText(
      phone,
      `⏱️ *Countdown series activated!*\n\nI'll generate:\n` +
      `• 30-day-before teaser\n• 7-day urgency post\n• 1-day final push\n\nStarting with the 30-day teaser now...`
    );

    const prompts = [
      { days: 30, prompt: `Create a 30-days-out announcement/teaser for: ${input}. Build awareness and excitement, early bird angle.` },
      { days: 7,  prompt: `Create a 7-days-to-go urgency post for: ${input}. Scarcity, last chance, what they'll miss out on.` },
      { days: 1,  prompt: `Create a 1-day-left FINAL PUSH post for: ${input}. Maximum urgency, doors close tomorrow, act NOW.` },
    ];

    for (const { prompt } of prompts) {
      await videoQueue.add("generate-video", {
        phone, userId: user.id, workspaceType: workspace.type,
        inputType: "text", prompt, contentType: "POST", audioType: "NONE",
      }, { attempts: 2, delay: 5000 });
    }
  }

  private detectTextIntent(text: string): { contentType: string; audioType: string; audioLabel: string } {
    const t = text.toLowerCase();
    const contentType =
      /\b(post|photo|image|listing|menu|offer|promo|ad)\b/.test(t) ? "POST" : "REEL";
    let audioType = "BACKGROUND_MUSIC";
    let audioLabel = "background music";
    if (/\b(voice|voiceover|narrat|speak|talk)\b/.test(t)) {
      audioType = "AI_VOICEOVER";
      audioLabel = "AI voiceover";
    } else if (/\b(silent|quiet|no.?audio|no.?music|no.?sound)\b/.test(t)) {
      audioType = "NONE";
      audioLabel = "no audio";
    }
    return { contentType, audioType, audioLabel };
  }

  private detectInputType(message: any): string | null {
    if (message.type === "image") return "image";
    if (message.type === "video") return "video";
    if (message.type === "audio") return "audio";
    if (message.type === "text") {
      const text: string = message.text?.body || "";
      if (/https?:\/\//i.test(text)) return "url";
      if (text.length > 3) return "text";
    }
    return null;
  }

  private extractUrl(text: string): string {
    const match = text.match(/https?:\/\/[^\s]+/i);
    return match?.[0] || text;
  }

  private getExamplesText(type: WorkspaceType): string {
    const examples: Record<WorkspaceType, string> = {
      RESTAURANT:        "📸 *Examples:*\n• Send a dish photo → get a viral reel\n• Type 'DISH Paneer Butter Masala' → full content suite\n• Type 'OFFER Buy 1 Get 1 tonight' → offer post",
      REAL_ESTATE:       "📸 *Examples:*\n• Send property photo → get a listing reel\n• Type 'PROPERTY 3BHK Bandra ₹2.5Cr' → full suite\n• Type 'SOLD 4BHK Juhu ₹6.5Cr' → sold post",
      ECOMMERCE:         "📸 *Examples:*\n• Send product photo → get product reel\n• Type 'LAUNCH Red Shoes 1999' → 3-phase launch campaign\n• Type 'GIFTING birthday 500–2000' → gift guide",
      CREATOR:           "📸 *Examples:*\n• Send your clip → get a viral reel\n• Type 'VIRAL morning routine, lifestyle' → 10 hook ideas\n• Type 'GIVEAWAY iPhone 15' → giveaway post",
      BUSINESS_SERVICES: "📸 *Examples:*\n• Send office photo → get brand reel\n• Type 'CASESTUDY TechCorp, 200% leads, SEO' → case study\n• Type 'WEBINAR Instagram Growth, Saturday, Free' → promo",
      EVENTS:            "📸 *Examples:*\n• Send event photo → get teaser reel\n• Type 'TICKETS SunBurn 2025, Dec 20-21, ₹2999' → ticket launch\n• Type 'LINEUP DJ Snake + Nucleya, SunBurn' → lineup reveal",
      EDUCATION:         "📸 *Examples:*\n• Send course screenshot → get edu reel\n• Type 'COURSE Digital Marketing, ₹2999' → launch campaign\n• Type 'RESULT Priya, unemployed, landed ₹8L job' → success story",
      PERSONAL:          "📸 *Examples:*\n• Send family photo → get a memory reel\n• Type 'WEDDING Rahul & Priya, Dec 15, Taj' → wedding suite\n• Type 'GRADUATION Rahul, B.Tech, IIT Bombay' → celebration post",
      FITNESS_GYM:       "📸 *Examples:*\n• Send workout video → get a fitness reel\n• Type 'TRANSFORMATION Ravi, lost 18kg in 4 months' → story\n• Type 'FITNESSCLASS HIIT Bootcamp, Mon 6am, ₹1500' → promo",
      SALON_SPA:         "📸 *Examples:*\n• Send treatment photo → get a salon reel\n• Type 'SALONSERVICE Keratin, 90 min, ₹3500' → showcase\n• Type 'SALONBOOKING Thursday–Sunday afternoons' → booking promo",
      FASHION:           "📸 *Examples:*\n• Send outfit photo → get a fashion reel\n• Type 'DROP Winter Luxe Collection, ₹1299–₹4999' → drop reel\n• Type 'LOOKBOOK Summer 2025 coastal vibes' → lookbook",
      TRAVEL:            "📸 *Examples:*\n• Send destination photo → get a travel reel\n• Type 'PACKAGE Bali, 5 nights, ₹45,000' → package promo\n• Type 'DESTINATION Meghalaya' → destination guide",
      HEALTHCARE:        "📸 *Examples:*\n• Send clinic photo → get a healthcare reel\n• Type 'AWARENESS Diabetes prevention' → awareness content\n• Type 'APPOINTMENT Physiotherapy, Mon + Fri' → booking promo",
      AUTOMOBILE:        "📸 *Examples:*\n• Send vehicle photo → get a showcase reel\n• Type 'VEHICLE Hyundai Creta 2025, ₹10.5L' → vehicle reel\n• Type 'SERVICECENTER AC check, free this month' → service promo",
      PHOTOGRAPHY:       "📸 *Examples:*\n• Send portfolio photo → get a portfolio reel\n• Type 'PORTFOLIO Wedding photography candid' → showcase\n• Type 'PHOTOBOOKING December weekends, ₹15,000' → booking promo",
      INTERIOR_DESIGN:   "📸 *Examples:*\n• Send project photo → get a design reel\n• Type 'PROJECT 3BHK Japandi minimal' → project reveal\n• Type 'INTERIORPORTFOLIO Contemporary Indian fusion' → portfolio",
      HOTEL:             "📸 *Examples:*\n• Send hotel photo → get a hospitality reel\n• Type 'HOTELPACKAGE Monsoon Escape, 2 nights, ₹8999' → package\n• Type 'HOTELREVIEW Priya & Rahul, anniversary stay' → review",
      JEWELRY:           "📸 *Examples:*\n• Send jewelry photo → get a collection reel\n• Type 'COLLECTION Eternal Love, ₹25,000–₹2,50,000' → launch\n• Type 'CUSTOMJEWELRY Gold mangalsutra, bride's piece' → story",
    };
    return examples[type] || "📸 Send a photo or video and I'll create content instantly!";
  }

  private async getOrCreateUser(phone: string, displayName?: string): Promise<any> {
    let user = await prisma.user.findUnique({
      where: { phone },
      include: { workspace: true },
    });

    if (!user) {
      user = await prisma.user.create({
        data: { phone, name: displayName },
        include: { workspace: true },
      });
      await this.setContext(phone, { flow: "GREETING", data: {} });
      alert.newSignup(phone).catch(() => {});
    }

    return user;
  }

  async getContext(phone: string): Promise<ConversationCtx> {
    const state = await prisma.conversationState.findUnique({ where: { phone } });
    if (!state || state.expiresAt < new Date()) {
      return { flow: "GREETING", data: {} };
    }
    return { flow: state.currentStep as FlowStep, data: state.contextData as Record<string, any> };
  }

  async setContext(phone: string, ctx: ConversationCtx): Promise<void> {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h TTL
    await prisma.conversationState.upsert({
      where: { phone },
      update: { currentFlow: "main", currentStep: ctx.flow, contextData: ctx.data, expiresAt },
      create: { phone, currentFlow: "main", currentStep: ctx.flow, contextData: ctx.data, expiresAt },
    });
  }
}

// Called by video worker after generation completes
export async function sendPreview(
  phone: string,
  contentId: string,
  videoUrl: string,
  caption: string,
  hookVariants?: [string, string]
): Promise<void> {
  const engine = new WhatsAppFlowEngine();
  const ctx = await engine.getContext(phone);

  // If two hook variants provided, show A/B selection first
  if (hookVariants) {
    await wa.sendButtons(
      phone,
      `🪝 *Pick your hook:*\n\nA) ${hookVariants[0]}\n\nB) ${hookVariants[1]}`,
      [
        { id: "hook_a", title: "✅ Hook A" },
        { id: "hook_b", title: "✅ Hook B" },
      ],
      "A/B Hook Selection"
    );
    await engine.setContext(phone, {
      flow: "PREVIEW",
      data: { ...ctx.data, contentId, videoUrl, caption, hookVariants, awaitingHookPick: true },
    });
    return;
  }

  await wa.sendMedia(phone, "video", videoUrl, `🎬 *Here's your preview!*`);

  const isSeries = ctx.data.seriesTopic && ctx.data.seriesPart;
  const seriesLabel = isSeries ? ` (Part ${ctx.data.seriesPart}/${ctx.data.seriesTotalParts})` : "";
  await wa.sendText(phone, `📝 *Caption${seriesLabel}:*\n${caption}`);

  const previewButtons: wa.WaButton[] = [
    { id: "approve", title: "👍 Approve" },
    { id: "regenerate", title: "🔄 Regenerate" },
    { id: "change_style", title: "🎨 Change Style" },
  ];
  if (isSeries && ctx.data.seriesPart < ctx.data.seriesTotalParts) {
    previewButtons[2] = { id: "series_next", title: `▶️ Part ${ctx.data.seriesPart + 1}` };
  }

  await wa.sendButtons(phone, "How do you want to proceed?", previewButtons, `Preview Ready ✨${seriesLabel}`);
  await engine.setContext(phone, { flow: "PREVIEW", data: { ...ctx.data, contentId } });
}
