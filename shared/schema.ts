import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const pageTypeEnum = pgEnum("page_type", ["PLP", "PDP"]);
export const taskStatusEnum = pgEnum("task_status", ["pending", "running", "completed", "failed"]);
export const runReasonEnum = pgEnum("run_reason", ["manual", "schedule"]);
export const qualityTierEnum = pgEnum("quality_tier", ["entry", "mid", "pro"]);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const competitors = pgTable("competitors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  siteDomain: text("site_domain").notNull(),
  status: text("status").notNull().default("active"),
  isUs: boolean("is_us").notNull().default(false),
});

export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
});

export const productTypes = pgTable("product_types", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  categoryId: varchar("category_id").references(() => categories.id).notNull(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
});

export const brandAliases = pgTable("brand_aliases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  brandCanonical: text("brand_canonical").notNull(),
  alias: text("alias").notNull(),
});

export const pages = pgTable("pages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  competitorId: varchar("competitor_id").references(() => competitors.id).notNull(),
  categoryId: varchar("category_id").references(() => categories.id).notNull(),
  productTypeId: varchar("product_type_id").references(() => productTypes.id).notNull(),
  url: text("url").notNull(),
  pageType: pageTypeEnum("page_type").notNull(),
  active: boolean("active").notNull().default(true),
  lastHttpStatus: integer("last_http_status"),
  lastScrapedAt: timestamp("last_scraped_at"),
});

export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  competitorId: varchar("competitor_id").references(() => competitors.id).notNull(),
  brand: text("brand").notNull(),
  model: text("model"),
  title: text("title").notNull(),
  canonicalSku: text("canonical_sku"),
  productTypeId: varchar("product_type_id").references(() => productTypes.id).notNull(),
  imageUrl: text("image_url"),
  productUrl: text("product_url").notNull(),
  firstSeenAt: timestamp("first_seen_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  lastSeenAt: timestamp("last_seen_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const productSpecs = pgTable("product_specs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").references(() => products.id).notNull(),
  key: text("key").notNull(),
  value: text("value").notNull(),
});

export const priceSnapshots = pgTable("price_snapshots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").references(() => products.id).notNull(),
  priceDecimal: decimal("price_decimal", { precision: 10, scale: 2 }).notNull(),
  originalPriceDecimal: decimal("original_price_decimal", { precision: 10, scale: 2 }),
  currency: text("currency").notNull().default("AUD"),
  inStock: boolean("in_stock").notNull(),
  promoText: text("promo_text"),
  onSale: boolean("on_sale").notNull().default(false),
  scrapedAt: timestamp("scraped_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const priceBands = pgTable("price_bands", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  competitorId: varchar("competitor_id").references(() => competitors.id).notNull(),
  productTypeId: varchar("product_type_id").references(() => productTypes.id).notNull(),
  brand: text("brand").notNull(),
  entryPrice: decimal("entry_price", { precision: 10, scale: 2 }),
  proPrice: decimal("pro_price", { precision: 10, scale: 2 }),
  medianPrice: decimal("median_price", { precision: 10, scale: 2 }),
  minPrice: decimal("min_price", { precision: 10, scale: 2 }),
  maxPrice: decimal("max_price", { precision: 10, scale: 2 }),
  productCount: integer("product_count").notNull().default(0),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  pageId: varchar("page_id").references(() => pages.id),
  status: taskStatusEnum("status").notNull().default("pending"),
  runReason: runReasonEnum("run_reason").notNull(),
  startedAt: timestamp("started_at"),
  finishedAt: timestamp("finished_at"),
  error: text("error"),
});

// New catalog and listing tables
export const brands = pgTable("brands", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
});

export const catalogProducts = pgTable("catalog_products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  brandId: varchar("brand_id").references(() => brands.id),
  categoryId: varchar("category_id").references(() => categories.id),
  productTypeId: varchar("product_type_id").references(() => productTypes.id),
  ourSku: text("our_sku"),
  quality: qualityTierEnum("quality"),
  notes: text("notes"),
  targetPrice: decimal("target_price", { precision: 12, scale: 2 }),
  price: decimal("price", { precision: 10, scale: 2 }),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const competitorListings = pgTable("competitor_listings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").references(() => catalogProducts.id).notNull(),
  competitorId: varchar("competitor_id").references(() => competitors.id).notNull(),
  url: text("url").notNull(),
  listingSku: text("listing_sku"),
  titleOverride: text("title_override"),
  brandOverride: text("brand_override"),
  mainImageUrl: text("main_image_url"),
  active: boolean("active").notNull().default(true),
  firstSeenAt: timestamp("first_seen_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  lastSeenAt: timestamp("last_seen_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  uniqueProductCompetitor: sql`UNIQUE (product_id, competitor_id)`,
}));

