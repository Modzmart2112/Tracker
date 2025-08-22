import { 
  type User, type InsertUser, type Competitor, type InsertCompetitor,
  type Category, type InsertCategory, type ProductType, type InsertProductType,
  type BrandAlias, type InsertBrandAlias, type Page, type InsertPage,
  type Product, type InsertProduct, type ProductSpec, type InsertProductSpec,
  type PriceSnapshot, type InsertPriceSnapshot, type PriceBand, type InsertPriceBand,
  type Task, type InsertTask,
  type Brand, type InsertBrand, type CatalogProduct, type InsertCatalogProduct,
  type CompetitorListing, type InsertCompetitorListing, type ListingSnapshot,
  type InsertListingSnapshot, type ListingImage, type InsertListingImage
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

  // Brands
  createBrand(brand: InsertBrand): Promise<Brand>;
  getBrands(): Promise<Brand[]>;
  getBrand(id: string): Promise<Brand | undefined>;

  // Catalog Products
  createCatalogProduct(product: InsertCatalogProduct): Promise<CatalogProduct>;
  listCatalogProducts(): Promise<CatalogProduct[]>;
  getCatalogProductById(id: string): Promise<CatalogProduct | undefined>;

  // Competitor Listings
  createCompetitorListing(listing: InsertCompetitorListing): Promise<CompetitorListing>;
  listListingsByProduct(productId: string): Promise<CompetitorListing[]>;
  updateListing(id: string, updates: Partial<CompetitorListing>): Promise<CompetitorListing | undefined>;

  // Listing Snapshots
  createListingSnapshot(snapshot: InsertListingSnapshot): Promise<ListingSnapshot>;
  getLatestListingSnapshotsByProduct(productId: string): Promise<ListingSnapshot[]>;
  getListingHistory(listingId: string, limit?: number): Promise<ListingSnapshot[]>;

  // Listing Images
  createListingImage(image: InsertListingImage): Promise<ListingImage>;
  getListingImages(listingId: string): Promise<ListingImage[]>;

  // Unified Products
  getUnifiedProducts(): Promise<any[]>;
  getUnifiedProduct(id: string): Promise<any>;
  createUnifiedProduct(product: {
    sku: string;
    name: string;
    ourPrice?: number;
    brand?: string;
    category?: string;
  }): Promise<any>;
  deleteUnifiedProduct(id: string): Promise<void>;
  addCompetitorLink(productId: string, url: string): Promise<any>;

  // Additional methods needed for price monitoring
  getCompetitorListings(): Promise<CompetitorListing[]>;
  updateCatalogProduct(id: string, updates: Partial<CatalogProduct>): Promise<CatalogProduct | undefined>;
  getListingSnapshots(listingId: string): Promise<ListingSnapshot[]>;


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
  
  // New catalog entities
  private brands: Map<string, Brand> = new Map();
  private catalogProducts: Map<string, CatalogProduct> = new Map();
  private competitorListings: Map<string, CompetitorListing> = new Map();
  private listingSnapshots: Map<string, ListingSnapshot> = new Map();
  private listingImages: Map<string, ListingImage> = new Map();

  // Unified products
  private unifiedProducts: Map<string, any> = new Map();
  private unifiedCompetitorLinks: Map<string, any[]> = new Map();

  constructor() {
    // No seed data - clean start
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
    const newCompetitor: Competitor = { 
      ...competitor, 
      id,
      status: competitor.status ?? "active",
      isUs: competitor.isUs ?? false
    };
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
    // Return empty array - no real price change data available yet
    return [];
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
    
    const brands = Array.from(new Set(products.map(p => p.brand)));
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
      brandCoverage: totalBrands > 0 ? `${sydneyBrands}/${totalBrands}` : "0/0",
      priceUndercuts: 0,
      priceChanges: 0,
      stockChanges: 0
    };
  }

  // Brand methods
  async createBrand(brand: InsertBrand): Promise<Brand> {
    const id = randomUUID();
    const newBrand: Brand = { ...brand, id };
    this.brands.set(id, newBrand);
    return newBrand;
  }

  async getBrands(): Promise<Brand[]> {
    return Array.from(this.brands.values());
  }

  async getBrand(id: string): Promise<Brand | undefined> {
    return this.brands.get(id);
  }

  // Catalog Product methods
  async createCatalogProduct(product: InsertCatalogProduct): Promise<CatalogProduct> {
    const id = randomUUID();
    const newProduct: CatalogProduct = { 
      ...product, 
      id,
      notes: product.notes || null,
      targetPrice: product.targetPrice || null,
      createdAt: new Date()
    };
    this.catalogProducts.set(id, newProduct);
    return newProduct;
  }

  async listCatalogProducts(): Promise<CatalogProduct[]> {
    return Array.from(this.catalogProducts.values());
  }

  async getCatalogProductById(id: string): Promise<CatalogProduct | undefined> {
    return this.catalogProducts.get(id);
  }

  // Competitor Listing methods
  async createCompetitorListing(listing: InsertCompetitorListing): Promise<CompetitorListing> {
    const id = randomUUID();
    const now = new Date();
    const newListing: CompetitorListing = { 
      ...listing, 
      id,
      listingSku: listing.listingSku || null,
      titleOverride: listing.titleOverride || null,
      brandOverride: listing.brandOverride || null,
      mainImageUrl: listing.mainImageUrl || null,
      active: listing.active ?? true,
      firstSeenAt: now,
      lastSeenAt: now
    };
    this.competitorListings.set(id, newListing);
    return newListing;
  }

  async listListingsByProduct(productId: string): Promise<CompetitorListing[]> {
    return Array.from(this.competitorListings.values()).filter(l => l.productId === productId);
  }

  async updateListing(id: string, updates: Partial<CompetitorListing>): Promise<CompetitorListing | undefined> {
    const listing = this.competitorListings.get(id);
    if (!listing) return undefined;
    
    const updated = { ...listing, ...updates, lastSeenAt: new Date() };
    this.competitorListings.set(id, updated);
    return updated;
  }

  // Listing Snapshot methods
  async createListingSnapshot(snapshot: InsertListingSnapshot): Promise<ListingSnapshot> {
    const id = randomUUID();
    const newSnapshot: ListingSnapshot = { 
      ...snapshot, 
      id,
      price: snapshot.price || null,
      currency: snapshot.currency || "AUD",
      inStock: snapshot.inStock ?? null,
      promoText: snapshot.promoText || null,
      hasGiveaway: snapshot.hasGiveaway ?? false,
      httpStatus: snapshot.httpStatus || null,
      scrapedAt: new Date()
    };
    this.listingSnapshots.set(id, newSnapshot);
    return newSnapshot;
  }

  async getLatestListingSnapshotsByProduct(productId: string): Promise<ListingSnapshot[]> {
    const listings = await this.listListingsByProduct(productId);
    const latestSnapshots: ListingSnapshot[] = [];
    
    for (const listing of listings) {
      const snapshots = Array.from(this.listingSnapshots.values())
        .filter(s => s.listingId === listing.id)
        .sort((a, b) => b.scrapedAt.getTime() - a.scrapedAt.getTime());
      
      if (snapshots.length > 0) {
        latestSnapshots.push(snapshots[0]);
      }
    }
    
    return latestSnapshots;
  }

  async getListingHistory(listingId: string, limit: number = 30): Promise<ListingSnapshot[]> {
    return Array.from(this.listingSnapshots.values())
      .filter(s => s.listingId === listingId)
      .sort((a, b) => b.scrapedAt.getTime() - a.scrapedAt.getTime())
      .slice(0, limit);
  }

  // Listing Image methods
  async createListingImage(image: InsertListingImage): Promise<ListingImage> {
    const id = randomUUID();
    const newImage: ListingImage = { 
      ...image, 
      id,
      position: image.position || 0
    };
    this.listingImages.set(id, newImage);
    return newImage;
  }

  async getListingImages(listingId: string): Promise<ListingImage[]> {
    return Array.from(this.listingImages.values())
      .filter(i => i.listingId === listingId)
      .sort((a, b) => a.position - b.position);
  }

  // Unified Products implementation
  async getUnifiedProducts(): Promise<any[]> {
    const products = Array.from(this.unifiedProducts.values());
    return products.map(product => {
      const links = this.unifiedCompetitorLinks.get(product.id) || [];
      return { ...product, competitorLinks: links };
    });
  }

  async getUnifiedProduct(id: string): Promise<any> {
    const product = this.unifiedProducts.get(id);
    if (!product) return undefined;
    const links = this.unifiedCompetitorLinks.get(id) || [];
    return { ...product, competitorLinks: links };
  }

  async createUnifiedProduct(product: {
    sku: string;
    name: string;
    ourPrice?: number;
    brand?: string;
    category?: string;
  }): Promise<any> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const newProduct = {
      ...product,
      id,
      brand: product.brand || 'Unknown',
      category: product.category || 'Uncategorized',
      createdAt: now,
      updatedAt: now
    };
    this.unifiedProducts.set(id, newProduct);
    this.unifiedCompetitorLinks.set(id, []);
    return newProduct;
  }

  async deleteUnifiedProduct(id: string): Promise<void> {
    this.unifiedProducts.delete(id);
    this.unifiedCompetitorLinks.delete(id);
  }

  async addCompetitorLink(productId: string, url: string): Promise<any> {
    const links = this.unifiedCompetitorLinks.get(productId) || [];
    const id = randomUUID();
    const newLink = {
      id,
      productId,
      url,
      competitorName: new URL(url).hostname.replace("www.", "").split(".")[0],
      status: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    links.push(newLink);
    this.unifiedCompetitorLinks.set(productId, links);
    return newLink;
  }

  // Additional methods needed for price monitoring
  async getCompetitorListings(): Promise<CompetitorListing[]> {
    return Array.from(this.competitorListings.values());
  }

  async updateCatalogProduct(id: string, updates: Partial<CatalogProduct>): Promise<CatalogProduct | undefined> {
    const product = this.catalogProducts.get(id);
    if (!product) return undefined;
    
    const updated = { ...product, ...updates };
    this.catalogProducts.set(id, updated);
    return updated;
  }

  async getListingSnapshots(listingId: string): Promise<ListingSnapshot[]> {
    return Array.from(this.listingSnapshots.values())
      .filter(s => s.listingId === listingId)
      .sort((a, b) => b.scrapedAt.getTime() - a.scrapedAt.getTime());
  }
}

export const storage = new MemStorage();
