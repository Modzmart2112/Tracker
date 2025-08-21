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
              
              // Debug sale detection for first few items
              if (i < 3) {
                const hasNormallyText = containerText.includes('Normally');
                const hasPriceDropText = containerText.includes('PRICE DROP');
                if (hasNormallyText || hasPriceDropText) {
                  console.log(`  Product ${i+1} at level ${level}: Found sale indicators`);
                }
              }
              
              // Check for Sydney Tools sale patterns - be very aggressive
              const hasPriceDrop = containerText.includes('PRICE DROP') || 
                                  containerText.includes('% PRICE DROP') ||
                                  containerText.includes('% OFF');
              const normallyMatch = containerText.match(/Normally\s*\$?\s*(\d+(?:\.\d{1,2})?)/i);
              const wasMatch = containerText.match(/Was\s*\$?\s*(\d+(?:\.\d{1,2})?)/i);
              const rrpMatch = containerText.match(/RRP\s*\$?\s*(\d+(?:\.\d{1,2})?)/i);
              const percentMatch = containerText.match(/(\d+)%\s*(PRICE\s*DROP|OFF|off)/i);
              
              // If we have ANY sale indicator (Normally price or PRICE DROP)
              if (normallyMatch || wasMatch || rrpMatch || hasPriceDrop || percentMatch) {
                // Sydney Tools specific: "Normally $299.00" followed by sale price
                if (normallyMatch) {
                  const originalPriceValue = normallyMatch[1];
                  
                  // Extract all numeric values that could be prices
                  const allPrices = containerText.match(/\$?\d+\.?\d*/g) || [];
                  const numericPrices = allPrices
                    .map(p => p.replace(/[^\d.]/g, ''))
                    .filter(p => {
                      const num = parseFloat(p);
                      return num >= 10 && num <= 10000 && p !== originalPriceValue;
                    });
                  
                  // Find a price lower than the original
                  for (const priceCandidate of numericPrices) {
                    const candidateNum = parseFloat(priceCandidate);
                    const originalNum = parseFloat(originalPriceValue);
                    
                    if (candidateNum < originalNum && candidateNum > originalNum * 0.5) {
                      price = priceCandidate.includes('.') ? priceCandidate : priceCandidate + '.00';
                      originalPrice = originalPriceValue.includes('.') ? originalPriceValue : originalPriceValue + '.00';
                      isOnSale = true;
                      console.log(`✅ SALE ${i+1}: "${title.substring(0, 45)}" - $${price} (was $${originalPrice})`);
                      break;
                    }
                  }
                }
                
                // Alternative patterns
                if (!isOnSale && (wasMatch || rrpMatch)) {
                  const origPrice = wasMatch?.[1] || rrpMatch?.[1];
                  const allPrices = containerText.match(/\$?\d+\.?\d*/g) || [];
                  const numericPrices = allPrices
                    .map(p => p.replace(/[^\d.]/g, ''))
                    .filter(p => {
                      const num = parseFloat(p);
                      return num >= 10 && num < parseFloat(origPrice);
                    });
                  
                  if (numericPrices.length > 0) {
                    price = numericPrices[0].includes('.') ? numericPrices[0] : numericPrices[0] + '.00';
                    originalPrice = origPrice.includes('.') ? origPrice : origPrice + '.00';
                    isOnSale = true;
                    console.log(`✅ SALE ${i+1} (alt): "${title.substring(0, 45)}" - $${price} (was $${originalPrice})`);
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

  async scrapeToolkitDepot(url: string): Promise<any> {
    try {
      const execPath = await this.getChromiumPath();
      const browser = await chromium.launch({
        headless: true,
        executablePath: execPath,
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
      
      console.log('Navigating to Toolkit Depot page...');
      await page.goto(url, { 
        waitUntil: 'domcontentloaded',
        timeout: 60000 
      });
      
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
      
      // Scroll to load more products
      await this.autoScroll(page);
      await page.waitForTimeout(2000);
      
      console.log('Extracting TKD products with sale prices...');
      
      // First, let's see what the page contains
      const pageInfo = await page.evaluate(() => {
        const info: any = {};
        
        // Check for different selector patterns
        const selectors = [
          '.card',
          '.productGrid-item',
          '.product-item',
          'article.card',
          '[class*="product"]',
          '[class*="Product"]',
          '[data-test-info-type="productCard"]',
          '.listItem',
          'li[class*="product"]',
          'div[class*="card"]'
        ];
        
        for (const selector of selectors) {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            info[selector] = elements.length;
          }
        }
        
        // Also check for links
        const productLinks = document.querySelectorAll('a[href*="/products/"]');
        info['product_links'] = productLinks.length;
        
        // Check for any h4/h3 titles
        info['h4_titles'] = document.querySelectorAll('h4').length;
        info['h3_titles'] = document.querySelectorAll('h3').length;
        
        return info;
      });
      
      console.log('Page structure analysis:', pageInfo);
      
      // Extract products using TKD-specific selectors
      const products = await page.evaluate(() => {
        const items: any[] = [];
        const seen = new Set<string>();
        
        // Debug: Log all h4 elements to see what's on the page
        const h4Elements = document.querySelectorAll('h4');
        console.log(`Found ${h4Elements.length} h4 elements`);
        h4Elements.forEach((h4, i) => {
          console.log(`H4 ${i}: ${h4.textContent?.substring(0, 50)}`);
        });
        
        // Debug: Find any elements with dollar signs
        const priceElements = Array.from(document.querySelectorAll('*')).filter(el => 
          el.textContent && el.textContent.includes('$') && !el.textContent.includes('$0')
        );
        console.log(`Found ${priceElements.length} elements with prices`);
        
        // Try multiple approaches to find products
        // Approach 1: Find by any product-looking links (TKD doesn't use /products/)
        const productLinks = Array.from(document.querySelectorAll(
          'h4 a, .card-title a, a[href*="-"], .card a[href]'
        ));
        console.log(`Found ${productLinks.length} potential product links`);
        
        if (productLinks.length > 0) {
          for (const link of productLinks) {
            const href = (link as HTMLAnchorElement).href;
            // Skip navigation links, already seen, or same page links
            if (!href || seen.has(href) || href === window.location.href || href.includes('#')) continue;
            seen.add(href);
            
            // Find the containing card/item
            let container = link.parentElement;
            let depth = 0;
            while (container && depth < 5) {
              // Check if this looks like a product container
              const hasPrice = container.textContent?.includes('$');
              const hasTitle = container.querySelector('h4, h3, .card-title');
              
              if (hasPrice && hasTitle) {
                const title = hasTitle.textContent?.trim() || '';
                
                // Extract price
                const priceText = container.textContent || '';
                const priceMatch = priceText.match(/\$\s*(\d+(?:\.\d{2})?)/);
                const price = priceMatch ? priceMatch[1] : null;
                
                // Get image
                const imgEl = container.querySelector('img');
                const image = imgEl?.src || '';
                
                if (title && price) {
                  items.push({
                    title,
                    price,
                    originalPrice: null,
                    isOnSale: false,
                    url: href,
                    image
                  });
                  console.log(`Added product: ${title.substring(0, 40)}`);
                  break;
                }
              }
              
              container = container.parentElement;
              depth++;
            }
          }
        }
        
        // Approach 2: Fallback to card-based search
        if (items.length === 0) {
          const productCards = Array.from(document.querySelectorAll(
            '.card, .productGrid-item, .product-item, article.card, [class*="product-card"]'
          ));
          
          console.log(`Fallback: Found ${productCards.length} potential product cards on TKD`);
          
          for (const card of productCards) {
          try {
            // Find the product link - broader search for TKD
            const linkEl = card.querySelector('h4 a, .card-title a, a.card-figure__link, a[href]');
            if (!linkEl) continue;
            
            const href = (linkEl as HTMLAnchorElement).href;
            if (!href || seen.has(href)) continue;
            seen.add(href);
            
            // Get product title - broader search
            const titleEl = card.querySelector('h4.card-title, .card-title, [data-test-info-type="productTitle"], h4, h3, .product-name');
            const title = titleEl?.textContent?.trim() || '';
            
            if (!title) continue;
            
            // Get image
            const imgEl = card.querySelector('img');
            const image = imgEl?.src || '';
            
            // Extract prices - TKD specific structure
            let price = null;
            let originalPrice = null;
            let isOnSale = false;
            
            // Look for sale pricing structure with "Was:" and "Now:"
            const priceContainer = card.querySelector('.card-price, [data-test-info-type="price"]');
            if (priceContainer) {
              const containerText = priceContainer.textContent || '';
              
              // Check for Was/Now pattern (from user's HTML)
              const wasMatch = containerText.match(/Was:\s*\$?\s*(\d+(?:\.\d{2})?)/i);
              const nowMatch = containerText.match(/Now:\s*\$?\s*(\d+(?:\.\d{2})?)/i);
              
              if (wasMatch && nowMatch) {
                originalPrice = wasMatch[1];
                price = nowMatch[1];
                isOnSale = true;
                console.log(`✅ TKD SALE: "${title.substring(0, 40)}" - $${price} (was $${originalPrice})`);
              } else {
                // Look for price--non-sale and price--withTax classes
                const nonSalePriceEl = priceContainer.querySelector('.price--non-sale span');
                const salePriceEl = priceContainer.querySelector('.price--withTax span');
                
                if (nonSalePriceEl && salePriceEl) {
                  const nonSaleText = nonSalePriceEl.textContent || '';
                  const saleText = salePriceEl.textContent || '';
                  
                  const nonSaleMatch = nonSaleText.match(/(\d+(?:\.\d{2})?)/);
                  const saleMatch = saleText.match(/(\d+(?:\.\d{2})?)/);
                  
                  if (nonSaleMatch && saleMatch) {
                    originalPrice = nonSaleMatch[1];
                    price = saleMatch[1];
                    isOnSale = true;
                    console.log(`✅ TKD SALE (class): "${title.substring(0, 40)}" - $${price} (was $${originalPrice})`);
                  }
                }
              }
            }
            
            // If still no price, try regular price extraction
            if (!price) {
              const priceEl = card.querySelector('.price, .price-section');
              if (priceEl) {
                const priceText = priceEl.textContent || '';
                const priceMatch = priceText.match(/\$?\s*(\d+(?:\.\d{2})?)/);
                if (priceMatch) {
                  price = priceMatch[1];
                }
              }
            }
            
            // Last resort: any dollar amount in the card
            if (!price) {
              const cardText = card.textContent || '';
              const dollarMatch = cardText.match(/\$\s*(\d+(?:\.\d{2})?)/);
              if (dollarMatch) {
                price = dollarMatch[1];
              }
            }
            
            if (price) {
              items.push({
                title,
                price: parseFloat(price),
                originalPrice: originalPrice ? parseFloat(originalPrice) : null,
                isOnSale,
                url: href,
                image,
                brand: title.split(' ')[0],
                model: '',
                category: 'Tools'
              });
            }
          } catch (err) {
            console.error('Error extracting TKD product:', err);
          }
        }
        }
        
        return items;
      });
      
      await browser.close();
      
      console.log(`Extracted ${products.length} products from Toolkit Depot`);
      
      return {
        products: products,
        totalPages: 1,
        currentPage: 1,
        totalProducts: products.length,
        categoryName: 'TOOLS',
        competitorName: 'Toolkitdepot',
        sourceUrl: url,
        extractedAt: new Date().toISOString()
      };
      
    } catch (error: any) {
      console.error('TKD scraping error:', error);
      throw error;
    }
  }
}

export const playwrightScraper = new PlaywrightScraper();