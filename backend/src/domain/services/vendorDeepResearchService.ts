import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { prisma } from '../../lib/prisma';
import { logger } from '../../lib/logger';
import {
  VendorDeepResearchRecord,
  VendorDeepResearchReport,
  VendorDeepResearchStatus,
} from '../models/vendorDeepResearchReport';
const normalizeString = (value: string | null | undefined, fallback = 'Unknown'): string => {
  if (typeof value !== 'string') {
    return fallback;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? value : fallback;
};

const MARKDOWN_URL_CAPTURE = /\((https?:\/\/[^\s)]+)\)/i;
const INLINE_URL_CAPTURE = /(https?:\/\/[^\s)]+)(?=[)\s]|$)/i;
const PLATFORM_DOMAIN_RULES = [
  { keywords: ['linkedin'], hosts: ['linkedin.com'] },
  { keywords: ['youtube', 'youtu'], hosts: ['youtube.com', 'youtu.be'] },
  { keywords: ['twitter', 'x '], hosts: ['twitter.com', 'x.com'] },
  { keywords: ['tiktok'], hosts: ['tiktok.com'] },
];

const cleanWrappingPunctuation = (value: string): string => value.replace(/^['"(]+/, '').replace(/['")]+$/, '');

const matchesPlatformRules = (platform: string | undefined, hostname: string): boolean => {
  if (!platform) {
    return true;
  }
  const normalizedPlatform = platform.trim().toLowerCase();
  const host = hostname.replace(/^www\./, '').toLowerCase();
  const rule = PLATFORM_DOMAIN_RULES.find((entry) =>
    entry.keywords.some((keyword) => normalizedPlatform.includes(keyword)),
  );
  if (!rule) {
    return true;
  }
  return rule.hosts.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
};

const sanitizeUrl = (
  value: string | null | undefined,
  context?: { field?: string; platform?: string },
): string => {
  if (typeof value !== 'string') {
    return '';
  }
  const trimmed = stripControlChars(value).trim();
  if (!trimmed) {
    return '';
  }

  const candidates = new Set<string>();
  candidates.add(trimmed);
  candidates.add(cleanWrappingPunctuation(trimmed));

  const markdownMatch = MARKDOWN_URL_CAPTURE.exec(trimmed);
  if (markdownMatch?.[1]) {
    candidates.add(markdownMatch[1]);
  }

  const inlineMatch = INLINE_URL_CAPTURE.exec(trimmed);
  if (inlineMatch?.[1]) {
    candidates.add(cleanWrappingPunctuation(inlineMatch[1]));
  }

  for (const candidate of candidates) {
    const normalized = candidate.trim();
    if (!normalized) {
      continue;
    }
    try {
      const urlInstance = new URL(normalized);
      if (!['http:', 'https:'].includes(urlInstance.protocol)) {
        continue;
      }
      if (!matchesPlatformRules(context?.platform, urlInstance.hostname)) {
        continue;
      }
      return urlInstance.toString();
    } catch {
      continue;
    }
  }

  if (context?.field) {
    logger.debug(
      {
        field: context.field,
        value: trimmed,
      },
      'Vendor deep research discarded invalid URL',
    );
  }
  return '';
};

const normalizeReference = (
  value: string | null | undefined,
  context?: { field?: string; platform?: string },
): string => {
  const sanitized = sanitizeUrl(value, context);
  if (sanitized) {
    return sanitized;
  }
  return normalizeString(value, '');
};

const normalizeReport = (report: VendorDeepResearchReport): VendorDeepResearchReport => ({
  vendorName: report.vendorName ?? 'Unknown vendor',
  websiteUrl: sanitizeUrl(report.websiteUrl, { field: 'report.websiteUrl' }),
  summary: normalizeString(report.summary, 'Sin resumen'),
  businessModel: normalizeString(report.businessModel),
  valueProposition: normalizeString(report.valueProposition),
  marketSegments: report.marketSegments ?? [],
  servicePortfolio: (report.servicePortfolio ?? []).map((service) => ({
    name: normalizeString(service.name, 'Servicio sin nombre'),
    description: normalizeString(service.description, 'Sin descripción'),
    categoryTags: service.categoryTags ?? [],
    keyFeatures: service.keyFeatures ?? [],
    maturity: service.maturity ?? 'unknown',
  })),
  caseStudies: (report.caseStudies ?? []).map((item) => ({
    title: normalizeString(item.title, 'Caso sin título'),
    client: normalizeString(item.client, 'Cliente no especificado'),
    challenge: normalizeString(item.challenge, 'Sin reto descrito'),
    solution: normalizeString(item.solution, 'Sin solución descrita'),
    results: item.results ?? [],
    metrics: item.metrics ?? [],
    source: sanitizeUrl(item.source, { field: 'caseStudies.source' }),
  })),
  differentiators: (report.differentiators ?? []).map((diff) => ({
    claim: normalizeString(diff.claim, 'Diferenciador sin título'),
    evidence: normalizeString(diff.evidence, 'Sin evidencia'),
    proofPoint: normalizeReference(diff.proofPoint, { field: 'differentiators.proofPoint' }),
    sourceUrl: (() => {
      const sanitized = sanitizeUrl(diff.sourceUrl, { field: 'differentiators.sourceUrl' });
      return sanitized || undefined;
    })(),
  })),
  partnerships: (report.partnerships ?? []).map((partner) => ({
    partner: normalizeString(partner.partner, 'Partner desconocido'),
    type: partner.type ?? 'unknown',
    description: normalizeString(partner.description, 'Sin descripción'),
    announcedAt: partner.announcedAt ?? undefined,
  })),
  awards: (report.awards ?? []).map((award) => ({
    name: normalizeString(award.name, 'Premio'),
    organization: award.organization ?? 'Desconocido',
    year: award.year ?? 'N/A',
    description: award.description ?? '',
  })),
  newsHighlights: (report.newsHighlights ?? []).map((news) => ({
    title: normalizeString(news.title, 'Noticia'),
    source: news.source ?? 'Desconocido',
    date: news.date ?? '',
    url: sanitizeUrl(news.url, { field: 'newsHighlights.url' }),
    summary: news.summary ?? '',
    impact: news.impact ?? 'unknown',
  })),
  videoHighlights: (report.videoHighlights ?? []).map((video) => ({
    title: normalizeString(video.title, 'Vídeo'),
    channel: video.channel ?? 'Desconocido',
    publishedAt: video.publishedAt ?? '',
    url: sanitizeUrl(video.url, { field: 'videoHighlights.url' }),
    description: video.description ?? '',
    angle: video.angle ?? 'overview',
  })),
  socialSignals: (report.socialSignals ?? []).map((signal) => ({
    platform: normalizeString(signal.platform, 'Red social'),
    summary: normalizeString(signal.summary, 'Sin contenido'),
    date: signal.date ?? '',
    url: sanitizeUrl(signal.url, {
      field: 'socialSignals.url',
      platform: signal.platform,
    }),
    relevance: signal.relevance ?? 'medium',
  })),
  sources: (report.sources ?? []).map((source) => ({
    title: normalizeString(source.title, 'Fuente'),
    url: sanitizeUrl(source.url, { field: 'sources.url' }),
    snippet: source.snippet ?? '',
  })),
});

const stripControlChars = (value: string): string =>
  value.replace(/[\u0000-\u001F\u007F]/g, '');

const sanitizeJsonPayload = <T>(data: T): T => {
  if (typeof data === 'string') {
    return stripControlChars(data) as unknown as T;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeJsonPayload(item)) as unknown as T;
  }

  if (data && typeof data === 'object') {
    return Object.fromEntries(
      Object.entries(data as Record<string, unknown>).map(([key, value]) => [
        key,
        sanitizeJsonPayload(value),
      ]),
    ) as T;
  }

  return data;
};

import { runVendorDeepResearch } from '../../llm/vendorDeepResearchClient';

const statusMap: Record<string, VendorDeepResearchStatus> = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
};

