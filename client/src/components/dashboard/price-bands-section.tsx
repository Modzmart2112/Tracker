import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PriceBand {
  id: string;
  brand: string;
  entryPrice: string;
  proPrice: string;
  productCount: number;
  competitorId: string;
}

interface PriceBandsSectionProps {
  bands: PriceBand[];
}

export function PriceBandsSection({ bands }: PriceBandsSectionProps) {
  // Group bands by brand and find lowest prices
  const brandBands = bands.reduce((acc, band) => {
    if (!acc[band.brand]) {
      acc[band.brand] = [];
    }
    acc[band.brand].push(band);
    return acc;
  }, {} as Record<string, PriceBand[]>);

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="border-b border-slate-200">
        <CardTitle className="text-lg font-semibold text-slate-900">
          Price Bands Analysis
        </CardTitle>
        <p className="text-slate-600 text-sm mt-1">
          Entry vs Professional tier pricing by brand
        </p>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          {Object.entries(brandBands).slice(0, 3).map(([brand, brandBandList]) => {
            const totalProducts = brandBandList.reduce((sum, band) => sum + band.productCount, 0);
            const entryPrices = brandBandList.map(b => parseFloat(b.entryPrice || "0")).filter(p => p > 0);
            const proPrices = brandBandList.map(b => parseFloat(b.proPrice || "0")).filter(p => p > 0);
            
            const lowestEntry = Math.min(...entryPrices);
            const lowestPro = Math.min(...proPrices);

            return (
              <div key={brand} className="border-b border-slate-100 pb-4 last:border-b-0">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-slate-900">{brand}</h3>
                  <span className="text-xs text-slate-500">{totalProducts} products tracked</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <p className="text-xs text-blue-600 font-medium">Entry Tier (25%)</p>
                    <p className="text-lg font-bold text-blue-900 mt-1">
                      ${lowestEntry > 0 ? lowestEntry.toFixed(0) : 'N/A'}
                    </p>
                    <p className="text-xs text-blue-600">Lowest available</p>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <p className="text-xs text-purple-600 font-medium">Pro Tier (75%)</p>
                    <p className="text-lg font-bold text-purple-900 mt-1">
                      ${lowestPro > 0 ? lowestPro.toFixed(0) : 'N/A'}
                    </p>
                    <p className="text-xs text-purple-600">Lowest available</p>
                  </div>
                </div>
              </div>
            );
          })}
          
          {Object.keys(brandBands).length === 0 && (
            <div className="text-center py-8 text-slate-500">
              <p>No price band data available</p>
              <p className="text-sm mt-1">Run scraping to collect pricing data</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
