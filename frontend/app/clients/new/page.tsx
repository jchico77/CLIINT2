'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ThemeToggle } from '@/components/theme-toggle';
import { createClient } from '@/lib/api';
import { useVendors } from '@/hooks/useVendors';
import { logger } from '@/lib/logger';
import { Briefcase, Sparkles } from 'lucide-react';

export default function NewClientPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { vendors, loading: vendorsLoading, refresh: refreshVendors } = useVendors();
  const [vendorId, setVendorId] = useState('');

  const [clientName, setClientName] = useState('');
  const [clientWebsite, setClientWebsite] = useState('');
  const [clientCountry, setClientCountry] = useState('');
  const [clientSector, setClientSector] = useState('');
  const [clientNotes, setClientNotes] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const storedVendor = window.localStorage.getItem('cliint:lastVendorId');
    if (storedVendor) {
      setVendorId(storedVendor);
    }
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    logger.info('Submitting standalone client form', { vendorId });

    try {
      if (!vendorId) {
        throw new Error('Selecciona un vendor existente antes de registrar el cliente.');
      }

      const client = await createClient(vendorId, {
        vendorId,
        name: clientName.trim(),
        websiteUrl: clientWebsite.trim(),
        country: clientCountry.trim() || undefined,
        sectorHint: clientSector.trim() || undefined,
        notes: clientNotes.trim() || undefined,
      });

      logger.info('Client created successfully', { clientId: client.id, vendorId });
      router.push('/clients');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo crear el cliente';
      setError(message);
      logger.error('Client creation failed', { message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 shrink-0">
        <div className="w-full flex h-14 items-center px-6 justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm">
                ← Inicio
              </Button>
            </Link>
            <h1 className="text-xl font-semibold">Nuevo cliente</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/vendors">
              <Button variant="ghost" size="sm">
                Vendors
              </Button>
            </Link>
            <Link href="/opportunities">
              <Button variant="ghost" size="sm">
                Oportunidades
              </Button>
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-3xl mx-auto space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Registro de cliente
              </CardTitle>
              <CardDescription>
                Selecciona un vendor existente o crea uno nuevo y registra los datos principales
                del cliente para usarlo en oportunidades y dashboards.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <Label className="text-xs">Vendor *</Label>
                    <Select
                      value={vendorId}
                      onValueChange={(value) => setVendorId(value)}
                      disabled={vendorsLoading || vendors.length === 0}
                      required
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue
                          placeholder={
                            vendorsLoading
                              ? 'Cargando vendors...'
                              : 'Selecciona un vendor existente'
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {vendors.length === 0 ? (
                          <SelectItem value="no-vendors" disabled>
                            No hay vendors registrados
                          </SelectItem>
                        ) : (
                          vendors.map((vendor) => (
                            <SelectItem key={vendor.id} value={vendor.id}>
                              {vendor.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="px-2 text-xs"
                        onClick={() => {
                          void refreshVendors();
                        }}
                        disabled={vendorsLoading}
                      >
                        {vendorsLoading ? 'Actualizando...' : 'Actualizar lista'}
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="clientName" className="text-xs">
                        Nombre *
                      </Label>
                      <Input
                        id="clientName"
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        required
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="clientWebsite" className="text-xs">
                        Website *
                      </Label>
                      <Input
                        id="clientWebsite"
                        value={clientWebsite}
                        onChange={(e) => setClientWebsite(e.target.value)}
                        required
                        placeholder="https://..."
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="clientCountry" className="text-xs">
                        País
                      </Label>
                      <Input
                        id="clientCountry"
                        value={clientCountry}
                        onChange={(e) => setClientCountry(e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="clientSector" className="text-xs">
                        Sector
                      </Label>
                      <Input
                        id="clientSector"
                        value={clientSector}
                        onChange={(e) => setClientSector(e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="clientNotes" className="text-xs">
                      Notas internas
                    </Label>
                    <Textarea
                      id="clientNotes"
                      value={clientNotes}
                      onChange={(e) => setClientNotes(e.target.value)}
                      className="h-24 text-sm resize-none"
                      placeholder="Contexto, stakeholders, retos clave..."
                    />
                  </div>
                </div>

                {error && (
                  <Card className="border-destructive bg-destructive/10">
                    <CardContent className="pt-4">
                      <p className="text-sm text-destructive">{error}</p>
                    </CardContent>
                  </Card>
                )}

                <div className="flex items-center justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push('/opportunities')}
                    disabled={loading}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={loading} className="gap-2">
                    {loading ? (
                      <>
                        <Sparkles className="h-4 w-4 animate-pulse" />
                        Guardando cliente...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Crear cliente
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}


