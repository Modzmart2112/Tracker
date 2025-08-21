import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

interface Product {
  id: string;
  title: string;
  brand: string;
  competitorId: string;
  imageUrl?: string;
  productUrl: string;
}

interface Competitor {
  id: string;
  name: string;
}

interface ProductCatalogSectionProps {
  products: Product[];
  competitors: Competitor[];
  onProductClick: (product: Product) => void;
}

export function ProductCatalogSection({ products, competitors, onProductClick }: ProductCatalogSectionProps) {
  const [brandFilter, setBrandFilter] = useState<string>("all");
  const [competitorFilter, setCompetitorFilter] = useState<string>("all");

  // Get unique brands from products
  const brands = [...new Set(products.map(p => p.brand))];

  // Filter products
  const filteredProducts = products.filter(product => {
    const matchesBrand = !brandFilter || brandFilter === "all" || product.brand.toLowerCase().includes(brandFilter.toLowerCase());
    const matchesCompetitor = !competitorFilter || competitorFilter === "all" || product.competitorId === competitorFilter;
    return matchesBrand && matchesCompetitor;
  });

  const getBrandColor = (brand: string) => {
    switch (brand.toLowerCase()) {
      case 'noco':
        return 'bg-blue-100 text-blue-800';
      case 'dewalt':
        return 'bg-yellow-100 text-yellow-800';
      case 'projecta':
        return 'bg-green-100 text-green-800';
      case 'milwaukee':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  // Mock price and stock data
  const getProductData = (product: Product) => {
    const mockPrices = {
      'NOCO GB40 1000A Jump Starter': { current: 139, min: 139, max: 159, inStock: true },
      'DEWALT DXAEJ14 Jump Starter': { current: 329, min: 329, max: 369, inStock: true },
      'Projecta IS2500 Intelli-Start': { current: 219, min: 199, max: 249, inStock: false },
      'Milwaukee M18 FUEL Jump Starter': { current: 449, min: 449, max: 529, inStock: true, promo: '15% Off' }
    };
    
    return mockPrices[product.title as keyof typeof mockPrices] || { 
      current: 199, min: 199, max: 299, inStock: true 
    };
  };

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-slate-900">
              Product Catalog
            </CardTitle>
            <p className="text-slate-600 text-sm mt-1">
              Complete jump starter inventory across all competitors
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-slate-700">Brand:</label>
              <Select value={brandFilter} onValueChange={setBrandFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="All Brands" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Brands</SelectItem>
                  {brands.map(brand => (
                    <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-slate-700">Competitor:</label>
              <Select value={competitorFilter} onValueChange={setCompetitorFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Competitors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Competitors</SelectItem>
                  {competitors.map(comp => (
                    <SelectItem key={comp.id} value={comp.id}>{comp.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-slate-700">Product</th>
                <th className="text-left py-3 px-4 font-medium text-slate-700">Brand</th>
                <th className="text-left py-3 px-4 font-medium text-slate-700">Competitor</th>
                <th className="text-right py-3 px-4 font-medium text-slate-700">Current Price</th>
                <th className="text-right py-3 px-4 font-medium text-slate-700">Min/Max</th>
                <th className="text-center py-3 px-4 font-medium text-slate-700">Stock</th>
                <th className="text-center py-3 px-4 font-medium text-slate-700">Last Change</th>
                <th className="text-center py-3 px-4 font-medium text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((product) => {
                const competitor = competitors.find(c => c.id === product.competitorId);
                const data = getProductData(product);
                
                return (
                  <tr 
                    key={product.id} 
                    className="hover:bg-slate-50 cursor-pointer"
                    onClick={() => onProductClick(product)}
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-3">
                        <img 
                          src={product.imageUrl || '/placeholder-product.jpg'} 
                          alt={product.title}
                          className="w-12 h-12 rounded-lg object-cover border border-slate-200"
                        />
                        <div>
                          <p className="font-medium text-slate-900">{product.title}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-slate-500">
                              {product.title.includes('lithium') ? 'Portable lithium-ion jump starter' : 
                               product.title.includes('FUEL') ? 'M18 battery compatible unit' :
                               'Professional grade automotive jump starter'}
                            </span>
                            {'promo' in data && data.promo && (
                              <Badge variant="secondary" className="text-xs">
                                {data.promo}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <Badge className={`${getBrandColor(product.brand)} border-0`}>
                        {product.brand}
                      </Badge>
                    </td>
                    <td className="py-4 px-4 text-slate-600">{competitor?.name}</td>
                    <td className="py-4 px-4 text-right font-semibold text-slate-900">
                      ${data.current.toFixed(2)}
                    </td>
                    <td className="py-4 px-4 text-right text-sm text-slate-500">
                      ${data.min} / ${data.max}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <Badge variant={data.inStock ? "default" : "destructive"} className="text-xs">
                        {data.inStock ? "In Stock" : "Out of Stock"}
                      </Badge>
                    </td>
                    <td className="py-4 px-4 text-center text-xs text-slate-500">
                      {Math.floor(Math.random() * 24)}h ago
                    </td>
                    <td className="py-4 px-4 text-center">
                      <Button variant="ghost" size="sm" className="text-primary-600 hover:text-primary-700">
                        View
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <p className="text-sm text-slate-600">
            Showing 1-{filteredProducts.length} of {filteredProducts.length} products
          </p>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" disabled>
              Previous
            </Button>
            <Button variant="outline" size="sm">
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
