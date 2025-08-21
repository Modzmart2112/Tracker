import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Grid } from "lucide-react";

interface BrandCoverageData {
  brands: string[];
  competitors: Array<{ id: string; name: string; isUs: boolean }>;
  matrix: Array<{ brand: string; [competitorName: string]: any }>;
}

interface BrandCoverageMatrixProps {
  data: BrandCoverageData;
}

export function BrandCoverageMatrix({ data }: BrandCoverageMatrixProps) {
  const { brands, competitors, matrix } = data;

  return (
    <Card className="border-slate-200 shadow-sm mb-8">
      <CardHeader className="border-b border-slate-200">
        <CardTitle className="text-lg font-semibold text-slate-900">
          Brand Coverage Matrix
        </CardTitle>
        <p className="text-slate-600 text-sm mt-1">
          Compare which jump starter brands each competitor carries
        </p>
      </CardHeader>
      <CardContent className="p-6">
        {brands.length === 0 || competitors.length === 0 || matrix.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-slate-400 mb-4">
              <Grid size={48} className="mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">No brand coverage data</h3>
            <p className="text-slate-500 mb-4">
              Add competitors and scrape products to see brand coverage analysis
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 font-medium text-slate-700">Brand</th>
                  {competitors.map((competitor) => (
                    <th key={competitor.id} className="text-center py-3 px-4 font-medium text-slate-700">
                      {competitor.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {matrix.map((row) => {
                const isGapOpportunity = competitors.some(comp => 
                  !comp.isUs && row[comp.name] > 0
                ) && competitors.find(comp => comp.isUs && row[comp.name] === 0);

                return (
                  <tr 
                    key={row.brand} 
                    className={`hover:bg-slate-50 ${isGapOpportunity ? 'bg-red-50' : ''}`}
                  >
                    <td className="py-3 px-4 font-medium text-slate-900">
                      <div className="flex items-center">
                        {row.brand}
                        {isGapOpportunity && (
                          <Badge variant="destructive" className="ml-2 text-xs">
                            Gap Opportunity
                          </Badge>
                        )}
                      </div>
                    </td>
                    {competitors.map((competitor) => {
                      const count = row[competitor.name] || 0;
                      return (
                        <td key={competitor.id} className="py-3 px-4 text-center">
                          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold ${
                            count > 0 
                              ? 'bg-emerald-100 text-emerald-700' 
                              : 'bg-slate-100 text-slate-400'
                          }`}>
                            {count}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
