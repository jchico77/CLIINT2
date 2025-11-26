'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { AppShell } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useVendors } from '@/hooks/useVendors';
import { logger } from '@/lib/logger';
import { Building2, ExternalLink, RefreshCw, Sparkles } from 'lucide-react';

export default function VendorsPage() {
  const router = useRouter();
  const { vendors, loading, error, refresh } = useVendors();

  const description = loading
    ? 'Cargando vendors registrados...'
    : `${vendors.length} vendor(s) en memoria`;

  const handleStartAnalysis = (vendorId: string) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('cliint:lastVendorId', vendorId);
    }
    logger.info('Vendor analysis initiated from list', { vendorId });
    router.push(`/opportunities/new?vendorId=${vendorId}`);
  };

  return (
    <AppShell
      title="Vendors"
      description={description}
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => {
              void refresh();
            }}
            disabled={loading}
          >
            <RefreshCw className="h-3 w-3" />
            Actualizar
          </Button>
          <Link href="/vendors/new">
            <Button size="sm">Nuevo vendor</Button>
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Base de vendors
            </CardTitle>
            <CardDescription>
              Registra proveedores estratégicos y lanza un análisis con un solo clic.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error ? (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
                {error}
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
                Recuperando vendors...
              </div>
            ) : vendors.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                <Building2 className="h-12 w-12 text-muted-foreground" />
                <div>
                  <h3 className="text-lg font-semibold">Aún no hay vendors registrados</h3>
                  <p className="text-sm text-muted-foreground">
                    Usa el botón “Nuevo vendor” para empezar y lanzar análisis más tarde.
                  </p>
                </div>
                <Link href="/vendors/new">
                  <Button size="sm">Registrar vendor</Button>
                </Link>
              </div>
            ) : (
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Website</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Registrado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vendors.map((vendor) => (
                      <TableRow key={vendor.id}>
                        <TableCell>
                          <div className="font-medium">{vendor.name}</div>
                          <p className="text-xs text-muted-foreground">{vendor.id}</p>
                        </TableCell>
                        <TableCell>
                          <Link
                            href={vendor.websiteUrl}
                            target="_blank"
                            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                          >
                            {vendor.websiteUrl}
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        </TableCell>
                        <TableCell>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {vendor.description || 'Sin descripción registrada.'}
                          </p>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(vendor.createdAt), {
                            addSuffix: true,
                            locale: es,
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1"
                            onClick={() => handleStartAnalysis(vendor.id)}
                          >
                            <Sparkles className="h-3 w-3" />
                            Iniciar análisis
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}


