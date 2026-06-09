# Myna by Manvion AI

> **WhatsApp-first AI platform** that turns photos, videos, URLs & text into viral reels, posts, captions & hashtags — all controlled via WhatsApp chat.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USER FLOW                                    │
│                                                                     │
│  User WhatsApp ──→ Meta Cloud API ──→ Webhook ──→ Flow Engine       │
│       ↑                                                    │        │
│       └────────────── WhatsApp Response ←──────────────────┘        │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                      BACKEND SERVICES                               │
│                                                                     │
│  Express API (Node.js)                                              │
│  ├── /webhook/whatsapp  ← Meta Webhooks                             │
│  ├── /api/auth          ← JWT auth                                  │
│  ├── /api/user          ← Profile + content history                 │
│  └── /api/content       ← Schedule + download                      │
│                                                                     │
│  BullMQ Workers (Redis/Upstash)                                     │
│  ├── video-generation   ← FFmpeg pipeline (concurrency: 2)          │
│  ├── ai-tasks           ← Whisper transcription (concurrency: 5)    │
│  ├── web-scraping       ← Puppeteer (concurrency: 2)                │
│  └── social-posting     ← IG/FB/TikTok/YT (concurrency: 3)         │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                      AI PIPELINE                                    │
│                                                                     │
│  Input → Vision (GPT-4o-mini / Claude Haiku)                        │
│        → Text Gen (Groq LLaMA-3.3 → OpenAI → Claude)               │
│        → Speech-to-Text (Whisper)                                   │
│        → Text-to-Speech (Piper TTS → OpenAI TTS)                   │
│        → Stock Media (Pexels API + Pixabay Music)                   │
│        → FFmpeg (video assembly)                                    │
│        → WhatsApp preview                                           │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                      DATA LAYER                                     │
│                                                                     │
│  PostgreSQL (Supabase)                                              │
│  ├── users + workspaces + brand_profiles                            │
│  ├── media_uploads + generated_content                              │
│  ├── campaigns + scheduled_posts                                    │
│  ├── whatsapp_messages + social_accounts                            │
│  └── conversation_state (24h TTL)                                   │
│                                                                     │
│  Redis (Upstash)                                                    │
│  ├── BullMQ job queues                                              │
│  └── Rate limiting                                                  │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                      FRONTEND (Next.js)                             │
│                                                                     │
│  /               Landing page                                       │
│  /onboarding     Phone → Workspace selection → WhatsApp link        │
│  /dashboard      Content history + download + schedule              │
└─────────────────────────────────────────────────────────────────────┘
```

---

## WhatsApp Conversation Flow

```
User Sends Media/URL/Text
         │
         ▼
┌─────────────────┐
│  Input Classify │ → image | video | audio | url | text
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Workspace Guard │ → Inject workspace system prompt
└────────┬────────┘
         │
         ▼
┌─────────────────┐    Buttons: [🎬 Reel] [📢 Post] [🍽 Promo]
│ Content Type    │ ←─ Workspace-specific button set
└────────┬────────┘
         │
         ▼
┌─────────────────┐    Buttons: [🎵 Music] [🤖 AI Voice] [🚫 None]
│ Audio Options   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ BullMQ Enqueue  │ → video-generation queue
└────────┬────────┘
         │
    [async 30-60s]
         │
         ▼
┌─────────────────┐
│ FFmpeg Pipeline │ → Segments → Audio → Captions → Watermark → MP4
└────────┬────────┘
         │
         ▼
┌─────────────────┐    Buttons: [👍 Approve] [🔄 Regen] [🎨 Style]
│ WhatsApp Preview│
└────────┬────────┘
         │
         ▼
