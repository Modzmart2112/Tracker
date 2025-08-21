import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Package, Store, Activity, AlertCircle, ArrowUpRight, ArrowDownRight, DollarSign } from "lucide-react";
import { Link } from "wouter";

export default function Dashboard() {
  const { data: meta } = useQuery({
    queryKey: ["/api/meta"],
    queryFn: api.getMeta,
  });

  const { data: kpiMetrics } = useQuery({
    queryKey: ["/api/kpi"],
    queryFn: api.getKPIMetrics,
  });

  const { data: recentChanges = [] } = useQuery({
    queryKey: ["/api/changes/recent"],
    queryFn: () => api.getRecentChanges(48), // Last 48 hours for more context
  });

  const { data: allProducts = [] } = useQuery({
    queryKey: ["/api/products"],
    queryFn: () => api.getProducts({}),
  });

  // Group changes by competitor
  const changesByCompetitor = recentChanges.reduce((acc: any, change: any) => {
    if (!acc[change.competitorName]) {
      acc[change.competitorName] = [];
    }
    acc[change.competitorName].push(change);
    return acc;
  }, {});

  // Calculate competitor stats
  const competitorStats = meta?.competitors?.map((comp: any) => {
    const competitorProducts = allProducts.filter((p: any) => p.competitorId === comp.id);
    const competitorChanges = changesByCompetitor[comp.name] || [];
    const priceDrops = competitorChanges.filter((c: any) => c.changeType === 'price_drop').length;
    const priceIncreases = competitorChanges.filter((c: any) => c.changeType === 'price_increase').length;
    
    return {
      ...comp,
      productCount: competitorProducts.length,
      priceDrops,
      priceIncreases,
      totalChanges: competitorChanges.length,
      lastActivity: competitorChanges[0]?.timestamp || null
    };
  }) || [];

  // Get recent important price changes
  const importantPriceChanges = recentChanges
    .filter((c: any) => c.changeType === 'price_drop' || c.changeType === 'price_increase')
    .slice(0, 10);

  return (
    <div className="flex-1 overflow-auto">
      <Header 
        title="Competitor Overview"
        subtitle="Monitor all competitors and important price changes"
        showActions={false}
      />
      
      <div className="p-8 space-y-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-slate-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 text-sm font-medium">Total Competitors</p>
                  <p className="text-3xl font-bold text-slate-900">{meta?.competitors?.length || 0}</p>
                </div>
                <Store className="text-blue-600" size={24} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 text-sm font-medium">Products Tracked</p>
                  <p className="text-3xl font-bold text-slate-900">{allProducts.length}</p>
                </div>
                <Package className="text-green-600" size={24} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 text-sm font-medium">Price Changes (48h)</p>
                  <p className="text-3xl font-bold text-slate-900">{recentChanges.length}</p>
                </div>
                <Activity className="text-orange-600" size={24} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 text-sm font-medium">Avg Price</p>
                  <p className="text-3xl font-bold text-slate-900">
                    ${allProducts.length > 0 
                      ? (allProducts.reduce((sum: number, p: any) => sum + (p.currentPrice || 0), 0) / allProducts.length).toFixed(0)
                      : '0'}
                  </p>
                </div>
                <DollarSign className="text-purple-600" size={24} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Competitor Overview Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* All Competitors */}
          <Card className="border-slate-200">
            <CardHeader className="border-b border-slate-200">
              <CardTitle className="text-lg font-semibold text-slate-900">
                Your Competitors
              </CardTitle>
              <p className="text-slate-600 text-sm mt-1">
                Activity summary for each competitor
              </p>
            </CardHeader>
            <CardContent className="p-6">
              {competitorStats.length > 0 ? (
                <div className="space-y-3">
                  {competitorStats.map((comp: any) => (
                    <div key={comp.id} className="p-4 bg-slate-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-slate-900">{comp.name}</h4>
                        <Link href={`/competitors/${comp.id}`}>
                          <Button variant="ghost" size="sm">
                            View Details
                          </Button>
                        </Link>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-slate-500">Products</p>
                          <p className="font-semibold text-slate-900">{comp.productCount}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Price Drops</p>
                          <p className="font-semibold text-red-600">{comp.priceDrops}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Price Increases</p>
                          <p className="font-semibold text-green-600">{comp.priceIncreases}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500">
                  <Store size={48} className="mx-auto mb-4 text-slate-400" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">No competitors added</h3>
                  <p className="text-sm">Add competitors to start tracking their prices</p>
                  <Link href="/competitors">
                    <Button variant="outline" size="sm" className="mt-4">
                      Add Competitors
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Important Price Changes */}
          <Card className="border-slate-200">
            <CardHeader className="border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold text-slate-900">
                    Important Price Changes
                  </CardTitle>
                  <p className="text-slate-600 text-sm mt-1">
                    Last 48 hours activity
                  </p>
                </div>
                <Link href="/changes">
                  <Button variant="ghost" size="sm">
                    View All
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {importantPriceChanges.length > 0 ? (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {importantPriceChanges.map((change: any) => (
                    <div key={change.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-slate-900 text-sm">{change.productTitle}</p>
                        <p className="text-xs text-slate-500">{change.competitorName}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {change.changeType === 'price_drop' ? (
                          <ArrowDownRight className="text-red-500" size={16} />
                        ) : (
                          <ArrowUpRight className="text-green-500" size={16} />
                        )}
                        <Badge 
                          variant={change.changeType === 'price_drop' ? 'destructive' : 'default'}
                        >
                          ${change.newValue}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <Activity size={32} className="mx-auto mb-3 text-slate-400" />
                  <p>No price changes detected</p>
                  <p className="text-sm mt-1">Price changes will appear here when detected</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
