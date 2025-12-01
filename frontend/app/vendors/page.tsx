'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
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
import type { Vendor } from '@/lib/types';
import { logger } from '@/lib/logger';
import { Badge } from '@/components/ui/badge';
import { Building2, ExternalLink, RefreshCw, Sparkles, RotateCw, FileSearch, Trash2 } from 'lucide-react';
import { reanalyzeVendor, deleteVendor } from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function VendorsPage() {
  const router = useRouter();
  const { vendors, loading, error, refresh } = useVendors();
  const [reanalyzingVendorId, setReanalyzingVendorId] = useState<string | null>(null);
  const [deletingVendorId, setDeletingVendorId] = useState<string | null>(null);
  const [vendorToDelete, setVendorToDelete] = useState<Vendor | null>(null);

  const description = loading
    ? 'Cargando vendors registrados...'
    : `${vendors.length} vendor(s) en memoria`;

  const handleViewAnalysis = (vendorId: string) => {
    router.push(`/vendors/${vendorId}/analysis`);
  };

  const handleReanalyze = async (vendorId: string) => {
    setReanalyzingVendorId(vendorId);
    try {
      await reanalyzeVendor(vendorId);
      logger.info('Vendor analysis requeued', { vendorId });
      await refresh();
    } catch (err) {
      logger.error('Failed to reanalyze vendor', {
        vendorId,
        message: err instanceof Error ? err.message : err,
      });
    } finally {
      setReanalyzingVendorId(null);
    }
  };

  const handleDeleteClick = (vendor: Vendor) => {
    setVendorToDelete(vendor);
  };

  const handleDeleteConfirm = async () => {
    if (!vendorToDelete) return;

    setDeletingVendorId(vendorToDelete.id);
    try {
      await deleteVendor(vendorToDelete.id);
      logger.info('Vendor deleted', { vendorId: vendorToDelete.id });
      setVendorToDelete(null);
      await refresh();
    } catch (err) {
      logger.error('Failed to delete vendor', {
        vendorId: vendorToDelete.id,
        message: err instanceof Error ? err.message : err,
      });
    } finally {
      setDeletingVendorId(null);
    }
  };

  const handleDeleteCancel = () => {
    setVendorToDelete(null);
  };

  const statusConfig: Record<
    NonNullable<Vendor['analysisStatus']>,
    { label: string; variant: 'secondary' | 'default' | 'destructive' | 'outline' }
  > = {
    PENDING: { label: 'Pendiente', variant: 'outline' },
    IN_PROGRESS: { label: 'En progreso', variant: 'secondary' },
    COMPLETED: { label: 'Listo', variant: 'default' },
    FAILED: { label: 'Error', variant: 'destructive' },
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
                      <TableHead>Estado análisis</TableHead>
                      <TableHead>Modelo</TableHead>
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
                        <TableCell className="text-sm text-muted-foreground">
                          {vendor.analysisStatus ? (
                            <div className="space-y-1">
                              <Badge variant={statusConfig[vendor.analysisStatus].variant}>
                                {statusConfig[vendor.analysisStatus].label}
                              </Badge>
                              {vendor.analysisStatus === 'COMPLETED' && vendor.analysisCompletedAt ? (
                                <p className="text-xs text-muted-foreground">
                                  Actualizado{' '}
                                  {formatDistanceToNow(new Date(vendor.analysisCompletedAt), {
                                    addSuffix: true,
                                    locale: es,
                                  })}
                                </p>
                              ) : null}
                              {vendor.analysisStatus === 'FAILED' && vendor.analysisErrorMessage ? (
                                <p className="text-xs text-destructive line-clamp-2">
                                  {vendor.analysisErrorMessage}
                                </p>
                              ) : null}
                              {vendor.analysisStatus === 'IN_PROGRESS' ? (
                                <p className="text-xs text-muted-foreground">Análisis en progreso…</p>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">Sin análisis aún</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {vendor.analysisModelUsed ? (
                            <Badge variant="outline">{vendor.analysisModelUsed}</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-1"
                              onClick={() => handleViewAnalysis(vendor.id)}
                            >
                              <FileSearch className="h-3 w-3" />
                              Ver análisis
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-1"
                              disabled={
                                reanalyzingVendorId === vendor.id ||
                                vendor.analysisStatus === 'IN_PROGRESS'
                              }
                              onClick={() => handleReanalyze(vendor.id)}
                            >
                              {reanalyzingVendorId === vendor.id ? (
                                <RotateCw className="h-3 w-3 animate-spin" />
                              ) : (
                                <Sparkles className="h-3 w-3" />
                              )}
                              Reanalizar
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-1 text-destructive hover:text-destructive"
                              disabled={deletingVendorId === vendor.id}
                              onClick={() => handleDeleteClick(vendor)}
                            >
                              <Trash2 className="h-3 w-3" />
                              Borrar
                            </Button>
                          </div>
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

      <Dialog open={!!vendorToDelete} onOpenChange={(open) => !open && handleDeleteCancel()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar borrado de vendor</DialogTitle>
            <DialogDescription>
              Vas a borrar el vendor <strong>{vendorToDelete?.name}</strong>. Esta acción es
              irreversible y se eliminarán todos los datos relacionados (clientes, oportunidades,
              análisis, etc.).
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleDeleteCancel}
              disabled={deletingVendorId !== null}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deletingVendorId !== null}
            >
              {deletingVendorId ? 'Borrando...' : 'Borrar vendor'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}


