'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { AppShell } from '@/components/app-shell';
import {
  AdminSettingsShell,
  AdminSettingsGrid,
  AdminSection,
} from '@/components/admin/admin-settings-shell';
import {
  ALERT_TOGGLES,
  ADMIN_PHASES,
  DASHBOARD_SECTIONS,
  DENSE_GRID_CLASS,
  FEATURE_TOGGLES,
  LANGUAGE_OPTIONS,
  LOGGING_LEVEL_OPTIONS,
  MODEL_OPTIONS,
  REASONING_OPTIONS,
  RETRY_FIELDS,
  SECTION_LIMIT_FIELDS,
  TEMPERATURE_FIELDS,
  TILE_CLASS,
  TIMEOUT_FIELDS,
  TOKEN_FIELDS,
  defaultAdminSettings,
} from '@/lib/admin-settings';
import {
  AdminAlertToggleId,
  AdminDashboardSectionId,
  AdminFeatureToggleId,
  AdminLanguageOption,
  AdminLoggingLevel,
  AdminModelOption,
  AdminPhaseId,
  AdminReasoningEffort,
  AdminRetryId,
  AdminSectionLimitId,
  AdminTemperatureId,
  AdminTimeoutId,
  AdminTokenLimitId,
} from '@/lib/types';
import { cn } from '@/lib/utils';
import { getAdminSettings, resetAdminSettings, updateAdminSettings } from '@/lib/api';
import type { AdminSettings } from '@/lib/types';

type Status = 'idle' | 'saving' | 'saved' | 'error';
type LoadState = 'loading' | 'ready' | 'error';

const clampValue = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const formatValue = (value: number, unit?: string, decimals?: number) => {
  const fractionDigits =
    typeof decimals === 'number' ? decimals : Number.isInteger(value) ? 0 : 2;

  const formatter = new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });

  const formatted = formatter.format(value);
  return unit ? `${formatted} ${unit}` : formatted;
};

const parseNumericInput = (value: number | string): number | null => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (value === '') {
    return null;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const vendorParallelLimits = {
  maxConcurrentPhases: { min: 1, max: 6, step: 1, unit: 'fases' },
  interPhaseDelayMs: { min: 0, max: 5000, step: 100, unit: 'ms' },
} as const;

const mergeVendorParallelConfig = (
  payload?: AdminSettings['vendorDeepResearchParallel'],
): AdminSettings['vendorDeepResearchParallel'] => ({
  ...defaultAdminSettings.vendorDeepResearchParallel,
  ...payload,
});

interface NumericSliderTileProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  decimals?: number;
  disabled?: boolean;
  inputId: string;
  className?: string;
  onSliderCommit: (value: number) => void;
  onInputChange: (value: string) => void;
}

function NumericSliderTile({
  label,
  value,
  min,
  max,
  step,
  unit,
  decimals,
  disabled,
  inputId,
  className,
  onSliderCommit,
  onInputChange,
}: NumericSliderTileProps) {
  const safeValue = Number.isFinite(value) ? value : min;
  const sliderValue = clampValue(safeValue, min, max);
  const formattedValue = formatValue(sliderValue, unit, decimals);

  return (
    <div className={cn(className, 'space-y-3')}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">{label}</p>
        <span className="text-sm text-muted-foreground">{formattedValue}</span>
      </div>
      <Slider
        aria-label={label}
        value={[sliderValue]}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onValueChange={(newValue) => onSliderCommit(newValue[0])}
      />
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{formatValue(min, unit, decimals)}</span>
        <span>{formatValue(max, unit, decimals)}</span>
      </div>
      <Input
        id={inputId}
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={step}
        className="h-8 text-xs"
        value={safeValue}
        disabled={disabled}
        onChange={(event) => onInputChange(event.target.value)}
      />
    </div>
  );
}

