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
  appendDossierText,
  getOpportunityDossier,
  uploadDossierFile,
  getLatestDashboardForOpportunity,
} from '@/lib/api';
import type {
  Opportunity,
  ClientAccount,
  ServiceOffering,
  Vendor,
  OpportunityDossier,
  DossierTextChunk,
  DossierSourceType,
  ClientIntelDashboard,
} from '@/lib/types';
import {
  ArrowLeft,
  Calendar,
  Coins,
  Copy,
  ExternalLink,
  FileText,
  Loader2,
  Rocket,
  UploadCloud,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

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
  const [dossier, setDossier] = useState<OpportunityDossier | null>(null);
  const [dossierLoading, setDossierLoading] = useState(false);
  const [dossierError, setDossierError] = useState<string | null>(null);
  const [textSource, setTextSource] = useState<DossierSourceType>('email');
  const [textTitle, setTextTitle] = useState('');
  const [textContent, setTextContent] = useState('');
  const [isSubmittingText, setIsSubmittingText] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [latestDashboard, setLatestDashboard] = useState<ClientIntelDashboard | null>(null);
  const [latestDashboardError, setLatestDashboardError] = useState<string | null>(null);
  const [latestLoading, setLatestLoading] = useState(false);

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
        await Promise.all([loadDossier(opp.id), loadLatestDashboardSnapshot(opp.id)]);
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

  const loadDossier = async (opportunityId: string) => {
    try {
      setDossierLoading(true);
      const dossierResponse = await getOpportunityDossier(opportunityId);
      setDossier(dossierResponse);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'No se pudo cargar el dossier';
      setDossierError(message);
    } finally {
      setDossierLoading(false);
    }
  };

  const loadLatestDashboardSnapshot = async (opportunityId: string) => {
    try {
      setLatestLoading(true);
      setLatestDashboardError(null);
      const snapshot = await getLatestDashboardForOpportunity(opportunityId);
      setLatestDashboard(snapshot);
    } catch (err) {
      const code = (err as Error & { code?: string }).code;
      if (code !== 'NOT_FOUND') {
        const message =
          err instanceof Error ? err.message : 'No se pudo obtener el último dashboard';
        setLatestDashboardError(message);
      } else {
        setLatestDashboard(null);
      }
    } finally {
      setLatestLoading(false);
    }
  };

  const handleCopyOpportunityId = async () => {
    if (!opportunity) return;
    try {
      await navigator.clipboard.writeText(opportunity.id);
    } catch {
      // ignore
    }
  };

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

  const handleSubmitDossierText = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!opportunity) return;
    setIsSubmittingText(true);
    setDossierError(null);
    try {
      const chunk = await appendDossierText(opportunity.id, {
        sourceType: textSource,
        title: textTitle || undefined,
        content: textContent,
      });
      setDossier((prev) =>
        prev
          ? {
              ...prev,
              textChunks: [...prev.textChunks, chunk],
              updatedAt: chunk.createdAt,
            }
          : prev,
      );
      setTextTitle('');
      setTextContent('');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Error al guardar la nota';
      setDossierError(message);
    } finally {
      setIsSubmittingText(false);
    }
  };

  const handleFileUpload = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!opportunity || !selectedFile) return;
    setIsUploadingFile(true);
    setFileError(null);
    try {
      const response = await uploadDossierFile(opportunity.id, selectedFile);
      setDossier((prev) =>
        prev
          ? {
              ...prev,
              openAiFileIds: [...prev.openAiFileIds, response.fileId],
              updatedAt: new Date().toISOString(),
            }
          : prev,
      );
      setSelectedFile(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Error al subir el archivo';
      setFileError(message);
    } finally {
      setIsUploadingFile(false);
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
            <Link href="/admin">
              <Button variant="ghost" size="sm">
                Admin
              </Button>
            </Link>
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
              <CardContent className="space-y-4">
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

                <div className="space-y-2 border-t pt-3">
                  <p className="text-xs text-muted-foreground">Opportunity ID</p>
                  <div className="flex items-center gap-2">
                    <code className="px-2 py-1 rounded bg-muted text-xs truncate">
                      {opportunity.id}
                    </code>
                    <Button variant="outline" size="sm" className="gap-1" onClick={handleCopyOpportunityId}>
                      <Copy className="h-3 w-3" />
                      Copiar
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 border-t pt-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Último dashboard</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={() => loadLatestDashboardSnapshot(opportunity.id)}
                    >
                      Recargar
                    </Button>
                  </div>
                  {latestLoading ? (
                    <p className="text-xs text-muted-foreground">Comprobando dashboard...</p>
                  ) : latestDashboard ? (
                    <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs space-y-1">
                      <p className="font-semibold">
                        {new Date(latestDashboard.generatedAt).toLocaleString('es-ES')}
                      </p>
                      <p className="text-muted-foreground">Modelo: {latestDashboard.llmModelUsed}</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full gap-1 mt-2"
                        onClick={() => router.push(`/dashboard/${latestDashboard.id}`)}
                      >
                        <ExternalLink className="h-3 w-3" />
                        Ver dashboard
                      </Button>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Aún no se ha generado ningún dashboard para esta oportunidad.
                    </p>
                  )}
                  {latestDashboardError && (
                    <p className="text-xs text-destructive">{latestDashboardError}</p>
                  )}
                </div>
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
                <CardTitle>Dossier de oportunidad</CardTitle>
                <CardDescription>
                  Añade notas o adjunta archivos relevantes que servirán como contexto directo para el dashboard.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <form onSubmit={handleSubmitDossierText} className="space-y-3">
                    <h3 className="font-semibold text-sm">Añadir nota textual</h3>
                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground font-medium">
                        Tipo de fuente
                      </label>
                      <Select
                        value={textSource}
                        onValueChange={(value) =>
                          setTextSource(value as DossierSourceType)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="meeting_notes">Notas de reunión</SelectItem>
                          <SelectItem value="rfp">RFP</SelectItem>
                          <SelectItem value="brief">Brief</SelectItem>
                          <SelectItem value="other">Otro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground font-medium">
                        Título (opcional)
                      </label>
                      <Input
                        value={textTitle}
                        onChange={(e) => setTextTitle(e.target.value)}
                        placeholder="Reunión kickoff"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground font-medium">
                        Contenido
                      </label>
                      <Textarea
                        value={textContent}
                        onChange={(e) => setTextContent(e.target.value)}
                        rows={6}
                        placeholder="Pega aquí emails, notas o briefs relevantes..."
                        required
                      />
                    </div>
                    <div className="flex justify-end">
                      <Button type="submit" disabled={isSubmittingText}>
                        {isSubmittingText ? 'Guardando...' : 'Guardar nota'}
                      </Button>
                    </div>
                  </form>

                  <form onSubmit={handleFileUpload} className="space-y-3">
                    <h3 className="font-semibold text-sm">Adjuntar archivo</h3>
                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground font-medium">
                        Archivo (PDF, DOCX, etc.)
                      </label>
                      <Input
                        type="file"
                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      />
                    </div>
                    {selectedFile && (
                      <p className="text-xs text-muted-foreground">
                        {selectedFile.name} · {(selectedFile.size / 1024).toFixed(1)} KB
                      </p>
                    )}
                    <div className="flex justify-end">
                      <Button
                        variant="outline"
                        type="submit"
                        disabled={!selectedFile || isUploadingFile}
                        className="gap-2"
                      >
                        {isUploadingFile ? (
                          <>
                            <UploadCloud className="h-4 w-4 animate-spin" />
                            Subiendo...
                          </>
                        ) : (
                          <>
                            <UploadCloud className="h-4 w-4" />
                            Adjuntar archivo
                          </>
                        )}
                      </Button>
                    </div>
                    {fileError && (
                      <p className="text-xs text-destructive">{fileError}</p>
                    )}
                  </form>
                </div>

                {dossierError && (
                  <p className="text-sm text-destructive">{dossierError}</p>
                )}

                <div className="space-y-3">
                  <h4 className="font-semibold text-sm">Notas cargadas</h4>
                  {dossierLoading ? (
                    <p className="text-xs text-muted-foreground">Cargando dossier...</p>
                  ) : dossier && dossier.textChunks.length > 0 ? (
                    <div className="space-y-3">
                      {dossier.textChunks
                        .slice()
                        .sort(
                          (a, b) =>
                            new Date(b.createdAt).getTime() -
                            new Date(a.createdAt).getTime(),
                        )
                        .map((chunk) => (
                          <div key={chunk.id} className="border rounded p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <Badge variant="outline" className="uppercase">
                                {chunk.sourceType.replace('_', ' ')}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(chunk.createdAt), {
                                  addSuffix: true,
                                  locale: es,
                                })}
                              </span>
                            </div>
                            {chunk.title && (
                              <p className="text-sm font-semibold">{chunk.title}</p>
                            )}
                            <p className="text-sm text-muted-foreground whitespace-pre-line">
                              {chunk.content}
                            </p>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Aún no hay notas en el dossier.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Archivos adjuntos</h4>
                  {dossier && dossier.openAiFileIds.length > 0 ? (
                    <ul className="text-sm text-muted-foreground list-disc pl-5">
                      {dossier.openAiFileIds.map((fileId) => (
                        <li key={fileId}>
                          {fileId}{' '}
                          <span className="text-xs italic">
                            (placeholder OpenAI File Inputs)
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Todavía no hay archivos adjuntos.
                    </p>
                  )}
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


