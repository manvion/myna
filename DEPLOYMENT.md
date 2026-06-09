# Myna Deployment Guide

> Myna by Manvion AI — zero to production on a $0/month stack.

---

## Stack

| Layer | Service | Cost | Why |
|-------|---------|------|-----|
| Database | Neon (PostgreSQL) | Free (0.5GB) | Serverless, auto-pause, no sleep |
| Cache / Queue | Railway Redis | Free ($5 credit/mo) | No command limit, persistent |
| API Server | Railway | Free ($5 credit/mo) | Always-on, FFmpeg pre-installed |
| Web App | Vercel | Free (100GB/mo) | Auto-deploy, global CDN |
| AI | OpenRouter | Free models | Gemini Flash, LLaMA — no card |
| Speech-to-text | Groq Whisper | Free | Fastest Whisper endpoint |
| Stock footage | Pexels + Pixabay | Free | 40K+ videos |
| WhatsApp | Meta Cloud API | Free (1K msgs/mo) | Official API |
| Payments | Stripe | Free setup | 2.9% + 30¢ per transaction |

**Estimated cost for first 100 users: $0.**

---

## Before You Start

You need:
- Node.js 18+ on your local machine
- pnpm: `npm install -g pnpm`
- A GitHub account (the code lives there — Railway and Vercel both pull from it)

Open these in browser tabs and create accounts before doing anything else:

1. https://neon.tech — database
2. https://railway.app — API server + Redis
3. https://vercel.com — web app
4. https://openrouter.ai — AI models
5. https://console.groq.com — Whisper
6. https://www.pexels.com/api — stock footage
7. https://pixabay.com/accounts/register — stock footage
8. https://developers.facebook.com — WhatsApp
9. https://stripe.com — payments

---

## Step 1 — Push Code to GitHub

Railway and Vercel deploy from GitHub. Do this first.

```bash
cd e:\projects\growfast
git init
git add .
git commit -m "initial commit"
```

Go to https://github.com/new, create a **private** repository called `myna`. Then:

```bash
git remote add origin https://github.com/YOUR_USERNAME/myna.git
git branch -M main
git push -u origin main
```

---

## Step 2 — Database: Neon

### 2.1 Create a project

1. Go to https://console.neon.tech → **New project**
2. Project name: `myna-prod`
3. Region: **AWS ap-south-1 (Mumbai)** for India, or **eu-central-1** for MENA
4. PostgreSQL version: **16**
5. Click **Create project**

### 2.2 Copy the connection string

On the project dashboard:
1. Click **Connection string** (top of page)
2. Select **Pooled connection** (uses PgBouncer — required for Railway)
3. Copy the URL — it looks like:
   ```
   postgresql://myna_owner:XXXXXXXX@ep-xxxxxx-pooler.ap-south-1.aws.neon.tech/myna?sslmode=require
   ```
4. Append `&connection_limit=10` to the end

Save this as your `DATABASE_URL`.

### 2.3 Push the Prisma schema

On your local machine:

**Windows PowerShell:**
```powershell
$env:DATABASE_URL = "postgresql://myna_owner:XXXXXXXX@ep-xxxxxx-pooler.ap-south-1.aws.neon.tech/myna?sslmode=require&connection_limit=10"
cd e:\projects\growfast
npx prisma db push --schema=apps/api/prisma/schema.prisma
```

**Mac/Linux:**
```bash
DATABASE_URL="postgresql://..." npx prisma db push --schema=apps/api/prisma/schema.prisma
```

You should see: `All migration steps succeeded.`

> **Neon auto-pause:** Neon pauses the database after 5 minutes of inactivity on the free tier. The first query after pause takes ~1 second to wake. This is fine for production — Railway keeps the API warm and Neon wakes instantly on demand.

---

## Step 3 — Redis: Railway

### 3.1 Create Railway project

