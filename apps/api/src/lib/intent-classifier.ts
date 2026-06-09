import { chat } from "../services/ai.service";

export interface ClassifiedIntent {
  intent: string;
  params: Record<string, string>;
  confidence: number;
  agentResponse?: string;
}

// Fast path: these are exact commands that need no classification
export const EXACT_COMMANDS = new Set([
  "MENU", "HELP", "STATS", "STATUS", "HISTORY", "REPURPOSE", "FESTIVAL",
  "SEASONAL", "CALENDAR", "TEMPLATE", "TEMPLATES", "DAILY ON", "DAILY OFF",
  "UPGRADE", "REFERRAL", "REFER", "CAPTION", "RATECARD",
]);

// Fast path: prefixes that clearly map to commands
export const COMMAND_PREFIXES = [
  "PROPERTY ", "SOLD ", "OPENHOUSE ", "MORTGAGE ", "NEIGHBORHOOD ",
  "DISH ", "OFFER ", "CATERING ", "DELIVERY ",
  "LAUNCH ", "COMPARE ", "GIFTING ",
  "VIRAL ", "GIVEAWAY ", "COLLAB ",
  "CASESTUDY ", "WEBINAR ",
  "LINEUP ", "TICKETS ", "RECAP ",
  "COURSE ", "FREECLASS ", "RESULT ",
  "WEDDING ", "GRADUATION ", "TRIBUTE ",
  "BROADCAST ", "AD ", "EMAIL ", "HASHTAGS ",
  "SCRIPT ", "QUOTE ", "SERIES ", "BULK ",
  "TRANSLATE ", "COUNTDOWN ", "THUMBNAIL ",
  "BIO", "POLL ", "REPLY ",
];

export function isExactCommand(text: string): boolean {
  const upper = text.trim().toUpperCase();
  if (EXACT_COMMANDS.has(upper)) return true;
  if (COMMAND_PREFIXES.some(p => upper.startsWith(p))) return true;
  // Language toggles
  const LANGS = ["HINDI", "TAMIL", "ARABIC", "TELUGU", "MARATHI", "BENGALI",
    "PORTUGUESE", "SPANISH", "FRENCH", "INDONESIAN", "BAHASA", "ENGLISH"];
  if (LANGS.includes(upper)) return true;
  return false;
}

export async function classifyIntent(
  message: string,
  workspaceType: string,
  language = "English"
): Promise<ClassifiedIntent> {
  const prompt = `You are an intent classifier for a ${workspaceType} business WhatsApp AI content assistant.

User message: "${message}"
User's preferred language: ${language}

Classify what the user wants. Extract all relevant parameters from their natural language.

Available intents:
PROPERTY, SOLD, OPENHOUSE, MORTGAGE, NEIGHBORHOOD,
DISH, OFFER, CATERING, DELIVERY,
LAUNCH, COMPARE, GIFTING,
VIRAL, GIVEAWAY, COLLAB,
CASESTUDY, WEBINAR,
LINEUP, TICKETS, RECAP,
COURSE, FREECLASS, RESULT,
WEDDING, GRADUATION, TRIBUTE,
BROADCAST, AD, EMAIL, CALENDAR, HASHTAGS,
SCRIPT, QUOTE, SERIES, BULK, REPURPOSE, FESTIVAL,
GENERAL_CONTENT, HELP, UNKNOWN

Parameter extraction examples:
"make a reel for my butter chicken" → {intent:"DISH", params:{dishName:"butter chicken"}, confidence:0.95}
"I just sold a 3BHK in Bandra for 4.2 crore, took 6 days" → {intent:"SOLD", params:{details:"3BHK Bandra ₹4.2Cr 6 days"}, confidence:0.95}
"create a launch campaign for my new wireless earbuds, selling at 1999" → {intent:"LAUNCH", params:{product:"wireless earbuds", price:"₹1999"}, confidence:0.9}
"what can you do for me?" → {intent:"HELP", params:{}, confidence:0.99}
"good morning" → {intent:"UNKNOWN", params:{}, confidence:0.99, agentResponse:"Good morning! Ready to create content? Send me a photo or describe what you'd like to post today 🚀"}
"I have a new property listing" → {intent:"PROPERTY", params:{}, confidence:0.7, agentResponse:"Great! Share the details — bedrooms, area, price, and key features. Example: 3BHK Bandra West ₹4.2Cr sea facing ready possession"}
"need some content ideas" → {intent:"CALENDAR", params:{}, confidence:0.8}
"make something for diwali" → {intent:"FESTIVAL", params:{}, confidence:0.9}

Return ONLY valid JSON:
{
  "intent": "...",
  "params": {},
  "confidence": 0.0,
  "agentResponse": "only include this for UNKNOWN intent or when you need more info from user"
}`;

  try {
    const result = await chat({ messages: [{ role: "user", content: prompt }], json: true });
    const parsed = JSON.parse(result.text);
    return {
      intent: parsed.intent || "UNKNOWN",
      params: parsed.params || {},
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0,
      agentResponse: parsed.agentResponse,
    };
  } catch {
    return { intent: "UNKNOWN", params: {}, confidence: 0 };
  }
}

