import puppeteer from 'puppeteer';

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

export class PuppeteerScraper {
  
  async scrapeSydneyTools(url: string): Promise<{
    products: ScrapedProduct[];
    totalPages: number;
    currentPage: number;
    totalProducts: number;
    categoryName: string;
  }> {
    let browser;
    
    try {
      console.log('Launching Puppeteer browser for:', url);
      
      browser = await puppeteer.launch({
        headless: true,
        executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu',
          '--disable-features=VizDisplayCompositor'
        ]
      });
      
      const page = await browser.newPage();
      
      // Set viewport and user agent
      await page.setViewport({ width: 1920, height: 1080 });
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36');
      
      console.log('Navigating to page...');
      await page.goto(url, { 
        waitUntil: 'networkidle2', 
        timeout: 30000 
      });
      
      console.log('Waiting for product cards to load...');
      
      // Wait for products to appear - try multiple selectors
      try {
        await page.waitForSelector('.ant-card.ant-card-bordered.product-card, .product-item, [data-testid="product"]', { 
          timeout: 10000 
        });
      } catch (e) {
        console.log('Product cards not found with primary selectors, trying alternative approach...');
        await page.waitForTimeout(5000); // Wait 5 seconds for JS to fully load
      }
      
      console.log('Extracting product data...');
      
      // Extract products using JavaScript execution in the browser
      const products = await page.evaluate(() => {
        const extractedProducts = [];
        
        // Multiple selectors to try
        const selectors = [
          '.ant-card.ant-card-bordered.product-card',
          '.product-item',
          '[data-testid="product"]',
          '.product-card',
          '.product',
          '[class*="product"]'
        ];
        
        let productElements = [];
        for (const selector of selectors) {
          productElements = Array.from(document.querySelectorAll(selector));
          if (productElements.length > 0) {
            console.log(`Found ${productElements.length} products with selector: ${selector}`);
            break;
          }
        }
        
        if (productElements.length === 0) {
          // Try to find any elements that might contain product info
          const allDivs = Array.from(document.querySelectorAll('div'));
          productElements = allDivs.filter(div => {
            const text = div.textContent || '';
            return text.includes('$') && (
              text.toLowerCase().includes('charger') ||
              text.toLowerCase().includes('battery') ||
              text.toLowerCase().includes('jump') ||
              text.toLowerCase().includes('starter')
            );
          });
          console.log(`Found ${productElements.length} potential product elements by content`);
        }
        
        productElements.forEach((element, index) => {
          try {
            // Extract title from various possible locations
            let title = '';
            
            const titleSelectors = [
              '.ant-card-meta-title',
              '.product-title',
              'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
              '[title]',
              '[data-testid="product-title"]'
            ];
            
            for (const selector of titleSelectors) {
              const titleEl = element.querySelector(selector);
              if (titleEl) {
                title = titleEl.textContent?.trim() || titleEl.getAttribute('title') || '';
                if (title) break;
              }
            }
            
            // If no title found with selectors, try to extract from text content
            if (!title) {
              const text = element.textContent || '';
              const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 10);
              // Look for a line that seems like a product title
              for (const line of lines) {
                if (line.toLowerCase().includes('charger') || 
                    line.toLowerCase().includes('battery') ||
                    line.toLowerCase().includes('jump') ||
                    line.toLowerCase().includes('starter')) {
                  title = line;
                  break;
                }
              }
            }
            
            if (!title || title.length < 5) return;
            
            // Extract price
            let price = 0;
            const priceSelectors = [
              '.price',
              '.ant-typography-title',
              '[class*="price"]',
              '.cost',
              '.amount'
            ];
            
            for (const selector of priceSelectors) {
              const priceEl = element.querySelector(selector);
              if (priceEl) {
                const priceText = priceEl.textContent?.replace(/[^0-9.]/g, '');
                price = parseFloat(priceText || '0');
                if (price > 0) break;
              }
            }
            
            // If no price found with selectors, extract from text
            if (price === 0) {
              const text = element.textContent || '';
              const priceMatch = text.match(/\$(\d+(?:,\d{3})*(?:\.\d{2})?)/);
              if (priceMatch) {
                price = parseFloat(priceMatch[1].replace(/,/g, ''));
              }
            }
            
            if (price === 0) return;
            
            // Extract image
            let image = '';
            const imgEl = element.querySelector('img');
            if (imgEl) {
              image = imgEl.src || imgEl.getAttribute('data-src') || '';
            }
            
            // Extract product URL
            let productUrl = '';
            const linkEl = element.querySelector('a') || element.closest('a');
            if (linkEl) {
              productUrl = linkEl.href || '';
            }
            
            // Generate SKU and extract brand
            const brand = title.split(' ')[0];
            const sku = `${brand.toUpperCase().replace(/[^A-Z0-9]/g, '')}-${String(index + 1).padStart(3, '0')}`;
            
            extractedProducts.push({
              sku,
              title: title.trim(),
              price,
              image: image.startsWith('http') ? image : (image ? `https://sydneytools.com.au${image}` : ''),
              url: productUrl.startsWith('http') ? productUrl : (productUrl ? `https://sydneytools.com.au${productUrl}` : ''),
              brand,
              model: title.replace(brand, '').trim(),
              category: 'Car Battery Chargers'
            });
          } catch (error) {
            console.error('Error extracting product:', error);
          }
        });
        
        return extractedProducts;
      });
      
      console.log(`Puppeteer extracted ${products.length} products`);
      
      // Get category name
      const categoryName = await page.evaluate(() => {
        const selectors = [
          'h1',
          '.page-title',
          '.category-title',
          '.ant-breadcrumb-link:last-child'
        ];
        
        for (const selector of selectors) {
          const el = document.querySelector(selector);
          if (el && el.textContent) {
            return el.textContent.trim();
          }
        }
        
        return 'PRODUCTS';
      });
      
      return {
        products,
        totalPages: Math.ceil(products.length / 20),
        currentPage: 1,
        totalProducts: products.length,
        categoryName: categoryName.toUpperCase()
      };
      
    } catch (error) {
      console.error('Puppeteer scraping error:', error);
      throw new Error(`Puppeteer scraping failed: ${error.message}`);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
}

export const puppeteerScraper = new PuppeteerScraper();