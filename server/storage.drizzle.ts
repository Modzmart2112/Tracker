// Simplified storage implementation for production deployment
// This provides mock data and basic structure without complex imports

export interface User {
  id: string;
  username: string;
  email: string;
  createdAt: Date;
}

export interface Competitor {
  id: string;
  name: string;
  website: string;
  status: string;
  isUs: boolean;
  createdAt: Date;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
}

export interface ProductType {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
}

export interface BrandAlias {
  id: string;
  brandId: string;
  alias: string;
  createdAt: Date;
}

export interface Page {
  id: string;
  url: string;
  title: string;
  content: string;
  createdAt: Date;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  categoryId: string;
  brandId: string;
  competitorId: string;
  productTypeId: string;
  brand: string;
  model: string | null;
  canonicalSku: string | null;
  imageUrl: string | null;
  firstSeenAt: Date;
  lastSeenAt: Date;
  createdAt: Date;
}

export interface ProductSpec {
  id: string;
  productId: string;
  name: string;
  value: string;
  createdAt: Date;
}

export interface PriceSnapshot {
  id: string;
  productId: string;
  price: number;
  currency: string;
  timestamp: Date;
  createdAt: Date;
}

export interface PriceBand {
  id: string;
  productId: string;
  minPrice: number;
  maxPrice: number;
  currency: string;
  createdAt: Date;
}

export interface Task {
  id: string;
  name: string;
  description?: string;
  status: string;
  error?: string;
  pageId?: string;
  startedAt?: Date;
  finishedAt?: Date;
  createdAt: Date;
}

export interface Brand {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
}

export interface CatalogProduct {
  id: string;
  name: string;
  description?: string;
  categoryId: string;
  brandId: string;
  notes?: string;
  targetPrice?: number;
  suppliers?: string[];
  createdAt: Date;
}

export interface CompetitorListing {
  id: string;
  competitorId: string;
  productId: string;
  url: string;
  price: number;
  currency: string;
  listingSku: string;
  titleOverride?: string;
  brandOverride?: string;
  mainImageUrl?: string;
  active: boolean;
  firstSeenAt: Date;
  lastSeenAt: Date;
  createdAt: Date;
}

export interface ListingSnapshot {
  id: string;
  listingId: string;
  price: number;
  currency: string;
  timestamp: Date;
  inStock: boolean;
  promoText?: string;
  hasGiveaway: boolean;
  httpStatus: number;
  scrapedAt: Date;
  createdAt: Date;
}

export interface ListingImage {
  id: string;
  listingId: string;
  url: string;
  altText?: string;
  position: number;
  createdAt: Date;
}

// Mock tables for now - these will be replaced with actual Drizzle tables
export const users = { id: '1', username: 'admin', email: 'admin@example.com', createdAt: new Date() } as User;
export const competitors = { id: '1', name: 'Example Competitor', website: 'https://example.com', status: 'active', isUs: false, createdAt: new Date() } as Competitor;
export const categories = { id: '1', name: 'Example Category', description: 'Example description', createdAt: new Date() } as Category;
export const productTypes = { id: '1', name: 'Example Product Type', description: 'Example description', createdAt: new Date() } as ProductType;
export const brandAliases = { id: '1', brandId: '1', alias: 'Example Alias', createdAt: new Date() } as BrandAlias;
export const pages = { id: '1', url: 'https://example.com', title: 'Example Page', content: 'Example content', createdAt: new Date() } as Page;
export const products = { id: '1', name: 'Example Product', description: 'Example description', categoryId: '1', brandId: '1', competitorId: '1', productTypeId: '1', brand: 'Example Brand', model: 'Example Model', canonicalSku: 'SKU123', imageUrl: 'https://example.com/image.jpg', firstSeenAt: new Date(), lastSeenAt: new Date(), createdAt: new Date() } as Product;
export const productSpecs = { id: '1', productId: '1', name: 'Example Spec', value: 'Example value', createdAt: new Date() } as ProductSpec;
export const priceSnapshots = { id: '1', productId: '1', price: 100, currency: 'USD', timestamp: new Date(), createdAt: new Date() } as PriceSnapshot;
export const priceBands = { id: '1', productId: '1', minPrice: 90, maxPrice: 110, currency: 'USD', createdAt: new Date() } as PriceBand;
export const tasks = { id: '1', name: 'Example Task', description: 'Example description', status: 'pending', createdAt: new Date() } as Task;
export const brands = { id: '1', name: 'Example Brand', description: 'Example description', createdAt: new Date() } as Brand;
export const catalogProducts = { id: '1', name: 'Example Catalog Product', description: 'Example description', categoryId: '1', brandId: '1', notes: 'Example notes', targetPrice: 100, suppliers: ['Supplier 1'], createdAt: new Date() } as CatalogProduct;
export const competitorListings = { id: '1', competitorId: '1', productId: '1', url: 'https://example.com', price: 100, currency: 'USD', listingSku: 'LSKU123', active: true, firstSeenAt: new Date(), lastSeenAt: new Date(), createdAt: new Date() } as CompetitorListing;
export const listingSnapshots = { id: '1', listingId: '1', price: 100, currency: 'USD', timestamp: new Date(), inStock: true, hasGiveaway: false, httpStatus: 200, scrapedAt: new Date(), createdAt: new Date() } as ListingSnapshot;
export const listingImages = { id: '1', listingId: '1', url: 'https://example.com/image.jpg', altText: 'Example image', position: 1, createdAt: new Date() } as ListingImage;
export const unifiedProducts = { id: '1', name: 'Example Unified Product', description: 'Example description', categoryId: '1', brandId: '1', createdAt: new Date() } as Product;
export const unifiedCompetitorLinks = { id: '1', competitorId: '1', productId: '1', url: 'https://example.com', createdAt: new Date() } as CompetitorListing;

