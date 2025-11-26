import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Calendar, BarChart3 } from 'lucide-react';
import type { MarketContextSection } from '@/lib/types';

interface MarketContextCardProps {
  data: MarketContextSection;
}

export function MarketContextCard({ data }: MarketContextCardProps) {
  const getImpactVariant = (impact: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (impact) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'outline';
      default:
        return 'outline';
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-3 w-3" />
          <CardTitle className="text-sm">Market Context</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <div className="space-y-2">
          {data.marketSize && (
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 rounded border bg-muted/50">
                <p className="text-xs text-muted-foreground">Mercado</p>
                <p className="text-sm font-bold">{data.marketSize}</p>
              </div>
              {data.growthRate && (
                <div className="p-2 rounded border bg-muted/50">
                  <p className="text-xs text-muted-foreground">Crecimiento</p>
                  <p className="text-sm font-bold">{data.growthRate}</p>
                </div>
              )}
            </div>
          )}

          {data.industryTrends.length > 0 && (
            <div className="space-y-1">
              {data.industryTrends.slice(0, 3).map((trend, idx) => (
                <div key={idx} className="border rounded p-2 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">{trend.trend}</span>
                    <Badge variant={getImpactVariant(trend.impact)} className="text-xs">
                      {trend.impact}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1">{trend.description}</p>
                </div>
              ))}
            </div>
          )}

          {data.recentEvents.length > 0 && (
            <div className="space-y-1">
              {data.recentEvents.slice(0, 2).map((event, idx) => (
                <div key={idx} className="border-l-2 border-primary pl-2 py-1 text-xs">
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className="text-muted-foreground">{event.date}</span>
                    <span className="font-medium">{event.event}</span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1">{event.significance}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

