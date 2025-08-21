import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingDown, TrendingUp, Minus, DollarSign, ShoppingCart } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function PriceComparison() {
  const { data: unifiedData, isLoading, error } = useQuery({
    queryKey: ["/api/products-unified"],
  });

  // Process unified products to find price comparisons
  // Products with competitorListings have price comparisons available
  const productsWithComparisons = unifiedData?.filter((product: any) => {
    // Must have a price and competitor listings to compare
    return product.price && product.competitorListings?.length > 0;
  }) || [];

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-bold">Price Comparison</h1>
        <div className="grid gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-red-500">Error loading price comparisons</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Price Comparison</h1>
        <Badge variant="secondary" className="text-lg px-4 py-2">
          {productsWithComparisons.length} Matched Products
        </Badge>
      </div>

      {productsWithComparisons.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <DollarSign className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">No products with price comparisons available</p>
            <p className="text-sm text-gray-400 mt-2">Import products from competitors to see price comparisons</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {productsWithComparisons.map((product: any) => {
            const ourPrice = parseFloat(product.price) || 0;
            const competitorListing = product.competitorListings?.[0];
            const competitorPrice = competitorListing?.latestSnapshot?.price ? parseFloat(competitorListing.latestSnapshot.price) : 0;
            const competitorName = competitorListing?.competitorName || "Competitor";
            const priceDiff = competitorPrice - ourPrice;
            const percentDiff = ourPrice > 0 ? ((priceDiff / ourPrice) * 100) : 0;
            
            return (
              <Card key={product.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{product.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-2">
                        {product.modelNumber && <Badge variant="outline">{product.modelNumber}</Badge>}
                        {product.brandName && <Badge variant="secondary">{product.brandName}</Badge>}
                      </div>
                    </div>
                    {priceDiff > 0 && (
                      <Badge className="bg-green-500 text-white">
                        Save ${priceDiff.toFixed(2)}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Sydney Tools Price */}
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Sydney Tools</span>
                        {priceDiff > 0 && <Badge className="bg-green-100 text-green-800">Best Price</Badge>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold">${ourPrice.toFixed(2)}</span>
                        {priceDiff > 0 && (
                          <TrendingDown className="w-5 h-5 text-green-500" />
                        )}
                      </div>
                    </div>
                    
                    {/* Competitor Prices */}
                    {product.competitorListings?.map((listing: any, idx: number) => {
                      const listingPrice = listing.latestSnapshot?.price ? parseFloat(listing.latestSnapshot.price) : 0;
                      return (
                        <div key={idx} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                              {listing.competitorName || "Competitor"}
                            </span>
                            {listingPrice > ourPrice && (
                              <Badge className="bg-red-100 text-red-800">Higher</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold">${listingPrice.toFixed(2)}</span>
                            {priceDiff !== 0 && idx === 0 && (
                              <span className={`text-sm ${priceDiff > 0 ? 'text-red-500' : 'text-green-500'}`}>
                                {priceDiff > 0 ? '+' : ''}{percentDiff.toFixed(1)}%
                              </span>
                            )}
                          </div>
                          <a 
                            href={listing.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-blue-500 hover:underline mt-1 inline-block"
                          >
                            View Product →
                          </a>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Price Difference Summary */}
                  {priceDiff !== 0 && (
                    <div className={`mt-4 p-3 rounded-lg ${priceDiff > 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} border`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {priceDiff > 0 ? (
                            <>
                              <TrendingDown className="w-4 h-4 text-green-600" />
                              <span className="text-sm font-medium text-green-800">
                                Sydney Tools is ${Math.abs(priceDiff).toFixed(2)} cheaper
                              </span>
                            </>
                          ) : (
                            <>
                              <TrendingUp className="w-4 h-4 text-red-600" />
                              <span className="text-sm font-medium text-red-800">
                                Competitor is ${Math.abs(priceDiff).toFixed(2)} cheaper
                              </span>
                            </>
                          )}
                        </div>
                        <Badge variant={priceDiff > 0 ? "default" : "destructive"}>
                          {Math.abs(percentDiff).toFixed(1)}% {priceDiff > 0 ? 'savings' : 'more'}
                        </Badge>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}