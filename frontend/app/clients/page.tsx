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
import { useClients } from '@/hooks/useClients';
import { useVendors } from '@/hooks/useVendors';
import { logger } from '@/lib/logger';
import { RefreshCw, Sparkles, Users } from 'lucide-react';

export default function ClientsPage() {
  const router = useRouter();
  const { clients, loading, error, refresh } = useClients();
  const { vendors } = useVendors();

  const vendorsById = vendors.reduce<Record<string, string>>((acc, vendor) => {
    acc[vendor.id] = vendor.name;
    return acc;
  }, {});

  const description = loading
    ? 'Cargando clientes estratégicos...'
    : `${clients.length} cliente(s) registrados`;

  const handleCreateOpportunity = (vendorId: string, clientId: string) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('cliint:lastVendorId', vendorId);
    }
    logger.info('Opportunity creation requested from clients list', { vendorId, clientId });
    router.push(`/opportunities/new?vendorId=${vendorId}&clientId=${clientId}`);
  };

  return (
    <AppShell
      title="Clientes"
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
          <Link href="/clients/new">
            <Button size="sm">Nuevo cliente</Button>
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Base de clientes
            </CardTitle>
            <CardDescription>
              Consulta tus cuentas clave y crea nuevas oportunidades con un solo clic.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error ? (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
                {error}
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
                Recuperando clientes...
              </div>
            ) : clients.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                <Users className="h-12 w-12 text-muted-foreground" />
                <div>
                  <h3 className="text-lg font-semibold">No hay clientes registrados</h3>
                  <p className="text-sm text-muted-foreground">
                    Da de alta un cliente y continua con un análisis desde aquí.
                  </p>
                </div>
                <Link href="/clients/new">
                  <Button size="sm">Registrar cliente</Button>
                </Link>
              </div>
            ) : (
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Website</TableHead>
                      <TableHead>Sector</TableHead>
                      <TableHead>País</TableHead>
                      <TableHead>Registrado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clients.map((client) => (
                      <TableRow key={client.id}>
                        <TableCell>
                          <div className="font-medium">{client.name}</div>
                          <p className="text-xs text-muted-foreground">{client.id}</p>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-semibold">
                            {vendorsById[client.vendorId] || client.vendorId}
                          </div>
                          <p className="text-xs text-muted-foreground">{client.vendorId}</p>
                        </TableCell>
                        <TableCell>
                          <Link
                            href={client.websiteUrl}
                            target="_blank"
                            className="text-sm text-primary hover:underline"
                          >
                            {client.websiteUrl}
                          </Link>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {client.sectorHint || 'Sin sector'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {client.country || 'Sin país'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(client.createdAt), {
                            addSuffix: true,
                            locale: es,
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1"
                            onClick={() => handleCreateOpportunity(client.vendorId, client.id)}
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


