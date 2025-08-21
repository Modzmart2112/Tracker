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
    const result = await this.db.delete(competitors).where(eq(competitors.id, id)).returning();
    return result.length > 0;
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
    const products = await this.db.select().from(catalogProducts);
    const productsWithLinks = await Promise.all(
      products.map(async (product) => {
        const listings = await this.db
          .select()
          .from(competitorListings)
          .where(eq(competitorListings.productId, product.id));
        
        const competitorLinks = listings.map(listing => ({
          id: listing.id,
          url: listing.url,
          competitorName: listing.competitorId,
          extractedTitle: listing.title || undefined,
          extractedPrice: listing.priceNumeric || undefined,
          status: listing.isActive ? "success" : "pending",
          lastScraped: listing.lastSeenAt?.toISOString()
        }));
        
        return {
          id: product.id,
          sku: product.id.slice(0, 8).toUpperCase(),
          name: product.title,
          ourPrice: 0,
          competitorLinks,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      })
    );
    return productsWithLinks;
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
      extractedTitle: listing.title || undefined,
      extractedPrice: listing.priceNumeric || undefined,
      status: listing.isActive ? "success" : "pending",
      lastScraped: listing.lastSeenAt?.toISOString()
    }));
    
    return {
      id: product.id,
      sku: product.id.slice(0, 8).toUpperCase(),
      name: product.title,
      ourPrice: 0,
      competitorLinks,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  async createUnifiedProduct(product: any): Promise<any> {
    const catalogProduct = await this.createCatalogProduct({
      title: product.name,
      brandId: null,
      productTypeId: null
    });
    
    return {
      id: catalogProduct.id,
      sku: product.sku || catalogProduct.id.slice(0, 8).toUpperCase(),
      name: catalogProduct.title,
      ourPrice: product.ourPrice || 0,
      competitorLinks: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  async deleteUnifiedProduct(id: string): Promise<void> {
    // Delete associated listings first
    await this.db.delete(competitorListings)
      .where(eq(competitorListings.productId, id));
    
    // Then delete the product
    await this.db.delete(catalogProducts)
      .where(eq(catalogProducts.id, id));
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
      title: null,
      priceNumeric: null,
      priceText: null,
      isInStock: true,
      isActive: true
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