'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getAllDashboards, type DashboardSummary } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { Briefcase, TrendingUp, Calendar, ArrowRight } from 'lucide-react';

export default function OpportunitiesPage() {
  const router = useRouter();
  const [dashboards, setDashboards] = useState<DashboardSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAllDashboards()
      .then(setDashboards)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const getFitVariant = (fit: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (fit) {
      case 'high':
        return 'default';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg text-muted-foreground">Cargando oportunidades...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl font-semibold text-destructive mb-4">Error cargando oportunidades</p>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Link href="/">
            <Button>Volver al inicio</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="w-full flex h-14 items-center px-6">
          <div className="flex-1">
            <h1 className="text-xl font-semibold">Oportunidades</h1>
            <p className="text-xs text-muted-foreground">
              Análisis de oportunidades realizados
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/clients/new">
              <Button variant="outline" size="sm">Nueva Oportunidad</Button>
            </Link>
            <ThemeToggle />
            <Link href="/">
              <Button variant="outline" size="sm">Inicio</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full px-6 py-6">
        {dashboards.length === 0 ? (
          <div className="max-w-2xl mx-auto text-center py-12">
            <Briefcase className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-semibold mb-2">No hay oportunidades aún</h2>
            <p className="text-muted-foreground mb-6">
              Crea tu primer análisis de oportunidad para comenzar
            </p>
            <Link href="/clients/new">
              <Button size="lg">Crear Nueva Oportunidad</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-semibold">Análisis de Oportunidades</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {dashboards.length} {dashboards.length === 1 ? 'oportunidad' : 'oportunidades'} encontradas
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {dashboards.map((dashboard) => (
                <Card
                  key={dashboard.id}
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => router.push(`/dashboard/${dashboard.id}`)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-1">{dashboard.clientName}</CardTitle>
                        <CardDescription className="text-xs">
                          {dashboard.industry}
                        </CardDescription>
                      </div>
                      <Badge variant={getFitVariant(dashboard.overallFit)} className="text-xs">
                        {dashboard.overallFit.toUpperCase()}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {dashboard.opportunityBrief}
                    </p>

                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex items-center gap-4 text-xs">
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3 text-muted-foreground" />
                          <span className="font-semibold">{dashboard.fitScore}%</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            {new Date(dashboard.generatedAt).toLocaleDateString('es-ES', {
                              day: '2-digit',
                              month: 'short',
                            })}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/dashboard/${dashboard.id}`);
                        }}
                      >
                        Ver <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

