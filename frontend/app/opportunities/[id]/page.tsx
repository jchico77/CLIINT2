'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Button,
} from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  AnalysisProgress,
  type AnalysisStep,
} from '@/components/analysis-progress';
import {
  getOpportunity,
  getClient,
  getService,
  getVendor,
  createOpportunityDashboardWithProgress,
} from '@/lib/api';
import type {
  Opportunity,
  ClientAccount,
  ServiceOffering,
  Vendor,
} from '@/lib/types';
import {
  ArrowLeft,
  Calendar,
  Coins,
  FileText,
  Loader2,
  Rocket,
} from 'lucide-react';

const generationSteps: AnalysisStep[] = [
  { id: 'deep-research', label: 'Investigación profunda', status: 'pending' },
  { id: 'client-analysis', label: 'Análisis del cliente', status: 'pending' },
  { id: 'vendor-research', label: 'Evidencias del vendor', status: 'pending' },
  { id: 'competitive', label: 'Análisis competitivo', status: 'pending' },
  { id: 'fit-strategy', label: 'Fit & Plays estratégicos', status: 'pending' },
  { id: 'news', label: 'Noticias relevantes', status: 'pending' },
  { id: 'finalize', label: 'Generando dashboard', status: 'pending' },
];

interface OpportunityDetailPageProps {
  params: { id: string };
}

export default function OpportunityDetailPage({ params }: OpportunityDetailPageProps) {
  const router = useRouter();
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [client, setClient] = useState<ClientAccount | null>(null);
  const [service, setService] = useState<ServiceOffering | null>(null);
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [steps, setSteps] = useState<AnalysisStep[]>(generationSteps);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    const loadOpportunity = async () => {
      try {
        const opp = await getOpportunity(params.id);
        setOpportunity(opp);
        const [clientData, serviceData, vendorData] = await Promise.all([
          getClient(opp.clientId),
          getService(opp.serviceOfferingId),
          getVendor(opp.vendorId),
        ]);
        setClient(clientData);
        setService(serviceData);
        setVendor(vendorData);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'No se pudo cargar la oportunidad';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    void loadOpportunity();
  }, [params.id]);

  const stageVariant = useMemo(() => {
    if (!opportunity) return 'secondary';
    switch (opportunity.stage) {
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
  }, [opportunity]);

  const resetGenerationState = () => {
    setSteps(generationSteps);
    setCurrentStepIndex(0);
    setGenerationError(null);
  };

  const handleGenerateDashboard = async () => {
    if (!opportunity) return;
    resetGenerationState();
    setIsGenerating(true);

    try {
      const response = await createOpportunityDashboardWithProgress(
        {
          vendorId: opportunity.vendorId,
          opportunityId: opportunity.id,
          opportunityContextOverride: opportunity.notes,
        },
        (progressEvent) => {
          setSteps((prev) =>
            prev.map((step) =>
              step.id === progressEvent.stepId
                ? { ...step, status: progressEvent.status, message: progressEvent.message }
                : step
            )
          );

          const indexMap: Record<string, number> = {
            'deep-research': 0,
            'client-analysis': 1,
            'vendor-research': 2,
            'competitive': 3,
            'fit-strategy': 4,
            'news': 5,
            'finalize': 6,
          };

          if (indexMap[progressEvent.stepId] !== undefined) {
            setCurrentStepIndex(indexMap[progressEvent.stepId]);
          }
        }
      );

      router.push(`/dashboard/${response.dashboardId}`);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Error al generar el dashboard';
      setGenerationError(message);
      setIsGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p>Cargando oportunidad...</p>
        </div>
      </div>
    );
  }

  if (error || !opportunity) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>{error || 'Oportunidad no encontrada'}</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-end">
            <Link href="/opportunities">
              <Button>Volver a oportunidades</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="w-full flex h-14 items-center px-6 justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Volver
            </Button>
            <div>
              <p className="text-xs text-muted-foreground">Oportunidad</p>
              <h1 className="text-xl font-semibold">{opportunity.name}</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/opportunities">
              <Button variant="outline" size="sm">
                Ver oportunidades
              </Button>
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex-1 px-6 py-6 bg-muted/30">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row">
            <Card className="flex-1">
              <CardHeader>
                <CardTitle>Resumen de oportunidad</CardTitle>
                <CardDescription>
                  Metadatos críticos para preparar el dashboard estratégico.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant={stageVariant as 'default' | 'secondary' | 'destructive' | 'outline'}>
                    Stage: {opportunity.stage.toUpperCase()}
                  </Badge>
                  {opportunity.deadline && (
                    <div className="inline-flex items-center gap-2 text-sm text-muted-foreground border rounded-full px-3 py-1">
                      <Calendar className="h-4 w-4" />
                      {new Date(opportunity.deadline).toLocaleDateString('es-ES')}
                    </div>
                  )}
                  {opportunity.estimatedValue && (
                    <div className="inline-flex items-center gap-2 text-sm text-muted-foreground border rounded-full px-3 py-1">
                      <Coins className="h-4 w-4" />
                      {opportunity.estimatedValue.toLocaleString('es-ES', {
                        style: 'currency',
                        currency: opportunity.currency || 'EUR',
                        maximumFractionDigits: 0,
                      })}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Vendor</p>
                    <p className="font-medium">{vendor?.name ?? opportunity.vendorId}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Cliente</p>
                    <p className="font-medium">{client?.name ?? opportunity.clientId}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Servicio</p>
                    <p className="font-medium">{service?.name ?? opportunity.serviceOfferingId}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Creada</p>
                    <p className="font-medium">
                      {new Date(opportunity.createdAt).toLocaleString('es-ES')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="lg:w-80">
              <CardHeader>
                <CardTitle>Acciones</CardTitle>
                <CardDescription>Genera el dashboard estratégico cuando tengas contexto suficiente.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  className="w-full gap-2"
                  onClick={handleGenerateDashboard}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generando dashboard...
                    </>
                  ) : (
                    <>
                      <Rocket className="h-4 w-4" />
                      Generar Strategy Dashboard
                    </>
                  )}
                </Button>
                {generationError && (
                  <p className="text-xs text-destructive">{generationError}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  El dashboard se genera con GPT-5.1 y Deep Research. Verás el progreso en tiempo real.
                </p>
              </CardContent>
            </Card>
          </div>

          {isGenerating && (
            <AnalysisProgress steps={steps} currentStep={currentStepIndex} />
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Notas de oportunidad</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-line text-muted-foreground">
                  {opportunity.notes || 'Sin notas registradas todavía.'}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Dossier (próximamente)</CardTitle>
                <CardDescription>
                  Aquí podrás añadir emails, RFPs y documentos clave para reforzar el dashboard.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border border-dashed rounded p-4 text-sm text-muted-foreground">
                  Esta sección se habilitará en la Fase 2 con uploads y File Search.
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Contexto operativo</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Client Website</p>
                <a
                  href={client?.websiteUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-primary hover:underline"
                >
                  {client?.websiteUrl || 'N/A'}
                </a>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Service tags</p>
                <p className="font-medium">
                  {service?.categoryTags?.join(', ') || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Última actualización</p>
                <p className="font-medium">
                  {new Date(opportunity.updatedAt).toLocaleString('es-ES')}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}


