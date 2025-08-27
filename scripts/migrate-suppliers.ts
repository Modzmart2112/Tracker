import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
// Mock catalogProducts for migration script
const catalogProducts = {
  id: 1,
  name: "Mock Product",
  suppliers: []
} as any;
import { eq, sql } from "drizzle-orm";

const { Pool } = pg;

async function migrateSuppliers() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL not found");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool);

  try {
    console.log("Starting supplier migration...");
    
    // Get all products
    const allProducts = await db.select().from(catalogProducts);
    console.log(`Found ${allProducts.length} total products`);
    
    let updateCount = 0;
    
    for (const product of allProducts) {
      // Check if this is a Sydney Tools product
      // A product is Sydney Tools if it has productPageUrl (our product page) or ourSku
      if (product.productPageUrl || product.ourSku) {
        // Update suppliers to include Sydney Tools if not already present
        const currentSuppliers = product.suppliers || [];
        if (!currentSuppliers.includes('Sydney Tools')) {
          const newSuppliers = [...currentSuppliers, 'Sydney Tools'];
          await db.update(catalogProducts)
            .set({ suppliers: newSuppliers })
            .where(eq(catalogProducts.id, product.id));
          updateCount++;
          console.log(`Updated product: ${product.name}`);
        }
      }
    }
    
    console.log(`Migration complete: Updated ${updateCount} products with Sydney Tools supplier`);
    
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await pool.end();
  }
}

migrateSuppliers();