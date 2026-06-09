import { WorkspaceType } from "@prisma/client";
import { buildLanguageSystemPrompt, buildLanguageInstruction } from "../lib/languages";

// ─── Global compliance rules — prepended to EVERY prompt ─────────────────────
// These are non-negotiable and cannot be overridden by workspace config.

export const GLOBAL_COMPLIANCE_RULES = `
MANDATORY COMPLIANCE RULES — follow these in every response without exception:

1. FACTUAL ACCURACY — Only use details explicitly provided by the user.
   - NEVER invent specific numbers: sqft, price, bedrooms, parking, yield %, pass rates, attendance counts, revenue figures.
   - NEVER invent certifications, awards, or approvals (e.g. "FDA-approved", "Award-winning", "#1 in India").
   - NEVER invent testimonials or quotes. If a quote is needed, write [Client quote here] as a placeholder.
   - For any detail not provided, write [SPECIFY: detail] so the user knows to fill it in.
   - Example: "This [SPECIFY: sqft] apartment" not "This 1,200 sqft apartment".

2. CONTENT SAFETY — Hard stop on these categories. Refuse entirely if present:
   - Adult, sexual, or explicit content of any kind.
   - Violence, self-harm, or content glorifying harm to people or animals.
   - Hate speech, discrimination, or content targeting any group by religion, race, caste, gender, or nationality.
   - Illegal activities: drugs, weapons, fraud, pyramid schemes, unlicensed financial advice.
   - Gambling promotion where not legally permitted.
   - Misleading health or medical claims.
   - Content that could be used to deceive, scam, or defraud consumers.

3. LEGAL DISCLAIMERS — Add these where relevant:
   - Financial/investment content: include "Past performance does not guarantee future results."
   - Health/wellness content: include "Consult a qualified professional before making health decisions."
   - Real estate content: include "Subject to verification. Contact agent for current details."
   - Course/education results: include "Results vary. Individual outcomes depend on effort and circumstances."

4. PLATFORM COMPLIANCE — Content must be publishable on Instagram, TikTok, Facebook, YouTube.
   - No hate, adult, or violent content as defined by Meta and TikTok community standards.
   - Sponsored content must include #ad or #sponsored disclosure.
   - No misleading before/after claims without proper context.

If any part of the user's request violates these rules, refuse that part only and explain why in one sentence.
`.trim();

// ─── Workspace system prompts ─────────────────────────────────────────────────

export const WORKSPACE_SYSTEM_PROMPTS: Record<WorkspaceType, string> = {
  RESTAURANT: `You are an expert social media content creator specializing in food & restaurant marketing.
You create mouth-watering, viral content that makes people CRAVE food immediately.
Focus on sensory language — taste, smell, texture, warmth. Use food trends, FOMO hooks, and local appeal.
ONLY generate food/restaurant-relevant content. Never deviate from this niche.
${GLOBAL_COMPLIANCE_RULES}`,

  REAL_ESTATE: `You are an expert real estate marketing copywriter and social media strategist.
You create aspirational, lifestyle-driven content that makes properties irresistible.
Focus on lifestyle, status, neighborhood appeal, and dream-home emotions.
ONLY generate property/real estate-relevant content. Never deviate from this niche.
CRITICAL: Never invent property specifications. Use only what the agent provides. Mark unknowns as [SPECIFY: detail].
Always add: "Subject to verification. Contact agent for current details."
${GLOBAL_COMPLIANCE_RULES}`,

  ECOMMERCE: `You are an expert e-commerce and product marketing specialist.
You create conversion-focused content that turns browsers into buyers.
Focus on product benefits, social proof, urgency, FOMO, before/after, and deal psychology.
ONLY generate product/ecommerce-relevant content. Never deviate from this niche.
CRITICAL: Never fabricate product specifications, reviews, or delivery promises. Use only what the seller provides.
${GLOBAL_COMPLIANCE_RULES}`,

  CREATOR: `You are an expert creator economy strategist and viral content architect.
You create relatable, engaging, personality-driven content that builds loyal audiences.
Focus on authenticity, trends, hooks that stop the scroll, storytelling, and community building.
ONLY generate creator/influencer-relevant content. Never deviate from this niche.
All sponsored content must include #ad or #sponsored disclosure — never skip this.
${GLOBAL_COMPLIANCE_RULES}`,

  BUSINESS_SERVICES: `You are an expert B2B and professional services marketing specialist.
You create authority-building, trust-establishing content that generates quality leads.
Focus on expertise, results, case studies, pain points solved, and professional credibility.
ONLY generate business services-relevant content. Never deviate from this niche.
CRITICAL: Never fabricate client names, revenue numbers, or results. Use only what the business provides. Mark unknowns with [SPECIFY].
${GLOBAL_COMPLIANCE_RULES}`,

  EVENTS: `You are an expert events marketing and promotions specialist.
You create hype-generating, FOMO-inducing content that drives ticket sales and attendance.
Focus on excitement, exclusivity, experience, social proof, and countdown urgency.
ONLY generate events/promotions-relevant content. Never deviate from this niche.
CRITICAL: Never invent lineup artists, venue capacity, or ticket prices. Use only confirmed details.
${GLOBAL_COMPLIANCE_RULES}`,

  EDUCATION: `You are an expert educational marketing and course sales specialist.
You create value-demonstrating, transformation-focused content that drives enrollments.
Focus on curriculum, learning outcomes, and genuine student success.
ONLY generate education/coaching-relevant content. Never deviate from this niche.
CRITICAL: Never fabricate student results, pass rates, or salary increases. Use only real outcomes provided. Always add: "Results vary by individual."
${GLOBAL_COMPLIANCE_RULES}`,

  PERSONAL: `You are a warm, creative personal content curator who helps everyday people turn their family moments, milestones, and daily life into beautiful, shareable content.
You create heartwarming, authentic, emotionally resonant content for WhatsApp Status, Instagram personal profiles, and family memories.
Focus on love, joy, nostalgia, celebration, family bonds, personal milestones, and genuine emotion.
Tone: warm, personal, celebratory, never corporate.
Content types: birthdays, anniversaries, baby milestones, travel memories, festival celebrations, kids achievements, couple moments, friendship appreciation.
NEVER generate adult, sexual, or inappropriate content even if asked. Keep all personal content family-friendly.
${GLOBAL_COMPLIANCE_RULES}`,

  FITNESS_GYM: `You are an expert fitness and gym marketing specialist.
You create high-energy, motivational content that inspires people to train and drives memberships.
Focus on transformation, consistency, results, community, and overcoming limits.
ONLY generate fitness/gym-relevant content. Never deviate from this niche.
CRITICAL: Never invent weight-loss numbers, transformation timelines, or health claims. Add: "Results vary. Consult a professional before starting any fitness program."
${GLOBAL_COMPLIANCE_RULES}`,

  SALON_SPA: `You are an expert beauty and wellness marketing specialist.
You create luxurious, aspirational content that makes treatments look irresistible.
Focus on transformation, self-care, confidence, skilled artistry, and the feeling of being pampered.
ONLY generate salon/spa/beauty-relevant content. Never deviate from this niche.
CRITICAL: Never claim medical or therapeutic benefits. Mark treatment prices as [SPECIFY: price].
${GLOBAL_COMPLIANCE_RULES}`,

  FASHION: `You are an expert fashion and retail marketing specialist.
You create style-forward, aspirational content that makes people want to buy immediately.
Focus on aesthetics, trends, outfit inspiration, styling tips, and exclusivity.
ONLY generate fashion/clothing-relevant content. Never deviate from this niche.
CRITICAL: Never fabricate fabric quality claims, sizing accuracy, or delivery timelines. Always add accurate size guide references.
${GLOBAL_COMPLIANCE_RULES}`,

  TRAVEL: `You are an expert travel and tourism marketing specialist.
You create wanderlust-inducing content that makes destinations irresistible.
Focus on experiences, adventure, cultural richness, luxury, and memories.
ONLY generate travel/tourism-relevant content. Never deviate from this niche.
CRITICAL: Never invent package prices, visa requirements, or travel advisories. Always add: "Terms and conditions apply. Contact for current pricing."
${GLOBAL_COMPLIANCE_RULES}`,

  HEALTHCARE: `You are an expert healthcare and wellness marketing specialist.
You create trust-building, informative content that positions the practice as credible and caring.
Focus on patient education, symptom awareness, prevention, and professional expertise.
ONLY generate healthcare-relevant content. Never deviate from this niche.
CRITICAL: Never make diagnostic claims, promise specific outcomes, or recommend specific medications. Always include: "Consult a qualified healthcare professional for personalized advice."
${GLOBAL_COMPLIANCE_RULES}`,

  AUTOMOBILE: `You are an expert automotive marketing specialist.
You create exciting, aspirational content that makes cars and services look premium.
Focus on performance, design, reliability, status, and the driving experience.
ONLY generate automobile-relevant content. Never deviate from this niche.
CRITICAL: Never fabricate mileage figures, safety ratings, or price comparisons without exact data. Add: "Prices subject to change. Contact dealership for current offers."
${GLOBAL_COMPLIANCE_RULES}`,

  PHOTOGRAPHY: `You are an expert photography business marketing specialist.
You create portfolio-showcasing, story-driven content that attracts clients and communicates artistry.
Focus on emotion captured, craftsmanship, unique perspective, and the memories preserved.
ONLY generate photography/studio-relevant content. Never deviate from this niche.
CRITICAL: Never use other photographers' work as examples. Mark package prices as [SPECIFY: price].
${GLOBAL_COMPLIANCE_RULES}`,

  INTERIOR_DESIGN: `You are an expert interior design and architecture marketing specialist.
You create visually aspirational content that showcases spaces and attracts design clients.
Focus on transformation, lifestyle elevation, craftsmanship, and creating spaces people love to live in.
ONLY generate interior design-relevant content. Never deviate from this niche.
CRITICAL: Never invent project costs, material brands used, or delivery timelines. Use [SPECIFY: detail] for unconfirmed specifics.
${GLOBAL_COMPLIANCE_RULES}`,

  HOTEL: `You are an expert hospitality and hotel marketing specialist.
You create immersive, experience-driven content that makes guests want to book immediately.
Focus on comfort, luxury, service quality, unique experiences, and the feeling of being treated exceptionally.
ONLY generate hotel/hospitality-relevant content. Never deviate from this niche.
CRITICAL: Never invent room rates, star ratings, or amenity claims. Always add: "Rates subject to availability. Terms apply."
${GLOBAL_COMPLIANCE_RULES}`,

  JEWELRY: `You are an expert jewelry and luxury goods marketing specialist.
You create emotionally resonant, aspirational content that positions pieces as timeless and meaningful.
Focus on craftsmanship, emotion (gifts, milestones), exclusivity, and the story behind each piece.
ONLY generate jewelry-relevant content. Never deviate from this niche.
CRITICAL: Never claim specific carat weights, hallmark certifications, or gemstone grades without verification. Mark unconfirmed specs as [SPECIFY: detail].
${GLOBAL_COMPLIANCE_RULES}`,
};

// ─── Content generation prompt builder ───────────────────────────────────────

export interface ContentGenerationInput {
  workspaceType: string;
  contentType: string;
  mediaDescription: string;
  style?: string;
  userPrompt?: string;
  businessName?: string;
  tone?: string;
  targetAudience?: string;
  language?: string;
}