1. Go to https://railway.app → **New project**
2. Select **Deploy a template** → search **Redis** → click it
3. Railway provisions a Redis instance immediately
4. Click on the Redis service → **Variables** tab
5. Copy the `REDIS_URL` — it looks like:
   ```
   redis://default:XXXXXXXX@monorail.proxy.rlwy.net:XXXXX
   ```

Save this as your `REDIS_URL`.

> **Railway free tier:** $5 of compute credit per month. Redis uses ~$0.50–1/month on the free tier. Plenty for your first 500 users.

---

## Step 4 — WhatsApp Business API (Meta)

Set aside 30–60 minutes for this step.

### 4.1 Create a Meta App

1. Go to https://developers.facebook.com/apps/
2. **Create App** → select **Other** → **Business**
3. App name: `Myna` (or your brand name)
4. Click **Create app**

### 4.2 Add WhatsApp

1. In your app dashboard → **Add products to your app**
2. Find **WhatsApp** → click **Set up**

### 4.3 Get your credentials

From **WhatsApp → API Setup**:
- `WHATSAPP_PHONE_NUMBER_ID` — listed under "From" phone number
- `WHATSAPP_BUSINESS_ACCOUNT_ID` — listed under "Business Account ID"

**Temporary access token** (for testing):
- Click **Generate token** on the API Setup page — copy it

**Permanent access token** (for production):
1. Go to https://business.facebook.com → **Settings → System Users**
2. Click **Add** → name it `myna-api`, role: `Employee`
3. Click **Grant people access** → select your WhatsApp Business Account → permission: `Full control`
4. Click on the system user → **Generate new token**
5. Select your app → check `whatsapp_business_messaging` and `whatsapp_business_management`
6. Copy the token — it does not expire

Save as `WHATSAPP_ACCESS_TOKEN`.

From **App Settings → Basic** (top left sidebar):
- `WHATSAPP_APP_SECRET` — click "Show" next to App Secret

### 4.4 Set up webhook

You need the Railway API URL for this. **Come back after Step 5.4.**

1. WhatsApp → Configuration → **Webhook** → Edit
2. **Callback URL:** `https://your-railway-api.up.railway.app/webhook/whatsapp`
3. **Verify token:** Pick any random string, e.g. `myna-verify-2025` — save as `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
4. Click **Verify and Save**
5. Under **Webhook fields**, click **Subscribe** next to `messages`

### 4.5 Add a phone number

For testing, Meta gives you a free test number.
For production, you must add a real number:
1. WhatsApp → Phone numbers → **Add phone number**
2. Use a SIM you own that is not already a WhatsApp Business account
3. Verify via OTP

---

## Step 5 — Deploy API to Railway

### 5.1 Create the API service

1. In your Railway project → **New** → **GitHub Repo**
2. Connect your GitHub account → select your `myna` repo
3. Railway will detect it as a Node.js project

### 5.2 Configure the service

1. Click on the service → **Settings** tab
2. Set:

| Setting | Value |
|---------|-------|
| Root Directory | `apps/api` |
| Build Command | `pnpm install && pnpm build` |
| Start Command | `node dist/index.js` |

3. Under **Settings → Networking** → click **Generate Domain**
4. Copy the generated URL (e.g. `https://myna-api-production.up.railway.app`) — this is your `API_BASE_URL`

### 5.3 Install FFmpeg on Railway

Railway uses Nixpacks to build. Create this file in your repo:

**`apps/api/nixpacks.toml`**
```toml
[phases.setup]
nixPkgs = ["ffmpeg"]
```

Commit and push:
```bash
git add apps/api/nixpacks.toml
git commit -m "add FFmpeg to Railway build"
git push
```

### 5.4 Generate secrets

Run this in any terminal with Node.js:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Run it twice — one for `JWT_SECRET`, one for `ADMIN_JWT_SECRET`.

### 5.5 Set environment variables on Railway

In your Railway API service → **Variables** tab → add each one:

