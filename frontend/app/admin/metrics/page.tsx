'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Card as TremorCard,
  Metric,
  Text,
  Title,
  Grid,
  Flex,
  BarChart,
  DonutChart,
  BarList,
} from '@tremor/react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

import { AppShell } from '@/components/app-shell';
import {
  AdminSettingsShell,
  AdminSection,
} from '@/components/admin/admin-settings-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getDashboardMetrics } from '@/lib/api';
import type {
  DashboardMetricsResponse,
  DashboardRunStatus,
} from '@/lib/types';

const ADMIN_TOKEN_KEY = 'cliint-admin-token';

const toInputDate = (date: Date) => date.toISOString().split('T')[0];

const formatDuration = (durationMs?: number | null) => {
  if (!durationMs) {
    return '—';
  }
  if (durationMs < 1000) {
    return `${durationMs} ms`;
  }
  const seconds = durationMs / 1000;
  return `${seconds.toFixed(seconds >= 10 ? 0 : 1)} s`;
};

const phaseLabels: Record<string, string> = {
  deepResearch: 'Deep research',
  clientResearch: 'Análisis cliente',
  vendorResearch: 'Análisis vendor',
  fitStrategy: 'Fit & plays',
  proposalOutline: 'Outline propuesta',
  newsResearch: 'Noticias',
  persistToDb: 'Persistencia',
};

const statusLabels: Record<DashboardRunStatus, string> = {
  success: 'Éxito',
  error: 'Error',
};

const statusBadgeStyles: Record<DashboardRunStatus, string> = {
  success: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200',
  error: 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-200',
};

