import { chromium, Browser, Page } from "playwright";
import * as crypto from "crypto";

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

function abs(base: string, maybe: string | undefined | null): string {
  try {
    if (!maybe) return "";
    return new URL(maybe, base).toString();
  } catch { return maybe || ""; }
}

function bestSrc(img: HTMLImageElement): string | null {
  const srcset = img.getAttribute("srcset") || img.getAttribute("data-srcset");
  if (srcset) {
    const last = srcset.split(",").map(s => s.trim()).pop();
    if (last) return last.split(" ")[0];
  }
  return img.getAttribute("src") || img.getAttribute("data-src") || img.getAttribute("data-lazy");
}

function hash(...parts: string[]) {
  return crypto.createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 16);
}

type Slide = {
  image: string;
  link: string;
  label: string;
  fingerprint: string;
};

const CONTAINER_SELECTOR = [
  // common hero/carousel containers
  ".heroCarousel",
  ".swiper, .swiper-container",
  ".slick-slider",
  ".owl-carousel",
  ".flickity-enabled",
  "[data-section-type='slideshow']",
  ".slideshow, .slideshow-wrapper",
  "[data-nosto-ref]", // Nosto widgets often wrap carousels
  ".glide, .glide__track",
  // Additional selectors for common AU tool sites
  ".hero-banner",
  ".homepage-carousel",
  ".banner-slider"
].join(", ");

const SLIDE_SELECTOR = [
  ".swiper-slide",
  ".slick-slide",
  ".owl-item",
  ".glide__slide",
  ".slideshow__slide",
  ".carousel-item",
  "li",
  "div"
].join(", ");

export async function scrapeHero(url: string, screenshotPath?: string): Promise<Slide[]> {
  // Prefer system chromium on Replit; fall back to PW chromium
  let execPath: string | undefined;
  try {
    const { execSync } = await import("node:child_process");
    execPath = execSync("which chromium").toString().trim();
  } catch {}

  const browser: Browser = await chromium.launch({
    headless: true,
    executablePath: execPath, // ok if undefined
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
  });
  
  const ctx = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115 Safari/537.36",
    viewport: { width: 1366, height: 900 }
  });
  
  const page: Page = await ctx.newPage();

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    // allow carousels (Swiper/Slick) to init
    await page.waitForLoadState("networkidle").catch(() => {});
    
    // Scroll to trigger lazy loading
    for (let i = 0; i < 10; i++) { 
      await page.mouse.wheel(0, 200); 
      await sleep(100); 
    }

    // find a plausible hero container near the top with multiple images
    const containers = await page.$$(CONTAINER_SELECTOR);
    let containerHandle = null;
    
    for (const c of containers) {
      const box = await c.boundingBox().catch(() => null);
      if (!box) continue;
      // prefer elements in the top ~1200px area that have multiple images inside
      const imgCount = await c.evaluate((el) => el.querySelectorAll("img").length);
      if (box.y < 1200 && imgCount >= 1) { 
        containerHandle = c; 
        break; 
      }
    }

    // Fallback: whole page if no container found
    const scope = containerHandle || page;

    // optional targeted screenshot
    if (screenshotPath && containerHandle) {
      await containerHandle.screenshot({ path: screenshotPath }).catch(() => {});
    }

    // Collect slides
    const slides = await scope.$$eval(SLIDE_SELECTOR, (nodes, base) => {
      const seen = new Set<string>();
      const out: any[] = [];
      
      function pickImg(el: Element): HTMLImageElement | null {
        const imgs = el.querySelectorAll("img");
        return (imgs[0] as HTMLImageElement) || null;
      }
      
      for (const n of nodes) {
        // filter to nodes that actually contain a banner-like image
        const img = pickImg(n); 
        if (!img) continue;
        
        const a = n.querySelector("a") || img.closest("a");
        const imgUrl = (() => {
          const srcset = img.getAttribute("srcset") || img.getAttribute("data-srcset");
          if (srcset) {
            const last = srcset.split(",").map(s => s.trim()).pop();
            if (last) return new URL(last.split(" ")[0], base as string).toString();
          }
          const src = img.getAttribute("src") || img.getAttribute("data-src") || img.getAttribute("data-lazy") || "";
          try { return new URL(src, base as string).toString(); } catch { return src; }
        })();
        
        const href = a ? (() => { 
          try { 
            return new URL(a.getAttribute("href") || "", base as string).toString(); 
          } catch { 
            return a.getAttribute("href") || ""; 
          } 
        })() : "";
        
        const label = (img.getAttribute("alt") || (a?.textContent || "") || "").trim();
        const key = [imgUrl, href].join("|");
        
        if (!imgUrl || seen.has(key)) continue;
        seen.add(key);
        out.push({ image: imgUrl, link: href, label });
      }
      return out;
    }, url);

    // fingerprints
    const withHash: Slide[] = slides.map(s => ({
      ...s,
      fingerprint: hash(s.image, s.link, s.label)
    }));

    return withHash;
  } finally {
    await browser.close();
  }
}

// Helper to convert scraped slides to carousel format
export function slidesToCarousels(slides: Slide[], competitorId: string): any[] {
  return slides.slice(0, 6).map((slide, index) => ({
    competitorId,
    imageUrl: slide.image,
    linkUrl: slide.link,
    title: slide.label || `Promotion ${index + 1}`,
    description: "",
    promoText: extractPromoText(slide.label),
    position: index,
    active: true,
    fingerprint: slide.fingerprint
  }));
}

function extractPromoText(label: string): string {
  // Try to extract promotional text from the label
  const patterns = [
    /(\d+%\s*OFF)/i,
    /(SALE)/i,
    /(NEW)/i,
    /(CLEARANCE)/i,
    /(FREE\s+SHIPPING)/i,
    /(TRADE)/i,
    /(SAVE\s+\$?\d+)/i,
  ];
  
  for (const pattern of patterns) {
    const match = label.match(pattern);
    if (match) return match[1].toUpperCase();
  }
  
  return "FEATURED";
}