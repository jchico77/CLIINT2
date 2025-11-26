'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  getOpportunities,
  getClients,
  getServices,
  getAllDashboards,
  type DashboardSummary,
} from '@/lib/api';
import type {
  Opportunity,
  ClientAccount,
  ServiceOffering,
} from '@/lib/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AppShell } from '@/components/app-shell';
import {
  Briefcase,
  Calendar,
  ArrowRight,
  Building2,
  ExternalLink,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export default function OpportunitiesPage() {
  const router = useRouter();
  const [vendorInput, setVendorInput] = useState('');
  const [selectedVendor, setSelectedVendor] = useState<string | null>(null);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [clients, setClients] = useState<Record<string, ClientAccount>>({});
  const [services, setServices] = useState<Record<string, ServiceOffering>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dashboardByOpportunity, setDashboardByOpportunity] = useState<Record<string, DashboardSummary>>({});

  useEffect(() => {
    const cachedVendor = typeof window !== 'undefined'
      ? window.localStorage.getItem('cliint:lastVendorId')
      : null;
    if (cachedVendor) {
      setVendorInput(cachedVendor);
      setSelectedVendor(cachedVendor);
    }
  }, []);

  useEffect(() => {
    if (!selectedVendor) {
      setOpportunities([]);
      setClients({});
      setServices({});
      return;
    }

    setLoading(true);
    setError(null);

    Promise.all([
      getOpportunities(selectedVendor),
      getClients(selectedVendor),
      getServices(selectedVendor),
      getAllDashboards(selectedVendor),
    ])
      .then(([opps, clientList, serviceList, dashboards]) => {
        const clientMap = Object.fromEntries(clientList.map((c) => [c.id, c]));
        const serviceMap = Object.fromEntries(serviceList.map((s) => [s.id, s]));
        const dashboardsMap = dashboards.reduce<Record<string, DashboardSummary>>((acc, dash) => {
          const existing = acc[dash.opportunityId];
          if (!existing || new Date(dash.generatedAt) > new Date(existing.generatedAt)) {
            acc[dash.opportunityId] = dash;
          }
          return acc;
        }, {});
        setOpportunities(opps);
        setClients(clientMap);
        setServices(serviceMap);
        setDashboardByOpportunity(dashboardsMap);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Error desconocido'))
      .finally(() => setLoading(false));
  }, [selectedVendor]);

  useEffect(() => {
    setSearchTerm('');
  }, [selectedVendor]);

  const filteredOpportunities = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return opportunities.filter((opportunity) => {
      if (!query) {
        return true;
      }
      const clientName = clients[opportunity.clientId]?.name ?? '';
      const serviceName = services[opportunity.serviceOfferingId]?.name ?? '';
      const haystack = `${opportunity.name} ${clientName} ${serviceName}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [opportunities, searchTerm, clients, services]);

  const handleVendorSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!vendorInput.trim()) {
      setSelectedVendor(null);
      return;
    }
    setSelectedVendor(vendorInput.trim());
    window.localStorage.setItem('cliint:lastVendorId', vendorInput.trim());
  };

  const headerDescription = useMemo(() => {
    if (!selectedVendor) {
      return 'Introduce un vendorId para ver sus oportunidades en memoria.';
    }
    if (loading) {
      return `Cargando oportunidades de ${selectedVendor}...`;
    }
    return `${filteredOpportunities.length} oportunidad(es) visibles para ${selectedVendor}`;
  }, [selectedVendor, loading, filteredOpportunities.length]);

  return (
    <AppShell
      title="Oportunidades"
      description={headerDescription}
      actions={
        <div className="flex items-center gap-2">
          <Link href="/admin">
            <Button variant="ghost" size="sm">
              Admin
            </Button>
          </Link>
          <Link href="/opportunities/new">
            <Button size="sm">
              Nueva oportunidad
            </Button>
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-col gap-2">
            <CardTitle>Vendor ID</CardTitle>
            <CardDescription>
              Trabajamos en memoria, así que indica el vendorId que quieras consultar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleVendorSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                <div className="space-y-2">
                  <Label htmlFor="vendor-id">Vendor ID</Label>
                  <Input
                    id="vendor-id"
                    value={vendorInput}
                    onChange={(event) => setVendorInput(event.target.value)}
                    placeholder="vendor_123..."
                    className="text-sm"
                  />
                </div>
                <Button type="submit" className="gap-2" disabled={loading}>
                  <Building2 className="h-4 w-4" />
                  {loading ? 'Cargando...' : 'Cargar oportunidades'}
                </Button>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </form>
          </CardContent>
        </Card>

        {!selectedVendor ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center space-y-3">
              <Briefcase className="h-14 w-14 text-muted-foreground mx-auto" />
              <h2 className="text-xl font-semibold">Selecciona un vendor</h2>
              <p className="text-muted-foreground text-sm max-w-xl mx-auto">
                Una vez creado tu vendor desde “Nueva oportunidad”, podrás ver todas sus oportunidades y filtrarlas por nombre, cliente o servicio.
              </p>
            </CardContent>
          </Card>
        ) : loading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12 text-muted-foreground">
              Cargando pipeline...
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle>Pipeline activo</CardTitle>
                <CardDescription>
                  {filteredOpportunities.length} registros — vendor {selectedVendor}
                </CardDescription>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Input
                  placeholder="Buscar por nombre, cliente o servicio"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="sm:w-64"
                />
              </div>
            </CardHeader>
            <CardContent>
              {filteredOpportunities.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                  <Briefcase className="h-12 w-12 text-muted-foreground" />
                  <div>
                    <h3 className="text-lg font-semibold">No hay oportunidades que coincidan</h3>
                    <p className="text-sm text-muted-foreground">
                      Ajusta los filtros o crea una nueva oportunidad para {selectedVendor}.
                    </p>
                  </div>
                  <Link href="/opportunities/new">
                    <Button size="sm">Registrar oportunidad</Button>
                  </Link>
                </div>
              ) : (
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Oportunidad</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Servicio</TableHead>
                        <TableHead>Último dashboard</TableHead>
                        <TableHead>Actualizada</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOpportunities.map((opportunity) => {
                        const clientName =
                          clients[opportunity.clientId]?.name ?? opportunity.clientId;
                        const serviceName =
                          services[opportunity.serviceOfferingId]?.name ??
                          opportunity.serviceOfferingId;
                        const updatedAt = new Date(
                          opportunity.updatedAt || opportunity.createdAt,
                        ).toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        });

                        return (
                          <TableRow key={opportunity.id}>
                            <TableCell>
                              <div className="font-medium">{opportunity.name}</div>
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {opportunity.notes || 'Sin notas registradas.'}
                              </p>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm font-semibold">{clientName}</div>
                              <p className="text-xs text-muted-foreground">{opportunity.clientId}</p>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm font-semibold">{serviceName}</div>
                              <p className="text-xs text-muted-foreground">
                                {opportunity.serviceOfferingId}
                              </p>
                            </TableCell>
                            <TableCell>
                              {dashboardByOpportunity[opportunity.id] ? (
                                <div className="space-y-1 text-xs">
                                  <p className="text-muted-foreground">
                                    {formatDistanceToNow(
                                      new Date(dashboardByOpportunity[opportunity.id].generatedAt),
                                      { addSuffix: true, locale: es },
                                    )}
                                  </p>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full gap-1"
                                    onClick={() =>
                                      router.push(`/dashboard/${dashboardByOpportunity[opportunity.id].id}`)
                                    }
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                    Ver dashboard
                                  </Button>
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground">Sin generar</p>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                {updatedAt}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="gap-1"
                                onClick={() => router.push(`/opportunities/${opportunity.id}`)}
                              >
                                Ver detalle
                                <ArrowRight className="h-3 w-3" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}