export default function AdminPage() {
  const normalizeSettings = (payload: AdminSettings): AdminSettings => ({
    ...payload,
    vendorAnalysis: payload.vendorAnalysis ?? defaultAdminSettings.vendorAnalysis,
    vendorDeepResearchParallel: mergeVendorParallelConfig(payload.vendorDeepResearchParallel),
  });

  const [settings, setSettings] = useState<AdminSettings>(defaultAdminSettings);
  const [status, setStatus] = useState<Status>('idle');
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [isResetting, setIsResetting] = useState(false);

  const tileClass = TILE_CLASS;
  const denseGrid = DENSE_GRID_CLASS;
  const modelGrid = 'grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3';
  const modelTileClass = cn(tileClass, 'space-y-3');

  useEffect(() => {
    let cancelled = false;

    const fetchSettings = async () => {
      setLoadState('loading');
      setErrorMessage(null);
      try {
        const payload = await getAdminSettings();
        if (cancelled) {
          return;
        }
        setSettings(normalizeSettings(payload));
        setLoadState('ready');
        setStatus('idle');
      } catch (error) {
        if (cancelled) {
          return;
        }
        setLoadState('error');
        const message =
          error instanceof Error
            ? error.message
            : 'No se pudo cargar la configuración';
        setErrorMessage(message);
      }
    };

    fetchSettings();

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const resetStatus = () => {
    if (status !== 'idle') {
      setStatus('idle');
    }
  };

  const updateModelConfig = (phaseId: AdminPhaseId, value: AdminModelOption) => {
    setSettings((prev) => ({
      ...prev,
      modelConfig: { ...prev.modelConfig, [phaseId]: value },
    }));
    resetStatus();
  };

  const updateReasoning = (phaseId: AdminPhaseId, value: AdminReasoningEffort) => {
    setSettings((prev) => ({
      ...prev,
      reasoningConfig: { ...prev.reasoningConfig, [phaseId]: value },
    }));
    resetStatus();
  };

  const updateTimeout = (timeoutId: AdminTimeoutId, value: number | string) => {
    const parsed = parseNumericInput(value);
    if (parsed === null) {
      return;
    }
    setSettings((prev) => ({
      ...prev,
      timeoutConfig: { ...prev.timeoutConfig, [timeoutId]: parsed },
    }));
    resetStatus();
  };

  const updateFeatureToggle = (toggleId: AdminFeatureToggleId, checked: boolean) => {
    setSettings((prev) => ({
      ...prev,
      featureToggles: { ...prev.featureToggles, [toggleId]: checked },
    }));
    resetStatus();
  };

  const updateTokenLimit = (fieldId: AdminTokenLimitId, value: number | string) => {
    const parsed = parseNumericInput(value);
    if (parsed === null) {
      return;
    }
    setSettings((prev) => ({
      ...prev,
      tokenConfig: { ...prev.tokenConfig, [fieldId]: parsed },
    }));
    resetStatus();
  };

  const updateTemperature = (fieldId: AdminTemperatureId, value: number | string) => {
    const parsed = parseNumericInput(value);
    if (parsed === null) {
      return;
    }
    setSettings((prev) => ({
      ...prev,
      temperatureConfig: { ...prev.temperatureConfig, [fieldId]: parsed },
    }));
    resetStatus();
  };

  const updateSectionLimit = (fieldId: AdminSectionLimitId, value: number | string) => {
    const parsed = parseNumericInput(value);
    if (parsed === null) {
      return;
    }
    setSettings((prev) => ({
      ...prev,
      sectionLimits: { ...prev.sectionLimits, [fieldId]: parsed },
    }));
    resetStatus();
  };

  const updateLoggingLevel = (value: AdminLoggingLevel) => {
    setSettings((prev) => ({
      ...prev,
      loggingLevel: value,
    }));
    resetStatus();
  };

  const updateRetry = (fieldId: AdminRetryId, value: number | string) => {
    const parsed = parseNumericInput(value);
    if (parsed === null) {
      return;
    }
    setSettings((prev) => ({
      ...prev,
      retryConfig: { ...prev.retryConfig, [fieldId]: parsed },
    }));
    resetStatus();
  };

  const updateAlertToggle = (toggleId: AdminAlertToggleId, checked: boolean) => {
    setSettings((prev) => ({
      ...prev,
      alertToggles: { ...prev.alertToggles, [toggleId]: checked },
    }));
    resetStatus();
  };

  const updateDashboardVisibility = (
    sectionId: AdminDashboardSectionId,
    checked: boolean,
  ) => {
    setSettings((prev) => ({
      ...prev,
      dashboardVisibility: { ...prev.dashboardVisibility, [sectionId]: checked },
    }));
    resetStatus();
  };

  const updateSandbox = (checked: boolean) => {
    setSettings((prev) => ({
      ...prev,
      sandboxMode: checked,
    }));
    resetStatus();
  };

  const updateLanguage = (value: AdminLanguageOption) => {
    setSettings((prev) => ({
      ...prev,
      preferredLanguage: value,
    }));
    resetStatus();
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('saving');
    setErrorMessage(null);
    try {
      const payload = await updateAdminSettings(settings);
      setSettings(normalizeSettings(payload));
      setStatus('saved');
    } catch (error) {
      setStatus('error');
      const message =
        error instanceof Error
          ? error.message
          : 'No se pudo guardar la configuración';
      setErrorMessage(message);
    }
  };

  const handleReset = async () => {
    setIsResetting(true);
    setStatus('saving');
    setErrorMessage(null);
    try {
      const payload = await resetAdminSettings();
      setSettings(normalizeSettings(payload));
      setStatus('saved');
      setLoadState('ready');
    } catch (error) {
      setStatus('error');
      const message =
        error instanceof Error
          ? error.message
          : 'No se pudo restablecer la configuración';
      setErrorMessage(message);
    } finally {
      setIsResetting(false);
    }
  };

  const loadBadgeVariant =
    loadState === 'ready'
      ? 'secondary'
      : loadState === 'error'
        ? 'destructive'
        : 'outline';
  const loadBadgeLabel =
    loadState === 'ready'
      ? 'Conectado'
      : loadState === 'error'
        ? 'Error de carga'
        : 'Cargando...';

  const controlsDisabled =
    loadState !== 'ready' || status === 'saving' || isResetting;

  const updateVendorAnalysisAutoRun = (value: boolean) => {
    setSettings((prev) => ({
      ...prev,
      vendorAnalysis: { ...prev.vendorAnalysis, autoRunOnCreate: value },
    }));
    resetStatus();
  };

  const updateVendorParallelConfig = (
    field: 'maxConcurrentPhases' | 'interPhaseDelayMs',
    value: number | string,
  ) => {
    const limits = vendorParallelLimits[field];
    const parsed =
      typeof value === 'number' ? value : parseNumericInput(value);
    if (parsed === null) {
      return;
    }
    const clamped = clampValue(parsed, limits.min, limits.max);
    setSettings((prev) => ({
      ...prev,
      vendorDeepResearchParallel: {
        ...prev.vendorDeepResearchParallel,
        [field]: clamped,
      },
    }));
    resetStatus();
  };

  const updateVendorParallelToggle = (
    field: 'gpt4ParallelEnabled' | 'gpt5ParallelEnabled',
    checked: boolean,
  ) => {
    setSettings((prev) => ({
      ...prev,
      vendorDeepResearchParallel: {
        ...prev.vendorDeepResearchParallel,
        [field]: checked,
      },
    }));
    resetStatus();
  };

  const leftColumn = (
    <>
      <AdminSection
        title="Selección de modelos por fase"
        helpText="Mapea las fases de los agentes a la configuración del backend."
      >
        <div className={modelGrid}>
          {ADMIN_PHASES.map((phase) => (
            <div key={phase.id} className={modelTileClass}>
              <p className="text-sm font-semibold">{phase.label}</p>
              <Select
                disabled={controlsDisabled}
                value={settings.modelConfig[phase.id]}
                onValueChange={(value) =>
                  updateModelConfig(phase.id, value as AdminModelOption)
                }
              >
                <SelectTrigger
                  id={`model-${phase.id}`}
                  className="h-10 text-sm"
                  disabled={controlsDisabled}
                >
                  <SelectValue placeholder="Selecciona modelo" />
                </SelectTrigger>
                <SelectContent>
                  {MODEL_OPTIONS.map((option) => (
                    <SelectItem
                      key={option.value}
                      value={option.value}
                      className="py-2 text-sm"
                      title={option.description || option.label}
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      </AdminSection>

      <AdminSection
        title="Reasoning effort por agente"
        helpText="Controla la intensidad del razonamiento sin tocar código."
      >
        <div className={denseGrid}>
          {ADMIN_PHASES.map((phase) => (
            <div key={`reason-${phase.id}`} className={tileClass}>
              <p className="text-sm font-semibold">{phase.label}</p>
              <Select
                disabled={controlsDisabled}
                value={settings.reasoningConfig[phase.id]}
                onValueChange={(value) =>
                  updateReasoning(phase.id, value as AdminReasoningEffort)
                }
              >
                <SelectTrigger
                  id={`reason-${phase.id}`}
                  className="h-8 text-xs"
                  disabled={controlsDisabled}
                >
                  <SelectValue placeholder="Effort" />
                </SelectTrigger>
                <SelectContent>
                  {REASONING_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      </AdminSection>

      <AdminSection
        title="Operativa y observabilidad"
        helpText="Logging, retries y alertas se aplican inmediatamente."
      >
        <div className={denseGrid}>
          <div className={`${tileClass} space-y-2`}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">Logging</p>
              <span className="text-[11px] text-muted-foreground">Nivel actual</span>
            </div>
            <Select
              disabled={controlsDisabled}
              value={settings.loggingLevel}
              onValueChange={(value) =>
                updateLoggingLevel(value as AdminLoggingLevel)
              }
            >
              <SelectTrigger
                id="logging-level"
                className="h-8 text-xs"
                disabled={controlsDisabled}
              >
                <SelectValue placeholder="Nivel" />
              </SelectTrigger>
              <SelectContent>
                {LOGGING_LEVEL_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {RETRY_FIELDS.map((field) => (
            <NumericSliderTile
              key={field.id}
              className={tileClass}
              label={field.label}
              value={settings.retryConfig[field.id]}
              min={field.min}
              max={field.max}
              step={field.step}
              unit={field.unit}
              disabled={controlsDisabled}
              inputId={`retry-${field.id}`}
              onSliderCommit={(value) => updateRetry(field.id, value)}
              onInputChange={(value) => updateRetry(field.id, value)}
            />
          ))}
        </div>

        <div className={denseGrid}>
          {ALERT_TOGGLES.map((toggle) => (
            <label
              key={toggle.id}
              className={`${tileClass} flex items-center gap-2 space-y-0`}
              title={toggle.description}
            >
              <Checkbox
                disabled={controlsDisabled}
                checked={settings.alertToggles[toggle.id]}
                onCheckedChange={(checked) =>
                  updateAlertToggle(toggle.id, Boolean(checked))
                }
                className="mt-0"
              />
              <p className="text-sm font-semibold leading-none">{toggle.label}</p>
            </label>
          ))}
        </div>
      </AdminSection>

      <AdminSection
        title="Timeouts operativos"
        helpText="Valores en ms aplicados al backend para cada fase."
      >
        <div className={denseGrid}>
          {TIMEOUT_FIELDS.map((field) => (
            <NumericSliderTile
              key={field.id}
              className={tileClass}
              label={field.label}
              value={settings.timeoutConfig[field.id]}
              min={field.min}
              max={field.max}
              step={field.step}
              unit={field.unit}
              disabled={controlsDisabled}
              inputId={`timeout-${field.id}`}
              onSliderCommit={(value) => updateTimeout(field.id, value)}
              onInputChange={(value) => updateTimeout(field.id, value)}
            />
          ))}
        </div>
      </AdminSection>
    </>
  );

  const rightColumn = (
    <>
      <AdminSection
        title="Features / herramientas"
        helpText="Activa web search, file search y beta features."
      >
        <div className={denseGrid}>
          {FEATURE_TOGGLES.map((toggle) => (
            <label
              key={toggle.id}
              className={`${tileClass} flex items-center gap-2 space-y-0`}
              title={toggle.description}
            >
              <Checkbox
                disabled={controlsDisabled}
                checked={settings.featureToggles[toggle.id]}
                onCheckedChange={(checked) =>
                  updateFeatureToggle(toggle.id, Boolean(checked))
                }
                className="mt-0"
              />
              <p className="text-sm font-medium leading-none">{toggle.label}</p>
            </label>
          ))}
        </div>
      </AdminSection>

      <AdminSection
        title="Vendor analysis"
        helpText="Controla el análisis automático y recursos asignados al deep research de vendors."
      >
        <div className={`${tileClass} flex items-center justify-between`}>
          <div>
            <p className="text-sm font-semibold">Lanzar análisis al crear vendor</p>
            <p className="text-xs text-muted-foreground">
              Ejecuta automáticamente el vendor deep research en background tras guardar.
            </p>
          </div>
          <Checkbox
            checked={settings.vendorAnalysis?.autoRunOnCreate}
            onCheckedChange={(checked) => updateVendorAnalysisAutoRun(Boolean(checked))}
          />
        </div>
        <div className={`${tileClass} space-y-4`}>
          <div>
            <p className="text-sm font-semibold">Paralelismo GPT-4 / GPT-5</p>
            <p className="text-xs text-muted-foreground">
              Activa el paralelismo por familia de modelo y define los límites globales
              (`VENDOR_DEEP_RESEARCH_GPT5_MAX_PARALLEL`, `VENDOR_DEEP_RESEARCH_GPT5_DELAY_MS`).
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex items-start gap-2 rounded-md border bg-muted/40 px-3 py-2">
              <Checkbox
                disabled={controlsDisabled}
                checked={settings.vendorDeepResearchParallel.gpt4ParallelEnabled}
                onCheckedChange={(checked) =>
                  updateVendorParallelToggle('gpt4ParallelEnabled', Boolean(checked))
                }
                className="mt-1"
              />
              <div>
                <p className="text-sm font-semibold leading-tight">Activar en GPT-4*</p>
                <p className="text-xs text-muted-foreground">
                  Aplica a gpt-4o, gpt-4o mini, gpt-4.1 y gpt-4.1 mini.
                </p>
              </div>
            </label>
            <label className="flex items-start gap-2 rounded-md border bg-muted/40 px-3 py-2">
              <Checkbox
                disabled={controlsDisabled}
                checked={settings.vendorDeepResearchParallel.gpt5ParallelEnabled}
                onCheckedChange={(checked) =>
                  updateVendorParallelToggle('gpt5ParallelEnabled', Boolean(checked))
                }
                className="mt-1"
              />
              <div>
                <p className="text-sm font-semibold leading-tight">Activar en GPT-5*</p>
                <p className="text-xs text-muted-foreground">
                  Se aplica a gpt-5, gpt-5 mini/nano y gpt-5.1.
                </p>
              </div>
            </label>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <NumericSliderTile
              className="space-y-3"
              label="Máx. fases concurrentes"
              value={settings.vendorDeepResearchParallel.maxConcurrentPhases}
              min={vendorParallelLimits.maxConcurrentPhases.min}
              max={vendorParallelLimits.maxConcurrentPhases.max}
              step={vendorParallelLimits.maxConcurrentPhases.step}
              unit={vendorParallelLimits.maxConcurrentPhases.unit}
              disabled={controlsDisabled}
              inputId="vendor-parallel-max"
              onSliderCommit={(value) =>
                updateVendorParallelConfig('maxConcurrentPhases', value)
              }
              onInputChange={(value) =>
                updateVendorParallelConfig('maxConcurrentPhases', value)
              }
            />
            <NumericSliderTile
              className="space-y-3"
              label="Delay entre llamadas (ms)"
              value={settings.vendorDeepResearchParallel.interPhaseDelayMs}
              min={vendorParallelLimits.interPhaseDelayMs.min}
              max={vendorParallelLimits.interPhaseDelayMs.max}
              step={vendorParallelLimits.interPhaseDelayMs.step}
              unit={vendorParallelLimits.interPhaseDelayMs.unit}
              disabled={controlsDisabled}
              inputId="vendor-parallel-delay"
              onSliderCommit={(value) =>
                updateVendorParallelConfig('interPhaseDelayMs', value)
              }
              onInputChange={(value) =>
                updateVendorParallelConfig('interPhaseDelayMs', value)
              }
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            Se ejecuta únicamente cuando el análisis usa las familias activadas (GPT-4* o GPT-5*).
          </p>
        </div>
      </AdminSection>

      <AdminSection
        title="Calidad / límites"
        helpText="Define tokens máximos, temperatura y límites por sección."
      >
        <div className="space-y-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Máximos de tokens
          </p>
          <div className={denseGrid}>
            {TOKEN_FIELDS.map((field) => (
              <NumericSliderTile
                key={field.id}
                className={tileClass}
                label={field.label}
                value={settings.tokenConfig[field.id]}
                min={field.min}
                max={field.max}
                step={field.step}
                unit={field.unit}
                disabled={controlsDisabled}
                inputId={`token-${field.id}`}
                onSliderCommit={(value) => updateTokenLimit(field.id, value)}
                onInputChange={(value) => updateTokenLimit(field.id, value)}
              />
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Temperaturas por agente
          </p>
          <div className={denseGrid}>
            {TEMPERATURE_FIELDS.map((field) => (
              <NumericSliderTile
                key={field.id}
                className={tileClass}
                label={field.label}
                value={settings.temperatureConfig[field.id]}
                min={field.min}
                max={field.max}
                step={field.step}
                unit={field.unit}
                decimals={field.decimals}
                disabled={controlsDisabled}
                inputId={`temp-${field.id}`}
                onSliderCommit={(value) => updateTemperature(field.id, value)}
                onInputChange={(value) => updateTemperature(field.id, value)}
              />
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Límites por sección
          </p>
          <div className={denseGrid}>
            {SECTION_LIMIT_FIELDS.map((field) => (
              <NumericSliderTile
                key={field.id}
                className={tileClass}
                label={field.label}
                value={settings.sectionLimits[field.id]}
                min={field.min}
                max={field.max}
                step={field.step}
                unit={field.unit}
                disabled={controlsDisabled}
                inputId={`limit-${field.id}`}
                onSliderCommit={(value) => updateSectionLimit(field.id, value)}
                onInputChange={(value) => updateSectionLimit(field.id, value)}
              />
            ))}
          </div>
        </div>
      </AdminSection>

      <AdminSection
        title="Experiencia de usuario y layout"
        helpText="Controla qué ven los vendedores en el dashboard."
      >
        <div className={denseGrid}>
          {DASHBOARD_SECTIONS.map((section) => (
            <label
              key={section.id}
              className={`${tileClass} flex items-center gap-2 space-y-0`}
            >
              <Checkbox
                disabled={controlsDisabled}
                checked={settings.dashboardVisibility[section.id]}
                onCheckedChange={(checked) =>
                  updateDashboardVisibility(section.id, Boolean(checked))
                }
              />
              <p className="text-sm font-semibold leading-none">{section.label}</p>
            </label>
          ))}
        </div>

        <div className={denseGrid}>
          <label
            className={`${tileClass} flex items-center gap-2 space-y-0`}
            title="Si lo desactivas asumimos modo productivo."
          >
            <Checkbox
              disabled={controlsDisabled}
              checked={settings.sandboxMode}
              onCheckedChange={(checked) => updateSandbox(Boolean(checked))}
            />
            <p className="text-sm font-semibold leading-none">Sandbox activo</p>
          </label>
          <div className={`${tileClass} space-y-2`} title="Idioma para prompts y contenido">
            <div className="text-sm font-semibold">Idioma preferido</div>
            <Select
              disabled={controlsDisabled}
              value={settings.preferredLanguage}
              onValueChange={(value) =>
                updateLanguage(value as AdminLanguageOption)
              }
            >
              <SelectTrigger
                id="preferred-language"
                className="h-8 text-xs"
                disabled={controlsDisabled}
              >
                <SelectValue placeholder="Idioma" />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </AdminSection>
    </>
  );

  return (
    <AppShell
      title="Panel de administración"
      description="Configura los parámetros LLM y sincronízalos con el backend"
      actions={
        <div className="flex items-center gap-2">
          <Link href="/opportunities">
            <Button variant="ghost" size="sm">
              Oportunidades
            </Button>
          </Link>
          <Link href="/">
            <Button variant="outline" size="sm">
              Inicio
            </Button>
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        <AdminSettingsShell
          title="Configuración centralizada"
          description="Los cambios se guardan vía /api/admin/settings y se aplican en caliente sobre llmConfig."
        >
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={loadState === 'loading'}
                  onClick={() => setReloadKey((prev) => prev + 1)}
                >
                  Recargar
                </Button>
                {errorMessage && loadState === 'error' ? (
                  <p className="text-xs text-destructive">{errorMessage}</p>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <Badge variant={loadBadgeVariant}>{loadBadgeLabel}</Badge>
                {status === 'saving' && <span>Guardando…</span>}
                {status === 'saved' && loadState === 'ready' && (
                  <span className="text-green-600 dark:text-green-400">
                    Cambios aplicados en backend
                  </span>
                )}
                {status === 'error' && errorMessage && (
                  <span className="text-destructive">{errorMessage}</span>
                )}
              </div>
              <Button type="submit" size="sm" disabled={status === 'saving'}>
                {status === 'saving' ? 'Guardando…' : 'Guardar configuración'}
              </Button>
            </div>

            <fieldset className="space-y-6" disabled={controlsDisabled}>
              <AdminSettingsGrid leftColumn={leftColumn} rightColumn={rightColumn} />

              <div className="flex flex-wrap items-center gap-3">
                <Button type="submit" disabled={status === 'saving'}>
                  {status === 'saving' ? 'Guardando…' : 'Guardar configuración'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={controlsDisabled}
                  onClick={handleReset}
                >
                  {isResetting ? 'Restableciendo…' : 'Reset a defaults'}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Los valores se almacenan en `storage/admin-settings.json` y se aplican a llmConfig.
                </p>
              </div>
            </fieldset>
          </form>
        </AdminSettingsShell>

        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle>Estado de la integración</CardTitle>
            <CardDescription>
              Qué ocurre cuando modificas los ajustes desde este panel.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <ul className="list-disc pl-4 space-y-1">
              <li>GET/PUT `/api/admin/settings` servidos desde `AdminSettingsService` con autenticación opcional.</li>
              <li>Los overrides actualizan `llmConfig` (modelos, reasoning, timeouts, logging) en caliente.</li>
              <li>Web/File search y proposal beta controlan las herramientas utilizadas por los agentes.</li>
              <li>Botón Reset regenera `storage/admin-settings.json` con los defaults documentados.</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
