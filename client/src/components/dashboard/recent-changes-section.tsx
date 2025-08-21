import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

interface RecentChange {
  id: string;
  productTitle: string;
  competitorName: string;
  changeType: string;
  oldValue?: string;
  newValue?: string;
  timestamp: Date;
}

interface RecentChangesSectionProps {
  changes: RecentChange[];
}

export function RecentChangesSection({ changes }: RecentChangesSectionProps) {
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

  const getChangeBadge = (change: RecentChange) => {
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

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="border-b border-slate-200">
        <CardTitle className="text-lg font-semibold text-slate-900">
          Recent Changes (24h)
        </CardTitle>
        <p className="text-slate-600 text-sm mt-1">
          Price and stock updates across competitors
        </p>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {changes.length > 0 ? (
            changes.map((change) => {
              const badge = getChangeBadge(change);
              return (
                <div key={change.id} className="flex items-start space-x-3 p-3 bg-slate-50 rounded-lg">
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
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 text-slate-500">
              <p>No recent changes</p>
              <p className="text-sm mt-1">Changes will appear here when products are updated</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
