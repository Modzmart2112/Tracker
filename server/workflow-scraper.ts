import puppeteer from 'puppeteer';
import type { Browser, Page } from 'puppeteer';
import { DrizzleStorage } from './storage.drizzle';

export interface ScrapingElement {
  name: string;
  selector: string;
  selectorType: 'css' | 'xpath';
  attribute?: string;
}

export interface ScrapingResult {
  [key: string]: string | number | null;
}

export class WorkflowScraper {
  private browser: Browser | null = null;
  private storage: DrizzleStorage;

  constructor() {
    this.storage = new DrizzleStorage();
  }

  async initialize(): Promise<void> {
    try {
      // Temporarily skip Puppeteer initialization for Render deployment debugging
      if (process.env.NODE_ENV === 'production') {
        console.log('Skipping Puppeteer initialization in production for debugging');
        return;
      }

      // Use minimal configuration to let Puppeteer handle everything automatically
      const launchOptions: any = {
        headless: process.env.NODE_ENV === 'production' ? true : false
      };

      // Only set executablePath for local development if needed
      if (process.env.NODE_ENV !== 'production' && process.env.CHROME_PATH) {
        launchOptions.executablePath = process.env.CHROME_PATH;
      }

      this.browser = await puppeteer.launch(launchOptions);
      console.log('Puppeteer browser initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Puppeteer browser:', error);
      throw error;
    }
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async discoverProductUrls(categoryUrl: string): Promise<string[]> {
    if (!this.browser) throw new Error('Browser not initialized');
    
    const page = await this.browser.newPage();
    const productUrls: string[] = [];
    
    try {
      await page.goto(categoryUrl, { waitUntil: 'networkidle2' });
      
      // Handle pagination and collect all product URLs
      let hasNextPage = true;
      let currentPage = 1;
      
      while (hasNextPage) {
        // Extract product URLs from current page
        const pageUrls = await page.evaluate(() => {
          const links = document.querySelectorAll('a[href*="/"]');
          const urls: string[] = [];
          
          links.forEach(link => {
            const href = link.getAttribute('href');
            if (href && href.includes('/') && !href.startsWith('http')) {
              // Convert relative URLs to absolute
              const absoluteUrl = new URL(href, window.location.href).href;
              urls.push(absoluteUrl);
            } else if (href && href.startsWith('http')) {
              urls.push(href);
            }
          });
          
          return urls;
        });
        
        productUrls.push(...pageUrls);
        
        // Check for next page
        const nextPageButton = await page.$('[aria-label="Next"], .next, .pagination-next');
        if (nextPageButton) {
          await nextPageButton.click();
          await page.waitForTimeout(2000);
          currentPage++;
          
          // Safety limit to prevent infinite loops
          if (currentPage > 50) break;
        } else {
          hasNextPage = false;
        }
      }
      
    } finally {
      await page.close();
    }
    
    // Filter and deduplicate product URLs
    const filteredUrls = productUrls.filter(url => 
      url.includes('/') && 
      !url.includes('#') && 
      !url.includes('javascript:') &&
      url !== categoryUrl
    );
    
    return [...new Set(filteredUrls)];
  }

  async previewPage(url: string): Promise<{ html: string; screenshot: Buffer }> {
    if (!this.browser) throw new Error('Browser not initialized');
    
    const page = await this.browser.newPage();
    
    try {
      await page.setViewport({ width: 1920, height: 1080 });
      await page.goto(url, { waitUntil: 'networkidle2' });
      
      // Wait for dynamic content to load
      await page.waitForTimeout(3000);
      
      const html = await page.content();
      const screenshot = await page.screenshot({ fullPage: true });
      
      return { html, screenshot };
    } finally {
      await page.close();
    }
  }

  async testElementSelection(url: string, elements: ScrapingElement[]): Promise<ScrapingResult> {
    if (!this.browser) throw new Error('Browser not initialized');
    
    const page = await this.browser.newPage();
    const results: ScrapingResult = {};
    
    try {
      // Set a reasonable timeout and user agent
      await page.setDefaultTimeout(30000);
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36');
      
      console.log(`Testing elements on URL: ${url}`);
      await page.goto(url, { waitUntil: 'networkidle2' });
      
      for (const element of elements) {
        try {
          let value: string | null = null;
          console.log(`Testing element: ${element.name} with selector: ${element.selector}`);
          
          if (element.selectorType === 'css') {
            const elementHandle = await page.$(element.selector);
            if (elementHandle) {
              if (element.attribute === 'text') {
                value = await page.evaluate(el => el.textContent?.trim() || null, elementHandle);
              } else if (element.attribute === 'href') {
                value = await page.evaluate(el => el.getAttribute('href'), elementHandle);
              } else if (element.attribute === 'src') {
                value = await page.evaluate(el => el.getAttribute('src'), elementHandle);
              } else if (element.attribute === 'data-attribute') {
                // Handle custom data attributes
                const dataAttr = element.attribute.split(':')[1] || 'data-value';
                value = await page.evaluate((el, attr) => el.getAttribute(attr), elementHandle, dataAttr);
              } else {
                // Default to text content
                value = await page.evaluate(el => el.textContent?.trim() || null, elementHandle);
              }
            } else {
              console.log(`Element not found with CSS selector: ${element.selector}`);
            }
          } else if (element.selectorType === 'xpath') {
            const [elementHandle] = await page.$x(element.selector);
            if (elementHandle) {
              if (element.attribute === 'text') {
                value = await page.evaluate(el => el.textContent?.trim() || null, elementHandle);
              } else if (element.attribute === 'href') {
                value = await page.evaluate(el => el.getAttribute('href'), elementHandle);
              } else if (element.attribute === 'src') {
                value = await page.evaluate(el => el.getAttribute('src'), elementHandle);
              } else {
                value = await page.evaluate(el => el.textContent?.trim() || null, elementHandle);
              }
            } else {
              console.log(`Element not found with XPath selector: ${element.selector}`);
            }
          }
          
          results[element.name] = value || 'Element not found';
          console.log(`Result for ${element.name}: ${value}`);
          
        } catch (error) {
          console.error(`Error testing element ${element.name}:`, error);
          results[element.name] = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      }
      
    } catch (error) {
      console.error('Error during test scraping:', error);
      throw error;
    } finally {
      await page.close();
    }
    
    return results;
  }

  async scrapeProducts(workflowId: string): Promise<void> {
    if (!this.browser) throw new Error('Browser not initialized');
    
    // Get workflow and elements
    const workflows = await this.storage.getScrapingWorkflows();
    const workflow = workflows.find(w => w.id === workflowId);
    const elements = await this.storage.getScrapingElements(workflowId);
    
    if (!workflow || elements.length === 0) {
      throw new Error('Workflow or elements not found');
    }
    
    // Get all product URLs for this workflow
    const productUrlRecords = await this.storage.getProductUrls(workflowId);
    
    for (const productUrlRecord of productUrlRecords) {
      try {
        const scrapedData = await this.testElementSelection(productUrlRecord.url, elements);
        
        // Store the result
        await this.storage.createScrapingResult({
          workflowId,
          productUrlId: productUrlRecord.id,
          scrapedData,
          status: 'success'
        });
        
        // Update last scraped timestamp
        await this.storage.updateProductUrl(productUrlRecord.id, {
          lastScraped: new Date()
        });
          
      } catch (error) {
        // Store error result
        await this.storage.createScrapingResult({
          workflowId,
          productUrlId: productUrlRecord.id,
          scrapedData: {},
          status: 'error',
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  }

  async createWorkflow(
    name: string,
    description: string,
    categoryUrl: string,
    competitorName: string,
    userId: string
  ): Promise<string> {
    const workflow = await this.storage.createScrapingWorkflow({
      name,
      description,
      categoryUrl,
      competitorName,
      userId
    });
    
    return workflow.id;
  }

  async addScrapingElements(workflowId: string, elements: ScrapingElement[]): Promise<void> {
    for (const element of elements) {
      await this.storage.createScrapingElement({
        workflowId,
        name: element.name,
        selector: element.selector,
        selectorType: element.selectorType,
        attribute: element.attribute,
        order: elements.indexOf(element) + 1
      });
    }
  }

  async addProductUrls(workflowId: string, urls: string[]): Promise<void> {
    for (const url of urls) {
      await this.storage.createProductUrl({
        workflowId,
        url
      });
    }
  }
}
