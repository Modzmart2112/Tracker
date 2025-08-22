import axios from 'axios';
import * as cheerio from 'cheerio';
import { extractModelNumberWithAI } from './ai-model-extractor';

export interface ScrapedProduct {
  title: string;
  price: number;
  regularPrice?: number;
  salePrice?: number;
  image: string;
  url: string;
  brand: string;
  model: string;
  category: string;
  sku: string;
  competitorName: string;
  hasPromotion?: boolean;
  promotionText?: string;
  redemptionBadge?: string;
}

export interface ScrapingResult {
  products: ScrapedProduct[];
  totalProducts: number;
  categoryName: string;
  competitorName: string;
  sourceUrl: string;
  extractedAt: string;
}

export class MultiSiteScraper {
  private userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36';

  private normalizeImageUrl(imageUrl: string, baseUrl: string): string {
    if (!imageUrl) return '';
    
    if (imageUrl.startsWith('data:')) return imageUrl;
    if (imageUrl.startsWith('//')) return 'https:' + imageUrl;
    if (imageUrl.startsWith('/')) {
      const base = new URL(baseUrl);
      return `${base.protocol}//${base.hostname}${imageUrl}`;
    }
    
    return imageUrl;
  }

  private parsePrice(priceText: string): number {
    const cleanPrice = priceText.replace(/[^\d.,]/g, '');
    const numberPrice = parseFloat(cleanPrice.replace(/,/g, ''));
    return isNaN(numberPrice) ? 0 : numberPrice;
  }

