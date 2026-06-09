import { chat } from "./ai.service";
import * as wa from "./whatsapp.service";
import { getNearestFestival } from "../lib/festivals";
import { WORKSPACE_LABELS } from "../lib/workspace-labels";
import {
  classifyIntent,
  buildCommandFromIntent,
  isExactCommand,
} from "../lib/intent-classifier";
import {
  getAgentMemory,
  updateAgentMemory,
  summarizeMemory,
  AgentMemory,
} from "../lib/agent-memory";

export type AgentActionType = "COMMAND" | "RESPOND" | "ASK";

export interface AgentAction {
  type: AgentActionType;
  // COMMAND: pass this string back to the WhatsApp flow engine as if the user typed it
  command?: string;
  // RESPOND / ASK: send this text directly to the user
  response?: string;
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export async function processWithAgent(
  rawMessage: string,
  userId: string,
  workspaceType: string,
  language = "English"
): Promise<AgentAction> {
  // 1. Fast path — exact command, skip AI classification entirely
  if (isExactCommand(rawMessage)) {
    return { type: "COMMAND", command: rawMessage.trim() };
  }

  // 2. Classify intent with AI (runs in parallel with memory fetch)
  const [classified, memory] = await Promise.all([
    classifyIntent(rawMessage, workspaceType, language),
    getAgentMemory(userId),
  ]);

  // 3. High confidence: build and return command
  if (classified.confidence >= 0.75 && classified.intent !== "UNKNOWN") {
    const command = buildCommandFromIntent(classified.intent, classified.params);
    if (command) {
      // Update memory async — don't await, don't block response
      updateAgentMemory(userId, {
        recentIntents: [classified.intent],
        lastContentAt: new Date().toISOString(),
      }).catch(() => {});
      return { type: "COMMAND", command };
    }
    // Intent known but params missing — ask for more info
    if (classified.agentResponse) {
      return { type: "ASK", response: classified.agentResponse };
    }
  }

  // 4. Medium confidence: agent has a suggested response from classification
  if (classified.agentResponse) {
    return { type: "RESPOND", response: classified.agentResponse };
  }

  // 5. Low confidence / UNKNOWN: generate a contextual conversational response
  const response = await generateContextualResponse(rawMessage, workspaceType, language, memory);
  return { type: "RESPOND", response };
}

// ─── Contextual conversational fallback ───────────────────────────────────────

async function generateContextualResponse(
  message: string,
  workspaceType: string,
  language: string,
  memory: AgentMemory
): Promise<string> {
  const festival = getNearestFestival();
  const label = WORKSPACE_LABELS[workspaceType as keyof typeof WORKSPACE_LABELS] || workspaceType;
  const stats = summarizeMemory(memory);

  const prompt = `You are a friendly AI marketing assistant for a ${label} business on WhatsApp.

User just said: "${message}"
User stats: ${stats}
User language: ${language}
${festival ? `Upcoming festival: ${festival.name} (${Math.ceil((new Date(festival.date).getTime() - Date.now()) / 86400000)} days away)` : ""}

Reply in 1-2 sentences. Be warm and specific to their business type.
Suggest ONE concrete next step they can take right now (e.g. send a photo, type a specific command).
${language !== "English" ? `Reply in ${language}.` : ""}
No markdown. WhatsApp plain text only. Lead with a relevant emoji.`;

  try {
    const result = await chat({ messages: [{ role: "user", content: prompt }] });
    return result.text;
  } catch {
    return "Send me a photo, video or describe what you want to create — I'll handle the rest! 🚀";
  }
}

// ─── Proactive nudge generator ─────────────────────────────────────────────────
// Called by the scheduler for daily nudges

export async function generateProactiveNudge(
  userId: string,
  workspaceType: string,
  language = "English"
): Promise<string | null> {
  const memory = await getAgentMemory(userId);
  const festival = getNearestFestival();
  const label = WORKSPACE_LABELS[workspaceType as keyof typeof WORKSPACE_LABELS] || workspaceType;

  const daysInactive = memory.daysSinceLastContent;
  const today = new Date().toLocaleDateString("en-IN", { weekday: "long" });
  const festivalNote = festival && Math.ceil((new Date(festival.date).getTime() - Date.now()) / 86400000) <= 5
    ? `Upcoming: ${festival.name} in ${Math.ceil((new Date(festival.date).getTime() - Date.now()) / 86400000)} days — great content opportunity.`
    : "";

  const prompt = `You are a proactive AI marketing assistant for a ${label} business on WhatsApp.

Context:
- Day: ${today}
- Days since last content: ${daysInactive === 999 ? "never created content" : `${daysInactive} days`}
- Content this week: ${memory.contentCreatedThisWeek}
- Most used feature: ${memory.topIntent || "none yet"}
${festivalNote}

Write a short proactive WhatsApp message (2 sentences max):
- If never created content: warm welcome nudge, tell them the single easiest thing to do
- If inactive 3+ days: re-engagement nudge, reference what they usually create
- If festival within 5 days: festival content opportunity
- If active (created content this week): encouragement + suggest something new they haven't tried
- Monday: suggest creating a content plan for the week
${language !== "English" ? `Write in ${language}.` : ""}
No markdown. Plain text. Lead with an emoji. Make it feel personal, not automated.`;

  try {
    const result = await chat({ messages: [{ role: "user", content: prompt }] });
    return result.text;
  } catch {
    return null;
  }
}

// ─── Weekly content plan ───────────────────────────────────────────────────────
// Sent every Monday morning to active users

export async function generateWeeklyPlan(
  userId: string,
  workspaceType: string,
  language = "English"
): Promise<string | null> {
  const memory = await getAgentMemory(userId);
  const label = WORKSPACE_LABELS[workspaceType as keyof typeof WORKSPACE_LABELS] || workspaceType;
  const festival = getNearestFestival();

  const prompt = `You are an AI marketing manager for a ${label} business.

User history:
- Total content created: ${memory.contentCreatedTotal}
- Favourite content type: ${memory.topIntent || "general content"}
- Approval rate: ${Math.round(memory.approvalRate * 100)}%
${festival ? `- Upcoming: ${festival.name} this week` : ""}

Create a SHORT 5-day WhatsApp content plan for this week.
Format exactly like this (no extra text):

📅 *This Week's Content Plan*

Mon: [content idea] → type [COMMAND]
Tue: [content idea] → type [COMMAND]
Wed: [content idea] → type [COMMAND]
Thu: [content idea] → type [COMMAND]
Fri: [content idea] → type [COMMAND]

💡 This week's tip: [one actionable tip]

Keep it specific to their business type. Commands should be real commands they can copy-paste.
${language !== "English" ? `Write the plan in ${language}.` : ""}`;

  try {
    const result = await chat({ messages: [{ role: "user", content: prompt }] });
    // Mark weekly plan sent
    await updateAgentMemory(userId, { weeklyPlanSentAt: new Date().toISOString() });
    return result.text;
  } catch {
    return null;
  }
}

// ─── Post-content follow-up ────────────────────────────────────────────────────
// Sent after content is approved — suggests related next action

export async function generateFollowUpSuggestion(
  workspaceType: string,
  contentType: string,
  approvedIntent: string,
  language = "English"
): Promise<string> {
  const label = WORKSPACE_LABELS[workspaceType as keyof typeof WORKSPACE_LABELS] || workspaceType;

  const FOLLOW_UPS: Record<string, string> = {
    DISH: "want a BROADCAST to tell your WhatsApp contacts about it? Or type OFFER to pair it with a deal.",
    PROPERTY: "type SOLD once it sells to celebrate it, or NEIGHBORHOOD to create a local area guide.",
    SOLD: "type PROPERTY with your next listing — momentum is everything in real estate.",
    LAUNCH: "type COMPARE to show why yours beats the competition, or BULK for 3 more variations.",
    GIVEAWAY: "type VIRAL to create hooks that drive people to enter the giveaway.",
    COURSE: "type RESULT once a student gets an outcome — social proof closes more sales than any ad.",
    WEBINAR: "type BROADCAST to send a reminder to your WhatsApp contacts 1 hour before it starts.",
    CASESTUDY: "type AD to turn this into a Facebook/Instagram ad campaign.",
    COLLAB: "type HASHTAGS to find the best hashtags for maximum reach on this collab post.",
  };

  const followUp = FOLLOW_UPS[approvedIntent] || "type CALENDAR for your full week's content plan.";

  return `✅ Content approved! Next: ${followUp}`;
}