// New tables for scraping workflow system
export const scrapingWorkflows = { id: '1', name: 'Example Workflow', description: 'Example workflow', categoryUrl: 'https://example.com', competitorName: 'Example', isActive: true, createdAt: new Date(), updatedAt: new Date(), userId: '1' };
export const scrapingElements = { id: '1', workflowId: '1', name: 'Title', selector: 'h1', selectorType: 'css', attribute: 'textContent', isRequired: true, order: 1, createdAt: new Date() };
export const productUrls = { id: '1', workflowId: '1', url: 'https://example.com/product', isActive: true, lastScraped: new Date(), createdAt: new Date(), updatedAt: new Date() };
export const scrapingResults = { id: '1', workflowId: '1', productUrlId: '1', scrapedData: { title: 'Example Product' }, scrapedAt: new Date(), status: 'success', errorMessage: null };
export const scheduledTasks = { id: '1', workflowId: '1', cronExpression: '0 0 * * *', isActive: true, lastRun: new Date(), nextRun: new Date(), createdAt: new Date(), updatedAt: new Date() };

// Define storage interface locally
export interface IStorage {
  // Basic methods that need to be implemented
  getUser(id: string): Promise<User | undefined>;
  createUser(user: any): Promise<User>;
  getCompetitors(): Promise<Competitor[]>;
  createCompetitor(competitor: any): Promise<Competitor>;
  // Add other methods as needed
}

export class DrizzleStorage implements IStorage {
  private db: any; // Using any for now since we're using mock data

  constructor() {
    // Initialize with mock data for now
    this.db = {
      select: () => ({ from: () => [] }),
      insert: () => ({ values: () => ({ returning: () => [] }) }),
      update: () => ({ set: () => ({ where: () => ({ returning: () => [] }) }) }),
      delete: () => ({ where: () => ({ returning: () => [] }) }),
      execute: () => ({ rows: [] })
    };
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    return users;
  }

  async createUser(user: any): Promise<User> {
    return { ...users, ...user, id: Date.now().toString() };
  }

  // Competitors
  async getCompetitors(): Promise<Competitor[]> {
    return [competitors];
  }

  async createCompetitor(competitor: any): Promise<Competitor> {
    return { ...competitors, ...competitor, id: Date.now().toString() };
  }

  // Placeholder implementations for other methods
  async getCategories(): Promise<Category[]> { return [categories]; }
  async getProductTypes(): Promise<ProductType[]> { return [productTypes]; }
  async getBrandAliases(): Promise<BrandAlias[]> { return [brandAliases]; }
  async getPages(): Promise<Page[]> { return [pages]; }
  async getProducts(): Promise<Product[]> { return [products]; }
  async getProductSpecs(): Promise<ProductSpec[]> { return [productSpecs]; }
  async getPriceSnapshots(): Promise<PriceSnapshot[]> { return [priceSnapshots]; }
  async getPriceBands(): Promise<PriceBand[]> { return [priceBands]; }
  async getTasks(): Promise<Task[]> { return [tasks]; }
  async getBrands(): Promise<Brand[]> { return [brands]; }
  async getCatalogProducts(): Promise<CatalogProduct[]> { return [catalogProducts]; }
  async getCompetitorListings(): Promise<CompetitorListing[]> { return [competitorListings]; }
  async getListingSnapshots(): Promise<ListingSnapshot[]> { return [listingSnapshots]; }
  async getListingImages(): Promise<ListingImage[]> { return [listingImages]; }
  async getUnifiedProducts(): Promise<any[]> { return [unifiedProducts]; }
  async getUnifiedProduct(): Promise<any> { return unifiedProducts; }
  async createUnifiedProduct(): Promise<any> { return unifiedProducts; }
  async deleteUnifiedProduct(): Promise<void> { }
  async updateUnifiedProduct(): Promise<any> { return unifiedProducts; }
  async addCompetitorLink(): Promise<any> { return { id: '1', status: 'pending' }; }
  async getCompetitorCarousels(): Promise<any[]> { return []; }
  async createCompetitorCarousel(carousel: any): Promise<any> { return { id: '1', ...carousel }; }
  async updateCompetitorCarousels(): Promise<void> { }
  async getBrandCoverageMatrix(): Promise<any> { return { brands: [], competitors: [] }; }
  async getKPIMetrics(): Promise<any> { return { brandCoverage: '0/0', priceUndercuts: 0, priceChanges24h: 0, activeTasks: 0 }; }
}

// Export a mock database instance for now
export const db = {
  select: () => ({ from: () => [] }),
  insert: () => ({ values: () => ({ returning: () => [] }) }),
  update: () => ({ set: () => ({ where: () => ({ returning: () => [] }) }) }),
  delete: () => ({ where: () => ({ returning: () => [] }) }),
  execute: () => ({ rows: [] })
};