┌─────────────────┐    Buttons: [🚀 Post Now] [⏰ Schedule] [📥 Download]
│ Publish Options │
└─────────────────┘
```

---

## Monorepo Structure

```
growfast/
├── package.json                  # pnpm workspaces root
├── turbo.json                    # Turborepo task pipeline
├── .env.example                  # All environment variables
│
├── apps/
│   ├── api/                      # Node.js Express backend
│   │   ├── prisma/
│   │   │   └── schema.prisma     # Full DB schema (10 tables)
│   │   └── src/
│   │       ├── index.ts          # Server bootstrap
│   │       ├── scheduler.ts      # Cron jobs
│   │       ├── lib/
│   │       │   ├── logger.ts     # Winston logger
│   │       │   ├── prisma.ts     # DB client singleton
│   │       │   └── redis.ts      # Redis + BullMQ connections
│   │       ├── routes/
│   │       │   ├── webhook.ts    # WhatsApp webhook (GET + POST)
│   │       │   ├── auth.ts       # Register + login
│   │       │   ├── user.ts       # Profile + content history
│   │       │   └── content.ts    # Schedule + post-now
│   │       ├── services/
│   │       │   ├── whatsapp.service.ts       # WA API calls
│   │       │   ├── whatsapp-flow.service.ts  # Conversation engine
│   │       │   ├── ffmpeg.service.ts         # Video pipeline
│   │       │   ├── ai.service.ts             # LLM + vision + TTS
│   │       │   ├── scraper.service.ts        # Puppeteer scraping
│   │       │   └── content-generator.service.ts  # Script builder
│   │       ├── workers/
│   │       │   ├── index.ts        # Worker bootstrap
│   │       │   ├── video.worker.ts # Main video generation worker
│   │       │   ├── ai.worker.ts    # Whisper transcription
│   │       │   ├── scraping.worker.ts  # Website scraper + matrix
│   │       │   └── posting.worker.ts  # IG/FB/TikTok posting
│   │       ├── queues/
│   │       │   └── index.ts       # BullMQ queue definitions
│   │       └── templates/
│   │           └── prompts.ts     # AI prompts per workspace
│   │
│   └── web/                      # Next.js App Router frontend
│       └── src/app/
│           ├── layout.tsx         # Root layout
│           ├── globals.css        # Tailwind + custom CSS
│           ├── page.tsx           # Landing page
│           ├── onboarding/
│           │   └── page.tsx       # 3-step onboarding
│           └── dashboard/
│               └── page.tsx       # Content history dashboard
│
└── packages/
    └── shared/                   # Shared TypeScript types
        └── src/
            ├── types.ts           # Core domain types
            └── constants.ts       # Workspace labels, icons, limits
```

---

## Database Schema (10 Tables)

| Table | Purpose |
|---|---|
| `users` | Phone, name, email, onboarding state |
| `workspaces` | One per user — type, tone, branding |
| `brand_profiles` | Scraped website data + content matrix |
| `media_uploads` | WhatsApp media downloads + metadata |
| `generated_content` | All AI outputs + video paths + status |
| `campaigns` | 30-day content plan container |
| `scheduled_posts` | Queue of platform posts with datetime |
| `social_accounts` | OAuth tokens for IG/FB/TikTok/YT |
| `whatsapp_messages` | Full conversation log |
| `conversation_state` | Current flow step + context (24h TTL) |

---

## Video Generation Pipeline (FFmpeg)

```
1. Source Acquisition
   ├── User image → imageToVideo() (Ken Burns zoom effect)
   ├── User video → normaliseVideo() (trim + resize)
   └── No media → Pexels stock → downloadFile()

2. Segment Normalisation
   └── All segments → target resolution (1080×1920 for 9:16)

3. Concatenation
   └── FFmpeg concat filter (fade/cut transitions)

4. Audio Layer
   ├── Background Music → loop + volume adjust
   ├── AI Voiceover → Piper TTS → WAV file
   └── No audio → copy video

5. Caption Burn-in
   └── FFmpeg drawtext filter (modern/bold/minimal styles)

6. Watermark Overlay
   └── Logo at top-left (12% of width)

7. WhatsApp Transcode
   └── H.264 baseline + AAC + faststart flag
```

---

## AI Provider Fallback Chain

```
Text Generation:
  1. Groq (LLaMA-3.3-70B) — fastest, free tier
  2. OpenAI (GPT-4o-mini)  — reliable fallback
  3. Claude Haiku          — final fallback

Vision / Image Understanding:
  1. OpenAI (GPT-4o-mini vision)
  2. Claude Haiku (vision)
  3. Static fallback string

Speech-to-Text:
  1. OpenAI Whisper API
  2. Local Whisper CLI (base model)

Text-to-Speech:
  1. Piper TTS (open-source, local)
  2. OpenAI TTS (alloy voice)
