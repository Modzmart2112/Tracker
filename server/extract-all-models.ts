import { DrizzleStorage } from './storage.drizzle';
import { extractModelNumberWithAI } from './ai-model-extractor';

// Script to extract model numbers for all products
export async function extractAllModelNumbers() {
  const storage = new DrizzleStorage();
  
  console.log('Starting model number extraction for all products...');
  
  // Get all products
  const products = await storage.listCatalogProducts();
  
  let extracted = 0;
  let skipped = 0;
  let failed = 0;
  
  for (const product of products) {
    // Skip if already has a good model number
    if (product.modelNumber && 
        product.modelNumber !== 'N/A' && 
        product.modelNumber !== 'Unknown' &&
        product.modelNumber !== '') {
      skipped++;
      console.log(`✓ Skipping ${product.name} (already has: ${product.modelNumber})`);
      continue;
    }
    
    try {
      // Extract model number
      const modelNumber = await extractModelNumberWithAI(product.name);
      
      if (modelNumber && modelNumber !== 'N/A') {
        // Update the product
        await storage.updateProductModelNumber(product.id, modelNumber);
        extracted++;
        console.log(`✅ Extracted for ${product.name}: ${modelNumber}`);
      } else {
        console.log(`⚠️ No model found for ${product.name}`);
      }
      
      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error: any) {
      failed++;
      console.error(`❌ Error processing ${product.name}: ${error.message}`);
    }
  }
  
  console.log('\n=== Extraction Complete ===');
  console.log(`✅ Extracted: ${extracted}`);
  console.log(`⏭️ Skipped (already had): ${skipped}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total products: ${products.length}`);
  
  return { extracted, skipped, failed, total: products.length };
}

// Run if called directly
extractAllModelNumbers()
  .then(results => {
    console.log('Done!', results);
    process.exit(0);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });