'use client';

import { useState } from 'react';
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
import { ThemeToggle } from '@/components/theme-toggle';
import { createVendor } from '@/lib/api';
import { logger } from '@/lib/logger';
import { Building2, Sparkles } from 'lucide-react';

export default function NewVendorPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vendorName, setVendorName] = useState('');
  const [vendorWebsite, setVendorWebsite] = useState('');
  const [vendorDescription, setVendorDescription] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    logger.info('Submitting standalone vendor form');

    try {
      const vendor = await createVendor({
        name: vendorName.trim(),
        websiteUrl: vendorWebsite.trim(),
        description: vendorDescription.trim() || undefined,
      });

      if (typeof window !== 'undefined') {
        window.localStorage.setItem('cliint:lastVendorId', vendor.id);
      }

      logger.info('Vendor created successfully', { vendorId: vendor.id });
      router.push('/vendors');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo crear el vendor';
      setError(message);
      logger.error('Vendor creation failed', { message });
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
            <h1 className="text-xl font-semibold">Nuevo vendor</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/clients/new">
              <Button variant="ghost" size="sm">
                Nuevo cliente
              </Button>
            </Link>
            <Link href="/opportunities/new">
              <Button variant="ghost" size="sm">
                Nueva oportunidad
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
                <Building2 className="h-4 w-4" />
                Datos del vendor
              </CardTitle>
              <CardDescription>
                Registra un nuevo vendor para vincularlo fácilmente con clientes, servicios y
                oportunidades.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="vendorName" className="text-xs">
                    Nombre *
                  </Label>
                  <Input
                    id="vendorName"
                    value={vendorName}
                    onChange={(e) => setVendorName(e.target.value)}
                    required
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="vendorWebsite" className="text-xs">
                    Website *
                  </Label>
                  <Input
                    id="vendorWebsite"
                    value={vendorWebsite}
                    onChange={(e) => setVendorWebsite(e.target.value)}
                    required
                    className="h-9 text-sm"
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="vendorDescription" className="text-xs">
                    Descripción
                  </Label>
                  <Textarea
                    id="vendorDescription"
                    value={vendorDescription}
                    onChange={(e) => setVendorDescription(e.target.value)}
                    className="h-24 text-sm resize-none"
                    placeholder="Resumen de capacidades, foco comercial, verticales, etc."
                  />
                </div>

                {error && (
                  <Card className="border-destructive bg-destructive/10">
                    <CardContent className="pt-4">
                      <p className="text-sm text-destructive">{error}</p>
                    </CardContent>
                  </Card>
                )}

                <div className="flex items-center justify-end gap-3 pt-2">
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
                        Guardando vendor...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Crear vendor
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


