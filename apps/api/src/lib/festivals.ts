// Indian + global festival calendar — auto-suggests seasonal content

export interface Festival {
  name: string;
  emoji: string;
  date: string; // YYYY-MM-DD (approximate for lunisolar ones)
  leadDays: number; // how many days before to start suggesting
  contentIdea: Record<string, string>; // workspace type → content angle
}

export const FESTIVALS: Festival[] = [
  {
    name: "Makar Sankranti", emoji: "🪁", date: "2026-01-14", leadDays: 7,
    contentIdea: {
      RESTAURANT: "Til-gul ladoo special — festive thali launch",
      REAL_ESTATE: "New year, new home — Sankranti is the perfect time to buy",
      ECOMMERCE: "Festive collection drop — Sankranti sale",
      CREATOR: "Kite flying day — what Sankranti means to me",
      EVENTS: "Sankranti kite festival — tickets available",
      EDUCATION: "New year, new skills — January batch open",
      BUSINESS_SERVICES: "New financial year planning — book a consultation",
      PERSONAL: "Family Sankranti celebration — kite flying day with the kids",
    },
  },
  {
    name: "Valentine's Day", emoji: "❤️", date: "2026-02-14", leadDays: 10,
    contentIdea: {
      RESTAURANT: "Couples dinner special — reserve your table",
      REAL_ESTATE: "Buy a home for the one you love",
      ECOMMERCE: "Gift her something she'll never forget",
      CREATOR: "My love story with content creation",
      EVENTS: "Valentine's night — limited couples passes",
      EDUCATION: "The skill that changed my relationship with work",
      BUSINESS_SERVICES: "Show your business some love — free audit this week",
    },
  },
  {
    name: "Holi", emoji: "🎨", date: "2026-03-02", leadDays: 10,
    contentIdea: {
      RESTAURANT: "Holi special thandai and snacks — pre-book now",
      REAL_ESTATE: "Colourful new beginnings — new listings dropping",
      ECOMMERCE: "Holi sale — colour your wardrobe",
      CREATOR: "Holi day in my life — behind the scenes",
      EVENTS: "Holi bash — DJ + colours + dance",
      EDUCATION: "Spring batch starts — new colours, new skills",
      BUSINESS_SERVICES: "Fresh start this Holi — book a strategy session",
    },
  },
  {
    name: "Eid ul-Fitr", emoji: "🌙", date: "2026-03-20", leadDays: 10,
    contentIdea: {
      RESTAURANT: "Eid special menu — biryani, kebabs, sewaiyan",
      REAL_ESTATE: "Start this Eid in your dream home",
      ECOMMERCE: "Eid collection — sherwanis, sarees, gifts",
      CREATOR: "Eid Mubarak — celebrating with my community",
      EVENTS: "Eid gala night — family friendly",
      EDUCATION: "Eid offers — 30% off all courses",
      BUSINESS_SERVICES: "Eid Mubarak from our team — special rates this week",
    },
  },
  {
    name: "Independence Day", emoji: "🇮🇳", date: "2026-08-15", leadDays: 7,
    contentIdea: {
      RESTAURANT: "Tricolour thali — celebrating 78 years of freedom",
      REAL_ESTATE: "Own a piece of India — Independence Day offers",
      ECOMMERCE: "Made in India collection — Independence Day sale",
      CREATOR: "What India means to me — 15 August special",
      EVENTS: "Independence Day celebration — free entry",
      EDUCATION: "Skill India — Independence Day scholarship",
      BUSINESS_SERVICES: "Building India's future — startup special rates",
    },
  },
  {
    name: "Ganesh Chaturthi", emoji: "🐘", date: "2026-08-22", leadDays: 10,
    contentIdea: {
      RESTAURANT: "Prasad menu — modaks and festive thali",
      REAL_ESTATE: "Ganpati blessings — new home, new beginnings",
      ECOMMERCE: "Festive collection — pooja essentials and décor",
      CREATOR: "Ganesh Chaturthi celebration — day in my life",
      EVENTS: "Ganesh utsav — 10-day celebration programme",
      EDUCATION: "Vidya Ganesh — begin your learning journey",
      BUSINESS_SERVICES: "Auspicious beginnings — new projects this Ganesh Chaturthi",
    },
  },
  {
    name: "Navratri", emoji: "💃", date: "2026-10-09", leadDays: 7,
    contentIdea: {
      RESTAURANT: "Navratri fasting menu — vrat-friendly dishes all 9 days",
      REAL_ESTATE: "9 reasons to invest in property this Navratri",
      ECOMMERCE: "Garba collection — lehengas, chaniya cholis, jewellery",
      CREATOR: "My Navratri look every day — 9-day series",
      EVENTS: "Garba night — join 5000+ dancers",
      EDUCATION: "9 days, 9 skills — Navratri challenge",
      BUSINESS_SERVICES: "9 business wins this Navratri — client results",
    },
  },
  {
    name: "Diwali", emoji: "🪔", date: "2026-10-19", leadDays: 14,
    contentIdea: {
      RESTAURANT: "Diwali special sweets and snacks — pre-order now",
      REAL_ESTATE: "Light up your life — Diwali property offers",
      ECOMMERCE: "Diwali sale — biggest of the year",
      CREATOR: "My Diwali decoration + celebration",
      EVENTS: "Diwali gala — food, fireworks, family",
      EDUCATION: "Diwali scholarship — 50% off, limited seats",
      BUSINESS_SERVICES: "Diwali special — free consultation this week",
    },
  },
  {
    name: "Christmas", emoji: "🎄", date: "2026-12-25", leadDays: 10,
    contentIdea: {
      RESTAURANT: "Christmas dinner — book your table now",
      REAL_ESTATE: "Gift yourself a home this Christmas",
      ECOMMERCE: "Christmas gift guide — for everyone on your list",
      CREATOR: "My Christmas vlog — decorating + celebrations",
      EVENTS: "Christmas party — DJ, dinner, Santa",
      EDUCATION: "Year-end sale — new year, new skills",
      BUSINESS_SERVICES: "End-of-year review — let's plan 2027 together",
    },
  },
  {
    name: "New Year", emoji: "🎆", date: "2026-12-31", leadDays: 7,
    contentIdea: {
      RESTAURANT: "New Year's Eve dinner — last tables remaining",
      REAL_ESTATE: "Start 2027 in your dream home",
      ECOMMERCE: "New Year, New You — January collection",
      CREATOR: "2026 wrapped — my biggest wins and lessons",
      EVENTS: "New Year countdown party — limited passes",
      EDUCATION: "2027 goals — start with the right skills",
      BUSINESS_SERVICES: "New year business audit — book now",
    },
  },

  // ─── Islamic calendar (Gulf + South Asia + Southeast Asia) ───────────────────

  {
    name: "Ramadan", emoji: "🌙", date: "2026-02-17", leadDays: 14,
    contentIdea: {
      RESTAURANT: "Ramadan iftar special — sehri and iftar platters, family buffet",
      REAL_ESTATE: "Blessed beginnings this Ramadan — start your home journey",
      ECOMMERCE: "Ramadan collection — modest fashion, dates, gifts & lanterns",
      CREATOR: "My Ramadan routine — sehri, recitation, reflection day in my life",
      EVENTS: "Ramadan iftar gathering — corporate and family packages",
      EDUCATION: "Learn a new skill this Ramadan — 30-day challenge",
      BUSINESS_SERVICES: "Ramadan offers — discounted consultations, Ramadan Kareem",
    },
  },
  {
    name: "Eid ul-Adha", emoji: "🐑", date: "2026-05-27", leadDays: 10,
    contentIdea: {
      RESTAURANT: "Eid ul-Adha special — qurbani meat preparations, festive menu",
      REAL_ESTATE: "New home, new chapter — Eid ul-Adha blessings",
      ECOMMERCE: "Eid al-Adha collection — sherwanis, gifts, celebration essentials",
      CREATOR: "Eid ul-Adha day in my life — family, prayers, feast",
      EVENTS: "Eid celebration gathering — family-friendly event",
      EDUCATION: "Eid Mubarak — special discount on all courses",
      BUSINESS_SERVICES: "Eid ul-Adha Mubarak — season's greetings from our team",
    },
  },

  // ─── South Indian festivals ──────────────────────────────────────────────────

  {
    name: "Pongal", emoji: "🍚", date: "2026-01-14", leadDays: 7,
    contentIdea: {
      RESTAURANT: "Pongal special — traditional Ven Pongal and Chakra Pongal",
      REAL_ESTATE: "Pongal blessings — new home, new harvest of prosperity",
      ECOMMERCE: "Pongal sale — traditional wear, puja items, fresh launches",
      CREATOR: "My Pongal celebration — kolam, sugarcane, tradition",
      EVENTS: "Pongal cultural festival — music, dance, food",
      EDUCATION: "Pongal offer — Tamil batch enrollment open",
      BUSINESS_SERVICES: "Pongalo Pongal — fresh start for your business",
    },
  },
  {
    name: "Onam", emoji: "🌸", date: "2026-08-25", leadDays: 10,
    contentIdea: {
      RESTAURANT: "Onam Sadya — traditional 26-course feast on banana leaf",
      REAL_ESTATE: "Onam blessings — your dream home awaits in God's own country",
      ECOMMERCE: "Onam sale — Kerala handloom, kasavu sarees, flower decor",
      CREATOR: "My Onam celebration — Pookalam, Sadya, boat race day",
      EVENTS: "Onam cultural event — Vallam Kali, Pulikali, dance performances",
      EDUCATION: "Onam special — 50% off all courses this harvest season",
      BUSINESS_SERVICES: "Happy Onam — celebrating abundance with our clients",
    },
  },
  {
    name: "Bihu", emoji: "🌾", date: "2026-04-14", leadDays: 7,
    contentIdea: {
      RESTAURANT: "Bohag Bihu special — traditional Assamese thali and pithas",
      REAL_ESTATE: "Bihu blessings — new season, new home in beautiful Assam",
      ECOMMERCE: "Bihu collection — Assam silk, mekhela sador, traditional crafts",
      CREATOR: "Happy Bihu — Assamese new year celebration day in my life",
      EVENTS: "Bihu celebration — Husori, Bihu dance, cultural program",
      EDUCATION: "Rongali Bihu — new year, new skills, new beginnings",
      BUSINESS_SERVICES: "Bihu greetings — Northeast India business special",
    },
  },

  // ─── Bengali calendar ─────────────────────────────────────────────────────

  {
    name: "Durga Puja", emoji: "🙏", date: "2026-10-14", leadDays: 14,
    contentIdea: {
      RESTAURANT: "Durga Puja special — rolls, biryani, mishti doi pandal food",
      REAL_ESTATE: "Durga Puja blessings — start this Pujo in your new home",
      ECOMMERCE: "Pujo collection — Bengali fashion, jewellery, decor",
      CREATOR: "My Durga Puja pandal hopping — Kolkata Pujo day in my life",
      EVENTS: "Durga Puja cultural program — dance, music, food stalls",
      EDUCATION: "Durga Puja special offer — enroll before the pujo holidays",
      BUSINESS_SERVICES: "Shubho Bijoya — wishing you prosperity this Durga Puja",
    },
  },
  {
    name: "Pohela Boishakh", emoji: "🌺", date: "2026-04-14", leadDays: 7,
    contentIdea: {
      RESTAURANT: "Pohela Boishakh special — traditional Bengali new year feast",
      REAL_ESTATE: "Bengali New Year, new home — Shubho Nababarsha",
      ECOMMERCE: "Boishakh collection — Bengali fashion, sweets, gifts",
      CREATOR: "Pohela Boishakh celebration — Bengali new year day in my life",
      EVENTS: "Boishakh Mela — cultural fair, music, dance, food",
      EDUCATION: "Shubho Nababarsha — new year learning challenge",
      BUSINESS_SERVICES: "Subho Nababarsha — Bengali new year greetings",
    },
  },

  // ─── Brazil / LatAm ──────────────────────────────────────────────────────────

  {
    name: "Carnaval", emoji: "🎭", date: "2026-02-16", leadDays: 14,
    contentIdea: {
      RESTAURANT: "Carnaval especial — feijoada, caipirinhas, festa completa",
      REAL_ESTATE: "Carnaval em casa nova — seu imóvel dos sonhos te espera",
      ECOMMERCE: "Coleção Carnaval — fantasias, acessórios, glitter",
      CREATOR: "Meu Carnaval — bastidores, bloco, looks do dia",
      EVENTS: "Baile de Carnaval — abadás, open bar, axé e samba",
      EDUCATION: "Carnaval sem enrolação — aproveite a folia e volte renovado",
      BUSINESS_SERVICES: "Carnaval — seu negócio não para, nós também não",
    },
  },

  // ─── Indonesia ───────────────────────────────────────────────────────────────

  {
    name: "Lebaran / Eid Fitri", emoji: "🌙", date: "2026-03-20", leadDays: 10,
    contentIdea: {
      RESTAURANT: "Promo Lebaran — ketupat, opor ayam, rendang spesial",
      REAL_ESTATE: "Lebaran di rumah baru — wujudkan impian Anda",
      ECOMMERCE: "Koleksi Lebaran — baju koko, gamis, hampers spesial",
      CREATOR: "Hari Raya special — mudik, silaturahmi, momen keluarga",
      EVENTS: "Open house Lebaran — buka pintu untuk semua",
      EDUCATION: "Promo Ramadan & Lebaran — diskon khusus untuk semua kelas",
      BUSINESS_SERVICES: "Selamat Idul Fitri — mohon maaf lahir dan batin",
    },
  },
];