```
DATABASE_URL              postgresql://myna_owner:XXXX@ep-xxxx-pooler.ap-south-1.aws.neon.tech/myna?sslmode=require&connection_limit=10
REDIS_URL                 redis://default:XXXX@monorail.proxy.rlwy.net:XXXXX

WHATSAPP_PHONE_NUMBER_ID      your-phone-number-id
WHATSAPP_ACCESS_TOKEN         your-permanent-system-user-token
WHATSAPP_WEBHOOK_VERIFY_TOKEN myna-verify-2025
WHATSAPP_BUSINESS_ACCOUNT_ID  your-business-account-id
WHATSAPP_APP_SECRET           your-meta-app-secret

OPENROUTER_API_KEY        your-openrouter-key
GROQ_API_KEY              your-groq-key
PEXELS_API_KEY            your-pexels-key
PIXABAY_API_KEY           your-pixabay-key

STRIPE_SECRET_KEY             sk_test_...
STRIPE_WEBHOOK_SECRET         whsec_... (fill after Step 7)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY  pk_test_...
STRIPE_PRODUCT_GROWTH         prod_... (fill after Step 7)
STRIPE_PRODUCT_UNLIMITED      prod_... (fill after Step 7)

JWT_SECRET                your-32-char-hex-secret
ADMIN_JWT_SECRET          your-other-32-char-hex-secret
ADMIN_PASSWORD            choose-a-strong-admin-password

NODE_ENV                  production
API_PORT                  3001
API_BASE_URL              https://myna-api-production.up.railway.app
NEXT_PUBLIC_WEB_URL       https://your-vercel-app.vercel.app  (fill after Step 6)
NEXT_PUBLIC_API_URL       https://myna-api-production.up.railway.app

FFMPEG_PATH               /usr/bin/ffmpeg
FFPROBE_PATH              /usr/bin/ffprobe
TEMP_DIR                  /tmp
OUTPUT_DIR                /tmp/myna-output
STORAGE_TYPE              local

SMTP_HOST                 smtp.gmail.com
SMTP_PORT                 587
SMTP_USER                 your-gmail@gmail.com
SMTP_PASS                 your-gmail-app-password
SMTP_FROM                 Myna <hello@myna.app>

NTFY_TOPIC                myna-prod-alerts
NTFY_URL                  https://ntfy.sh
```

### 5.6 Trigger first deploy

Railway auto-deploys on every git push. After setting env vars, click **Redeploy** in the Deployments tab.

### 5.7 Confirm it's running

```bash
curl https://myna-api-production.up.railway.app/health
# → {"status":"ok","timestamp":"..."}
```

### 5.8 Register the WhatsApp webhook (Step 4.4)

Now that you have the Railway URL, go back to Meta Developer Console and complete Step 4.4.

---

## Step 6 — Deploy Web App to Vercel

### 6.1 Import project

1. Go to https://vercel.com/new
2. Click **Import Git Repository** → select your `myna` repo
3. Configure:

| Setting | Value |
|---------|-------|
| Framework Preset | Next.js (auto-detected) |
| Root Directory | `apps/web` |
| Node.js Version | 18.x |

4. **Before clicking Deploy**, expand **Environment Variables** and add:

```
NEXT_PUBLIC_API_URL                 https://myna-api-production.up.railway.app
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY  pk_test_...
```

5. Click **Deploy**

### 6.2 Copy your Vercel URL

After deploy finishes, copy your URL (e.g. `https://myna-abc123.vercel.app`).

### 6.3 Update Railway with the Vercel URL

Go back to Railway → your API service → **Variables**:
- Update `NEXT_PUBLIC_WEB_URL` to `https://myna-abc123.vercel.app`

Click **Redeploy** on Railway.

---

## Step 7 — Stripe Setup

### 7.1 Create products

1. https://dashboard.stripe.com → **Catalog → Products** → **Add product**

**Product 1:**
- Name: `Myna Growth`
- No price (WACS handles dynamic pricing)
- Save → copy Product ID (starts with `prod_`) → save as `STRIPE_PRODUCT_GROWTH`

**Product 2:**
- Name: `Myna Unlimited`
- No price
- Save → copy Product ID → save as `STRIPE_PRODUCT_UNLIMITED`