export function buildCommandFromIntent(intent: string, params: Record<string, string>): string | null {
  const p = params;
  switch (intent) {
    case "PROPERTY":    return p.details ? `PROPERTY ${p.details}` : null;
    case "SOLD":        return p.details ? `SOLD ${p.details}` : null;
    case "OPENHOUSE":   return p.details ? `OPENHOUSE ${p.details}` : null;
    case "MORTGAGE":    return p.price ? `MORTGAGE ${p.price} ${p.area || ""}`.trim() : null;
    case "NEIGHBORHOOD": return p.area ? `NEIGHBORHOOD ${p.area}` : null;
    case "DISH":        return p.dishName ? `DISH ${p.dishName}` : null;
    case "OFFER":       return p.offer ? `OFFER ${p.offer}` : null;
    case "CATERING":    return `CATERING ${p.eventType || "events"}`;
    case "DELIVERY":    return `DELIVERY ${p.platform || "Swiggy/Zomato"}`;
    case "LAUNCH":      return p.product ? `LAUNCH ${p.product} ${p.price || ""}`.trim() : null;
    case "COMPARE":     return p.product1 && p.product2 ? `COMPARE ${p.product1} vs ${p.product2}` : null;
    case "GIFTING":     return p.occasion ? `GIFTING ${p.occasion} ${p.priceRange || ""}`.trim() : null;
    case "VIRAL":       return p.topic ? `VIRAL ${p.topic}${p.niche ? `, ${p.niche}` : ""}` : null;
    case "GIVEAWAY":    return p.prize ? `GIVEAWAY ${p.prize}` : null;
    case "COLLAB":      return p.brandName ? `COLLAB ${p.brandName}${p.product ? `, ${p.product}` : ""}` : null;
    case "CASESTUDY":   return p.client ? `CASESTUDY ${p.client}, ${p.result || "great results"}, ${p.service || ""}` : null;
    case "WEBINAR":     return p.topic ? `WEBINAR ${p.topic}, ${p.date || "this weekend"}, ${p.price || "Free"}` : null;
    case "LINEUP":      return p.artists ? `LINEUP ${p.artists}, ${p.eventName || "The Event"}, ${p.date || ""}` : null;
    case "TICKETS":     return p.eventName ? `TICKETS ${p.eventName}, ${p.date || ""}, ${p.details || ""}` : null;
    case "RECAP":       return p.eventName ? `RECAP ${p.eventName}, ${p.highlights || "amazing moments"}` : null;
    case "COURSE":      return p.courseName ? `COURSE ${p.courseName}, ${p.price || "₹999"}, ${p.targetStudent || "beginners"}` : null;
    case "FREECLASS":   return p.topic ? `FREECLASS ${p.topic}, ${p.date || "this weekend"}` : null;
    case "RESULT":      return p.studentName ? `RESULT ${p.studentName}, ${p.before || ""}, ${p.after || ""}, ${p.courseName || ""}` : null;
    case "WEDDING":     return p.names ? `WEDDING ${p.names}, ${p.date || ""}, ${p.venue || ""}` : null;
    case "GRADUATION":  return p.name ? `GRADUATION ${p.name}, ${p.degree || ""}, ${p.university || ""}` : null;
    case "TRIBUTE":     return p.name ? `TRIBUTE ${p.name}, ${p.relationship || ""}, ${p.memory || ""}` : null;
    case "BROADCAST":   return p.topic ? `BROADCAST ${p.topic}` : null;
    case "AD":          return p.topic ? `AD ${p.topic}` : null;
    case "EMAIL":       return p.topic ? `EMAIL ${p.topic}` : null;
    case "HASHTAGS":    return p.topic ? `HASHTAGS ${p.topic}` : null;
    case "SCRIPT":      return p.topic ? `SCRIPT ${p.topic}` : null;
    case "QUOTE":       return p.text ? `QUOTE ${p.text}` : null;
    case "SERIES":      return p.topic ? `SERIES ${p.topic}` : null;
    case "BULK":        return p.topic ? `BULK ${p.topic}` : "BULK";
    case "CALENDAR":    return "CALENDAR";
    case "REPURPOSE":   return "REPURPOSE";
    case "FESTIVAL":    return "FESTIVAL";
    case "HELP":        return "MENU";
    default:            return null;
  }
}
