'use client';

import { useEffect, useMemo, useState } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  ExternalLink,
  Loader2,
  RefreshCw,
  Sparkles,
  Video,
  Newspaper,
  Share2,
  Award,
  Layers,
} from 'lucide-react';
import {
  getVendor,
  getVendorAnalysis,
  reanalyzeVendor,
} from '@/lib/api';
import type {
  Vendor,
  VendorAnalysisRecord,
  VendorDeepResearchReport,
  VendorDeepResearchService,
  VendorDeepResearchCaseStudy,
  VendorDeepResearchVideoItem,
  VendorDeepResearchNewsItem,
  VendorDeepResearchSocialSignal,
  VendorDeepResearchSource,
} from '@/lib/types';
import { logger } from '@/lib/logger';

const getSafeExternalUrl = (value?: string | null, context?: string): string | null => {
  if (!value || typeof value !== 'string') {
    return null;
  }
  try {
    const candidate = value.trim();
    if (!candidate) {
      return null;
    }
    const url = new URL(candidate);
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return url.toString();
    }
  } catch {
    logger.warn('Discarded invalid vendor analysis URL', { context, value });
    return null;
  }
  logger.warn('Discarded unsupported protocol in vendor analysis URL', { context, value });
  return null;
};

interface PageProps {
  params: { id: string };
}

