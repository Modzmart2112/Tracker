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

    // For Trade Tools, use more generic selectors
    const isTradeTools = url.includes('tradetools');
    const productSelector = isTradeTools 
      ? "a[href*='/p/'], article[class*='product'], div[class*='product-card'], div[class*='ProductCard']"
      : "a[href^='/product/']";

    const products = await page.$$eval(productSelector, (elements) => {
      const items: any[] = [];
      const seen = new Set<string>();
      
      for (const el of elements) {
        try {
          // Get the product URL - either from an anchor or a data attribute
          let href = "";
          if (el.tagName === 'A') {
            href = (el as HTMLAnchorElement).href;
          } else {
            const linkEl = el.querySelector('a');
            if (linkEl) {
              href = linkEl.href;
            }
          }
          
          if (!href || seen.has(href)) continue;

          // Use the element as the card container
          const card = el as HTMLElement;
          
          // Extract title from various possible locations
          let title = "";
          const titleSelectors = [
            '.product-title', '.product-name', '[class*="ProductName"]', 
            'h2', 'h3', 'h4', '.title', '[class*="title"]'
          ];
          for (const selector of titleSelectors) {
            const titleEl = card.querySelector(selector);
            if (titleEl?.textContent) {
              title = titleEl.textContent.trim();
              break;
            }
          }
          if (!title) continue;

          // Extract price
          let price = "";
          const priceSelectors = [
            '.price', '[class*="price"]', '[data-testid*="price"]',
            '.amount', '[class*="Price"]'
          ];
          for (const selector of priceSelectors) {
            const priceEl = card.querySelector(selector);
            if (priceEl?.textContent && /\d/.test(priceEl.textContent)) {
              price = priceEl.textContent.replace(/\s+/g, " ").trim();
              break;
            }
          }
          
          // Fallback price extraction
          if (!price) {
            const m = (card.textContent || "").match(/\$\s?\d[\d,]*\.?\d{0,2}/);
            price = m ? m[0] : "";
          }

          // Extract image
          const img = card.querySelector("img");
          const image = img?.getAttribute("src")
            || img?.getAttribute("data-src")
            || img?.getAttribute("data-lazy")
            || (img?.getAttribute("srcset")||"").split(",").pop()?.trim().split(" ")[0]
            || null;

          items.push({ title, price, url: href, image });
          seen.add(href);
        } catch (err) {
          // Skip this element if there's an error
          continue;
        }
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