'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  Card as TremorCard,
  Metric,
  Text,
  Title,
  Grid,
  Flex,
  BarChart,
} from '@tremor/react';
import {
  ResponsiveContainer,
  BarChart as ReBarChart,
  Bar as ReBar,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
  CartesianGrid,
} from 'recharts';
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
  VendorDeepResearchStatus,
} from '@/lib/types';
import { BarChart3, Activity, Timer, Sparkles, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

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

const formatSecondsValue = (seconds?: number | null) => {
  if (seconds === undefined || seconds === null) {
    return '—';
  }
  if (seconds < 1) {
    return `${Math.round(seconds * 1000)} ms`;
  }
  return `${seconds.toFixed(seconds >= 10 ? 0 : 1)} s`;
};

const makeSubPhaseKey = (phase: string, subPhase: string): string =>
  `${phase}_${subPhase}`.replace(/[^a-zA-Z0-9_]+/g, '_');

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

const vendorStatusLabels: Record<VendorDeepResearchStatus, string> = {
  PENDING: 'Pendiente',
  IN_PROGRESS: 'En progreso',
  COMPLETED: 'Completado',
  FAILED: 'Error',
};

const vendorStatusBadgeStyles: Record<VendorDeepResearchStatus, string> = {
  PENDING: 'bg-slate-500/20 text-slate-200',
  IN_PROGRESS: 'bg-sky-500/20 text-sky-200',
  COMPLETED: 'bg-emerald-500/20 text-emerald-200',
  FAILED: 'bg-rose-500/20 text-rose-200',
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

type RecentPhaseMetadata = {
  analysisId: string;
  label: string;
  vendorName: string;
  model: string | null;
  actualSeconds: number | null;
  stackedSeconds: number;
  savingsSeconds: number | null;
  savingsPercent: number | null;
  isParallel: boolean;
  completedAt: string | null;
  status: VendorDeepResearchStatus;
};

const vendorPhaseSubPhaseColors: Record<
  'overview' | 'portfolio' | 'proofPoints' | 'signals',
  Record<string, string>
> = {
  overview: {
    overview_summary: '#22d3ee',
    overview_default: '#38bdf8',
  },
  portfolio: {
    portfolio_portfolio: '#8b5cf6',
    portfolio_differentiators: '#a855f7',
  },
  proofPoints: {
    proofPoints_evidence_cases: '#f59e0b',
    proofPoints_evidence_partnerships: '#fb923c',
    proofPoints_evidence_awards: '#fbbf24',
  },
  signals: {
    signals_signals_news: '#10b981',
    signals_signals_videos: '#14b8a6',
    signals_signals_social: '#84cc16',
  },
};

const vendorPhaseColorScale: Record<
  'overview' | 'portfolio' | 'proofPoints' | 'signals',
  string[]
> = {
  overview: ['cyan', 'sky'],
  portfolio: ['violet', 'purple'],
  proofPoints: ['amber', 'orange', 'yellow'],
  signals: ['emerald', 'teal', 'lime'],
};

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
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    vendor: true, // Abre la sección de Vendor Deep Research por defecto
  });

  const toggleSection = useCallback((sectionId: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  }, []);

  const isSectionOpen = useCallback(
    (sectionId: string) => openSections[sectionId] ?? false,
    [openSections],
  );

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

  const vendorSummaryItems = useMemo(() => {
    if (!metrics) {
      return [];
    }
    const summary = metrics.vendorDeepResearch.summary;
    return [
      { label: 'Analizados', value: summary.totalAnalyses },
      { label: 'Completados', value: summary.completed },
      { label: 'Fallidos', value: summary.failed },
      { label: 'Duración media', value: formatDuration(summary.avgDurationMs) },
    ];
  }, [metrics]);

  const vendorModelChartData = useMemo(() => {
    if (!metrics) {
      return [];
    }
    return metrics.vendorDeepResearch.models
      .filter((model) => typeof model.avgDurationMs === 'number' && (model.avgDurationMs ?? 0) > 0)
      .map((model) => ({
        model: model.model,
        avgSeconds: (model.avgDurationMs ?? 0) / 1000,
      }))
      .sort((a, b) => b.avgSeconds - a.avgSeconds);
  }, [metrics]);

  const vendorModelChartHeight = useMemo(() => {
    const rows = Math.max(vendorModelChartData.length, 4);
    return `${rows * 48}px`;
  }, [vendorModelChartData.length]);

  const vendorTimingChart = useMemo(() => {
    if (!metrics || metrics.vendorDeepResearch.timings.phases.length === 0) {
      return { data: [] as Array<Record<string, number | string>>, categories: [] as string[], colors: [] as string[] };
    }

    const categoryColorMap = new Map<string, string>();
    const data = metrics.vendorDeepResearch.timings.phases.map((phase) => {
      const row: Record<string, number | string> = {
        phase: phase.phaseLabel,
      };

      const palette = vendorPhaseColorScale[phase.phase] ?? ['slate'];

      phase.subPhases.forEach((subPhase, index) => {
        const key = `${phase.phase}_${subPhase.subPhase}`;
        row[key] = subPhase.avgDurationMs ? subPhase.avgDurationMs / 1000 : 0;
        if (!categoryColorMap.has(key)) {
          categoryColorMap.set(key, palette[index % palette.length]);
        }
      });

      return row;
    });

    const categories = Array.from(categoryColorMap.keys());
    const colors = categories.map((category) => categoryColorMap.get(category) ?? 'slate');

    return { data, categories, colors };
  }, [metrics]);

  const hasVendorTimingData =
    vendorTimingChart.data.length > 0 && vendorTimingChart.categories.length > 0;
  const recentPhaseRuns = metrics?.vendorDeepResearch.recentPhaseRuns ?? [];

  const recentAnalysisLookup = useMemo(() => {
    if (!metrics) {
      return new Map<string, { durationMs: number | null }>();
    }
    const map = new Map<string, { durationMs: number | null }>();
    metrics.vendorDeepResearch.recent.forEach((analysis) => {
      const key = analysis.analysisId ?? analysis.id;
      map.set(key, { durationMs: analysis.durationMs });
    });
    return map;
  }, [metrics]);

  const recentPhaseChart = useMemo(() => {
    if (!metrics || metrics.vendorDeepResearch.recentPhaseRuns.length === 0) {
      return {
        data: [] as Array<Record<string, number | string>>,
        categories: [] as string[],
        colors: [] as string[],
        metadata: [] as RecentPhaseMetadata[],
        referenceSeconds: 0,
      };
    }

    const dataWithMeta = metrics.vendorDeepResearch.recentPhaseRuns.map((run) => {
      const analysisReference = recentAnalysisLookup.get(run.analysisId);
      const durationSeconds =
        analysisReference?.durationMs && analysisReference.durationMs > 0
          ? Math.max(analysisReference.durationMs / 1000, 0)
          : null;
      return {
        ...run,
        durationSeconds,
        phaseDurationSeconds: run.phases.reduce((total, phase) => {
          const subTotal = phase.subPhases.reduce(
            (acc, subPhase) => acc + (subPhase.durationMs ? subPhase.durationMs / 1000 : 0),
            0,
          );
          return total + subTotal;
        }, 0),
      };
    });

    const categoryColorMap = new Map<string, string>();
    const metadata: RecentPhaseMetadata[] = [];

    const data = dataWithMeta.map((run) => {
      const row: Record<string, number | string> = {
        analysisId: run.analysisId,
      };
      let stackedSeconds = 0;

      run.phases.forEach((phase) => {
        const colorMap = vendorPhaseSubPhaseColors[phase.phase];
        phase.subPhases.forEach((subPhase) => {
          const key = makeSubPhaseKey(phase.phase, subPhase.subPhase);
          const seconds = subPhase.durationMs ? subPhase.durationMs / 1000 : 0;
          stackedSeconds += seconds;
          row[key] = seconds;
          if (!categoryColorMap.has(key)) {
            categoryColorMap.set(
              key,
              colorMap?.[key] ?? '#94a3b8',
            );
          }
        });
      });

      const actualSeconds =
        typeof run.durationSeconds === 'number'
          ? Math.min(Math.max(run.durationSeconds, 0), stackedSeconds)
          : null;
      const savingsSeconds =
        actualSeconds !== null ? Math.max(stackedSeconds - actualSeconds, 0) : null;
      const savingsPercent =
        savingsSeconds !== null && stackedSeconds > 0 ? savingsSeconds / stackedSeconds : null;
      const isParallel = Boolean(savingsSeconds && savingsSeconds > 1);

      metadata.push({
        analysisId: run.analysisId,
        label: run.analysisId,
        vendorName: run.vendorName,
        model: run.llmModelUsed,
        actualSeconds,
        stackedSeconds,
        savingsSeconds,
        savingsPercent,
        isParallel,
        completedAt: run.completedAt,
        status: run.status,
      });

      return row;
    });

    const categories = Array.from(categoryColorMap.keys());
    const colors = categories.map((category) => categoryColorMap.get(category) ?? '#94a3b8');
    const referenceSeconds =
      metadata.length > 0
        ? Math.max(...metadata.map((item) => item.stackedSeconds)) * 1.1
        : 0;

    return { data, categories, colors, metadata, referenceSeconds };
  }, [metrics, recentAnalysisLookup]);

  const hasRecentPhaseData =
    recentPhaseChart.data.length > 0 && recentPhaseChart.categories.length > 0;
  const recentPhaseMetadataMap = useMemo(
    () =>
      new Map(
        recentPhaseChart.metadata.map((item) => [item.analysisId, item]),
      ),
    [recentPhaseChart.metadata],
  );
  const recentPhaseChartHeight = Math.max(recentPhaseChart.data.length * 64, 260);
  const recentPhaseDomain =
    recentPhaseChart.referenceSeconds > 0
      ? ([0, recentPhaseChart.referenceSeconds] as [number, number])
      : undefined;

  const vendorHasData =
    (metrics?.vendorDeepResearch.summary.totalAnalyses ?? 0) > 0 ||
    (metrics?.vendorDeepResearch.recent.length ?? 0) > 0;

  const hasMetrics = metrics && metrics.recentRuns.length > 0;

  const renderSection = (
    id: string,
    title: string,
    description: string,
    content: ReactNode,
  ) => {
    const open = isSectionOpen(id);
    return (
      <section
        key={id}
        className="rounded-3xl border border-white/10 bg-slate-900/60 text-slate-100 shadow-sm"
      >
        <button
          type="button"
          className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
          onClick={() => toggleSection(id)}
          aria-expanded={open}
        >
          <div>
            <p className="text-sm font-semibold text-white">{title}</p>
            <p className="text-xs text-slate-400">{description}</p>
          </div>
          <ChevronDown
            className={cn(
              'h-5 w-5 text-slate-300 transition-transform duration-200',
              open ? 'rotate-180' : '',
            )}
          />
        </button>
        <div
          className={cn(
            'overflow-hidden border-t border-white/5 transition-all duration-300',
            open ? 'max-h-[9999px] opacity-100' : 'max-h-0 opacity-0',
          )}
        >
          {open ? <div className="space-y-5 p-5">{content}</div> : null}
        </div>
      </section>
    );
  };

  const heroContent = metrics ? (
    <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900/70 to-slate-900/30 p-6 text-slate-100">
      <div className="flex flex-wrap items-center gap-6">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Ventana activa</p>
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
  ) : (
    <p className="text-sm text-slate-300">
      Ejecuta un dashboard o ajusta los filtros para cargar la ventana activa.
    </p>
  );

  const filtersContent = (
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
              <p className="text-xs font-medium text-muted-foreground">Vendor</p>
              <Select
                value={vendorFilter || ALL_OPTION_VALUE}
                onValueChange={(value) => setVendorFilter(value === ALL_OPTION_VALUE ? '' : value)}
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
              <p className="text-xs font-medium text-muted-foreground">Cliente</p>
              <Select
                value={clientFilter || ALL_OPTION_VALUE}
                onValueChange={(value) => setClientFilter(value === ALL_OPTION_VALUE ? '' : value)}
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
              <p className="text-xs font-medium text-muted-foreground">Modelo LLM</p>
              <Input
                placeholder="gpt-4o, o4-mini..."
                value={modelFilter}
                onChange={(event) => setModelFilter(event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Estado</p>
              <Select
                value={statusFilter}
                onValueChange={(value: 'all' | DashboardRunStatus) => setStatusFilter(value)}
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
              <p className="text-xs font-medium text-muted-foreground">Desde</p>
              <Input type="date" value={fromFilter} onChange={(event) => setFromFilter(event.target.value)} />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Hasta</p>
              <Input type="date" value={toFilter} onChange={(event) => setToFilter(event.target.value)} />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-4">
            <Button onClick={() => void loadMetrics()} disabled={loading}>
              {loading ? 'Actualizando...' : 'Actualizar métricas'}
            </Button>
            {metrics?.summary.from ? (
              <p className="text-xs text-muted-foreground">
                Intervalo activo: {new Date(metrics.summary.from).toLocaleDateString('es-ES')} —{' '}
                {metrics.summary.to ? new Date(metrics.summary.to).toLocaleDateString('es-ES') : '—'}
              </p>
            ) : null}
          </div>
        </AdminSection>
      </div>
    </AdminSettingsShell>
  );

  const summaryContent = hasMetrics ? (
    <>
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
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">{item.label}</p>
                  <p className="mt-3 text-3xl font-semibold text-white">{item.value}</p>
                </div>
                <div className={`flex h-11 w-11 items-center justify-center rounded-full ${theme.iconBg}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/20 to-transparent" />
            </div>
          );
        })}
      </Grid>

      <TremorCard className="border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900/60 to-slate-900/20 text-white">
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
    </>
  ) : (
    <TremorCard className={tremorCardClass}>
      <Title>Sin datos todavía</Title>
      <Text>Ejecuta un dashboard o ajusta los filtros para ver estadísticas de rendimiento.</Text>
    </TremorCard>
  );

  const runsContent = hasMetrics ? (
    <TremorCard className={tremorCardClass}>
      <Title>Últimos runs</Title>
      <Text className="text-sm text-muted-foreground">Historial más reciente limitado a 20 ejecuciones.</Text>
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
              const failedPhases = run.phases.filter((phase) => phase.status === 'error');
              return (
                <TableRow key={run.id} className="border-b border-white/5 transition-colors hover:bg-white/5">
                  <TableCell>
                    <div className="text-sm font-medium">{run.id.slice(-8)}</div>
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
                    <Badge className={statusBadgeStyles[run.status]}>{statusLabels[run.status]}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{run.phases.length} fases</div>
                    <div className="text-xs text-muted-foreground">
                      {failedPhases.length > 0 ? `${failedPhases.length} con error` : 'sin incidencias'}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </TremorCard>
  ) : (
    <p className="text-sm text-slate-300">
      No hay ejecuciones registradas en este intervalo. Lanza un dashboard para poblar el historial.
    </p>
  );

  const vendorContent = metrics ? (
    <TremorCard className="border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900/60 to-slate-900/10 text-white">
      <Flex className="items-center justify-between">
        <div>
          <Title>Vendor Deep Research</Title>
          <Text className="text-sm text-slate-300">Seguimiento de los análisis automáticos por vendor</Text>
        </div>
      </Flex>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {vendorSummaryItems.map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-white/10 bg-white/5/50 p-4 text-white shadow-inner"
          >
            <p className="text-xs uppercase tracking-widest text-slate-400">{item.label}</p>
            <p className="mt-3 text-2xl font-semibold">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-white/5/40 p-4">
        <p className="text-sm font-semibold text-white">Duración por fase y subfase</p>
        <p className="text-xs text-slate-400">
          Barras apiladas con la media de cada fase y subfase (segundos)
        </p>
        {hasVendorTimingData ? (
          <BarChart
            className="mt-4 h-72 text-white"
            data={vendorTimingChart.data}
            index="phase"
            categories={vendorTimingChart.categories}
            colors={vendorTimingChart.colors}
            layout="vertical"
            stack
            valueFormatter={(value) => `${value.toFixed(1)} s`}
            yAxisWidth={200}
          />
        ) : (
          <p className="mt-4 text-sm text-slate-400">
            Aún no hay métricas temporales registradas para las fases de vendor deep research.
          </p>
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-white/5/40 p-4">
        <p className="text-sm font-semibold text-white">Últimos 5 análisis (fases reales)</p>
        <p className="text-xs text-slate-400">
          Barras apiladas mostrando la distribución temporal de cada fase. El tooltip muestra métricas de paralelismo.
        </p>
        {hasRecentPhaseData ? (
          <>
            <div className="mt-4" style={{ height: recentPhaseChartHeight }}>
              <ResponsiveContainer width="100%" height={recentPhaseChartHeight}>
                <ReBarChart
                  data={recentPhaseChart.data}
                  layout="vertical"
                  margin={{ top: 12, right: 100, left: 180, bottom: 12 }}
                  barCategoryGap="18%"
                  barGap={4}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={false}
                    stroke="rgba(148,163,184,0.2)"
                  />
                  <XAxis
                    type="number"
                    domain={recentPhaseDomain}
                    tickFormatter={(value) => formatSecondsValue(value)}
                    stroke="#94a3b8"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="analysisId"
                    width={160}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#e2e8f0', fontSize: 12, fontWeight: 600 }}
                    tickFormatter={(value) => {
                      const meta = recentPhaseMetadataMap.get(value);
                      return meta ? meta.vendorName : value.slice(0, 12);
                    }}
                  />
                  <ReTooltip
                    cursor={{ fill: 'rgba(148,163,184,0.08)' }}
                    content={(props) => (
                      <RecentPhaseTooltip
                        active={props.active}
                        label={props.label}
                        metadataMap={recentPhaseMetadataMap}
                      />
                    )}
                  />
                  {recentPhaseChart.categories.map((category, index) => (
                    <ReBar
                      key={category}
                      dataKey={category}
                      stackId="vendorPhases"
                      fill={recentPhaseChart.colors[index]}
                      isAnimationActive={false}
                    />
                  ))}
                </ReBarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 grid gap-2 text-xs">
              {recentPhaseChart.metadata.map((meta) => (
                <div
                  key={meta.analysisId}
                  className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 px-3 py-2"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-white">{meta.vendorName}</span>
                    <span className="text-slate-400">·</span>
                    <span className="text-slate-300">{meta.model}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-slate-400">Tiempo real: </span>
                      <span className="font-medium text-emerald-300">
                        {formatSecondsValue(meta.actualSeconds)}
                      </span>
                    </div>
                    {meta.isParallel && meta.savingsPercent !== null && (
                      <div className="rounded-full bg-orange-500/20 px-2 py-1 text-orange-300">
                        Ahorro: {(meta.savingsPercent * 100).toFixed(0)}%
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="mt-4 text-sm text-slate-400">
            Ejecuta nuevos análisis para visualizar sus fases individuales.
          </p>
        )}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5/40 p-4">
          <p className="text-sm font-semibold text-white">Modelos utilizados</p>
          <p className="text-xs text-slate-400">Promedio calculado únicamente con análisis completados</p>
          <div className="mt-4 space-y-4">
            {vendorModelChartData.length ? (
              <BarChart
                className="text-white"
                style={{ height: vendorModelChartHeight }}
                data={vendorModelChartData}
                index="model"
                categories={['avgSeconds']}
                colors={['cyan']}
                layout="vertical"
                valueFormatter={(value) => formatDuration(value * 1000)}
                yAxisWidth={160}
                showLegend={false}
              />
            ) : null}
            {metrics.vendorDeepResearch.models.length ? (
              <div className="space-y-3">
                {metrics.vendorDeepResearch.models.map((model) => (
                  <div
                    key={model.model}
                    className="flex items-center justify-between rounded-xl border border-white/5 px-3 py-2"
                  >
                    <div>
                      <p className="font-medium text-white">{model.model}</p>
                      <p className="text-xs text-slate-400">{model.totalAnalyses} análisis completados</p>
                    </div>
                    <span className="text-sm text-slate-200">{formatDuration(model.avgDurationMs)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">No hay análisis completados aún.</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5/40 p-4">
          <p className="text-sm font-semibold text-white">Últimos vendors analizados</p>
          <div className="mt-3 overflow-x-auto">
            {vendorHasData ? (
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-white/10">
                    <TableHead className="text-slate-300">Vendor</TableHead>
                    <TableHead className="text-slate-300">Modelo</TableHead>
                    <TableHead className="text-slate-300">Duración</TableHead>
                    <TableHead className="text-slate-300">Estado</TableHead>
                    <TableHead className="text-slate-300">Actualizado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics.vendorDeepResearch.recent.map((analysis) => (
                    <TableRow
                      key={analysis.id}
                      className="border-b border-white/5 transition-colors hover:bg-white/5"
                    >
                      <TableCell>
                        <div className="text-sm font-medium text-white">{analysis.vendorName}</div>
                        <div className="text-xs text-slate-400">{analysis.id}</div>
                      </TableCell>
                      <TableCell className="text-sm text-slate-200">
                        {analysis.llmModelUsed ?? '—'}
                      </TableCell>
                      <TableCell className="text-sm text-slate-200">
                        {formatDuration(analysis.durationMs)}
                      </TableCell>
                      <TableCell>
                        <Badge className={vendorStatusBadgeStyles[analysis.status]}>
                          {vendorStatusLabels[analysis.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-slate-300">
                        {analysis.completedAt
                          ? formatDistanceToNow(new Date(analysis.completedAt), {
                              addSuffix: true,
                              locale: es,
                            })
                          : analysis.startedAt
                            ? formatDistanceToNow(new Date(analysis.startedAt), {
                                addSuffix: true,
                                locale: es,
                              })
                            : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-slate-400">Aún no hay ejecuciones registradas.</p>
            )}
          </div>
        </div>
      </div>
    </TremorCard>
  ) : (
    <p className="text-sm text-slate-300">
      Ejecuta un Vendor Deep Research para visualizar esta sección.
    </p>
  );

  return (
    <AppShell
      title="Métricas de generación"
      description="Monitoriza el rendimiento de cada fase LLM y compara modelos"
    >
      <div className="space-y-6">
        {renderSection('window', 'Ventana activa', 'Resumen temporal de los datos cargados', heroContent)}
        {renderSection('filters', 'Acceso y filtros', 'Define el token y los filtros aplicados al dashboard', filtersContent)}

        {error ? (
          <TremorCard className={tremorCardClass}>
            <Title>Advertencia</Title>
            <Text className="text-rose-500">{error}</Text>
          </TremorCard>
        ) : null}

        {renderSection(
          'summary',
          'Rendimiento general',
          'Ejecuciones del dashboard y desempeño por fase',
          summaryContent,
        )}

        {renderSection('runs', 'Histórico de runs', 'Últimas ejecuciones registradas', runsContent)}

        {renderSection(
          'vendor',
          'Vendor Deep Research',
          'Fases y subfases de los análisis automáticos',
          vendorContent,
        )}
      </div>
    </AppShell>
  );
}

type RecentPhaseTooltipProps = {
  active?: boolean;
  label?: unknown;
  metadataMap: Map<string, RecentPhaseMetadata>;
};

const RecentPhaseTooltip = ({
  active,
  label,
  metadataMap,
}: RecentPhaseTooltipProps) => {
  if (!active || typeof label !== 'string') {
    return null;
  }
  const meta = metadataMap.get(label);
  if (!meta) {
    return null;
  }
  const savingsPercent = meta.savingsPercent;

  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/90 p-3 text-xs text-slate-100 shadow-xl">
      <p className="text-sm font-semibold">{meta.vendorName}</p>
      <p className="text-[11px] text-slate-400">
        Modelo {meta.model ?? '—'} ·{' '}
        {meta.status === 'COMPLETED' ? 'Completado' : 'En progreso'}
      </p>
      <div className="mt-2 space-y-1">
        <p>
          Paralelismo: {meta.isParallel ? 'ON' : 'OFF'}
        </p>
        <p>Tiempo real: {formatSecondsValue(meta.actualSeconds)}</p>
        <p>Suma subfases: {formatSecondsValue(meta.stackedSeconds)}</p>
        {meta.savingsSeconds !== null ? (
          <p>
            Ahorro: {formatSecondsValue(meta.savingsSeconds)}
            {savingsPercent !== null ? ` (${(savingsPercent * 100).toFixed(0)}%)` : ''}
          </p>
        ) : null}
      </div>
    </div>
  );
};
