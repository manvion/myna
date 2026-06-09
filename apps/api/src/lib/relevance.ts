// Detects if uploaded content is relevant to the user's workspace type

export interface RelevanceResult {
  relevant: boolean;
  detectedCategory: string;
  confidence: "high" | "low";
  suggestion?: string;
}

const WORKSPACE_KEYWORDS: Record<string, string[]> = {
  RESTAURANT:        ["food", "dish", "meal", "restaurant", "kitchen", "chef", "cooking", "plate", "drink", "cafe", "menu", "dessert", "cuisine", "ingredients", "recipe"],
  REAL_ESTATE:       ["property", "house", "apartment", "building", "room", "bedroom", "bathroom", "floor", "ceiling", "window", "interior", "exterior", "villa", "flat", "office space", "balcony", "garden"],
  ECOMMERCE:         ["product", "item", "merchandise", "clothing", "shoes", "bag", "accessory", "packaging", "bottle", "box", "gadget", "watch", "shelf", "display"],
  CREATOR:           ["person", "selfie", "portrait", "lifestyle", "studio", "camera", "content", "outfit", "aesthetic", "vlog", "microphone", "influencer"],
  BUSINESS_SERVICES: ["office", "desk", "team", "meeting", "professional", "workplace", "laptop", "corporate", "presentation", "board", "conference"],
  EVENTS:            ["venue", "crowd", "stage", "decoration", "celebration", "party", "audience", "lights", "event", "concert", "festival", "dance floor"],
  EDUCATION:         ["classroom", "book", "study", "learning", "board", "student", "teacher", "notes", "library", "lecture", "whiteboard"],
  PERSONAL:          ["family", "child", "baby", "person", "home", "celebration", "birthday", "wedding", "portrait", "smile", "people", "gathering"],
  FITNESS_GYM:       ["gym", "fitness", "workout", "exercise", "dumbbell", "weight", "equipment", "yoga", "training", "athlete", "muscle", "cardio", "treadmill", "bench press", "protein"],
  SALON_SPA:         ["hair", "salon", "beauty", "makeup", "nail", "spa", "facial", "massage", "skincare", "mirror", "chair", "styling", "colour", "treatment", "relaxation"],
  FASHION:           ["clothing", "outfit", "fashion", "dress", "shirt", "pants", "skirt", "jacket", "model", "style", "wear", "boutique", "collection", "runway", "trend"],
  TRAVEL:            ["travel", "destination", "beach", "mountain", "hotel", "resort", "landscape", "tourist", "scenic", "nature", "vacation", "flight", "airport", "suitcase", "passport", "heritage"],
  HEALTHCARE:        ["medical", "clinic", "doctor", "hospital", "health", "patient", "medicine", "dental", "wellness", "therapy", "equipment", "lab", "nurse", "stethoscope"],
  AUTOMOBILE:        ["car", "vehicle", "automobile", "truck", "suv", "sedan", "engine", "auto", "driving", "garage", "showroom", "tyre", "steering", "dealership"],
  PHOTOGRAPHY:       ["camera", "photo", "portrait", "studio", "lens", "lighting", "shoot", "pose", "backdrop", "flash", "tripod", "photographer", "image"],
  INTERIOR_DESIGN:   ["interior", "design", "furniture", "decor", "room", "living", "sofa", "lamp", "renovation", "architecture", "flooring", "curtain", "modular"],
  HOTEL:             ["hotel", "resort", "lobby", "pool", "suite", "accommodation", "hospitality", "bed", "view", "corridor", "reception", "buffet", "room service"],
  JEWELRY:           ["jewelry", "ring", "necklace", "bracelet", "earring", "diamond", "gold", "silver", "gem", "precious", "ornament", "pendant", "bangle", "chain"],
};

const WORKSPACE_LABEL: Record<string, string> = {
  RESTAURANT:        "food / restaurant",
  REAL_ESTATE:       "property / real estate",
  ECOMMERCE:         "product / ecommerce",
  CREATOR:           "creator / lifestyle",
  BUSINESS_SERVICES: "business / office",
  EVENTS:            "events / venue",
  EDUCATION:         "education",
  PERSONAL:          "personal",
  FITNESS_GYM:       "fitness / gym",
  SALON_SPA:         "salon / spa",
  FASHION:           "fashion / clothing",
  TRAVEL:            "travel / destination",
  HEALTHCARE:        "healthcare / medical",
  AUTOMOBILE:        "automobile / vehicle",
  PHOTOGRAPHY:       "photography / studio",
  INTERIOR_DESIGN:   "interior design",
  HOTEL:             "hotel / hospitality",
  JEWELRY:           "jewelry",
};

export function checkRelevance(workspaceType: string, imageDescription: string): RelevanceResult {
  const desc = imageDescription.toLowerCase();
  const expectedKeywords = WORKSPACE_KEYWORDS[workspaceType] || [];

  const matchCount = expectedKeywords.filter((kw) => desc.includes(kw)).length;
  const matchRatio = matchCount / Math.max(expectedKeywords.length, 1);

  let detectedCategory = workspaceType;
  let highestMatch = matchRatio;

  for (const [ws, keywords] of Object.entries(WORKSPACE_KEYWORDS)) {
    if (ws === workspaceType) continue;
    const wsMatch = keywords.filter((kw) => desc.includes(kw)).length / keywords.length;
    if (wsMatch > highestMatch) {
      highestMatch = wsMatch;
      detectedCategory = ws;
    }
  }

  // Personal user sends clearly business/commercial content → flag
  if (workspaceType === "PERSONAL" && detectedCategory !== "PERSONAL" && highestMatch > 0.2) {
    return {
      relevant: false,
      confidence: highestMatch > 0.35 ? "high" : "low",
      detectedCategory,
      suggestion: `This looks like ${WORKSPACE_LABEL[detectedCategory] || detectedCategory} content. Continue as a personal post, or is this meant for a different workspace?`,
    };
  }

  // Business workspace receives content that clearly belongs to a different category
  if (workspaceType !== "PERSONAL" && detectedCategory !== workspaceType && highestMatch > 0.35) {
    return {
      relevant: false,
      confidence: "high",
      detectedCategory,
      suggestion: `⚠️ This looks like *${WORKSPACE_LABEL[detectedCategory] || detectedCategory}* content, but your workspace is set to *${WORKSPACE_LABEL[workspaceType] || workspaceType}*.\n\nWould you still like to create content with your current workspace settings?`,
    };
  }

  return { relevant: true, detectedCategory: workspaceType, confidence: matchRatio > 0.2 ? "high" : "low" };
}
