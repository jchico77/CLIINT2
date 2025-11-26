'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  getOpportunities,
  getClients,
  getServices,
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  Briefcase,
  Calendar,
  ArrowRight,
  Building2,
} from 'lucide-react';

export default function OpportunitiesPage() {
  const router = useRouter();
  const [vendorInput, setVendorInput] = useState('');
  const [selectedVendor, setSelectedVendor] = useState<string | null>(null);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [clients, setClients] = useState<Record<string, ClientAccount>>({});
  const [services, setServices] = useState<Record<string, ServiceOffering>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    ])
      .then(([opps, clientList, serviceList]) => {
        const clientMap = Object.fromEntries(clientList.map((c) => [c.id, c]));
        const serviceMap = Object.fromEntries(serviceList.map((s) => [s.id, s]));
        setOpportunities(opps);
        setClients(clientMap);
        setServices(serviceMap);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Error desconocido'))
      .finally(() => setLoading(false));
  }, [selectedVendor]);

  const stageVariant = (stage: Opportunity['stage']): "default" | "secondary" | "destructive" | "outline" => {
    switch (stage) {
      case 'won':
        return 'default';
      case 'lost':
        return 'destructive';
      case 'rfp':
      case 'shortlist':
      case 'bafo':
        return 'secondary';
      default:
        return 'outline';
    }
  };

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
    return `${opportunities.length} oportunidad(es) para ${selectedVendor}`;
  }, [selectedVendor, loading, opportunities.length]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="w-full flex h-14 items-center px-6">
          <div className="flex-1">
            <h1 className="text-xl font-semibold">Oportunidades</h1>
            <p className="text-xs text-muted-foreground">{headerDescription}</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/opportunities/new">
              <Button variant="outline" size="sm">
                Nueva oportunidad
              </Button>
            </Link>
            <ThemeToggle />
            <Link href="/">
              <Button variant="outline" size="sm">
                Inicio
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="w-full px-6 py-6 space-y-6">
        <Card>
          <CardHeader className="flex flex-col gap-2">
            <CardTitle>Vendor</CardTitle>
            <CardDescription>Trabajamos en memoria, así que indica el vendorId que quieras consultar.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleVendorSubmit} className="flex flex-col gap-3 sm:flex-row">
              <div className="flex-1">
                <LabelInput value={vendorInput} onChange={setVendorInput} />
              </div>
              <Button type="submit" className="gap-2" disabled={loading}>
                <Building2 className="h-4 w-4" />
                {loading ? 'Cargando...' : 'Cargar oportunidades'}
              </Button>
            </form>
            {error && (
              <p className="text-sm text-destructive mt-3">{error}</p>
            )}
          </CardContent>
        </Card>

        {!selectedVendor ? (
          <div className="max-w-2xl mx-auto text-center py-12">
            <Briefcase className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Selecciona un vendor</h2>
            <p className="text-muted-foreground">
              Una vez creado tu vendor (desde “Nueva oportunidad”), podrás ver todas sus oportunidades aquí.
            </p>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            Cargando oportunidades...
          </div>
        ) : opportunities.length === 0 ? (
          <Card className="max-w-3xl mx-auto">
            <CardContent className="py-12 text-center space-y-3">
              <Briefcase className="h-12 w-12 text-muted-foreground mx-auto" />
              <h3 className="text-xl font-semibold">No hay oportunidades registradas</h3>
              <p className="text-muted-foreground text-sm">
                Crea una nueva oportunidad para {selectedVendor} y aparecerá aquí.
              </p>
              <Link href="/opportunities/new">
                <Button>Registrar oportunidad</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {opportunities.map((opportunity) => (
              <Card key={opportunity.id} className="flex flex-col border bg-card shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg">{opportunity.name}</CardTitle>
                      <CardDescription className="text-xs">
                        {clients[opportunity.clientId]?.name ?? opportunity.clientId}
                      </CardDescription>
                    </div>
                    <Badge variant={stageVariant(opportunity.stage)} className="text-xs">
                      {opportunity.stage.toUpperCase()}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 space-y-3 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Servicio</p>
                    <p className="font-medium">
                      {services[opportunity.serviceOfferingId]?.name ?? opportunity.serviceOfferingId}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    Creada el{' '}
                    {new Date(opportunity.createdAt).toLocaleDateString('es-ES', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </div>
                  <p className="text-muted-foreground text-xs line-clamp-3">
                    {opportunity.notes || 'Sin notas registradas.'}
                  </p>
                  <div className="pt-3 border-t flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1"
                      onClick={() => router.push(`/opportunities/${opportunity.id}`)}
                    >
                      Ver detalle
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

interface LabelInputProps {
  value: string;
  onChange: (value: string) => void;
}

function LabelInput({ value, onChange }: LabelInputProps) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">
        Vendor ID
      </label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="vendor_123..."
        className="text-sm"
      />
    </div>
  );
}

