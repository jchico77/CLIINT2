import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Users, DollarSign, MapPin } from 'lucide-react';
import type { AccountSnapshotSection } from '@/lib/types';

interface AccountSnapshotCardProps {
  data: AccountSnapshotSection;
  compact?: boolean;
}

export function AccountSnapshotCard({ data, compact = false }: AccountSnapshotCardProps) {
  if (compact) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Account Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <h3 className="font-semibold text-lg">{data.companyName}</h3>
              <Badge variant="secondary" className="mt-1">{data.industry}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {data.employeeCount && (
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Empleados</p>
                    <p className="text-sm font-semibold">{data.employeeCount}</p>
                  </div>
                </div>
              )}
              {data.revenue && (
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Ingresos</p>
                    <p className="text-sm font-semibold">{data.revenue}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account Snapshot</CardTitle>
        <CardDescription>Resumen de la cuenta</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div>
            <h3 className="text-2xl font-bold">{data.companyName}</h3>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary">{data.industry}</Badge>
              {data.headquarters && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span>{data.headquarters}</span>
                </div>
              )}
            </div>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed">{data.description}</p>

          <div className="grid grid-cols-3 gap-4">
            {data.headquarters && (
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <MapPin className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Sede</p>
                  <p className="text-sm font-semibold">{data.headquarters}</p>
                </div>
              </div>
            )}
            {data.employeeCount && (
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Empleados</p>
                  <p className="text-sm font-semibold">{data.employeeCount}</p>
                </div>
              </div>
            )}
            {data.revenue && (
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <DollarSign className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Ingresos</p>
                  <p className="text-sm font-semibold">{data.revenue}</p>
                </div>
              </div>
            )}
          </div>

          {data.keyMetrics.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-3">Métricas Clave</p>
              <div className="grid grid-cols-3 gap-3">
                {data.keyMetrics.map((metric, idx) => (
                  <div key={idx} className="p-4 rounded-lg border bg-card">
                    <p className="text-xs text-muted-foreground mb-1">{metric.label}</p>
                    <p className="text-xl font-bold">{metric.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

