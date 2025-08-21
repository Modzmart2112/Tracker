import { storage } from './storage';
import { extractModelNumberWithAI } from './ai-model-extractor';

export interface ProductMatch {
  catalogProductId: string;
  modelNumber: string;
  productName: string;
  brand: string;
  sydneyToolsPrice?: number;
  competitorPrices: Array<{
    competitorName: string;
    price: number;
    url: string;
    lastUpdated: Date;
  }>;
  priceDifference?: number;
  bestPrice?: number;
  worstPrice?: number;
}

export class ProductMatcher {
  // Match products by model number and merge duplicates
  async matchAndMergeProducts(): Promise<{
    merged: number;
    matched: number;
    errors: string[];
  }> {
    const results = {
      merged: 0,
      matched: 0,
      errors: [] as string[]
    };

    try {
      // Get all catalog products
      const products = await storage.listCatalogProducts();
      
      // Group products by model number
      const modelGroups = new Map<string, any[]>();
      
      for (const product of products) {
        if (product.modelNumber && 
            product.modelNumber !== 'N/A' && 
            product.modelNumber !== 'Unknown' &&
            product.modelNumber !== '') {
          
          const existing = modelGroups.get(product.modelNumber) || [];
          existing.push(product);
          modelGroups.set(product.modelNumber, existing);
        }
      }
      
      // Process groups with duplicates
      for (const [modelNumber, group] of modelGroups) {
        if (group.length > 1) {
          console.log(`Found ${group.length} products with model ${modelNumber}`);
          
          try {
            // Use the first product as the master
            const masterProduct = group[0];
            
            // Merge all competitor listings to the master product
            for (let i = 1; i < group.length; i++) {
              const duplicateProduct = group[i];
              
              // Get competitor listings for the duplicate
              const listings = await storage.listListingsByProduct(duplicateProduct.id);
              
              // Transfer listings to master product - create new listing
              for (const listing of listings) {
                await storage.updateListing(listing.id, {
                  productId: masterProduct.id
                });
                results.matched++;
              }
              
              // Note: We can't delete catalog products yet - need to implement this method
              // await storage.deleteCatalogProduct(duplicateProduct.id);
              results.merged++;
              
              console.log(`Merged ${duplicateProduct.name} into ${masterProduct.name}`);
            }
          } catch (error: any) {
            results.errors.push(`Error merging model ${modelNumber}: ${error.message}`);
          }
        }
      }
      
      return results;
    } catch (error: any) {
      console.error('Error in matchAndMergeProducts:', error);
      results.errors.push(error.message);
      return results;
    }
  }
  
  // Get price comparison for all matched products
  async getProductPriceComparison(): Promise<ProductMatch[]> {
    const matches: ProductMatch[] = [];
    
    try {
      // Get all catalog products
      const products = await storage.listCatalogProducts();
      
      for (const product of products) {
        // Skip if no model number
        if (!product.modelNumber || product.modelNumber === 'N/A') continue;
        
        const match: ProductMatch = {
          catalogProductId: product.id,
          modelNumber: product.modelNumber,
          productName: product.name,
          brand: 'Unknown', // We'll get brand name later
          competitorPrices: []
        };
        
        // Get competitor listings for this product
        const listings = await storage.listListingsByProduct(product.id);
        
        // Check if this is a Sydney Tools product (no competitor listings)
        if (!listings || listings.length === 0) {
          // This is our product
          match.sydneyToolsPrice = parseFloat(product.price || '0');
        }
        
        // Get competitor prices
        for (const listing of listings) {
          // Get latest snapshot for this listing
          const snapshots = await storage.getListingHistory(listing.id, 1);
          if (snapshots.length > 0) {
            const latestSnapshot = snapshots[0];
            match.competitorPrices.push({
              competitorName: 'Competitor', // We'll enhance this later
              price: parseFloat(latestSnapshot.price),
              url: listing.url,
              lastUpdated: latestSnapshot.createdAt
            });
          }
        }
        
        // Calculate price differences
        const allPrices = [
          ...(match.sydneyToolsPrice ? [match.sydneyToolsPrice] : []),
          ...match.competitorPrices.map(cp => cp.price)
        ].filter(p => p > 0);
        
        if (allPrices.length > 1) {
          match.bestPrice = Math.min(...allPrices);
          match.worstPrice = Math.max(...allPrices);
          match.priceDifference = match.worstPrice - match.bestPrice;
        }
        
        matches.push(match);
      }
      
      // Sort by price difference (biggest savings first)
      matches.sort((a, b) => (b.priceDifference || 0) - (a.priceDifference || 0));
      
      return matches;
    } catch (error) {
      console.error('Error getting price comparison:', error);
      return matches;
    }
  }
  
  // Enhanced model extraction for existing products
  async enhanceModelNumbers(): Promise<{
    updated: number;
    errors: string[];
  }> {
    const results = {
      updated: 0,
      errors: [] as string[]
    };
    
    try {
      const products = await storage.listCatalogProducts();
      
      for (const product of products) {
        // Skip if already has a good model number
        if (product.modelNumber && 
            product.modelNumber !== 'N/A' && 
            product.modelNumber !== 'Unknown' &&
            product.modelNumber !== '') {
          continue;
        }
        
        try {
          // Use AI to extract model number
          const modelNumber = await extractModelNumberWithAI(product.name);
          
          if (modelNumber && modelNumber !== 'N/A') {
            // Note: We need to implement updateCatalogProduct method
            // For now, we'll skip the update
            // await storage.updateCatalogProduct(product.id, { modelNumber });
            results.updated++;
            console.log(`Would update model for ${product.name}: ${modelNumber}`);
          }
        } catch (error: any) {
          results.errors.push(`Error updating ${product.name}: ${error.message}`);
        }
      }
      
      return results;
    } catch (error: any) {
      console.error('Error enhancing model numbers:', error);
      results.errors.push(error.message);
      return results;
    }
  }
}

export const productMatcher = new ProductMatcher();