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
import { getDashboardMetrics, getVendor, getClient } from '@/lib/api';
import type {
  DashboardMetricsResponse,
  DashboardRunStatus,
  DashboardPhaseType,
} from '@/lib/types';
import { BarChart3, Activity, Timer, Sparkles } from 'lucide-react';

const HARDCODED_ADMIN_TOKEN = 'cliint-admin-token';
const ALL_OPTION_VALUE = '__all__';

type EntityOption = {
  id: string;
  name: string;
};

const toInputDate = (date: Date) => date.toISOString().split('T')[0];

const toStartOfDayIso = (dateString: string | null | undefined) => {
  if (!dateString) {
    return undefined;
  }
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
};

const toEndOfDayIso = (dateString: string | null | undefined) => {
  if (!dateString) {
    return undefined;
  }
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }
  date.setHours(23, 59, 59, 999);
  return date.toISOString();
};

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

const formatShortDate = (iso?: string | null) => {
  if (!iso) {
    return '—';
  }
  return new Date(iso).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
  });
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

const tremorCardClass =
  'shadow-sm border border-white/10 bg-gradient-to-b from-white/5 via-white/0 to-white/0 text-card-foreground dark:bg-card/80';

const summaryCardThemes = [
  {
    icon: BarChart3,
    gradient: 'from-cyan-500/25 via-cyan-500/0 to-transparent',
    border: 'border-cyan-500/40',
    iconBg: 'bg-cyan-500/20 text-cyan-100',
  },
  {
    icon: Activity,
    gradient: 'from-emerald-500/25 via-emerald-500/0 to-transparent',
    border: 'border-emerald-500/40',
    iconBg: 'bg-emerald-500/20 text-emerald-100',
  },
  {
    icon: Timer,
    gradient: 'from-blue-500/25 via-blue-500/0 to-transparent',
    border: 'border-blue-500/40',
    iconBg: 'bg-blue-500/20 text-blue-100',
  },
  {
    icon: Sparkles,
    gradient: 'from-fuchsia-500/25 via-fuchsia-500/0 to-transparent',
    border: 'border-fuchsia-500/40',
    iconBg: 'bg-fuchsia-500/20 text-fuchsia-100',
  },
];

