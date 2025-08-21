import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Header } from "@/components/layout/header";
import { KPISection } from "@/components/dashboard/kpi-section";
import { BrandCoverageMatrix } from "@/components/dashboard/brand-coverage-matrix";
import { PriceBandsSection } from "@/components/dashboard/price-bands-section";
import { RecentChangesSection } from "@/components/dashboard/recent-changes-section";
import { ProductCatalogSection } from "@/components/dashboard/product-catalog-section";
import { ProductDetailModal } from "@/components/ui/product-detail-modal";
import { useState } from "react";

export default function Dashboard() {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: meta } = useQuery({
    queryKey: ["/api/meta"],
    queryFn: api.getMeta,
  });

  const { data: kpiMetrics } = useQuery({
    queryKey: ["/api/kpi"],
    queryFn: api.getKPIMetrics,
  });

  const jumpStartersType = meta?.productTypes?.find((pt: any) => pt.slug === "jump-starters");

  const { data: brandMatrix } = useQuery({
    queryKey: ["/api/brands/matrix", jumpStartersType?.id],
    queryFn: () => jumpStartersType ? api.getBrandMatrix(jumpStartersType.id) : null,
    enabled: !!jumpStartersType,
  });

  const { data: priceBands = [] } = useQuery({
    queryKey: ["/api/price-bands", jumpStartersType?.id],
    queryFn: () => jumpStartersType ? api.getPriceBands(jumpStartersType.id) : [],
    enabled: !!jumpStartersType,
  });

  const { data: recentChanges = [] } = useQuery({
    queryKey: ["/api/changes/recent"],
    queryFn: () => api.getRecentChanges(24),
  });

  const { data: products = [] } = useQuery({
    queryKey: ["/api/products", jumpStartersType?.id],
    queryFn: () => jumpStartersType ? api.getProducts({ productTypeId: jumpStartersType.id }) : [],
    enabled: !!jumpStartersType,
  });

  const handleProductClick = (product: any) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const breadcrumbs = [
    { label: "Automotive" },
    { label: "Jump Starters" }
  ];

  return (
    <div className="flex-1 overflow-auto">
      <Header 
        title="Competitor Analysis Dashboard"
        subtitle="Track pricing, coverage, and market insights across automotive jump starters"
        breadcrumbs={breadcrumbs}
        onExportCSV={() => jumpStartersType && api.exportCSV(jumpStartersType.id)}
      />
      
      <div className="p-8">
        {kpiMetrics && <KPISection metrics={kpiMetrics} />}
        
        <BrandCoverageMatrix data={brandMatrix || { brands: [], competitors: [], matrix: [] }} />
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <PriceBandsSection bands={priceBands} />
          <RecentChangesSection changes={recentChanges} />
        </div>

        <ProductCatalogSection 
          products={products}
          competitors={meta?.competitors || []}
          onProductClick={handleProductClick}
        />
      </div>

      <ProductDetailModal 
        product={selectedProduct}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
