import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingDown, TrendingUp, Search, Filter, ExternalLink, ChevronUp, ChevronDown, Package, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ComparisonRow {
  id: string;
  name: string;
  modelNumber?: string;
  brand?: string;
  ourPrice: number;
  competitors: {
    name: string;
    price: number;
    url: string;
    inStock?: boolean;
  }[];
  savings: number;
  savingsPercent: number;
  lowestPrice: number;
  highestPrice: number;
}

export default function PriceComparison() {
  const [searchTerm, setSearchTerm] = useState("");
  const [brandFilter, setBrandFilter] = useState("all");
  const [sortBy, setSortBy] = useState("savings");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const { data: unifiedData, isLoading, error } = useQuery({
    queryKey: ["/api/products-unified"],
  });

  // Process data into comparison rows
  const comparisonData = useMemo(() => {
    if (!unifiedData) return [];

    return unifiedData
      .filter((product: any) => product.price && product.competitorListings?.length > 0)
      .map((product: any) => {
        const ourPrice = parseFloat(product.price) || 0;
        const competitors = product.competitorListings.map((listing: any) => ({
          name: listing.competitorName || "Unknown",
          price: listing.latestSnapshot?.price ? parseFloat(listing.latestSnapshot.price) : 0,
          url: listing.url || "#",
          inStock: listing.latestSnapshot?.inStock !== false,
        }));

        const competitorPrices = competitors.map((c: any) => c.price).filter((p: number) => p > 0);
        const lowestCompetitorPrice = competitorPrices.length > 0 ? Math.min(...competitorPrices) : ourPrice;
        const highestCompetitorPrice = competitorPrices.length > 0 ? Math.max(...competitorPrices) : ourPrice;
        
        const savings = lowestCompetitorPrice - ourPrice;
        const savingsPercent = ourPrice > 0 ? ((savings / ourPrice) * 100) : 0;

        return {
          id: product.id,
          name: product.name,
          modelNumber: product.modelNumber,
          brand: product.brand || product.brandName || "Unknown",
          ourPrice,
          competitors,
          savings,
          savingsPercent,
          lowestPrice: Math.min(ourPrice, lowestCompetitorPrice),
          highestPrice: Math.max(ourPrice, highestCompetitorPrice),
        } as ComparisonRow;
      });
  }, [unifiedData]);

  // Get unique brands for filter
  const brands = useMemo(() => {
    const uniqueBrands = new Set(comparisonData.map(p => p.brand));
    return Array.from(uniqueBrands).sort();
  }, [comparisonData]);

  // Filter and sort data
  const filteredData = useMemo(() => {
    let filtered = comparisonData.filter(row => {
      const matchesSearch = searchTerm === "" || 
        row.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (row.modelNumber && row.modelNumber.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesBrand = brandFilter === "all" || row.brand === brandFilter;
      
      return matchesSearch && matchesBrand;
    });

    // Sort data
    switch (sortBy) {
      case "savings":
        return filtered.sort((a, b) => b.savings - a.savings);
      case "price-low":
        return filtered.sort((a, b) => a.ourPrice - b.ourPrice);
      case "price-high":
        return filtered.sort((a, b) => b.ourPrice - a.ourPrice);
      case "name":
        return filtered.sort((a, b) => a.name.localeCompare(b.name));
      default:
        return filtered;
    }
  }, [comparisonData, searchTerm, brandFilter, sortBy]);

  const toggleRowExpansion = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-full" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <Card>
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-red-500" />
            <p className="text-red-500">Error loading price comparisons</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalSavings = filteredData.reduce((sum, row) => sum + (row.savings > 0 ? row.savings : 0), 0);
  const averageSavings = filteredData.length > 0 ? (totalSavings / filteredData.length) : 0;

  return (
    <div className="p-4 space-y-4">
      {/* Header with stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">Price Comparison</h1>
          <p className="text-sm text-gray-500">{filteredData.length} products with competitor pricing</p>
        </div>
        <div className="flex gap-3">
          <Card className="px-3 py-2">
            <div className="text-xs text-gray-500">Avg Savings</div>
            <div className="font-bold text-green-600">${averageSavings.toFixed(2)}</div>
          </Card>
          <Card className="px-3 py-2">
            <div className="text-xs text-gray-500">Total Products</div>
            <div className="font-bold">{filteredData.length}</div>
          </Card>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Select value={brandFilter} onValueChange={setBrandFilter}>
            <SelectTrigger className="w-full sm:w-[150px] h-9">
              <SelectValue placeholder="All Brands" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Brands</SelectItem>
              {brands.map(brand => (
                <SelectItem key={brand} value={brand}>{brand}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-[150px] h-9">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="savings">Best Savings</SelectItem>
              <SelectItem value="price-low">Price: Low to High</SelectItem>
              <SelectItem value="price-high">Price: High to Low</SelectItem>
              <SelectItem value="name">Name</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Comparison Table */}
      {filteredData.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Package className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p className="text-gray-500">No products match your filters</p>
            <p className="text-xs text-gray-400 mt-1">Try adjusting your search or filters</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800 text-xs uppercase text-gray-600 dark:text-gray-400">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Product</th>
                  <th className="px-3 py-2 text-center font-medium hidden sm:table-cell">Brand</th>
                  <th className="px-3 py-2 text-right font-medium">Our Price</th>
                  <th className="px-3 py-2 text-center font-medium hidden md:table-cell">Competitors</th>
                  <th className="px-3 py-2 text-right font-medium">Savings</th>
                  <th className="px-3 py-2 text-center font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredData.map((row) => {
                  const isExpanded = expandedRows.has(row.id);
                  const hasMultipleCompetitors = row.competitors.length > 1;
                  
                  return (
                    <>
                      <tr 
                        key={row.id} 
                        className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        <td className="px-3 py-2">
                          <div className="min-w-[200px]">
                            <div className="font-medium text-sm line-clamp-1">{row.name}</div>
                            {row.modelNumber && (
                              <div className="text-xs text-gray-500">{row.modelNumber}</div>
                            )}
                            <div className="sm:hidden text-xs text-gray-500 mt-1">{row.brand}</div>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-center hidden sm:table-cell">
                          <Badge variant="outline" className="text-xs">{row.brand}</Badge>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <div className="font-bold text-sm">${row.ourPrice.toFixed(2)}</div>
                          {row.ourPrice === row.lowestPrice && (
                            <Badge className="bg-green-100 text-green-700 text-xs mt-1">Best</Badge>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center hidden md:table-cell">
                          <div className="flex items-center justify-center gap-1">
                            {row.competitors.slice(0, 2).map((comp, idx) => (
                              <TooltipProvider key={idx}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge 
                                      variant={comp.price > row.ourPrice ? "default" : "destructive"}
                                      className="text-xs cursor-help"
                                    >
                                      ${comp.price.toFixed(0)}
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{comp.name}: ${comp.price.toFixed(2)}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ))}
                            {row.competitors.length > 2 && (
                              <Badge variant="outline" className="text-xs">+{row.competitors.length - 2}</Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right">
                          {row.savings > 0 ? (
                            <div className="flex items-center justify-end gap-1">
                              <TrendingDown className="w-3 h-3 text-green-600" />
                              <div>
                                <div className="font-bold text-sm text-green-600">
                                  ${row.savings.toFixed(2)}
                                </div>
                                <div className="text-xs text-green-600">
                                  {row.savingsPercent.toFixed(0)}% less
                                </div>
                              </div>
                            </div>
                          ) : row.savings < 0 ? (
                            <div className="flex items-center justify-end gap-1">
                              <TrendingUp className="w-3 h-3 text-red-600" />
                              <div>
                                <div className="font-bold text-sm text-red-600">
                                  +${Math.abs(row.savings).toFixed(2)}
                                </div>
                                <div className="text-xs text-red-600">
                                  {Math.abs(row.savingsPercent).toFixed(0)}% more
                                </div>
                              </div>
                            </div>
                          ) : (
                            <Badge variant="outline" className="text-xs">Same</Badge>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleRowExpansion(row.id)}
                            className="h-7 px-2"
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-3 w-3" />
                            ) : (
                              <ChevronDown className="h-3 w-3" />
                            )}
                          </Button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={6} className="px-3 py-2 bg-gray-50 dark:bg-gray-800">
                            <div className="space-y-2">
                              <div className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                Competitor Pricing Details
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                {row.competitors.map((comp, idx) => (
                                  <div 
                                    key={idx} 
                                    className={`p-2 rounded border ${
                                      comp.price > row.ourPrice 
                                        ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' 
                                        : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-xs font-medium">{comp.name}</span>
                                      {comp.inStock !== false && (
                                        <Badge className="bg-green-100 text-green-700 text-xs">In Stock</Badge>
                                      )}
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span className="font-bold">${comp.price.toFixed(2)}</span>
                                      <a 
                                        href={comp.url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-blue-500 hover:text-blue-700"
                                      >
                                        <ExternalLink className="h-3 w-3" />
                                      </a>
                                    </div>
                                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                      {comp.price > row.ourPrice 
                                        ? `$${(comp.price - row.ourPrice).toFixed(2)} more expensive`
                                        : comp.price < row.ourPrice 
                                        ? `$${(row.ourPrice - comp.price).toFixed(2)} cheaper`
                                        : 'Same price'
                                      }
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}