// ─── Location-aware, category-based pricing engine ────────────────────────────
// 3 tiers: FREE (1 generation, watermark) | GROWTH (30/mo) | UNLIMITED (no limit)
// Prices vary by workspace category. PPP multiplier applied per country at checkout.
// Stripe receives the final calculated amount via price_data — no fixed price IDs needed.

export type PlanTier = "FREE" | "GROWTH" | "UNLIMITED";

// ─── Workspace → pricing category ─────────────────────────────────────────────

export const WORKSPACE_PRICING_CATEGORY: Record<string, string> = {
  REAL_ESTATE:      "HIGH_VALUE",
  HEALTHCARE:       "HIGH_VALUE",
  HOTEL:            "HIGH_VALUE",
  AUTOMOBILE:       "HIGH_VALUE",
  INTERIOR_DESIGN:  "HIGH_VALUE",

  EDUCATION:        "PROFESSIONAL",
  PHOTOGRAPHY:      "PROFESSIONAL",
  EVENTS:           "PROFESSIONAL",
  BUSINESS_SERVICES:"PROFESSIONAL",
  TRAVEL:           "PROFESSIONAL",
  JEWELRY:          "PROFESSIONAL",

  RESTAURANT:       "STANDARD",
  ECOMMERCE:        "STANDARD",
  FITNESS_GYM:      "STANDARD",
  SALON_SPA:        "STANDARD",
  FASHION:          "STANDARD",
  CREATOR:          "STANDARD",

  PERSONAL:         "PERSONAL",
};

export interface PricingResult {
  amountCents: number;      // final USD cents after PPP
  displayPrice: string;     // "$19" or "$13" etc.
  country: string;          // detected country code
  multiplier: number;       // PPP multiplier applied
  annualAmountCents: number; // 10 months price (2 months free)
  annualDisplayPrice: string;
}

// ─── Base prices per category per tier (USD cents) ───────────────────────────
// GROWTH = 30 videos/month | UNLIMITED = no limit, no watermark

const BASE_PRICES: Record<string, { GROWTH: number; UNLIMITED: number }> = {
  HIGH_VALUE:   { GROWTH:  7900, UNLIMITED: 24900 },  // $79 / $249
  PROFESSIONAL: { GROWTH:  3900, UNLIMITED:  9900 },  // $39 / $99
  STANDARD:     { GROWTH:  1900, UNLIMITED:  4900 },  // $19 / $49
  PERSONAL:     { GROWTH:   900, UNLIMITED:  2900 },  // $9  / $29
};

// ─── Quota config ─────────────────────────────────────────────────────────────

export const TIER_QUOTA: Record<string, number> = {
  FREE:      1,   // 1 lifetime generation
  GROWTH:    30,  // per month
  UNLIMITED: -1,  // no limit
};

export function isQuotaExceeded(
  tier: string,
  videosThisMonth: number,
  totalGenerations: number,
): boolean {
  if (tier === "FREE") return totalGenerations >= 1;
  if (tier === "UNLIMITED") return false;
  return videosThisMonth >= TIER_QUOTA["GROWTH"];
}

// ─── Upgrade messages sent via WhatsApp ───────────────────────────────────────

export function getUpgradeMessage(workspaceType: string, tier: string, webUrl: string): string {
  const category = WORKSPACE_PRICING_CATEGORY[workspaceType] || "STANDARD";
  const prices = BASE_PRICES[category];
  const growthDisplay = `$${prices.GROWTH / 100}`;
  const unlimitedDisplay = `$${prices.UNLIMITED / 100}`;

  if (tier === "FREE") {
    return (
      `🔒 *You've used your free generation.*\n\n` +
      `To keep creating content, upgrade your plan:\n\n` +
      `📦 *Growth* — ${growthDisplay}/month\n` +
      `30 videos/month · No watermark · All features\n\n` +
      `🚀 *Unlimited* — ${unlimitedDisplay}/month\n` +
      `Unlimited videos · No watermark · Priority queue\n\n` +
      `👉 ${webUrl}/pricing`
    );
  }
  return (
    `🔒 *You've reached your 30 videos for this month.*\n\n` +
    `Upgrade to *Unlimited* for ${unlimitedDisplay}/month — no limits, ever.\n\n` +
    `👉 ${webUrl}/pricing`
  );
}

// Minimum price floor regardless of PPP (keeps unit economics viable)
const PRICE_FLOOR_CENTS = 500; // $5 minimum

// ─── PPP multipliers by country code ─────────────────────────────────────────

export const PPP_MULTIPLIERS: Record<string, number> = {
  // Tier 1 — full price
  US: 1.00, CA: 0.95, GB: 0.92, AU: 0.90, NZ: 0.88,
  CH: 0.95, NO: 0.90, SE: 0.88, DK: 0.88, FI: 0.85,
  DE: 0.85, FR: 0.85, NL: 0.85, AT: 0.85, BE: 0.82,
  IE: 0.85, LU: 0.88, SG: 0.88, HK: 0.85, JP: 0.78,
  KR: 0.72, IL: 0.80,

  // Tier 2 — MENA (varies widely)
  AE: 0.88, SA: 0.82, QA: 0.88, KW: 0.85, BH: 0.78,
  OM: 0.72, JO: 0.45, LB: 0.35, EG: 0.22, MA: 0.28,

  // Tier 3 — Latin America
  BR: 0.38, MX: 0.40, AR: 0.28, CL: 0.45, CO: 0.32,
  PE: 0.30, UY: 0.42, EC: 0.30, VE: 0.20,

  // Tier 4 — South Asia
  IN: 0.28, PK: 0.20, BD: 0.18, LK: 0.22, NP: 0.18,

  // Tier 5 — Southeast Asia
  ID: 0.28, PH: 0.30, MY: 0.48, TH: 0.38, VN: 0.25,
  MM: 0.20, KH: 0.22, LA: 0.20,

  // Tier 6 — Africa
  NG: 0.18, GH: 0.20, KE: 0.22, ZA: 0.35, TZ: 0.18,
  UG: 0.18, ET: 0.15, CI: 0.20, SN: 0.20,

  // Tier 7 — Eastern Europe
  PL: 0.52, CZ: 0.55, HU: 0.45, RO: 0.40, BG: 0.38,
  HR: 0.48, RS: 0.38, UA: 0.28, TR: 0.32,

  // Tier 8 — Rest of Europe
  ES: 0.75, PT: 0.70, IT: 0.78, GR: 0.60,
};

