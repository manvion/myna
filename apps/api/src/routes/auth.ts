import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import * as wa from "../services/whatsapp.service";
import { logger } from "../lib/logger";

export const authRouter = Router();

const RegisterSchema = z.object({
  phone: z.string().regex(/^\+[1-9]\d{7,14}$/),
  name: z.string().min(2).max(100),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
});

authRouter.post("/register", async (req: Request, res: Response) => {
  const parsed = RegisterSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { phone, name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) return res.status(409).json({ error: "Phone already registered" });

  const passwordHash = password ? await bcrypt.hash(password, 12) : undefined;

  const user = await prisma.user.create({
    data: { phone, name, email, passwordHash },
    select: { id: true, phone: true, name: true, email: true, onboardingStep: true },
  });

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: "30d" });

  // Fire-and-forget welcome message — never block registration if WhatsApp fails
  sendWelcomeMessage(phone, name).catch((err) =>
    logger.warn("Welcome message failed", { phone, err: (err as Error).message })
  );

  return res.status(201).json({ user, token });
});

async function sendWelcomeMessage(phone: string, name: string): Promise<void> {
  const firstName = name.split(" ")[0];

  // Message 1 — warm welcome
  await wa.sendText(
    phone,
    `Welcome to Myna, ${firstName}! 🎉\n\nI'm your AI content studio, right here in WhatsApp.\n\nSend me a photo of your business — a dish, a property, a product, your work — and I'll turn it into a ready-to-post reel, caption, and hashtags in under 60 seconds.`
  );

  // Brief pause so the two messages don't arrive as one block
  await new Promise((r) => setTimeout(r, 1500));

  // Message 2 — quick-start buttons
  await wa.sendButtons(
    phone,
    "What type of business do you run? This helps me create content that fits your audience perfectly.",
    [
      { id: "ONBOARD_RESTAURANT", title: "Food & Restaurant" },
      { id: "ONBOARD_REALESTATE", title: "Real Estate" },
      { id: "ONBOARD_OTHER", title: "Other Business" },
    ],
    `Hi ${firstName}, let's get you set up 👇`
  );
}

authRouter.post("/login", async (req: Request, res: Response) => {
  const { phone, password } = req.body;
  if (!phone) return res.status(400).json({ error: "Phone required" });

  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user) return res.status(404).json({ error: "User not found" });

  if (password && user.passwordHash) {
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: "Invalid password" });
  }

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: "30d" });
  return res.json({
    user: { id: user.id, phone: user.phone, name: user.name, email: user.email, onboardingStep: user.onboardingStep },
    token,
  });
});
