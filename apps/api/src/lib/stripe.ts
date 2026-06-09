import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY not set");
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-04-10" });
  }
  return _stripe;
}

// ─── Stripe product IDs — one per tier (price calculated dynamically via PPP) ──
// Create two products in Stripe dashboard: GROWTH and UNLIMITED.
// Set STRIPE_PRODUCT_GROWTH and STRIPE_PRODUCT_UNLIMITED in .env.

export const PRODUCT_IDS: Record<string, string> = {
  GROWTH:    process.env.STRIPE_PRODUCT_GROWTH    || "",
  UNLIMITED: process.env.STRIPE_PRODUCT_UNLIMITED || "",
};

// ─── Webhook tier resolution ───────────────────────────────────────────────────
// Resolves which tier a Stripe subscription maps to from metadata.

export function resolveTierFromSubscription(subscription: Stripe.Subscription): "GROWTH" | "UNLIMITED" | null {
  const meta = subscription.metadata?.tier;
  if (meta === "GROWTH" || meta === "UNLIMITED") return meta;
  return null;
}
