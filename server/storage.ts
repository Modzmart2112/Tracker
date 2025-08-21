import { 
  type User, type InsertUser, type Competitor, type InsertCompetitor,
  type Category, type InsertCategory, type ProductType, type InsertProductType,
  type BrandAlias, type InsertBrandAlias, type Page, type InsertPage,
  type Product, type InsertProduct, type ProductSpec, type InsertProductSpec,
  type PriceSnapshot, type InsertPriceSnapshot, type PriceBand, type InsertPriceBand,
  type Task, type InsertTask
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Competitors
  getCompetitors(): Promise<Competitor[]>;
  getCompetitor(id: string): Promise<Competitor | undefined>;
  createCompetitor(competitor: InsertCompetitor): Promise<Competitor>;
  updateCompetitor(id: string, updates: Partial<InsertCompetitor>): Promise<Competitor | undefined>;
  deleteCompetitor(id: string): Promise<boolean>;

  // Categories
  getCategories(): Promise<Category[]>;
  getCategory(id: string): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;

  // Product Types
  getProductTypes(): Promise<ProductType[]>;
  getProductTypesByCategory(categoryId: string): Promise<ProductType[]>;
  getProductType(id: string): Promise<ProductType | undefined>;
  createProductType(productType: InsertProductType): Promise<ProductType>;

  // Brand Aliases
  getBrandAliases(): Promise<BrandAlias[]>;
  createBrandAlias(brandAlias: InsertBrandAlias): Promise<BrandAlias>;

  // Pages
  getPages(): Promise<Page[]>;
  getPagesByCompetitor(competitorId: string): Promise<Page[]>;
  getPage(id: string): Promise<Page | undefined>;
  createPage(page: InsertPage): Promise<Page>;
  updatePage(id: string, updates: Partial<Page>): Promise<Page | undefined>;
  deletePage(id: string): Promise<boolean>;

  // Products
  getProducts(filters?: { competitorId?: string; productTypeId?: string; brand?: string }): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, updates: Partial<Product>): Promise<Product | undefined>;

  // Product Specs
  getProductSpecs(productId: string): Promise<ProductSpec[]>;
  createProductSpec(spec: InsertProductSpec): Promise<ProductSpec>;

  // Price Snapshots
  getPriceSnapshots(productId: string): Promise<PriceSnapshot[]>;
  getLatestPriceSnapshots(): Promise<PriceSnapshot[]>;
  createPriceSnapshot(snapshot: InsertPriceSnapshot): Promise<PriceSnapshot>;
  getRecentPriceChanges(hours: number): Promise<any[]>;

  // Price Bands
  getPriceBands(productTypeId?: string, brand?: string): Promise<PriceBand[]>;
  createPriceBand(band: InsertPriceBand): Promise<PriceBand>;

  // Tasks
  getTasks(): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, updates: Partial<Task>): Promise<Task | undefined>;

  // Analytics
  getBrandCoverageMatrix(productTypeId: string): Promise<any>;
  getKPIMetrics(): Promise<any>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private competitors: Map<string, Competitor> = new Map();
  private categories: Map<string, Category> = new Map();
  private productTypes: Map<string, ProductType> = new Map();
  private brandAliases: Map<string, BrandAlias> = new Map();
  private pages: Map<string, Page> = new Map();
  private products: Map<string, Product> = new Map();
  private productSpecs: Map<string, ProductSpec> = new Map();
  private priceSnapshots: Map<string, PriceSnapshot> = new Map();
  private priceBands: Map<string, PriceBand> = new Map();
  private tasks: Map<string, Task> = new Map();

  constructor() {
    this.seedData();
  }

  private seedData() {
    // Seed competitors
    const sydneyTools = this.createCompetitorSync({ name: "Sydney Tools", siteDomain: "sydneytools.com.au", status: "active", isUs: true });
    const bunnings = this.createCompetitorSync({ name: "Bunnings", siteDomain: "bunnings.com.au", status: "active", isUs: false });
    const totalTools = this.createCompetitorSync({ name: "Total Tools", siteDomain: "totaltools.com.au", status: "active", isUs: false });
    const toolKitDepot = this.createCompetitorSync({ name: "Tool Kit Depot", siteDomain: "toolkitdepot.com.au", status: "active", isUs: false });
    const tradeTools = this.createCompetitorSync({ name: "TradeTools", siteDomain: "tradetools.com.au", status: "active", isUs: false });

    // Seed categories
    const automotive = this.createCategorySync({ name: "Automotive", slug: "automotive" });

    // Seed product types
    const jumpStarters = this.createProductTypeSync({ categoryId: automotive.id, name: "Jump Starters", slug: "jump-starters" });

    // Seed some sample products
    this.createProductSync({
      competitorId: totalTools.id,
      brand: "NOCO",
      model: "GB40",
      title: "NOCO GB40 1000A Jump Starter",
      productTypeId: jumpStarters.id,
      imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=100&h=100",
      productUrl: "https://totaltools.com.au/noco-gb40"
    });

    this.createProductSync({
      competitorId: sydneyTools.id,
      brand: "DEWALT",
      model: "DXAEJ14",
      title: "DEWALT DXAEJ14 Jump Starter",
      productTypeId: jumpStarters.id,
      imageUrl: "https://images.unsplash.com/photo-1581092160562-40aa08e78837?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=100&h=100",
      productUrl: "https://sydneytools.com.au/dewalt-dxaej14"
    });

    this.createProductSync({
      competitorId: toolKitDepot.id,
      brand: "Projecta",
      model: "IS2500",
      title: "Projecta IS2500 Intelli-Start",
      productTypeId: jumpStarters.id,
      imageUrl: "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=100&h=100",
      productUrl: "https://toolkitdepot.com.au/projecta-is2500"
    });

    this.createProductSync({
      competitorId: tradeTools.id,
      brand: "Milwaukee",
      model: "M18 FUEL",
      title: "Milwaukee M18 FUEL Jump Starter",
      productTypeId: jumpStarters.id,
      imageUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=100&h=100",
      productUrl: "https://tradetools.com.au/milwaukee-m18-fuel"
    });
  }

  private createCompetitorSync(competitor: InsertCompetitor): Competitor {
    const id = randomUUID();
    const newCompetitor: Competitor = { 
      ...competitor, 
      id,
      status: competitor.status || "active",
      isUs: competitor.isUs || false
    };
    this.competitors.set(id, newCompetitor);
    return newCompetitor;
  }

  private createCategorySync(category: InsertCategory): Category {
    const id = randomUUID();
    const newCategory: Category = { ...category, id };
    this.categories.set(id, newCategory);
    return newCategory;
  }

  private createProductTypeSync(productType: InsertProductType): ProductType {
    const id = randomUUID();
    const newProductType: ProductType = { ...productType, id };
    this.productTypes.set(id, newProductType);
    return newProductType;
  }

  private createProductSync(product: InsertProduct): Product {
    const id = randomUUID();
    const now = new Date();
    const newProduct: Product = { 
      ...product, 
      id, 
      firstSeenAt: now, 
      lastSeenAt: now,
      model: product.model || null,
      canonicalSku: product.canonicalSku || null,
      imageUrl: product.imageUrl || null
    };
    this.products.set(id, newProduct);
    return newProduct;
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Competitor methods
  async getCompetitors(): Promise<Competitor[]> {
    return Array.from(this.competitors.values());
  }

  async getCompetitor(id: string): Promise<Competitor | undefined> {
    return this.competitors.get(id);
  }

  async createCompetitor(competitor: InsertCompetitor): Promise<Competitor> {
    const id = randomUUID();
    const newCompetitor: Competitor = { ...competitor, id };
    this.competitors.set(id, newCompetitor);
    return newCompetitor;
  }

  async updateCompetitor(id: string, updates: Partial<InsertCompetitor>): Promise<Competitor | undefined> {
    const competitor = this.competitors.get(id);
    if (!competitor) return undefined;
    
    const updated = { ...competitor, ...updates };
    this.competitors.set(id, updated);
    return updated;
  }

  async deleteCompetitor(id: string): Promise<boolean> {
    return this.competitors.delete(id);
  }

  // Category methods
  async getCategories(): Promise<Category[]> {
    return Array.from(this.categories.values());
  }

  async getCategory(id: string): Promise<Category | undefined> {
    return this.categories.get(id);
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const id = randomUUID();
    const newCategory: Category = { ...category, id };
    this.categories.set(id, newCategory);
    return newCategory;
  }

  // Product Type methods
  async getProductTypes(): Promise<ProductType[]> {
    return Array.from(this.productTypes.values());
  }

  async getProductTypesByCategory(categoryId: string): Promise<ProductType[]> {
    return Array.from(this.productTypes.values()).filter(pt => pt.categoryId === categoryId);
  }

  async getProductType(id: string): Promise<ProductType | undefined> {
    return this.productTypes.get(id);
  }

  async createProductType(productType: InsertProductType): Promise<ProductType> {
    const id = randomUUID();
    const newProductType: ProductType = { ...productType, id };
    this.productTypes.set(id, newProductType);
    return newProductType;
  }

  // Brand Alias methods
  async getBrandAliases(): Promise<BrandAlias[]> {
    return Array.from(this.brandAliases.values());
  }

  async createBrandAlias(brandAlias: InsertBrandAlias): Promise<BrandAlias> {
    const id = randomUUID();
    const newBrandAlias: BrandAlias = { ...brandAlias, id };
    this.brandAliases.set(id, newBrandAlias);
    return newBrandAlias;
  }

  // Page methods
  async getPages(): Promise<Page[]> {
    return Array.from(this.pages.values());
  }

  async getPagesByCompetitor(competitorId: string): Promise<Page[]> {
    return Array.from(this.pages.values()).filter(page => page.competitorId === competitorId);
  }

  async getPage(id: string): Promise<Page | undefined> {
    return this.pages.get(id);
  }

  async createPage(page: InsertPage): Promise<Page> {
    const id = randomUUID();
    const newPage: Page = { 
      ...page, 
      id, 
      active: page.active !== undefined ? page.active : true,
      lastHttpStatus: null, 
      lastScrapedAt: null 
    };
    this.pages.set(id, newPage);
    return newPage;
  }

  async updatePage(id: string, updates: Partial<Page>): Promise<Page | undefined> {
    const page = this.pages.get(id);
    if (!page) return undefined;
    
    const updated = { ...page, ...updates };
    this.pages.set(id, updated);
    return updated;
  }

  async deletePage(id: string): Promise<boolean> {
    return this.pages.delete(id);
  }

  // Product methods
  async getProducts(filters?: { competitorId?: string; productTypeId?: string; brand?: string }): Promise<Product[]> {
    let products = Array.from(this.products.values());
    
    if (filters?.competitorId) {
      products = products.filter(p => p.competitorId === filters.competitorId);
    }
    if (filters?.productTypeId) {
      products = products.filter(p => p.productTypeId === filters.productTypeId);
    }
    if (filters?.brand) {
      products = products.filter(p => p.brand.toLowerCase().includes(filters.brand!.toLowerCase()));
    }
    
    return products;
  }

  async getProduct(id: string): Promise<Product | undefined> {
    return this.products.get(id);
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const id = randomUUID();
    const now = new Date();
    const newProduct: Product = { 
      ...product, 
      id, 
      model: product.model || null,
      canonicalSku: product.canonicalSku || null,
      imageUrl: product.imageUrl || null,
      firstSeenAt: now, 
      lastSeenAt: now 
    };
    this.products.set(id, newProduct);
    return newProduct;
  }

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product | undefined> {
    const product = this.products.get(id);
    if (!product) return undefined;
    
    const updated = { ...product, ...updates, lastSeenAt: new Date() };
    this.products.set(id, updated);
    return updated;
  }

  // Product Spec methods
  async getProductSpecs(productId: string): Promise<ProductSpec[]> {
    return Array.from(this.productSpecs.values()).filter(spec => spec.productId === productId);
  }

  async createProductSpec(spec: InsertProductSpec): Promise<ProductSpec> {
    const id = randomUUID();
    const newSpec: ProductSpec = { ...spec, id };
    this.productSpecs.set(id, newSpec);
    return newSpec;
  }

  // Price Snapshot methods
  async getPriceSnapshots(productId: string): Promise<PriceSnapshot[]> {
    return Array.from(this.priceSnapshots.values())
      .filter(snapshot => snapshot.productId === productId)
      .sort((a, b) => b.scrapedAt.getTime() - a.scrapedAt.getTime());
  }

  async getLatestPriceSnapshots(): Promise<PriceSnapshot[]> {
    return Array.from(this.priceSnapshots.values());
  }

  async createPriceSnapshot(snapshot: InsertPriceSnapshot): Promise<PriceSnapshot> {
    const id = randomUUID();
    const newSnapshot: PriceSnapshot = { 
      ...snapshot, 
      id, 
      currency: snapshot.currency || "AUD",
      promoText: snapshot.promoText || null,
      scrapedAt: new Date() 
    };
    this.priceSnapshots.set(id, newSnapshot);
    return newSnapshot;
  }

  async getRecentPriceChanges(hours: number): Promise<any[]> {
    // Mock recent changes for demonstration
    return [
      {
        id: "1",
        productTitle: "NOCO GB40 1000A Jump Starter",
        competitorName: "Total Tools",
        changeType: "price_drop",
        oldValue: "149",
        newValue: "139",
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
      },
      {
        id: "2", 
        productTitle: "DEWALT DXAEJ14 Jump Starter",
        competitorName: "Bunnings",
        changeType: "stock_change",
        oldValue: "out_of_stock",
        newValue: "in_stock",
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000) // 4 hours ago
      }
    ];
  }

  // Price Band methods
  async getPriceBands(productTypeId?: string, brand?: string): Promise<PriceBand[]> {
    let bands = Array.from(this.priceBands.values());
    
    if (productTypeId) {
      bands = bands.filter(band => band.productTypeId === productTypeId);
    }
    if (brand) {
      bands = bands.filter(band => band.brand.toLowerCase().includes(brand.toLowerCase()));
    }
    
    return bands;
  }

  async createPriceBand(band: InsertPriceBand): Promise<PriceBand> {
    const id = randomUUID();
    const newBand: PriceBand = { 
      ...band, 
      id,
      entryPrice: band.entryPrice || null,
      proPrice: band.proPrice || null,
      medianPrice: band.medianPrice || null,
      minPrice: band.minPrice || null,
      maxPrice: band.maxPrice || null,
      productCount: band.productCount || 0,
      updatedAt: new Date() 
    };
    this.priceBands.set(id, newBand);
    return newBand;
  }

  // Task methods
  async getTasks(): Promise<Task[]> {
    return Array.from(this.tasks.values());
  }

  async createTask(task: InsertTask): Promise<Task> {
    const id = randomUUID();
    const newTask: Task = { 
      ...task, 
      id,
      status: task.status || "pending",
      error: task.error || null,
      pageId: task.pageId || null,
      startedAt: null, 
      finishedAt: null 
    };
    this.tasks.set(id, newTask);
    return newTask;
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<Task | undefined> {
    const task = this.tasks.get(id);
    if (!task) return undefined;
    
    const updated = { ...task, ...updates };
    this.tasks.set(id, updated);
    return updated;
  }

  // Analytics methods
  async getBrandCoverageMatrix(productTypeId: string): Promise<any> {
    const competitors = await this.getCompetitors();
    const products = await this.getProducts({ productTypeId });
    
    const brands = [...new Set(products.map(p => p.brand))];
    const matrix = brands.map(brand => {
      const row: any = { brand };
      competitors.forEach(competitor => {
        const count = products.filter(p => p.brand === brand && p.competitorId === competitor.id).length;
        row[competitor.name] = count;
      });
      return row;
    });
    
    return { brands, competitors, matrix };
  }

  async getKPIMetrics(): Promise<any> {
    const products = await this.getProducts();
    const totalBrands = new Set(products.map(p => p.brand)).size;
    const sydneyToolsProducts = products.filter(p => {
      const competitor = Array.from(this.competitors.values()).find(c => c.id === p.competitorId);
      return competitor?.isUs;
    });
    const sydneyBrands = new Set(sydneyToolsProducts.map(p => p.brand)).size;
    
    return {
      brandCoverage: `${sydneyBrands}/${totalBrands}`,
      priceUndercuts: 23,
      priceChanges: 16,
      stockChanges: 7
    };
  }
}

export const storage = new MemStorage();
