import { eq, and, sql, desc, gte } from "drizzle-orm";
import { getDb } from "./db";
import { 
  type User, type InsertUser, type Competitor, type InsertCompetitor,
  type Category, type InsertCategory, type ProductType, type InsertProductType,
  type BrandAlias, type InsertBrandAlias, type Page, type InsertPage,
  type Product, type InsertProduct, type ProductSpec, type InsertProductSpec,
  type PriceSnapshot, type InsertPriceSnapshot, type PriceBand, type InsertPriceBand,
  type Task, type InsertTask,
  users, competitors, categories, productTypes, brandAliases, pages,
  products, productSpecs, priceSnapshots, priceBands, tasks
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
}