// ─── Phone prefix → country code ─────────────────────────────────────────────
// Longest prefix wins (e.g. +971 matched before +97)

const PHONE_PREFIXES: Array<[string, string]> = [
  // 4-digit prefixes first
  ["+1242", "BS"], ["+1246", "BB"], ["+1264", "AI"], ["+1268", "AG"],
  ["+1284", "VG"], ["+1340", "VI"], ["+1441", "BM"], ["+1473", "GD"],
  ["+1649", "TC"], ["+1664", "MS"], ["+1670", "MP"], ["+1671", "GU"],
  ["+1684", "AS"], ["+1721", "SX"], ["+1758", "LC"], ["+1767", "DM"],
  ["+1784", "VC"], ["+1809", "DO"], ["+1868", "TT"], ["+1869", "KN"],
  ["+1876", "JM"], ["+1939", "PR"],
  // 3-digit prefixes
  ["+880", "BD"], ["+234", "NG"], ["+233", "GH"], ["+254", "KE"],
  ["+255", "TZ"], ["+256", "UG"], ["+251", "ET"], ["+225", "CI"],
  ["+221", "SN"], ["+212", "MA"], ["+216", "TN"], ["+213", "DZ"],
  ["+971", "AE"], ["+966", "SA"], ["+974", "QA"], ["+965", "KW"],
  ["+973", "BH"], ["+968", "OM"], ["+962", "JO"], ["+961", "LB"],
  ["+963", "SY"], ["+964", "IQ"], ["+967", "YE"], ["+972", "IL"],
  ["+977", "NP"], ["+975", "BT"], ["+960", "MV"], ["+994", "AZ"],
  ["+998", "UZ"], ["+992", "TJ"], ["+996", "KG"], ["+993", "TM"],
  ["+856", "LA"], ["+855", "KH"], ["+853", "MO"], ["+852", "HK"],
  ["+850", "KP"], ["+886", "TW"],
  // 2-digit prefixes
  ["+91", "IN"], ["+92", "PK"], ["+93", "AF"], ["+94", "LK"],
  ["+95", "MM"], ["+62", "ID"], ["+63", "PH"], ["+60", "MY"],
  ["+66", "TH"], ["+84", "VN"], ["+65", "SG"], ["+82", "KR"],
  ["+81", "JP"], ["+86", "CN"], ["+61", "AU"], ["+64", "NZ"],
  ["+44", "GB"], ["+49", "DE"], ["+33", "FR"], ["+39", "IT"],
  ["+34", "ES"], ["+31", "NL"], ["+32", "BE"], ["+41", "CH"],
  ["+43", "AT"], ["+45", "DK"], ["+46", "SE"], ["+47", "NO"],
  ["+48", "PL"], ["+36", "HU"], ["+40", "RO"], ["+90", "TR"],
  ["+38", "UA"], ["+7",  "RU"], ["+20", "EG"], ["+27", "ZA"],
  ["+55", "BR"], ["+52", "MX"], ["+54", "AR"], ["+56", "CL"],
  ["+57", "CO"], ["+51", "PE"], ["+58", "VE"], ["+598", "UY"],
  ["+1",  "US"], // default +1 to US (covers CA too — Stripe auto-converts)
];

// ─── Core helpers ─────────────────────────────────────────────────────────────

export function getCountryFromPhone(phone: string): string {
  const normalized = phone.startsWith("+") ? phone : `+${phone}`;
  for (const [prefix, country] of PHONE_PREFIXES) {
    if (normalized.startsWith(prefix)) return country;
  }
  return "US"; // fallback
}

export function getPPPMultiplier(country: string): number {
  return PPP_MULTIPLIERS[country] ?? 0.60; // default 60% for unknown countries
}

export function calculatePrice(
  workspaceType: string,
  tier: "GROWTH" | "UNLIMITED",
  phone: string,
): PricingResult {
  const country = getCountryFromPhone(phone);
  const multiplier = getPPPMultiplier(country);
  const category = WORKSPACE_PRICING_CATEGORY[workspaceType] || "STANDARD";
  const base = BASE_PRICES[category][tier];

  const raw = Math.round(base * multiplier);
  const amountCents = Math.max(raw, PRICE_FLOOR_CENTS);

  // Annual = 10 months (2 months free)
  const annualAmountCents = amountCents * 10;

  const fmt = (cents: number) => `$${Math.floor(cents / 100)}`;

  return {
    amountCents,
    displayPrice: fmt(amountCents),
    country,
    multiplier,
    annualAmountCents,
    annualDisplayPrice: `$${Math.floor(annualAmountCents / 100)}/yr`,
  };
}
