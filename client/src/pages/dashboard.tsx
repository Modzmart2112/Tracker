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
    <div className="flex-1 overflow-auto bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <Header 
        title="Competitor Overview"
        subtitle="Real-time monitoring of all competitors and market dynamics"
        showActions={false}
      />
      
      <div className="p-8 space-y-8 max-w-7xl mx-auto">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="relative border-0 shadow-lg bg-gradient-to-br from-[#CB0000] to-red-800 text-white overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
            <CardContent className="p-6 relative">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-100 text-sm font-medium uppercase tracking-wider">Total Competitors</p>
                  <p className="text-4xl font-bold mt-2">{meta?.competitors?.length || 0}</p>
                  <div className="h-0.5 w-8 bg-white mt-2" />
                </div>
                <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
                  <Store className="text-white" size={24} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative border-0 shadow-lg bg-gradient-to-br from-gray-800 to-black text-white overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
            <CardContent className="p-6 relative">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-300 text-sm font-medium uppercase tracking-wider">Products Tracked</p>
                  <p className="text-4xl font-bold mt-2">{allProducts.length}</p>
                  <div className="h-0.5 w-8 bg-gray-400 mt-2" />
                </div>
                <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
                  <Package className="text-white" size={24} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative border-0 shadow-lg bg-gradient-to-br from-gray-700 to-gray-900 text-white overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
            <CardContent className="p-6 relative">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-300 text-sm font-medium uppercase tracking-wider">Price Changes</p>
                  <p className="text-4xl font-bold mt-2">{recentChanges.length}</p>
                  <p className="text-xs text-gray-400 mt-1">Last 48 hours</p>
                </div>
                <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
                  <Activity className="text-white" size={24} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative border-0 shadow-lg bg-gradient-to-br from-white to-gray-100 text-black overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#CB0000]/10 rounded-full -mr-16 -mt-16" />
            <CardContent className="p-6 relative">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-700 text-sm font-medium uppercase tracking-wider">Average Price</p>
                  <p className="text-4xl font-bold mt-2">
                    ${allProducts.length > 0 
                      ? (allProducts.reduce((sum: number, p: any) => sum + (p.currentPrice || 0), 0) / allProducts.length).toFixed(0)
                      : '0'}
                  </p>
                  <div className="h-0.5 w-8 bg-[#CB0000] mt-2" />
                </div>
                <div className="p-3 bg-[#CB0000]/20 rounded-lg backdrop-blur-sm">
                  <DollarSign className="text-[#CB0000]" size={24} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Competitor Overview Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* All Competitors */}
          <Card className="border-0 shadow-xl bg-white">
            <CardHeader className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
              <CardTitle className="text-lg font-semibold text-black">
                Your Competitors
              </CardTitle>
              <p className="text-gray-600 text-sm mt-1">
                Activity summary for each competitor
              </p>
            </CardHeader>
            <CardContent className="p-6">
              {competitorStats.length > 0 ? (
                <div className="space-y-3">
                  {competitorStats.map((comp: any) => (
                    <div key={comp.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-black">{comp.name}</h4>
                        <Link href={`/competitors/${comp.id}`}>
                          <Button variant="ghost" size="sm" className="hover:bg-[#CB0000]/10 hover:text-[#CB0000]">
                            View Details
                          </Button>
                        </Link>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Products</p>
                          <p className="font-semibold text-black">{comp.productCount}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Price Drops</p>
                          <p className="font-semibold text-green-600">{comp.priceDrops}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Price Increases</p>
                          <p className="font-semibold text-[#CB0000]">{comp.priceIncreases}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Store size={48} className="mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium text-black mb-2">No competitors added</h3>
                  <p className="text-sm">Add competitors to start tracking their prices</p>
                  <Link href="/competitors">
                    <Button variant="outline" size="sm" className="mt-4 border-[#CB0000] text-[#CB0000] hover:bg-[#CB0000] hover:text-white">
                      Add Competitors
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Important Price Changes */}
          <Card className="border-0 shadow-xl bg-white">
            <CardHeader className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold text-black">
                    Important Price Changes
                  </CardTitle>
                  <p className="text-gray-600 text-sm mt-1">
                    Last 48 hours activity
                  </p>
                </div>
                <Link href="/changes">
                  <Button variant="ghost" size="sm" className="hover:bg-[#CB0000]/10 hover:text-[#CB0000]">
                    View All
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {importantPriceChanges.length > 0 ? (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {importantPriceChanges.map((change: any) => (
                    <div key={change.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex-1">
                        <p className="font-medium text-black text-sm">{change.productTitle}</p>
                        <p className="text-xs text-gray-500">{change.competitorName}</p>
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
                <div className="text-center py-8 text-gray-500">
                  <Activity size={32} className="mx-auto mb-3 text-gray-400" />
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
