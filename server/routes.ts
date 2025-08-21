import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertCompetitorSchema, insertPageSchema, insertProductSchema, insertTaskSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
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

  const httpServer = createServer(app);
  return httpServer;
}
