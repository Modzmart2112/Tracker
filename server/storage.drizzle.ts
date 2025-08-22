import { eq, and, sql, desc, gte } from "drizzle-orm";
import { getDb } from "./db";
import { 
  type User, type InsertUser, type Competitor, type InsertCompetitor,
  type Category, type InsertCategory, type ProductType, type InsertProductType,
  type BrandAlias, type InsertBrandAlias, type Page, type InsertPage,
  type Product, type InsertProduct, type ProductSpec, type InsertProductSpec,
  type PriceSnapshot, type InsertPriceSnapshot, type PriceBand, type InsertPriceBand,
  type Task, type InsertTask,
  type Brand, type InsertBrand, type CatalogProduct, type InsertCatalogProduct,
  type CompetitorListing, type InsertCompetitorListing, type ListingSnapshot,
  type InsertListingSnapshot, type ListingImage, type InsertListingImage,
  users, competitors, categories, productTypes, brandAliases, pages,
  products, productSpecs, priceSnapshots, priceBands, tasks,
  brands, catalogProducts, competitorListings, listingSnapshots, listingImages,
  unifiedProducts, unifiedCompetitorLinks
} from "@shared/schema";
import type { IStorage } from "./storage";

export class DrizzleStorage implements IStorage {
  private db: ReturnType<typeof getDb>;

  constructor() {
    this.db = getDb();
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await this.db.insert(users).values(user).returning();
    return result[0];
  }

  // Competitors
  async getCompetitors(): Promise<Competitor[]> {
    return await this.db.select().from(competitors);
  }

  async getCompetitor(id: string): Promise<Competitor | undefined> {
    const result = await this.db.select().from(competitors).where(eq(competitors.id, id));
    return result[0];
  }

  async createCompetitor(competitor: InsertCompetitor): Promise<Competitor> {
    const result = await this.db.insert(competitors).values(competitor).returning();
    return result[0];
  }

  async updateCompetitor(id: string, updates: Partial<InsertCompetitor>): Promise<Competitor | undefined> {
    const result = await this.db.update(competitors)
      .set(updates)
      .where(eq(competitors.id, id))
      .returning();
    return result[0];
  }

  async deleteCompetitor(id: string): Promise<boolean> {
    try {
      // First delete related competitor listings
      await this.db.delete(competitorListings).where(eq(competitorListings.competitorId, id));
      
      // Then delete the competitor
      const result = await this.db.delete(competitors).where(eq(competitors.id, id)).returning();
      return result.length > 0;
    } catch (error) {
      console.error('Error deleting competitor:', error);
      return false;
    }
  }

  // Categories
  async getCategories(): Promise<Category[]> {
    return await this.db.select().from(categories);
  }

  async getCategory(id: string): Promise<Category | undefined> {
    const result = await this.db.select().from(categories).where(eq(categories.id, id));
    return result[0];
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const result = await this.db.insert(categories).values(category).returning();
    return result[0];
  }

  // Product Types
  async getProductTypes(): Promise<ProductType[]> {
    return await this.db.select().from(productTypes);
  }

  async getProductTypesByCategory(categoryId: string): Promise<ProductType[]> {
    return await this.db.select().from(productTypes)
      .where(eq(productTypes.categoryId, categoryId));
  }

  async getProductType(id: string): Promise<ProductType | undefined> {
    const result = await this.db.select().from(productTypes).where(eq(productTypes.id, id));
    return result[0];
  }

  async createProductType(productType: InsertProductType): Promise<ProductType> {
    const result = await this.db.insert(productTypes).values(productType).returning();
    return result[0];
  }

  // Brand Aliases
  async getBrandAliases(): Promise<BrandAlias[]> {
    return await this.db.select().from(brandAliases);
  }

  async createBrandAlias(brandAlias: InsertBrandAlias): Promise<BrandAlias> {
    const result = await this.db.insert(brandAliases).values(brandAlias).returning();
    return result[0];
  }

  // Pages
  async getPages(): Promise<Page[]> {
    return await this.db.select().from(pages);
  }

