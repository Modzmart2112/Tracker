import { chromium } from "playwright";

async function whichChromium(): Promise<string | undefined> {
  try {
    const { execSync } = await import("node:child_process");
    return execSync("which chromium").toString().trim();
  } catch { return undefined; }
}
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// Extract category and product type from URL path
function extractCategoryFromUrl(url: string): { category: string, productType: string } {
  try {
    const urlObj = new URL(url);
    const pathSegments = urlObj.pathname.split('/').filter(s => s.length > 0);
    
    // Common URL patterns:
    // /automotive/diagnostic-tools/
    // /electrical/battery-chargers/
    // /automotive/jump-starters/
    
    if (pathSegments.length >= 2) {
      const category = pathSegments[0].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      const productType = pathSegments[1].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      
      // Map URL segments to proper names
      const categoryMap: Record<string, string> = {
        'Automotive': 'Automotive',
        'Electrical': 'Electrical',
        'Power Tools': 'Power Tools',
        'Hand Tools': 'Hand Tools'
      };
      
      const productTypeMap: Record<string, string> = {
        'Diagnostic Tools': 'Diagnostic Tools',
        'Battery Chargers': 'Battery Chargers',
        'Jump Starters': 'Jump Starters',
        'Test Equipment': 'Test Equipment',
        'Scan Tools': 'Diagnostic Tools',
        'Code Readers': 'Diagnostic Tools'
      };
      
      return {
        category: categoryMap[category] || category,
        productType: productTypeMap[productType] || productType
      };
    }
    
    // Default fallback
    return { category: 'Automotive', productType: 'General' };
  } catch {
    return { category: 'Automotive', productType: 'General' };
  }
}

export const playwrightScraper = {
  async scrapeTotalTools(url: string) {
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
    
    // Wait for the product list to load
    await page.waitForSelector('.product-item, .product', { timeout: 10000 }).catch(() => {});
    
    // Scroll down to trigger lazy loading of images
    await page.waitForLoadState("networkidle").catch(() => {});
    for (let i = 0; i < 10; i++) { 
      await page.mouse.wheel(0, 1000); 
      await sleep(300); 
    }
    
    // Wait a bit more for images to load
    await sleep(2000);

    const products = await page.$$eval('.product-item, .product', (elements) => {
      const items: any[] = [];
      const seen = new Set<string>();
      
      for (const el of elements) {
        try {
          const card = el as HTMLElement;
          
          // Extract product URL
          const linkEl = card.querySelector('a.product-item-link, a[href*="/electrical/"], a[href*="/automotive/"]');
          const href = linkEl ? (linkEl as HTMLAnchorElement).href : '';
          
          if (!href || seen.has(href)) continue;
          
          // Extract title
          const titleEl = card.querySelector('.product-item-name, .product-name, h3, .product-item-link');
          const title = titleEl?.textContent?.trim() || '';
          
          if (!title) continue;
          
          // Extract price
          let price = "";
          const priceEl = card.querySelector('.price, [data-price-type="finalPrice"], .regular-price, .special-price');
          if (priceEl) {
            price = priceEl.textContent?.replace(/\s+/g, " ").trim() || "";
          }
          
          // Extract image - look for the actual product image
          let image = null;
          const imgEl = card.querySelector('img.product-image-photo, img[alt*="' + title.substring(0, 20) + '"]') as HTMLImageElement;
          if (imgEl) {
            // Get the src attribute
            image = imgEl.src || imgEl.getAttribute('data-src') || imgEl.getAttribute('data-lazy');
            
            // Check if it's a placeholder
            if (image && image.includes('data:image') && image.includes('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGP6zwAAAgcBApocMXEAAAAASUVORK5CYII=')) {
              // Try to get a real image URL
              const allImgs = card.querySelectorAll('img');
              for (const img of allImgs) {
                const src = (img as HTMLImageElement).src;
                if (src && !src.includes('data:image') && src.includes('totaltools.com.au/media')) {
                  image = src;
                  break;
                }
              }
            }
          }
          
          // Extract brand from title
          const brandMatch = title.match(/^([A-Z]+(?:\s+[A-Z]+)?)\s+/);
          const brand = brandMatch ? brandMatch[1] : '';
          
          // Extract model number
          const modelPatterns = [
            /\b([A-Z]{2,}\d{4,}[A-Z]*)\b/i,
            /\b([A-Z]+\d+[A-Z]*\d*)\b/i,
          ];
          let model = '';
          for (const pattern of modelPatterns) {
            const match = title.match(pattern);
            if (match) {
              model = match[1];
              break;
            }
          }

          items.push({ title, price, url: href, image, brand, model });
          seen.add(href);
        } catch (err) {
          continue;
        }
      }
      return items;
    });

    await browser.close();

    // Extract category from URL
    const { category, productType } = extractCategoryFromUrl(url);

    return {
      products: products.map(p => ({
        title: p.title,
        priceRaw: p.price,
        price: Number((p.price||"").replace(/[^0-9.]/g,"")) || 0,
        image: p.image,
        url: p.url,
        brand: p.brand || "",
        model: p.model || "",
        category: productType,
        sku: "",
        competitorName: "Total Tools",
        hasPromotion: false
      })),
      totalProducts: products.length,
      categoryName: productType,
      competitorName: "Total Tools",
      sourceUrl: url,
      extractedAt: new Date().toISOString(),
      scraperUsed: "Playwright"
    };
  },

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

    // Extract category from URL
    const { category, productType } = extractCategoryFromUrl(url);

    return {
      products: products.map(p => ({
        title: p.title,
        priceRaw: p.price,
        price: Number((p.price||"").replace(/[^0-9.]/g,"")) || 0,
        image: p.image,
        url: p.url,
        brand: "",
        model: "",
        category: productType,
        sku: "",
        competitorName: "Sydney Tools",
        promotion: { hasPromotion: false }
      })),
      totalProducts: products.length,
      categoryName: productType,
      competitorName: "Sydney Tools",
      sourceUrl: url,
      extractedAt: new Date().toISOString()
    };
  }
};