import { chromium } from 'playwright';

interface ScrapedProduct {
  sku: string;
  title: string;
  price: number;
  originalPrice?: number | null;
  isOnSale?: boolean;
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
      
      // Multiple attempts to load all products
      for (let attempt = 1; attempt <= 3; attempt++) {
        console.log(`Loading attempt ${attempt}: Scrolling and checking for more products...`);
        
        // Scroll down to trigger lazy loading
        await this.autoScroll(page);
        await page.waitForTimeout(2000);
        
        // Click any "Load More" or "Show More" buttons
        await this.clickLoadMoreIfPresent(page);
        await page.waitForTimeout(1000);
        
        // Check current product count
        const currentCount = await page.$$eval("a[href^='/product/']", anchors => anchors.length);
        console.log(`Attempt ${attempt}: Found ${currentCount} product links`);
        
        if (currentCount >= 50) break; // Stop if we have enough products
      }
      
      console.log('Page loaded, extracting product data...');
      

      
      // Extract products using improved approach
      await page.waitForSelector("a[href^='/product/'], img.img-fluid", { timeout: 30000 }).catch(() => {
        console.log('No product links found, will try alternative extraction');
      });

      // First, let's get all product containers instead of just anchors
      let products = await page.evaluate(() => {
        const items: any[] = [];
        const seen = new Set<string>();
        
        // Find all product links first
        const productLinks = Array.from(document.querySelectorAll("a[href^='/product/']")) as HTMLAnchorElement[];

        for (let i = 0; i < productLinks.length; i++) {
          const a = productLinks[i];
          try {
            const href = new URL(a.getAttribute('href')!, location.origin).toString();
            if (seen.has(href)) continue;

            // Get the product image - it's directly inside the anchor tag
            const imgElement = a.querySelector('img');
            let image = '';
            let debugInfo = '';
            
            if (imgElement) {
              image = imgElement.src || '';
              debugInfo = `Found img: ${imgElement.className}, src: ${image.substring(0, 50)}`;
            } else {
              debugInfo = 'No img found in anchor';
            }

            // Get title from the img title attribute or text content
            let title = '';
            if (imgElement && imgElement.title) {
              title = imgElement.title.trim();
            } else if (imgElement && imgElement.alt) {
              title = imgElement.alt.trim();
            } else {
              title = (a.textContent || '').trim();
            }
            
            if (!title) {
              console.log(`Skipping product ${i+1}: No title found, href: ${href.substring(0, 50)}`);
              continue;
            }

            // Look for sale and regular pricing information
            let price = null;
            let originalPrice = null;
            let isOnSale = false;
            
            // Start with immediate parent and work outward to find pricing container
            let searchContainer = a.parentElement;
            let level = 1;
            
            while (searchContainer && level <= 5) {
              const containerText = searchContainer.textContent || '';
              const containerHTML = searchContainer.innerHTML || '';
              
              // Check for Sydney Tools sale patterns
              const hasPriceDrop = containerText.includes('PRICE DROP') || 
                                  containerText.includes('% PRICE DROP');
              const normallyMatch = containerText.match(/Normally\s*\$?\s*(\d+(?:\.\d{1,2})?)/i);
              const wasMatch = containerText.match(/Was\s*\$?\s*(\d+(?:\.\d{1,2})?)/i);
              const rrpMatch = containerText.match(/RRP\s*\$?\s*(\d+(?:\.\d{1,2})?)/i);
              const percentMatch = containerText.match(/(\d+)%\s*(PRICE\s*DROP|off)/i);
              
              // If we have ANY sale indicator (Normally price or PRICE DROP)
              if (normallyMatch || wasMatch || rrpMatch || hasPriceDrop || percentMatch) {
                // Sydney Tools specific: "Normally $299.00" followed by green "$259.00"
                if (normallyMatch) {
                  const originalPriceValue = normallyMatch[1];
                  
                  // Extract all dollar amounts from the container
                  const allDollarAmounts = containerText.match(/\$(\d+(?:\.\d{2})?)/g) || [];
                  
                  // Find the sale price (different from original)
                  for (const amount of allDollarAmounts) {
                    const cleanAmount = amount.replace(/[^\d.]/g, '');
                    if (cleanAmount !== originalPriceValue && 
                        parseFloat(cleanAmount) < parseFloat(originalPriceValue) &&
                        parseFloat(cleanAmount) > 10) {
                      price = cleanAmount;
                      originalPrice = originalPriceValue;
                      isOnSale = true;
                      console.log(`✅ SALE FOUND: "${title.substring(0, 50)}" - now $${price} was $${originalPrice}`);
                      break;
                    }
                  }
                }
                
                // Fallback: If we have PRICE DROP but couldn't parse Normally price
                if (!isOnSale && hasPriceDrop) {
                  const priceMatches = containerText.match(/\$(\d+(?:\.\d{2})?)/g) || [];
                  if (priceMatches.length >= 2) {
                    const prices = priceMatches.map(p => parseFloat(p.replace(/[^\d.]/g, '')));
                    prices.sort((a, b) => a - b);
                    price = prices[0].toString();
                    originalPrice = prices[prices.length - 1].toString();
                    isOnSale = true;
                    console.log(`✅ SALE FOUND (PRICE DROP): "${title.substring(0, 50)}" - now $${price} was $${originalPrice}`);
                  }
                }
                
                if (isOnSale) break;
              }
              
              // Check for other sale patterns if Normally pattern didn't work
              if (!isOnSale) {
                const otherSalePatterns = [
                  /Was\s*\$\s?(\d+\.?\d*)/i,
                  /RRP\s*\$\s?(\d+\.?\d*)/i,
                  /Originally\s*\$\s?(\d+\.?\d*)/i
                ];
                
                for (const pattern of otherSalePatterns) {
                  const saleMatch = containerText.match(pattern);
                  if (saleMatch) {
                    originalPrice = saleMatch[1];
                    isOnSale = true;
                    
                    // Look for any price element
                    const priceEl = searchContainer.querySelector('.price');
                    if (priceEl) {
                      const priceText = priceEl.textContent || '';
                      const priceMatch = priceText.match(/(\d+\.?\d*)/);
                      if (priceMatch) {
                        price = priceMatch[1];
                        break;
                      }
                    }
                    break;
                  }
                }
              }
              
              // If no sale detected, look for regular price
              if (!price) {
                const priceEl = searchContainer.querySelector('.price');
                if (priceEl) {
                  const priceText = priceEl.textContent || '';
                  const priceMatch = priceText.match(/\$?\s?(\d+\.?\d*)/);
                  if (priceMatch) {
                    price = priceMatch[1];
                    break;
                  }
                }
              }
              
              // Enhanced fallback: any dollar amount in text
              if (!price) {
                // Look for any price patterns including commas
                const dollarMatches = containerText.match(/\$\s?[\d,]+\.?\d{0,2}/g);
                if (dollarMatches && dollarMatches.length > 0) {
                  const lastPrice = dollarMatches[dollarMatches.length - 1];
                  price = lastPrice.replace(/[^0-9.]/g, '');
                  break;
                }
                
                // Even broader fallback: look for numbers near dollar signs
                const broadMatches = containerText.match(/[\d,]+\.?\d{0,2}/g);
                if (broadMatches && broadMatches.length > 0) {
                  // Take the largest number as likely price
                  const numbers = broadMatches.map(m => parseFloat(m.replace(/,/g, '')));
                  const maxPrice = Math.max(...numbers);
                  if (maxPrice > 5 && maxPrice < 10000) { // Reasonable price range
                    price = maxPrice.toString();
                    break;
                  }
                }
              }
              
              searchContainer = searchContainer.parentElement;
              level++;
            }
            
            // Debug sale detection specifically
            if (i < 3 || isOnSale) {
              console.log(`Product ${i+1}: "${title.substring(0, 40)}"`);
              console.log(`  -> Price: $${price}, Original: $${originalPrice}, Sale: ${isOnSale}`);
              
              // Check for Normally text in surrounding elements
              let checkContainer = a.parentElement;
              let levelCount = 0;
              while (checkContainer && levelCount < 5) {
                const text = checkContainer.textContent || '';
                if (text.includes('Normally')) {
                  console.log(`  -> FOUND "Normally" text at level ${levelCount}: "${text.substring(0, 80)}"`);
                  
                  // Look for green elements
                  const greenElements = Array.from(checkContainer.querySelectorAll('[style*="green"], .price'));
                  console.log(`  -> Found ${greenElements.length} potential green price elements`);
                  break;
                }
                checkContainer = checkContainer.parentElement;
                levelCount++;
              }
            }

            if (!price) {
              console.log(`Skipping product ${i+1}: No price found for "${title.substring(0, 30)}"`);
              continue;
            }

            items.push({ 
              title, 
              price, 
              originalPrice,
              isOnSale,
              url: href, 
              image: image || '' 
            });
            seen.add(href);
          } catch (e) {
            // Continue with next item
          }
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
        const priceNum = p.price ? parseFloat(p.price.toString().replace(/[^0-9.]/g, '')) : 0;
        const originalPriceNum = p.originalPrice ? parseFloat(p.originalPrice.toString().replace(/[^0-9.]/g, '')) : null;
        const brand = p.title.split(' ')[0] || 'BRAND';
        
        return {
          sku: `${brand.toUpperCase().replace(/[^A-Z0-9]/g, '')}-${String(index + 1).padStart(3, '0')}`,
          title: p.title,
          price: priceNum,
          originalPrice: originalPriceNum,
          isOnSale: p.isOnSale || false,
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
      throw new Error(`Playwright scraping failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
}

export const playwrightScraper = new PlaywrightScraper();