import { chromium } from "playwright";

async function whichChromium(): Promise<string | undefined> {
  try {
    const { execSync } = await import("node:child_process");
    return execSync("which chromium").toString().trim();
  } catch { return undefined; }
}
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export const playwrightScraper = {
  async scrapeSydneyTools(url: string) {
    const execPath = await whichChromium();
    const browser = await chromium.launch({
      headless: true,
      executablePath: execPath,
      args: ["--no-sandbox","--disable-setuid-sandbox","--disable-dev-shm-usage"]
    });

    const ctx = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115 Safari/537.36",
      viewport: { width: 1366, height: 900 }
    });

    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForLoadState("networkidle").catch(() => {});
    for (let i = 0; i < 25; i++) { await page.mouse.wheel(0, 2000); await sleep(250); }

    const products = await page.$$eval("a[href^='/product/']", (anchors) => {
      const items: any[] = [];
      const seen = new Set<string>();
      for (const a of anchors as HTMLAnchorElement[]) {
        const href = new URL(a.getAttribute("href")!, location.origin).toString();
        if (seen.has(href)) continue;

        const card = (a.closest("article, li, div") ?? a) as HTMLElement;
        let title = (a.textContent || "").trim();
        if (!title) {
          const h = card.querySelector(".ant-card-meta-title,.product-title,h2,h3");
          title = (h?.textContent || "").trim();
        }
        if (!title) continue;

        let price = (card.querySelector("[data-testid*='price'], .price, [class*='price']")?.textContent || "")
                      .replace(/\s+/g," ").trim();
        if (!/\d/.test(price)) {
          const m = (card.textContent || "").match(/\$\s?\d[\d,]*\.?\d{0,2}/);
          price = m ? m[0] : "";
        }

        const img = card.querySelector("img");
        const image = img?.getAttribute("src")
          || img?.getAttribute("data-src")
          || img?.getAttribute("data-lazy")
          || (img?.getAttribute("srcset")||"").split(",").pop()?.trim().split(" ")[0]
          || null;

        items.push({ title, price, url: href, image });
        seen.add(href);
      }
      return items;
    });

    await browser.close();

    return {
      products: products.map(p => ({
        title: p.title,
        priceRaw: p.price,
        price: Number((p.price||"").replace(/[^0-9.]/g,"")) || 0,
        image: p.image,
        url: p.url,
        brand: "",
        model: "",
        category: "",
        sku: "",
        competitorName: "Sydney Tools",
        promotion: { hasPromotion: false }
      })),
      totalProducts: products.length,
      categoryName: "",
      competitorName: "Sydney Tools",
      sourceUrl: url,
      extractedAt: new Date().toISOString()
    };
  }
};