// Simplified products table for unified product management
export const unifiedProducts = pgTable("unified_products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sku: text("sku").notNull().unique(),
  name: text("name").notNull(),
  ourPrice: decimal("our_price", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Competitor links for unified products
export const unifiedCompetitorLinks = pgTable("unified_competitor_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").notNull().references(() => unifiedProducts.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  competitorName: text("competitor_name"),
  extractedTitle: text("extracted_title"),
  extractedPrice: decimal("extracted_price", { precision: 10, scale: 2 }),
  lastScraped: timestamp("last_scraped"),
  status: text("status").default("pending"), // pending, success, error
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const listingSnapshots = pgTable("listing_snapshots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  listingId: varchar("listing_id").references(() => competitorListings.id).notNull(),
  price: decimal("price", { precision: 12, scale: 2 }),
  currency: text("currency").notNull().default("AUD"),
  inStock: boolean("in_stock"),
  promoText: text("promo_text"),
  hasGiveaway: boolean("has_giveaway").notNull().default(false),
  scrapedAt: timestamp("scraped_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  httpStatus: integer("http_status"),
}, (table) => ({
  listingScrapedAtIdx: sql`CREATE INDEX IF NOT EXISTS listing_scraped_at_idx ON listing_snapshots (listing_id, scraped_at DESC)`,
}));

export const listingImages = pgTable("listing_images", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  listingId: varchar("listing_id").references(() => competitorListings.id).notNull(),
  imageUrl: text("image_url").notNull(),
  position: integer("position").notNull().default(0),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertCompetitorSchema = createInsertSchema(competitors).omit({ id: true });
export const insertCategorySchema = createInsertSchema(categories).omit({ id: true });
export const insertProductTypeSchema = createInsertSchema(productTypes).omit({ id: true });
export const insertBrandAliasSchema = createInsertSchema(brandAliases).omit({ id: true });
export const insertPageSchema = createInsertSchema(pages).omit({ id: true, lastHttpStatus: true, lastScrapedAt: true });
export const insertProductSchema = createInsertSchema(products).omit({ id: true, firstSeenAt: true, lastSeenAt: true });
export const insertProductSpecSchema = createInsertSchema(productSpecs).omit({ id: true });
export const insertPriceSnapshotSchema = createInsertSchema(priceSnapshots).omit({ id: true, scrapedAt: true });
export const insertPriceBandSchema = createInsertSchema(priceBands).omit({ id: true, updatedAt: true });
export const insertTaskSchema = createInsertSchema(tasks).omit({ id: true, startedAt: true, finishedAt: true });

// New catalog and listing insert schemas
export const insertBrandSchema = createInsertSchema(brands).omit({ id: true });
export const insertCatalogProductSchema = createInsertSchema(catalogProducts).omit({ id: true, createdAt: true });
export const insertCompetitorListingSchema = createInsertSchema(competitorListings).omit({ id: true, firstSeenAt: true, lastSeenAt: true });
export const insertListingSnapshotSchema = createInsertSchema(listingSnapshots).omit({ id: true, scrapedAt: true });
export const insertListingImageSchema = createInsertSchema(listingImages).omit({ id: true });

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Competitor = typeof competitors.$inferSelect;
export type InsertCompetitor = z.infer<typeof insertCompetitorSchema>;
export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type ProductType = typeof productTypes.$inferSelect;
export type InsertProductType = z.infer<typeof insertProductTypeSchema>;
export type BrandAlias = typeof brandAliases.$inferSelect;
export type InsertBrandAlias = z.infer<typeof insertBrandAliasSchema>;
export type Page = typeof pages.$inferSelect;
export type InsertPage = z.infer<typeof insertPageSchema>;
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type ProductSpec = typeof productSpecs.$inferSelect;
export type InsertProductSpec = z.infer<typeof insertProductSpecSchema>;
export type PriceSnapshot = typeof priceSnapshots.$inferSelect;
export type InsertPriceSnapshot = z.infer<typeof insertPriceSnapshotSchema>;
export type PriceBand = typeof priceBands.$inferSelect;
export type InsertPriceBand = z.infer<typeof insertPriceBandSchema>;
export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;

// New catalog and listing types
export type Brand = typeof brands.$inferSelect;
export type InsertBrand = z.infer<typeof insertBrandSchema>;
export type CatalogProduct = typeof catalogProducts.$inferSelect;
export type InsertCatalogProduct = z.infer<typeof insertCatalogProductSchema>;
export type CompetitorListing = typeof competitorListings.$inferSelect;
export type InsertCompetitorListing = z.infer<typeof insertCompetitorListingSchema>;
export type ListingSnapshot = typeof listingSnapshots.$inferSelect;
export type InsertListingSnapshot = z.infer<typeof insertListingSnapshotSchema>;
export type ListingImage = typeof listingImages.$inferSelect;
export type InsertListingImage = z.infer<typeof insertListingImageSchema>;