const runningAnalyses = new Set<string>();

const toRecord = (
  record: Prisma.VendorDeepResearchReportGetPayload<{ include: { vendor: true } }>,
): VendorDeepResearchRecord => ({
  id: record.id,
  vendorId: record.vendorId,
  status: statusMap[record.status] ?? 'PENDING',
  errorMessage: record.errorMessage,
  report: (record.report as VendorDeepResearchReport | null) ?? null,
  llmModelUsed: record.llmModelUsed ?? null,
  startedAt: record.startedAt?.toISOString() ?? null,
  completedAt: record.completedAt?.toISOString() ?? null,
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
});

export class VendorDeepResearchService {
  static async getReport(vendorId: string): Promise<VendorDeepResearchRecord | null> {
    const record = await prisma.vendorDeepResearchReport.findUnique({
      where: { vendorId },
      include: { vendor: true },
    });
    return record ? toRecord(record) : null;
  }

  static async enqueueAnalysis(vendorId: string): Promise<void> {
    const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
    if (!vendor) {
      throw new Error(`Vendor ${vendorId} not found`);
    }

    await prisma.vendorDeepResearchReport.upsert({
      where: { vendorId },
      create: {
        vendorId,
        status: 'PENDING',
      },
      update: {
        status: 'PENDING',
        errorMessage: null,
      },
    });

    setImmediate(() => {
      void this.runAnalysis(vendorId).catch((error) => {
        logger.error({ vendorId, error }, 'Vendor deep research async execution failed');
      });
    });
  }

