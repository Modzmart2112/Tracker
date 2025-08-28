import { getBrowser } from './browser';

export interface ScrapingField {
  label: string;
  css: string;
  attr: 'text' | 'src' | 'href' | 'data-attribute';
  dataAttribute?: string;
  required: boolean;
  uniqueKey: boolean;
}

export interface ScrapingConfig {
  startUrl: string;
  listSelector: string;
  fields: ScrapingField[];
  paginationNext?: string;
  paginationMode: 'click' | 'scroll' | 'none';
  maxPages?: number;
  maxItems?: number;
  delay?: number;
}

export interface ScrapingResult {
  success: boolean;
  data: any[];
  totalItems: number;
  pages: number;
  errors: string[];
  executionTime: number;
}

export class ScraperEngine {
  private browser: any;
  private page: any;

  async initialize() {
    this.browser = await getBrowser();
    this.page = await this.browser.newPage();
    
    // Anti-bot basics
    const userAgents = [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_3) AppleWebKit/605.1.15 Version/16.4 Safari/605.1.15",
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
    ];
    
    await this.page.setUserAgent(userAgents[Math.floor(Math.random() * userAgents.length)]);
    await this.page.setViewport({ width: 1366, height: 900 });
    
    // Block unnecessary resources
    await this.page.setRequestInterception(true);
    this.page.on("request", (r: any) => {
      const type = r.resourceType();
      if (type === "image" || type === "media" || type === "font") return r.abort();
      r.continue();
    });
  }

  async scrape(config: ScrapingConfig): Promise<ScrapingResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let allData: any[] = [];
    let currentPage = 1;

    try {
      await this.initialize();
      
      // Navigate to start URL
      await this.page.goto(config.startUrl, { 
        waitUntil: "networkidle2", 
        timeout: 60_000 
      });
      
      await this.page.waitForTimeout(config.delay || 1000);

      do {
        console.log(`Scraping page ${currentPage}...`);
        
        // Extract data from current page
        const pageData = await this.extractPageData(config);
        allData.push(...pageData);
        
        console.log(`Found ${pageData.length} items on page ${currentPage}`);
        
        // Check if we should continue to next page
        if (config.paginationMode === 'click' && config.paginationNext) {
          const hasNext = await this.goToNextPage(config.paginationNext);
          if (!hasNext) break;
        } else if (config.paginationMode === 'scroll') {
          const hasMore = await this.scrollForMore();
          if (!hasMore) break;
        } else {
          break; // Single page mode
        }
        
        currentPage++;
        
        // Check limits
        if (config.maxPages && currentPage > config.maxPages) break;
        if (config.maxItems && allData.length >= config.maxItems) break;
        
        // Random delay between pages
        const delay = (config.delay || 1000) + Math.random() * 2000;
        await this.page.waitForTimeout(delay);
        
      } while (true);

      // Trim to max items if needed
      if (config.maxItems && allData.length > config.maxItems) {
        allData = allData.slice(0, config.maxItems);
      }

      return {
        success: true,
        data: allData,
        totalItems: allData.length,
        pages: currentPage - 1,
        errors,
        executionTime: Date.now() - startTime
      };

    } catch (error: any) {
      errors.push(`Scraping failed: ${error.message}`);
      return {
        success: false,
        data: allData,
        totalItems: allData.length,
        pages: currentPage - 1,
        errors,
        executionTime: Date.now() - startTime
      };
    } finally {
      await this.cleanup();
    }
  }

  private async extractPageData(config: ScrapingConfig): Promise<any[]> {
    return await this.page.evaluate((cfg: ScrapingConfig) => {
      const items = Array.from(document.querySelectorAll(cfg.listSelector));
      
      return items.slice(0, cfg.maxItems || 100).map(item => {
        const pick = (sel: string, attr: string) => {
          if (!sel) return null;
          const el = item.querySelector(sel);
          if (!el) return null;
          
          if (attr === 'text') return el.textContent?.trim() || null;
          if (attr === 'src') return (el as HTMLImageElement).src || null;
          if (attr === 'href') return (el as HTMLAnchorElement).href || null;
          if (attr === 'data-attribute') return el.getAttribute(cfg.fields.find(f => f.label === sel)?.dataAttribute || '') || null;
          
          return el.getAttribute(attr);
        };

        const out: any = {};
        for (const field of cfg.fields) {
          out[field.label] = pick(field.css, field.attr);
        }
        return out;
      });
    }, config);
  }

  private async goToNextPage(nextSelector: string): Promise<boolean> {
    try {
      const nextButton = await this.page.$(nextSelector);
      if (!nextButton) return false;
      
      await nextButton.click();
      await this.page.waitForTimeout(2000);
      return true;
    } catch {
      return false;
    }
  }

  private async scrollForMore(): Promise<boolean> {
    try {
      const previousHeight = await this.page.evaluate(() => document.body.scrollHeight);
      await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await this.page.waitForTimeout(2000);
      
      const newHeight = await this.page.evaluate(() => document.body.scrollHeight);
      return newHeight > previousHeight;
    } catch {
      return false;
    }
  }

  private async cleanup() {
    try {
      if (this.page) await this.page.close();
      if (this.browser && !process.env.BROWSERLESS_WSS) {
        await this.browser.close();
      } else if (this.browser) {
        await this.browser.disconnect();
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }

  // Preview mode - extract just first page for configuration
  async preview(config: ScrapingConfig): Promise<ScrapingResult> {
    const previewConfig = { ...config, maxItems: 10, paginationMode: 'none' as const };
    return this.scrape(previewConfig);
  }
}
