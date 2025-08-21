import { chromium, Browser, Page } from 'playwright';

export interface ScrapedProduct {
  sku: string;
  title: string;
  price: number;
  image: string;
  url: string;
  brand?: string;
  model?: string;
  category?: string;
}

export class WebScraper {
  private browser: Browser | null = null;

  async init() {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  async scrapeSydneyToolsCategory(url: string): Promise<{
    products: ScrapedProduct[];
    totalPages: number;
    currentPage: number;
    totalProducts: number;
    categoryName: string;
  }> {
    await this.init();
    
    const page = await this.browser!.newPage();
    
    try {
      console.log(`Scraping Sydney Tools category: ${url}`);
      
      // Navigate to the page and wait for it to load
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      
      // Wait for products to load
      await page.waitForSelector('.ant-card.ant-card-bordered.product-card, .product-item, [data-testid="product"], .product', { timeout: 10000 });
      
      // Extract category name
      const categoryName = await page.evaluate(() => {
        const breadcrumb = document.querySelector('.ant-breadcrumb-link:last-child, .breadcrumb-item:last-child, h1');
        return breadcrumb?.textContent?.trim() || 'PRODUCTS';
      });
      
      // Extract products
      const products = await page.evaluate(() => {
        const productCards = document.querySelectorAll('.ant-card.ant-card-bordered.product-card, .product-item, [data-testid="product"], .product');
        const extractedProducts: any[] = [];
        
        productCards.forEach((card, index) => {
          try {
            // Extract title
            const titleElement = card.querySelector('.ant-card-meta-title, .product-title, h3, h4, .title');
            const title = titleElement?.textContent?.trim();
            
            if (!title) return;
            
            // Extract price
            const priceElement = card.querySelector('.price, .ant-typography-title, [class*="price"], .cost, .amount');
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
              productUrl = `https://sydneytools.com.au${productUrl}`;
            }
            
            // Generate SKU from title
            const sku = title.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-').substring(0, 20).toUpperCase();
            
            // Extract brand (usually first word of title)
            const brand = title.split(' ')[0];
            
            extractedProducts.push({
              sku: `${sku}-${index}`,
              title,
              price,
              image,
              url: productUrl,
              brand,
              category: 'Car Battery Chargers'
            });
          } catch (error) {
            console.error('Error extracting product:', error);
          }
        });
        
        return extractedProducts;
      });
      
      // Try pagination info
      const paginationInfo = await page.evaluate(() => {
        const totalElement = document.querySelector('.ant-pagination-total-text, .pagination-info, .results-count');
        const currentPageElement = document.querySelector('.ant-pagination-item-active, .active .page-link');
        
        return {
          totalProducts: totalElement?.textContent?.match(/\d+/)?.[0] || products.length.toString(),
          currentPage: currentPageElement?.textContent?.trim() || '1'
        };
      });
      
      console.log(`Successfully extracted ${products.length} products from Sydney Tools`);
      
      return {
        products,
        totalPages: Math.ceil(parseInt(paginationInfo.totalProducts) / 20), // Assume 20 per page
        currentPage: parseInt(paginationInfo.currentPage),
        totalProducts: parseInt(paginationInfo.totalProducts) || products.length,
        categoryName: categoryName.toUpperCase()
      };
      
    } catch (error) {
      console.error('Error scraping Sydney Tools:', error);
      throw new Error(`Failed to scrape Sydney Tools category: ${error.message}`);
    } finally {
      await page.close();
    }
  }
}

export const webScraper = new WebScraper();