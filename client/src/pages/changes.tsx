import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { TrendingDown, TrendingUp, Package, Tag, Clock } from "lucide-react";

export default function Changes() {
  const [hoursFilter, setHoursFilter] = useState("24");
  const [typeFilter, setTypeFilter] = useState("all");

  const { data: recentChanges = [], isLoading } = useQuery({
    queryKey: ["/api/changes/recent", hoursFilter],
    queryFn: () => api.getRecentChanges(parseInt(hoursFilter)),
  });

  const { data: meta } = useQuery({
    queryKey: ["/api/meta"],
    queryFn: api.getMeta,
  });

  // Filter changes by type
  const filteredChanges = typeFilter && typeFilter !== "all"
    ? recentChanges.filter((change: any) => change.changeType === typeFilter)
    : recentChanges;

  const getChangeIcon = (changeType: string) => {
    switch (changeType) {
      case 'price_drop':
        return <TrendingDown className="text-red-600" size={16} />;
      case 'price_increase':
        return <TrendingUp className="text-blue-600" size={16} />;
      case 'stock_change':
        return <Package className="text-green-600" size={16} />;
      case 'promo_added':
        return <Tag className="text-yellow-600" size={16} />;
      default:
        return <Clock className="text-slate-600" size={16} />;
    }
  };

  const getChangeColor = (changeType: string) => {
    switch (changeType) {
      case 'price_drop':
        return 'bg-red-500';
      case 'price_increase':
        return 'bg-blue-500';
      case 'stock_change':
        return 'bg-green-500';
      case 'promo_added':
        return 'bg-yellow-500';
      default:
        return 'bg-slate-500';
    }
  };

  const getChangeBadge = (change: any) => {
    switch (change.changeType) {
      case 'price_drop':
        return {
          text: 'Price Drop',
          variant: 'destructive' as const,
          detail: `$${change.oldValue} → $${change.newValue}`
        };
      case 'price_increase':
        return {
          text: 'Price Increase',
          variant: 'default' as const,
          detail: `$${change.oldValue} → $${change.newValue}`
        };
      case 'stock_change':
        return {
          text: change.newValue === 'in_stock' ? 'Back in Stock' : 'Out of Stock',
          variant: 'default' as const,
          detail: ''
        };
      case 'promo_added':
        return {
          text: 'Promo Added',
          variant: 'secondary' as const,
          detail: change.newValue || ''
        };
      default:
        return {
          text: 'Change',
          variant: 'secondary' as const,
          detail: ''
        };
    }
  };

  const getChangeTypeStats = () => {
    const stats = recentChanges.reduce((acc: any, change: any) => {
      acc[change.changeType] = (acc[change.changeType] || 0) + 1;
      return acc;
    }, {});

    return [
      { type: 'price_drop', label: 'Price Drops', count: stats.price_drop || 0, color: 'text-red-600' },
      { type: 'price_increase', label: 'Price Increases', count: stats.price_increase || 0, color: 'text-blue-600' },
      { type: 'stock_change', label: 'Stock Changes', count: stats.stock_change || 0, color: 'text-green-600' },
      { type: 'promo_added', label: 'Promos Added', count: stats.promo_added || 0, color: 'text-yellow-600' },
    ];
  };

  const stats = getChangeTypeStats();

  return (
    <div className="flex-1 overflow-auto">
      <Header 
        title="Recent Changes"
        subtitle="Track price and stock updates across all competitors"
        showActions={false}
      />
      
      <div className="p-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat) => (
            <Card key={stat.type} className="border-slate-200 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-600 text-sm font-medium">{stat.label}</p>
                    <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.count}</p>
                  </div>
                  <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                    {getChangeIcon(stat.type)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card className="border-slate-200 shadow-sm mb-6">
          <CardHeader className="border-b border-slate-200">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-slate-900">
                Change History
              </CardTitle>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-slate-700">Time Period:</label>
                  <Select value={hoursFilter} onValueChange={setHoursFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Last Hour</SelectItem>
                      <SelectItem value="6">Last 6 Hours</SelectItem>
                      <SelectItem value="24">Last 24 Hours</SelectItem>
                      <SelectItem value="72">Last 3 Days</SelectItem>
                      <SelectItem value="168">Last Week</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-slate-700">Change Type:</label>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="price_drop">Price Drops</SelectItem>
                      <SelectItem value="price_increase">Price Increases</SelectItem>
                      <SelectItem value="stock_change">Stock Changes</SelectItem>
                      <SelectItem value="promo_added">Promos Added</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="flex items-start space-x-3 p-3 bg-slate-100 rounded-lg">
                      <div className="w-2 h-2 bg-slate-300 rounded-full mt-2"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-slate-300 rounded w-3/4"></div>
                        <div className="h-3 bg-slate-300 rounded w-1/2"></div>
                        <div className="flex space-x-2">
                          <div className="h-6 bg-slate-300 rounded w-20"></div>
                          <div className="h-6 bg-slate-300 rounded w-24"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredChanges.length > 0 ? (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {filteredChanges.map((change: any) => {
                  const badge = getChangeBadge(change);
                  return (
                    <div key={change.id} className="flex items-start space-x-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                      <div className={`flex-shrink-0 w-2 h-2 ${getChangeColor(change.changeType)} rounded-full mt-2`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900">{change.productTitle}</p>
                        <p className="text-sm text-slate-600">{change.competitorName}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant={badge.variant} className="text-xs">
                            {badge.text}
                          </Badge>
                          {badge.detail && (
                            <span className="text-xs font-mono text-slate-500">{badge.detail}</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          {formatDistanceToNow(new Date(change.timestamp), { addSuffix: true })}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        {getChangeIcon(change.changeType)}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <Clock className="mx-auto h-12 w-12 text-slate-400 mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">
                  {typeFilter ? `No ${typeFilter.replace('_', ' ')} changes` : 'No Recent Changes'}
                </h3>
                <p className="text-slate-500 mb-4">
                  {typeFilter 
                    ? `No ${typeFilter.replace('_', ' ')} found in the selected time period.`
                    : `No changes detected in the last ${hoursFilter} hours.`
                  }
                </p>
                {typeFilter && (
                  <Button variant="outline" onClick={() => setTypeFilter("")}>
                    Show All Changes
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