```

---

## Workspace AI Personas

| Workspace | AI Tone | Hook Style | Hashtag Strategy |
|---|---|---|---|
| Restaurant | Sensory, crave-inducing | Food FOMO | #foodie #instafood |
| Real Estate | Aspirational, lifestyle | Dream home | #realestate #property |
| Ecommerce | Conversion-focused | Deal urgency | #deals #shopping |
| Creator | Authentic, trendy | Pattern interrupt | #viral #creator |
| Business | Authority, data-driven | Pain → solution | #entrepreneur #business |
| Events | Hype, FOMO | Countdown | #party #event |
| Education | Value-first, results | Transformation | #learning #course |

---

## Environment Variables Required

See [.env.example](.env.example) for the full list. Minimum required to run:

```bash
DATABASE_URL          # PostgreSQL connection string
REDIS_URL             # Redis for BullMQ
WHATSAPP_PHONE_NUMBER_ID
WHATSAPP_ACCESS_TOKEN
WHATSAPP_WEBHOOK_VERIFY_TOKEN
GROQ_API_KEY          # or OPENAI_API_KEY or ANTHROPIC_API_KEY
PEXELS_API_KEY        # for stock footage
JWT_SECRET            # min 32 chars
```

---

## MVP Build Roadmap (30 Days)

### Week 1 — Infrastructure & Core Flow (Days 1–7)

| Day | Task |
|-----|------|
| 1 | Provision Supabase + Upstash + server (Railway/Render) |
| 2 | Deploy API, run `prisma migrate`, verify health endpoint |
| 3 | Register Meta App, get WhatsApp test number, verify webhook |
| 4 | Test onboarding flow end-to-end in WhatsApp |
| 5 | Install FFmpeg on server, test image→video with `generateVideo()` |
| 6 | Connect Groq API, test content generation with prompts |
| 7 | End-to-end test: send photo → receive preview video on WhatsApp |

### Week 2 — Full Pipeline (Days 8–14)

| Day | Task |
|-----|------|
| 8 | Add Pexels stock footage fallback for text-only inputs |
| 9 | Add Pixabay background music integration |
| 10 | Implement Whisper voice note transcription |
| 11 | Implement Piper TTS for AI voiceover |
| 12 | Test all 7 workspace types with real content |
| 13 | Implement website scraper + content matrix generator |
| 14 | Load test: 10 concurrent video jobs |

### Week 3 — Social Posting + Web App (Days 15–21)

| Day | Task |
|-----|------|
| 15 | Deploy Next.js web app (Vercel free tier) |
| 16 | Instagram Graph API: post reels from approved content |
| 17 | Facebook Pages API: post videos |
| 18 | Build schedule-post flow in WhatsApp conversation |
| 19 | Test full approve → post-now flow on Instagram |
| 20 | Add TikTok Content Posting API |
| 21 | QA: test all 7 workspaces, fix bugs |

### Week 4 — Polish & Launch (Days 22–30)

| Day | Task |
|-----|------|
| 22 | Add watermark branding + custom logo upload |
| 23 | Style variants (trendy/minimal/bold) working in all workspaces |
| 24 | Rate limiting + error handling hardening |
| 25 | Monitor queue health with BullMQ Board |
| 26 | Onboard 5 beta users across different workspaces |
| 27 | Collect feedback, fix critical bugs |
| 28 | Content quality review — prompt tuning |
| 29 | Final QA pass + security review |
| 30 | Public launch 🚀 |

---

## Quick Start (Local Dev)

```bash
# 1. Install dependencies
pnpm install

# 2. Copy env
cp .env.example .env
# Fill in DATABASE_URL, REDIS_URL, WHATSAPP_*, GROQ_API_KEY

# 3. Database setup
cd apps/api && pnpm db:push

# 4. Start everything
pnpm dev

# API runs on:  http://localhost:3001
# Web runs on:  http://localhost:3000

# 5. Expose webhook for WhatsApp (ngrok)
ngrok http 3001
# Set https://xxxx.ngrok.io/webhook/whatsapp in Meta Developer Console
```

---

## Free Tier Cost Breakdown

| Service | Free Tier Limit | Cost to Start |
|---|---|---|
| Supabase (PostgreSQL) | 500MB DB, 2GB storage | $0 |
| Upstash Redis | 10k commands/day | $0 |
| Groq API | 6,000 tokens/min | $0 |
| Pexels API | Unlimited (attribution) | $0 |
| Pixabay API | Unlimited | $0 |
| WhatsApp Cloud API | 1,000 messages/month | $0 |
| Vercel (Next.js) | 100GB bandwidth | $0 |
| Railway/Render (API) | $5/month | $5 |
| **Total** | | **$5/month** |

> Scale costs only kick in when you have paying users.

---

## Production Checklist

- [ ] HTTPS on all endpoints
- [ ] WhatsApp signature verification enabled
- [ ] Rate limiting on all routes
- [ ] BullMQ retry + dead letter queue
- [ ] Structured logging (Winston → log aggregator)
- [ ] FFmpeg timeout guard (kill after 120s)
- [ ] Temp file cleanup after each job
- [ ] Prisma connection pool size set correctly
- [ ] Environment secrets in vault (not .env on server)
- [ ] `movflags +faststart` on all WhatsApp-bound videos
