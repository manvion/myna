import { logger } from "../lib/logger";

export interface ScrapeResult {
  url: string;
  title: string;
  description: string;
  services: string[];
  products: Array<{ name: string; price?: string; description?: string }>;
  images: string[];
  offers: string[];
  rawText: string;
}

export async function scrapeWebsite(url: string): Promise<ScrapeResult> {
  // Try Puppeteer
  try {
    return await scrapeWithPuppeteer(url);
  } catch (err) {
    logger.warn("Puppeteer scrape failed, trying fetch fallback", { err: (err as Error).message });
    return await scrapeWithFetch(url);
  }
}

async function scrapeWithPuppeteer(url: string): Promise<ScrapeResult> {
  const puppeteer = await import("puppeteer");
  const browser = await puppeteer.default.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (compatible; MynaBot/1.0)");
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

    const data = await page.evaluate(() => {
      const getText = (sel: string) => document.querySelector(sel)?.textContent?.trim() || "";
      const getAll = (sel: string) => Array.from(document.querySelectorAll(sel)).map((el) => el.textContent?.trim() || "").filter(Boolean);
      const getAllSrc = (sel: string) => Array.from(document.querySelectorAll(sel)).map((el: any) => el.src || el.href || "").filter((s: string) => s.startsWith("http"));

      return {
        title: getText("h1") || document.title,
        description: getText('meta[name="description"]') || getText("p"),
        headings: getAll("h1, h2, h3").slice(0, 20),
        paragraphs: getAll("p").slice(0, 30),
        images: getAllSrc("img[src]").slice(0, 20),
        prices: getAll("[class*='price'], [class*='cost'], [class*='rate']").slice(0, 10),
        ctas: getAll("button, .btn, [class*='cta']").slice(0, 10),
      };
    });

    return buildScrapeResult(url, data);
  } finally {
    await browser.close();
  }
}

async function scrapeWithFetch(url: string): Promise<ScrapeResult> {
  const { default: axios } = await import("axios");
  const { load } = await import("cheerio");

  const { data: html } = await axios.get(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; MynaBot/1.0)" },
    timeout: 15000,
  });

  const $ = load(html);
  $("script, style, nav, footer, header").remove();

  const title = $("h1").first().text().trim() || $("title").text().trim();
  const description = $('meta[name="description"]').attr("content") || $("p").first().text().trim();
  const headings = $("h1, h2, h3").map((_, el) => $(el).text().trim()).get().slice(0, 20);
  const paragraphs = $("p").map((_, el) => $(el).text().trim()).get().filter((t) => t.length > 20).slice(0, 20);
  const images = $("img[src]").map((_, el) => $(el).attr("src") || "").get().filter((s) => s.startsWith("http")).slice(0, 15);

  return buildScrapeResult(url, { title, description, headings, paragraphs, images, prices: [], ctas: [] });
}

function buildScrapeResult(url: string, data: any): ScrapeResult {
  const rawText = [...data.headings, ...data.paragraphs].join(" ");

  // Extract services from headings
  const services = data.headings.filter((h: string) =>
    /service|offer|provide|solution|package|plan|feature/i.test(h)
  ).slice(0, 8);

  // Extract products from price mentions
  const products = data.prices.slice(0, 5).map((p: string) => ({ name: p, price: extractPrice(p) }));

  // Detect offers
  const offers = [...data.headings, ...data.ctas, ...data.paragraphs]
    .filter((t: string) => /deal|offer|discount|sale|free|promo|save|\d+%/i.test(t))
    .slice(0, 5);

  return {
    url,
    title: data.title,
    description: data.description,
    services,
    products,
    images: data.images,
    offers,
    rawText: rawText.slice(0, 3000),
  };
}

function extractPrice(text: string): string | undefined {
  const match = text.match(/[\$£€₹][\d,]+(\.\d{2})?|\d+[\d,]*\s*(USD|INR|EUR|GBP)/i);
  return match?.[0];
}