const PERSONAL_FESTIVAL_IDEAS: Record<string, string> = {
  "Makar Sankranti": "Family kite flying day — capture the joy",
  "Valentine's Day": "Love letter to your partner — heartfelt reel",
  "Holi": "Holi with family — colour and joy moments",
  "Eid ul-Fitr": "Eid Mubarak — family celebration reel",
  "Independence Day": "Teaching my kids about India — proud parent moment",
  "Ganesh Chaturthi": "Family Ganpati celebration — pooja and prasad",
  "Navratri": "Family Garba night — dressed up and dancing",
  "Diwali": "Diwali diyas and family portraits — the whole family together",
  "Christmas": "Christmas morning with the family — gift unwrapping",
  "New Year": "Family New Year countdown — 2027 begins!",
  "Ramadan": "My Ramadan with family — sehri, iftar, togetherness",
  "Eid ul-Adha": "Eid ul-Adha with family — prayers, qurbani, feast together",
  "Pongal": "Pongal at home — kolam, sugarcane, family traditions",
  "Onam": "Onam Sadya at home — family feast on banana leaf",
  "Bihu": "Bihu with family — traditional dress, dance, celebration",
  "Durga Puja": "Durga Puja family outing — pandal hopping, new clothes",
  "Pohela Boishakh": "Bengali New Year with family — traditional celebration",
  "Carnaval": "Carnaval em família — fantasias, alegria e muito samba",
  "Lebaran / Eid Fitri": "Lebaran bersama keluarga — silaturahmi dan kebersamaan",
};

// Patch PERSONAL into every festival
FESTIVALS.forEach((f) => {
  if (!f.contentIdea.PERSONAL) {
    f.contentIdea.PERSONAL = PERSONAL_FESTIVAL_IDEAS[f.name] || `${f.name} family celebration`;
  }
});

export function getUpcomingFestivals(daysAhead = 14): Festival[] {
  const now = new Date();
  return FESTIVALS.filter((f) => {
    const festDate = new Date(f.date);
    const diff = (festDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= daysAhead;
  });
}

export function getNearestFestival(): Festival | null {
  const upcoming = getUpcomingFestivals(30);
  return upcoming.length > 0 ? upcoming[0] : null;
}
