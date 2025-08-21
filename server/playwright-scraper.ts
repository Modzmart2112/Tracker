import { chromium } from 'playwright';

interface ScrapedProduct {
  sku: string;
  title: string;
  price: number;
  image: string;
  url: string;
  brand?: string;
  model?: string;
  category?: string;
}

export class PlaywrightScraper {
  
  private async getChromiumPath(): Promise<string | undefined> {
    try {
      const { execSync } = await import('child_process');
      return execSync('which chromium').toString().trim();
    } catch {
      return undefined; // Playwright-downloaded Chromium will be used
    }
  }

  private async autoScroll(page: any) {
    await page.evaluate(() => {
      return new Promise((resolve) => {
        let totalHeight = 0;
        let distance = 100;
        let timer = setInterval(() => {
          let scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;
          
          if(totalHeight >= scrollHeight){
            clearInterval(timer);
            resolve(undefined);
          }
        }, 100);
      });
    });
  }

  private async clickLoadMoreIfPresent(page: any) {
    try {
      // Try to click any kind of load more/pagination button
      const loadMoreButton = page.locator('button:has-text("Load more"), button:has-text("Show more"), a:has-text("Load more"), a:has-text("Show more")');
      if (await loadMoreButton.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await loadMoreButton.first().click({ timeout: 2000 });
        await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
      }
    } catch (error) {
      // Ignore errors, continue with extraction
    }
  }
  
  async scrapeSydneyTools(url: string): Promise<{
    products: ScrapedProduct[];
    totalPages: number;
    currentPage: number;
    totalProducts: number;
    categoryName: string;
  }> {
    let browser;
    
    try {
      console.log('Launching Playwright browser for:', url);
      
      const execPath = await this.getChromiumPath();
      console.log('Using Chromium path:', execPath);
      
      browser = await chromium.launch({
        headless: true,
        executablePath: execPath, // Use system Chromium if available
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox', 
          '--disable-dev-shm-usage',
          '--disable-gpu'
        ]
      });
      
      const context = await browser.newContext({
        viewport: { width: 1366, height: 900 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115 Safari/537.36'
      });
      
      const page = await context.newPage();
      
      // Capture any JSON API the SPA calls as a fast fallback
      const apiProducts: any[] = [];
      page.on('response', async (resp) => {
        const responseUrl = resp.url();
        try {
          // Heuristics: category/search endpoints usually return an array of products
          if (/\b(search|product|category|listing)\b/i.test(responseUrl) && resp.request().resourceType() === 'xhr') {
            const ctype = resp.headers()['content-type'] || '';
            if (ctype.includes('application/json')) {
              const json = await resp.json().catch(() => null);
              if (json) {
                // Try to auto-detect product arrays in common shapes
                const candidates = [json, json?.data, json?.results, json?.items, json?.products];
                for (const c of candidates) {
                  if (Array.isArray(c) && c.length) {
                    apiProducts.push(...c);
                    break;
                  }
                }
              }
            }
          }
        } catch {}
      });
      
      console.log('Navigating to Sydney Tools page...');
      await page.goto(url, { 
        waitUntil: 'domcontentloaded',
        timeout: 60000 
      });
      
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
      await this.clickLoadMoreIfPresent(page);
      // Scroll down manually
      await page.mouse.wheel(0, 2000);
      await page.waitForTimeout(2000);
      
      console.log('Page loaded, extracting product data...');
      
      // Extract products using improved approach from ChatGPT
      await page.waitForSelector("a[href^='/product/']", { timeout: 30000 }).catch(() => {
        console.log('No product links found, will try alternative extraction');
      });

      let products = await page.$$eval("a[href^='/product/']", (anchors) => {
        const items: any[] = [];
        const seen = new Set<string>();

        for (const a of anchors as HTMLAnchorElement[]) {
          try {
            const href = new URL(a.getAttribute('href')!, location.origin).toString();
            if (seen.has(href)) continue;

            // Find nearest card container to scope title/price/img
            const card = (a.closest('article, li, div') ?? a) as HTMLElement;

            // Title: try text of anchor, fallback to nearest heading
            let title = (a.textContent || '').trim();
            if (!title) {
              const h = card.querySelector('h3,h2,h4,[data-testid*="title"]');
              title = (h?.textContent || '').trim();
            }
            if (!title) continue;

            // Price: search common selectors or text pattern with $
            let priceEl = card.querySelector('[data-testid*="price"], .price, [class*="price"]') as HTMLElement | null;
            let price = (priceEl?.textContent || '').replace(/\s+/g, ' ').trim();
            if (!price || !/\d/.test(price)) {
              // Fallback: scan text for a $amount pattern
              const text = (card.textContent || '').replace(/\s+/g, ' ');
              const m = text.match(/\$\s?\d[\d,]*\.?\d{0,2}/);
              price = m ? m[0] : null;
            }

            // Image: prefer product image inside the card
            let imgEl = card.querySelector('img');
            let image = (imgEl?.getAttribute('src') ||
                        imgEl?.getAttribute('data-src') ||
                        imgEl?.getAttribute('data-lazy') ||
                        null);

            items.push({ title, price, url: href, image });
            seen.add(href);
          } catch {}
        }
        return items;
      }).catch(() => []);

      // If DOM extraction failed or looks too short, try API fallback
      if (products.length < 8 && apiProducts.length) {
        console.log('Using API fallback data');
        products = apiProducts.map((p: any) => ({
          title: p.title || p.name || '',
          price: typeof p.price === 'string' ? p.price :
                 (p.price?.current || p.price?.value ? `$${p.price.current ?? p.price.value}` : null),
          url: p.url ? new URL(p.url, 'https://sydneytools.com.au').toString()
                     : (p.slug ? `https://sydneytools.com.au/product/${p.slug}` : ''),
          image: p.image || p.img || p.thumbnail || null
        })).filter((x: any) => x.title && x.url);
      }

      // Convert to our format
      const scrapedProducts: ScrapedProduct[] = products.map((p: any, index: number) => {
        const priceNum = p.price ? parseFloat(p.price.replace(/[^0-9.]/g, '')) : 0;
        const brand = p.title.split(' ')[0] || 'BRAND';
        
        return {
          sku: `${brand.toUpperCase().replace(/[^A-Z0-9]/g, '')}-${String(index + 1).padStart(3, '0')}`,
          title: p.title,
          price: priceNum,
          image: p.image && p.image.startsWith('http') ? p.image : (p.image ? `https://sydneytools.com.au${p.image}` : ''),
          url: p.url,
          brand,
          model: p.title.replace(brand, '').trim(),
          category: 'Car Battery Chargers'
        };
      });

      const categoryName = await page.evaluate(() => {
        const titleElement = document.querySelector('h1, .page-title, .category-title');
        return titleElement?.textContent?.trim() || 'PRODUCTS';
      }).catch(() => 'PRODUCTS');
      
      console.log(`✅ Playwright extracted ${scrapedProducts.length} authentic products from Sydney Tools`);
      
      return {
        products: scrapedProducts,
        totalPages: Math.ceil(scrapedProducts.length / 20),
        currentPage: 1,
        totalProducts: scrapedProducts.length,
        categoryName: categoryName.toUpperCase()
      };
      
    } catch (error) {
      console.error('Playwright scraping error:', error);
      throw new Error(`Playwright scraping failed: ${error.message}`);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
}

export const playwrightScraper = new PlaywrightScraper();