  private extractBrand(title: string): string {
    const brandPatterns = [
      /^(Makita|DeWalt|Milwaukee|Bosch|Ryobi|Stanley|Black\+Decker|Festool|Metabo|Hilti)/i,
      /^(SP Tools|Kincrome|Sidchrome|Stanley|GearWrench|Teng Tools|Bahco)/i,
      /^(Matson|Schumacher|NOCO|Century|Projecta|CTEK|Optimate)/i,
      /^(Ozito|AEG|Hitachi|Panasonic|Craftsman|Ridgid)/i,
      /^(SCA|ToolPRO|Blackridge|Mechpro)/i,
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
    const modelPatterns = [
      /([A-Z]{2}\d{5})/i,
      /([A-Z]+\d{3,})/i,
      /(\b\d{5,}\b)/,
      /(Model\s+[A-Z0-9-]+)/i,
      /([A-Z0-9-]{6,})/
    ];

    for (const pattern of modelPatterns) {
      const match = title.match(pattern);
      if (match) {
        return match[1].toUpperCase();
      }
    }

    return title.replace(brand, '').trim().replace(/^[-\s]+/, '').split(' ')[0] || 'Unknown';
  }

  private detectPromotion($product: any): { hasPromotion: boolean; promotionText?: string; redemptionBadge?: string } {
    const promotionSelectors = [
      '.promo-badge',
      '.promotion',
      '.offer',
      '.special',
      '.sale-badge',
      '.discount-badge',
      '[class*="badge"]',
      '[class*="promo"]',
      '[class*="offer"]',
      '.redemption',
      '.cashback',
      '.bonus'
    ];

    for (const selector of promotionSelectors) {
      const promoEl = $product.find(selector).first();
      if (promoEl.length) {
        const text = promoEl.text().trim();
        if (text) {
          return {
            hasPromotion: true,
            promotionText: text,
            redemptionBadge: text
          };
        }
      }
    }

    // Check for image overlays
    const overlaySelectors = ['.product-badge', '.overlay', '.product-overlay', '[class*="overlay"]'];
    for (const selector of overlaySelectors) {
      const overlayEl = $product.find(selector).first();
      if (overlayEl.length) {
        const text = overlayEl.text().trim();
        if (text && (text.toLowerCase().includes('bonus') || text.toLowerCase().includes('redemption') || text.toLowerCase().includes('cashback'))) {
          return {
            hasPromotion: true,
            promotionText: text,
            redemptionBadge: text
          };
        }
      }
    }

    return { hasPromotion: false };
  }

  private async extractSalePrice($product: any): Promise<{ regularPrice?: number; salePrice?: number }> {
    // Look for crossed out/original price
    const regularPriceSelectors = [
      '.was-price',
      '.old-price',
      '.regular-price',
      '.original-price',
      '.list-price',
      'del',
      's',
      'strike',
      '[class*="was"]',
      '[class*="original"]',
      '.price-was'
    ];

    // Look for current/sale price
    const salePriceSelectors = [
      '.sale-price',
      '.special-price',
      '.now-price',
      '.current-price',
      '.price-now',
      '.price.sale',
      '[class*="sale-price"]',
      '[class*="now"]'
    ];

    let regularPrice: number | undefined;
    let salePrice: number | undefined;

    // Extract regular price
    for (const selector of regularPriceSelectors) {
      const priceEl = $product.find(selector).first();
      if (priceEl.length) {
        const price = this.parsePrice(priceEl.text());
        if (price > 0) {
          regularPrice = price;
          break;
        }
      }
    }

    // Extract sale price
    for (const selector of salePriceSelectors) {
      const priceEl = $product.find(selector).first();
      if (priceEl.length) {
        const price = this.parsePrice(priceEl.text());
        if (price > 0) {
          salePrice = price;
          break;
        }
      }
    }

    // If no specific sale price found, get the main price
    if (!salePrice) {
      const mainPriceSelectors = ['.price', '.amount', '[class*="price"]:not([class*="was"]):not([class*="old"])'];
      for (const selector of mainPriceSelectors) {
        const priceEl = $product.find(selector).first();
        if (priceEl.length) {
          const price = this.parsePrice(priceEl.text());
          if (price > 0) {
            salePrice = price;
            break;
          }
        }
      }
    }

    return { regularPrice, salePrice };
  }

  // Sydney Tools Scraper
  async scrapeSydneyTools(url: string): Promise<ScrapingResult> {
    try {
      const response = await axios.get(url, {
        headers: { 'User-Agent': this.userAgent },
        timeout: 30000
      });

      const $ = cheerio.load(response.data);
      const products: ScrapedProduct[] = [];

      const productElements = $('.product-card, .ant-card').toArray();
      for (let index = 0; index < productElements.length && products.length < 50; index++) {
        const element = productElements[index];
        const $product = $(element);
        
        const title = $product.find('.ant-card-meta-title, .product-title').first().text().trim();
        const priceData = await this.extractSalePrice($product);
        const image = this.normalizeImageUrl(
          $product.find('img').first().attr('src') || '',
          url
        );
        const productUrl = this.normalizeImageUrl(
          $product.find('a').first().attr('href') || '',
          url
        );

        if (title) {
          const brand = this.extractBrand(title);
          const model = await this.enhanceModelExtraction(title);
          const promo = this.detectPromotion($product);

          products.push({
            title,
            price: priceData.salePrice || 0,
            regularPrice: priceData.regularPrice,
            salePrice: priceData.salePrice,
            image,
            url: productUrl,
            brand,
            model,
            category: this.extractCategoryFromUrl(url),
            sku: `SYDNEY-${String(index + 1).padStart(3, '0')}`,
            competitorName: 'Sydney Tools',
            ...promo
          });
        }
      }

      return {
        products,
        totalProducts: products.length,
        categoryName: this.extractCategoryFromUrl(url),
        competitorName: 'Sydney Tools',
        sourceUrl: url,
        extractedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error scraping Sydney Tools:', error);
      return this.emptyResult(url, 'Sydney Tools');
    }
  }

  // Bunnings Scraper
  async scrapeBunnings(url: string): Promise<ScrapingResult> {
    try {
      const response = await axios.get(url, {
        headers: { 'User-Agent': this.userAgent },
        timeout: 30000
      });

      const $ = cheerio.load(response.data);
      const products: ScrapedProduct[] = [];

      const productElements = $('[data-locator="product-tile"], .product-tile, article[class*="ProductTile"]').toArray();
      for (let index = 0; index < productElements.length && products.length < 50; index++) {
        const element = productElements[index];
        const $product = $(element);
        
        const title = $product.find('[data-locator="product-title"], h3, .product-title').first().text().trim();
        const priceData = await this.extractSalePrice($product);
        const image = this.normalizeImageUrl(
          $product.find('img').first().attr('src') || $product.find('img').first().attr('data-src') || '',
          url
        );
        const productUrl = this.normalizeImageUrl(
          $product.find('a').first().attr('href') || '',
          url
        );

        if (title) {
          const brand = this.extractBrand(title);
          const model = await this.enhanceModelExtraction(title);
          const promo = this.detectPromotion($product);

          products.push({
            title,
            price: priceData.salePrice || 0,
            regularPrice: priceData.regularPrice,
            salePrice: priceData.salePrice,
            image,
            url: productUrl,
            brand,
            model,
            category: this.extractCategoryFromUrl(url),
            sku: `BUNNINGS-${String(index + 1).padStart(3, '0')}`,
            competitorName: 'Bunnings',
            ...promo
          });
        }
      }

      return {
        products,
        totalProducts: products.length,
        categoryName: this.extractCategoryFromUrl(url),
        competitorName: 'Bunnings',
        sourceUrl: url,
        extractedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error scraping Bunnings:', error);
      return this.emptyResult(url, 'Bunnings');
    }
  }

  // Total Tools Scraper
  async scrapeTotalTools(url: string): Promise<ScrapingResult> {
    try {
      const response = await axios.get(url, {
        headers: { 'User-Agent': this.userAgent },
        timeout: 30000
      });

      const $ = cheerio.load(response.data);
      const products: ScrapedProduct[] = [];

      const productElements = $('.product-item, .product-tile, [class*="product-card"]').toArray();
      for (let index = 0; index < productElements.length && products.length < 50; index++) {
        const element = productElements[index];
        const $product = $(element);
        
        const title = $product.find('.product-item-name, .product-name, h3').first().text().trim();
        const priceData = await this.extractSalePrice($product);
        const image = this.normalizeImageUrl(
          $product.find('img').first().attr('src') || '',
          url
        );
        const productUrl = this.normalizeImageUrl(
          $product.find('a').first().attr('href') || '',
          url
        );

        if (title) {
          const brand = this.extractBrand(title);
          const model = await this.enhanceModelExtraction(title);
          const promo = this.detectPromotion($product);

          products.push({
            title,
            price: priceData.salePrice || 0,
            regularPrice: priceData.regularPrice,
            salePrice: priceData.salePrice,
            image,
            url: productUrl,
            brand,
            model,
            category: this.extractCategoryFromUrl(url),
            sku: `TOTAL-${String(index + 1).padStart(3, '0')}`,
            competitorName: 'Total Tools',
            ...promo
          });
        }
      }

      return {
        products,
        totalProducts: products.length,
        categoryName: this.extractCategoryFromUrl(url),
        competitorName: 'Total Tools',
        sourceUrl: url,
        extractedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error scraping Total Tools:', error);
      return this.emptyResult(url, 'Total Tools');
    }
  }

  // Trade Tools Scraper
  async scrapeTradeTools(url: string): Promise<ScrapingResult> {
    try {
      const response = await axios.get(url, {
        headers: { 'User-Agent': this.userAgent },
        timeout: 30000
      });

      const $ = cheerio.load(response.data);
      const products: ScrapedProduct[] = [];

      const productElements = $('.product, .product-item, .grid-item').toArray();
      for (let index = 0; index < productElements.length && products.length < 50; index++) {
        const element = productElements[index];
        const $product = $(element);
        
        const title = $product.find('.product-name, h2, h3').first().text().trim();
        const priceData = await this.extractSalePrice($product);
        const image = this.normalizeImageUrl(
          $product.find('img').first().attr('src') || '',
          url
        );
        const productUrl = this.normalizeImageUrl(
          $product.find('a').first().attr('href') || '',
          url
        );

        if (title) {
          const brand = this.extractBrand(title);
          const model = await this.enhanceModelExtraction(title);
          const promo = this.detectPromotion($product);

          products.push({
            title,
            price: priceData.salePrice || 0,
            regularPrice: priceData.regularPrice,
            salePrice: priceData.salePrice,
            image,
            url: productUrl,
            brand,
            model,
            category: this.extractCategoryFromUrl(url),
            sku: `TRADE-${String(index + 1).padStart(3, '0')}`,
            competitorName: 'Trade Tools',
            ...promo
          });
        }
      }

      return {
        products,
        totalProducts: products.length,
        categoryName: this.extractCategoryFromUrl(url),
        competitorName: 'Trade Tools',
        sourceUrl: url,
        extractedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error scraping Trade Tools:', error);
      return this.emptyResult(url, 'Trade Tools');
    }
  }

  // Supercheap Auto Scraper
  async scrapeSuperCheapAuto(url: string): Promise<ScrapingResult> {
    try {
      const response = await axios.get(url, {
        headers: { 'User-Agent': this.userAgent },
        timeout: 30000
      });

      const $ = cheerio.load(response.data);
      const products: ScrapedProduct[] = [];

      const productElements = $('[data-testid="product-tile"], .product-tile, .product-item').toArray();
      for (let index = 0; index < productElements.length && products.length < 50; index++) {
        const element = productElements[index];
        const $product = $(element);
        
        const title = $product.find('[data-testid="product-title"], .product-title, h3').first().text().trim();
        const priceData = await this.extractSalePrice($product);
        const image = this.normalizeImageUrl(
          $product.find('img').first().attr('src') || '',
          url
        );
        const productUrl = this.normalizeImageUrl(
          $product.find('a').first().attr('href') || '',
          url
        );

        if (title) {
          const brand = this.extractBrand(title);
          const model = await this.enhanceModelExtraction(title);
          const promo = this.detectPromotion($product);

          // Special handling for SCA promotions
          const scaPromo = $product.find('.club-price, .member-price').first();
          if (scaPromo.length) {
            promo.hasPromotion = true;
            promo.promotionText = 'Club Price Available';
            promo.redemptionBadge = 'CLUB';
          }

          products.push({
            title,
            price: priceData.salePrice || 0,
            regularPrice: priceData.regularPrice,
            salePrice: priceData.salePrice,
            image,
            url: productUrl,
            brand,
            model,
            category: this.extractCategoryFromUrl(url),
            sku: `SCA-${String(index + 1).padStart(3, '0')}`,
            competitorName: 'Supercheap Auto',
            ...promo
          });
        }
      }

      return {
        products,
        totalProducts: products.length,
        categoryName: this.extractCategoryFromUrl(url),
        competitorName: 'Supercheap Auto',
        sourceUrl: url,
        extractedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error scraping Supercheap Auto:', error);
      return this.emptyResult(url, 'Supercheap Auto');
    }
  }

  // Repco Scraper
  async scrapeRepco(url: string): Promise<ScrapingResult> {
    try {
      const response = await axios.get(url, {
        headers: { 'User-Agent': this.userAgent },
        timeout: 30000
      });

      const $ = cheerio.load(response.data);
      const products: ScrapedProduct[] = [];

      const productElements = $('.product-tile, .product-item, [class*="ProductCard"]').toArray();
      for (let index = 0; index < productElements.length && products.length < 50; index++) {
        const element = productElements[index];
        const $product = $(element);
        
        const title = $product.find('.product-tile__title, .product-name, h3').first().text().trim();
        const priceData = await this.extractSalePrice($product);
        const image = this.normalizeImageUrl(
          $product.find('img').first().attr('src') || '',
          url
        );
        const productUrl = this.normalizeImageUrl(
          $product.find('a').first().attr('href') || '',
          url
        );

        if (title) {
          const brand = this.extractBrand(title);
          const model = await this.enhanceModelExtraction(title);
          const promo = this.detectPromotion($product);

          products.push({
            title,
            price: priceData.salePrice || 0,
            regularPrice: priceData.regularPrice,
            salePrice: priceData.salePrice,
            image,
            url: productUrl,
            brand,
            model,
            category: this.extractCategoryFromUrl(url),
            sku: `REPCO-${String(index + 1).padStart(3, '0')}`,
            competitorName: 'Repco',
            ...promo
          });
        }
      }

      return {
        products,
        totalProducts: products.length,
        categoryName: this.extractCategoryFromUrl(url),
        competitorName: 'Repco',
        sourceUrl: url,
        extractedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error scraping Repco:', error);
      return this.emptyResult(url, 'Repco');
    }
  }

  // Autobarn Scraper
  async scrapeAutobarn(url: string): Promise<ScrapingResult> {
    try {
      const response = await axios.get(url, {
        headers: { 'User-Agent': this.userAgent },
        timeout: 30000
      });

      const $ = cheerio.load(response.data);
      const products: ScrapedProduct[] = [];

      const productElements = $('.product, .product-item, .product-card').toArray();
      for (let index = 0; index < productElements.length && products.length < 50; index++) {
        const element = productElements[index];
        const $product = $(element);
        
        const title = $product.find('.product-name, h3, .title').first().text().trim();
        const priceData = await this.extractSalePrice($product);
        const image = this.normalizeImageUrl(
          $product.find('img').first().attr('src') || '',
          url
        );
        const productUrl = this.normalizeImageUrl(
          $product.find('a').first().attr('href') || '',
          url
        );

        if (title) {
          const brand = this.extractBrand(title);
          const model = await this.enhanceModelExtraction(title);
          const promo = this.detectPromotion($product);

          products.push({
            title,
            price: priceData.salePrice || 0,
            regularPrice: priceData.regularPrice,
            salePrice: priceData.salePrice,
            image,
            url: productUrl,
            brand,
            model,
            category: this.extractCategoryFromUrl(url),
            sku: `AUTO-${String(index + 1).padStart(3, '0')}`,
            competitorName: 'Autobarn',
            ...promo
          });
        }
      }

      return {
        products,
        totalProducts: products.length,
        categoryName: this.extractCategoryFromUrl(url),
        competitorName: 'Autobarn',
        sourceUrl: url,
        extractedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error scraping Autobarn:', error);
      return this.emptyResult(url, 'Autobarn');
    }
  }

  // Mitre 10 Scraper
  async scrapeMitre10(url: string): Promise<ScrapingResult> {
    try {
      const response = await axios.get(url, {
        headers: { 'User-Agent': this.userAgent },
        timeout: 30000
      });

      const $ = cheerio.load(response.data);
      const products: ScrapedProduct[] = [];

      const productElements = $('.product-tile, .product-item, article[class*="product"]').toArray();
      for (let index = 0; index < productElements.length && products.length < 50; index++) {
        const element = productElements[index];
        const $product = $(element);
        
        const title = $product.find('.product-tile__title, .product-name, h3').first().text().trim();
        const priceData = await this.extractSalePrice($product);
        const image = this.normalizeImageUrl(
          $product.find('img').first().attr('src') || '',
          url
        );
        const productUrl = this.normalizeImageUrl(
          $product.find('a').first().attr('href') || '',
          url
        );

        if (title) {
          const brand = this.extractBrand(title);
          const model = await this.enhanceModelExtraction(title);
          const promo = this.detectPromotion($product);

          products.push({
            title,
            price: priceData.salePrice || 0,
            regularPrice: priceData.regularPrice,
            salePrice: priceData.salePrice,
            image,
            url: productUrl,
            brand,
            model,
            category: this.extractCategoryFromUrl(url),
            sku: `MITRE-${String(index + 1).padStart(3, '0')}`,
            competitorName: 'Mitre 10',
            ...promo
          });
        }
      }

      return {
        products,
        totalProducts: products.length,
        categoryName: this.extractCategoryFromUrl(url),
        competitorName: 'Mitre 10',
        sourceUrl: url,
        extractedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error scraping Mitre 10:', error);
      return this.emptyResult(url, 'Mitre 10');
    }
  }

  // Gasweld Scraper
  async scrapeGasweld(url: string): Promise<ScrapingResult> {
    try {
      const response = await axios.get(url, {
        headers: { 'User-Agent': this.userAgent },
        timeout: 30000
      });

      const $ = cheerio.load(response.data);
      const products: ScrapedProduct[] = [];

      const productElements = $('.product, .product-item, .grid-item').toArray();
      for (let index = 0; index < productElements.length && products.length < 50; index++) {
        const element = productElements[index];
        const $product = $(element);
        
        const title = $product.find('.product-title, h3, .title').first().text().trim();
        const priceData = await this.extractSalePrice($product);
        const image = this.normalizeImageUrl(
          $product.find('img').first().attr('src') || '',
          url
        );
        const productUrl = this.normalizeImageUrl(
          $product.find('a').first().attr('href') || '',
          url
        );

        if (title) {
          const brand = this.extractBrand(title);
          const model = await this.enhanceModelExtraction(title);
          const promo = this.detectPromotion($product);

          products.push({
            title,
            price: priceData.salePrice || 0,
            regularPrice: priceData.regularPrice,
            salePrice: priceData.salePrice,
            image,
            url: productUrl,
            brand,
            model,
            category: this.extractCategoryFromUrl(url),
            sku: `GAS-${String(index + 1).padStart(3, '0')}`,
            competitorName: 'Gasweld',
            ...promo
          });
        }
      }

      return {
        products,
        totalProducts: products.length,
        categoryName: this.extractCategoryFromUrl(url),
        competitorName: 'Gasweld',
        sourceUrl: url,
        extractedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error scraping Gasweld:', error);
      return this.emptyResult(url, 'Gasweld');
    }
  }

  // Tools Warehouse Scraper
  async scrapeToolsWarehouse(url: string): Promise<ScrapingResult> {
    try {
      const response = await axios.get(url, {
        headers: { 'User-Agent': this.userAgent },
        timeout: 30000
      });

      const $ = cheerio.load(response.data);
      const products: ScrapedProduct[] = [];

      const productElements = $('.product-item, .product, .item').toArray();
      for (let index = 0; index < productElements.length && products.length < 50; index++) {
        const element = productElements[index];
        const $product = $(element);
        
        const title = $product.find('.product-name, h3, .title').first().text().trim();
        const priceData = await this.extractSalePrice($product);
        const image = this.normalizeImageUrl(
          $product.find('img').first().attr('src') || '',
          url
        );
        const productUrl = this.normalizeImageUrl(
          $product.find('a').first().attr('href') || '',
          url
        );

        if (title) {
          const brand = this.extractBrand(title);
          const model = await this.enhanceModelExtraction(title);
          const promo = this.detectPromotion($product);

          products.push({
            title,
            price: priceData.salePrice || 0,
            regularPrice: priceData.regularPrice,
            salePrice: priceData.salePrice,
            image,
            url: productUrl,
            brand,
            model,
            category: this.extractCategoryFromUrl(url),
            sku: `TOOLS-${String(index + 1).padStart(3, '0')}`,
            competitorName: 'Tools Warehouse',
            ...promo
          });
        }
      }

      return {
        products,
        totalProducts: products.length,
        categoryName: this.extractCategoryFromUrl(url),
        competitorName: 'Tools Warehouse',
        sourceUrl: url,
        extractedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error scraping Tools Warehouse:', error);
      return this.emptyResult(url, 'Tools Warehouse');
    }
  }

  // Toolkit Depot Scraper (keeping the existing one)
  async scrapeToolkitDepot(url: string): Promise<ScrapingResult> {
    try {
      const response = await axios.get(url, {
        headers: { 'User-Agent': this.userAgent },
        timeout: 30000
      });

      const $ = cheerio.load(response.data);
      const products: ScrapedProduct[] = [];

      const productElements = $('.product-item, .product-card, .woocommerce-loop-product, .product').toArray();
      for (let index = 0; index < productElements.length && products.length < 50; index++) {
        const element = productElements[index];
        const $product = $(element);
        
        const title = $product.find('h2 a, h3 a, .product-title a, .woocommerce-loop-product__title').first().text().trim() ||
                     $product.find('a').first().attr('title') || '';
        
        const priceData = await this.extractSalePrice($product);
        const image = this.normalizeImageUrl(
          $product.find('img').first().attr('src') || $product.find('img').first().attr('data-src') || '',
          url
        );
        const productUrl = this.normalizeImageUrl(
          $product.find('a').first().attr('href') || '',
          url
        );

        if (title) {
          const brand = this.extractBrand(title);
          const model = await this.enhanceModelExtraction(title);
          const promo = this.detectPromotion($product);

          products.push({
            title,
            price: priceData.salePrice || 0,
            regularPrice: priceData.regularPrice,
            salePrice: priceData.salePrice,
            image,
            url: productUrl,
            brand,
            model,
            category: this.extractCategoryFromUrl(url),
            sku: `TOOLKIT-${String(index + 1).padStart(3, '0')}`,
            competitorName: 'Toolkit Depot',
            ...promo
          });
        }
      }

      return {
        products,
        totalProducts: products.length,
        categoryName: this.extractCategoryFromUrl(url),
        competitorName: 'Toolkit Depot',
        sourceUrl: url,
        extractedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error scraping Toolkit Depot:', error);
      return this.emptyResult(url, 'Toolkit Depot');
    }
  }

  // Generic fallback scraper
  async scrapeGeneric(url: string): Promise<ScrapingResult> {
    try {
      const response = await axios.get(url, {
        headers: { 'User-Agent': this.userAgent },
        timeout: 30000
      });

      const $ = cheerio.load(response.data);
      const products: ScrapedProduct[] = [];
      const competitorName = this.extractCompetitorName(url);

      // Generic product selectors
      const productSelectors = [
        '.product',
        '.product-item',
        '.product-card',
        '[class*="product"]',
        '.item',
        '[data-product]',
        'article'
      ];

      for (const selector of productSelectors) {
        const productElements = $(selector);
        
        if (productElements.length > 5) {
          const productArray = productElements.toArray();
          
          for (let i = 0; i < productArray.length && products.length < 50; i++) {
            const element = productArray[i];
            const $product = $(element);
            
            const title = $product.find('h1, h2, h3, h4, [class*="title"], [class*="name"]')
              .first().text().trim() ||
              $product.find('a').first().attr('title') || '';

            if (title && title.length > 3) {
              const priceData = await this.extractSalePrice($product);
              const image = this.normalizeImageUrl(
                $product.find('img').first().attr('src') || $product.find('img').first().attr('data-src') || '',
                url
              );
              const productUrl = this.normalizeImageUrl(
                $product.find('a').first().attr('href') || '',
                url
              );

              const brand = this.extractBrand(title);
              const model = await this.enhanceModelExtraction(title);
              const promo = this.detectPromotion($product);

              products.push({
                title,
                price: priceData.salePrice || 0,
                regularPrice: priceData.regularPrice,
                salePrice: priceData.salePrice,
                image,
                url: productUrl,
                brand,
                model,
                category: this.extractCategoryFromUrl(url),
                sku: `${competitorName.toUpperCase()}-${String(products.length + 1).padStart(3, '0')}`,
                competitorName,
                ...promo
              });
            }
          }
          
          if (products.length > 0) break;
        }
      }

      return {
        products,
        totalProducts: products.length,
        categoryName: this.extractCategoryFromUrl(url),
        competitorName,
        sourceUrl: url,
        extractedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error(`Error scraping ${url}:`, error);
      return this.emptyResult(url, this.extractCompetitorName(url));
    }
  }

  // Main routing function
  async scrapeCompetitor(url: string): Promise<ScrapingResult> {
    const hostname = new URL(url).hostname.toLowerCase().replace('www.', '');
    
    console.log(`Scraping ${hostname} from URL: ${url}`);

    // Route to specific scrapers based on domain
    if (hostname.includes('sydneytools')) {
      return this.scrapeSydneyTools(url);
    } else if (hostname.includes('toolkitdepot')) {
      return this.scrapeToolkitDepot(url);
    } else if (hostname.includes('bunnings')) {
      return this.scrapeBunnings(url);
    } else if (hostname.includes('toolswarehouse')) {
      return this.scrapeToolsWarehouse(url);
    } else if (hostname.includes('tradetools')) {
      return this.scrapeTradeTools(url);
    } else if (hostname.includes('totaltools')) {
      return this.scrapeTotalTools(url);
    } else if (hostname.includes('gasweld')) {
      return this.scrapeGasweld(url);
    } else if (hostname.includes('supercheapauto')) {
      return this.scrapeSuperCheapAuto(url);
    } else if (hostname.includes('repco')) {
      return this.scrapeRepco(url);
    } else if (hostname.includes('autobarn')) {
      return this.scrapeAutobarn(url);
    } else if (hostname.includes('mitre10')) {
      return this.scrapeMitre10(url);
    } else {
      // Fallback to generic scraper
      return this.scrapeGeneric(url);
    }
  }

  // Helper methods
  private extractCategoryFromUrl(url: string): string {
    const patterns = [
      /\/category\/([^\/]+)/i,
      /\/([^\/]+)\/[^\/]*$/i,
      /\/c\/([^\/]+)/i
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

  private extractCompetitorName(url: string): string {
    try {
      const hostname = new URL(url).hostname.replace('www.', '');
      const parts = hostname.split('.');
      return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    } catch {
      return 'Unknown Competitor';
    }
  }

  private async enhanceModelExtraction(title: string): Promise<string> {
    try {
      if (process.env.OPENAI_API_KEY) {
        const model = await extractModelNumberWithAI(title);
        if (model && model !== 'N/A') {
          return model;
        }
      }
    } catch (error) {
      console.warn('AI model extraction failed:', error);
    }
    
    // Fallback to basic extraction
    const brand = this.extractBrand(title);
    return this.extractModel(title, brand);
  }

  private emptyResult(url: string, competitorName: string): ScrapingResult {
    return {
      products: [],
      totalProducts: 0,
      categoryName: this.extractCategoryFromUrl(url),
      competitorName,
      sourceUrl: url,
      extractedAt: new Date().toISOString()
    };
  }
}

export const multiSiteScraper = new MultiSiteScraper();