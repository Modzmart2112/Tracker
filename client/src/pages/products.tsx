import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { ProductCatalogSection } from "@/components/dashboard/product-catalog-section";
import { ProductDetailModal } from "@/components/ui/product-detail-modal";
import { useState } from "react";

export default function Products() {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: meta } = useQuery({
    queryKey: ["/api/meta"],
    queryFn: api.getMeta,
  });

  const { data: products = [] } = useQuery({
    queryKey: ["/api/products"],
    queryFn: () => api.getProducts({}),
  });

  const handleProductClick = (product: any) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  return (
    <div className="flex-1 overflow-auto">
      <Header 
        title="Product Catalog"
        subtitle="Complete inventory across all competitors and categories"
        onExportCSV={() => api.exportCSV()}
      />
      
      <div className="p-8">
        {products.length > 0 ? (
          <ProductCatalogSection 
            products={products}
            competitors={meta?.competitors || []}
            onProductClick={handleProductClick}
          />
        ) : (
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="py-12 text-center">
              <div className="text-slate-400 text-4xl mb-4">📦</div>
              <h3 className="text-lg font-medium text-slate-900 mb-2">No Products Found</h3>
              <p className="text-slate-500 mb-4">
                Start by adding competitor pages and running scraping tasks to populate your product catalog.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <ProductDetailModal 
        product={selectedProduct}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
