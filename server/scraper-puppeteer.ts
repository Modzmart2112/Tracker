import { spawn } from 'child_process';
import { writeFileSync, readFileSync, unlinkSync } from 'fs';
import { join } from 'path';

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

export class SimpleBrowserScraper {
  
  async scrapeSydneyToolsWithChromium(url: string): Promise<{
    products: ScrapedProduct[];
    totalPages: number;
    currentPage: number;
    totalProducts: number;
    categoryName: string;
  }> {
    const tempScriptPath = join(process.cwd(), 'temp-scraper.js');
    
    // Create a simple JavaScript file that will run in the browser
    const browserScript = `
      // Wait for page to load completely
      setTimeout(() => {
        const products = [];
        
        // Try different selectors for Sydney Tools products
        const productCards = document.querySelectorAll([
          '.ant-card.ant-card-bordered.product-card',
          '.product-item',
          '[data-testid="product"]',
          '.product-card',
          '.product'
        ].join(', '));
        
        console.log('Found product cards:', productCards.length);
        
        productCards.forEach((card, index) => {
          try {
            // Extract title
            const titleElement = card.querySelector([
              '.ant-card-meta-title',
              '.product-title', 
              'h3', 'h4', 'h2',
              '[data-testid="product-title"]',
              '.title'
            ].join(', '));
            
            const title = titleElement?.textContent?.trim();
            if (!title) return;
            
            // Extract price
            const priceElement = card.querySelector([
              '.price',
              '.ant-typography-title',
              '[class*="price"]',
              '.cost',
              '.amount'
            ].join(', '));
            
            let price = 0;
            if (priceElement) {
              const priceText = priceElement.textContent?.replace(/[^0-9.]/g, '');
              price = parseFloat(priceText || '0');
            }
            
            // Extract image
            const imgElement = card.querySelector('img');
            const image = imgElement?.src || imgElement?.getAttribute('data-src') || '';
            
            // Extract URL
            const linkElement = card.querySelector('a') || card.closest('a');
            let productUrl = linkElement?.href || '';
            if (productUrl && !productUrl.startsWith('http')) {
              productUrl = window.location.origin + productUrl;
            }
            
            // Generate SKU and brand
            const brand = title.split(' ')[0];
            const sku = title.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-').substring(0, 20).toUpperCase() + '-' + index;
            
            products.push({
              sku,
              title,
              price,
              image,
              url: productUrl,
              brand,
              category: 'Products'
            });
          } catch (error) {
            console.error('Error extracting product:', error);
          }
        });
        
        // Get category name
        const categoryElement = document.querySelector([
          'h1',
          '.page-title',
          '.category-title',
          '.ant-breadcrumb-link:last-child'
        ].join(', '));
        
        const categoryName = categoryElement?.textContent?.trim() || 'PRODUCTS';
        
        // Output results as JSON
        console.log('SCRAPER_RESULTS:', JSON.stringify({
          products,
          totalProducts: products.length,
          categoryName: categoryName.toUpperCase()
        }));
        
      }, 3000); // Wait 3 seconds for content to load
    `;
    
    // Write the script to a temporary file
    writeFileSync(tempScriptPath, browserScript);
    
    try {
      console.log('Starting Chromium browser scraping for:', url);
      
      // Run Chromium with the script
      const chromiumProcess = spawn('chromium', [
        '--headless',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--remote-debugging-port=9222',
        '--disable-features=VizDisplayCompositor',
        '--run-all-compositor-stages-before-draw',
        '--disable-background-timer-throttling',
        '--disable-renderer-backgrounding',
        '--disable-backgrounding-occluded-windows',
        '--disable-ipc-flooding-protection',
        '--timeout=10000',
        '--virtual-time-budget=5000',
        '--enable-automation',
        `--evaluate-script='${browserScript}'`,
        url
      ], {
        stdio: ['ignore', 'pipe', 'pipe']
      });
      
      let output = '';
      let errorOutput = '';
      
      chromiumProcess.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      chromiumProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          chromiumProcess.kill();
          reject(new Error('Browser scraping timeout'));
        }, 15000);
        
        chromiumProcess.on('close', (code) => {
          clearTimeout(timeout);
          
          console.log('Chromium output:', output);
          console.log('Chromium errors:', errorOutput);
          
          // Look for our results in the output
          const resultsMatch = output.match(/SCRAPER_RESULTS: ({.*})/);
          if (resultsMatch) {
            try {
              const results = JSON.parse(resultsMatch[1]);
              resolve({
                products: results.products || [],
                totalPages: Math.ceil((results.totalProducts || 0) / 20),
                currentPage: 1,
                totalProducts: results.totalProducts || 0,
                categoryName: results.categoryName || 'PRODUCTS'
              });
            } catch (e) {
              reject(new Error('Failed to parse scraper results'));
            }
          } else {
            // No products found
            resolve({
              products: [],
              totalPages: 0,
              currentPage: 1,
              totalProducts: 0,
              categoryName: 'PRODUCTS'
            });
          }
        });
        
        chromiumProcess.on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });
      
    } catch (error) {
      throw new Error(`Browser scraping failed: ${error.message}`);
    } finally {
      // Clean up temp file
      try {
        unlinkSync(tempScriptPath);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }
}

export const browserScraper = new SimpleBrowserScraper();