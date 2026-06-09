import express from "express";
import { prisma } from "../lib/prisma";
import { getStripe, PRODUCT_IDS, resolveTierFromSubscription } from "../lib/stripe";
import { calculatePrice, getCountryFromPhone, TIER_QUOTA, type PlanTier } from "../lib/pricing";
import { logger } from "../lib/logger";
import * as wa from "../services/whatsapp.service";
import { alert } from "../lib/notifications";

export const stripeRouter = express.Router();

// GET /api/stripe/price — returns localized price for a user + plan
stripeRouter.get("/price", async (req, res) => {
  const { userId, plan } = req.query as { userId: string; plan: string };
  const tier = (plan?.toUpperCase() || "GROWTH") as "GROWTH" | "UNLIMITED";

  if (!["GROWTH", "UNLIMITED"].includes(tier)) {
    return res.status(400).json({ error: "Invalid plan. Use GROWTH or UNLIMITED." });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { workspace: true },
  });
  if (!user) return res.status(404).json({ error: "User not found" });

  const workspaceType = (user.workspace as any)?.type || "RESTAURANT";
  const phone = user.phone || "+1";
  const pricing = calculatePrice(workspaceType, tier, phone);
  const quota = TIER_QUOTA[tier];

  res.json({
    tier,
    workspaceType,
    country: pricing.country,
    monthly: { amountCents: pricing.amountCents, display: pricing.displayPrice },
    annual:  { amountCents: pricing.annualAmountCents, display: pricing.annualDisplayPrice },
    quota: quota === -1 ? "unlimited" : quota,
  });
});

// POST /api/stripe/checkout — create Stripe Checkout session with PPP pricing
stripeRouter.post("/checkout", async (req, res) => {
  const { plan, userId, billing = "monthly" } = req.body;
  const tier = (plan?.toUpperCase() || "GROWTH") as "GROWTH" | "UNLIMITED";

  if (!["GROWTH", "UNLIMITED"].includes(tier)) {
    return res.status(400).json({ error: "Invalid plan. Use GROWTH or UNLIMITED." });
  }
  if (!PRODUCT_IDS[tier]) {
    return res.status(500).json({ error: `STRIPE_PRODUCT_${tier} not configured in env` });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { workspace: true },
  });
  if (!user) return res.status(404).json({ error: "User not found" });

  const workspaceType = (user.workspace as any)?.type || "RESTAURANT";
  const phone = user.phone || "+1";
  const pricing = calculatePrice(workspaceType, tier, phone);

  const isAnnual = billing === "annual";
  const unitAmount = isAnnual ? pricing.annualAmountCents : pricing.amountCents;
  const interval = isAnnual ? "year" : "month";

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: "usd",
          product: PRODUCT_IDS[tier],
          unit_amount: unitAmount,
          recurring: { interval },
        },
        quantity: 1,
      }],
      success_url: `${process.env.NEXT_PUBLIC_WEB_URL}/dashboard?upgraded=1`,
      cancel_url: `${process.env.NEXT_PUBLIC_WEB_URL}/pricing`,
      client_reference_id: userId,
      customer_email: user.email || undefined,
      metadata: {
        userId,
        tier,
        workspaceType,
        country: pricing.country,
        multiplier: String(pricing.multiplier),
        billing,
      },
      subscription_data: {
        metadata: { userId, tier },
      },
    });

    res.json({
      url: session.url,
      price: pricing.displayPrice,
      country: pricing.country,
    });
  } catch (err: any) {
    logger.error("Stripe checkout error", { err: err.message });
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

// POST /api/stripe/webhook — Stripe webhook handler
stripeRouter.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const sig = req.headers["stripe-signature"] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event: any;
  try {
    event = getStripe().webhooks.constructEvent(req.body, sig, webhookSecret!);
  } catch (err: any) {
    logger.error("Stripe webhook signature failed", { err: err.message });
    return res.status(400).json({ error: "Invalid signature" });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const userId = session.client_reference_id || session.metadata?.userId;
      const tier = (session.metadata?.tier || "GROWTH") as "GROWTH" | "UNLIMITED";
      const quota = TIER_QUOTA[tier] ?? 30;

      await prisma.user.update({
        where: { id: userId },
        data: {
          subscriptionTier: tier as any,
          subscriptionValidUntil: new Date(Date.now() + 366 * 24 * 60 * 60 * 1000),
          videoQuota: quota,
          videosThisMonth: 0,
          stripeCustomerId: session.customer as string || undefined,
          stripeSubscriptionId: session.subscription as string || undefined,
        },
      });

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user?.phone) {
        const label = tier === "UNLIMITED" ? "Unlimited" : "Growth";
        const desc = tier === "UNLIMITED"
          ? "Unlimited videos · No watermark · Priority queue"
          : "30 videos/month · No watermark · All features";
        await wa.sendText(
          user.phone,
          `🎉 *Welcome to ${label} plan!*\n\n✅ ${desc}\n\nType *MENU* to start creating 🚀`
        );
      }

      const amountDisplay = `$${((session.amount_total || 0) / 100).toFixed(0)}`;
      logger.info("Subscription activated", { userId, tier, amount: amountDisplay });
      alert.paymentReceived(userId, tier, amountDisplay).catch(() => {});
    }

    if (event.type === "customer.subscription.updated") {
      const subscription = event.data.object;
      const tier = resolveTierFromSubscription(subscription);
      // Resolve user: prefer metadata (set at checkout), fall back to stripeSubscriptionId index
      let userId = subscription.metadata?.userId;
      if (!userId) {
        const user = await prisma.user.findFirst({ where: { stripeSubscriptionId: subscription.id } });
        userId = user?.id;
      }
      if (tier && userId) {
        const validUntil = subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000)
          : new Date(Date.now() + 366 * 24 * 60 * 60 * 1000);
        await prisma.user.update({
          where: { id: userId },
          data: { subscriptionTier: tier as any, videoQuota: TIER_QUOTA[tier], subscriptionValidUntil: validUntil },
        });
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object;
      let userId = subscription.metadata?.userId;
      if (!userId) {
        const user = await prisma.user.findFirst({ where: { stripeSubscriptionId: subscription.id } });
        userId = user?.id;
      }
      if (userId) {
        await prisma.user.update({
          where: { id: userId },
          data: { subscriptionTier: "FREE" as any, videoQuota: 1, subscriptionValidUntil: null },
        });
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (user?.phone) {
          await wa.sendText(user.phone,
            `⚠️ *Your subscription has ended.*\n\nYou're back on the free plan. Upgrade anytime at ${process.env.NEXT_PUBLIC_WEB_URL}/pricing`
          );
        }
      }
    }

    res.json({ received: true });
  } catch (err: any) {
    logger.error("Stripe webhook processing error", { err: err.message });
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

// GET /api/stripe/portal — customer billing portal
stripeRouter.get("/portal", async (req, res) => {
  const { userId } = req.query;
  const user = await prisma.user.findUnique({ where: { id: userId as string } });
  if (!user) return res.status(404).json({ error: "User not found" });

  try {
    const stripe = getStripe();
    const customers = await stripe.customers.list({ email: user.email || "" });
    if (!customers.data.length) return res.status(404).json({ error: "No billing account found" });

    const session = await stripe.billingPortal.sessions.create({
      customer: customers.data[0].id,
      return_url: `${process.env.NEXT_PUBLIC_WEB_URL}/dashboard`,
    });
    res.json({ url: session.url });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