  static async runAnalysis(vendorId: string, force = false): Promise<void> {
    if (runningAnalyses.has(vendorId) && !force) {
      logger.warn({ vendorId }, 'Vendor deep research already running');
      return;
    }
    runningAnalyses.add(vendorId);

    try {
      const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
      if (!vendor) {
        throw new Error(`Vendor ${vendorId} not found`);
      }

      const analysisId = randomUUID();
      const analysisStartedAt = new Date();

      await prisma.vendorDeepResearchReport.upsert({
        where: { vendorId },
        create: {
          vendorId,
          status: 'IN_PROGRESS',
          startedAt: analysisStartedAt,
          llmModelUsed: null,
        },
        update: {
          status: 'IN_PROGRESS',
          errorMessage: null,
          startedAt: analysisStartedAt,
          completedAt: null,
          llmModelUsed: null,
        },
      });

      const { report, modelUsed, phaseMetrics } = await runVendorDeepResearch({
        vendorId,
        vendorName: vendor.name,
        vendorWebsiteUrl: vendor.websiteUrl,
        description: vendor.description ?? undefined,
      });
      const normalizedReport = sanitizeJsonPayload(normalizeReport(report));
      const analysisCompletedAt = new Date();
      const metricsPayload = phaseMetrics.map((metric) => ({
        vendorId,
        analysisId,
        phase: metric.phase,
        subPhase: metric.subPhase,
        durationMs: metric.durationMs,
        startedAt: metric.startedAt,
        finishedAt: metric.finishedAt,
        analysisStartedAt,
        analysisCompletedAt,
      }));

      const transactions: Prisma.PrismaPromise<unknown>[] = [
        prisma.vendorDeepResearchReport.update({
          where: { vendorId },
          data: {
            status: 'COMPLETED',
            report: normalizedReport as unknown as Prisma.JsonObject,
            completedAt: analysisCompletedAt,
            llmModelUsed: modelUsed,
            analysisId,
          },
        }),
      ];

      if (metricsPayload.length > 0) {
        transactions.push(
          prisma.vendorDeepResearchPhaseMetric.createMany({
            data: metricsPayload,
          }),
        );
      }

      await prisma.$transaction(transactions);

      logger.info({ vendorId }, 'Vendor deep research completed');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown vendor deep research error';
      await prisma.vendorDeepResearchReport.upsert({
        where: { vendorId },
        create: {
          vendorId,
          status: 'FAILED',
          errorMessage: message,
        },
        update: {
          status: 'FAILED',
          errorMessage: message,
          completedAt: new Date(),
          llmModelUsed: null,
          analysisId: null,
        },
      });
      logger.error({ vendorId, error: message }, 'Vendor deep research failed');
      throw error;
    } finally {
      runningAnalyses.delete(vendorId);
    }
  }
}

