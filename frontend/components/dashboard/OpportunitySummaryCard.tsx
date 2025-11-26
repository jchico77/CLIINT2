import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, TrendingUp, TrendingDown, Minus, Target, Briefcase } from 'lucide-react';
import type { OpportunitySummarySection } from '@/lib/types';

interface OpportunitySummaryCardProps {
  data: OpportunitySummarySection;
}

export function OpportunitySummaryCard({ data }: OpportunitySummaryCardProps) {
  const getTrendIcon = (trend?: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-3 w-3 text-primary" />;
      case 'down':
        return <TrendingDown className="h-3 w-3 text-destructive" />;
      case 'stable':
        return <Minus className="h-3 w-3 text-muted-foreground" />;
      default:
        return null;
    }
  };

  const getImportanceVariant = (importance?: 'high' | 'medium' | 'low'): "default" | "secondary" | "destructive" | "outline" => {
    switch (importance) {
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
          <Briefcase className="h-3 w-3" />
          <CardTitle className="text-sm">Resumen de Oportunidad</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-3">
        {/* Client Basic Info */}
        <div className="flex items-center justify-between pb-2 border-b">
          <div>
            <div className="flex items-center gap-2">
              <Building2 className="h-3 w-3 text-muted-foreground" />
              <span className="font-semibold text-sm">{data.companyName}</span>
              <Badge variant="secondary" className="text-xs">{data.industry}</Badge>
            </div>
            {data.headquarters && (
              <p className="text-xs text-muted-foreground mt-1">{data.headquarters}</p>
            )}
          </div>
        </div>

        {/* Opportunity Brief */}
        <div>
          <div className="flex items-center gap-1 mb-1">
            <Target className="h-3 w-3 text-muted-foreground" />
            <p className="text-xs font-medium text-muted-foreground">Oportunidad</p>
          </div>
          <p className="text-xs leading-relaxed">{data.opportunityBrief}</p>
        </div>

        {/* Client KPIs */}
        {data.clientKPIs.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">KPIs Cliente</p>
            <div className="grid grid-cols-2 gap-2">
              {data.clientKPIs.map((kpi, idx) => (
                <div key={idx} className="border rounded p-2 bg-muted/30">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-muted-foreground">{kpi.label}</p>
                    {getTrendIcon(kpi.trend)}
                  </div>
                  <p className="text-sm font-bold">{kpi.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Opportunity KPIs */}
        {data.opportunityKPIs.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">KPIs Oportunidad</p>
            <div className="grid grid-cols-2 gap-2">
              {data.opportunityKPIs.map((kpi, idx) => (
                <div key={idx} className="border rounded p-2">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-muted-foreground">{kpi.label}</p>
                    {kpi.importance && (
                      <Badge variant={getImportanceVariant(kpi.importance)} className="text-xs">
                        {kpi.importance}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm font-bold">{kpi.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

