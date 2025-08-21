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
      
      // Create a simple Node.js script that uses chrome-launcher
      const extractorScript = `
        const { execSync } = require('child_process');
        
        try {
          // Run chromium and capture output after waiting for JS to load
          const result = execSync(\`chromium --headless --no-sandbox --disable-setuid-sandbox --disable-dev-shm-usage --disable-gpu --virtual-time-budget=5000 --run-all-compositor-stages-before-draw --dump-dom "${url}"\`, {
            encoding: 'utf8',
            timeout: 20000
          });
          
          console.log('DOM_OUTPUT_START');
          console.log(result);
          console.log('DOM_OUTPUT_END');
        } catch (error) {
          console.error('Error:', error.message);
        }
      `;
      
      // Write and execute the script
      const scriptPath = join(process.cwd(), 'temp-extractor.js');
      writeFileSync(scriptPath, extractorScript);
      
      const extractorProcess = spawn('node', [scriptPath], {
        stdio: ['ignore', 'pipe', 'pipe']
      });
      
      let output = '';
      let errorOutput = '';
      
      extractorProcess.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      extractorProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          extractorProcess.kill();
          reject(new Error('Browser scraping timeout'));
        }, 25000);
        
        extractorProcess.on('close', (code) => {
          clearTimeout(timeout);
          
          console.log('Browser automation output length:', output.length);
          console.log('Browser automation errors:', errorOutput);
          
          // Extract the DOM content between markers
          const domStartMatch = output.match(/DOM_OUTPUT_START\s*\n(.*)\nDOM_OUTPUT_END/s);
          const domContent = domStartMatch ? domStartMatch[1] : output;
          
          const products = [];
          
          // Look for various product patterns in the rendered DOM
          const patterns = [
            // Sydney Tools specific patterns
            /<div[^>]*class="[^"]*ant-card[^"]*ant-card-bordered[^"]*product-card[^"]*"[^>]*>.*?<\/div>\s*<\/div>\s*<\/div>/gs,
            // General product patterns
            /<div[^>]*class="[^"]*product[^"]*"[^>]*>.*?<\/div>/gs,
            /<article[^>]*class="[^"]*product[^"]*"[^>]*>.*?<\/article>/gs
          ];
          
          for (const pattern of patterns) {
            const matches = domContent.match(pattern) || [];
            console.log(`Found ${matches.length} matches with pattern`);
            
            matches.forEach((cardHtml, index) => {
              try {
                // Extract title from multiple possible sources
                const titleMatches = [
                  cardHtml.match(/title="([^"]+)"/),
                  cardHtml.match(/<h[1-6][^>]*>([^<]+)<\/h[1-6]>/),
                  cardHtml.match(/alt="([^"]+)"/),
                  cardHtml.match(/data-title="([^"]+)"/),
                  cardHtml.match(/>([^<]*(?:Charger|Battery|Jump Starter)[^<]*)</gi)
                ];
                
                const title = titleMatches.find(match => match)?.[1]?.trim().replace(/&amp;/g, '&');
                if (!title || title.length < 10) return;
                
                // Extract price with various patterns
                const priceMatches = [
                  cardHtml.match(/\$(\d+(?:,\d{3})*(?:\.\d{2})?)/),
                  cardHtml.match(/(\d+)\.(\d{2})/),
                  cardHtml.match(/price[^>]*>.*?\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/i)
                ];
                
                const priceMatch = priceMatches.find(match => match);
                const price = priceMatch ? parseFloat(priceMatch[1].replace(/,/g, '')) : 0;
                
                if (price === 0) return;
                
                // Extract image
                const imageMatch = cardHtml.match(/src="([^"]+\.(?:jpg|jpeg|png|webp|svg)[^"]*)"/i);
                const image = imageMatch ? imageMatch[1] : '';
                
                // Extract product URL
                const linkMatches = [
                  cardHtml.match(/href="(\/product\/[^"]+)"/),
                  cardHtml.match(/href="([^"]*product[^"]*)"/),
                  cardHtml.match(/data-url="([^"]+)"/)
                ];
                
                const linkMatch = linkMatches.find(match => match);
                const productUrl = linkMatch ? 
                  (linkMatch[1].startsWith('http') ? linkMatch[1] : `https://sydneytools.com.au${linkMatch[1]}`) : 
                  '';
                
                const brand = title.split(' ')[0];
                const cleanTitle = title.replace(/\s+/g, ' ').trim();
                
                products.push({
                  sku: `${brand.toUpperCase().replace(/[^A-Z0-9]/g, '')}-${String(products.length + 1).padStart(3, '0')}`,
                  title: cleanTitle,
                  price,
                  image: image.startsWith('http') ? image : (image ? `https://sydneytools.com.au${image}` : ''),
                  url: productUrl,
                  brand,
                  model: cleanTitle.replace(brand, '').trim(),
                  category: 'Car Battery Chargers'
                });
              } catch (e) {
                console.error('Error parsing product:', e);
              }
            });
            
            if (products.length > 0) break; // Stop if we found products with this pattern
          }
          
          console.log(`Successfully extracted ${products.length} authentic products from DOM`);
          
          resolve({
            products,
            totalPages: Math.ceil(products.length / 20),
            currentPage: 1,
            totalProducts: products.length,
            categoryName: 'CAR BATTERY CHARGERS'
          });
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