  async getPagesByCompetitor(competitorId: string): Promise<Page[]> {
    return await this.db.select().from(pages)
      .where(eq(pages.competitorId, competitorId));
  }

  async getPage(id: string): Promise<Page | undefined> {
    const result = await this.db.select().from(pages).where(eq(pages.id, id));
    return result[0];
  }

  async createPage(page: InsertPage): Promise<Page> {
    const result = await this.db.insert(pages).values(page).returning();
    return result[0];
  }

  async updatePage(id: string, updates: Partial<Page>): Promise<Page | undefined> {
    const result = await this.db.update(pages)
      .set(updates)
      .where(eq(pages.id, id))
      .returning();
    return result[0];
  }

  async deletePage(id: string): Promise<boolean> {
    const result = await this.db.delete(pages).where(eq(pages.id, id)).returning();
    return result.length > 0;
  }

  // Products
  async getProducts(filters?: { competitorId?: string; productTypeId?: string; brand?: string }): Promise<Product[]> {
    let query = this.db.select().from(products);
    
    if (filters?.competitorId) {
      query = query.where(eq(products.competitorId, filters.competitorId));
    }
    
    if (filters?.productTypeId) {
      query = query.where(eq(products.productTypeId, filters.productTypeId));
    }
    
    if (filters?.brand) {
      query = query.where(eq(products.brand, filters.brand));
    }
    
    return await query;
  }

  async getProduct(id: string): Promise<Product | undefined> {
    const result = await this.db.select().from(products).where(eq(products.id, id));
    return result[0];
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const result = await this.db.insert(products).values(product).returning();
    return result[0];
  }

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product | undefined> {
    const result = await this.db.update(products)
      .set(updates)
      .where(eq(products.id, id))
      .returning();
    return result[0];
  }

  // Product Specs
  async getProductSpecs(productId: string): Promise<ProductSpec[]> {
    return await this.db.select().from(productSpecs)
      .where(eq(productSpecs.productId, productId));
  }

  async createProductSpec(spec: InsertProductSpec): Promise<ProductSpec> {
    const result = await this.db.insert(productSpecs).values(spec).returning();
    return result[0];
  }

  // Price Snapshots
  async getPriceSnapshots(productId: string): Promise<PriceSnapshot[]> {
    return await this.db.select().from(priceSnapshots)
      .where(eq(priceSnapshots.productId, productId))
      .orderBy(desc(priceSnapshots.scrapedAt));
  }

  async getLatestPriceSnapshots(): Promise<PriceSnapshot[]> {
    // Get the latest price snapshot for each product
    const subquery = sql`
      SELECT DISTINCT ON (product_id) *
      FROM price_snapshots
      ORDER BY product_id, scraped_at DESC
    `;
    
    const result = await this.db.execute(subquery);
    return result.rows as PriceSnapshot[];
  }

  async createPriceSnapshot(snapshot: InsertPriceSnapshot): Promise<PriceSnapshot> {
    const result = await this.db.insert(priceSnapshots).values(snapshot).returning();
    return result[0];
  }

  async getRecentPriceChanges(hours: number): Promise<any[]> {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    const result = await this.db
      .select({
        productId: priceSnapshots.productId,
        productTitle: products.title,
        competitorName: competitors.name,
        oldPrice: sql<number>`LAG(${priceSnapshots.priceDecimal}) OVER (PARTITION BY ${priceSnapshots.productId} ORDER BY ${priceSnapshots.scrapedAt})`,
        newPrice: priceSnapshots.priceDecimal,
        changeType: sql<string>`
          CASE 
            WHEN LAG(${priceSnapshots.priceDecimal}) OVER (PARTITION BY ${priceSnapshots.productId} ORDER BY ${priceSnapshots.scrapedAt}) > ${priceSnapshots.priceDecimal} THEN 'price_drop'
            WHEN LAG(${priceSnapshots.priceDecimal}) OVER (PARTITION BY ${priceSnapshots.productId} ORDER BY ${priceSnapshots.scrapedAt}) < ${priceSnapshots.priceDecimal} THEN 'price_increase'
            ELSE 'no_change'
          END
        `,
        timestamp: priceSnapshots.scrapedAt,
      })
      .from(priceSnapshots)
      .innerJoin(products, eq(products.id, priceSnapshots.productId))
      .innerJoin(competitors, eq(competitors.id, products.competitorId))
      .where(gte(priceSnapshots.scrapedAt, cutoffTime));
    
    return result.filter(r => r.changeType !== 'no_change' && r.oldPrice !== null);
  }

