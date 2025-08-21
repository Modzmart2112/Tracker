import type { Express } from "express";
import { createServer, type Server } from "http";
import { getStorage } from "./storage.factory";
import { 
  insertCompetitorSchema, insertPageSchema, insertProductSchema, insertTaskSchema,
  insertBrandSchema, insertCatalogProductSchema, insertCompetitorListingSchema,
  insertListingSnapshotSchema
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  const storage = getStorage();
  
  // Meta endpoints
  app.get("/api/meta", async (req, res) => {
    const categories = await storage.getCategories();
    const productTypes = await storage.getProductTypes();
    const competitors = await storage.getCompetitors();
    
    res.json({ categories, productTypes, competitors });
  });

  // Competitor endpoints
  app.get("/api/competitors", async (req, res) => {
    const competitors = await storage.getCompetitors();
    res.json(competitors);
  });

  app.post("/api/competitors", async (req, res) => {
    try {
      const validatedData = insertCompetitorSchema.parse(req.body);
      const competitor = await storage.createCompetitor(validatedData);
      res.json(competitor);
    } catch (error) {
      res.status(400).json({ error: "Invalid competitor data" });
    }
  });

  app.put("/api/competitors/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = insertCompetitorSchema.partial().parse(req.body);
      const competitor = await storage.updateCompetitor(id, updates);
      
      if (!competitor) {
        return res.status(404).json({ error: "Competitor not found" });
      }
      
      res.json(competitor);
    } catch (error) {
      res.status(400).json({ error: "Invalid competitor data" });
    }
  });

  app.delete("/api/competitors/:id", async (req, res) => {
    const { id } = req.params;
    const deleted = await storage.deleteCompetitor(id);
    
    if (!deleted) {
      return res.status(404).json({ error: "Competitor not found" });
    }
    
    res.json({ success: true });
  });

  // Pages endpoints
  app.get("/api/pages", async (req, res) => {
    const { competitorId } = req.query;
    
    if (competitorId) {
      const pages = await storage.getPagesByCompetitor(competitorId as string);
      res.json(pages);
    } else {
      const pages = await storage.getPages();
      res.json(pages);
    }
  });

  app.post("/api/pages", async (req, res) => {
    try {
      const validatedData = insertPageSchema.parse(req.body);
      const page = await storage.createPage(validatedData);
      res.json(page);
    } catch (error) {
      res.status(400).json({ error: "Invalid page data" });
    }
  });

  app.delete("/api/pages/:id", async (req, res) => {
    const { id } = req.params;
    const deleted = await storage.deletePage(id);
    
    if (!deleted) {
      return res.status(404).json({ error: "Page not found" });
    }
    
    res.json({ success: true });
  });

  // Products endpoints
  app.get("/api/products", async (req, res) => {
    const { competitorId, productTypeId, brand } = req.query;
    const filters: any = {};
    
    if (competitorId) filters.competitorId = competitorId as string;
    if (productTypeId) filters.productTypeId = productTypeId as string;
    if (brand) filters.brand = brand as string;
    
    const products = await storage.getProducts(filters);
    res.json(products);
  });

  app.get("/api/products/:id", async (req, res) => {
    const { id } = req.params;
    const product = await storage.getProduct(id);
    
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    
    const specs = await storage.getProductSpecs(id);
    const priceSnapshots = await storage.getPriceSnapshots(id);
    
    res.json({ ...product, specs, priceSnapshots });
  });

  app.post("/api/products", async (req, res) => {
    try {
      const validatedData = insertProductSchema.parse(req.body);
      const product = await storage.createProduct(validatedData);
      res.json(product);
    } catch (error) {
      res.status(400).json({ error: "Invalid product data" });
    }
  });

  // Brand coverage matrix
  app.get("/api/brands/matrix", async (req, res) => {
    const { productTypeId } = req.query;
    
    if (!productTypeId) {
      return res.status(400).json({ error: "productTypeId is required" });
    }
    
    const matrix = await storage.getBrandCoverageMatrix(productTypeId as string);
    res.json(matrix);
  });

  // Price bands
  app.get("/api/price-bands", async (req, res) => {
    const { productTypeId, brand } = req.query;
    const bands = await storage.getPriceBands(
      productTypeId as string, 
      brand as string
    );
    res.json(bands);
  });

  // Recent changes
  app.get("/api/changes/recent", async (req, res) => {
    const { hours = "24" } = req.query;
    const changes = await storage.getRecentPriceChanges(parseInt(hours as string));
    res.json(changes);
  });

  // KPI metrics
  app.get("/api/kpi", async (req, res) => {
    const metrics = await storage.getKPIMetrics();
    res.json(metrics);
  });

  // Scraping endpoints
  app.post("/api/scrape/run", async (req, res) => {
    try {
      const { pageId, competitorId, productTypeId } = req.body;
      
      const task = await storage.createTask({
        pageId: pageId || null,
        status: "pending",
        runReason: "manual"
      });
      
      // In a real implementation, this would trigger the scraping process
      // For now, we'll just return the task
      res.json({ task, message: "Scraping task queued" });
    } catch (error) {
      res.status(400).json({ error: "Failed to queue scraping task" });
    }
  });

  // Tasks endpoints
  app.get("/api/tasks", async (req, res) => {
    const tasks = await storage.getTasks();
    res.json(tasks);
  });

  // Export CSV
  app.get("/api/export/csv", async (req, res) => {
    const { productTypeId } = req.query;
    const products = await storage.getProducts(
      productTypeId ? { productTypeId: productTypeId as string } : undefined
    );
    
    // Create CSV content
    const headers = ["Brand", "Model", "Title", "Competitor", "Price", "Stock", "URL"];
    const csvRows = [headers.join(",")];
    
    for (const product of products) {
      const competitor = await storage.getCompetitor(product.competitorId);
      const priceSnapshots = await storage.getPriceSnapshots(product.id);
      const latestPrice = priceSnapshots[0];
      
      const row = [
        product.brand,
        product.model || "",
        `"${product.title}"`,
        competitor?.name || "",
        latestPrice?.priceDecimal || "",
        latestPrice?.inStock ? "In Stock" : "Out of Stock",
        product.productUrl
      ];
      
      csvRows.push(row.join(","));
    }
    
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=products.csv");
    res.send(csvRows.join("\n"));
  });

  // Brand endpoints
  app.post("/api/brands", async (req, res) => {
    try {
      const validatedData = insertBrandSchema.parse(req.body);
      const brand = await storage.createBrand(validatedData);
      res.json(brand);
    } catch (error) {
      res.status(400).json({ error: "Invalid brand data" });
    }
  });

  app.get("/api/brands", async (req, res) => {
    const brands = await storage.getBrands();
    res.json(brands);
  });

  // Catalog Product endpoints
  app.post("/api/catalog/products", async (req, res) => {
    try {
      const validatedData = insertCatalogProductSchema.parse(req.body);
      const product = await storage.createCatalogProduct(validatedData);
      res.json(product);
    } catch (error) {
      res.status(400).json({ error: "Invalid catalog product data" });
    }
  });

  app.get("/api/catalog/products", async (req, res) => {
    const products = await storage.listCatalogProducts();
    res.json(products);
  });

  app.get("/api/catalog/products/:id", async (req, res) => {
    const product = await storage.getCatalogProductById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: "Catalog product not found" });
    }
    res.json(product);
  });

  // Competitor Listing endpoints
  app.post("/api/listings", async (req, res) => {
    try {
      const validatedData = insertCompetitorListingSchema.parse(req.body);
      const listing = await storage.createCompetitorListing(validatedData);
      res.json(listing);
    } catch (error) {
      res.status(400).json({ error: "Invalid listing data" });
    }
  });

  app.get("/api/listings", async (req, res) => {
    const { productId } = req.query;
    if (!productId) {
      return res.status(400).json({ error: "productId query parameter is required" });
    }
    const listings = await storage.listListingsByProduct(productId as string);
    res.json(listings);
  });

  app.patch("/api/listings/:id", async (req, res) => {
    try {
      const listing = await storage.updateListing(req.params.id, req.body);
      if (!listing) {
        return res.status(404).json({ error: "Listing not found" });
      }
      res.json(listing);
    } catch (error) {
      res.status(400).json({ error: "Failed to update listing" });
    }
  });

  // Listing History endpoints
  app.get("/api/listings/:id/history", async (req, res) => {
    const { limit } = req.query;
    const history = await storage.getListingHistory(
      req.params.id,
      limit ? parseInt(limit as string, 10) : 30
    );
    res.json(history);
  });

  // Scrape endpoint for running listing scrapes
  app.post("/api/scrape/run", async (req, res) => {
    const { listingId, productId } = req.body;
    
    if (!listingId && !productId) {
      return res.status(400).json({ error: "Either listingId or productId is required" });
    }

    // For now, just return a placeholder response
    // In Stage D, this will be replaced with actual scraping logic
    res.json({ 
      status: "queued", 
      message: "Scraping task queued",
      listingId,
      productId 
    });
  });

  // Unified products routes
  app.get("/api/products-unified", async (req, res) => {
    try {
      const productsWithLinks = await storage.getUnifiedProducts();
      res.json(productsWithLinks);
    } catch (error) {
      console.error("Error fetching unified products:", error);
      res.json([]); // Return empty array for now
    }
  });

  app.post("/api/products-unified", async (req, res) => {
    try {
      const { sku, name, ourPrice, competitorUrls } = req.body;
      const product = await storage.createUnifiedProduct({ sku, name, ourPrice });
      
      // Add competitor links
      if (competitorUrls && competitorUrls.length > 0) {
        for (const url of competitorUrls) {
          await storage.addCompetitorLink(product.id, url);
        }
      }
      
      const productWithLinks = await storage.getUnifiedProduct(product.id);
      res.json(productWithLinks);
    } catch (error) {
      console.error("Error creating unified product:", error);
      res.status(500).json({ error: "Failed to create product" });
    }
  });

  app.delete("/api/products-unified/:id", async (req, res) => {
    try {
      await storage.deleteUnifiedProduct(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting unified product:", error);
      res.status(500).json({ error: "Failed to delete product" });
    }
  });

  app.post("/api/extract-url", async (req, res) => {
    try {
      const { url } = req.body;
      // Simulate extracting product from URL
      const mockData = {
        title: "Sample Product Title",
        price: 199.99,
        competitorName: new URL(url).hostname.replace("www.", "").split(".")[0],
        image: "https://via.placeholder.com/150"
      };
      res.json(mockData);
    } catch (error) {
      console.error("Error extracting URL:", error);
      res.status(500).json({ error: "Failed to extract URL data" });
    }
  });

  // Extract products from category page  
  app.post("/api/extract-category", async (req, res) => {
    try {
      const { url } = req.body;
      
      // Simulate extracting products from Sydney Tools category page
      // Based on the HTML structure: class="ant-card ant-card-bordered product-card"
      // In production, this would use a real web scraper like Puppeteer or Playwright
      
      // Parse category from URL for realistic mock data
      const categoryMatch = url.match(/\/category\/([^\/]+)\/([^\/\?]+)/);
      const category = categoryMatch ? categoryMatch[2].replace(/-/g, ' ') : 'products';
      
      // Generate realistic mock products based on category
      const mockProductTemplates = {
        'car-battery-chargers': [
          { brand: 'NOCO', model: 'Boost Plus GB40', specs: '1000A 12V', price: 149.99 },
          { brand: 'NOCO', model: 'Boost HD GB70', specs: '2000A 12V', price: 249.99 },
          { brand: 'CTEK', model: 'MXS 5.0', specs: '12V Battery Charger', price: 129.99 },
          { brand: 'CTEK', model: 'MXS 10', specs: '12V/24V Charger', price: 259.99 },
          { brand: 'Projecta', model: 'Pro-Charge PC1600', specs: '16A 12V/24V', price: 449.00 },
          { brand: 'Century', model: 'CC1212', specs: '12V 12A Charger', price: 89.99 },
          { brand: 'NOCO', model: 'Genius G3500', specs: '6V/12V 3.5A', price: 119.99 },
          { brand: 'Victron', model: 'Blue Smart', specs: 'IP65 12V 15A', price: 189.00 },
        ],
        'default': [
          { brand: 'Milwaukee', model: 'M18 FUEL', specs: 'Brushless Drill', price: 299.00 },
          { brand: 'DeWalt', model: 'DCK240C2', specs: '20V Combo Kit', price: 249.00 },
          { brand: 'Makita', model: 'DHP481Z', specs: '18V Hammer Drill', price: 189.00 },
        ]
      };
      
      const templates = mockProductTemplates[categoryMatch?.[2]] || mockProductTemplates.default;
      
      // Simulate multiple pages of products
      const productsPerPage = 24;
      const totalProducts = templates.length;
      const totalPages = Math.ceil(totalProducts / productsPerPage);
      
      const products = templates.map((template, index) => ({
        sku: `${template.brand.toUpperCase()}-${String(index + 1).padStart(3, '0')}`,
        title: `${template.brand} ${template.model} ${template.specs}`,
        price: template.price,
        image: `https://via.placeholder.com/300x300/CB0000/ffffff?text=${encodeURIComponent(template.brand)}`,
        url: `${url.split('?')[0]}/product/${template.model.toLowerCase().replace(/\s+/g, '-')}`
      }));
      
      // Simulate pagination info
      res.json({
        products: products,
        totalPages: totalPages,
        currentPage: 1,
        totalProducts: totalProducts,
        categoryName: category.replace(/-/g, ' ').toUpperCase(),
        extractedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error extracting category:", error);
      res.status(500).json({ error: "Failed to extract category products" });
    }
  });

  // Bulk import products
  app.post("/api/products-unified/bulk", async (req, res) => {
    try {
      const { products } = req.body;
      let addedCount = 0;
      
      for (const product of products) {
        try {
          const newProduct = await storage.createUnifiedProduct({
            sku: product.sku,
            name: product.title,
            ourPrice: product.price
          });
          
          // Add the source URL as a competitor link
          if (product.url) {
            await storage.addCompetitorLink(newProduct.id, product.url);
          }
          
          addedCount++;
        } catch (err) {
          console.error("Failed to add product:", err);
        }
      }
      
      res.json({ count: addedCount });
    } catch (error) {
      console.error("Error bulk importing products:", error);
      res.status(500).json({ error: "Failed to bulk import products" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
