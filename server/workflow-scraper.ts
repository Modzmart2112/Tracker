import puppeteer from 'puppeteer';
import type { Browser, Page } from 'puppeteer';
import { getDb } from './db';
import { scrapingWorkflows, scrapingElements, productUrls, scrapingResults } from './storage.drizzle';
import { eq, and } from 'drizzle-orm';

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

  async initialize(): Promise<void> {
    try {
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
      await page.goto(url, { waitUntil: 'networkidle2' });
      
      for (const element of elements) {
        try {
          let value: string | null = null;
          
          if (element.selectorType === 'css') {
            const elementHandle = await page.$(element.selector);
            if (elementHandle) {
              if (element.attribute === 'textContent') {
                value = await page.evaluate(el => el.textContent?.trim() || null, elementHandle);
              } else if (element.attribute === 'href') {
                value = await page.evaluate(el => el.getAttribute('href'), elementHandle);
              } else if (element.attribute === 'src') {
                value = await page.evaluate(el => el.getAttribute('src'), elementHandle);
              } else {
                value = await page.evaluate(el => el.textContent?.trim() || null, elementHandle);
              }
            }
          } else if (element.selectorType === 'xpath') {
            const [elementHandle] = await page.$x(element.selector);
            if (elementHandle) {
              if (element.attribute === 'textContent') {
                value = await page.evaluate(el => el.textContent?.trim() || null, elementHandle);
              } else if (element.attribute === 'href') {
                value = await page.evaluate(el => el.getAttribute('href'), elementHandle);
              } else if (element.attribute === 'src') {
                value = await page.evaluate(el => el.getAttribute('src'), elementHandle);
              } else {
                value = await page.evaluate(el => el.textContent?.trim() || null, elementHandle);
              }
            }
          }
          
          results[element.name] = value;
        } catch (error) {
          results[element.name] = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      }
      
    } finally {
      await page.close();
    }
    
    return results;
  }

  async scrapeProducts(workflowId: string): Promise<void> {
    if (!this.browser) throw new Error('Browser not initialized');
    
    const db = getDb();
    // Get workflow and elements
    const workflow = await db.select().from(scrapingWorkflows).where(eq(scrapingWorkflows.id, workflowId)).limit(1);
    const elements = await db.select().from(scrapingElements).where(eq(scrapingElements.workflowId, workflowId)).orderBy(scrapingElements.order);
    
    if (workflow.length === 0 || elements.length === 0) {
      throw new Error('Workflow or elements not found');
    }
    
    // Get all product URLs for this workflow
    const productUrlRecords = await db.select().from(productUrls).where(eq(productUrls.workflowId, workflowId));
    
    for (const productUrlRecord of productUrlRecords) {
      try {
        const scrapedData = await this.testElementSelection(productUrlRecord.url, elements);
        
        // Store the result
        await db.insert(scrapingResults).values({
          workflowId,
          productUrlId: productUrlRecord.id,
          scrapedData,
          status: 'success'
        });
        
        // Update last scraped timestamp
        await db.update(productUrls)
          .set({ lastScraped: new Date() })
          .where(eq(productUrls.id, productUrlRecord.id));
          
      } catch (error) {
        // Store error result
        await db.insert(scrapingResults).values({
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
    const db = getDb();
    const [workflow] = await db.insert(scrapingWorkflows).values({
      name,
      description,
      categoryUrl,
      competitorName,
      userId
    }).returning({ id: scrapingWorkflows.id });
    
    return workflow.id;
  }

  async addScrapingElements(workflowId: string, elements: ScrapingElement[]): Promise<void> {
    const db = getDb();
    const elementsToInsert = elements.map((element, index) => ({
      workflowId,
      name: element.name,
      selector: element.selector,
      selectorType: element.selectorType,
      attribute: element.attribute,
      order: index + 1
    }));
    
    await db.insert(scrapingElements).values(elementsToInsert);
  }

  async addProductUrls(workflowId: string, urls: string[]): Promise<void> {
    const db = getDb();
    const urlsToInsert = urls.map(url => ({
      workflowId,
      url
    }));
    
    await db.insert(productUrls).values(urlsToInsert);
  }
}
