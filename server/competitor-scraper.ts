import axios from 'axios';
import * as cheerio from 'cheerio';

export interface CompetitorProduct {
  title: string;
  price: number;
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
    return title.replace(brand, '').trim().replace(/^[-\s]+/, '');
  }

  private parsePrice(priceText: string): number {
    const cleanPrice = priceText.replace(/[^\d.,]/g, '');
    const numberPrice = parseFloat(cleanPrice.replace(',', ''));
    return isNaN(numberPrice) ? 0 : numberPrice;
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
      console.log(`Scraping Toolkit Depot: ${url}`);
      
      const response = await axios.get(url, {
        headers: { 'User-Agent': this.userAgent }
      });

      const $ = cheerio.load(response.data);
      const products: CompetitorProduct[] = [];
      const competitorName = this.extractCompetitorName(url);
      const categoryName = this.extractCategoryFromUrl(url);

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
          
          productElements.each((index: number, element: any) => {
            const $product = $(element);
            
            // Extract title
            const titleSelectors = ['h2 a', 'h3 a', '.product-title a', '.woocommerce-loop-product__title', 'a[title]'];
            let title = '';
            
            for (const titleSel of titleSelectors) {
              const titleEl = $product.find(titleSel).first();
              if (titleEl.length) {
                title = titleEl.attr('title') || titleEl.text().trim();
                if (title) break;
              }
            }

            // Extract price
            const priceSelectors = ['.price', '.woocommerce-Price-amount', '.amount', '[class*="price"]'];
            let price = 0;
            
            for (const priceSel of priceSelectors) {
              const priceEl = $product.find(priceSel).first();
              if (priceEl.length) {
                const priceText = priceEl.text().trim();
                price = this.parsePrice(priceText);
                if (price > 0) break;
              }
            }

            // Extract image
            const imgSelectors = ['img', '.product-image img', '.wp-post-image'];
            let image = '';
            
            for (const imgSel of imgSelectors) {
              const imgEl = $product.find(imgSel).first();
              if (imgEl.length) {
                image = imgEl.attr('src') || imgEl.attr('data-src') || '';
                if (image) {
                  image = this.normalizeImageUrl(image, url);
                  break;
                }
              }
            }

            // Extract product URL
            const linkSelectors = ['a', '.product-title a', 'h2 a', 'h3 a'];
            let productUrl = url;
            
            for (const linkSel of linkSelectors) {
              const linkEl = $product.find(linkSel).first();
              if (linkEl.length) {
                const href = linkEl.attr('href');
                if (href) {
                  productUrl = href.startsWith('/') ? 
                    new URL(href, url).toString() : href;
                  break;
                }
              }
            }

            // Filter for battery chargers
            if (title && (
              title.toLowerCase().includes('charger') ||
              title.toLowerCase().includes('battery') ||
              url.toLowerCase().includes('charger')
            )) {
              const brand = this.extractBrand(title);
              const model = this.extractModel(title, brand);

              products.push({
                title: title,
                price: price || 0,
                image: image,
                url: productUrl,
                brand: brand,
                model: model,
                category: categoryName,
                sku: `${competitorName.toUpperCase()}-${String(products.length + 1).padStart(3, '0')}`,
                competitorName: competitorName
              });
              foundProducts = true;
            }
          });
          
          if (foundProducts) break;
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