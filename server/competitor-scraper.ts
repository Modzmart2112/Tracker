import axios from 'axios';
import * as cheerio from 'cheerio';
import { extractModelNumberWithAI } from './ai-model-extractor';

export interface CompetitorProduct {
  title: string;
  price: number;
  regularPrice?: number;
  salePrice?: number;
  image?: string;
  url: string;
  brand?: string;
  model?: string;
  category?: string;
  sku?: string;
  competitorName: string;
}

export interface ScrapingResult {
  products: CompetitorProduct[];
  totalProducts: number;
  categoryName: string;
  competitorName: string;
  sourceUrl: string;
  extractedAt: string;
}

export class CompetitorScraper {
  private userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36';

  private extractCompetitorName(url: string): string {
    try {
      const hostname = new URL(url).hostname.replace('www.', '');
      const parts = hostname.split('.');
      return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    } catch {
      return 'Unknown Competitor';
    }
  }

  private extractCategoryFromUrl(url: string): string {
    const patterns = [
      /\/([^\/]+)\/battery-chargers/i,
      /\/category\/([^\/]+)/i,
      /\/([^\/]+)\/[^\/]*$/i
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1].replace(/-/g, ' ').replace(/_/g, ' ')
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
      }
    }
    return 'Products';
  }

  private extractBrand(title: string): string {
    const brandPatterns = [
      /^(SP Tools|Schumacher|Matson|NOCO|DeWalt|Makita|Milwaukee|Bosch|Ryobi|Ozito|SCA|Century|Arlec)/i,
      /^([A-Z][A-Z0-9]+(?:\s+[A-Z][a-z]+)?)/,
      /^([A-Z][a-z]+)/
    ];

    for (const pattern of brandPatterns) {
      const match = title.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }
    return 'Unknown';
  }

  private extractModel(title: string, brand: string): string {
    // Extract model number patterns like SP61084, SP61093, etc.
    const modelPatterns = [
      /([A-Z]{2}\d{5})/i,  // SP61084 format
      /([A-Z]+\d{3,})/i,   // General alphanumeric model
      /(\b\d{5,}\b)/,      // 5+ digit numbers
      /(Model\s+[A-Z0-9-]+)/i,
      /([A-Z0-9-]{6,})/    // General model pattern
    ];

    for (const pattern of modelPatterns) {
      const match = title.match(pattern);
      if (match) {
        return match[1].toUpperCase();
      }
    }

    // Fallback: clean up title
    return title.replace(brand, '').trim().replace(/^[-\s]+/, '').split(' ')[0] || 'Unknown';
  }

  private parsePrice(priceText: string): number {
    // Remove currency symbols and extra text, keep only numbers, dots, and commas
    const cleanPrice = priceText.replace(/[^\d.,]/g, '');
    const numberPrice = parseFloat(cleanPrice.replace(/,/g, ''));
    return isNaN(numberPrice) ? 0 : numberPrice;
  }

  private extractSalePrice($product: any): { regularPrice: number; salePrice: number } {
    // Look for sale price patterns
    const salePriceSelectors = [
      '.price-was, .was-price, .old-price, .original-price',
      '.price-now, .sale-price, .current-price, .special-price',
      '.price-item--sale, .price--sale, .sale',
      '.price .price-reduced, .reduced-price'
    ];
    
    let regularPrice = 0;
    let salePrice = 0;
    
    // Try to find both regular and sale prices
    const wasPrice = $product.find('.price-was, .was-price, .old-price, .original-price').first();
    const nowPrice = $product.find('.price-now, .sale-price, .current-price, .special-price, .price').first();
    
    if (wasPrice.length && nowPrice.length) {
      // Both prices found - product is on sale
      regularPrice = this.parsePrice(wasPrice.text().trim());
      salePrice = this.parsePrice(nowPrice.text().trim());
    } else {
      // Try general price extraction
      const priceElement = $product.find('.price').first();
      if (priceElement.length) {
        const priceText = priceElement.text().trim();
        const price = this.parsePrice(priceText);
        
        // Check if this looks like a sale (contains "was" or crossed out text)
        if (priceText.toLowerCase().includes('was') || $product.find('.price del, .price strike, .price .strike').length > 0) {
          // Extract both prices from text
          const priceMatches = priceText.match(/\$[\d,]+\.?\d*/g);
          if (priceMatches && priceMatches.length >= 2) {
            regularPrice = this.parsePrice(priceMatches[1]);
            salePrice = this.parsePrice(priceMatches[0]);
          } else {
            salePrice = price;
          }
        } else {
          // Regular price only
          regularPrice = price;
          salePrice = price;
        }
      }
    }
    
    // Validate prices
    if (salePrice <= 0) salePrice = regularPrice;
    if (regularPrice <= 0) regularPrice = salePrice;
    
    return { regularPrice, salePrice };
  }

  private normalizeImageUrl(imageUrl: string, baseUrl: string): string {
    if (!imageUrl) return '';
    
    if (imageUrl.startsWith('//')) {
      return 'https:' + imageUrl;
    }
    
    if (imageUrl.startsWith('/')) {
      const base = new URL(baseUrl);
      return `${base.protocol}//${base.hostname}${imageUrl}`;
    }
    
    return imageUrl;
  }

  async scrapeToolkitDepot(url: string): Promise<ScrapingResult> {
    try {
      console.log(`Using Playwright scraper for Toolkit Depot: ${url}`);
      
      // Use the dedicated Playwright scraper for TKD to handle sale prices
      const { playwrightScraper } = await import('./playwright-scraper');
      const result = await playwrightScraper.scrapeToolkitDepot(url);
      
      // Transform the result to match CompetitorProduct format
      const transformedProducts: CompetitorProduct[] = result.products.map(p => ({
        title: p.title,
        price: p.price,
        regularPrice: p.originalPrice || p.price,
        salePrice: p.isOnSale ? p.price : undefined,
        image: p.image,
        url: p.url,
        brand: p.brand,
        model: p.model,
        category: p.category,
        sku: p.sku,
        competitorName: result.competitorName
      }));
      
      console.log(`Extracted ${transformedProducts.length} products from Toolkit Depot with sale prices`);
      
      return {
        products: transformedProducts,
        totalProducts: transformedProducts.length,
        categoryName: result.categoryName,
        competitorName: result.competitorName,
        sourceUrl: result.sourceUrl,
        extractedAt: result.extractedAt
      };

    } catch (error) {
      console.error(`Error scraping ${url}:`, error);
      return {
        products: [],
        totalProducts: 0,
        categoryName: this.extractCategoryFromUrl(url),
        competitorName: this.extractCompetitorName(url),
        sourceUrl: url,
        extractedAt: new Date().toISOString()
      };
    }
  }

  private async extractProductsFromPage($: any, baseUrl: string, competitorName: string, categoryName: string, startIndex: number): Promise<CompetitorProduct[]> {
    const products: CompetitorProduct[] = [];

    // Toolkit Depot specific selectors
    const productSelectors = [
      '.product-item',
      '.product-card', 
      '.woocommerce-loop-product',
      '.product',
      '.product-wrapper',
      '[class*="product"]'
    ];

    let foundProducts = false;

    for (const selector of productSelectors) {
      const productElements = $(selector);
      
      if (productElements.length > 0) {
        console.log(`Found ${productElements.length} products with selector: ${selector}`);
        
        // Collect raw product data first
        const rawProducts: any[] = [];
        productElements.each((index: number, element: any) => {
          const $product = $(element);
          
          // Extract title
          const titleSelectors = ['h2 a', 'h3 a', '.product-title a', '.woocommerce-loop-product__title', 'a[title]', '.product-name a'];
          let title = '';
          
          for (const titleSel of titleSelectors) {
            const titleEl = $product.find(titleSel).first();
            if (titleEl.length) {
              title = titleEl.attr('title') || titleEl.text().trim();
              if (title) break;
            }
          }

          // Extract price using enhanced method
          const priceData = this.extractSalePrice($product);
          const price = priceData.salePrice;

          // Extract image
          const imgSelectors = ['img', '.product-image img', '.wp-post-image'];
          let image = '';
          
          for (const imgSel of imgSelectors) {
            const imgEl = $product.find(imgSel).first();
            if (imgEl.length) {
              const src = imgEl.attr('src') || imgEl.attr('data-src') || imgEl.attr('data-lazy');
              if (src) {
                image = this.normalizeImageUrl(src, baseUrl);
                break;
              }
            }
          }

          // Extract product URL
          const linkSelectors = ['a', '.product-title a', 'h2 a', 'h3 a'];
          let productUrl = baseUrl;
          
          for (const linkSel of linkSelectors) {
            const linkEl = $product.find(linkSel).first();
            if (linkEl.length) {
              const href = linkEl.attr('href');
              if (href) {
                productUrl = href.startsWith('/') ? 
                  new URL(href, baseUrl).toString() : href;
                break;
              }
            }
          }

          // Filter for battery chargers and relevant products - made more inclusive
          if (title && (
            title.toLowerCase().includes('charger') ||
            title.toLowerCase().includes('battery') ||
            baseUrl.toLowerCase().includes('charger') ||
            title.toLowerCase().includes('jump starter') ||
            title.toLowerCase().includes('jump-starter') ||
            title.toLowerCase().includes('booster') ||
            title.toLowerCase().includes('power') ||
            // Include Kincrome and other battery-related brands
            (title.toLowerCase().includes('kincrome') && title.toLowerCase().includes('starter'))
          )) {
            const brand = this.extractBrand(title);
            const basicModel = this.extractModel(title, brand);
            
            rawProducts.push({
              title,
              price,
              priceData,
              image,
              url: productUrl,
              brand,
              basicModel,
              categoryName,
              competitorName
            });
            foundProducts = true;
          }
        });
        
        // Now process raw products asynchronously with AI model extraction
        for (const rawProduct of rawProducts) {
          let enhancedModel = rawProduct.basicModel;
          
          // Use OpenAI for better model extraction if available
          try {
            if (process.env.OPENAI_API_KEY) {
              enhancedModel = await extractModelNumberWithAI(rawProduct.title);
              if (enhancedModel === 'N/A' || !enhancedModel) {
                enhancedModel = rawProduct.basicModel; // Fallback to basic extraction
              }
            }
          } catch (error) {
            console.warn('AI model extraction failed, using basic extraction:', error);
            enhancedModel = rawProduct.basicModel;
          }

          const finalPrice = rawProduct.priceData.salePrice || rawProduct.price || 0;

          products.push({
            title: rawProduct.title,
            price: finalPrice,
            regularPrice: rawProduct.priceData.regularPrice,
            salePrice: rawProduct.priceData.salePrice,
            image: rawProduct.image,
            url: rawProduct.url,
            brand: rawProduct.brand,
            model: enhancedModel,
            category: rawProduct.categoryName,
            sku: `${rawProduct.competitorName.toUpperCase()}-${String(startIndex + products.length + 1).padStart(3, '0')}`,
            competitorName: rawProduct.competitorName
          });
        }
        
        if (foundProducts) break;
      }
    }

    return products;
  }

  async scrapeGenericCompetitor(url: string): Promise<ScrapingResult> {
    try {
      console.log(`Scraping generic competitor: ${url}`);
      
      const response = await axios.get(url, {
        headers: { 'User-Agent': this.userAgent }
      });

      const $ = cheerio.load(response.data);
      const products: CompetitorProduct[] = [];
      const competitorName = this.extractCompetitorName(url);
      const categoryName = this.extractCategoryFromUrl(url);

      // Generic product selectors that work on most e-commerce sites
      const productSelectors = [
        '.product',
        '.product-item',
        '.product-card',
        '[class*="product"]',
        '.item',
        '[data-product]'
      ];

      for (const selector of productSelectors) {
        const productElements = $(selector);
        
        if (productElements.length > 5) { // Only proceed if we find a reasonable number
          console.log(`Found ${productElements.length} products with selector: ${selector}`);
          
          productElements.each((index: number, element: any) => {
            if (products.length >= 50) return false; // Limit to 50 products
            
            const $product = $(element);
            
            // Extract title using various selectors
            const title = $product.find('h1, h2, h3, h4, [class*="title"], [class*="name"]')
              .first().text().trim() ||
              $product.find('a').first().attr('title') || '';

            // Extract price
            const priceText = $product.find('[class*="price"], .amount, [data-price]')
              .first().text().trim();
            const price = this.parsePrice(priceText);

            // Extract image
            const imgEl = $product.find('img').first();
            const image = imgEl.length ? 
              this.normalizeImageUrl(imgEl.attr('src') || imgEl.attr('data-src') || '', url) : '';

            // Extract product URL
            const linkEl = $product.find('a').first();
            const productUrl = linkEl.length && linkEl.attr('href') ?
              (linkEl.attr('href')!.startsWith('/') ? 
                new URL(linkEl.attr('href')!, url).toString() : 
                linkEl.attr('href')!) : url;

            if (title && title.length > 3) {
              const brand = this.extractBrand(title);
              const model = this.extractModel(title, brand);

              products.push({
                title: title,
                price: price,
                image: image,
                url: productUrl,
                brand: brand,
                model: model,
                category: categoryName,
                sku: `${competitorName.toUpperCase()}-${String(products.length + 1).padStart(3, '0')}`,
                competitorName: competitorName
              });
            }
          });
          
          if (products.length > 0) break;
        }
      }

      console.log(`Extracted ${products.length} products from ${competitorName}`);

      return {
        products,
        totalProducts: products.length,
        categoryName,
        competitorName,
        sourceUrl: url,
        extractedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error(`Error scraping ${url}:`, error);
      return {
        products: [],
        totalProducts: 0,
        categoryName: this.extractCategoryFromUrl(url),
        competitorName: this.extractCompetitorName(url),
        sourceUrl: url,
        extractedAt: new Date().toISOString()
      };
    }
  }

  async scrapeCompetitor(url: string): Promise<ScrapingResult> {
    const hostname = new URL(url).hostname.toLowerCase();
    
    // Route to specific scrapers based on domain
    if (hostname.includes('toolkitdepot')) {
      return this.scrapeToolkitDepot(url);
    }
    
    // Default to generic scraper for other competitors
    return this.scrapeGenericCompetitor(url);
  }
}

export const competitorScraper = new CompetitorScraper();