### 7.2 Get API keys

**Developers → API keys:**
- `STRIPE_SECRET_KEY` — Secret key (`sk_test_...`)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — Publishable key (`pk_test_...`)

### 7.3 Set up webhook

1. **Developers → Webhooks** → **Add endpoint**
2. URL: `https://myna-api-production.up.railway.app/api/stripe/webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Click **Add endpoint**
5. **Reveal** the Signing secret → save as `STRIPE_WEBHOOK_SECRET`

### 7.4 Update Railway env vars

Add these to Railway now that you have them:
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRODUCT_GROWTH`
- `STRIPE_PRODUCT_UNLIMITED`

Redeploy Railway after updating.

---

## Step 8 — AI Providers

### 8.1 OpenRouter (primary — all text + vision)

1. https://openrouter.ai → Sign up
2. **Keys** → **Create Key** → name it `wacs-prod`
3. Copy the key → save as `OPENROUTER_API_KEY`

Free models Myna uses (no credit card needed):
- `google/gemini-2.0-flash-exp:free` — vision + text, fast
- `meta-llama/llama-3.3-70b-instruct:free` — text quality fallback
- `qwen/qwen-2.5-72b-instruct:free` — secondary fallback

WACS cascades through these automatically. All free.

### 8.2 Groq (Whisper speech-to-text)

1. https://console.groq.com → Sign up
2. **API Keys** → **Create API Key**
3. Copy → save as `GROQ_API_KEY`

### 8.3 Pexels (stock footage)

1. https://www.pexels.com/api/ → **Get Started**
2. After creating account, your key is shown on the API page
3. Save as `PEXELS_API_KEY`

### 8.4 Pixabay (additional stock footage)

1. https://pixabay.com/accounts/register/ → register
2. After login, go to https://pixabay.com/api/docs/ — your key is shown at the top
3. Save as `PIXABAY_API_KEY`

---

## Step 9 — Seed the Admin User

The admin panel lives at `https://myna-abc123.vercel.app/admin`.

Create the first admin account (this endpoint disables itself after first use):

```bash
curl -X POST https://myna-api-production.up.railway.app/admin/auth/seed \
  -H "Content-Type: application/json" \
  -d '{"email":"you@yourdomain.com","password":"your-strong-password","name":"Admin"}'
```

Expected response: `{"id":"...","email":"you@yourdomain.com"}`

Log in at `https://myna-abc123.vercel.app/admin/login`.

---

## Step 10 — Monitoring

### 10.1 UptimeRobot (free, keeps Railway warm)

1. https://uptimerobot.com → Sign up free
2. **Add New Monitor** → HTTP(s)
3. URL: `https://myna-api-production.up.railway.app/health`
4. Interval: **5 minutes**
5. Alert to your email

### 10.2 Ntfy.sh (push alerts for failed jobs)

1. Choose a unique topic name — e.g. `myna-prod-abc123`
2. Set `NTFY_TOPIC=myna-prod-abc123` in Railway
3. On your phone:
   - Android: Install Ntfy app → subscribe to `ntfy.sh/myna-prod-abc123`
   - iOS: Install Ntfy app → subscribe
4. Test: `curl -d "test alert" ntfy.sh/myna-prod-abc123`

Myna already sends alerts for job failures, quota hits, and admin blocks via `apps/api/src/lib/notifications.ts`.

### 10.3 BullMQ Queue Dashboard

Access at: `https://myna-api-production.up.railway.app/admin/queues`
- Password: your `ADMIN_PASSWORD` env var
- Shows all video, AI, posting, and scraping queues in real-time

---

## Step 11 — Testing Checklist

Work through these in order. Each layer proves the one below it.

**Health:**
- [ ] `curl https://myna-api-production.up.railway.app/health` → `{"status":"ok"}`
- [ ] Neon console shows active connections (check the Monitoring tab)
- [ ] Redis shows key count > 0 after first WhatsApp message

