import { multiSiteScraper } from './multi-site-scraper';
import { playwrightScraper } from './playwright-scraper';

async function testScrapers() {
  console.log('Testing Multi-Site Scraper...\n');
  
  // Test 1: Standard scraper on static site
  try {
    console.log('Testing Toolkit Depot (standard scraper)...');
    const toolkitResult = await multiSiteScraper.scrapeCompetitor(
      'https://www.toolkitdepot.com.au/car-battery-chargers-jump-starters/car-battery-chargers'
    );
    console.log(`Found ${toolkitResult.products.length} products from Toolkit Depot`);
    if (toolkitResult.products.length > 0) {
      console.log('Sample product:', toolkitResult.products[0]);
    }
  } catch (error) {
    console.error('Toolkit Depot scraping failed:', error);
  }
  
  // Test 2: Playwright scraper on Sydney Tools
  try {
    console.log('\nTesting Sydney Tools (Playwright scraper)...');
    const sydneyResult = await playwrightScraper.scrapeSydneyTools(
      'https://sydneytools.com.au/collections/battery-chargers'
    );
    console.log(`Found ${sydneyResult.products.length} products from Sydney Tools`);
    if (sydneyResult.products.length > 0) {
      console.log('Sample product:', sydneyResult.products[0]);
    }
  } catch (error) {
    console.error('Sydney Tools scraping failed:', error);
  }
  
  // Test 3: Generic scraper fallback
  try {
    console.log('\nTesting generic scraper on unknown site...');
    const genericResult = await multiSiteScraper.scrapeGeneric(
      'https://example-tools.com/products'
    );
    console.log(`Found ${genericResult.products.length} products from generic site`);
  } catch (error) {
    console.error('Generic scraping failed:', error);
  }
}

testScrapers().then(() => {
  console.log('\nScraper tests complete');
  process.exit(0);
}).catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});