export default function AdminMetricsPage() {
  const now = useMemo(() => new Date(), []);
  const defaultFrom = useMemo(() => {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    return d;
  }, [now]);

  const [adminToken] = useState(HARDCODED_ADMIN_TOKEN);
  const [metrics, setMetrics] = useState<DashboardMetricsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | DashboardRunStatus>('all');
  const [vendorFilter, setVendorFilter] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [modelFilter, setModelFilter] = useState('');
  const [fromFilter, setFromFilter] = useState(toInputDate(defaultFrom));
  const [toFilter, setToFilter] = useState(toInputDate(now));
  const [vendorOptions, setVendorOptions] = useState<EntityOption[]>([]);
  const [clientOptions, setClientOptions] = useState<EntityOption[]>([]);
  const [vendorNames, setVendorNames] = useState<Record<string, string>>({});
  const [clientNames, setClientNames] = useState<Record<string, string>>({});

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
          clientId: clientFilter || undefined,
          status: statusFilter === 'all' ? undefined : statusFilter,
          from: toStartOfDayIso(fromFilter),
          to: toEndOfDayIso(toFilter),
        },
        adminToken,
      );
      setMetrics(response);
    } catch (err) {
      if (err instanceof Error) {
        const code = (err as { code?: string }).code;
        if (code === 'UNAUTHORIZED') {
          setError(
            'Token inválido. Define ADMIN_API_TOKEN en el backend y vuelve a introducirlo en esta pantalla.',
          );
        } else if (code === 'INTERNAL_ERROR') {
          setError(
            `No se pudieron cargar las métricas. Asegúrate de ejecutar "pnpm prisma migrate deploy" y revisa el backend. Detalle: ${err.message}`,
          );
        } else {
          setError(err.message);
        }
      } else {
        setError('No se pudieron cargar las métricas. Revisa el backend.');
      }
    } finally {
      setLoading(false);
    }
  }, [adminToken, vendorFilter, clientFilter, modelFilter, statusFilter, fromFilter, toFilter]);
  useEffect(() => {
    if (!metrics) {
      setVendorOptions([]);
      return;
    }
    const vendorIds = Array.from(
      new Set(metrics.recentRuns.map((run) => run.vendorId).filter(Boolean)),
    );
    setVendorOptions(
      vendorIds
        .map((id) => ({
          id,
          name: vendorNames[id] ?? id,
        }))
        .sort((a, b) => a.name.localeCompare(b.name, 'es')),
    );
    const missing = vendorIds.filter((id) => !vendorNames[id]);
    if (missing.length === 0) {
      return;
    }
    void (async () => {
      const entries = await Promise.all(
        missing.map(async (id) => {
          try {
            const vendor = await getVendor(id);
            return { id, name: vendor.name };
          } catch {
            return { id, name: id };
          }
        }),
      );
      setVendorNames((prev) => ({
        ...prev,
        ...Object.fromEntries(entries.map((entry) => [entry.id, entry.name])),
      }));
    })();
  }, [metrics, vendorNames]);

  useEffect(() => {
    if (!metrics) {
      setClientOptions([]);
      return;
    }
    const clientIds = Array.from(
      new Set(metrics.recentRuns.map((run) => run.clientId).filter(Boolean)),
    );
    setClientOptions(
      clientIds
        .map((id) => ({
          id,
          name: clientNames[id] ?? id,
        }))
        .sort((a, b) => a.name.localeCompare(b.name, 'es')),
    );
    const missing = clientIds.filter((id) => !clientNames[id]);
    if (missing.length === 0) {
      return;
    }
    void (async () => {
      const entries = await Promise.all(
        missing.map(async (id) => {
          try {
            const client = await getClient(id);
            return { id, name: client.name };
          } catch {
            return { id, name: id };
          }
        }),
      );
      setClientNames((prev) => ({
        ...prev,
        ...Object.fromEntries(entries.map((entry) => [entry.id, entry.name])),
      }));
    })();
  }, [metrics, clientNames]);


  useEffect(() => {
    if (adminToken) {
      void loadMetrics();
    }
  }, [adminToken, loadMetrics]);

  const phaseChartData = useMemo(() => {
    if (!metrics) {
      return [];
    }
    const executionOrder: DashboardPhaseType[] = [
      'deepResearch',
      'clientResearch',
      'vendorResearch',
      'fitStrategy',
      'proposalOutline',
      'newsResearch',
      'persistToDb',
    ];
    return executionOrder
      .map((phaseKey) => {
        const phase = metrics.phases.find((item) => item.phase === phaseKey);
        if (!phase) {
          return null;
        }
        return {
          phase: phaseLabels[phase.phase] ?? phase.phase,
          avgSeconds: phase.avgDurationMs ? phase.avgDurationMs / 1000 : 0,
        };
      })
      .filter(Boolean) as Array<{ phase: string; avgSeconds: number }>;
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

  const hasMetrics = metrics && metrics.recentRuns.length > 0;

  return (
    <AppShell
      title="Métricas de generación"
      description="Monitoriza el rendimiento de cada fase LLM y compara modelos"
    >
      <div className="space-y-6">
        {metrics ? (
          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900/70 to-slate-900/30 p-6 text-slate-100">
            <div className="flex flex-wrap items-center gap-6">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                  Ventana activa
                </p>
                <p className="mt-2 text-2xl font-semibold">
                  {formatShortDate(metrics.summary.from)} — {formatShortDate(metrics.summary.to)}
                </p>
              </div>
              <div className="hidden h-10 w-px bg-white/10 md:block" />
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Última vista</p>
                <p className="mt-2 text-lg font-medium text-white">
                  {new Date().toLocaleString('es-ES', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              <div className="ml-auto flex gap-2 text-xs text-slate-300">
                <div className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  Datos en vivo
                </div>
                <div className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1">
                  <span className="h-2 w-2 rounded-full bg-sky-400" />
                  Tremor + shadcn UI
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <AdminSettingsShell
          title="Acceso y filtros"
          description="Configura el token de administrador y los filtros de consulta."
        >
          <div className="space-y-6">
            <AdminSection
              title="Token de administrador"
              helpText="Este entorno usa un token fijo para facilitar las pruebas."
            >
              <p className="text-sm text-muted-foreground">
                Token aplicado automáticamente:{' '}
                <span className="font-mono text-foreground">{HARDCODED_ADMIN_TOKEN}</span>
              </p>
            </AdminSection>

            <AdminSection title="Filtros de consulta">
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    Vendor
                  </p>
                  <Select
                    value={vendorFilter || ALL_OPTION_VALUE}
                    onValueChange={(value) =>
                      setVendorFilter(value === ALL_OPTION_VALUE ? '' : value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_OPTION_VALUE}>Todos</SelectItem>
                      {vendorOptions.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    Cliente
                  </p>
                  <Select
                    value={clientFilter || ALL_OPTION_VALUE}
                    onValueChange={(value) =>
                      setClientFilter(value === ALL_OPTION_VALUE ? '' : value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_OPTION_VALUE}>Todos</SelectItem>
                      {clientOptions.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
          <TremorCard className={tremorCardClass}>
            <Title>Advertencia</Title>
            <Text className="text-rose-500">{error}</Text>
          </TremorCard>
        ) : null}

        {!hasMetrics && !loading ? (
          <TremorCard className={tremorCardClass}>
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
              {summaryItems.map((item, index) => {
                const theme = summaryCardThemes[index % summaryCardThemes.length];
                const Icon = theme.icon;
                return (
                  <div
                    key={item.label}
                    className={`relative overflow-hidden rounded-2xl border ${theme.border} bg-gradient-to-br ${theme.gradient} p-5`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-widest text-muted-foreground">
                          {item.label}
                        </p>
                        <p className="mt-3 text-3xl font-semibold text-white">{item.value}</p>
                      </div>
                      <div
                        className={`flex h-11 w-11 items-center justify-center rounded-full ${theme.iconBg}`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>
                    <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/20 to-transparent" />
                  </div>
                );
              })}
            </Grid>

            <TremorCard
              className="border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900/60 to-slate-900/20 text-white"
            >
              <Flex className="items-center justify-between">
                <div>
                  <Title>Duración por fase</Title>
                  <Text className="text-sm text-slate-300">Orden secuencial del dashboard</Text>
                </div>
                <div className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs text-slate-100">
                  <span className="h-2 w-2 rounded-full bg-sky-400" />
                  Tiempo medio (s)
                </div>
              </Flex>
              <BarChart
                className="mt-6 h-72 text-white"
                data={phaseChartData}
                index="phase"
                categories={['avgSeconds']}
                colors={['sky']}
                layout="vertical"
                valueFormatter={(value) => `${value.toFixed(1)} s`}
                yAxisWidth={160}
              />
            </TremorCard>

            <TremorCard className={tremorCardClass}>
              <Title>Últimos runs</Title>
              <Text className="text-sm text-muted-foreground">
                Historial más reciente limitado a 20 ejecuciones.
              </Text>
              <div className="mt-4 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-white/10">
                      <TableHead className="text-slate-300">Run</TableHead>
                      <TableHead className="text-slate-300">Duración</TableHead>
                      <TableHead className="text-slate-300">Modelo</TableHead>
                      <TableHead className="text-slate-300">Estado</TableHead>
                      <TableHead className="text-slate-300">Fases</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {metrics!.recentRuns.map((run) => {
                      const failedPhases = run.phases.filter(
                        (phase) => phase.status === 'error',
                      );
                      return (
                        <TableRow
                          key={run.id}
                          className="border-b border-white/5 hover:bg-white/5 transition-colors"
                        >
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


