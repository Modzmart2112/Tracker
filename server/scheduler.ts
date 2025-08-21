import cron from 'node-cron';
import { storage } from './storage';
import { scrapeProductDetails } from './playwright-scraper';
import { matchProductByModelNumber } from './product-matcher';

interface ScrapingResult {
  success: boolean;
  productId: string;
  modelNumber: string;
  oldPrice?: number;
  newPrice?: number;
  priceChanged: boolean;
  error?: string;
}

class PriceMonitoringScheduler {
  private isRunning = false;
  
  constructor() {
    this.setupScheduler();
  }

  private setupScheduler() {
    // Schedule daily price checks at 12:00 AM AEST (14:00 UTC during standard time, 13:00 UTC during daylight saving)
    // Using 14:00 UTC to handle AEST standard time
    const cronExpression = '0 14 * * *'; // Every day at 2:00 PM UTC (12:00 AM AEST)
    
    console.log('Setting up daily price monitoring scheduler for 12:00 AM AEST');
    
    cron.schedule(cronExpression, async () => {
      if (this.isRunning) {
        console.log('Price monitoring already running, skipping this cycle');
        return;
      }
      
      console.log('Starting daily price monitoring at', new Date().toLocaleString('en-AU', { timeZone: 'Australia/Sydney' }));
      await this.runDailyPriceCheck();
    }, {
      timezone: 'Australia/Sydney'
    });
    
    console.log('Daily price monitoring scheduler initialized - will run at 12:00 AM AEST');
  }

  async runDailyPriceCheck(): Promise<ScrapingResult[]> {
    if (this.isRunning) {
      throw new Error('Price monitoring is already running');
    }

    this.isRunning = true;
    const results: ScrapingResult[] = [];
    
    try {
      console.log('🚀 Starting daily automated price monitoring...');
      
      // Create a task to track this automated run
      const task = await storage.createTask({
        status: "running",
        runReason: "scheduled",
        startedAt: new Date(),
        pageId: null
      });

      // Get all products that need price monitoring
      const products = await storage.getUnifiedProducts();
      console.log(`📊 Found ${products.length} products to monitor`);

      let priceChanges = 0;
      let errors = 0;

      // Check Sydney Tools products first
      for (const product of products) {
        if (!product.productPageUrl) continue;

        try {
          console.log(`🔍 Checking Sydney Tools price for ${product.modelNumber}...`);
          
          const scrapedData = await scrapeProductDetails(product.productPageUrl);
          const oldPrice = product.ourPrice || 0;
          const newPrice = scrapedData.price || 0;
          const priceChanged = Math.abs(oldPrice - newPrice) > 0.01; // Account for floating point precision

          if (priceChanged) {
            // Update the product price
            await storage.updateCatalogProduct(product.id, {
              price: newPrice,
              targetPrice: scrapedData.originalPrice || null,
              updatedAt: new Date()
            });
            
            priceChanges++;
            console.log(`💰 Price change detected for ${product.modelNumber}: $${oldPrice} → $${newPrice}`);
          }

          results.push({
            success: true,
            productId: product.id,
            modelNumber: product.modelNumber || 'N/A',
            oldPrice,
            newPrice,
            priceChanged
          });

          // Add small delay to avoid overwhelming the server
          await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error) {
          console.error(`❌ Error checking price for ${product.modelNumber}:`, error);
          errors++;
          
          results.push({
            success: false,
            productId: product.id,
            modelNumber: product.modelNumber || 'N/A',
            priceChanged: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      // Check competitor prices
      const competitorListings = await storage.getCompetitorListings();
      console.log(`🏪 Checking ${competitorListings.length} competitor listings...`);

      for (const listing of competitorListings) {
        try {
          console.log(`🔍 Checking competitor price for ${listing.url}...`);
          
          const scrapedData = await scrapeProductDetails(listing.url);
          const oldSnapshots = await storage.getListingSnapshots(listing.id);
          const latestSnapshot = oldSnapshots[0]; // Most recent
          const oldPrice = latestSnapshot?.price || 0;
          const newPrice = scrapedData.price || 0;
          const priceChanged = Math.abs(oldPrice - newPrice) > 0.01;

          if (priceChanged || !latestSnapshot) {
            // Create new price snapshot
            await storage.createListingSnapshot({
              listingId: listing.id,
              price: newPrice,
              currency: 'AUD',
              inStock: scrapedData.inStock !== false,
              scrapedAt: new Date()
            });

            if (priceChanged) {
              priceChanges++;
              console.log(`🏪 Competitor price change: ${listing.url} - $${oldPrice} → $${newPrice}`);
            }
          }

          // Add delay for competitor scraping too
          await new Promise(resolve => setTimeout(resolve, 1500));

        } catch (error) {
          console.error(`❌ Error checking competitor price for ${listing.url}:`, error);
          errors++;
        }
      }

      // Update task completion
      await storage.updateTask(task.id, {
        status: "completed",
        finishedAt: new Date(),
        error: errors > 0 ? `Completed with ${errors} errors` : null
      });

      console.log(`✅ Daily price monitoring completed!`);
      console.log(`📊 Summary: ${priceChanges} price changes detected, ${errors} errors`);
      console.log(`🕒 Next check: Tomorrow at 12:00 AM AEST`);

    } catch (error) {
      console.error('❌ Daily price monitoring failed:', error);
      throw error;
    } finally {
      this.isRunning = false;
    }

    return results;
  }

  // Manual trigger for testing
  async runManualPriceCheck(): Promise<ScrapingResult[]> {
    console.log('🧪 Running manual price check...');
    return await this.runDailyPriceCheck();
  }

  isCurrentlyRunning(): boolean {
    return this.isRunning;
  }
}

// Export singleton instance
export const scheduler = new PriceMonitoringScheduler();
export type { ScrapingResult };