export default function AdminMetricsPage() {
  const now = useMemo(() => new Date(), []);
  const defaultFrom = useMemo(() => {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    return d;
  }, [now]);

  const [adminToken, setAdminToken] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [metrics, setMetrics] = useState<DashboardMetricsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | DashboardRunStatus>('all');
  const [vendorFilter, setVendorFilter] = useState('');
  const [modelFilter, setModelFilter] = useState('');
  const [fromFilter, setFromFilter] = useState(toInputDate(defaultFrom));
  const [toFilter, setToFilter] = useState(toInputDate(now));

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const stored = window.localStorage.getItem(ADMIN_TOKEN_KEY) ?? '';
    setAdminToken(stored);
    setTokenInput(stored);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    if (adminToken) {
      window.localStorage.setItem(ADMIN_TOKEN_KEY, adminToken);
    } else {
      window.localStorage.removeItem(ADMIN_TOKEN_KEY);
    }
  }, [adminToken]);

  const loadMetrics = useCallback(async () => {
    if (!adminToken) {
      setError('Introduce el token de administrador para consultar las métricas.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await getDashboardMetrics(
        {
          vendorId: vendorFilter.trim() || undefined,
          model: modelFilter.trim() || undefined,
          status: statusFilter === 'all' ? undefined : statusFilter,
          from: fromFilter ? new Date(fromFilter).toISOString() : undefined,
          to: toFilter ? new Date(toFilter).toISOString() : undefined,
        },
        adminToken,
      );
      setMetrics(response);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudieron cargar las métricas. Revisa el backend.',
      );
    } finally {
      setLoading(false);
    }
  }, [adminToken, vendorFilter, modelFilter, statusFilter, fromFilter, toFilter]);

  useEffect(() => {
    if (adminToken) {
      void loadMetrics();
    }
  }, [adminToken, loadMetrics]);

  const phaseChartData = useMemo(() => {
    if (!metrics) {
      return [];
    }
    return metrics.phases.map((phase) => ({
      phase: phaseLabels[phase.phase] ?? phase.phase,
      'Media (s)': phase.avgDurationMs ? phase.avgDurationMs / 1000 : 0,
      'P95 (s)': phase.p95DurationMs ? phase.p95DurationMs / 1000 : 0,
    }));
  }, [metrics]);

  const modelListData = useMemo(() => {
    if (!metrics) {
      return [];
    }
    return metrics.models.map((model) => ({
      name: model.model,
      value: model.totalRuns,
    }));
  }, [metrics]);

  const summaryItems = useMemo(
    () => [
      {
        label: 'Ejecuciones',
        value: metrics?.summary.totalRuns ?? 0,
      },
      {
        label: 'Tasa de éxito',
        value: metrics
          ? `${Math.round((metrics.summary.successRate ?? 0) * 100)}%`
          : '0%',
      },
      {
        label: 'Duración media',
        value: formatDuration(metrics?.summary.avgDurationMs ?? null),
      },
    ],
    [metrics],
  );

  const handleTokenSave = () => {
    setAdminToken(tokenInput.trim());
  };

  const hasMetrics = metrics && metrics.recentRuns.length > 0;

  return (
    <AppShell
      title="Métricas de generación"
      description="Monitoriza el rendimiento de cada fase LLM y compara modelos"
    >
      <div className="space-y-6">
        <AdminSettingsShell
          title="Acceso y filtros"
          description="Configura el token de administrador y los filtros de consulta."
        >
          <div className="space-y-6">
            <AdminSection
              title="Token de administrador"
              helpText="El token se almacena de forma local en tu navegador."
            >
              <div className="flex flex-col gap-3 sm:flex-row">
                <Input
                  type="password"
                  placeholder="Introduce el token seguro"
                  value={tokenInput}
                  onChange={(event) => setTokenInput(event.target.value)}
                />
                <Button onClick={handleTokenSave}>Guardar token</Button>
              </div>
            </AdminSection>

            <AdminSection title="Filtros de consulta">
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    Vendor ID
                  </p>
                  <Input
                    placeholder="vendor_xxx"
                    value={vendorFilter}
                    onChange={(event) => setVendorFilter(event.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    Modelo LLM
                  </p>
                  <Input
                    placeholder="gpt-4o, o4-mini..."
                    value={modelFilter}
                    onChange={(event) => setModelFilter(event.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    Estado
                  </p>
                  <Select
                    value={statusFilter}
                    onValueChange={(value: 'all' | DashboardRunStatus) =>
                      setStatusFilter(value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="success">Éxito</SelectItem>
                      <SelectItem value="error">Error</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    Desde
                  </p>
                  <Input
                    type="date"
                    value={fromFilter}
                    onChange={(event) => setFromFilter(event.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    Hasta
                  </p>
                  <Input
                    type="date"
                    value={toFilter}
                    onChange={(event) => setToFilter(event.target.value)}
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 pt-4">
                <Button onClick={() => void loadMetrics()} disabled={loading}>
                  {loading ? 'Actualizando...' : 'Actualizar métricas'}
                </Button>
                {metrics?.summary.from ? (
                  <p className="text-xs text-muted-foreground">
                    Intervalo activo:{' '}
                    {new Date(metrics.summary.from).toLocaleDateString('es-ES')} —{' '}
                    {metrics.summary.to
                      ? new Date(metrics.summary.to).toLocaleDateString('es-ES')
                      : '—'}
                  </p>
                ) : null}
              </div>
            </AdminSection>
          </div>
        </AdminSettingsShell>

        {error ? (
          <TremorCard>
            <Title>Advertencia</Title>
            <Text className="text-rose-500">{error}</Text>
          </TremorCard>
        ) : null}

        {!hasMetrics && !loading ? (
          <TremorCard>
            <Title>Sin datos todavía</Title>
            <Text>
              Ejecuta un dashboard o ajusta los filtros para ver estadísticas de
              rendimiento.
            </Text>
          </TremorCard>
        ) : null}

        {hasMetrics ? (
          <div className="space-y-6">
            <Grid numItemsSm={2} numItemsLg={3} className="gap-4">
              {summaryItems.map((item) => (
                <TremorCard key={item.label} className="shadow-sm">
                  <Text>{item.label}</Text>
                  <Metric>{item.value}</Metric>
                </TremorCard>
              ))}
            </Grid>

            <div className="grid gap-6 lg:grid-cols-2">
              <TremorCard className="shadow-sm">
                <Flex className="items-center justify-between">
                  <Title>Duración media por fase</Title>
                  <Text>Comparación media vs. p95</Text>
                </Flex>
                <BarChart
                  className="mt-6 h-72"
                  data={phaseChartData}
                  index="phase"
                  categories={['Media (s)', 'P95 (s)']}
                  colors={['blue', 'fuchsia']}
                  valueFormatter={(value) => `${value.toFixed(1)} s`}
                />
              </TremorCard>

              <TremorCard className="shadow-sm">
                <Flex className="items-center justify-between">
                  <Title>Distribución por modelo</Title>
                  <Text>Runs recientes</Text>
                </Flex>
                <DonutChart
                  className="mt-6 h-72"
                  data={modelListData}
                  category="value"
                  index="name"
                  colors={['cyan', 'violet', 'amber', 'emerald', 'purple']}
                  valueFormatter={(value) => `${value} runs`}
                  showLabel
                />
              </TremorCard>
            </div>

            <TremorCard className="shadow-sm">
              <Flex className="items-center justify-between">
                <Title>Fases más costosas</Title>
                <Text>Ordenadas por ejecuciones</Text>
              </Flex>
              <BarList
                className="mt-6"
                data={metrics!.phases
                  .map((phase) => ({
                    name: `${phaseLabels[phase.phase] ?? phase.phase} (${phase.executions})`,
                    value: phase.avgDurationMs ? phase.avgDurationMs / 1000 : 0,
                  }))
                  .sort((a, b) => b.value - a.value)}
                valueFormatter={(value) => `${value.toFixed(1)} s`}
              />
            </TremorCard>

            <TremorCard className="shadow-sm">
              <Title>Últimos runs</Title>
              <Text className="text-sm text-muted-foreground">
                Historial más reciente limitado a 20 ejecuciones.
              </Text>
              <div className="mt-4 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Run</TableHead>
                      <TableHead>Duración</TableHead>
                      <TableHead>Modelo</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Fases</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {metrics!.recentRuns.map((run) => {
                      const failedPhases = run.phases.filter(
                        (phase) => phase.status === 'error',
                      );
                      return (
                        <TableRow key={run.id}>
                          <TableCell>
                            <div className="text-sm font-medium">
                              {run.id.slice(-8)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(run.startedAt), {
                                addSuffix: true,
                                locale: es,
                              })}
                            </div>
                          </TableCell>
                          <TableCell>{formatDuration(run.durationMs)}</TableCell>
                          <TableCell>{run.llmModelUsed ?? '—'}</TableCell>
                          <TableCell>
                            <Badge className={statusBadgeStyles[run.status]}>
                              {statusLabels[run.status]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {run.phases.length} fases
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {failedPhases.length > 0
                                ? `${failedPhases.length} con error`
                                : 'sin incidencias'}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </TremorCard>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}


