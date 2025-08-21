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
      
      browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu'
        ]
      });
      
      const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
      });
      
      const page = await context.newPage();
      
      console.log('Navigating to Sydney Tools page...');
      await page.goto(url, { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });
      
      console.log('Waiting for products to load...');
      
      // Wait for any content to load and then wait a bit more for JS to execute
      await page.waitForTimeout(5000);
      
      // Take a screenshot for debugging
      console.log('Page loaded, extracting product data...');
      
      // Extract products using page evaluation
      const extractionResult = await page.evaluate(() => {
        const extractedProducts = [];
        
        // Multiple selectors to try for Sydney Tools
        const productSelectors = [
          '.ant-card.ant-card-bordered.product-card',
          '.product-item',
          '[data-testid="product"]',
          '.product-card',
          '.product',
          '[class*="product"]',
          '[class*="card"]'
        ];
        
        let productElements = [];
        
        // Try each selector until we find products
        for (const selector of productSelectors) {
          productElements = Array.from(document.querySelectorAll(selector));
          console.log(`Selector "${selector}" found ${productElements.length} elements`);
          if (productElements.length > 0) {
            break;
          }
        }
        
        // If still no products, try a more aggressive approach
        if (productElements.length === 0) {
          console.log('No products found with standard selectors, trying content-based search...');
          
          // Look for any element containing pricing information
          const allElements = Array.from(document.querySelectorAll('*'));
          productElements = allElements.filter(el => {
            const text = el.textContent || '';
            const hasPrice = /\$\d+/.test(text);
            const hasProductKeywords = /charger|battery|jump|starter/i.test(text);
            const isReasonableSize = text.length > 10 && text.length < 1000;
            return hasPrice && hasProductKeywords && isReasonableSize;
          });
          
          console.log(`Content-based search found ${productElements.length} potential products`);
        }
        
        console.log(`Processing ${productElements.length} product elements...`);
        
        // Extract data from each product element
        productElements.forEach((element, index) => {
          try {
            const elementText = element.textContent || '';
            
            // Extract title - look for text that seems like a product name
            let title = '';
            
            // Try to find title in various ways
            const titleElement = element.querySelector('h1, h2, h3, h4, h5, h6, .title, [title], .ant-card-meta-title');
            if (titleElement) {
              title = titleElement.textContent?.trim() || titleElement.getAttribute('title') || '';
            }
            
            // If no title found, extract from text content
            if (!title) {
              const lines = elementText.split('\n').map(l => l.trim()).filter(l => l.length > 5);
              for (const line of lines) {
                if (/charger|battery|jump|starter|amp|volt/i.test(line) && line.length > 10 && line.length < 100) {
                  title = line;
                  break;
                }
              }
            }
            
            if (!title || title.length < 5) {
              console.log(`Skipping element ${index}: no valid title found`);
              return;
            }
            
            // Extract price
            const priceMatches = elementText.match(/\$(\d+(?:,\d{3})*(?:\.\d{2})?)/g);
            let price = 0;
            
            if (priceMatches && priceMatches.length > 0) {
              // Take the highest price found (likely the main product price)
              const prices = priceMatches.map(p => parseFloat(p.replace(/[$,]/g, '')));
              price = Math.max(...prices);
            }
            
            if (price === 0 || price < 10) {
              console.log(`Skipping element ${index}: no valid price found (${price})`);
              return;
            }
            
            // Extract image
            let image = '';
            const imgElement = element.querySelector('img');
            if (imgElement) {
              image = imgElement.src || imgElement.getAttribute('data-src') || '';
              if (image && !image.startsWith('http')) {
                image = `https://sydneytools.com.au${image}`;
              }
            }
            
            // Extract product URL
            let productUrl = '';
            const linkElement = element.querySelector('a') || element.closest('a');
            if (linkElement) {
              productUrl = linkElement.href || '';
              if (productUrl && !productUrl.startsWith('http')) {
                productUrl = `https://sydneytools.com.au${productUrl}`;
              }
            }
            
            // Generate brand and SKU
            const words = title.trim().split(' ');
            const brand = words[0] || 'BRAND';
            const sku = `${brand.toUpperCase().replace(/[^A-Z0-9]/g, '')}-${String(extractedProducts.length + 1).padStart(3, '0')}`;
            
            const product = {
              sku,
              title: title.trim(),
              price,
              image,
              url: productUrl,
              brand,
              model: title.replace(brand, '').trim(),
              category: 'Car Battery Chargers'
            };
            
            console.log(`Extracted product ${extractedProducts.length + 1}: ${title} - $${price}`);
            extractedProducts.push(product);
            
          } catch (error) {
            console.error(`Error processing product element ${index}:`, error);
          }
        });
        
        // Get page title/category
        let categoryName = 'PRODUCTS';
        const titleElement = document.querySelector('h1, .page-title, .category-title');
        if (titleElement) {
          categoryName = titleElement.textContent?.trim() || 'PRODUCTS';
        }
        
        return {
          products: extractedProducts,
          categoryName: categoryName.toUpperCase(),
          debug: {
            totalElements: productElements.length,
            pageTitle: document.title,
            url: window.location.href
          }
        };
      });
      
      console.log(`Playwright extracted ${extractionResult.products.length} products from Sydney Tools`);
      console.log('Debug info:', extractionResult.debug);
      
      return {
        products: extractionResult.products,
        totalPages: Math.ceil(extractionResult.products.length / 20),
        currentPage: 1,
        totalProducts: extractionResult.products.length,
        categoryName: extractionResult.categoryName
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