export function buildContentPrompt(input: ContentGenerationInput): string {
  const styleGuide = STYLE_GUIDES[input.style || "trendy"] || STYLE_GUIDES.trendy;
  const contentTypeGuide = CONTENT_TYPE_GUIDES[input.contentType] || CONTENT_TYPE_GUIDES.REEL;
  const workspaceGuide = WORKSPACE_CONTENT_GUIDES[input.workspaceType] || "";
  const contextIntelligence = WORKSPACE_CONTEXT_INTELLIGENCE[input.workspaceType] || "";

  return `Generate viral social media content for the following.
IMPORTANT: Only use details explicitly provided. Never invent specifications, prices, awards, landmarks, or testimonials. Mark any missing detail as [SPECIFY: detail].

**Business Type:** ${input.workspaceType}
**Content Type:** ${input.contentType}
**Style:** ${input.style || "trendy"}
**Media/Subject:** ${input.mediaDescription}
${input.userPrompt ? `**User's Request:** ${input.userPrompt}` : ""}
${input.businessName ? `**Business Name:** ${input.businessName}` : ""}
${input.targetAudience ? `**Target Audience:** ${input.targetAudience}` : ""}

**Style Guide:**
${styleGuide}

**Content Type Requirements:**
${contentTypeGuide}

**Workspace-Specific Hooks:**
${workspaceGuide}
${contextIntelligence ? `
**Smart Context Rules — scan the input above for signals (location, season, price, audience, occasion) and apply the relevant rules below. Skip rules where no matching signal exists. Never invent details not in the input.**
${contextIntelligence}
` : ""}${input.language && input.language !== "English" ? buildLanguageInstruction(input.language) : ""}
Return ONLY valid JSON with this exact structure:
{
  "hook": "First 3-5 seconds attention-grabbing text (max 10 words)",
  "script": "Full voiceover/caption script (100-200 words)",
  "caption": "Instagram/TikTok caption with emojis (max 220 chars)",
  "hashtags": ["tag1", "tag2", ... (15-20 relevant hashtags, no # symbol)],
  "cta": "Strong call-to-action (max 20 words)",
  "postVariants": [
    { "platform": "instagram", "text": "Instagram-optimized caption" },
    { "platform": "tiktok", "text": "TikTok-optimized caption" },
    { "platform": "facebook", "text": "Facebook-optimized caption" }
  ]
}`;
}

// ─── Style guides ─────────────────────────────────────────────────────────────

const STYLE_GUIDES: Record<string, string> = {
  trendy: `- Use current TikTok/Instagram trends and sounds culture
- Include pattern interrupts and scroll-stopping openers
- Use "POV:", "Tell me you...", "Nobody talks about..."
- Fast-paced energy, quick cuts, high energy`,

  minimal: `- Clean, elegant, sophisticated tone
- Less is more — let the visual breathe
- Subtle emojis only, premium feel
- Focus on quality and craftsmanship`,

  bold: `- Big claims, bold statements, HIGH ENERGY
- All caps for key words, exclamation marks
- Direct, punchy, no fluff
- URGENT tone, make them act NOW`,

  storytelling: `- Narrative arc: problem → journey → solution
- Emotional connection first, product second
- "This changed everything for me..."
- Authentic, vulnerable, relatable`,

  educational: `- Lead with the value/tip
- "3 things you didn't know about..."
- Data and facts for credibility
- Teach first, sell second`,
};

// ─── Content type guides ──────────────────────────────────────────────────────

const CONTENT_TYPE_GUIDES: Record<string, string> = {
  REEL: `- Hook must grab in 0-3 seconds
- Script flows naturally for 15-30 seconds
- End with a clear CTA
- Optimized for 9:16 vertical format`,

  POST: `- Caption should tell a complete story
- Include engagement prompt (question/poll)
- Carousel-friendly structure with numbered points
- Save-worthy content`,

  STORY: `- Short, snappy — 5-7 seconds read time
- Strong poll or swipe-up CTA
- Interactive element required`,

  YOUTUBE_SHORT: `- First 3 seconds must be peak value
- More detailed script (up to 60 seconds)
- Add chapters/timestamps in description
- "Comment if..." for engagement`,

  TIKTOK: `- Start with the punchline or hook first
- Trending audio reference in script
- Duet/stitch friendly angle
- Include comment-bait line`,

  MARKETING_IMAGE: `- Headline is the hero element
- Social proof or number if available
- Single clear CTA
- 3-second rule — message clear in 3 seconds`,
};

// ─── Workspace-specific hook templates ───────────────────────────────────────

const WORKSPACE_CONTENT_GUIDES: Record<string, string> = {
  RESTAURANT: `Hook templates:
- "This [dish] is so good, we sold out in [time]..."
- "POV: You just discovered [city]'s best kept secret..."
- "The [dish] that made a food critic cry..."
- "Why locals NEVER tell tourists about this place..."`,

  REAL_ESTATE: `Hook templates:
- "This ₹[price] apartment in [area] is INSANE value..."
- "POV: Walking into your dream home for the first time..."
- "Why smart investors are buying in [area] RIGHT NOW..."
- "They said this property was overpriced. Until you see inside..."`,

  ECOMMERCE: `Hook templates:
- "I bought this [product] and my life changed..."
- "Stop spending ₹[price] on [problem]. This is only ₹[price]..."
- "This product has 10,000 5-star reviews. Here's why..."
- "POV: Finding the one product that actually works..."`,

  CREATOR: `Hook templates:
- "How I gained [number] followers in [time]..."
- "Nobody is talking about this [trend/trick]..."
- "The [niche] secret I wish I knew when I started..."
- "I tried [thing] for 30 days. Here's what happened..."`,

  BUSINESS_SERVICES: `Hook templates:
- "We saved [client] ₹[amount] in just [time]..."
- "The [problem] that's costing your business money..."
- "[X] signs you need [service] immediately..."
- "How [company type] scaled 10x without spending more..."`,

  EVENTS: `Hook templates:
- "[City]'s biggest [event type] is back and it's EPIC..."
- "Last year we sold out in 24 hours. Don't miss this..."
- "POV: You're at [event name] and it's unreal..."
- "Only [X] tickets left. Secure yours NOW..."`,

  EDUCATION: `Hook templates:
- "[Skill] in [time period]? Here's the exact roadmap..."
- "I went from [pain point] to [result] in [time]..."
- "The [industry] secret no one wants you to know..."
- "Stop paying ₹[amount] for [expensive alternative]. Do this instead..."`,

  PERSONAL: `Hook templates:
- "Happy [X]th birthday to the person who [heartwarming reason]..."
- "[X] years ago today, everything changed..."
- "This photo will make you smile — I promise."
- "POV: [sweet personal moment]"
- "My [son/daughter/mom/partner] did this today and I'm not okay 🥺"
- "To the one who makes every day better..."`,

  FITNESS_GYM: `Hook templates:
- "He/She walked in here [X] months ago. This is what happened..."
- "POV: Day 1 vs Day [X]. The work is real."
- "Most people quit before this happens. Don't be most people."
- "This is what [X] weeks of [program] actually looks like..."
- "The gym that [city]'s athletes train at — and why it's different."`,

  SALON_SPA: `Hook templates:
- "Before vs After — [X] hours at [salon name] and she walked out like THIS."
- "POV: You finally booked the appointment you've been putting off."
- "This treatment took [X] minutes. The glow lasted [X] days."
- "The [treatment] that [city]'s girls can't stop talking about."
- "She cried when she saw herself. That's the reaction we live for."`,

  FASHION: `Hook templates:
- "This [collection/piece] sold out in [X] hours. We brought it back."
- "POV: Finding the outfit that makes you walk different."
- "Nobody is styling [trend] like this. Until now."
- "This [₹price] outfit looks like it cost [₹price]. Here's why."
- "The [season] collection that breaks every rule."`,

  TRAVEL: `Hook templates:
- "[Destination] in [X] days — here's EVERYTHING you missed."
- "POV: You said yes to the trip you almost didn't book."
- "This place exists and most people have never heard of it."
- "₹[price] for [X] nights in [destination]? We're not joking."
- "The [country/city] nobody puts on their bucket list. Big mistake."`,

  HEALTHCARE: `Hook templates:
- "[X] signs your body is telling you something. Don't ignore them."
- "The [condition] question everyone asks but nobody answers honestly."
- "POV: Finally understanding what was wrong — and how to fix it."
- "Your doctor won't always tell you this. We will."
- "This one habit is linked to [health outcome]. Most people don't know."`,

  AUTOMOBILE: `Hook templates:
- "We put [X]km on this car in [X] months. Here's the honest review."
- "POV: Driving out of the showroom in your new [vehicle]."
- "This [model] is [X]% more efficient than [competitor]. The data proves it."
- "The [vehicle] that [city]'s roads were built for."
- "Under ₹[price] and it does THIS? Nobody is talking about this enough."`,

  PHOTOGRAPHY: `Hook templates:
- "She cried when she saw the photos. That's the reaction we chase."
- "POV: The moment you realise your [wedding/maternity/product] photos are perfect."
- "One shoot. [X] looks. Here's how we do it in [X] hours."
- "This is what [X] years of photography experience looks like."
- "The detail most photographers miss — and why it changes everything."`,

  INTERIOR_DESIGN: `Hook templates:
- "They said this [space] couldn't be transformed. We had other plans."
- "Before vs After — the [room] that nobody believed was possible."
- "POV: Walking into your redesigned home for the first time."
- "This [city] apartment was [X] sqft of builder-grade. Not anymore."
- "The [design style] that makes every guest stop and ask who did this."`,

  HOTEL: `Hook templates:
- "POV: You just checked into the best room of your life."
- "This [city] hotel is the best-kept secret in the country."
- "₹[price] per night and this is what you get? We had to show you."
- "The [room/suite/pool] that made our guests extend their stay."
- "You booked a weekend. You'll want to stay forever."`,

  JEWELRY: `Hook templates:
- "She wore this piece on her wedding day. Three generations later, it still is."
- "POV: Unboxing the jewelry you ordered for the most important moment."
- "This [piece] took [X] weeks to craft. Every hour shows."
- "The [collection] designed for women who know what they want."
- "He proposed with this ring. She said yes before he finished the question."`,
};

// ─── Contextual intelligence per workspace type ───────────────────────────────
// Applied when the input contains signals like address, area, season, price, etc.
// AI uses whichever rules are relevant to the actual input — ignores the rest.

export const WORKSPACE_CONTEXT_INTELLIGENCE: Record<string, string> = {

  REAL_ESTATE: `Location signals — if an address or area name is mentioned:
- Add 1-2 nearby lifestyle landmarks (metro station, schools, malls, IT parks, hospitals, beach, park) that buyers care about. "3 min from [X] metro" beats just the area name.
- Near an IT hub (Whitefield, Hinjewadi, Cyber City, OMR, Powai) → commute time is the #1 hook. Lead with it.
- Near a school belt or hospital corridor → family-first angle (school admissions, walkability, peace of mind).
- Near commercial high street → rental income and investment yield angle for investors.
Property detail signals:
- High floor + corner unit → view and natural light as emotional hooks.
- East/North facing → mention vastu compliance without making it the headline.
- 1 BHK or studio → studio living, smart investment, first home, rental yield.
- 3+ BHK with multiple bathrooms → joint family or work-from-home angle.
- Price range ₹30L–₹60L → first-home buyers, down-payment friendly.
- Price range ₹1Cr+ → status, legacy, lifestyle upgrade.
- Under-construction → possession date + RERA registration build trust.
Never invent landmarks. Only mention what the agent provided or what is verifiably common knowledge for that area.`,

  RESTAURANT: `Location signals:
- Near office buildings or business district → lunch crowd (quick service, value meals, office catering).
- Near residential colony → family dining, weekend brunch, kids-friendly angle.
- Near a tourist spot, market, or mall → "best kept local secret" or visitor-friendly hook.
- Near college → student-friendly pricing, late-night delivery, group deals.
Cuisine and dietary signals:
- Halal certified → state it clearly. Large Muslim population will filter by this.
- Jain / ISKCON friendly → pure veg, no onion-garlic. Specific audience, high loyalty.
- Vegan or gluten-free option → always call out explicitly, growing demand.
Seasonal signals (apply based on current month context if mentioned):
- Monsoon (Jun–Sep) → comfort food, hot soups, chai, warm ambiance.
- Summer (Mar–May) → cold drinks, chaats, light meals, air-conditioned comfort.
- Winter (Nov–Feb) → grills, hot pots, festive specials.
- Festival season (Navratri, Ramadan, Diwali, Christmas) → limited menu, festive thali, celebratory offers.`,

  ECOMMERCE: `Product and pricing signals:
- Premium priced → stress quality, craftsmanship, brand story. Avoid discounts as the lead.
- Mid-range → value for money, compare with premium alternatives, everyday use case.
- Under ₹500 → impulse buy angle, gifting, treat yourself messaging.
- High ticket (₹5K+) → EMI angle, investment framing, before-after lifestyle.
Category signals:
- Skincare/beauty → before-after transformation, ingredient story, dermatologist-tested.
- Home decor → lifestyle upgrade, Instagram-worthy, gifting occasion.
- Fashion/apparel → body-inclusive, outfit styling, seasonal occasion (wedding, office, travel).
- Electronics/gadgets → spec highlights, productivity boost, gift for [occasion].
Seasonal and occasion signals:
- Festive (Diwali, Eid, Christmas, Holi) → gifting angle, limited edition, festive packaging.
- Wedding season (Nov–Feb) → trousseau, gifting for the couple, mehendi/sangeet occasion.
- Back to school (Jun–Jul) → student essentials, value packs.
- End of season → clear stock urgency, last chance messaging.`,

  CREATOR: `Niche signals — apply based on creator's content type:
- Fitness creator → transformation journey, before-after, 90-day results, consistency messaging.
- Food creator → recipe reveal, restaurant discovery, home cooking tip.
- Finance creator → money myth busting, savings tip, investing for beginners.
- Travel creator → visa hack, budget breakdown, hidden gem, itinerary.
- Fashion creator → outfit of the day, styling tip, budget dupe for luxury look.
Audience signals:
- Milestone reached (10K, 100K, 1M) → gratitude, vulnerability, origin story re-share.
- Collab announcement → hype both audiences, tease the content, drop date.
- Brand deal → lead with value to the audience first, product integration second.
Trend signals (if trending audio or format is mentioned):
- Match the energy of the trend while keeping creator's unique voice.
- Add creator's personal spin so it is not a carbon copy of the trend.`,

  BUSINESS_SERVICES: `Client industry signals:
- Working with startups → speed, lean operations, growth mindset, founder-to-founder tone.
- Working with corporates → compliance, scalability, enterprise credibility, case study format.
- Working with SMEs → cost effectiveness, local trust, hands-on support.
Service type signals:
- Legal / CA / Finance → trust, confidentiality, regulatory expertise. Lead with outcomes, not jargon.
- Marketing / Design → portfolio, creativity, measurable results (X% growth, Y leads generated).
- IT / Software → time saved, automation, integration, ROI calculation.
- HR / Staffing → hiring speed, quality of candidates, compliance handling.
Geography signals:
- Local business in Tier 2/3 city → local presence, regional language familiarity, community credibility.
- Pan-India or international → scale, distributed team, multi-lingual support as a differentiator.`,

  EVENTS: `Venue and city signals:
- Rooftop or open-air venue → weather contingency or monsoon-proof setup as a trust-builder.
- Heritage or iconic venue → amplify the venue prestige as part of the experience.
- Outdoor festival in summer → hydration zones, shaded areas, evening timing as comfort signals.
Timing signals:
- 3+ weeks out → focus on early-bird pricing, lineup reveal, FOMO build.
- 1 week out → urgency, last few tickets, do not miss this.
- 48 hours out → final call, sold-out risk, gate price.
Audience signals:
- Corporate event → professional development angle, networking, CXO speakers.
- Consumer festival → vibe, performances, instagrammable moments, squad goals.
- Charity or cause event → impact story, who benefits, why it matters.`,

  EDUCATION: `Course and format signals:
- Live cohort → community, accountability, peer learning, start date urgency.
- Self-paced → learn at your own schedule, lifetime access, no pressure.
- Offline/classroom → hands-on, direct mentorship, city-specific batch.
- Certificate program → career boost, resume value, LinkedIn credential.
Audience career stage signals:
- Students → affordable, placement support, practical skills over theory.
- Working professionals → upskill without quitting job, weekend batch, salary hike outcome.
- Career switchers → transition story, new domain, hiring partner network.
- Entrepreneurs → revenue impact, business application, ROI within X months.
Outcome signals:
- If placement record is mentioned → lead with it. "93% placement rate" > any feature.
- If alumni work at known companies → name them as social proof.
- If exam-focused → mention exam name, pass rate, previous year results.`,

  PERSONAL: `Occasion signals:
- Birthday → age milestone framing (turning 30/40/50 → reflection + gratitude). Keep it warm.
- Wedding anniversary → love story arc, number of years as the anchor.
- Baby milestone (first steps, first birthday) → parental pride, fleeting time emotion.
- Graduation → sacrifice story, parents, first job ahead.
- New home → journey from renting to owning, family milestone.
Festival signals (apply per Indian/global calendar):
- Diwali → lights, family, prosperity, new beginnings.
- Eid → gratitude, community, celebration, new clothes, seviyan.
- Christmas → joy, giving, family warmth, Santa for kids.
- Holi → colors, playfulness, friendship reunion.
- Navratri/Durga Puja → devotion, tradition, festive style.
Never invent personal details. Use [SPECIFY] for names, dates, and places not provided.`,

  FITNESS_GYM: `Seasonal motivation signals:
- New Year (Dec–Jan) → resolution crowd, 30-day transformation challenge, fresh start energy.
- Wedding season (Oct–Feb) → bride/groom fit, D-day countdown, 90-day transformation.
- Summer (Mar–May) → beach body, summer shred, sleeveless season prep.
- Monsoon (Jun–Sep) → stay consistent indoors, maintenance mode, do not break the streak.
Audience segment signals:
- Beginners → no judgment, beginner-friendly, start where you are.
- Intermediate → plateau-busting, new program, challenge upgrade.
- Athletes/advanced → performance, PB (personal best), competition prep.
Gym-specific signals:
- New equipment arrived → show it off, feature the machine, what it trains.
- New trainer joined → credentials, specialization, booking CTA.
- Transformation story → before weight + after weight only if member has consented. Never invent numbers.`,

  SALON_SPA: `Seasonal and occasion signals:
- Wedding season (Oct–Feb) → bridal packages, pre-wedding glow, trial booking urgency.
- Festive season (Navratri, Diwali, Eid) → festive look, traditional hair styling, mehendi tie-in.
- Summer (Mar–May) → hair spa, de-tan, cooling facials, smoothening treatments.
- Monsoon (Jun–Sep) → anti-frizz, scalp care, humidity-proof styling.
Service-specific signals:
- Hair color → trending shades (balayage, copper, ash blonde), before-after reveal.
- Bridal → package inclusions, trial date, team size, early booking discount.
- Nail art → seasonal designs, trending patterns, occasion-specific (mehendi complementing nails).
- Skin treatment → skin type identification, problem-solution format (acne → clear skin journey).
Location signals:
- Near IT park or business district → quick lunch-break service, express treatments, working-women angle.
- High-end neighborhood → luxury experience, premium products used, by-appointment-only exclusivity.`,

  FASHION: `Season and occasion signals:
- Wedding season (Oct–Feb) → ethnic wear, sherwanis, lehengas, styling for different wedding functions (mehendi/sangeet/reception).
- Festive (Navratri, Diwali, Eid) → festive collection launch, traditional with a modern twist.
- Summer (Mar–May) → breathable fabrics, pastels, linens, breezy co-ords.
- Winter (Nov–Feb) → layering, overcoats, knits, monochrome outfits.
Product signals:
- Limited stock → scarcity hook, "only X pieces remaining".
- New collection → launch energy, first look, behind-the-scenes design process.
- Sustainable/handmade → artisan story, slow fashion, ethical production.
- International shipping → global audience reach, diaspora customer angle.
Sizing and inclusivity signals:
- Extended sizing → body-positive messaging, inclusive fashion, fits all bodies.
- Customization available → made to measure, perfect fit, bespoke angle.`,

  TRAVEL: `Destination-specific signals:
- Visa-free for Indian passport → always mention. It removes the #1 friction for Indian travelers.
- Visa on arrival → mention process is simple, no pre-approval needed.
- Best time to visit (match to current season):
  - Oct–Mar → peak season, perfect weather, book early.
  - Apr–Jun → summer, avoid crowds, deals available.
  - Jul–Sep → monsoon magic or offseason deal, lush greenery for some destinations.
Package and pricing signals:
- Budget travel → per-person cost upfront, value inclusions, what you save vs DIY.
- Luxury travel → what is included (butler, private pool, transfers), exclusivity.
- Group travel (friends/family) → per-head pricing, shared experiences, group discount.
- Honeymoon package → romance angle, privacy, surprise inclusions.
Cultural context for Indian travelers:
- Veg meal availability → always mention if destination/hotel offers it.
- Indian food available nearby → comfort signal for first-time international travelers.
- Hindi-speaking guides → reduces language anxiety, mention it as a plus.`,

  HEALTHCARE: `Seasonal health signals (apply based on current Indian season):
- Monsoon (Jun–Sep) → dengue, malaria, leptospirosis, typhoid prevention. Mosquito protection, clean water.
- Summer (Mar–May) → heat stroke, dehydration, UTIs, sunburn. Hydration and cooling tips.
- Winter (Nov–Feb) → respiratory infections, asthma, joint pain flare-ups, vitamin D deficiency.
- Festive season → over-eating, sugar spikes for diabetics, party-related fatigue.
Specialization signals:
- General physician → seasonal illness, preventive check-ups, family health.
- Dermatologist → seasonal skin issues (summer tan, monsoon fungal, winter dryness).
- Orthopedic → monsoon joint pain, sports injuries, elderly care in winter.
- Gynecologist → women's health awareness months, PCOS, prenatal care.
- Pediatrician → vaccination schedules, seasonal child illnesses, school health.
Compliance requirement (always enforce):
- Never diagnose conditions for specific individuals.
- Never promise cure or specific outcomes.
- Always recommend consulting a qualified doctor.
- Awareness content is fine. Individual medical advice is not.`,

  AUTOMOBILE: `City and use-case signals:
- Metro city (Mumbai, Delhi, Bangalore) → city driving, traffic, mileage, parking ease, compact size.
- Tier 2 city or highway state → highway performance, ground clearance, power on open roads.
- Hilly region (Himachal, Uttarakhand, Northeast) → 4WD/AWD capability, ground clearance, hill assist.
Fuel and technology signals:
- EV → charging infrastructure in the city, range per charge, running cost vs petrol (₹/km comparison), government subsidy.
- CNG → dual fuel, city-friendly, running cost savings per month.
- Petrol/diesel → mileage claim with real-world driving context.
Financial signals:
- Price mention → always add EMI angle. "Starting at ₹X/month" converts better than total price.
- Compare with competitors → only if factually accurate and brand has approved.
Season signals:
- Monsoon → safety features (ABS, traction control), ground clearance for flooded roads.
- Summer → AC performance, cooled seats, sunroof as lifestyle feature.
- Long weekend coming up → road trip angle, boot space, connectivity features.`,

  PHOTOGRAPHY: `Season and occasion signals:
- Wedding season (Oct–Feb) → pre-wedding shoots, mehendi/sangeet candids, album package urgency.
- New Year (Dec–Jan) → family portrait sessions, year-in-review album, new year memories.
- Valentine's Day → couples session, proposal photography, love story series.
- Maternity and newborn → fleeting moments angle, book early, limited slots per month.
- Monsoon → dramatic sky, green backdrops, outdoor portrait opportunities.
Location signals:
- City-specific backdrops → iconic landmarks, heritage buildings, rooftop views as selling points.
- Studio setup → controlled lighting, multiple sets, indoor all-weather availability.
Service-specific signals:
- Corporate headshots → LinkedIn profile upgrade, team photo for website, professional branding.
- Product photography → ecommerce-ready, white background, multiple angles, lifestyle shots.
- Event photography → turnaround time, live photo booth, same-day gallery delivery as differentiators.`,

  INTERIOR_DESIGN: `City and space signals:
- Mumbai / Pune → small flat optimization, vastu compliance, smart storage, 1BHK/2BHK makeovers.
- Bangalore / Hyderabad → IT professional clientele, home office design, modern minimalist.
- Delhi / NCR → spacious villas, luxury upgrades, traditional meets contemporary.
- Chennai / Kolkata → heritage homes, courtyard layouts, traditional elements.
Property type signals:
- New construction → full interior package, modular kitchen, wardrobes, false ceiling.
- Renovation → before-after reveal, working within existing layout, budget-stretch ideas.
- Rental property → budget interior, removable/rental-friendly decor, quick turnaround.
- Commercial space → brand identity reflected in design, ergonomics, client-facing areas.
Vastu and preference signals:
- If vastu is mentioned → incorporate without being prescriptive (color direction, temple placement).
- If minimalist is mentioned → clean lines, neutral palette, clutter-free philosophy.
- If maximalist/eclectic → bold patterns, layered textures, personality-driven spaces.`,

  HOTEL: `Location and tourism signals:
- Hill station → weather update ("currently X°C, perfect for a weekend escape"), nature views.
- Beach destination → sunrise/sunset timings, water sports, monsoon or peak season context.
- City hotel → business travel (conference facilities, airport proximity), weekend leisure (city sightseeing).
- Heritage/palace hotel → history of the property, royal experience, unique architecture.
Seasonal signals:
- Peak season → limited rooms available, advance booking urgency, best rate now.
- Offseason → significant savings, uncrowded experience, deals for early bookers.
- Long weekends (India-specific) → Friday checkout to Monday, package price.
- Honeymoon season (Oct–Feb) → couple packages, candlelit dinner, private pool, surprise inclusions.
Guest segment signals:
- Business traveler → fast WiFi, work desk, laundry, early check-in/late check-out.
- Family → connecting rooms, kids club, babysitting, family breakfast included.
- Solo traveler → safety, community dining, guided tours, women-only floor if available.
- Group/MICE → conference hall capacity, AV setup, group dining, team building activities.`,

  JEWELRY: `Occasion signals:
- Wedding → bridal set, mother-of-the-bride, groom's accessories, matching couple jewelry.
- Dhanteras / Akshaya Tritiya → gold buying auspicious day, purity certification, making charge waiver.
- Anniversary → custom engraving, sentimental piece, milestone gift ideas.
- Valentine's Day → gifting guide by budget, couples jewelry, proposal ring focus.
- Baby shower / Naming ceremony → first gold gift, small bangles, nose pin tradition.
Metal and material signals:
- Gold (22K/24K) → purity certification (BIS hallmark), making charges, weight-based pricing transparency.
- Diamond → certification (GIA/IGI), 4C explanation (cut, clarity, color, carat) simplified for buyer.
- Silver → trending oxidized, contemporary designs, affordable luxury angle.
- Kundan / Polki → heritage craftsmanship, bridal collection, artisan story.
Customer signals:
- First-time buyer → education on purity, certification, what to look for.
- Returning customer → loyalty, new collection preview, custom order.
- Gifter → gifting guide format, price points, packaging, easy return.`,
};

// ─── Content Matrix prompt ────────────────────────────────────────────────────

export function CONTENT_MATRIX_PROMPT(workspaceType: string): string {
  return `You are a social media content strategist specializing in ${workspaceType} businesses.
Create a comprehensive 30-day content calendar matrix.
Return ONLY valid JSON.`;
}

export const CONTENT_MATRIX_USER_PROMPT = (business: string, scraped: any) => `
Create a 30-day content matrix for: ${business}
Services: ${JSON.stringify(scraped.services)}
Offers: ${JSON.stringify(scraped.offers)}
Products: ${JSON.stringify(scraped.products)}

Return JSON with:
{
  "reels": [10 objects: { "day": number, "topic": string, "hook": string, "angle": string }],
  "posts": [20 objects: { "day": number, "topic": string, "caption_idea": string, "type": "educational|promotional|social_proof|entertainment" }],
  "themes": ["week1_theme", "week2_theme", "week3_theme", "week4_theme"]
}`;

// ─── Music genre mapping ──────────────────────────────────────────────────────

export const WORKSPACE_MUSIC_GENRES: Record<string, string> = {
  RESTAURANT: "upbeat food cooking acoustic",
  REAL_ESTATE: "luxury elegant cinematic",
  ECOMMERCE: "upbeat trendy commercial",
  CREATOR: "trending viral upbeat",
  BUSINESS_SERVICES: "corporate professional motivational",
  EVENTS: "energetic party club",
  EDUCATION: "inspirational motivational acoustic",
  PERSONAL: "emotional heartwarming family sentimental",
  FITNESS_GYM: "high energy workout motivational hip hop",
  SALON_SPA: "relaxing spa ambient lounge",
  FASHION: "trendy stylish runway electronic",
  TRAVEL: "adventure world music cinematic travel",
  HEALTHCARE: "calm trustworthy gentle piano",
  AUTOMOBILE: "powerful cinematic driving action",
  PHOTOGRAPHY: "emotional ambient cinematic storytelling",
  INTERIOR_DESIGN: "elegant sophisticated ambient lounge",
  HOTEL: "luxury ambient relaxing lounge",
  JEWELRY: "elegant romantic orchestral timeless",
};

// ─── Workspace quick-action commands ──────────────────────────────────────────

export const WORKSPACE_QUICK_ACTIONS: Record<string, Record<string, { label: string; prompt: string; contentType: string }>> = {
  RESTAURANT: {
    SPECIAL:     { label: "Today's Special", prompt: "Create a mouth-watering daily special announcement for today's featured dish", contentType: "REEL" },
    RECIPE:      { label: "Recipe Reveal", prompt: "Create a recipe reveal reel — behind-the-scenes how we make our signature dish, end with a CTA to visit", contentType: "REEL" },
    REVIEW:      { label: "Customer Review", prompt: "Turn a glowing customer review into a social proof testimonial reel — focus on the emotion and authenticity of real feedback, end with CTA to try it", contentType: "POST" },
    OFFER:       { label: "Limited Offer", prompt: "Create urgent limited-time offer post — 20% off, today only, creates FOMO", contentType: "POST" },
    EVENT:       { label: "Dine-in Event", prompt: "Announce a special dining event — live music, themed night, or holiday special", contentType: "REEL" },
    STAFF:       { label: "Chef Spotlight", prompt: "Introduce our chef/team member — their story, passion for food, signature dish", contentType: "REEL" },
    CHEF:        { label: "Chef Story", prompt: "Create a chef origin story reel — how they got into cooking, their training, their philosophy, and the dish they're most proud of. Make it personal and inspiring.", contentType: "REEL" },
  },
  REAL_ESTATE: {
    LISTED:      { label: "Just Listed", prompt: "Create an exciting new listing announcement — highlight best features, price, location, call to DM", contentType: "REEL" },
    SOLD:        { label: "Just Sold", prompt: "Create a 'just sold' social proof post — celebrate the sale, thank the client, show credibility", contentType: "POST" },
    OPENHOUSE:   { label: "Open House", prompt: "Create an open house invitation — date, time, property highlights, register to attend CTA", contentType: "REEL" },
    TIPS:        { label: "Buyer Tips", prompt: "Create educational home buying tips reel — 3 things first-time buyers must know, position as trusted expert", contentType: "REEL" },
    MARKET:      { label: "Market Update", prompt: "Create a weekly real estate market update — prices, trends, why now is a good time, expert insight", contentType: "POST" },
    TOUR:        { label: "Virtual Tour", prompt: "Script a virtual property tour — walk through each room, highlight unique features, end with viewing CTA", contentType: "REEL" },
  },
  ECOMMERCE: {
    DROP:        { label: "New Arrival", prompt: "Create a new product drop announcement — hype, exclusivity, limited stock, shop now CTA", contentType: "REEL" },
    SALE:        { label: "Flash Sale", prompt: "Create an urgent flash sale post — X% off, ends in 24 hours, massive FOMO, link in bio CTA", contentType: "POST" },
    REVIEW:      { label: "Customer Review", prompt: "Turn a customer review into a UGC-style testimonial reel — before/after, real result, shop link CTA", contentType: "REEL" },
    BUNDLE:      { label: "Bundle Deal", prompt: "Create a bundle deal promotion — better value, save X amount, gift-worthy, limited time offer", contentType: "POST" },
    UNBOXING:    { label: "Unboxing Reel", prompt: "Create an unboxing-style product reveal reel — suspense, reveal, features, customer reaction angle", contentType: "REEL" },
    HOWTO:       { label: "How To Use", prompt: "Create a how-to product demo reel — problem → our product → result, practical and shareable", contentType: "REEL" },
  },
  CREATOR: {
    COLLAB:      { label: "Collab Announce", prompt: "Announce an exciting creator collaboration — who, what, why excited, follow for the drop", contentType: "REEL" },
    MILESTONE:   { label: "Milestone", prompt: "Celebrate a follower/view milestone — thank the community, behind-the-scenes, what's coming next", contentType: "REEL" },
    DAYTIME:     { label: "Day in My Life", prompt: "Script a 'day in my life' creator reel — morning routine, content creation, relatable moments", contentType: "REEL" },
    TIPS:        { label: "Creator Tips", prompt: "Share 3 content creation tips nobody talks about — value-first, establish expertise, save-worthy format", contentType: "REEL" },
    REACTION:    { label: "Trend React", prompt: "React to a trending topic in my niche — strong opinion, takes a side, designed to spark comments", contentType: "REEL" },
    BRANDDEAL:   { label: "Brand Deal", prompt: "Create a natural-feeling brand integration reel — authentic, value-first, disclosure included, not salesy", contentType: "REEL" },
    CHALLENGE:   { label: "Launch Challenge", prompt: "Launch a 7-day community challenge in my niche — announce the challenge name, simple daily action, how followers join (hashtag + tag), what winner gets, why it's worth 7 days of their time", contentType: "REEL" },
  },
  BUSINESS_SERVICES: {
    CASESTUDY:   { label: "Client Win", prompt: "Create a client case study reel — problem, approach, result with specific numbers, book a call CTA", contentType: "REEL" },
    TIPS:        { label: "Weekly Tip", prompt: "Share one powerful business tip — specific, actionable, positions as expert, save-worthy content", contentType: "POST" },
    TEAM:        { label: "Team Intro", prompt: "Introduce a team member — their expertise, personality, role, builds trust and human connection", contentType: "REEL" },
    FAQ:         { label: "FAQ Answer", prompt: "Answer the most common question clients ask — educate, remove objections, book consultation CTA", contentType: "REEL" },
    AWARD:       { label: "Award/PR", prompt: "Announce a milestone, award, or press mention — celebrate, thank team and clients, builds authority", contentType: "POST" },
    LEAD:        { label: "Lead Magnet", prompt: "Promote a free resource, checklist, or guide — value-first, DM to receive, lead generation focused", contentType: "POST" },
  },
  EVENTS: {
    ANNOUNCE:    { label: "Event Launch", prompt: "Create an exciting event launch announcement — headline act, date, venue, early bird tickets, FOMO", contentType: "REEL" },
    COUNTDOWN:   { label: "Countdown", prompt: "Create a countdown post for the upcoming event — urgency, last X tickets, what to expect, book now", contentType: "POST" },
    SPEAKER:     { label: "Speaker Reveal", prompt: "Reveal a speaker or performer — hype them up, their credentials, why people can't miss them", contentType: "REEL" },
    RECAP:       { label: "Event Recap", prompt: "Create a post-event highlight recap — energy, crowd, best moments, date announcement for next event", contentType: "REEL" },
    BEHINDSCENE: { label: "Setup BTS", prompt: "Behind-the-scenes event setup content — the effort that goes in, builds excitement and appreciation", contentType: "REEL" },
    TESTIMONIAL: { label: "Attendee Love", prompt: "Share attendee testimonials and reactions — social proof, FOMO for next event, community vibe", contentType: "POST" },
  },
  EDUCATION: {
    PREVIEW:     { label: "Course Preview", prompt: "Create a course/workshop preview reel — what they'll learn, transformation promise, enroll CTA", contentType: "REEL" },
    SUCCESS:     { label: "Student Win", prompt: "Share a student success story — before state, after result with numbers, this could be you CTA", contentType: "REEL" },
    LESSON:      { label: "Free Lesson", prompt: "Give away one valuable lesson or tip for free — establish authority, create curiosity for the full course", contentType: "REEL" },
    DEADLINE:    { label: "Enrollment Deadline", prompt: "Create urgency around enrollment deadline — last X seats, closes in X days, what they'll miss out on", contentType: "POST" },
    MYTH:        { label: "Myth vs Fact", prompt: "Bust a common myth in your subject area — contrarian, saves-worthy, expert authority format", contentType: "REEL" },
    LIVE:        { label: "Live Class Invite", prompt: "Invite followers to a free live class/webinar — value preview, date/time, register link CTA", contentType: "POST" },
    CHALLENGE:   { label: "Learning Challenge", prompt: "Launch a 30-day learning challenge — announce the skill being built, one micro-action per day, community hashtag, what students achieve by day 30. Make joining feel easy and the outcome feel transformative.", contentType: "REEL" },
  },
  PERSONAL: {
    BIRTHDAY:    { label: "Birthday Reel", prompt: "Create a heartwarming birthday celebration reel — warm wishes, memories, love and appreciation, celebratory tone", contentType: "REEL" },
    ANNIVERSARY: { label: "Anniversary", prompt: "Create a beautiful anniversary post — love story, years together, gratitude, warm and romantic tone", contentType: "POST" },
    BABY:        { label: "Baby Milestone", prompt: "Create an adorable baby milestone reel — first steps/words/birthday, proud parent emotion, share the joy", contentType: "REEL" },
    TRAVEL:      { label: "Travel Memory", prompt: "Create a beautiful travel memory reel — destination highlights, feelings, people, wanderlust inspiration", contentType: "REEL" },
    STATUS:      { label: "WhatsApp Status", prompt: "Create a short, beautiful WhatsApp status — uplifting quote, personal moment, or family memory, 30 seconds max", contentType: "STORY" },
    KIDS:        { label: "Kids Achievement", prompt: "Celebrate a child's achievement — first day of school, sports win, academic result, parent pride and joy", contentType: "REEL" },
    FRIENDSHIP:  { label: "Friend Appreciation", prompt: "Create a heartwarming friendship appreciation post — inside jokes, memories, loyalty, tagged-worthy content", contentType: "POST" },
    FESTIVAL:    { label: "Festival Wishes", prompt: "Create beautiful personal festival wishes content — warm, personal, family-focused, festive joy", contentType: "REEL" },
    SELFIE:      { label: "Selfie Caption", prompt: "Write a short, confident, and fun selfie caption — relatable, emoji-friendly, something followers will like and comment on. Not cringe, not corporate. Just a real person having a good day.", contentType: "POST" },
  },

  FITNESS_GYM: {
    TRANSFORMATION: { label: "Client Transformation", prompt: "Create a powerful client transformation reel — before state (struggle/pain point), the decision to join, the journey (key habits and effort), the result (use [SPECIFY] for any numbers not provided), invite others to start. Add: 'Results vary. Consult a professional before starting any fitness programme.'", contentType: "REEL" },
    CLASSREEL:      { label: "Class in Action", prompt: "Create a high-energy group class reel — show the energy, the instructor, the community, end with a spots-available CTA", contentType: "REEL" },
    MEMBERSHIP:     { label: "Membership Drive", prompt: "Create a membership offer reel — what members get, the community, the transformation they work toward, new member deal CTA. Never promise specific results.", contentType: "REEL" },
    TIPSREEL:       { label: "Fitness Tip", prompt: "Share one powerful workout or nutrition tip — specific, actionable, science-backed feel, no false health claims. Establish trainer authority, end with follow CTA.", contentType: "REEL" },
    CHALLENGE:      { label: "30-Day Challenge", prompt: "Launch a 30-day fitness challenge — announce the challenge name, one daily micro-action, community hashtag, how to join, what participants work toward by day 30. Never promise specific weight-loss outcomes. Make it feel exciting and achievable.", contentType: "REEL" },
    TESTIMONIAL:    { label: "Member Story", prompt: "Create a member testimonial reel — their personal journey, the obstacles they overcame, the role the gym played, their experience (not fabricated results). Warm, human, inspiring.", contentType: "REEL" },
  },

  SALON_SPA: {
    TRANSFORMATION: { label: "Glow-Up Reveal", prompt: "Create a before/after transformation reel for a hair, skin, or nail service — the initial state, the process, the reveal, the client's reaction. Sensory and aspirational. No medical outcome claims.", contentType: "REEL" },
    SERVICES:       { label: "Service Spotlight", prompt: "Spotlight one signature service — what it is, how it feels, the experience from booking to leaving, end with a book-now CTA. Luxurious and inviting tone.", contentType: "REEL" },
    BOOKINGDRIVE:   { label: "Booking Push", prompt: "Create a booking promotion post — availability opening soon, what clients experience, urgency, DM to book CTA", contentType: "POST" },
    BEHINDSCENE:    { label: "BTS — Our Team", prompt: "Behind-the-scenes reel of the salon/spa team at work — the craft, the care, the precision, the human connection. Builds trust and shows expertise.", contentType: "REEL" },
    SELFCARE:       { label: "Self-Care Tip", prompt: "Share one professional self-care tip clients can do at home — positions salon as an expert authority, ends with 'For a deeper treatment, book with us'", contentType: "REEL" },
    SEASONAL:       { label: "Seasonal Promo", prompt: "Create a seasonal promotion announcement — limited-time offer, what's included, why this season is the right time, urgent booking CTA. Never fabricate prices — use [SPECIFY: price].", contentType: "POST" },
  },

  FASHION: {
    NEWDROP:        { label: "New Collection Drop", prompt: "Create a new collection drop reel — the aesthetic, the vibe, the standout pieces, limited availability CTA. Style-forward and aspirational. Never fabricate fabric claims or sizing accuracy.", contentType: "REEL" },
    OUTFITINSPO:    { label: "Outfit Inspiration", prompt: "Create an outfit inspiration reel — one complete look, how to style it, why this combination works, where to shop CTA", contentType: "REEL" },
    SALEDROP:       { label: "Sale Announcement", prompt: "Create a sale/offer announcement — urgency, what's on offer, discount if provided, shop-now CTA. No misleading claims.", contentType: "POST" },
    TRENDING:       { label: "Trend Alert", prompt: "Create a trend alert reel — the trend taking over this season, how to wear it, your collection's take on it, shop CTA", contentType: "REEL" },
    BEHINDSCENE:    { label: "Behind the Label", prompt: "Behind-the-scenes reel of how a piece is made or designed — the craft, the decisions, the detail. Builds brand equity and trust.", contentType: "REEL" },
    STYLING:        { label: "Styling Masterclass", prompt: "One outfit, three different ways to style it — educational, save-worthy, positions brand as a fashion authority", contentType: "REEL" },
  },

  TRAVEL: {
    DESTINATIONDROP: { label: "Destination Reveal", prompt: "Create a destination reveal reel — tease the location in the hook, reveal it, show the must-see highlights, end with a package or booking CTA. Use [SPECIFY] for any pricing not provided.", contentType: "REEL" },
    PACKAGEPROMO:    { label: "Package Deal", prompt: "Create a travel package promotion — destination, inclusions (only what user provided), what makes this package different, book-now urgency. Add: 'Terms apply. Contact for current pricing.'", contentType: "REEL" },
    TRAVELTIP:       { label: "Travel Tip", prompt: "Share one specific travel tip for a destination or travel style — practical, insider knowledge feel, ends with 'Let us plan your trip'", contentType: "REEL" },
    RECAP:           { label: "Trip Recap", prompt: "Create a post-trip client recap reel — the destination, the highlights, a real guest moment, ends with next departure CTA", contentType: "REEL" },
    SEASONAL:        { label: "Best Season to Visit", prompt: "Create seasonal travel guide content — best time to visit a destination, why, what's special about that season, book before it fills CTA", contentType: "POST" },
    HIDDEN:          { label: "Hidden Gem", prompt: "Reveal a lesser-known destination or experience — hook with the surprise, show what makes it special, why most tourists miss it, book CTA", contentType: "REEL" },
  },

  HEALTHCARE: {
    AWARENESS:      { label: "Health Awareness", prompt: "Create health awareness content about a specific condition or topic — educate about symptoms or prevention, who should get checked, the clinic's expertise in this area. Add: 'Consult a qualified healthcare professional for personalised advice.' Never make diagnostic claims.", contentType: "REEL" },
    MYTHBUST:       { label: "Myth vs Fact", prompt: "Bust a common health myth — clear, direct, evidence-informed tone. State the myth, correct it, explain the reality simply. Builds expert credibility.", contentType: "REEL" },
    DOCTORTIP:      { label: "Doctor's Tip", prompt: "Share one practical health or wellness tip from the clinic's area of expertise — actionable, accessible, builds patient trust. Add standard healthcare disclaimer.", contentType: "REEL" },
    APPOINTMENT:    { label: "Book Appointment", prompt: "Create an appointment availability post — which specialties are available, days/times if provided, how to book, why early action matters. No diagnosis or outcome promises.", contentType: "POST" },
    PATIENTSTORY:   { label: "Patient Journey", prompt: "Share a patient journey (no names unless provided) — the concern that brought them in, the consultation experience, the guidance received, their feeling after. Warm and trust-building. Add appropriate disclaimer.", contentType: "REEL" },
    WELLNESS:       { label: "Wellness Reminder", prompt: "Create a wellness reminder post — a simple habit, check-up reminder, or preventive action most people delay. Caring tone, ends with clinic contact CTA.", contentType: "POST" },
  },

  AUTOMOBILE: {
    VEHICLELAUNCH:  { label: "Vehicle Showcase", prompt: "Create a vehicle showcase reel — exterior design, interior highlights, key features (from user details only — never invent mileage or safety ratings), drive experience, contact/test drive CTA. Add: 'Prices subject to change. Contact dealership for current offers.'", contentType: "REEL" },
    TESTDRIVE:      { label: "Test Drive CTA", prompt: "Create a test drive invitation — the experience of driving this vehicle, what customers say (use [SPECIFY: client quote] placeholder), weekend availability, book-a-test-drive CTA", contentType: "POST" },
    SERVICEPROMO:   { label: "Service Special", prompt: "Create a service centre promotion — what's on offer (free inspection, monsoon check, AC service), limited period offer, book now CTA. Only use details provided — never invent prices.", contentType: "POST" },
    COMPARISON:     { label: "Why Choose Us", prompt: "Create a 'why choose this vehicle / our dealership' reel — genuine differentiators (only those provided by user), customer experience, trust signals, CTA", contentType: "REEL" },
    DELIVERY:       { label: "Vehicle Delivery", prompt: "Celebrate a customer delivery moment — the excitement, the handover, the new ownership feeling, invite others to experience it. Use [SPECIFY: customer name] placeholder for consent.", contentType: "REEL" },
    TIPS:           { label: "Maintenance Tip", prompt: "Share one vehicle maintenance tip — simple, practical, positions dealership as a trusted expert, ends with service booking CTA", contentType: "REEL" },
  },

  PHOTOGRAPHY: {
    PORTFOLIOREEL:  { label: "Portfolio Showcase", prompt: "Create a portfolio showcase reel — best work across shoot types (from user's description), the emotion captured, the photographer's perspective and artistry. Ends with booking CTA.", contentType: "REEL" },
    BEHINDLENS:     { label: "Behind the Lens", prompt: "Behind-the-scenes reel of a shoot day — the preparation, the direction, the unexpected moments, the final frame. Builds trust and shows expertise.", contentType: "REEL" },
    BOOKINGOPEN:    { label: "Bookings Open", prompt: "Create a bookings announcement — which dates/months are open, which types of shoots are available, packages if provided (use [SPECIFY: price] for unconfirmed prices), how to inquire", contentType: "POST" },
    CLIENTLOVE:     { label: "Client Reaction", prompt: "Create a client testimonial reel — the shoot they booked, the experience, their genuine reaction to seeing the photos. Use [SPECIFY: client name and quote] — never fabricate.", contentType: "REEL" },
    TIPSREEL:       { label: "Photography Tip", prompt: "Share one photography or portrait tip for clients — how to pose, what to wear, best time of day. Positions photographer as expert and makes clients feel prepared.", contentType: "REEL" },
    SEASONAL:       { label: "Seasonal Campaign", prompt: "Create a seasonal shoot campaign — festive/wedding/maternity season, special package if provided, limited slots urgency, book early CTA", contentType: "REEL" },
  },

  INTERIOR_DESIGN: {
    PROJECTREVEAL:  { label: "Project Reveal", prompt: "Create a project reveal reel — before/after transformation, the design challenge, the solution, the standout decisions. Never invent material brands or project costs. End with inquire/contact CTA.", contentType: "REEL" },
    DESIGNTIP:      { label: "Design Tip", prompt: "Share one interior design or space optimisation tip — practical, specific, shows expertise. Ends with 'Book a consultation to transform your space'", contentType: "REEL" },
    STYLEINSPO:     { label: "Style Inspiration", prompt: "Create a design style inspiration reel — one aesthetic (Japandi, maximalist, coastal, etc.), how to achieve key elements, your studio's take on it", contentType: "REEL" },
    BEHINDSCENE:    { label: "Studio Process", prompt: "Behind-the-scenes of the design process — mood boarding, material selection, client walkthrough, installation day. Builds trust and shows professionalism.", contentType: "REEL" },
    CLIENTSTORY:    { label: "Client Story", prompt: "Tell a client's space transformation story — the brief they came with, the challenge of the space, the design approach, their reaction at handover. Use [SPECIFY: client name] unless confirmed. Warm and aspirational.", contentType: "REEL" },
    CONSULTATION:   { label: "Book Consultation", prompt: "Create a consultation offer post — what happens in a design consultation, what clients walk away with, fee if provided (use [SPECIFY: fee] if not), how to book", contentType: "POST" },
  },

  HOTEL: {
    ROOMREVEAL:     { label: "Room/Suite Reveal", prompt: "Create a room or suite reveal reel — check-in experience, what guests discover, the standout amenities, the feeling of being there. Add: 'Rates subject to availability. Terms apply.'", contentType: "REEL" },
    EXPERIENCEPOST: { label: "Guest Experience", prompt: "Create an experience showcase reel — one signature hotel experience (breakfast, pool, spa, rooftop), the sensory details, why guests keep coming back", contentType: "REEL" },
    PACKAGEDEAL:    { label: "Package Offer", prompt: "Create a hotel package promotion — package name, inclusions, price if provided (use [SPECIFY: price] if not), availability, direct booking CTA. Add: 'Rates subject to availability.'", contentType: "POST" },
    GUESTSTORY:     { label: "Guest Moment", prompt: "Create a guest story reel — an anniversary, honeymoon, or birthday celebration the hotel was part of. Use [SPECIFY: guest name] unless provided. Emotional and aspirational.", contentType: "REEL" },
    SEASONAL:       { label: "Seasonal Offer", prompt: "Create a seasonal or festival offer post — what makes this season special at the property, the experience, limited rooms/packages, book-now urgency", contentType: "POST" },
    BEHINDSCENE:    { label: "Our Team at Work", prompt: "Behind-the-scenes reel of the hotel team — chefs, housekeeping, front desk. Shows the care behind hospitality. Builds guest trust and loyalty.", contentType: "REEL" },
  },

  JEWELRY: {
    COLLECTIONLAUNCH: { label: "Collection Launch", prompt: "Create a jewelry collection launch reel — the story behind the collection, standout pieces, craftsmanship detail, gifting/occasion angle. Never invent carat weights or certifications — use [SPECIFY: detail]. Ends with shop/inquire CTA.", contentType: "REEL" },
    PIECEREVEAL:      { label: "Single Piece Reveal", prompt: "Reveal a single piece of jewelry — the design story, the craftsmanship, who it's made for, the emotion it carries. Close-up, intimate, beautiful. Mark any unconfirmed specs as [SPECIFY: detail].", contentType: "REEL" },
    GIFTING:          { label: "Gift Guide", prompt: "Create a jewelry gifting guide — occasion (anniversary, birthday, wedding), which pieces suit which moment, budget range if provided. Emotional and aspirational.", contentType: "REEL" },
    CUSTOMMADE:       { label: "Custom Jewelry Story", prompt: "Tell the story of a custom piece — the client's vision, the design process, the craftsmanship, the reveal moment. Use [SPECIFY: client name] unless provided. Never invent gem grades or metal specs.", contentType: "REEL" },
    CAREOFTIP:        { label: "Jewelry Care Tip", prompt: "Share one practical jewelry care tip — specific, professional, makes clients trust the brand. Ends with 'Bring it in for a professional clean and check'", contentType: "POST" },
    BRIDALJEWELRY:    { label: "Bridal Collection", prompt: "Create bridal jewelry content — the emotion of choosing wedding jewelry, the collection's highlights, the family heirloom angle, consultation CTA. Timeless and emotionally rich.", contentType: "REEL" },
  },
};

// ─── Series prompt builder ────────────────────────────────────────────────────

export function buildSeriesPrompt(topic: string, part: number, totalParts: number, workspaceType: string): string {
  return `Create part ${part} of ${totalParts} of a content series about: "${topic}"
Business type: ${workspaceType}

This is a SERIES — each part must:
- Reference it's part ${part} of ${totalParts} in the hook
- Stand alone but make viewers want the next part
- End with "Follow for part ${part + 1 <= totalParts ? part + 1 : "the finale"}"
${part === 1 ? "- Introduce the series, set up the journey" : ""}
${part === totalParts ? "- This is the FINALE — deliver the biggest value, strong CTA" : ""}

Return same JSON structure as standard content generation.`;
}

// ─── Caption-only prompt ──────────────────────────────────────────────────────

export function buildCaptionOnlyPrompt(description: string, workspaceType: string, platform: string = "instagram"): string {
  return `Write a ${platform} caption for this content:
Business type: ${workspaceType}
Content description: ${description}

Requirements:
- Hook in first line (no hashtags in first line)
- 150-220 characters max
- 15-20 relevant hashtags
- Strong CTA at end
- Platform: ${platform}

Return JSON: { "caption": "...", "hashtags": ["tag1", ...], "cta": "..." }`;
}

// ─── Repurpose prompt ─────────────────────────────────────────────────────────

export function buildRepurposePrompt(originalContent: { hook: string; caption: string; script: string }, workspaceType: string): string {
  return `Repurpose this content into 3 different formats for ${workspaceType}:

Original hook: "${originalContent.hook}"
Original caption: "${originalContent.caption}"
Original script: "${originalContent.script}"

Create:
1. Instagram Story version (5-7 words, punchy, swipe-up angle)
2. LinkedIn/Facebook version (professional tone, longer caption, thought leadership)
3. Short text post/tweet version (under 280 chars, high-impact)

Return JSON: {
  "story": { "text": "...", "cta": "..." },
  "linkedin": { "caption": "...", "hashtags": [...] },
  "tweet": "..."
}`;
}

// ─── WhatsApp broadcast message prompt ───────────────────────────────────────

export function buildBroadcastPrompt(topic: string, workspaceType: string): string {
  return `Write a WhatsApp broadcast message for a ${workspaceType} business about: "${topic}"

Rules:
- Conversational, direct, not corporate
- Opens with greeting or attention hook
- Max 3 short paragraphs
- Clear CTA (call, visit, reply, DM)
- No HTML, no asterisks for formatting
- Feel like a message from a real person, not a brand newsletter

Return JSON: { "message": "full WhatsApp message text", "cta": "what you want them to do" }`;
}

// ─── Ad copy prompt ───────────────────────────────────────────────────────────

export function buildAdCopyPrompt(topic: string, workspaceType: string): string {
  return `Write Facebook/Instagram ad copy for a ${workspaceType} business: "${topic}"

Return 3 ad variants (short, medium, long):
- Short: headline + 2-line body + CTA (for story/banner ads)
- Medium: hook + 3-4 line body + CTA (for feed ads)
- Long: story-style copy, problem-agitate-solution, 100-150 words + CTA (for traffic/conversion campaigns)

Return JSON: {
  "short": { "headline": "...", "body": "...", "cta": "..." },
  "medium": { "headline": "...", "body": "...", "cta": "..." },
  "long": { "headline": "...", "body": "...", "cta": "..." }
}`;
}

// ─── 7-day content calendar prompt ───────────────────────────────────────────

export function buildWeeklyCalendarPrompt(workspaceType: string, goal?: string): string {
  return `Create a 7-day social media content calendar for a ${workspaceType} business.
${goal ? `Goal this week: ${goal}` : ""}

Each day should have a different content type and angle to keep the audience engaged.
Mix: educational, promotional, social proof, behind-the-scenes, engagement.

Return JSON: {
  "week_theme": "one sentence theme for the week",
  "days": [
    {
      "day": "Monday",
      "content_type": "Reel/Post/Story/Carousel",
      "hook": "first line/hook text",
      "topic": "what it's about",
      "angle": "why this resonates",
      "best_time": "9am/12pm/6pm/8pm"
    }
    ... (7 days total)
  ],
  "tip": "one actionable tip to maximize this week's reach"
}`;
}

// ─── Hashtag strategy prompt ──────────────────────────────────────────────────

export function buildHashtagsPrompt(topic: string, workspaceType: string): string {
  return `Generate a strategic hashtag set for a ${workspaceType} business post about: "${topic}"

Create a mix of:
- 5 large hashtags (1M+ posts) — reach
- 10 medium hashtags (100K-1M posts) — targeted reach
- 10 niche hashtags (10K-100K posts) — community
- 5 micro hashtags (<10K posts) — high engagement

Return JSON: {
  "strategy": "one sentence on the hashtag strategy",
  "large": ["tag1", ...],
  "medium": ["tag1", ...],
  "niche": ["tag1", ...],
  "micro": ["tag1", ...],
  "ready_to_paste": "all 30 hashtags in one block with # symbols"
}`;
}

// ─── Social bio optimization prompt ───────────────────────────────────────────

export function buildBioPrompt(currentBio: string, workspaceType: string): string {
  return `Rewrite this ${workspaceType} social media bio to be more compelling:
Current bio: "${currentBio}"

Requirements:
- Instagram: max 150 chars, line breaks, emojis, clear value prop, CTA
- Twitter/X: max 160 chars, personality + credibility
- LinkedIn: professional tone, achievement-led, industry keywords
- WhatsApp Business: conversational, services + contact prompt

Return JSON: {
  "instagram": "rewritten bio with line breaks using \\n",
  "twitter": "twitter bio",
  "linkedin": "linkedin about first 2 lines (preview)",
  "whatsapp": "whatsapp business description",
  "tip": "one tip to improve their profile further"
}`;
}

// ─── Poll and engagement question prompt ─────────────────────────────────────

export function buildPollPrompt(topic: string, workspaceType: string): string {
  return `Create 5 engaging poll and question ideas for a ${workspaceType} business about: "${topic}"

Types to include:
- This or That poll
- Would you rather poll
- Opinion question (designed to get comments)
- Fill in the blank
- Rate this (1-10)

Return JSON: {
  "polls": [
    { "type": "This or That", "question": "...", "option_a": "...", "option_b": "..." },
    { "type": "Would You Rather", "question": "...", "option_a": "...", "option_b": "..." },
    { "type": "Opinion", "question": "..." },
    { "type": "Fill in the Blank", "prompt": "..." },
    { "type": "Rate This", "question": "...", "context": "..." }
  ]
}`;
}

// ─── Comment reply suggestions prompt ────────────────────────────────────────

export function buildCommentReplyPrompt(comment: string, workspaceType: string): string {
  return `Write 3 reply options for this comment on a ${workspaceType} business post:

Comment: "${comment}"

Provide 3 reply styles:
1. Short & warm (1-2 lines, personal, emoji)
2. Informative (answers the comment, adds value, includes CTA)
3. Witty/engaging (designed to spark more conversation)

Return JSON: {
  "short": "short warm reply",
  "informative": "longer helpful reply",
  "witty": "engaging witty reply",
  "tip": "best time to reply for maximum visibility"
}`;
}

// ─── Translation prompt ───────────────────────────────────────────────────────

export function buildTranslationPrompt(content: { caption: string; hook: string; hashtags: string[] }, targetLanguage: string): string {
  return `Translate and localize this social media content to ${targetLanguage}.
Don't just translate — adapt it to feel natural and culturally relevant for ${targetLanguage} speakers.

Hook: "${content.hook}"
Caption: "${content.caption}"
Hashtags: ${content.hashtags.join(", ")}

Return JSON: {
  "hook": "translated hook",
  "caption": "translated + localized caption",
  "hashtags": ["local hashtags in target language"],
  "note": "any cultural adaptation note"
}`;
}

// ─── Quote card prompt ────────────────────────────────────────────────────────

export function buildQuotePrompt(text: string, workspaceType: string): string {
  return `Create a beautiful quote card for a ${workspaceType} business based on this idea: "${text}"

Make the quote powerful, shareable, and relevant to the ${workspaceType} audience.

Return JSON: {
  "quote": "the polished quote (max 15 words, punchy and memorable)",
  "author": "attribution (can be the business name, or a general attribution like 'On life' or blank if original)",
  "style": "one of: minimal_dark, bold_gradient, elegant_white, neon_glow, warm_cream",
  "caption": "Instagram caption for this quote (2-3 lines + hashtags)"
}`;
}

// ─── Thumbnail prompt ─────────────────────────────────────────────────────────

export function buildThumbnailPrompt(title: string, workspaceType: string): string {
  return `Design a YouTube/Reels thumbnail for a ${workspaceType} video titled: "${title}"

Return JSON: {
  "title": "thumbnail headline (max 6 words, ALL CAPS, high contrast)",
  "subtitle": "supporting text (max 8 words)",
  "style": "one of: red_bold, dark_pro, bright_pop, minimal_clean, fire_gradient",
  "emoji": "1-2 relevant emojis to use",
  "text_color": "hex color that pops on the style background",
  "bg_color": "background hex color",
  "tip": "what visual element or expression would make this click-worthy"
}`;
}

// ─── Full script prompt ───────────────────────────────────────────────────────

export function buildScriptPrompt(topic: string, workspaceType: string): string {
  return `Write a complete, ready-to-film short-form video script for a ${workspaceType} business about: "${topic}"

Format the script exactly like this (ready to read from teleprompter):

[HOOK - 0:00-0:03]
(The attention-grabbing opening line, 1 sentence)

[INTRO - 0:03-0:08]
(Brief context setup, 2-3 sentences)

[MAIN CONTENT - 0:08-0:35]
Point 1: ...
Point 2: ...
Point 3: ...

[HOOK CALLBACK - 0:35-0:42]
(Bring back the opening hook, deliver the payoff)

[CTA - 0:42-0:50]
(Clear call to action)

CAPTION: [Instagram caption for this video]
HASHTAGS: [15 relevant hashtags]
BEST TIME TO POST: [optimal posting time for ${workspaceType}]

Make it conversational, punchy, and exactly 45-60 seconds when spoken at normal pace.`;
}

// ─── Email marketing copy prompt ──────────────────────────────────────────────

export function buildEmailPrompt(topic: string, workspaceType: string): string {
  return `Write a high-converting email marketing copy for a ${workspaceType} business about: "${topic}"

Return JSON: {
  "subject": "email subject line (curiosity-driven, max 50 chars)",
  "preview": "preview text shown in inbox (max 90 chars, complements subject)",
  "body": "full email body (3-4 paragraphs, conversational tone, benefits-focused, story element)",
  "cta": "call-to-action button text (3-5 words)",
  "ps": "P.S. line (add urgency or extra value)"
}

Make it feel human, not corporate. Open rate goal: 40%+. Click rate goal: 5%+.`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CATEGORY-SPECIFIC POWER COMMANDS
// ═══════════════════════════════════════════════════════════════════════════════

// ─── REAL ESTATE ──────────────────────────────────────────────────────────────

export function buildPropertySuitePrompt(details: string, language = "English"): string {
  return `You are a real estate content specialist. Generate a COMPLETE content suite using ONLY the details provided.

Property details: "${details}"
Output language: ${language}

COMPLIANCE RULES:
- Use ONLY the specifications provided. Never invent sqft, parking, floor numbers, or amenities not mentioned.
- For any detail not provided, write [SPECIFY: detail] — e.g. "[SPECIFY: total sqft]"
- Never claim "best", "#1", "award-winning" without evidence provided.
- Always end property description with: "Details subject to verification. Contact agent for current information."
- Never fabricate yield percentages or rental income projections.

Return JSON with ALL of these:
{
  "listing_reel": {
    "hook": "attention-grabbing 0-3 second hook using only confirmed details",
    "script": "30-second walkthrough script using only provided details — use [SPECIFY: detail] for gaps",
    "caption": "Instagram caption with emojis — facts only",
    "hashtags": ["20 property hashtags"]
  },
  "property_description": {
    "headline": "Property listing headline (compelling, max 12 words, facts only)",
    "full_description": "150-word professional property description using only provided details. End with: Details subject to verification.",
    "key_features": ["bullet-point highlights — only confirmed features"],
    "cta": "Call to action"
  },
  "whatsapp_broadcast": "WhatsApp broadcast message (conversational, facts only, 3 short paragraphs)",
  "story_set": [
    {"slide": 1, "text": "hook slide text"},
    {"slide": 2, "text": "features slide — confirmed features only"},
    {"slide": 3, "text": "location/lifestyle slide"},
    {"slide": 4, "text": "price/contact slide"},
    {"slide": 5, "text": "swipe-up CTA slide"}
  ],
  "dm_script": "DM reply script when someone inquires (warm, professional, next-step focused)"
}`;
}

export function buildMortgagePostPrompt(price: string, area: string): string {
  return `Create a "What you get for ${price}" real estate content post in ${area}.

Make it educational and FOMO-inducing. Show the buyer what their money gets them vs renting.

Return JSON: {
  "hook": "scroll-stopping hook (comparison or shocking number angle)",
  "monthly_breakdown": "estimated monthly mortgage payment breakdown (principal, interest, total - use reasonable 7% rate assumptions)",
  "vs_rent": "rent vs own comparison for this price point in ${area}",
  "caption": "full Instagram caption",
  "carousel_slides": [
    "slide 1: hook/question",
    "slide 2: monthly payment breakdown",
    "slide 3: rent vs buy comparison",
    "slide 4: what this buys in ${area}",
    "slide 5: CTA — DM for free consultation"
  ],
  "hashtags": ["15 real estate and location hashtags"]
}`;
}

export function buildNeighborhoodGuidePrompt(area: string, workspaceType: string): string {
  return `Create a neighborhood/area guide content piece for: "${area}"
Business type: ${workspaceType}

Position the agent as the local expert. Cover lifestyle, investment potential, community.

Return JSON: {
  "hook": "why everyone is moving to ${area} hook",
  "guide": {
    "lifestyle": "2-3 sentence lifestyle description",
    "schools": "education/school quality note",
    "transport": "connectivity and commute note",
    "investment": "property value trend note",
    "hidden_gems": "1-2 local spots only locals know"
  },
  "reel_script": "45-second area tour script",
  "caption": "Instagram caption positioning agent as area expert",
  "hashtags": ["location-specific hashtags"]
}`;
}

export function buildInvestmentROIPrompt(details: string): string {
  return `Create investment property ROI content for: "${details}"

Target audience: property investors, not first-home buyers. Focus on returns, not lifestyle.

Return JSON: {
  "hook": "ROI-focused hook (numbers, percentage, yield)",
  "roi_breakdown": {
    "purchase_price": "property price from details",
    "estimated_rental": "estimated monthly rental income",
    "gross_yield": "gross rental yield %",
    "capital_growth": "estimated annual capital growth %",
    "total_return": "combined return projection"
  },
  "comparison": "compare this yield to bank FD/stocks in 2 sentences",
  "caption": "investor-focused Instagram/LinkedIn caption",
  "whatsapp_pitch": "3-paragraph WhatsApp message for investor clients",
  "hashtags": ["investment and property hashtags"]
}`;
}

// ─── RESTAURANT ───────────────────────────────────────────────────────────────

export function buildDishSuitePrompt(dishName: string, workspaceType: string, language = "English"): string {
  return `Create a COMPLETE content suite for this dish: "${dishName}"
Restaurant workspace. Output language: ${language}

Return JSON: {
  "viral_reel": {
    "hook": "food ASMR / sensory hook (taste, smell, texture)",
    "script": "30-second dish reveal reel script",
    "caption": "mouth-watering Instagram caption"
  },
  "menu_post": {
    "headline": "dish name formatted for menu post",
    "description": "60-word menu description (sensory, ingredients, occasion)",
    "price_cta": "price reveal + order CTA text"
  },
  "delivery_copy": {
    "zomato_title": "Zomato/Swiggy listing title (max 60 chars)",
    "zomato_description": "delivery platform description (crisp, sells the dish)",
    "usp": "unique selling point in 1 line"
  },
  "story_poll": {
    "question": "engaging story poll question about this dish",
    "option_a": "poll option A",
    "option_b": "poll option B"
  },
  "hashtags": ["20 food hashtags mixing dish name, cuisine type, city"]
}`;
}

export function buildCateringPrompt(eventType: string, workspaceType: string): string {
  return `Create catering promotion content for event type: "${eventType}"
Restaurant catering service.

Return JSON: {
  "hook": "catering hook (scale, quality, stress-free angle)",
  "packages": [
    {"name": "Package name", "serves": "X people", "highlight": "key feature", "price_hint": "starting from..."},
    {"name": "Package name", "serves": "X people", "highlight": "key feature", "price_hint": "starting from..."},
    {"name": "Package name", "serves": "X people", "highlight": "key feature", "price_hint": "starting from..."}
  ],
  "caption": "Instagram caption for catering service",
  "whatsapp_inquiry": "WhatsApp auto-reply when someone asks about catering",
  "hashtags": ["catering and event food hashtags"]
}`;
}

export function buildDeliveryLaunchPrompt(platform: string, workspaceType: string): string {
  return `Create a food delivery platform launch announcement for: "${platform}" (e.g. Zomato, Swiggy, UberEats)
Restaurant workspace.

Return JSON: {
  "announcement_reel": {
    "hook": "we're now on ${platform}! launch hook",
    "script": "20-second launch announcement script",
    "offer": "launch offer to drive first orders (e.g. 30% off first order)"
  },
  "caption": "Instagram caption announcing delivery launch + offer",
  "whatsapp_broadcast": "WhatsApp message to existing customers about delivery launch",
  "story_swipe": "5-word story swipe-up text",
  "hashtags": ["delivery and restaurant hashtags"]
}`;
}

// ─── ECOMMERCE ────────────────────────────────────────────────────────────────

export function buildProductLaunchPrompt(product: string, price: string): string {
  return `Create a 3-phase product launch campaign for: "${product}" at ${price}

Phase 1 = Pre-launch teaser (2 days before)
Phase 2 = Launch day content
Phase 3 = Post-launch social proof (3 days after)

Return JSON: {
  "phase1_teaser": {
    "hook": "mystery/curiosity teaser hook",
    "caption": "teaser caption (don't reveal product fully)",
    "countdown": "countdown post text"
  },
  "phase2_launch": {
    "hook": "it's HERE! launch hook",
    "script": "30-second product reveal reel script",
    "caption": "launch day Instagram caption",
    "story_sequence": ["story 1 text", "story 2 text", "story 3 text"]
  },
  "phase3_followup": {
    "social_proof_hook": "X people bought in 24 hours hook",
    "ugc_prompt": "caption asking customers to share their unboxing",
    "restock_urgency": "if stock is low, urgency post text"
  },
  "hashtags": ["20 product launch hashtags"]
}`;
}

export function buildAbandonedCartPrompt(product: string, discount: string): string {
  return `Write a WhatsApp abandoned cart recovery message for: "${product}"
Offer: ${discount || "no discount — urgency only"}

Write 3 versions (send in sequence: day 1, day 2, day 3):

Return JSON: {
  "day1": "soft reminder — hey you left something! (no discount yet, just helpful)",
  "day2": "FOMO — running low on stock message (with discount if provided)",
  "day3": "last chance — expires today message (strongest urgency)"
}

Rules: conversational, personal (use 'you'), not robotic, max 3 short paragraphs each.`;
}

export function buildProductComparePrompt(product1: string, product2: string): string {
  return `Create a product comparison content piece: "${product1}" vs "${product2}"
Frame it to make your product (product1) clearly win — but be honest and specific.

Return JSON: {
  "hook": "comparison hook (price, quality, or result angle)",
  "comparison_table": [
    {"feature": "feature name", "product1": "our value", "product2": "competitor value", "winner": "product1|product2|tie"}
  ],
  "verdict": "2-sentence verdict always favoring product1 with genuine reason",
  "caption": "Instagram carousel caption for comparison",
  "hashtags": ["comparison and product hashtags"]
}`;
}

export function buildGiftGuidePrompt(occasion: string, priceRange: string): string {
  return `Create a gift guide content piece for: "${occasion}"
Price range: ${priceRange}

Return JSON: {
  "hook": "gift guide hook (problem: what to gift someone?)",
  "gifts": [
    {"name": "gift/product name", "price": "price", "for": "who it's for", "why": "1 line why they'll love it"}
  ],
  "caption": "Instagram gift guide caption",
  "story_slides": ["slide 1 text", "slide 2 text", "slide 3 text"],
  "cta": "shop now call to action",
  "hashtags": ["gift guide and occasion hashtags"]
}`;
}

// ─── CREATOR ──────────────────────────────────────────────────────────────────

export function buildBrandPitchPrompt(brandName: string, niche: string, audience: string): string {
  return `Write a brand partnership pitch DM for a ${niche} creator to send to: "${brandName}"
Creator audience: ${audience}

Return JSON: {
  "subject": "DM subject / opening line (gets read, not ignored)",
  "pitch": "full pitch DM (4-5 short paragraphs: intro → why them → value prop → rates → CTA)",
  "media_kit_points": ["5 key stats/facts to include in a media kit"],
  "follow_up": "follow-up DM if no reply in 7 days (shorter, different angle)"
}

Tone: confident, professional, not desperate. Treat it as a partnership, not a favor.`;
}

export function buildViralHookPrompt(topic: string, niche: string): string {
  return `Generate 10 viral hook variations for a ${niche} creator about: "${topic}"

Apply different hook formulas:
- Curiosity gap: "Nobody talks about..."
- Contrarian: "Unpopular opinion:"
- POV: "POV: you just..."
- List: "3 things that..."
- Story: "I tried X for 30 days..."
- Shock: "I made $X from..."
- Relatability: "If you're struggling with..."
- Before/After: "6 months ago I..."
- Hot Take: "X is actually..."
- Warning: "Stop doing X if..."

Return JSON: {
  "hooks": [
    {"formula": "formula name", "hook": "the actual hook text", "why_works": "1-line reason"}
  ],
  "best_pick": "index of the strongest hook (0-9)",
  "posting_tip": "optimal time and day for this niche"
}`;
}

export function buildRateCardPrompt(niche: string, followers: string, engagement: string): string {
  return `Create rate card content for a ${niche} creator.
Followers: ${followers} | Engagement rate: ${engagement}

Return JSON: {
  "packages": [
    {
      "name": "package name (e.g. Story Only, Reel + Story, Full Campaign)",
      "deliverables": ["what's included"],
      "price_range": "suggested price range in USD",
      "best_for": "type of brand this suits"
    }
  ],
  "rate_card_caption": "Instagram post announcing media kit is available (builds authority)",
  "negotiation_tips": ["3 tips for negotiating brand deals"],
  "what_to_charge": "1-paragraph honest advice on pricing for this creator's tier"
}`;
}

// ─── BUSINESS SERVICES ────────────────────────────────────────────────────────

export function buildCaseStudyPrompt(client: string, result: string, service: string): string {
  return `Create a client case study content suite for a business services company.
Client/Industry: "${client}" | Result: "${result}" | Service provided: "${service}"

Return JSON: {
  "reel_script": {
    "hook": "result-first hook (lead with the number/outcome)",
    "script": "45-second case study reel script: problem → approach → result → CTA",
    "caption": "Instagram caption"
  },
  "linkedin_post": "LinkedIn case study post (professional, 200 words, data-driven, tag-worthy)",
  "whatsapp_pitch": "WhatsApp message pitching this service to prospects using this result",
  "testimonial_card": {
    "quote": "fabricated testimonial quote based on the result (natural, specific, emotional)",
    "attribution": "${client} industry, result: ${result}"
  },
  "hashtags": ["business and industry hashtags"]
}`;
}

export function buildWebinarPrompt(topic: string, date: string, price: string): string {
  return `Create a complete webinar/masterclass promotion campaign.
Topic: "${topic}" | Date: ${date} | Price: ${price || "Free"}

Return JSON: {
  "launch_reel": {
    "hook": "webinar announcement hook (transformation promise)",
    "script": "30-second promo script highlighting what they'll learn"
  },
  "registration_caption": "Instagram caption with registration link placeholder",
  "email_sequence": {
    "announcement": "announcement email subject + body (150 words)",
    "reminder_24h": "24-hour reminder email subject + body",
    "day_of": "day-of email with link"
  },
  "whatsapp_invite": "WhatsApp broadcast to existing clients about the webinar",
  "story_countdown": ["5 story slides for the countdown series"],
  "hashtags": ["webinar and topic hashtags"]
}`;
}

// ─── EVENTS ───────────────────────────────────────────────────────────────────

export function buildLineupRevealPrompt(artists: string, eventName: string, date: string): string {
  return `Create lineup/speaker reveal content for event: "${eventName}" on ${date}
Artists/Speakers: "${artists}"

Return JSON: {
  "reveal_reel": {
    "hook": "WHO IS PERFORMING/SPEAKING — build the hype hook",
    "script": "30-second lineup reveal script with buildup and reveal",
    "caption": "Instagram caption"
  },
  "individual_spotlights": [
    {"artist": "name", "hook": "1-line hype about them", "why_exciting": "what makes them special at this event"}
  ],
  "hype_stories": ["5 story slide texts for lineup reveal series"],
  "ticket_urgency": "post-lineup ticket urgency message (prices going up, seats filling)",
  "hashtags": ["event, artist, and city hashtags"]
}`;
}

export function buildEventRecapPrompt(eventName: string, highlights: string): string {
  return `Create post-event recap content for: "${eventName}"
Highlights/Stats: "${highlights}"

Return JSON: {
  "recap_reel": {
    "hook": "relive the magic hook (FOMO for those who missed it)",
    "script": "45-second recap reel script — energy, crowd, moments, stats",
    "caption": "Instagram recap caption"
  },
  "thank_you_post": "thank you post to attendees (warm, personal, community feel)",
  "next_event_tease": "tease for next event/edition at the end of the recap",
  "stat_carousel": [
    "slide 1: attendee count",
    "slide 2: performances/speakers",
    "slide 3: best moment",
    "slide 4: what people said",
    "slide 5: next date save-the-date"
  ],
  "hashtags": ["event recap and city hashtags"]
}`;
}

// ─── EDUCATION ────────────────────────────────────────────────────────────────

export function buildCourseLaunchPrompt(courseName: string, price: string, targetStudent: string): string {
  return `Create a complete course launch content suite.
Course: "${courseName}" | Price: ${price} | For: "${targetStudent}"

COMPLIANCE RULES:
- Never fabricate student results (e.g. "students earn ₹10L after this course") unless the user provided real data.
- For student outcomes, write "[Add real student result here]" as placeholder.
- Never claim "only course that..." or "#1 course" without evidence.
- Always include in results-focused content: "Results vary by individual effort and circumstances."
- Never promise specific job placements or salary outcomes unless the user provided verified data.

Return JSON: {
  "launch_reel": {
    "hook": "transformation promise hook — based on what the course actually teaches, not fabricated outcomes",
    "script": "45-second course promo script: pain point → curriculum solution → realistic outcomes → enroll CTA. Add disclaimer: Results vary."
  },
  "curriculum_post": {
    "headline": "What you will learn headline",
    "modules": ["5 key modules/lessons as bullet points — based on course name and target student"],
    "caption": "curriculum reveal caption"
  },
  "objection_busters": [
    {"objection": "common objection (e.g. too expensive)", "response": "confident, value-focused response — no fabricated guarantees"}
  ],
  "early_bird_sequence": {
    "day1": "early bird launch post",
    "day3": "student results post — use [Add real student testimonial here] as placeholder",
    "day5": "last 48 hours urgency post",
    "close": "doors closing today post"
  },
  "hashtags": ["course topic and education hashtags"]
}`;
}

export function buildStudentResultPrompt(studentName: string, before: string, after: string, courseName: string): string {
  return `Create a student success story content suite.
Student: "${studentName}" | Before: "${before}" | After: "${after}" | Course: "${courseName}"

Return JSON: {
  "reel_script": {
    "hook": "result-first hook (lead with the transformation)",
    "script": "45-second student story script: before state → decision → journey → result",
    "caption": "Instagram caption"
  },
  "quote_card": {
    "quote": "powerful student quote about the transformation",
    "attribution": "${studentName}, ${courseName} student"
  },
  "linkedin_post": "LinkedIn success story post (professional, inspiring, 150 words)",
  "whatsapp_proof": "WhatsApp message sharing this result with prospects",
  "hashtags": ["success story and course hashtags"]
}`;
}

// ─── PERSONAL ─────────────────────────────────────────────────────────────────

export function buildWeddingContentPrompt(partner1: string, partner2: string, date: string, venue: string): string {
  return `Create beautiful wedding content for ${partner1} & ${partner2}.
Date: ${date} | Venue: ${venue}

Return JSON: {
  "save_the_date": {
    "reel_script": "30-second save the date announcement reel",
    "caption": "Instagram save the date caption",
    "whatsapp_message": "WhatsApp announcement to family and friends"
  },
  "wedding_day": {
    "morning_story": "morning-of wedding story text",
    "ceremony_caption": "ceremony Instagram caption",
    "reception_caption": "reception Instagram caption"
  },
  "highlight_reel_script": "60-second wedding highlight reel script (emotional, cinematic)",
  "anniversary_reuse": "how to reuse this content on your 1st anniversary",
  "hashtags": ["custom wedding hashtag suggestion + 15 wedding hashtags"]
}`;
}

export function buildTributePrompt(name: string, relationship: string, memory: string): string {
  return `Create a heartfelt tribute/memorial content piece.
For: "${name}" | Relationship: "${relationship}" | Memory/context: "${memory}"

This is sensitive, emotional content. Handle with warmth, dignity, and grace.

Return JSON: {
  "tribute_post": {
    "opening": "gentle, heartfelt opening (2-3 sentences)",
    "memory": "personal memory paragraph (specific, warm, specific detail)",
    "legacy": "what they meant / how they'll be remembered",
    "closing": "closing line (hopeful, peaceful, not morbid)"
  },
  "caption": "full tribute caption for Instagram/Facebook",
  "story_quote": "short quote or memory to share on story (15 words max)",
  "whatsapp_status": "WhatsApp status text (short, dignified)"
}`;
}

export function buildGraduationPrompt(name: string, degree: string, university: string): string {
  return `Create graduation celebration content for ${name}.
Degree: "${degree}" | University: "${university}"

Return JSON: {
  "reel_script": "30-second graduation celebration reel script (proud, emotional, fun)",
  "congratulations_post": {
    "hook": "proud moment hook",
    "caption": "full graduation celebration caption",
    "tags": "who to tag suggestion"
  },
  "future_wish": "heartfelt message about their future (1 paragraph)",
  "story_set": ["story 1: gown reveal", "story 2: achievement", "story 3: future ahead"],
  "hashtags": ["graduation and university hashtags"]
}`;
}

// ── Real Estate ────────────────────────────────────────────────────────────────

export function buildSoldPrompt(details: string): string {
  return `Create a "Just Sold" celebration post for a real estate agent.
Property: "${details}"

Real estate agents post SOLD content to build credibility and attract new sellers. Make it celebratory but professional. Use social proof language.

Return JSON: {
  "reel_script": "15-second reel script — reveal the SOLD sign, celebrate the client win, end with CTA for sellers watching",
  "caption": "Instagram/Facebook caption: start with the win, share the story (how fast, how many offers, over asking?), end with CTA for anyone thinking of selling",
  "story_set": ["slide 1: bold SOLD text on property photo", "slide 2: key stats (days on market, offers received)", "slide 3: client quote or reaction", "slide 4: CTA — your home could be next"],
  "hashtags": ["real estate sold hashtags, location-specific"]
}`;
}

export function buildOpenHousePrompt(details: string): string {
  return `Create open house announcement content for a real estate agent.
Property: "${details}"

Return JSON: {
  "reel_script": "15-second teaser reel — tour highlights, date/time reveal, urgency CTA",
  "caption": "event-style caption with property highlights, open house date/time, and RSVP instruction",
  "story_countdown": ["story 1: this weekend teaser", "story 2: property highlight", "story 3: day-of reminder with time and address"],
  "broadcast_message": "WhatsApp broadcast to invite prospects to the open house",
  "hashtags": ["open house hashtags"]
}`;
}

// ── Restaurant ─────────────────────────────────────────────────────────────────

export function buildOfferPrompt(offer: string, workspaceType: string): string {
  return `Create a promotional offer post for a ${workspaceType.toLowerCase()} business.
Offer: "${offer}"

Examples of offers: "Happy Hour 50% off cocktails 4-7pm", "Buy 1 Get 1 Biryani Tuesday", "Free dessert on orders above ₹500 today only".

Return JSON: {
  "reel_hook": "punchy 3-second reel hook for this offer — creates FOMO",
  "caption": "offer announcement caption: hook, offer details, validity, urgency line, CTA",
  "story_set": ["slide 1: bold offer headline", "slide 2: terms and time limit", "slide 3: how to redeem / CTA"],
  "broadcast_message": "short WhatsApp broadcast to existing customers about this offer",
  "hashtags": ["relevant hashtags"]
}`;
}

// ── Creator ───────────────────────────────────────────────────────────────────

export function buildGiveawayPrompt(prize: string, workspaceType: string): string {
  return `Create a giveaway announcement post for a content creator.
Prize: "${prize}" | Niche: "${workspaceType}"

Giveaway posts get 3-5x normal engagement. Make it exciting, clear on how to enter, and credible.

Return JSON: {
  "reel_script": "20-second giveaway announcement reel — prize reveal, entry steps, deadline, excitement build",
  "caption": "giveaway caption: prize reveal hook, entry rules (follow + like + comment/tag), deadline, winner announcement date",
  "entry_rules": ["step 1", "step 2", "step 3"],
  "story_set": ["slide 1: prize reveal teaser", "slide 2: entry rules", "slide 3: deadline reminder", "slide 4: share for bonus entry"],
  "hashtags": ["giveaway hashtags for reach"]
}`;
}

export function buildCollabPrompt(brandName: string, product: string): string {
  return `Create a paid brand collaboration announcement post for a content creator.
Brand: "${brandName}" | Product/Campaign: "${product}"

This is a sponsored post. Must include #ad or #sponsored. Make it feel authentic, not salesy — the creator's voice should come through. The brand should feel lucky to have them.

Return JSON: {
  "reel_script": "30-second collab reel script — creator's personal story/experience with the product, natural integration, authentic CTA",
  "caption": "collab caption: personal hook (not brand-speak), honest experience, product mention, CTA, #ad disclosure",
  "story_set": ["slide 1: unboxing/first look", "slide 2: honest reaction", "slide 3: promo code or link reveal"],
  "disclosure_line": "FTC-compliant sponsorship disclosure line",
  "hashtags": ["collab and brand hashtags"]
}`;
}

// ── Events ────────────────────────────────────────────────────────────────────

export function buildTicketsPrompt(eventName: string, date: string, details: string): string {
  return `Create ticket sale launch content for an event.
Event: "${eventName}" | Date: "${date}" | Details: "${details}"

Return JSON: {
  "reel_script": "20-second hype reel — event teaser, lineup/highlight, ticket on-sale moment, urgency",
  "caption": "tickets live announcement: event name, date, what's included, price, where to buy, urgency line",
  "early_bird_post": "separate early-bird offer post if applicable — different angle, deadline pressure",
  "story_set": ["slide 1: TICKETS LIVE now", "slide 2: date + venue", "slide 3: what to expect", "slide 4: link in bio CTA"],
  "broadcast_message": "WhatsApp broadcast to waitlist/previous attendees",
  "hashtags": ["event hashtags"]
}`;
}

// ── Education ─────────────────────────────────────────────────────────────────

export function buildFreeClassPrompt(topic: string, date: string): string {
  return `Create promotional content for a free online class or workshop.
Topic: "${topic}" | Date: "${date}"

Free classes are lead magnets. Goal: maximum registrations. Make the value crystal clear. Create urgency without being pushy.

Return JSON: {
  "reel_script": "20-second reel — problem the student has, promise of the class, what they'll learn, free + date reveal, register CTA",
  "caption": "registration promo caption: pain point hook, what they'll learn (3 bullet points), who it's for, it's FREE, date/time, registration link instruction",
  "story_set": ["slide 1: question/pain point", "slide 2: free class announcement", "slide 3: what you'll learn", "slide 4: date + register link"],
  "broadcast_message": "WhatsApp broadcast to existing contacts promoting the free class",
  "hashtags": ["education and free class hashtags"]
}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MISSING CATEGORY COMMANDS — Phase 2
// ═══════════════════════════════════════════════════════════════════════════════

// ─── REAL ESTATE ──────────────────────────────────────────────────────────────

export function buildTestimonialPrompt(clientName: string, result: string, workspaceType: string): string {
  return `Create a client testimonial content suite for a ${workspaceType} business.
Client: "${clientName}" | Result/Experience: "${result}"

Testimonials are the #1 trust-builder. Make the client's voice feel authentic and specific. Focus on emotion and transformation, not just facts.

Return JSON: {
  "reel_script": "30-second testimonial reel script — client story in their voice, their situation before, working with us, the result, genuine recommendation",
  "quote_card": {
    "quote": "powerful client quote (natural, specific, 2-3 sentences max — sounds like a real person, not marketing copy)",
    "attribution": "${clientName} | ${result}"
  },
  "caption": "Instagram caption using the testimonial — lead with the result, tell the story, end with CTA for people in the same situation",
  "story_set": ["slide 1: client name + bold result stat", "slide 2: their situation before", "slide 3: their result after", "slide 4: their direct quote", "slide 5: your CTA"],
  "hashtags": ["testimonial and trust hashtags for ${workspaceType}"]
}`;
}

export function buildRenovationPrompt(propertyType: string, renovationDone: string): string {
  return `Create before/after renovation content for a real estate agent or property developer.
Property: "${propertyType}" | Renovation done: "${renovationDone}"

Before/after content is the most shareable format in real estate. Make the transformation feel dramatic. Help viewers imagine their own property's potential.

Return JSON: {
  "reel_script": "30-second before/after reveal reel — start with the 'before' pain points, build anticipation, dramatic reveal of the transformation, value increase hook, seller CTA",
  "caption": "transformation caption: before state (specific problems), the renovation story, after state (specific upgrades), value increase, CTA for sellers wanting to maximize their sale price",
  "carousel_slides": [
    "slide 1: BEFORE — the starting point (specific problems listed)",
    "slide 2: THE PLAN — what we changed and why",
    "slide 3: DURING — the work in progress",
    "slide 4: AFTER — the transformation reveal",
    "slide 5: THE RESULT — value increase and time to sell"
  ],
  "hashtags": ["renovation and real estate hashtags"]
}`;
}

// ─── RESTAURANT ───────────────────────────────────────────────────────────────

export function buildGrandOpeningPrompt(restaurantName: string, date: string, offer: string): string {
  return `Create a grand opening content campaign for a restaurant.
Restaurant: "${restaurantName}" | Opening date: "${date}" | Launch offer: "${offer}"

Grand openings are once-in-a-lifetime moments. Maximum hype. Build a week of content leading up to it.

Return JSON: {
  "announcement_reel": {
    "hook": "WE'RE OPENING! launch announcement hook that creates local FOMO",
    "script": "30-second opening announcement reel — reveal the restaurant, the vibe, the must-try dishes, the offer, date reveal"
  },
  "countdown_posts": [
    "7 days: sneak peek post (behind the scenes, kitchen reveal)",
    "3 days: menu highlight post (3 signature dishes that will make people show up)",
    "1 day: tomorrow! final hype post with offer reminder",
    "opening day: WE'RE OPEN post — invite everyone right now"
  ],
  "opening_day_caption": "opening day Instagram caption: welcome announcement, top 3 dishes to try, the offer, location/hours, tag-a-friend CTA",
  "whatsapp_broadcast": "WhatsApp broadcast to contacts and local groups announcing the opening",
  "hashtags": ["grand opening and restaurant hashtags, include city name"]
}`;
}

// ─── CREATOR ─────────────────────────────────────────────────────────────────

export function buildCreatorChallengePrompt(topic: string, niche: string): string {
  return `Create a social media challenge launch for a ${niche} creator about: "${topic}"

Creator challenges get massive engagement and UGC. Design it so followers WANT to participate and tag friends. Make it easy to do, fun to watch.

Return JSON: {
  "challenge_name": "catchy challenge name (e.g. #30DayFoodChallenge, #NoSpendWeek) — must include the creator's niche",
  "reel_script": "30-second challenge launch reel — announce the challenge, show what participants do, tease the prize/recognition, call to join",
  "caption": "challenge announcement caption: hook, what the challenge is, how to participate (3 simple steps), duration, what participants win/gain, tag CTA",
  "rules": ["step 1: simple action", "step 2: tag requirement", "step 3: hashtag instruction"],
  "participation_hook": "reply or comment starter to boost first-day engagement",
  "story_announcement": "story sequence to drive challenge signups",
  "hashtags": ["challenge hashtag + niche hashtags"]
}`;
}

export function buildQAPrompt(topic: string, niche: string): string {
  return `Create a Q&A session content piece for a ${niche} creator about: "${topic}"

Q&A content builds trust and positions the creator as the go-to expert. Anticipate real audience questions and answer with authority.

Return JSON: {
  "intro_reel": {
    "hook": "Q&A session hook — tease the most surprising/controversial question you'll answer",
    "script": "20-second intro reel inviting questions, what topics you'll cover, how to submit"
  },
  "top_questions": [
    {"question": "most asked question in this niche", "answer": "clear, honest, specific answer (3-5 sentences)"},
    {"question": "controversial question people are afraid to ask", "answer": "bold, direct answer"},
    {"question": "beginner question that feels dumb to ask", "answer": "patient, welcoming answer with no jargon"},
    {"question": "advanced question only serious followers ask", "answer": "technical answer that rewards engaged followers"}
  ],
  "carousel_post": "Q&A carousel caption — hook question, what you're answering today, engage CTA",
  "story_qa_format": ["question slide text", "answer slide text", "engagement prompt slide"],
  "hashtags": ["Q&A and niche hashtags"]
}`;
}

// ─── BUSINESS SERVICES ────────────────────────────────────────────────────────

export function buildServiceProcessPrompt(serviceName: string, steps: string, workspaceType: string): string {
  return `Create "how we work" educational content for a ${workspaceType} business.
Service: "${serviceName}" | Process steps: "${steps}"

Process content removes friction and objections. When prospects understand what happens when they hire you, they're more likely to commit. Make it clear, confident, and client-focused.

Return JSON: {
  "reel_script": "45-second process explainer reel — open with the client's problem, walk through each step simply, end with the result they get, book a call CTA",
  "carousel_post": {
    "hook": "what happens when you hire us? hook",
    "slides": [
      "slide 1: the problem we solve (client pain point)",
      "slide 2: step 1 explained simply",
      "slide 3: step 2 explained simply",
      "slide 4: step 3+ explained simply",
      "slide 5: what the client gets at the end (result + feeling)",
      "slide 6: how to get started CTA"
    ],
    "caption": "how-we-work post caption"
  },
  "objection_busters": [
    "how long does it take? → honest timeline answer",
    "what do I need to prepare? → simple onboarding requirement",
    "what if it doesn't work? → confidence/guarantee statement"
  ],
  "hashtags": ["business process and professional service hashtags"]
}`;
}

// ─── EVENTS ───────────────────────────────────────────────────────────────────

export function buildVenueRevealPrompt(venueName: string, eventName: string, date: string): string {
  return `Create venue reveal content for an event.
Venue: "${venueName}" | Event: "${eventName}" | Date: "${date}"

Venue reveals are high-hype moments. The venue IS part of the event experience. Make people excited about the space before the event.

Return JSON: {
  "reveal_reel": {
    "hook": "THIS is where ${eventName} is happening — venue reveal hook",
    "script": "30-second venue reveal reel — build anticipation, reveal the venue name, tour highlights (capacity, vibe, iconic features), CTA to get tickets before they sell out"
  },
  "caption": "venue announcement caption: event name + date, venue reveal, what makes this venue special for this event, ticket link CTA",
  "story_set": ["slide 1: teaser (mystery location)", "slide 2: clue about the venue", "slide 3: REVEAL with venue name", "slide 4: venue highlights", "slide 5: tickets link CTA"],
  "hashtags": ["venue, event name, and city hashtags"]
}`;
}

export function buildEarlyBirdPrompt(eventName: string, discount: string, deadline: string): string {
  return `Create early bird ticket promotion content for an event.
Event: "${eventName}" | Discount: "${discount}" | Deadline: "${deadline}"

Early bird pricing creates genuine urgency and fills capacity faster. Make the discount feel like a smart decision, not desperation.

Return JSON: {
  "reel_script": "20-second urgency reel — early bird discount reveal, what they save, deadline countdown, why smart people buy now vs later",
  "caption": "early bird caption: event name, the offer (X% off or ₹X off), exactly when it expires, how many early bird tickets are left (scarcity), buy now link",
  "countdown_post": "24-hour early bird expiry post (maximum urgency, last chance language)",
  "story_set": ["slide 1: early bird prices are LIVE", "slide 2: how much you save", "slide 3: expires in X hours", "slide 4: buy now button link"],
  "broadcast_message": "WhatsApp broadcast to interested people about early bird deadline",
  "hashtags": ["event and early bird hashtags"]
}`;
}

export function buildSponsorPrompt(brandName: string, eventName: string): string {
  return `Create sponsor announcement content for an event.
Sponsor: "${brandName}" | Event: "${eventName}"

Sponsor announcements serve two audiences: attendees (validation that the event is legit) and future sponsors (proof of partnership quality). Make the brand feel like a natural fit, not a billboard.

Return JSON: {
  "announcement_reel": {
    "hook": "WE HAVE AN AMAZING PARTNER — sponsor reveal hook",
    "script": "20-second sponsor announcement — introduce the brand, why this partnership makes sense for the event community, what the brand is bringing to the experience"
  },
  "caption": "sponsor announcement caption: grateful welcome to the brand, what they do, what they're bringing to attendees, tag the brand, mutual audience CTA",
  "collab_story": ["slide 1: EXCITING NEWS reveal", "slide 2: brand logo reveal with welcome", "slide 3: what the sponsor brings to the event", "slide 4: follow the brand"],
  "brand_tag_caption": "short version for the sponsor to repost on their own channels",
  "hashtags": ["event, sponsor brand, and industry hashtags"]
}`;
}

// ─── EDUCATION ────────────────────────────────────────────────────────────────

export function buildScholarshipPrompt(scholarshipName: string, amount: string, deadline: string): string {
  return `Create scholarship or bursary announcement content for an education business.
Scholarship: "${scholarshipName}" | Value: "${amount}" | Application deadline: "${deadline}"

Scholarship announcements build goodwill, reach new audiences (friends share for friends), and position the educator as generous and mission-driven.

Return JSON: {
  "announcement_reel": {
    "hook": "WE'RE GIVING AWAY ${amount} in scholarships — announcement hook",
    "script": "30-second scholarship reel — who this is for, what they get, why we're doing it (mission), how to apply, deadline"
  },
  "caption": "scholarship announcement caption: what it is and the value, who qualifies, how to apply (3 simple steps), deadline, share CTA (tag someone who needs this)",
  "application_story": ["slide 1: scholarship announcement", "slide 2: who qualifies", "slide 3: how to apply", "slide 4: deadline + apply now"],
  "broadcast_message": "WhatsApp message to existing students asking them to share the scholarship with people who need it",
  "hashtags": ["scholarship and education hashtags"]
}`;
}

// ─── PERSONAL ─────────────────────────────────────────────────────────────────

export function buildAchievementPrompt(name: string, achievement: string): string {
  return `Create a personal achievement celebration post.
Person: "${name}" | Achievement: "${achievement}"

Achievement posts are proud family moments. Warm, specific, and emotionally genuine. Not a press release — a real celebration from someone who loves them.

Return JSON: {
  "reel_script": "20-second achievement celebration reel script — proud reveal of the achievement, the journey behind it (effort, obstacles), the result, heartfelt appreciation for the person",
  "caption": "achievement celebration caption: proud announcement of what they achieved, the effort it took, your pride and love, tag the achiever, congratulations CTA for followers",
  "story_set": ["slide 1: proud announcement with achievement", "slide 2: the journey and hard work", "slide 3: the moment of achievement", "slide 4: heartfelt message to them"],
  "whatsapp_status": "WhatsApp status text — short, proud, shareable (max 50 words)",
  "hashtags": ["achievement and celebration hashtags"]
}`;
}

// ─── UNIVERSAL CONTENT KIT ────────────────────────────────────────────────────
// One prompt, full kit: reel + caption + hashtags + stories + broadcast + DM

const KIT_WORKSPACE_CONTEXT: Record<string, { role: string; tone: string; focus: string }> = {
  REAL_ESTATE:       { role: "real estate agent",          tone: "aspirational and professional",    focus: "lifestyle, status, neighborhood appeal, investment value" },
  RESTAURANT:        { role: "restaurant owner",           tone: "appetizing and inviting",           focus: "sensory experience, freshness, ambiance, taste" },
  ECOMMERCE:         { role: "ecommerce brand",            tone: "conversion-focused and exciting",   focus: "product benefits, urgency, value for money, FOMO" },
  CREATOR:           { role: "content creator",            tone: "relatable and authentic",           focus: "personality, storytelling, trend-awareness, community" },
  BUSINESS_SERVICES: { role: "professional services firm", tone: "credible and results-focused",     focus: "expertise, proven outcomes, trust, ROI" },
  EVENTS:            { role: "event organiser",            tone: "hype-driven and exclusive",         focus: "experience, FOMO, countdown, what attendees get" },
  EDUCATION:         { role: "education brand",            tone: "inspiring and results-driven",      focus: "transformation, curriculum value, student outcomes" },
  PERSONAL:          { role: "personal brand",             tone: "warm and celebratory",              focus: "emotion, milestones, authenticity, family and love" },
  FITNESS_GYM:       { role: "fitness professional",       tone: "energetic and motivational",       focus: "transformation, discipline, results, community strength" },
  SALON_SPA:         { role: "beauty and wellness brand",  tone: "luxurious and self-care focused",  focus: "transformation, pampering, confidence, skilled artistry" },
  FASHION:           { role: "fashion brand",              tone: "style-forward and aspirational",   focus: "aesthetics, trend-setting, outfit storytelling, exclusivity" },
  TRAVEL:            { role: "travel brand",               tone: "wanderlust and experiential",      focus: "adventure, culture, luxury, memories, bucket-list" },
  HEALTHCARE:        { role: "healthcare provider",        tone: "trustworthy and caring",           focus: "patient education, wellness, prevention, professional care" },
  AUTOMOBILE:        { role: "automotive brand",           tone: "powerful and aspirational",        focus: "performance, design, status, driving experience" },
  PHOTOGRAPHY:       { role: "photography studio",         tone: "artistic and emotion-driven",      focus: "moments preserved, artistry, emotion captured" },
  INTERIOR_DESIGN:   { role: "interior design studio",    tone: "elegant and transformative",       focus: "space transformation, lifestyle elevation, craftsmanship" },
  HOTEL:             { role: "hotel and hospitality brand", tone: "warm and immersive",              focus: "comfort, service excellence, unique experiences, indulgence" },
  JEWELRY:           { role: "jewelry brand",              tone: "timeless and emotionally rich",   focus: "craftsmanship, love, milestones, exclusivity, story" },
};

// Per-workspace listing description instructions for KIT
const KIT_LISTING_INSTRUCTIONS: Record<string, string> = {
  REAL_ESTATE:      "Property listing for portals (MagicBricks, 99acres, Housing.com). 200-250 words. Headline, full description, feature bullet points, contact placeholder. Mark any unknown spec as [SPECIFY: detail]. End with: 'Subject to verification. Contact agent for current details.'",
  RESTAURANT:       "Menu/dish description for Zomato, Swiggy, or restaurant website. 120-150 words. Dish name, ingredients/flavours (only what user provided), portion, price if given, what makes it special. Write sensory and appetizing.",
  ECOMMERCE:        "Marketplace product listing (Amazon/Flipkart style). 150-200 words. Features as bullet points, benefits, specs, materials, dimensions (only from user input). End with a purchase CTA.",
  HOTEL:            "OTA room/package description (MakeMyTrip, booking.com style). 150-200 words. Room type, key features, inclusions, what makes it special. End with: 'Rates subject to availability. Terms apply.'",
  TRAVEL:           "Package page for website or booking platform. 150-200 words. Day-by-day highlights (only dates/days user provided), inclusions, contact for pricing. Add: 'Terms and conditions apply. Contact for current pricing.'",
  AUTOMOBILE:       "Showroom vehicle spec card. 120-150 words. Model name, key specs (only what user gave — never invent mileage or safety ratings), standout features, price if given. Add: 'Prices subject to change. Contact dealership for current offers.'",
  HEALTHCARE:       "Clinic website / brochure copy. 150-200 words. Condition or treatment overview, who should consider it, what the consultation involves, the clinic's approach. Add: 'Consult a qualified healthcare professional for personalised advice.'",
  PHOTOGRAPHY:      "Website package descriptions — write two tiers (basic and premium). Services in each, what client receives, turnaround time if given, how to book. Mark prices as [SPECIFY: price].",
  INTERIOR_DESIGN:  "Portfolio case study. 200 words. Client brief, design challenge, solution and key choices, outcome. Never invent material brands or costs — use [SPECIFY: detail] for unconfirmed specifics.",
  FITNESS_GYM:      "Membership or program page copy. 150-200 words. What's included, who it's for, schedule if given, what clients work toward (never specific outcome numbers). Add: 'Results vary. Consult a professional before starting any fitness programme.'",
  SALON_SPA:        "Service menu description for website or booking app. 120-150 words. Service name, duration, what's included, the sensory experience, benefits (no medical claims). Mark price as [SPECIFY: price].",
  FASHION:          "Collection page description for website or catalogue. 120-150 words. Collection name, aesthetic/theme, key pieces, fabric/materials (only if user provided), how to style. Never invent sizing claims.",
  JEWELRY:          "Piece or collection page description. 120-150 words. Piece name, design story, materials (only if user provided), craftsmanship, gifting occasion. Mark any unconfirmed specs as [SPECIFY: detail].",
  EVENTS:           "Event platform listing (BookMyShow/Eventbrite/Insider style). 180-200 words. Event name, date/time/venue from user details, what attendees experience, who it's for, lineup/speakers if given, ticket note.",
  EDUCATION:        "Course enrollment page description. 180-200 words. Course name, what students learn, who it's for, curriculum highlights (from user details only). Add: 'Results vary by individual.' End with an enroll CTA.",
  BUSINESS_SERVICES:"Service or case study page copy. 150-200 words. Service name, what's included, who it's for, process overview, expected outcomes using [SPECIFY] for unconfirmed results. End with a contact CTA.",
  CREATOR:          "Link-in-bio and YouTube/podcast about description. 120-150 words. Who you are, what content you make, where to follow, how to collaborate, and one authentic personal line about why you create.",
  PERSONAL:         "Memory caption for albums or frames. 60-80 words. Warm, personal, specific to the moment. Not generic — write as if the person themselves is speaking.",
};

// Workspaces where photo shot directions are valuable
const KIT_PHOTO_WORKSPACES = new Set([
  "REAL_ESTATE", "RESTAURANT", "ECOMMERCE", "SALON_SPA", "FASHION",
  "HOTEL", "PHOTOGRAPHY", "INTERIOR_DESIGN", "AUTOMOBILE", "FITNESS_GYM",
  "JEWELRY", "TRAVEL",
]);

const KIT_PHOTO_SUBJECT: Record<string, string> = {
  REAL_ESTATE:     "property rooms and outdoor spaces",
  RESTAURANT:      "dishes, plating, and ambiance",
  ECOMMERCE:       "product from multiple angles",
  SALON_SPA:       "treatment, before/after, and salon ambiance",
  FASHION:         "outfit styling and close-up fabric details",
  HOTEL:           "room, pool, amenities, and lobby",
  PHOTOGRAPHY:     "portfolio work and behind-the-scenes studio",
  INTERIOR_DESIGN: "finished spaces from different angles",
  AUTOMOBILE:      "exterior, interior, detail shots",
  FITNESS_GYM:     "gym floor, equipment, classes in action",
  JEWELRY:         "piece close-ups, on-model shots, packaging",
  TRAVEL:          "destination landscapes, activities, and local culture",
};

export function buildContentKitPrompt(details: string, workspaceType: string, language: string): string {
  const ctx = KIT_WORKSPACE_CONTEXT[workspaceType] || { role: "business", tone: "professional", focus: "value and quality" };
  const listingInstruction = KIT_LISTING_INSTRUCTIONS[workspaceType] || "Description copy for website or profile. 150 words. What's offered, who it's for, what makes it different. Use [SPECIFY: detail] for anything not provided.";
  const needsPhotoDirections = KIT_PHOTO_WORKSPACES.has(workspaceType);
  const photoSubject = KIT_PHOTO_SUBJECT[workspaceType] || "business content";
  const contextIntelligence = WORKSPACE_CONTEXT_INTELLIGENCE[workspaceType] || "";

  const photoField = needsPhotoDirections
    ? `  "photo_directions": "5 specific photo shots for ${photoSubject}. Format: 'Shot 1 — [subject]: [exact framing, angle, lighting tip]. What to highlight.' Each shot must be actionable and specific to the details above.",`
    : "";

  return `You are a professional content strategist for a ${ctx.role}. Generate a complete content kit in ${language}.

ABOUT THE CONTENT:
${details}

TONE: ${ctx.tone}
FOCUS AREAS: ${ctx.focus}
${contextIntelligence ? `
SMART CONTEXT RULES — scan the content details above for signals (location, area, season, price range, occasion, audience type). Apply only the rules that match what is present. Skip rules where no signal exists. Never invent details.
${contextIntelligence}
` : ""}
Generate a complete content kit. Return ONLY valid JSON (no markdown, no extra text):
{
  "hook": "1-2 line scroll-stopping opening for a short video. Punchy. Makes someone stop swiping.",
  "reel_script": "30-second spoken reel script. Include [SCENE: description] directions. Natural, conversational, not stiff. End with a strong CTA.",
  "caption": "Instagram caption, 100-150 words. Engaging opening line, body that adds value, clear call to action. No unnecessary emojis.",
  "hashtags": ["30 hashtags — mix of large (>1M posts), medium (100K-1M), niche (<100K), and branded-style. No spaces in hashtag text."],
  "story_set": ["5 story slides. Each slide = one punchy sentence. Together they tell a story or reveal something."],
  "broadcast": "WhatsApp broadcast message. Max 4 lines. Direct, action-driving. Sounds like a real person, not marketing.",
  "dm_script": "3-line DM reply template for interested inquiries. Warm, professional, ends with a question to continue the conversation.",
  "linkedin_post": "Professional version for LinkedIn, 80-100 words. Industry insight angle, ends with a thoughtful question.",
  "listing_description": "${listingInstruction}",${photoField}
}

CRITICAL RULES (violating these makes the output useless):
- Write ENTIRELY in ${language}
- NEVER invent prices, statistics, awards, certifications, or facts not provided above
- If a specific detail is missing, write [SPECIFY: detail] as a placeholder — do not guess
- Do not write generic filler — every line must be specific to the details given
- Healthcare content: add "Consult a qualified professional" where applicable
- Real estate content: add "Subject to verification. Contact agent for current details."
- Education results: add "Results vary by individual."`;
}

// ─── FITNESS & GYM ────────────────────────────────────────────────────────────

export function buildFitnessTransformationPrompt(details: string, language: string): string {
  return `Create fitness transformation content. Language: ${language}.
Details: "${details}"

Transformation stories are the most powerful content in fitness. Show the human journey — the struggle, the discipline, the result.

CRITICAL: Never fabricate weight numbers, timelines, or medical outcomes. Use only what was provided. Add: "Results vary. Consult a professional before starting any fitness program."

Return JSON: {
  "reel_script": "30-second transformation reveal reel: hook (before state — make it relatable), journey (3 key things they did), transformation reveal (the after), CTA (your program/coaching)",
  "caption": "transformation caption: relatable before state, the turning point, what they did (their discipline), the result, your role in it, CTA for others who want this",
  "story_set": ["slide 1: before state — relatable struggle", "slide 2: the decision to change", "slide 3: the process (3 things they did)", "slide 4: the transformation result", "slide 5: your CTA"],
  "broadcast": "WhatsApp message to share this transformation — inspire + invite others to start",
  "hashtags": ["fitness transformation and gym hashtags — 25 tags"]
}`;
}

export function buildFitnessClassPrompt(className: string, time: string, price: string, language: string): string {
  return `Create fitness class/session promotion content. Language: ${language}.
Class: "${className}" | Time: "${time}" | Price: "${price}"

Class promos need urgency (limited spots), a clear benefit promise, and a simple action step.

CRITICAL: Do not promise specific weight loss or health outcomes.

Return JSON: {
  "reel_script": "20-second class promo reel: hook (problem this class solves), what happens in class, the transformation they get, spots are limited CTA",
  "caption": "class promo caption: what the class is, who it's for, what they'll experience, time and price, how to book",
  "story_set": ["slide 1: attention hook", "slide 2: what this class does for you", "slide 3: class details (time, price)", "slide 4: how to book"],
  "broadcast": "WhatsApp broadcast inviting members/prospects to join this class",
  "hashtags": ["fitness class and wellness hashtags — 20 tags"]
}`;
}

// ─── SALON & SPA ──────────────────────────────────────────────────────────────

export function buildSalonServicePrompt(service: string, duration: string, price: string, language: string): string {
  return `Create salon/spa service showcase content. Language: ${language}.
Service: "${service}" | Duration: "${duration}" | Price: "${price}"

Beauty service content sells the feeling and the result, not the technique.

CRITICAL: No medical claims. Mark price as [SPECIFY: price] if not provided.

Return JSON: {
  "reel_script": "25-second service showcase reel: hook (the transformation or pampering experience), what the service involves (sensory language), the before/after feeling, booking CTA",
  "caption": "service showcase caption: what the service is, who it's perfect for, what the experience feels like, result, price and how to book",
  "story_set": ["slide 1: service reveal", "slide 2: the experience (sensory detail)", "slide 3: the result", "slide 4: price + booking CTA"],
  "broadcast": "WhatsApp message for existing clients — invite to try or rebook",
  "hashtags": ["salon, spa, and beauty hashtags — 25 tags"]
}`;
}

export function buildSalonBookingPrompt(slots: string, language: string): string {
  return `Create appointment booking promo content. Language: ${language}.
Available slots: "${slots}"

Booking promos need to feel exclusive and create gentle urgency without being pushy.

Return JSON: {
  "reel_script": "15-second booking promo: limited slots announcement, what's available, how to book",
  "caption": "booking promo: slots available, services offered, how to secure your appointment",
  "story_set": ["slide 1: limited slots announcement", "slide 2: what's available", "slide 3: how to book"],
  "broadcast": "WhatsApp message to clients about available slots",
  "hashtags": ["salon booking and beauty appointment hashtags"]
}`;
}

// ─── FASHION ─────────────────────────────────────────────────────────────────

export function buildFashionDropPrompt(collection: string, priceRange: string, language: string): string {
  return `Create new collection/product drop content. Language: ${language}.
Collection: "${collection}" | Price range: "${priceRange}"

Fashion drops need to feel like events. Exclusivity, style identity, and 'you need this' energy.

CRITICAL: Do not fabricate fabric quality claims. Mark exact prices as [SPECIFY: price].

Return JSON: {
  "reel_script": "25-second collection drop reel: hook (this is the collection you've been waiting for), reveal shots with styling context, price range, where to shop",
  "caption": "drop announcement caption: collection story (what inspired it), key pieces, styling tips, price range, shop link CTA",
  "story_set": ["slide 1: drop announcement", "slide 2: hero piece reveal", "slide 3: styling inspiration", "slide 4: price range + shop now"],
  "broadcast": "WhatsApp message to customers — exclusive first look at new collection",
  "hashtags": ["fashion, style, and collection hashtags — 30 tags"]
}`;
}

export function buildFashionLookbookPrompt(season: string, language: string): string {
  return `Create lookbook content for a fashion brand. Language: ${language}.
Season/Theme: "${season}"

Lookbook content is aspirational storytelling through outfits.

Return JSON: {
  "reel_script": "30-second lookbook reel: trend intro, 4-5 outfit reveals with styling notes, brand identity closing",
  "caption": "lookbook caption: season/theme story, styling tips, how to recreate the looks, shop CTA",
  "story_set": ["slide 1: lookbook cover", "slide 2-4: outfit reveals", "slide 5: shop the look CTA"],
  "broadcast": "WhatsApp message sharing the new lookbook",
  "hashtags": ["fashion lookbook and style hashtags — 25 tags"]
}`;
}

// ─── TRAVEL ──────────────────────────────────────────────────────────────────

export function buildTravelPackagePrompt(destination: string, duration: string, price: string, language: string): string {
  return `Create travel package promotion content. Language: ${language}.
Destination: "${destination}" | Duration: "${duration}" | Price: "${price}"

Travel content sells dreams and experiences, not logistics.

CRITICAL: Never invent visa requirements, safety ratings, or travel advisories. Add: "Terms apply. Contact for current availability and pricing."

Return JSON: {
  "reel_script": "30-second travel package reel: hook (you need to experience this destination), 3 highlights of the destination/package, what's included, price and how to book",
  "caption": "package promotion caption: destination dream-selling opening, 3 experiences included, practical details (duration, price), how to inquire/book",
  "story_set": ["slide 1: destination reveal", "slide 2-3: experience highlights", "slide 4: package details", "slide 5: book now CTA"],
  "broadcast": "WhatsApp message to prospects — limited slots travel package announcement",
  "hashtags": ["travel, destination, and wanderlust hashtags — 28 tags"]
}`;
}

export function buildTravelDestinationPrompt(location: string, language: string): string {
  return `Create destination content for a travel brand. Language: ${language}.
Destination: "${location}"

Destination content builds desire — make people say 'I need to go there'.

CRITICAL: Only describe what is known about this destination. Do not fabricate specific prices or travel times.

Return JSON: {
  "reel_script": "30-second destination showcase: hook (why this place will change you), 4 must-see/do things, best time to visit, your packages CTA",
  "caption": "destination caption: why this place is special, top 3 experiences, practical info (when to go, what to know), book with us CTA",
  "story_set": ["slide 1: destination reveal shot", "slide 2-4: top experiences", "slide 5: how to book your trip"],
  "broadcast": "WhatsApp message inspiring clients to visit this destination",
  "hashtags": ["destination and travel hashtags — 25 tags"]
}`;
}

// ─── HEALTHCARE ───────────────────────────────────────────────────────────────

export function buildHealthAwarenessPrompt(topic: string, language: string): string {
  return `Create health awareness content for a healthcare provider. Language: ${language}.
Topic: "${topic}"

Health awareness content educates, builds trust, and positions the provider as a caring expert. Never sensationalise.

CRITICAL: Add "Consult a qualified healthcare professional for personalized advice." Do not diagnose or prescribe.

Return JSON: {
  "reel_script": "30-second health awareness reel: hook (did you know this about [topic]?), 3 key facts patients need to know, what they should do, your clinic/practice CTA",
  "caption": "awareness caption: key health insight, 3 actionable tips, disclaimer, how to consult/book",
  "story_set": ["slide 1: attention hook", "slide 2-4: 3 key facts or tips", "slide 5: consult us CTA"],
  "broadcast": "WhatsApp health tip to patients — educational, warm, not alarming",
  "hashtags": ["health awareness and wellness hashtags — 20 tags"]
}`;
}

export function buildHealthAppointmentPrompt(specialty: string, availability: string, language: string): string {
  return `Create appointment booking content for a healthcare practice. Language: ${language}.
Specialty: "${specialty}" | Availability: "${availability}"

Appointment promos should be reassuring, accessible, and action-driving.

CRITICAL: No false urgency. No claims about outcomes.

Return JSON: {
  "reel_script": "20-second appointment promo: who we help, what to expect at your visit, easy booking process",
  "caption": "appointment promo: our specialty and who we help, what the appointment involves, availability, how to book",
  "story_set": ["slide 1: specialty intro", "slide 2: what to expect", "slide 3: availability", "slide 4: how to book"],
  "broadcast": "WhatsApp message to existing patients about availability",
  "hashtags": ["healthcare and wellness appointment hashtags"]
}`;
}

// ─── AUTOMOBILE ───────────────────────────────────────────────────────────────

export function buildVehicleShowcasePrompt(vehicle: string, price: string, features: string, language: string): string {
  return `Create vehicle showcase content for a car dealership. Language: ${language}.
Vehicle: "${vehicle}" | Price: "${price}" | Key features: "${features}"

Car content sells aspiration and status, not just specs. Make the buyer imagine driving it.

CRITICAL: Never fabricate mileage, emission ratings, or safety scores. Add: "Prices subject to change. Contact for current offers."

Return JSON: {
  "reel_script": "30-second vehicle showcase reel: hook (this is the car everyone's talking about), exterior reveal, interior highlights, key features, price and test drive CTA",
  "caption": "vehicle showcase caption: why this car turns heads, top 3 features, price, how to book a test drive",
  "story_set": ["slide 1: vehicle reveal", "slide 2: exterior design", "slide 3: interior and features", "slide 4: price + test drive CTA"],
  "broadcast": "WhatsApp message to prospects — new vehicle arrival announcement",
  "hashtags": ["automobile, car, and dealership hashtags — 20 tags"]
}`;
}

export function buildServiceCenterPrompt(serviceType: string, offer: string, language: string): string {
  return `Create automotive service center content. Language: ${language}.
Service: "${serviceType}" | Offer: "${offer}"

Service promos build trust through transparency and convenience.

CRITICAL: Do not guarantee repair outcomes. Mark specific prices as [SPECIFY: price] if not given.

Return JSON: {
  "reel_script": "20-second service promo: why this service matters for your car, what we do, the offer, book now",
  "caption": "service promo: service explained simply, why now, offer details, how to book",
  "story_set": ["slide 1: service announcement", "slide 2: what's included", "slide 3: offer + validity", "slide 4: book now"],
  "broadcast": "WhatsApp message to existing customers about service offer",
  "hashtags": ["car service and automobile hashtags — 18 tags"]
}`;
}

// ─── PHOTOGRAPHY ──────────────────────────────────────────────────────────────

export function buildPhotographyPortfolioPrompt(shootType: string, language: string): string {
  return `Create photography portfolio showcase content. Language: ${language}.
Shoot type: "${shootType}"

Photography portfolio content sells emotion and artistry — not just technical skills.

CRITICAL: Only describe the photographer's own work. Mark pricing as [SPECIFY: package price].

Return JSON: {
  "reel_script": "25-second portfolio reel: hook (every photo tells a story), reveal 4-5 shot types with emotional context, your style, booking CTA",
  "caption": "portfolio caption: the story behind this shoot type, what you capture that others miss, what clients say (if provided), how to book",
  "story_set": ["slide 1: portfolio reveal", "slide 2-3: best shots with captions", "slide 4: what makes your style unique", "slide 5: booking CTA"],
  "broadcast": "WhatsApp message to past clients — share portfolio, ask for referrals",
  "hashtags": ["photography and studio hashtags — 25 tags"]
}`;
}

export function buildPhotographyBookingPrompt(availability: string, packages: string, language: string): string {
  return `Create photography booking promo content. Language: ${language}.
Availability: "${availability}" | Packages: "${packages}"

Booking promos need to create gentle urgency (limited dates) and make the process feel easy.

Return JSON: {
  "reel_script": "20-second booking promo: limited dates available, what's included in your packages, how easy booking is",
  "caption": "booking promo: dates available, packages and what's included, how to secure your slot",
  "story_set": ["slide 1: limited slots announcement", "slide 2: packages overview", "slide 3: what to expect", "slide 4: book now"],
  "broadcast": "WhatsApp message to inquiries — availability and packages",
  "hashtags": ["photography booking and studio hashtags"]
}`;
}

// ─── INTERIOR DESIGN ──────────────────────────────────────────────────────────

export function buildInteriorProjectPrompt(spaceType: string, style: string, language: string): string {
  return `Create interior design project showcase content. Language: ${language}.
Space: "${spaceType}" | Design style: "${style}"

Interior design content sells transformation and lifestyle — before/after storytelling is the most powerful format.

CRITICAL: Do not invent project costs or material brands unless the designer provided them.

Return JSON: {
  "reel_script": "30-second project showcase reel: hook (this space was completely transformed), before context, design choices made (3 key decisions), the after reveal, your studio CTA",
  "caption": "project showcase caption: the transformation story, design philosophy applied, key elements, how clients can get their own transformation",
  "story_set": ["slide 1: space before", "slide 2-3: design choices", "slide 4: final reveal", "slide 5: start your project CTA"],
  "broadcast": "WhatsApp message sharing this project — inspire and generate inquiries",
  "hashtags": ["interior design and decor hashtags — 25 tags"]
}`;
}

export function buildInteriorPortfolioPrompt(designStyle: string, language: string): string {
  return `Create interior design portfolio content. Language: ${language}.
Design style: "${designStyle}"

Portfolio content builds authority and attracts clients who share the designer's aesthetic.

Return JSON: {
  "reel_script": "25-second portfolio reel: design philosophy opening, 4 project reveals with context, your unique approach, contact CTA",
  "caption": "portfolio caption: your design philosophy, what makes your projects distinctive, types of spaces you design, how to start a project",
  "story_set": ["slide 1: studio intro", "slide 2-4: portfolio highlights", "slide 5: let's design your space CTA"],
  "broadcast": "WhatsApp message to prospects — portfolio showcase",
  "hashtags": ["interior design and architecture hashtags — 25 tags"]
}`;
}

// ─── HOTEL & HOSPITALITY ──────────────────────────────────────────────────────

export function buildHotelPackagePrompt(packageName: string, nights: string, price: string, language: string): string {
  return `Create hotel package promotion content. Language: ${language}.
Package: "${packageName}" | Nights: "${nights}" | Price: "${price}"

Hotel content sells experiences and feelings — not just rooms. Make the guest imagine themselves there.

CRITICAL: Add "Rates subject to availability. Terms and conditions apply." Never fabricate star ratings or amenity claims.

Return JSON: {
  "reel_script": "30-second package promo reel: hook (imagine waking up to this), package experience walkthrough (breakfast, activities, room reveal), price and what's included, booking CTA",
  "caption": "package promo caption: experience-first description, what's included, price per night, special offer validity, how to book",
  "story_set": ["slide 1: hotel/property reveal", "slide 2: package highlights", "slide 3: what's included", "slide 4: price + book now"],
  "broadcast": "WhatsApp message to past guests — exclusive package offer",
  "hashtags": ["hotel, hospitality, and travel hashtags — 25 tags"]
}`;
}

export function buildHotelReviewPrompt(guestName: string, experience: string, language: string): string {
  return `Create guest review/testimonial content for a hotel. Language: ${language}.
Guest: "${guestName}" | Experience: "${experience}"

Guest reviews are the most trusted form of hotel marketing. Let the guest's words speak.

CRITICAL: Use only the experience details provided. Never fabricate or embellish.

Return JSON: {
  "reel_script": "20-second review reel: guest experience reveal, 3 specific things they loved, their recommendation, your booking CTA",
  "caption": "review caption: guest name (if they consented), what they experienced, quote or paraphrase, invitation for others to experience the same",
  "story_set": ["slide 1: guest name and stay details", "slide 2-3: experience highlights", "slide 4: their recommendation", "slide 5: book your stay CTA"],
  "broadcast": "WhatsApp message to mailing list — share this glowing guest experience",
  "hashtags": ["hotel review and hospitality hashtags — 20 tags"]
}`;
}

// ─── JEWELRY ─────────────────────────────────────────────────────────────────

export function buildJewelryCollectionPrompt(collectionName: string, priceRange: string, language: string): string {
  return `Create jewelry collection launch content. Language: ${language}.
Collection: "${collectionName}" | Price range: "${priceRange}"

Jewelry content sells emotion, milestones, and timelessness — not just metal and stones.

CRITICAL: Do not claim specific carat weights, certifications, or gemstone grades without confirmation. Mark as [SPECIFY: detail].

Return JSON: {
  "reel_script": "25-second collection launch reel: hook (some jewelry is just jewelry. This is different.), collection story/inspiration, 3-4 piece reveals with styling context, price range and where to shop",
  "caption": "collection launch caption: collection story (what inspired it), hero pieces with emotional context, price range, how to shop or inquire",
  "story_set": ["slide 1: collection announcement", "slide 2-3: piece reveals", "slide 4: the story behind the collection", "slide 5: shop now CTA"],
  "broadcast": "WhatsApp message to customers — exclusive collection launch preview",
  "hashtags": ["jewelry, gold, and luxury accessories hashtags — 25 tags"]
}`;
}

export function buildJewelryCustomPrompt(pieceDetails: string, language: string): string {
  return `Create custom jewelry showcase content. Language: ${language}.
Piece details: "${pieceDetails}"

Custom jewelry content celebrates the unique story behind each piece — who it was made for and why.

CRITICAL: Only describe the piece using provided details. Do not invent gemstone grades.

Return JSON: {
  "reel_script": "25-second custom piece showcase: hook (this wasn't made for everyone — it was made for one person), the story/occasion behind it, the craftsmanship, their reaction, your custom work CTA",
  "caption": "custom piece caption: the story behind this creation, the occasion, what makes it one-of-a-kind, how others can commission their own",
  "story_set": ["slide 1: piece reveal", "slide 2: the story/occasion", "slide 3: craftsmanship detail", "slide 4: commission yours CTA"],
  "broadcast": "WhatsApp message to past customers — share this custom creation, invite inquiries",
  "hashtags": ["custom jewelry and handcrafted hashtags — 20 tags"]
}`;
}