**Registration + Welcome message:**
- [ ] Go to `https://myna-abc123.vercel.app` → sign up with your phone number
- [ ] Within 5 seconds, receive a welcome WhatsApp message
- [ ] Reply to the welcome message → bot responds with workspace setup

**Full WhatsApp flow:**
- [ ] Complete onboarding: business type → business name → first content type
- [ ] Send a photo of anything (food, a room, a product)
- [ ] Bot confirms receipt → shows content type buttons
- [ ] Select a content type → within 60–120 seconds, receive a video
- [ ] Video plays correctly in WhatsApp

**Quota enforcement:**
- [ ] As FREE user: send a second photo after getting the first video
- [ ] Should receive an upgrade prompt instead of generating a second video

**Stripe:**
- [ ] Go to `https://myna-abc123.vercel.app/pricing`
- [ ] Click **Get Started** on Growth plan
- [ ] Use test card `4242 4242 4242 4242`, any expiry, any CVC
- [ ] After payment → WhatsApp `STATUS` command → should show GROWTH plan
- [ ] Send another photo → video generates (quota unlocked)

**Admin panel:**
- [ ] Log into `/admin` → user list shows your test user
- [ ] Try sending a WhatsApp message from admin → user receives it
- [ ] Try changing plan tier → user receives notification

---

## Step 12 — Go Live (Test → Production)

When you're ready to accept real payments:

**1. Stripe live mode:**
- In Railway, update:
  - `STRIPE_SECRET_KEY` → `sk_live_...`
  - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` → `pk_live_...`
- Create a new Stripe webhook for `sk_live` → new `STRIPE_WEBHOOK_SECRET`

**2. Meta app review:**

Your WhatsApp number is currently in test mode (only approved testers can message it). To go public:
1. Meta Developer Console → **App Review** → **Request Advanced Access**
2. Request `whatsapp_business_messaging` permission
3. Fill in: use case description, privacy policy URL, demo video showing your flow
4. Approval: 1–5 business days

**3. Custom domain:**

On Vercel:
1. **Settings → Domains** → add your domain (e.g. `wacs.app`)
2. Add the DNS records Vercel shows you at your domain registrar
3. Wait for SSL (~5 minutes)

On Railway, update:
- `NEXT_PUBLIC_WEB_URL` → `https://wacs.app`
- Add custom domain on Railway too if you want `api.wacs.app`

**4. Update webhook URLs:**
- Meta → WhatsApp webhook → update callback URL to your custom domain
- Stripe → webhook → update endpoint URL

---

## Environment Variables Reference

Full list for Railway (API):

```
# Required — app will not start without these
DATABASE_URL
REDIS_URL
WHATSAPP_ACCESS_TOKEN
ADMIN_JWT_SECRET

# WhatsApp
WHATSAPP_PHONE_NUMBER_ID
WHATSAPP_WEBHOOK_VERIFY_TOKEN
WHATSAPP_BUSINESS_ACCOUNT_ID
WHATSAPP_APP_SECRET

# AI
OPENROUTER_API_KEY
GROQ_API_KEY

# Stock footage
PEXELS_API_KEY
PIXABAY_API_KEY

# Stripe
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRODUCT_GROWTH
STRIPE_PRODUCT_UNLIMITED

# App
NODE_ENV=production
API_PORT=3001
API_BASE_URL
NEXT_PUBLIC_API_URL
NEXT_PUBLIC_WEB_URL
JWT_SECRET
ADMIN_PASSWORD

# Next.js publishable key (also needed in Vercel)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

# FFmpeg (Railway has it at /usr/bin/ffmpeg)
FFMPEG_PATH=/usr/bin/ffmpeg
FFPROBE_PATH=/usr/bin/ffprobe
TEMP_DIR=/tmp
OUTPUT_DIR=/tmp/myna-output
STORAGE_TYPE=local

# Email (optional — admin campaigns)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER
SMTP_PASS
SMTP_FROM

# Alerts
NTFY_TOPIC
NTFY_URL=https://ntfy.sh
```

Full list for Vercel (web):

