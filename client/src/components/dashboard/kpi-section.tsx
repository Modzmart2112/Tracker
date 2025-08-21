import { Card, CardContent } from "@/components/ui/card";
import { TrendingDown, Clock, Package, Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface KPIMetrics {
  brandCoverage: string;
  priceUndercuts: number;
  priceChanges: number;
  stockChanges: number;
}

interface KPISectionProps {
  metrics: KPIMetrics;
}

export function KPISection({ metrics }: KPISectionProps) {
  const kpis = [
    {
      label: "Brand Coverage",
      value: metrics.brandCoverage,
      subtitle: "vs Sydney Tools",
      icon: Award,
      badge: { text: "66.7% match", variant: "default" as const },
      iconColor: "text-blue-600",
      iconBg: "bg-blue-100"
    },
    {
      label: "Price Undercuts",
      value: metrics.priceUndercuts,
      subtitle: "products cheaper elsewhere",
      icon: TrendingDown,
      badge: { text: "15.3% of catalog", variant: "destructive" as const },
      iconColor: "text-red-600",
      iconBg: "bg-red-100"
    },
    {
      label: "Price Changes (24h)",
      value: metrics.priceChanges,
      subtitle: "across all competitors",
      icon: Clock,
      badge: { text: "8 drops, 8 increases", variant: "secondary" as const },
      iconColor: "text-yellow-600",
      iconBg: "bg-yellow-100"
    },
    {
      label: "Stock Changes",
      value: metrics.stockChanges,
      subtitle: "out of stock changes",
      icon: Package,
      badge: { text: "3 back in stock", variant: "default" as const },
      iconColor: "text-purple-600",
      iconBg: "bg-purple-100"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        return (
          <Card key={kpi.label} className="border-slate-200 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 text-sm font-medium">{kpi.label}</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{kpi.value}</p>
                  <p className="text-xs text-slate-500 mt-1">{kpi.subtitle}</p>
                </div>
                <div className={`w-12 h-12 ${kpi.iconBg} rounded-lg flex items-center justify-center`}>
                  <Icon className={kpi.iconColor} size={20} />
                </div>
              </div>
              <div className="mt-4">
                <Badge variant={kpi.badge.variant} className="text-xs">
                  {kpi.badge.text}
                </Badge>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