  // Price Bands
  async getPriceBands(productTypeId?: string, brand?: string): Promise<PriceBand[]> {
    let query = this.db.select().from(priceBands);
    
    if (productTypeId) {
      query = query.where(eq(priceBands.productTypeId, productTypeId));
    }
    
    if (brand) {
      query = query.where(eq(priceBands.brand, brand));
    }
    
    return await query;
  }

  async createPriceBand(band: InsertPriceBand): Promise<PriceBand> {
    const result = await this.db.insert(priceBands).values(band).returning();
    return result[0];
  }

  // Tasks
  async getTasks(): Promise<Task[]> {
    return await this.db.select().from(tasks)
      .orderBy(desc(tasks.startedAt));
  }

  async createTask(task: InsertTask): Promise<Task> {
    const result = await this.db.insert(tasks).values(task).returning();
    return result[0];
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<Task | undefined> {
    const result = await this.db.update(tasks)
      .set(updates)
      .where(eq(tasks.id, id))
      .returning();
    return result[0];
  }

  // Additional methods needed for price monitoring
  async getCompetitorListings(): Promise<CompetitorListing[]> {
    return await this.db.select().from(competitorListings);
  }

  async updateCatalogProduct(id: string, updates: Partial<CatalogProduct>): Promise<CatalogProduct | undefined> {
    const result = await this.db.update(catalogProducts)
      .set(updates)
      .where(eq(catalogProducts.id, id))
      .returning();
    return result[0];
  }

  async getListingSnapshots(listingId: string): Promise<ListingSnapshot[]> {
    return await this.db.select().from(listingSnapshots)
      .where(eq(listingSnapshots.listingId, listingId))
      .orderBy(desc(listingSnapshots.scrapedAt));
  }

  // Carousel monitoring
  async getCompetitorCarousels(competitorId: string): Promise<any[]> {
    const { competitorCarousels } = await import("@shared/schema");
    return await this.db.select().from(competitorCarousels)
      .where(eq(competitorCarousels.competitorId, competitorId))
      .orderBy(competitorCarousels.position);
  }

  async createCompetitorCarousel(carousel: any): Promise<any> {
    const { competitorCarousels } = await import("@shared/schema");
    const [result] = await this.db.insert(competitorCarousels).values(carousel).returning();
    return result;
  }

  async updateCompetitorCarousels(competitorId: string, carousels: any[]): Promise<void> {
    const { competitorCarousels } = await import("@shared/schema");
    
    // Delete existing carousels for this competitor
    await this.db.delete(competitorCarousels)
      .where(eq(competitorCarousels.competitorId, competitorId));
    
    // Insert new carousels
    if (carousels.length > 0) {
      await this.db.insert(competitorCarousels).values(carousels);
    }
  }

  // Analytics
  async getBrandCoverageMatrix(productTypeId: string): Promise<any> {
    const productsData = await this.db
      .select({
        brand: products.brand,
        competitorId: products.competitorId,
        competitorName: competitors.name,
        count: sql<number>`COUNT(*)`,
      })
      .from(products)
      .innerJoin(competitors, eq(competitors.id, products.competitorId))
      .where(eq(products.productTypeId, productTypeId))
      .groupBy(products.brand, products.competitorId, competitors.name);
    
    // Transform into matrix format
    const brands = [...new Set(productsData.map(p => p.brand))];
    const competitorMap = new Map<string, Map<string, number>>();
    
    productsData.forEach(row => {
      if (!competitorMap.has(row.competitorName)) {
        competitorMap.set(row.competitorName, new Map());
      }
      competitorMap.get(row.competitorName)!.set(row.brand, row.count);
    });
    
    return {
      brands,
      competitors: Array.from(competitorMap.entries()).map(([name, brandCounts]) => ({
        name,
        coverage: brands.map(brand => brandCounts.get(brand) || 0),
      })),
    };
  }

  async getKPIMetrics(): Promise<any> {
    const [totalProducts] = await this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(products);
    
    const [totalCompetitors] = await this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(competitors);
    
    const [activeTasks] = await this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(tasks)
      .where(sql`${tasks.status} IN ('pending', 'running')`);
    
    const recentChanges = await this.getRecentPriceChanges(24);
    const priceDrops = recentChanges.filter(c => c.changeType === 'price_drop').length;
    
    return {
      brandCoverage: `${totalProducts.count || 0}/${totalCompetitors.count || 0}`,
      priceUndercuts: priceDrops,
      priceChanges24h: recentChanges.length,
      activeTasks: activeTasks.count || 0,
    };
  }

  // Brand methods
  async createBrand(brand: InsertBrand): Promise<Brand> {
    const result = await this.db.insert(brands).values(brand).returning();
    return result[0];
  }

  async getBrands(): Promise<Brand[]> {
    return await this.db.select().from(brands);
  }

  async getBrand(id: string): Promise<Brand | undefined> {
    const result = await this.db.select().from(brands).where(eq(brands.id, id));
    return result[0];
  }

  // Catalog Product methods
  async createCatalogProduct(product: InsertCatalogProduct): Promise<CatalogProduct> {
    const result = await this.db.insert(catalogProducts).values(product).returning();
    return result[0];
  }

  async listCatalogProducts(): Promise<CatalogProduct[]> {
    return await this.db.select().from(catalogProducts);
  }

  async getCatalogProductById(id: string): Promise<CatalogProduct | undefined> {
    const result = await this.db.select().from(catalogProducts).where(eq(catalogProducts.id, id));
    return result[0];
  }

  async updateProductModelNumber(id: string, modelNumber: string): Promise<void> {
    await this.db
      .update(catalogProducts)
      .set({
        modelNumber: modelNumber,
        updatedAt: new Date()
      })
      .where(eq(catalogProducts.id, id));
  }

  async updateCatalogProductSuppliers(id: string, suppliers: string[]): Promise<void> {
    await this.db
      .update(catalogProducts)
      .set({
        suppliers: suppliers
      })
      .where(eq(catalogProducts.id, id));
  }

  // Competitor Listing methods
  async createCompetitorListing(listing: InsertCompetitorListing): Promise<CompetitorListing> {
    const result = await this.db.insert(competitorListings).values(listing).returning();
    return result[0];
  }

  async listListingsByProduct(productId: string): Promise<CompetitorListing[]> {
    return await this.db.select().from(competitorListings)
      .where(eq(competitorListings.productId, productId));
  }

  async updateListing(id: string, updates: Partial<CompetitorListing>): Promise<CompetitorListing | undefined> {
    const result = await this.db.update(competitorListings)
      .set({ ...updates, lastSeenAt: new Date() })
      .where(eq(competitorListings.id, id))
      .returning();
    return result[0];
  }

  // Listing Snapshot methods
  async createListingSnapshot(snapshot: InsertListingSnapshot): Promise<ListingSnapshot> {
    const result = await this.db.insert(listingSnapshots).values(snapshot).returning();
    return result[0];
  }

  async getLatestListingSnapshotsByProduct(productId: string): Promise<ListingSnapshot[]> {
    const listings = await this.listListingsByProduct(productId);
    const latestSnapshots: ListingSnapshot[] = [];
    
    for (const listing of listings) {
      const result = await this.db
        .select()
        .from(listingSnapshots)
        .where(eq(listingSnapshots.listingId, listing.id))
        .orderBy(desc(listingSnapshots.scrapedAt))
        .limit(1);
      
      if (result.length > 0) {
        latestSnapshots.push(result[0]);
      }
    }
    
    return latestSnapshots;
  }

  async getListingHistory(listingId: string, limit: number = 30): Promise<ListingSnapshot[]> {
    return await this.db
      .select()
      .from(listingSnapshots)
      .where(eq(listingSnapshots.listingId, listingId))
      .orderBy(desc(listingSnapshots.scrapedAt))
      .limit(limit);
  }

  // Listing Image methods
  async createListingImage(image: InsertListingImage): Promise<ListingImage> {
    const result = await this.db.insert(listingImages).values(image).returning();
    return result[0];
  }

  async getListingImages(listingId: string): Promise<ListingImage[]> {
    return await this.db
      .select()
      .from(listingImages)
      .where(eq(listingImages.listingId, listingId))
      .orderBy(listingImages.position);
  }

  // Unified Products implementation (using catalog products)
  async getUnifiedProducts(): Promise<any[]> {
    // Single optimized query with all necessary joins
    const allData = await this.db
      .select({
        productId: catalogProducts.id,
        productSku: catalogProducts.ourSku,
        productModelNumber: catalogProducts.modelNumber,
        productName: catalogProducts.name,
        productPrice: catalogProducts.price,
        productTargetPrice: catalogProducts.targetPrice,
        productImageUrl: catalogProducts.imageUrl,
        productPageUrl: catalogProducts.productPageUrl,
        productSuppliers: catalogProducts.suppliers,
        productCreatedAt: catalogProducts.createdAt,
        brandName: brands.name,
        categoryName: categories.name,
        listingId: competitorListings.id,
        listingUrl: competitorListings.url,
        listingTitleOverride: competitorListings.titleOverride,
        listingActive: competitorListings.active,
        listingLastSeenAt: competitorListings.lastSeenAt,
        competitorName: competitors.name,
        competitorId: competitorListings.competitorId
      })
      .from(catalogProducts)
      .leftJoin(brands, eq(catalogProducts.brandId, brands.id))
      .leftJoin(categories, eq(catalogProducts.categoryId, categories.id))
      .leftJoin(competitorListings, eq(competitorListings.productId, catalogProducts.id))
      .leftJoin(competitors, eq(competitorListings.competitorId, competitors.id));
    
    // Fetch all price snapshots - we'll filter for latest in JavaScript
    const listingPrices = await this.db
      .select({
        listingId: listingSnapshots.listingId,
        price: listingSnapshots.price,
        currency: listingSnapshots.currency,
        inStock: listingSnapshots.inStock,
        scrapedAt: listingSnapshots.scrapedAt
      })
      .from(listingSnapshots)
      .orderBy(desc(listingSnapshots.scrapedAt));
    
    // Create a map of listing prices (keep only the latest for each listing)
    const priceMap = new Map();
    for (const snapshot of listingPrices) {
      const existing = priceMap.get(snapshot.listingId);
      if (!existing || snapshot.scrapedAt > existing.scrapedAt) {
        priceMap.set(snapshot.listingId, {
          price: snapshot.price,
          currency: snapshot.currency,
          inStock: snapshot.inStock,
          scrapedAt: snapshot.scrapedAt
        });
      }
    }
    
    // Group by product ID to combine competitor links
    const productsMap = new Map();
    
    for (const row of allData) {
      if (!productsMap.has(row.productId)) {
        // Convert decimal strings to numbers properly
        const currentPrice = row.productPrice ? parseFloat(row.productPrice) : null;
        const originalPrice = row.productTargetPrice ? parseFloat(row.productTargetPrice) : null;
        
        // Show original price only if it's higher than current price (indicating a sale)
        const isOnSale = originalPrice && currentPrice && originalPrice > currentPrice;
        
        productsMap.set(row.productId, {
          id: row.productId,
          sku: row.productSku || row.productId.slice(0, 8).toUpperCase(),
          modelNumber: row.productModelNumber || 'N/A',
          name: row.productName || 'Unnamed Product',
          ourPrice: currentPrice,
          price: currentPrice,
          originalPrice: isOnSale ? originalPrice : null,
          image: row.productImageUrl || null,
          brand: row.brandName || 'Unknown',
          category: row.categoryName || 'Uncategorized',
          productPageUrl: row.productPageUrl || null,
          suppliers: row.productSuppliers || [],
          competitorLinks: [],
          createdAt: row.productCreatedAt?.toISOString() || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
      
      // Add competitor link if it exists
      if (row.listingId) {
        const priceData = priceMap.get(row.listingId);
        productsMap.get(row.productId).competitorLinks.push({
          id: row.listingId,
          url: row.listingUrl,
          competitorName: row.competitorName || row.competitorId,
          extractedTitle: row.listingTitleOverride || undefined,
          extractedPrice: priceData?.price || undefined,
          status: row.listingActive ? "success" : "pending",
          lastScraped: row.listingLastSeenAt?.toISOString()
        });
        
        // Also add as competitorListings for price comparison display
        if (!productsMap.get(row.productId).competitorListings) {
          productsMap.get(row.productId).competitorListings = [];
        }
        
        if (priceData?.price) {
          productsMap.get(row.productId).competitorListings.push({
            id: row.listingId,
            url: row.listingUrl,
            competitorName: row.competitorName || row.competitorId,
            latestSnapshot: {
              price: priceData.price,
              currency: priceData.currency || 'AUD',
              inStock: priceData.inStock,
              scrapedAt: priceData.scrapedAt
            }
          });
        }
      }
    }
    
    return Array.from(productsMap.values());
  }

  async getUnifiedProduct(id: string): Promise<any> {
    const product = await this.getCatalogProductById(id);
    if (!product) return undefined;
    
    const listings = await this.db
      .select()
      .from(competitorListings)
      .where(eq(competitorListings.productId, id));
    
    const competitorLinks = listings.map(listing => ({
      id: listing.id,
      url: listing.url,
      competitorName: listing.competitorId,
      extractedTitle: listing.titleOverride || undefined,
      extractedPrice: undefined, // Price is stored in listing snapshots
      status: listing.active ? "success" : "pending",
      lastScraped: listing.lastSeenAt?.toISOString()
    }));
    
    return {
      id: product.id,
      sku: product.id.slice(0, 8).toUpperCase(),
      modelNumber: product.modelNumber || 'N/A',
      name: product.name || 'Unnamed Product',
      ourPrice: 0,
      brand: product.brandId || 'Unknown',
      category: product.categoryId || 'Uncategorized',
      productPageUrl: product.productPageUrl || null,
      suppliers: product.suppliers || [],
      competitorLinks,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  async createUnifiedProduct(product: any): Promise<any> {
    // Debug logging
    console.log('Creating unified product with data:', JSON.stringify(product));
    
    // Ensure we have a name
    const productName = product.name || product.title || 'Unnamed Product';
    console.log('Product name resolved to:', productName);
    
    // Save the product with price, image, brand, category, modelNumber and productPageUrl
    const result = await this.db.insert(catalogProducts).values({
      name: productName,
      brandId: product.brandId || null,
      categoryId: product.categoryId || null,
      productTypeId: null,
      ourSku: product.sku || null,
      modelNumber: product.modelNumber || null,
      quality: null,
      targetPrice: product.targetPrice ? product.targetPrice.toString() : null,
      price: product.price ? product.price.toString() : null,
      imageUrl: product.image || null,
      productPageUrl: product.productPageUrl || null,
      suppliers: product.suppliers || []
    }).returning();
    
    const catalogProduct = result[0];
    
    return {
      id: catalogProduct.id,
      sku: product.sku || catalogProduct.id.slice(0, 8).toUpperCase(),
      modelNumber: product.modelNumber || 'N/A',
      name: catalogProduct.name || productName,
      ourPrice: product.ourPrice || product.price || 0,
      price: product.price || 0,
      image: product.image || null,
      brand: product.brand || 'Unknown',
      category: product.category || 'Uncategorized',
      productPageUrl: product.productPageUrl || null,
      suppliers: catalogProduct.suppliers || [],
      competitorLinks: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  async deleteUnifiedProduct(id: string): Promise<void> {
    try {
      // First get all listing IDs for this product
      const listings = await this.db.select({ id: competitorListings.id })
        .from(competitorListings)
        .where(eq(competitorListings.productId, id));
      
      // Delete listing snapshots and images for each listing
      for (const listing of listings) {
        await this.db.delete(listingSnapshots)
          .where(eq(listingSnapshots.listingId, listing.id));
        
        await this.db.delete(listingImages)
          .where(eq(listingImages.listingId, listing.id));
      }
      
      // Delete associated listings
      await this.db.delete(competitorListings)
        .where(eq(competitorListings.productId, id));
      
      // Finally delete the product
      const result = await this.db.delete(catalogProducts)
        .where(eq(catalogProducts.id, id));
      
      console.log(`Deleted product ${id} and all associated data`);
    } catch (error) {
      console.error(`Error deleting product ${id}:`, error);
      throw error;
    }
  }

  async updateUnifiedProduct(id: string, updates: Partial<{
    sku: string;
    name: string;
    ourPrice?: number;
    brand?: string;
    category?: string;
  }>): Promise<any> {
    try {
      // Prepare update data
      const updateData: any = {};
      
      if (updates.sku !== undefined) updateData.sku = updates.sku;
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.ourPrice !== undefined) updateData.targetPrice = updates.ourPrice.toString();
      if (updates.brand !== undefined) updateData.brand = updates.brand;
      if (updates.category !== undefined) updateData.category = updates.category;
      
      updateData.updatedAt = new Date();
      
      // Update the product
      const result = await this.db.update(catalogProducts)
        .set(updateData)
        .where(eq(catalogProducts.id, id))
        .returning();
      
      if (result.length === 0) {
        return undefined;
      }
      
      const updatedProduct = result[0];
      
      // Get competitor links
      const listings = await this.listListingsByProduct(id);
      
      return {
        id: updatedProduct.id,
        sku: updatedProduct.sku || updatedProduct.id.slice(0, 8).toUpperCase(),
        modelNumber: updatedProduct.modelNumber || 'N/A',
        name: updatedProduct.name,
        ourPrice: updatedProduct.targetPrice ? parseFloat(updatedProduct.targetPrice) : 0,
        price: updatedProduct.price ? parseFloat(updatedProduct.price) : 0,
        image: updatedProduct.imageUrl || null,
        brand: updatedProduct.brand || 'Unknown',
        category: updatedProduct.category || 'Uncategorized',
        productPageUrl: updatedProduct.productPageUrl || null,
        suppliers: updatedProduct.suppliers || [],
        competitorLinks: listings.map(l => ({
          id: l.id,
          productId: l.productId,
          url: l.url,
          competitorName: l.competitorId,
          status: l.active ? "active" : "inactive",
          createdAt: l.createdAt?.toISOString() || new Date().toISOString(),
          updatedAt: l.updatedAt?.toISOString() || new Date().toISOString()
        })),
        createdAt: updatedProduct.createdAt?.toISOString() || new Date().toISOString(),
        updatedAt: updatedProduct.updatedAt?.toISOString() || new Date().toISOString()
      };
    } catch (error) {
      console.error(`Error updating product ${id}:`, error);
      throw error;
    }
  }

  async addCompetitorLink(productId: string, url: string): Promise<any> {
    const competitorName = new URL(url).hostname.replace("www.", "").split(".")[0];
    
    // Check if competitor exists, if not create it
    let competitor = await this.db
      .select()
      .from(competitors)
      .where(eq(competitors.siteDomain, new URL(url).hostname))
      .limit(1);
    
    let competitorId: string;
    if (competitor.length === 0) {
      const newCompetitor = await this.createCompetitor({
        name: competitorName,
        siteDomain: new URL(url).hostname,
        status: "active",
        isUs: false
      });
      competitorId = newCompetitor.id;
    } else {
      competitorId = competitor[0].id;
    }
    
    const listing = await this.createCompetitorListing({
      productId,
      competitorId,
      url,
      titleOverride: null,
      active: true
    });
    
    return {
      id: listing.id,
      productId,
      url,
      competitorName,
      status: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }
}