export default function VendorAnalysisPage({ params }: PageProps) {
  const vendorId = params.id;
  const router = useRouter();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [analysis, setAnalysis] = useState<VendorAnalysisRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reanalyzing, setReanalyzing] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [vendorData, analysisData] = await Promise.all([
        getVendor(vendorId),
        getVendorAnalysis(vendorId).catch(() => null),
      ]);
      setVendor(vendorData);
      setAnalysis(analysisData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, [vendorId]);

  const report: VendorDeepResearchReport | null = analysis?.report ?? null;

  const statusLabel = useMemo(() => {
    switch (analysis?.status) {
      case 'IN_PROGRESS':
        return 'En progreso';
      case 'COMPLETED':
        return 'Completado';
      case 'FAILED':
        return 'Error';
      case 'PENDING':
        return 'Pendiente';
      default:
        return 'Sin análisis';
    }
  }, [analysis?.status]);

  const handleReanalyze = async () => {
    setReanalyzing(true);
    try {
      await reanalyzeVendor(vendorId);
      await fetchData();
      logger.info('Vendor analysis requeued from detail page', { vendorId });
    } catch (err) {
      logger.error('Failed to reanalyze vendor from detail page', {
        vendorId,
        message: err instanceof Error ? err.message : err,
      });
    } finally {
      setReanalyzing(false);
    }
  };

  const renderServices = (services: VendorDeepResearchService[]) => {
    if (!services.length) {
      return <p className="text-sm text-muted-foreground">Sin servicios registrados.</p>;
    }
    return (
      <div className="space-y-4">
        {services.map((service) => (
          <div key={service.name} className="rounded-lg border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold">{service.name}</p>
                <p className="text-sm text-muted-foreground">{service.description}</p>
              </div>
              {service.categoryTags.length ? (
                <div className="flex flex-wrap gap-1">
                  {service.categoryTags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </div>
            {service.keyFeatures.length ? (
              <ul className="mt-3 list-disc space-y-1 pl-4 text-sm text-muted-foreground">
                {service.keyFeatures.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ))}
      </div>
    );
  };

  const renderCaseStudies = (cases: VendorDeepResearchCaseStudy[]) => {
    if (!cases.length) {
      return <p className="text-sm text-muted-foreground">Sin casos de éxito destacados.</p>;
    }
    return (
      <div className="space-y-4">
        {cases.map((item) => {
          const sourceUrl = getSafeExternalUrl(item.source, 'caseStudies.source');
          return (
            <div key={item.title} className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-semibold">{item.title}</p>
                  <p className="text-sm text-muted-foreground">{item.client}</p>
                </div>
              </div>
              <p className="text-sm">
                <span className="font-semibold">Reto:</span> {item.challenge}
              </p>
              <p className="text-sm">
                <span className="font-semibold">Solución:</span> {item.solution}
              </p>
              {item.results.length ? (
                <ul className="text-sm text-muted-foreground list-disc pl-4 space-y-1">
                  {item.results.map((result) => (
                    <li key={result}>{result}</li>
                  ))}
                </ul>
              ) : null}
              {sourceUrl ? (
                <a
                  href={sourceUrl}
                  target="_blank"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  rel="noreferrer"
                >
                  Fuente
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : null}
            </div>
          );
        })}
      </div>
    );
  };

  const renderVideos = (videos: VendorDeepResearchVideoItem[]) => {
    if (!videos.length) {
      return <p className="text-sm text-muted-foreground">No se encontraron vídeos recientes.</p>;
    }
    return (
      <div className="space-y-4">
        {videos.map((videoItem) => {
          const videoUrl = getSafeExternalUrl(videoItem.url, 'videoHighlights.url');
          return (
            <div key={videoItem.url ?? videoItem.title} className="rounded-lg border p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="font-semibold">{videoItem.title}</p>
                <p className="text-sm text-muted-foreground">
                  {videoItem.channel} • {new Date(videoItem.publishedAt).toLocaleDateString('es-ES')}
                </p>
              </div>
              {videoUrl ? (
                <Button variant="ghost" size="sm" asChild>
                  <a href={videoUrl} target="_blank" rel="noreferrer" className="gap-1">
                    Ver vídeo
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </Button>
              ) : (
                <span className="text-xs text-muted-foreground">Enlace no disponible</span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{videoItem.description}</p>
            {videoItem.angle ? (
              <p className="text-xs uppercase text-muted-foreground">Ángulo: {videoItem.angle}</p>
            ) : null}
          </div>
          );
        })}
      </div>
    );
  };

  const renderNews = (news: VendorDeepResearchNewsItem[]) => {
    if (!news.length) {
      return <p className="text-sm text-muted-foreground">No hay noticias recientes.</p>;
    }
    return (
      <div className="space-y-4">
        {news.map((item) => {
          const newsUrl = getSafeExternalUrl(item.url, 'newsHighlights.url');
          return (
            <div key={`${item.title}-${item.date}`} className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-semibold">{item.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.source} • {new Date(item.date).toLocaleDateString('es-ES')}
                  </p>
                </div>
                {newsUrl ? (
                  <Button variant="ghost" size="sm" asChild>
                    <a href={newsUrl} target="_blank" rel="noreferrer" className="gap-1">
                      Leer
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </Button>
                ) : null}
              </div>
              <p className="text-sm">{item.summary}</p>
              {item.impact ? (
                <p className="text-xs text-muted-foreground">Impacto: {item.impact}</p>
              ) : null}
            </div>
          );
        })}
      </div>
    );
  };

  const renderSocial = (signals: VendorDeepResearchSocialSignal[]) => {
    if (!signals.length) {
      return <p className="text-sm text-muted-foreground">Sin señales sociales destacadas.</p>;
    }
    return (
      <div className="space-y-4">
        {signals.map((signal) => {
          const socialUrl = getSafeExternalUrl(signal.url, 'socialSignals.url');
          return (
            <div key={`${signal.platform}-${signal.summary}`} className="rounded-lg border p-4">
              <div className="flex items-center justify-between gap-2">
                <Badge variant="secondary">{signal.platform}</Badge>
                {socialUrl ? (
                  <Button variant="ghost" size="sm" asChild>
                    <a href={socialUrl} target="_blank" rel="noreferrer" className="gap-1">
                      Ver
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </Button>
                ) : null}
              </div>
              <p className="mt-2 text-sm">{signal.summary}</p>
              {signal.date ? (
                <p className="text-xs text-muted-foreground">
                  {new Date(signal.date).toLocaleDateString('es-ES')}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    );
  };

  const renderSources = (sources: VendorDeepResearchSource[]) => {
    if (!sources.length) {
      return <p className="text-sm text-muted-foreground">Sin fuentes citadas.</p>;
    }
    return (
      <ul className="space-y-2 text-sm">
        {sources.map((source) => {
          const sourceUrl = getSafeExternalUrl(source.url, 'sources.url');
          return (
            <li key={`${source.title}-${source.url ?? source.snippet}`}>
              <div className="font-medium">{source.title}</div>
              <p className="text-muted-foreground">{source.snippet}</p>
              {sourceUrl ? (
                <a
                  href={sourceUrl}
                  target="_blank"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  rel="noreferrer"
                >
                  Enlace
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : null}
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <AppShell
      title="Vendor analysis"
      description={
        vendor ? `Insights para ${vendor.name}` : 'Cargando información del vendor...'
      }
      actions={
        <div className="flex items-center gap-2">
          <Link href="/vendors">
            <Button variant="ghost" size="sm" className="gap-1">
              <ArrowLeft className="h-3 w-3" />
              Volver
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            disabled={loading}
            onClick={() => {
              void fetchData();
            }}
          >
            <RefreshCw className="h-3 w-3" />
            Recargar
          </Button>
          <Button
            size="sm"
            className="gap-1"
            disabled={reanalyzing}
            onClick={() => {
              void handleReanalyze();
            }}
          >
            {reanalyzing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            Reanalizar
          </Button>
        </div>
      }
    >
      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="ml-2">Generando análisis...</span>
        </div>
      ) : error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : vendor ? (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Estado del análisis
              </CardTitle>
              <CardDescription>
                {analysis?.completedAt
                  ? `Última actualización ${formatDistanceToNow(new Date(analysis.completedAt), {
                      addSuffix: true,
                      locale: es,
                    })}`
                  : analysis
                    ? 'Esperando a que finalice el análisis'
                    : 'Todavía no se ha generado un análisis para este vendor'}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-3">
              <Badge variant="secondary">{statusLabel}</Badge>
              {analysis?.llmModelUsed ? (
                <Badge variant="outline" className="text-xs">
                  Modelo: {analysis.llmModelUsed}
                </Badge>
              ) : (
                <span className="text-xs text-muted-foreground">Modelo no disponible</span>
              )}
              {analysis?.status === 'FAILED' && analysis.errorMessage ? (
                <p className="text-sm text-destructive">{analysis.errorMessage}</p>
              ) : null}
              {analysis?.status === 'IN_PROGRESS' ? (
                <p className="text-sm text-muted-foreground">Estamos recopilando datos…</p>
              ) : null}
            </CardContent>
          </Card>

          {report ? (
            <>
              <section className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Resumen ejecutivo</CardTitle>
                    <CardDescription>
                      Modelo de negocio y propuesta de valor sintetizada
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm font-semibold text-muted-foreground">Resumen</p>
                      <p className="text-sm">{report.summary}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-muted-foreground">Modelo de negocio</p>
                      <p className="text-sm">{report.businessModel}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-muted-foreground">Propuesta de valor</p>
                      <p className="text-sm">{report.valueProposition}</p>
                    </div>
                    {report.marketSegments.length ? (
                      <div>
                        <p className="text-sm font-semibold text-muted-foreground">Segmentos objetivo</p>
                        <div className="flex flex-wrap gap-1">
                          {report.marketSegments.map((segment) => (
                            <Badge key={segment} variant="secondary">
                              {segment}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Información básica</CardTitle>
                    <CardDescription>Detalles del vendor</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs uppercase tracking-wide">Website</p>
                      {(() => {
                        const websiteUrl = getSafeExternalUrl(report.websiteUrl, 'report.websiteUrl');
                        return websiteUrl ? (
                          <a
                            href={websiteUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-primary hover:underline"
                          >
                            {websiteUrl}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-muted-foreground">No disponible</span>
                        );
                      })()}
                    </div>
                    <Separator />
                    <div>
                      <p className="text-muted-foreground text-xs uppercase tracking-wide">
                        Segmentos
                      </p>
                      {report.marketSegments.join(', ') || 'Sin datos'}
                    </div>
                    <Separator />
                    <div>
                      <p className="text-sm font-semibold">Partnerships / alianzas</p>
                      {report.partnerships.length ? (
                        <ul className="mt-2 space-y-1 text-sm">
                          {report.partnerships.map((partner) => (
                            <li key={`${partner.partner}-${partner.type}`}>
                              <span className="font-medium">{partner.partner}</span> — {partner.type}
                              {partner.announcedAt ? (
                                <span className="text-muted-foreground">
                                  {' '}
                                  ({new Date(partner.announcedAt).toLocaleDateString('es-ES')})
                                </span>
                              ) : null}
                              <p className="text-muted-foreground">{partner.description}</p>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-muted-foreground">Sin partnerships recientes.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </section>

              <section className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Layers className="h-4 w-4" />
                      Portafolio de servicios
                    </CardTitle>
                    <CardDescription>Descripción detallada de la oferta</CardDescription>
                  </CardHeader>
                  <CardContent>{renderServices(report.servicePortfolio)}</CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="h-4 w-4" />
                      Diferenciadores y premios
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm font-semibold">Diferenciadores</p>
                      {report.differentiators.length ? (
                        <ul className="mt-2 space-y-2 text-sm">
                          {report.differentiators.map((diff) => {
                            const diffSourceUrl = getSafeExternalUrl(
                              diff.sourceUrl,
                              'differentiators.sourceUrl',
                            );
                            return (
                              <li key={diff.claim} className="rounded border p-3 space-y-2">
                                <div>
                                  <p className="font-medium">{diff.claim}</p>
                                  <p className="text-sm text-muted-foreground">{diff.evidence}</p>
                                  {diff.proofPoint ? (
                                    <p className="text-xs text-muted-foreground">{diff.proofPoint}</p>
                                  ) : null}
                                </div>
                                {diffSourceUrl ? (
                                  <Button variant="ghost" size="sm" className="gap-1" asChild>
                                    <a href={diffSourceUrl} target="_blank" rel="noreferrer">
                                      Ver fuente
                                      <ExternalLink className="h-3 w-3" />
                                    </a>
                                  </Button>
                                ) : null}
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        <p className="text-sm text-muted-foreground">Sin diferenciadores explícitos.</p>
                      )}
                    </div>
                    <Separator />
                    <div>
                      <p className="text-sm font-semibold">Awards / Reconocimientos</p>
                      {report.awards.length ? (
                        <ul className="mt-2 space-y-1 text-sm">
                          {report.awards.map((awardItem) => (
                            <li key={awardItem.name}>
                              <span className="font-medium">{awardItem.name}</span>
                              {awardItem.year ? ` (${awardItem.year})` : null} —{' '}
                              <span className="text-muted-foreground">
                                {awardItem.organization ?? 'Fuente no especificada'}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-muted-foreground">Sin premios recientes.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </section>

              <section className="grid gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Casos de éxito</CardTitle>
                    <CardDescription>Historias y KPIs destacados</CardDescription>
                  </CardHeader>
                  <CardContent>{renderCaseStudies(report.caseStudies)}</CardContent>
                </Card>
              </section>

              <section className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Newspaper className="h-4 w-4" />
                      Noticias recientes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>{renderNews(report.newsHighlights)}</CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Video className="h-4 w-4" />
                      Vídeos recientes (YouTube / eventos)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>{renderVideos(report.videoHighlights)}</CardContent>
                </Card>
              </section>

              <section className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Share2 className="h-4 w-4" />
                      Señales sociales
                    </CardTitle>
                  </CardHeader>
                  <CardContent>{renderSocial(report.socialSignals)}</CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Fuentes</CardTitle>
                    <CardDescription>Links utilizados para generar este análisis</CardDescription>
                  </CardHeader>
                  <CardContent>{renderSources(report.sources)}</CardContent>
                </Card>
              </section>
            </>
          ) : analysis ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                {analysis.status === 'IN_PROGRESS'
                  ? 'El análisis está en progreso. Actualiza en unos minutos.'
                  : 'Todavía no hay reporte disponible para este vendor.'}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Registra el vendor para lanzar el análisis o pulsa “Reanalizar” para iniciarlo.
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground text-sm">
            No se encontró información del vendor.
          </CardContent>
        </Card>
      )}
    </AppShell>
  );
}

