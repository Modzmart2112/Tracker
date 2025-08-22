import { chromium, Page } from 'playwright';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function whichChromium() {
  try {
    const { stdout } = await execAsync("which chromium");
    return stdout.trim();
  } catch { 
    return undefined; 
  }
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export const tradeToolsScraper = {
  async scrapeTradeTools(url: string) {
    console.log('Starting Trade Tools specific scraper for:', url);
    
    const execPath = await whichChromium();
    const browser = await chromium.launch({
      headless: true,
      executablePath: execPath,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
    });

    const ctx = await browser.newContext({
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      viewport: { width: 1920, height: 1080 }
    });

    const page = await ctx.newPage();
    
    try {
      // Navigate to the page
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
      console.log('Page loaded, waiting for products...');
      
      // Wait for the page to stabilize
      await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {
        console.log('Network idle timeout - continuing');
      });
      
      // Wait a bit for React to render
      await sleep(3000);
      
      // Scroll to trigger lazy loading
      console.log('Scrolling to load all products...');
      const scrollHeight = await page.evaluate(() => document.body.scrollHeight);
      const viewportHeight = await page.evaluate(() => window.innerHeight);
      const scrollSteps = Math.ceil(scrollHeight / viewportHeight);
      
      for (let i = 0; i < scrollSteps; i++) {
        await page.evaluate((step) => {
          window.scrollTo(0, step * window.innerHeight);
        }, i);
        await sleep(500);
      }
      
      // Scroll back to top
      await page.evaluate(() => window.scrollTo(0, 0));
      await sleep(1000);
      
      // Extract products using page evaluation
      console.log('Extracting products...');
      const products = await page.evaluate(() => {
        const items: any[] = [];
        
        // Strategy 1: Look for any element containing product information
        // Trade Tools uses minified class names, so we need to be smart about detection
        
        // Find all links that might be products
        const allLinks = Array.from(document.querySelectorAll('a'));
        const productLinks = allLinks.filter(link => {
          const href = link.getAttribute('href') || '';
          // Trade Tools product URLs contain /p/ followed by product code
          return href.includes('/p/') && !href.includes('signin') && !href.includes('cart');
        });
        
        console.log(`Found ${productLinks.length} potential product links`);
        
        // If we found product links, extract data from their containers
        if (productLinks.length > 0) {
          productLinks.forEach(link => {
            const href = link.href;
            const container = link.closest('article') || link.parentElement?.parentElement || link.parentElement;
            
            if (!container) return;
            
            // Extract title - look for heading tags or the link text
            let title = '';
            const heading = container.querySelector('h1, h2, h3, h4, h5, h6');
            if (heading) {
              title = heading.textContent?.trim() || '';
            } else {
              // Sometimes the title is in the link itself
              const linkText = link.textContent?.trim() || '';
              if (linkText && linkText.length > 10 && !linkText.includes('$')) {
                title = linkText;
              }
            }
            
            // Extract price - look for dollar signs
            let price = '';
            let originalPrice = '';
            const priceMatches = (container.textContent || '').matchAll(/\$[\d,]+(?:\.\d{2})?/g);
            const prices = Array.from(priceMatches).map(m => m[0]);
            if (prices.length > 0) {
              price = prices[prices.length - 1]; // Usually the last price is the current price
              if (prices.length > 1) {
                originalPrice = prices[0]; // First price might be the original
              }
            }
            
            // Extract image
            let image = '';
            const img = container.querySelector('img');
            if (img) {
              image = img.src || img.dataset.src || img.dataset.lazySrc || '';
              // Convert relative URLs to absolute
              if (image && !image.startsWith('http')) {
                image = new URL(image, window.location.origin).toString();
              }
            }
            
            // Extract product code
            let code = '';
            const codeMatch = container.textContent?.match(/Product code:\s*([A-Z0-9-]+)/i);
            if (codeMatch) {
              code = codeMatch[1];
            }
            
            // Only add if we have at least a title
            if (title) {
              items.push({
                title,
                price,
                originalPrice: originalPrice !== price ? originalPrice : '',
                url: href,
                image,
                code
              });
            }
          });
        }
        
        // Strategy 2: If no product links found, look for product gallery items
        if (items.length === 0) {
          const gallery = document.querySelector('[class*="productGallery"]');
          if (gallery) {
            // Find all direct children that might be products
            const children = Array.from(gallery.children);
            console.log(`Found gallery with ${children.length} children`);
            
            children.forEach(child => {
              const link = child.querySelector('a');
              const img = child.querySelector('img');
              const text = child.textContent || '';
              
              // Extract product info from text
              const titleMatch = text.match(/([A-Z][^$]+?)(?:\$|Product code:)/);
              const priceMatch = text.match(/\$[\d,]+(?:\.\d{2})?/);
              const codeMatch = text.match(/Product code:\s*([A-Z0-9-]+)/i);
              
              if (titleMatch || priceMatch) {
                items.push({
                  title: titleMatch ? titleMatch[1].trim() : 'Product',
                  price: priceMatch ? priceMatch[0] : '',
                  url: link ? link.href : '',
                  image: img ? (img.src || img.dataset.src || '') : '',
                  code: codeMatch ? codeMatch[1] : ''
                });
              }
            });
          }
        }
        
        return items;
      });
      
      console.log(`Extracted ${products.length} products`);
      
      // Clean up and format the products
      const formattedProducts = products.map(p => {
        // Parse price to remove $ and convert to number
        const parsePrice = (priceStr: string) => {
          if (!priceStr) return null;
          const cleaned = priceStr.replace(/[^0-9.]/g, '');
          const num = parseFloat(cleaned);
          return isNaN(num) ? null : num;
        };
        
        return {
          title: p.title,
          price: parsePrice(p.price),
          originalPrice: parsePrice(p.originalPrice),
          url: p.url,
          image: p.image,
          modelNumber: p.code,
          inStock: true
        };
      }).filter(p => p.title && p.title.length > 0);
      
      await browser.close();
      
      return {
        success: true,
        products: formattedProducts,
        competitorName: 'Trade Tools',
        message: `Found ${formattedProducts.length} products from Trade Tools`
      };
      
    } catch (error: any) {
      console.error('Error scraping Trade Tools:', error);
      await browser.close();
      
      return {
        success: false,
        products: [],
        competitorName: 'Trade Tools',
        message: `Failed to scrape Trade Tools: ${error.message}`
      };
    }
  }
};