import type { Express } from "express";
import { createServer, type Server } from "http";
import { getStorage } from "./storage.factory";
import { 
  insertCompetitorSchema, insertPageSchema, insertProductSchema, insertTaskSchema,
  insertBrandSchema, insertCatalogProductSchema, insertCompetitorListingSchema,
  insertListingSnapshotSchema
} from "@shared/schema";
import {
  ObjectStorageService,
  ObjectNotFoundError,
} from "./objectStorage";

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

  app.put("/api/products-unified/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { name, sku, ourPrice, brand, category } = req.body;
      
      // Get existing product
      const product = await storage.getUnifiedProduct(id);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      
      // Update product by recreating it (for memory storage)
      await storage.deleteUnifiedProduct(id);
      const updatedProduct = await storage.createUnifiedProduct({
        name: name || product.name,
        sku: sku || product.sku,
        ourPrice: ourPrice !== undefined ? ourPrice : product.ourPrice
      });
      
      // Re-add competitor links
      if (product.competitorLinks) {
        for (const link of product.competitorLinks) {
          await storage.addCompetitorLink(updatedProduct.id, link.url);
        }
      }
      
      const finalProduct = await storage.getUnifiedProduct(updatedProduct.id);
      res.json(finalProduct);
    } catch (error) {
      console.error("Error updating product:", error);
      res.status(500).json({ error: "Failed to update product" });
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

  // Import AI service if OpenAI key is available
  const aiService = process.env.OPENAI_API_KEY 
    ? await import("./ai-service")
    : null;

  // Extract products from category page  
  app.post("/api/extract-category", async (req, res) => {
    try {
      const { url } = req.body;
      
      console.log("Extracting products from:", url);
      
      // Fetch the actual page content
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch page: ${response.status} ${response.statusText}`);
      }
      
      const html = await response.text();
      console.log("Page fetched successfully, length:", html.length);
      
      // Extract products using Sydney Tools specific HTML structure
      // Based on the provided HTML: ant-card ant-card-bordered product-card
      const productCardRegex = /<div[^>]*class="[^"]*ant-card[^"]*ant-card-bordered[^"]*product-card[^"]*"[^>]*>(.*?)<\/div>\s*(?:<\/div>\s*){0,2}<\/div>/gs;
      
      // Sydney Tools specific patterns for content extraction based on actual HTML structure
      const titleRegex = /<h2[^>]*title="([^"]+)"[^>]*>/i;
      const priceRegex = /<div[^>]*class="price"[^>]*>.*?\$[^>]*>(\d+)<\/span>.*?\.(\d+)<\/span>/s;
      const imageRegex = /<img[^>]*class="img-fluid"[^>]*src="([^"]+)"[^>]*>/;
      const linkRegex = /<a[^>]*href="([^"]+)"[^>]*>/;
      
      // Alternative patterns for different content structures
      const alternativePatterns = [
        // Try broader ant-card pattern
        /<div[^>]*class="[^"]*ant-card[^"]*"[^>]*>(.*?)<\/div>/gs,
        // Try product-card specific
        /<div[^>]*class="[^"]*product-card[^"]*"[^>]*>(.*?)<\/div>/gs,
        // Generic product patterns
        /<div[^>]*class="[^"]*product[^"]*"[^>]*>(.*?)<\/div>/gs
      ];
      
      const products = [];
      let index = 0;
      
      // Try primary pattern first, then fallback patterns
      const patterns = [productCardRegex, ...alternativePatterns];
      
      for (const pattern of patterns) {
        let match;
        pattern.lastIndex = 0; // Reset regex
        
        while ((match = pattern.exec(html)) !== null && index < 50) {
          const cardHtml = match[1] || match[0];
          
          // Extract title using Sydney Tools specific patterns
          const titleMatch = cardHtml.match(titleRegex) || 
                            cardHtml.match(/title="([^"]+)"/) ||
                            cardHtml.match(/alt="([^"]+)"/);
          const title = titleMatch ? titleMatch[1].trim().replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>') : null;
          
          // Extract price using Sydney Tools price structure
          const priceMatch = cardHtml.match(priceRegex);
          let price = 0;
          if (priceMatch) {
            const dollars = parseInt(priceMatch[1]) || 0;
            const cents = parseInt(priceMatch[2]) || 0;
            price = dollars + (cents / 100);
          } else {
            // Fallback to simple price extraction
            const simplePriceMatch = cardHtml.match(/\$[\d,]+\.?\d*/);
            if (simplePriceMatch) {
              price = parseFloat(simplePriceMatch[0].replace(/[\$,]/g, ''));
            }
          }
          
          // Skip if no title or price found
          if (!title || title.length < 3 || price <= 0) {
            continue;
          }
          
          // Extract image - Sydney Tools uses full URLs
          const imageMatch = cardHtml.match(imageRegex);
          let image = imageMatch ? imageMatch[1] : null;
          
          // Extract product link - look for href in product link
          const linkMatch = cardHtml.match(/<a[^>]*href="(\/product\/[^"]+)"[^>]*>/);
          let productUrl = linkMatch ? `https://sydneytools.com.au${linkMatch[1]}` : url;
          
          // Use AI to analyze product if available
          let brand = "Unknown";
          let category = "Tools";
          
          if (aiService && title) {
            try {
              const analysis = await aiService.analyzeProductTitle(title);
              brand = analysis.brand;
              category = analysis.category;
            } catch (error) {
              console.log("AI analysis failed, using fallback:", error.message);
              // Simple brand extraction fallback
              const brandMatch = title.match(/^([A-Z][a-z]+)/);
              brand = brandMatch ? brandMatch[1] : "Unknown";
            }
          } else {
            // Basic brand extraction without AI
            const brandMatch = title.match(/^([A-Z][a-zA-Z]+)/);
            brand = brandMatch ? brandMatch[1] : "Unknown";
          }
          
          products.push({
            sku: `${brand.toUpperCase()}-${String(index + 1).padStart(3, '0')}`,
            title: title,
            price: price,
            image: image,
            url: productUrl,
            brand: brand,
            model: title.replace(brand, '').trim(),
            category: category
          });
          
          index++;
        }
        
        // If we found products with this pattern, break
        if (products.length > 0) {
          console.log(`Found ${products.length} products using pattern ${patterns.indexOf(pattern) + 1}`);
          break;
        }
      }
      
      console.log(`Extracted ${products.length} products from page`);
      
      if (products.length === 0) {
        // Try to extract from the provided HTML structure directly if it exists
        if (html.includes('ant-card ant-card-bordered product-card')) {
          console.log("Found Sydney Tools product structure, trying direct extraction...");
          
          // Use the provided HTML structure to extract real products
          const directCards = html.match(/<div[^>]*class="[^"]*ant-card[^"]*ant-card-bordered[^"]*product-card[^"]*"[^>]*>.*?<\/div>\s*<\/div>\s*<\/div>/gs);
          
          if (directCards) {
            console.log(`Found ${directCards.length} product cards in HTML`);
            
            directCards.forEach((cardHtml, index) => {
              const titleMatch = cardHtml.match(/<h2[^>]*title="([^"]+)"[^>]*>/) || 
                                cardHtml.match(/title="([^"]+)"/) ||
                                cardHtml.match(/alt="([^"]+)"/);
              const title = titleMatch ? titleMatch[1].trim().replace(/&amp;/g, '&') : null;
              
              const priceMatch = cardHtml.match(/<span[^>]*>(\d+)<\/span>.*?<span[^>]*>(\d+)<\/span>/s);
              let price = 0;
              if (priceMatch) {
                price = parseInt(priceMatch[1]) + (parseInt(priceMatch[2]) / 100);
              }
              
              const imageMatch = cardHtml.match(/<img[^>]*src="([^"]+)"[^>]*>/);
              const image = imageMatch ? imageMatch[1] : null;
              
              const linkMatch = cardHtml.match(/<a[^>]*href="(\/product\/[^"]+)"[^>]*>/);
              const productUrl = linkMatch ? `https://sydneytools.com.au${linkMatch[1]}` : url;
              
              if (title && price > 0) {
                const brand = title.split(' ')[0];
                products.push({
                  sku: `${brand.toUpperCase()}-${String(index + 1).padStart(3, '0')}`,
                  title: title,
                  price: price,
                  image: image,
                  url: productUrl,
                  brand: brand,
                  model: title.replace(brand, '').trim(),
                  category: "Car Battery Chargers"
                });
              }
            });
            
            if (products.length > 0) {
              console.log(`Successfully extracted ${products.length} real products`);
              return res.json({
                products: products,
                totalPages: 1,
                currentPage: 1,
                totalProducts: products.length,
                categoryName: "CAR BATTERY CHARGERS",
                extractedAt: new Date().toISOString(),
                aiEnhanced: !!aiService,
                sourceUrl: url,
                note: "Extracted from real Sydney Tools product data"
              });
            }
          }
        }
        
        // Check if this is a React/SPA application
        const isReactApp = html.includes('<div id="root"></div>') || html.includes('React') || html.includes('__NEXT_DATA__');
        
        // For React/SPA applications, try browser automation first, fallback to demo
        if (isReactApp) {
          console.log("Detected React/SPA application - attempting Playwright browser automation");
          
          // Try real browser automation first
          try {
            const { playwrightScraper } = await import('./playwright-scraper');
            const result = await playwrightScraper.scrapeSydneyTools(url);
            
            if (result.totalProducts > 0) {
              return res.json({
                ...result,
                extractedAt: new Date().toISOString(),
                aiEnhanced: false,
                sourceUrl: url,
                note: `🎉 SUCCESS! Extracted ${result.totalProducts} authentic products using real browser automation from Sydney Tools.`,
                isDemo: false
              });
            }
          } catch (error: any) {
            console.error("Browser automation failed, falling back to demo:", error.message);
          }
          
          return res.json({
            products: [],
            totalPages: 0,
            currentPage: 1,
            totalProducts: 0,
            categoryName: "PRODUCTS",
            extractedAt: new Date().toISOString(),
            aiEnhanced: false,
            sourceUrl: url,
            error: "Browser automation failed. No authentic product data could be extracted.",
            note: "Browser automation attempted but failed. Only authentic data extraction is enabled."
          });
        }
        
        // Fallback: Try alternative parsing methods
        console.log("No products found with primary method, trying alternative parsing...");
        
        // Look for any price patterns in the HTML
        const allPrices = html.match(/\$[\d,]+\.?\d*/g) || [];
        const allTitles = html.match(/<h[1-6][^>]*>([^<]+)<\/h[1-6]>/g) || [];
        
        console.log(`Found ${allPrices.length} prices and ${allTitles.length} titles in HTML`);
        
        if (allPrices.length === 0) {
          // Return a helpful error with actual page information
          const pageTitle = html.match(/<title>([^<]+)<\/title>/)?.[1] || "Unknown Page";
          return res.status(400).json({ 
            error: "No products found on this page",
            details: `Page title: "${pageTitle}". The page appears to use JavaScript to load content dynamically.`,
            suggestion: "This site requires JavaScript rendering. The products shown are realistic examples for testing."
          });
        }
      }
      
      // Parse category from URL for metadata
      const categoryMatch = url.match(/\/category\/([^\/]+)\/([^\/\?]+)/);
      const categoryName = categoryMatch ? categoryMatch[2].replace(/-/g, ' ').toUpperCase() : 'PRODUCTS';
      
      // Return the extracted products
      res.json({
        products: products,
        totalPages: 1,
        currentPage: 1,
        totalProducts: products.length,
        categoryName: categoryName,
        extractedAt: new Date().toISOString(),
        aiEnhanced: !!aiService,
        sourceUrl: url
      });
      
      // Use AI to analyze products if available
      let enrichedProducts = products;
      if (aiService) {
        try {
          const categoryInfo = await aiService.analyzeCategoryUrl(url);
          const analyzed = await aiService.bulkAnalyzeProducts(products);
          
          enrichedProducts = products.map((product, i) => ({
            ...product,
            brand: analyzed[i]?.brand || product.brand,
            model: analyzed[i]?.model || product.model,
            category: categoryInfo.category,
            subcategory: categoryInfo.subcategory,
            specifications: analyzed[i]?.specifications || []
          }));
        } catch (err) {
          console.log("AI analysis failed, using basic extraction");
        }
      }
      
      // Simulate pagination info
      res.json({
        products: enrichedProducts,
        totalPages: Math.ceil(products.length / 20),
        currentPage: 1,
        totalProducts: products.length,
        categoryName: "PRODUCTS",
        extractedAt: new Date().toISOString(),
        aiEnhanced: !!aiService
      });
    } catch (error: any) {
      console.error("Error extracting category:", error);
      res.status(500).json({ error: "Failed to extract category products" });
    }
  });

  // Bulk import products with brand and category extraction
  app.post("/api/products-unified/bulk", async (req, res) => {
    try {
      const { products, sourceUrl } = req.body;
      let addedCount = 0;
      let matchedCount = 0;
      
      // Extract competitor name from source URL
      const competitorName = sourceUrl ? 
        new URL(sourceUrl).hostname.replace('www.', '').split('.')[0].toUpperCase() : 
        'Unknown';
      
      // Extract category from URL if possible
      const categoryMatch = sourceUrl?.match(/\/category\/[^\/]+\/([^\/\?]+)/);
      const category = categoryMatch ? 
        categoryMatch[1].replace(/-/g, ' ').split(' ').map(w => 
          w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
        ).join(' ') : 
        'General';
      
      for (const product of products) {
        try {
          // Extract brand from product title  
          let brand = 'Unknown';
          let brandId = null;
          const brandPatterns = [
            /^(SP Tools|Schumacher|Matson|NOCO|DeWalt|Makita|Milwaukee|Bosch|Ryobi)/i,
            /^([A-Z][A-Z0-9]+(?:\s+[A-Z][a-z]+)?)/,  // Matches "SP Tools", "NOCO", etc
            /^([A-Z][a-z]+)/  // Simple brand pattern
          ];
          
          for (const pattern of brandPatterns) {
            const match = product.title?.match(pattern);
            if (match) {
              brand = match[1];
              // Map to brand IDs we have in database
              if (brand.toLowerCase().includes('schumacher')) brandId = 'schumacher';
              else if (brand.toLowerCase().includes('matson')) brandId = 'matson';
              else if (brand.toLowerCase().includes('sp tools')) brandId = 'sp-tools';
              else if (brand.toLowerCase().includes('noco')) brandId = 'noco';
              break;
            }
          }
          
          // Check if we already have a product with exact same SKU
          const existingProducts = await storage.getUnifiedProducts();
          const matchedProduct = existingProducts.find(existing => {
            return existing.sku === product.sku;
          });
          
          if (matchedProduct) {
            // Product exists - add as competitor link
            await storage.addCompetitorLink(matchedProduct.id, product.url || sourceUrl);
            
            // Update price tracking if needed
            if (product.extractedPrice) {
              // Store competitor price information (we'll implement this next)
            }
            
            matchedCount++;
          } else {
            // Helper function to extract model number from title
            const extractModelNumber = (title: string): string => {
              if (!title) return 'N/A';
              const patterns = [
                /\b([A-Z]{2,}[\s-]?[A-Z0-9]+[0-9]+[A-Z0-9]*)\b/i,
                /\b([A-Z]+[0-9]+[A-Z0-9]*)\b/,
                /\b([0-9]+[A-Z]+[0-9]*)\b/,
                /\b([A-Z][0-9]{2,}[A-Z0-9]*)\b/,
              ];
              for (const pattern of patterns) {
                const match = title.match(pattern);
                if (match) return match[1];
              }
              const words = title.split(/\s+/);
              for (let i = 1; i < words.length; i++) {
                if (/[A-Z]/i.test(words[i]) && /[0-9]/.test(words[i])) {
                  return words[i];
                }
              }
              return 'N/A';
            };
            
            // New product - create it with brand and category IDs
            const newProduct = await storage.createUnifiedProduct({
              sku: product.sku,
              modelNumber: extractModelNumber(product.title),
              name: product.title,
              ourPrice: product.price, // Current selling price (sale price if on sale)
              price: product.price, // Current selling price (same as ourPrice)
              targetPrice: product.isOnSale ? product.originalPrice : null, // Store original price in targetPrice when on sale
              image: product.image,
              brand: brand,
              brandId: brandId,
              category: category,
              categoryId: 'battery-chargers', // Since we're importing battery chargers
              productPageUrl: product.url || sourceUrl
            });
            
            // Add the source URL as a competitor link
            if (product.url || sourceUrl) {
              await storage.addCompetitorLink(newProduct.id, product.url || sourceUrl);
            }
            
            addedCount++;
          }
        } catch (err) {
          console.error("Failed to add/match product:", err);
        }
      }
      
      res.json({ 
        count: addedCount,
        matched: matchedCount,
        total: products.length,
        competitor: competitorName,
        category: category
      });
    } catch (error) {
      console.error("Error bulk importing products:", error);
      res.status(500).json({ error: "Failed to bulk import products" });
    }
  });

  // Object Storage endpoints for image uploads
  app.get("/public-objects/:filePath(*)", async (req, res) => {
    const filePath = req.params.filePath;
    const objectStorageService = new ObjectStorageService();
    try {
      const file = await objectStorageService.searchPublicObject(filePath);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      objectStorageService.downloadObject(file, res);
    } catch (error) {
      console.error("Error searching for public object:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/objects/:objectPath(*)", async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(
        req.path,
      );
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  app.post("/api/objects/upload", async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    res.json({ uploadURL });
  });

  app.put("/api/card-images", async (req, res) => {
    if (!req.body.imageURL) {
      return res.status(400).json({ error: "imageURL is required" });
    }

    try {
      const objectStorageService = new ObjectStorageService();
      const objectPath = objectStorageService.normalizeObjectEntityPath(
        req.body.imageURL,
      );

      // Update card customization in storage (we'll handle this on client side for now)
      res.status(200).json({
        objectPath: objectPath,
      });
    } catch (error) {
      console.error("Error setting card image:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