```
NEXT_PUBLIC_API_URL
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
```

---

## Upgrade Path (When You Outgrow Free)

| When | Problem | Upgrade |
|------|---------|---------|
| 200+ videos/month | Railway disk full | Cloudflare R2 ($0.015/GB) |
| DB > 0.5GB | Neon free limit | Neon Launch plan $19/mo (10GB) |
| Railway credit used | Compute cost | Railway Hobby $5/mo (removes credit limit) |
| WhatsApp > 1K msg/mo | Meta limit | Apply for BSP or use Twilio |
| Need 10 workers | Single instance | Railway scale to 2 replicas |

**Cloudflare R2 storage (when ready):**
1. Cloudflare Dashboard → R2 → **Create bucket** `wacs-videos`
2. Create API token → R2 read/write permissions
3. Add to Railway:
   ```
   STORAGE_TYPE=cloudflare-r2
   R2_ACCOUNT_ID=your-cf-account-id
   R2_ACCESS_KEY_ID=your-r2-key
   R2_SECRET_ACCESS_KEY=your-r2-secret
   R2_BUCKET_NAME=myna-videos
   R2_PUBLIC_URL=https://your-bucket.r2.dev
   ```

---

## Common Issues

**API won't start:**
```
Fatal: missing required env vars: DATABASE_URL, REDIS_URL...
```
→ Check all required vars are set in Railway. Look for typos — copy-paste directly.

**WhatsApp webhook fails verification:**
→ `WHATSAPP_WEBHOOK_VERIFY_TOKEN` in Railway must exactly match what you entered in Meta Developer Console. No extra spaces.

**Videos not generating:**
→ Check Railway logs (Observability tab). Then check BullMQ board at `/admin/queues` — click failed jobs for the full error. Most common causes:
- FFmpeg not found: verify `nixpacks.toml` is committed and `FFMPEG_PATH=/usr/bin/ffmpeg`
- OpenRouter key invalid: test with `curl -H "Authorization: Bearer $OPENROUTER_API_KEY" https://openrouter.ai/api/v1/models`
- Pexels API limit: free tier is 200 requests/hour, check the response body in logs

**Neon connection timeout:**
→ Neon pauses after 5 minutes of idle. The first query after pause adds ~1s latency — this is normal. If queries are timing out beyond that, verify `sslmode=require` is in the URL.

**Stripe webhook 400:**
→ `STRIPE_WEBHOOK_SECRET` must be the webhook signing secret (starts with `whsec_`), not the API key. Get it from Stripe Dashboard → Webhooks → your endpoint → Reveal.

**Welcome message not sending:**
→ Check Railway logs for `Welcome message failed`. The WhatsApp token might be expired (temporary tokens last 24 hours — use a system user permanent token).

**Admin login fails:**
→ Run the seed curl command again. If it returns `"Admin already seeded"`, the password you're entering is wrong. Fix: go to Neon console → Tables → `Admin` → delete the row → re-run seed.

**No video received in WhatsApp:**
→ WhatsApp has a 15MB file size limit. If the video is larger, it silently fails. Check Railway logs — look for `sendMedia` errors. Lower the output resolution in `ffmpeg.service.ts` if needed.

---

## Quick Reference

| URL | Purpose |
|-----|---------|
| `https://myna-abc123.vercel.app` | Public landing + web app |
| `https://myna-abc123.vercel.app/admin/login` | Admin login |
| `https://myna-abc123.vercel.app/pricing` | Pricing page |
| `https://myna-api-production.up.railway.app/health` | Health check |
| `https://myna-api-production.up.railway.app/admin/queues` | BullMQ job monitor |

| Command | Purpose |
|---------|---------|
| `npx prisma db push --schema=apps/api/prisma/schema.prisma` | Push schema to Neon |
| `npx prisma studio` | Browse DB in browser |
| `npx pnpm build --filter @myna/api` | Build API locally |
| `npx pnpm build --filter @myna/web` | Build web locally |
| `git push origin main` | Trigger Railway + Vercel deploy |
