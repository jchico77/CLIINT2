import {
  ClientIntelDashboard,
  CreateDashboardInput,
  CreateOpportunityDashboardInput,
  ClientIntelDashboardSections,
  AccountSnapshotSection,
  OpportunitySummarySection,
  MarketContextSection,
  OpportunityRequirementsSection,
  StakeholderMapSection,
  CompetitiveLandscapeSection,
  VendorFitAndPlaysSection,
  EvidencePackSection,
  GapsAndQuestionsSection,
  NewsOfInterestSection,
  CriticalDatesSection,
  GapImpact,
} from '../models/clientIntelDashboard';
import { VendorService } from './vendorService';
import { ClientService } from './clientService';
import { ServiceOfferingService } from './serviceOfferingService';
import { ClientResearchAgent } from '../../llm/clientResearchAgent';
import { VendorResearchAgent } from '../../llm/vendorResearchAgent';
import { FitAndStrategyAgent } from '../../llm/fitAndStrategyAgent';
import { ProposalOutlineAgent } from '../../llm/proposalOutlineAgent';
import { deepResearchService } from '../../llm/deepResearchService';
import { llmConfig } from '../../config/llm';
import { ProgressCallback } from '../types/progress';
import { NotFoundError, ValidationError } from '../errors/AppError';
import { LLMCache } from './llmCache';
import { OpportunityService } from './opportunityService';
import { Opportunity } from '../models/opportunity';
import { ClientDeepResearchReport } from '../models/clientDeepResearchReport';
import { logger } from '../../lib/logger';
import { OpportunityDossierService } from './opportunityDossierService';
import { getCacheMode, loadPhase, savePhase } from '../../utils/dashboardCache';
import { logPhaseCacheStatus, logPhaseStart } from '../../llm/phaseLogger';
import type { DashboardPhase } from '../../llm/phaseLogger';
import { DashboardPhaseCacheService } from './dashboardPhaseCacheService';
import { prisma } from '../../lib/prisma';
import type { Dashboard as PrismaDashboard } from '@prisma/client';
import { Prisma, DashboardPhaseStatus, DashboardPhaseType, DashboardRunStatus } from '@prisma/client';
import { DashboardMetricsService, type RunHandle } from './dashboardMetricsService';

const limitArray = <T>(items: T[] | undefined, max: number): T[] => {
  if (!items || items.length === 0) {
    return [];
  }
  return items.length > max ? items.slice(0, max) : items;
};

const priorityToLevel = (
  priority?: 'high' | 'medium' | 'low',
): 'must' | 'should' | 'nice' => {
  switch (priority) {
    case 'high':
      return 'must';
    case 'medium':
      return 'should';
    default:
      return 'nice';
  }
};

const gapImpactToLevel = (impact: GapImpact): 'must' | 'should' | 'nice' => {
  switch (impact) {
    case 'high':
      return 'must';
    case 'medium':
      return 'should';
    default:
      return 'nice';
  }
};

type PhaseMetricsContext = {
  model?: string;
  reasoningEffort?: string;
  cacheMode?: string;
  featureToggles?: unknown;
  metadata?: Record<string, unknown>;
};

const executePhaseWithMetrics = async <T>(
  metricsRun: RunHandle | null,
  phase: DashboardPhaseType,
  context: PhaseMetricsContext,
  executor: () => Promise<T>,
): Promise<T> => {
  if (!metricsRun) {
    return executor();
  }

  const handle = await DashboardMetricsService.startPhase({
    runId: metricsRun.id,
    phase,
    model: context.model,
    reasoningEffort: context.reasoningEffort,
    cacheMode: context.cacheMode,
    featureToggles: context.featureToggles,
    metadata: context.metadata,
  });

  try {
    const result = await executor();
    await DashboardMetricsService.finishPhase(handle, { status: DashboardPhaseStatus.success });
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await DashboardMetricsService.finishPhase(handle, {
      status: DashboardPhaseStatus.error,
      errorMessage: message,
    });
    throw error;
  }
};

const mapDashboardRecord = (record: PrismaDashboard): ClientIntelDashboard => ({
  id: record.id,
  vendorId: record.vendorId,
  clientId: record.clientId,
  serviceOfferingId: record.serviceOfferingId,
  opportunityId: record.opportunityId,
  opportunityName: record.opportunityName ?? undefined,
  opportunityContext: record.opportunityContext,
  generatedAt: record.generatedAt.toISOString(),
  llmModelUsed: record.llmModelUsed,
  sections: record.sections as unknown as ClientIntelDashboardSections,
  proposalOutline:
    record.proposalOutline != null
      ? (record.proposalOutline as unknown as ClientIntelDashboard['proposalOutline'])
      : undefined,
});

export class DashboardService {
  static async generateDashboardForOpportunity(
    input: CreateOpportunityDashboardInput,
    onProgress?: ProgressCallback
  ): Promise<ClientIntelDashboard> {
    const opportunity = await OpportunityService.getOpportunityById(input.opportunityId);

    if (!opportunity) {
      throw new NotFoundError('Opportunity', input.opportunityId);
    }

    if (opportunity.vendorId !== input.vendorId) {
      throw new ValidationError('Opportunity does not belong to the provided vendor', {
        vendorId: input.vendorId,
        opportunityVendorId: opportunity.vendorId,
      });
    }

    const client = await ClientService.getById(opportunity.clientId);
    if (!client) {
      throw new NotFoundError('Client', opportunity.clientId);
    }

    const service = await ServiceOfferingService.getById(opportunity.serviceOfferingId);
    if (!service) {
      throw new NotFoundError('Service', opportunity.serviceOfferingId);
    }

    const opportunityContext = this.resolveOpportunityContext(
      input.opportunityContextOverride,
      opportunity
    );

    return this.generateDashboard(
      {
        vendorId: opportunity.vendorId,
        clientId: opportunity.clientId,
        serviceOfferingId: opportunity.serviceOfferingId,
        opportunityId: opportunity.id,
        opportunityContext,
        uploadedDocIds: input.uploadedDocIds,
      },
      onProgress,
      opportunity
    );
  }

  static async generateDashboard(
    input: CreateDashboardInput,
    onProgress?: ProgressCallback,
    opportunity?: Opportunity
  ): Promise<ClientIntelDashboard> {
    const vendor = await VendorService.getById(input.vendorId);
    const client = await ClientService.getById(input.clientId);
    const service = await ServiceOfferingService.getById(input.serviceOfferingId);

    if (!vendor) {
      throw new NotFoundError('Vendor', input.vendorId);
    }
    if (!client) {
      throw new NotFoundError('Client', input.clientId);
    }
    if (!service) {
      throw new NotFoundError('Service', input.serviceOfferingId);
    }

    const metricsConfigSnapshot = {
      defaultModel: llmConfig.defaultModel,
      temperature: llmConfig.temperature,
      deepResearchModel: llmConfig.deepResearchModel,
      clientResearchModel: llmConfig.clientResearchModel,
      vendorResearchModel: llmConfig.vendorResearchModel,
      fitStrategyModel: llmConfig.fitStrategyModel,
      proposalOutlineModel: llmConfig.proposalOutlineModel,
      reasoningEffort: {
        deepResearch: llmConfig.deepResearchReasoningEffort,
        clientResearch: llmConfig.clientResearchReasoningEffort,
        vendorResearch: llmConfig.vendorResearchReasoningEffort,
        fitStrategy: llmConfig.fitStrategyReasoningEffort,
        proposalOutline: llmConfig.proposalOutlineReasoningEffort,
      },
    };

    let metricsRun: RunHandle | null = null;
    try {
      metricsRun = await DashboardMetricsService.startRun({
        vendorId: input.vendorId,
        clientId: input.clientId,
        serviceOfferingId: input.serviceOfferingId,
        opportunityId: input.opportunityId,
        llmModelUsed: llmConfig.defaultModel,
        configSnapshot: metricsConfigSnapshot,
        featureToggles: llmConfig.featureToggles,
      });

      const id = `dashboard_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const generatedAtDate = new Date();
      const now = generatedAtDate.toISOString();

      const dossierSummary = opportunity
        ? await OpportunityDossierService.summarizeTextChunks(opportunity.id)
        : null;
      const dossierVectorStoreId = opportunity
        ? await OpportunityDossierService.getVectorStoreId(opportunity.id)
        : undefined;

      let sections: ClientIntelDashboardSections;
      let llmModelUsed = 'fake-data-generator';

      // Check cache first
      const cachedSections = LLMCache.get<ClientIntelDashboardSections>(
        input.vendorId,
        input.clientId,
        input.serviceOfferingId,
        input.opportunityContext
      );

      if (cachedSections) {
        logger.info(
          {
            vendorId: input.vendorId,
            clientId: input.clientId,
            serviceOfferingId: input.serviceOfferingId,
            opportunityId: input.opportunityId,
          },
          'Using cached LLM dashboard sections'
        );
        sections = cachedSections;
        llmModelUsed = llmConfig.defaultModel;
        onProgress?.({ stepId: 'cache-hit', status: 'completed', message: 'Usando resultados en caché', progress: 100 });
      } else {
        // Try to use LLM if API key is available
        if (llmConfig.openaiApiKey) {
          try {
            logger.info(
              {
                vendorId: input.vendorId,
                clientId: input.clientId,
                serviceOfferingId: input.serviceOfferingId,
                opportunityId: input.opportunityId,
              },
              'Generating dashboard with LLM agents'
            );
            sections = await this.generateLLMSections(
              vendor,
              client,
              service,
              input.opportunityContext,
              onProgress,
              dossierSummary,
              dossierVectorStoreId,
              input.opportunityId,
              metricsRun ?? undefined
            );
            llmModelUsed = llmConfig.defaultModel;
            
            // Cache the result
            LLMCache.set(
              input.vendorId,
              input.clientId,
              input.serviceOfferingId,
              input.opportunityContext,
              sections
            );
            
            logger.info(
              {
                vendorId: input.vendorId,
                clientId: input.clientId,
                serviceOfferingId: input.serviceOfferingId,
                opportunityId: input.opportunityId,
              },
              'Dashboard generated with LLM and cached'
            );
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown LLM error';
            logger.error(
              {
                vendorId: input.vendorId,
                clientId: input.clientId,
                serviceOfferingId: input.serviceOfferingId,
                opportunityId: input.opportunityId,
                error: errorMessage,
              },
              'LLM generation failed, falling back to fake data'
            );
            
            // Emit error progress if callback available
            onProgress?.({ 
              stepId: 'llm-error', 
              status: 'error', 
              message: `Error en análisis LLM: ${errorMessage}. Usando datos alternativos.`,
              progress: 0
            });
            
            sections = this.generateFakeSections(vendor, client, service, input.opportunityContext);
          }
        } else {
          logger.warn(
            {
              vendorId: input.vendorId,
              clientId: input.clientId,
              serviceOfferingId: input.serviceOfferingId,
              opportunityId: input.opportunityId,
            },
            'No LLM API key configured, using fake data'
          );
          sections = this.generateFakeSections(vendor, client, service, input.opportunityContext);
        }
      }

      const dashboard: ClientIntelDashboard = {
        id,
        vendorId: input.vendorId,
        clientId: input.clientId,
        serviceOfferingId: input.serviceOfferingId,
        opportunityId: input.opportunityId,
        opportunityName: opportunity?.name,
        opportunityContext: input.opportunityContext,
        generatedAt: now,
        llmModelUsed,
        sections,
        proposalOutline: sections.proposalOutline,
      };

      const persist = () =>
        prisma.dashboard.create({
          data: {
            id,
            vendorId: input.vendorId,
            clientId: input.clientId,
            serviceOfferingId: input.serviceOfferingId,
            opportunityId: input.opportunityId,
            opportunityName: opportunity?.name ?? null,
            opportunityContext: input.opportunityContext,
            sections: sections as unknown as Prisma.InputJsonValue,
            proposalOutline:
              sections.proposalOutline !== undefined
                ? (sections.proposalOutline as unknown as Prisma.InputJsonValue)
                : undefined,
            llmModelUsed,
            generatedAt: generatedAtDate,
          },
        });

      await executePhaseWithMetrics(
        metricsRun,
        DashboardPhaseType.persistToDb,
        {
          featureToggles: llmConfig.featureToggles,
          metadata: {
            dashboardId: id,
            vendorId: input.vendorId,
            clientId: input.clientId,
            serviceOfferingId: input.serviceOfferingId,
            opportunityId: input.opportunityId,
          },
        },
        persist,
      );

      if (metricsRun) {
        await DashboardMetricsService.finishRun(metricsRun, {
          status: DashboardRunStatus.success,
          llmModelUsed,
        });
      }

      return dashboard;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown dashboard generation error';
      if (metricsRun) {
        await DashboardMetricsService.finishRun(metricsRun, {
          status: DashboardRunStatus.error,
          errorMessage: message,
        });
      }
      throw error;
    }
  }

  private static async generateLLMSections(
    vendor: { id: string; name: string; websiteUrl: string; description?: string; createdAt: string; updatedAt: string },
    client: { id: string; vendorId: string; name: string; websiteUrl: string; sectorHint?: string; country?: string; notes?: string; createdAt: string; updatedAt: string },
    service: { id: string; vendorId: string; name: string; shortDescription: string; categoryTags: string[]; createdAt: string; updatedAt: string },
    opportunityContext: string,
    onProgress?: ProgressCallback,
    dossierSummary?: string | null,
    dossierVectorStoreId?: string,
    opportunityId?: string,
    metricsRun?: RunHandle | null,
  ): Promise<ClientIntelDashboardSections> {
    const clientResearchAgent = new ClientResearchAgent();
    const vendorResearchAgent = new VendorResearchAgent();
    const fitAndStrategyAgent = new FitAndStrategyAgent();
    const proposalOutlineAgent = new ProposalOutlineAgent();
    const cacheMode = getCacheMode();
    const runPhaseWithMetrics = <T>(
      phase: DashboardPhaseType,
      context: PhaseMetricsContext,
      executor: () => Promise<T>,
    ) => {
      const mergedContext: PhaseMetricsContext = {
        ...context,
        featureToggles: context.featureToggles ?? llmConfig.featureToggles,
      };
      return executePhaseWithMetrics(metricsRun ?? null, phase, mergedContext, executor);
    };

    const loadPersistedPhase = async <T>(phase: DashboardPhase) => {
      let source: 'db' | 'fs' | undefined;
      let value: T | null = null;

      if (opportunityId) {
        const dbValue = await DashboardPhaseCacheService.getPhase<T>(opportunityId, phase);
        if (dbValue) {
          source = 'db';
          value = dbValue;
          return { value, source };
        }
      }

      const fileValue = loadPhase<T>(opportunityId, phase);
      if (fileValue) {
        source = 'fs';
        value = fileValue;
      }
      return { value, source };
    };

    const persistPhaseResult = async (phase: DashboardPhase, payload: unknown) => {
      if (opportunityId) {
        await DashboardPhaseCacheService.savePhase(opportunityId, phase, payload);
      }
      savePhase(opportunityId, phase, payload);
    };

    const markPhaseFailure = async (phase: DashboardPhase, message: string) => {
      if (opportunityId) {
        await DashboardPhaseCacheService.markError(opportunityId, phase, message);
      }
    };

    // Step 1: Deep Research
    onProgress?.({
      stepId: 'deep-research',
      status: 'in-progress',
      message: `Investigando ${client.name}...`,
      progress: 10,
    });
    logger.info(
      { clientId: client.id, serviceOfferingId: service.id },
      'Dashboard generation step 1: Deep research',
    );

    const deepResearchModel = llmConfig.deepResearchModel;
    const deepResearchReasoning = llmConfig.deepResearchReasoningEffort;
    const deepPersisted = await loadPersistedPhase<ClientDeepResearchReport>('deepResearch');
    let deepResearchReport = deepPersisted.value;
    const deepPhaseMetadata = {
      source: 'dashboardService' as const,
      vendorId: vendor.id,
      clientId: client.id,
      serviceId: service.id,
      opportunityId,
      dossierVectorStoreId,
      cacheMode,
    };

    if (deepResearchReport) {
      logPhaseCacheStatus('deepResearch', {
        ...deepPhaseMetadata,
        cacheHit: true,
        cacheSource: deepPersisted.source,
      });
      onProgress?.({
        stepId: 'deep-research',
        status: 'completed',
        message: 'Investigación profunda reutilizada desde cache',
        progress: 25,
      });
    } else {
      deepResearchReport = await runPhaseWithMetrics(
        DashboardPhaseType.deepResearch,
        {
          model: deepResearchModel,
          reasoningEffort: deepResearchReasoning,
          cacheMode,
          metadata: deepPhaseMetadata,
        },
        async () => {
          logPhaseStart('deepResearch', {
            ...deepPhaseMetadata,
            cacheHit: false,
            model: deepResearchModel,
            reasoningEffort: deepResearchReasoning,
          });
          try {
            const report = await deepResearchService.getClientReport(client, service);
            await persistPhaseResult('deepResearch', report);
            onProgress?.({
              stepId: 'deep-research',
              status: 'completed',
              message: 'Investigación profunda completada',
              progress: 25,
            });
            return report;
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            await markPhaseFailure('deepResearch', message);
            logger.error(
              {
                clientId: client.id,
                serviceOfferingId: service.id,
                error: message,
              },
              'Deep research step failed',
            );
            throw error;
          }
        },
      );
    }

    // Step 2: Run client and vendor research in parallel
    onProgress?.({ stepId: 'client-analysis', status: 'in-progress', message: 'Analizando cliente con GPT-4o...', progress: 20 });
    onProgress?.({ stepId: 'vendor-research', status: 'in-progress', message: 'Extrayendo evidencias del vendor...', progress: 30 });
    logger.info(
      { clientId: client.id, vendorId: vendor.id },
      'Dashboard generation step 2: Client & Vendor research'
    );
    
    const clientPersisted =
      await loadPersistedPhase<Awaited<ReturnType<typeof clientResearchAgent.research>>>(
        'clientResearch',
      );
    let clientResearch = clientPersisted.value;
    const vendorPersisted =
      await loadPersistedPhase<Awaited<ReturnType<typeof vendorResearchAgent.research>>>(
        'vendorResearch',
      );
    let vendorResearch = vendorPersisted.value;

    const clientPhaseContext = {
      source: 'dashboardService' as const,
      vendorId: vendor.id,
      clientId: client.id,
      serviceId: service.id,
      opportunityId,
      cacheMode,
      model: llmConfig.clientResearchModel,
      reasoningEffort: llmConfig.clientResearchReasoningEffort,
    };
    const vendorPhaseContext = {
      source: 'dashboardService' as const,
      vendorId: vendor.id,
      clientId: client.id,
      serviceId: service.id,
      opportunityId,
      cacheMode,
      model: llmConfig.vendorResearchModel,
      reasoningEffort: llmConfig.vendorResearchReasoningEffort,
    };

    if (clientResearch) {
      logPhaseCacheStatus('clientResearch', {
        ...clientPhaseContext,
        cacheHit: true,
        cacheSource: clientPersisted.source,
      });
    }

    if (vendorResearch) {
      logPhaseCacheStatus('vendorResearch', {
        ...vendorPhaseContext,
        cacheHit: true,
        cacheSource: vendorPersisted.source,
      });
    }

    const pending: Promise<void>[] = [];
    if (!clientResearch) {
      pending.push(
        (async () => {
          clientResearch = await runPhaseWithMetrics(
            DashboardPhaseType.clientResearch,
            {
              model: llmConfig.clientResearchModel,
              reasoningEffort: llmConfig.clientResearchReasoningEffort,
              cacheMode,
              metadata: clientPhaseContext,
            },
            async () => {
              logPhaseStart('clientResearch', { ...clientPhaseContext, cacheHit: false });
              try {
                const result = await clientResearchAgent.research(
                  client,
                  service,
                  opportunityContext,
                  deepResearchReport,
                  dossierSummary ?? null,
                  dossierVectorStoreId,
                );
                await persistPhaseResult('clientResearch', result);
                return result;
              } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                await markPhaseFailure('clientResearch', message);
                throw error;
              }
            },
          );
        })(),
      );
    }

    if (!vendorResearch) {
      pending.push(
        (async () => {
          vendorResearch = await runPhaseWithMetrics(
            DashboardPhaseType.vendorResearch,
            {
              model: llmConfig.vendorResearchModel,
              reasoningEffort: llmConfig.vendorResearchReasoningEffort,
              cacheMode,
              metadata: vendorPhaseContext,
            },
            async () => {
              logPhaseStart('vendorResearch', { ...vendorPhaseContext, cacheHit: false });
              try {
                const result = await vendorResearchAgent.research(vendor, service);
                await persistPhaseResult('vendorResearch', result);
                return result;
              } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                await markPhaseFailure('vendorResearch', message);
                throw error;
              }
            },
          );
        })(),
      );
    }

    if (pending.length > 0) {
      await Promise.all(pending);
    }

    if (!clientResearch || !vendorResearch) {
      throw new Error('Failed to obtain client or vendor research');
    }

    const clientResearchResult = clientResearch!;
    const vendorResearchResult = vendorResearch!;

    clientResearchResult.opportunityRequirements.requirements = limitArray(
      clientResearchResult.opportunityRequirements.requirements,
      4,
    ).map((req) => ({
      ...req,
      priorityLevel: req.priorityLevel ?? priorityToLevel(req.priority),
    }));
    clientResearchResult.opportunityRequirements.whatClientSeeks = limitArray(
      clientResearchResult.opportunityRequirements.whatClientSeeks,
      3,
    );
    clientResearchResult.opportunityRequirements.scope = limitArray(
      clientResearchResult.opportunityRequirements.scope,
      3,
    );
    clientResearchResult.opportunityRequirements.exclusions = limitArray(
      clientResearchResult.opportunityRequirements.exclusions,
      3,
    );
    clientResearchResult.opportunityRequirements.selectionCriteria = limitArray(
      clientResearchResult.opportunityRequirements.selectionCriteria,
      4,
    );

    vendorResearchResult.evidence = limitArray(vendorResearchResult.evidence, 6);

    onProgress?.({ stepId: 'client-analysis', status: 'completed', message: 'Análisis del cliente completado', progress: 40 });
    onProgress?.({ stepId: 'vendor-research', status: 'completed', message: 'Evidencias extraídas', progress: 50 });

    // Step 3: Competitive research
    onProgress?.({ stepId: 'competitive', status: 'in-progress', message: 'Analizando competidores...', progress: 55 });
    logger.info({ clientId: client.id }, 'Dashboard generation step 3: Competitive research');

    // Step 4: Generate fit and strategy analysis using results from step 1
    onProgress?.({ stepId: 'fit-strategy', status: 'in-progress', message: 'Generando stakeholder map, vendor fit y plays estratégicos...', progress: 60 });
    logger.info({ clientId: client.id }, 'Dashboard generation step 4: Fit & Strategy analysis');
    
    const fitPhaseContext = {
      source: 'dashboardService' as const,
      vendorId: vendor.id,
      clientId: client.id,
      serviceId: service.id,
      opportunityId,
      cacheMode,
      model: llmConfig.fitStrategyModel,
      reasoningEffort: llmConfig.fitStrategyReasoningEffort,
    };
    const fitPersisted =
      await loadPersistedPhase<Awaited<ReturnType<typeof fitAndStrategyAgent.generate>>>(
        'fitStrategy',
      );
    let fitAndStrategy = fitPersisted.value;
    if (fitAndStrategy) {
      logPhaseCacheStatus('fitStrategy', {
        ...fitPhaseContext,
        cacheHit: true,
        cacheSource: fitPersisted.source,
      });
    } else {
      fitAndStrategy = await runPhaseWithMetrics(
        DashboardPhaseType.fitStrategy,
        {
          model: llmConfig.fitStrategyModel,
          reasoningEffort: llmConfig.fitStrategyReasoningEffort,
          cacheMode,
          metadata: fitPhaseContext,
        },
        async () => {
          logPhaseStart('fitStrategy', { ...fitPhaseContext, cacheHit: false });
          try {
            const result = await fitAndStrategyAgent.generate(
              vendor,
              client,
              service,
              opportunityContext,
              clientResearchResult,
              vendorResearchResult.evidence,
              dossierVectorStoreId,
            );
            await persistPhaseResult('fitStrategy', result);
            return result;
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            await markPhaseFailure('fitStrategy', message);
            throw error;
          }
        },
      );
    }

    fitAndStrategy.stakeholderMap.stakeholders = limitArray(
      fitAndStrategy.stakeholderMap.stakeholders,
      2,
    );
    fitAndStrategy.competitiveLandscape.clientCompetitors = limitArray(
      fitAndStrategy.competitiveLandscape.clientCompetitors,
      2,
    );
    fitAndStrategy.competitiveLandscape.vendorCompetitors = limitArray(
      fitAndStrategy.competitiveLandscape.vendorCompetitors,
      2,
    );
    fitAndStrategy.competitiveLandscape.alternatives = limitArray(
      fitAndStrategy.competitiveLandscape.alternatives,
      2,
    );
    fitAndStrategy.vendorFitAndPlays.fitDimensions = limitArray(
      fitAndStrategy.vendorFitAndPlays.fitDimensions,
      2,
    );
    fitAndStrategy.vendorFitAndPlays.recommendedPlays = limitArray(
      fitAndStrategy.vendorFitAndPlays.recommendedPlays,
      2,
    );
    fitAndStrategy.gapsAndQuestions.gaps = limitArray(
      fitAndStrategy.gapsAndQuestions.gaps,
      2,
    ).map((gap) => ({
      ...gap,
      priorityLevel: gap.priorityLevel ?? gapImpactToLevel(gap.impact),
    }));
    fitAndStrategy.gapsAndQuestions.questions = limitArray(
      fitAndStrategy.gapsAndQuestions.questions,
      2,
    ).map((question) => ({
      ...question,
      isCritical: question.isCritical ?? false,
    }));

    const proposalPhaseContext = {
      source: 'dashboardService' as const,
      vendorId: vendor.id,
      clientId: client.id,
      serviceId: service.id,
      opportunityId,
      cacheMode,
      model: llmConfig.proposalOutlineModel,
      reasoningEffort: llmConfig.proposalOutlineReasoningEffort,
    };
    const proposalPersisted =
      await loadPersistedPhase<Awaited<ReturnType<typeof proposalOutlineAgent.generate>>>(
        'proposalOutline',
      );
    let proposalOutline = proposalPersisted.value;
    if (proposalOutline) {
      logPhaseCacheStatus('proposalOutline', {
        ...proposalPhaseContext,
        cacheHit: true,
        cacheSource: proposalPersisted.source,
      });
    } else {
      proposalOutline = await runPhaseWithMetrics(
        DashboardPhaseType.proposalOutline,
        {
          model: llmConfig.proposalOutlineModel,
          reasoningEffort: llmConfig.proposalOutlineReasoningEffort,
          cacheMode,
          metadata: proposalPhaseContext,
        },
        async () => {
          logPhaseStart('proposalOutline', { ...proposalPhaseContext, cacheHit: false });
          try {
            const result = await proposalOutlineAgent.generate({
              client,
              service,
              opportunityContext,
              opportunityRequirements: clientResearchResult.opportunityRequirements,
              vendorEvidence: vendorResearchResult.evidence,
              dossierSummary: dossierSummary ?? null,
              dossierVectorStoreId,
            });
            await persistPhaseResult('proposalOutline', result);
            return result;
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            await markPhaseFailure('proposalOutline', message);
            throw error;
          }
        },
      );
    }

    onProgress?.({ stepId: 'competitive', status: 'completed', message: 'Análisis competitivo completado', progress: 80 });
    onProgress?.({ stepId: 'fit-strategy', status: 'completed', message: 'Fit y estrategia generados', progress: 85 });

    // Step 5: News research
    onProgress?.({ stepId: 'news', status: 'in-progress', message: 'Buscando noticias relevantes de los últimos 6 meses...', progress: 90 });
    logger.info({ clientId: client.id }, 'Dashboard generation step 5: News research');
    
    let newsResearch;
    try {
      newsResearch = await runPhaseWithMetrics(
        DashboardPhaseType.newsResearch,
        {
          model: llmConfig.deepResearchModel,
          reasoningEffort: llmConfig.deepResearchReasoningEffort,
          metadata: {
            clientId: client.id,
            vendorId: vendor.id,
            serviceId: service.id,
            opportunityId,
          },
        },
        async () => {
          const research = await deepResearchService.researchNews(
            client.name,
            client.sectorHint || clientResearchResult.accountSnapshot.industry,
            '6months',
          );
          logger.info({ clientId: client.id }, 'News research completed');
          onProgress?.({ stepId: 'news', status: 'completed', message: 'Noticias encontradas', progress: 95 });
          return research;
        },
      );
    } catch (error) {
      logger.warn(
        { clientId: client.id, error: error instanceof Error ? error.message : error },
        'News research failed, falling back to fake data'
      );
      newsResearch = null;
      onProgress?.({ stepId: 'news', status: 'completed', message: 'Usando datos alternativos', progress: 95 });
    }

    // Combine all LLM results - now everything is generated by LLM with deep research!
    return {
      accountSnapshot: clientResearchResult.accountSnapshot,
      opportunitySummary: this.generateOpportunitySummary(
        client,
        opportunityContext,
        clientResearchResult.accountSnapshot,
      ),
      marketContext: clientResearchResult.marketContext,
      opportunityRequirements: clientResearchResult.opportunityRequirements,
      stakeholderMap: fitAndStrategy.stakeholderMap,
      competitiveLandscape: fitAndStrategy.competitiveLandscape,
      vendorFitAndPlays: fitAndStrategy.vendorFitAndPlays,
      evidencePack: {
        items: vendorResearchResult.evidence,
        summary: `Evidencias extraídas del análisis del vendor ${vendor.name}`,
      },
      gapsAndQuestions: fitAndStrategy.gapsAndQuestions,
      newsOfInterest: newsResearch
        ? {
            items: newsResearch.map((news) => ({
              id: `news_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              title: news.title,
              source: news.source,
              date: news.date,
              url: news.url,
              relevance: news.relevance,
              summary: news.summary,
              impactOnOpportunity: news.impactOnOpportunity,
            })),
            summary: `Noticias relevantes sobre ${client.name} obtenidas mediante investigación profunda`,
          }
        : this.generateFakeNewsOfInterest(client),
      criticalDates: this.generateFakeCriticalDates(),
      proposalOutline,
    };
  }

  static async getById(id: string): Promise<ClientIntelDashboard | null> {
    const record = await prisma.dashboard.findUnique({ where: { id } });
    return record ? mapDashboardRecord(record) : null;
  }

  static async getLatestByOpportunityId(
    opportunityId: string,
  ): Promise<ClientIntelDashboard | null> {
    const record = await prisma.dashboard.findFirst({
      where: { opportunityId },
      orderBy: { generatedAt: 'desc' },
    });
    return record ? mapDashboardRecord(record) : null;
  }

  static async getAll(): Promise<ClientIntelDashboard[]> {
    const records = await prisma.dashboard.findMany({
      orderBy: { generatedAt: 'desc' },
    });
    return records.map(mapDashboardRecord);
  }

  static async getByVendorId(vendorId: string): Promise<ClientIntelDashboard[]> {
    const records = await prisma.dashboard.findMany({
      where: { vendorId },
      orderBy: { generatedAt: 'desc' },
    });
    return records.map(mapDashboardRecord);
  }

  private static resolveOpportunityContext(
    override: string | undefined,
    opportunity: Opportunity
  ): string {
    const trimmedOverride = override?.trim();
    if (trimmedOverride && trimmedOverride.length >= 10) {
      return trimmedOverride;
    }

    const trimmedNotes = opportunity.notes?.trim();
    if (trimmedNotes && trimmedNotes.length >= 10) {
      return trimmedNotes;
    }

    return `Opportunity ${opportunity.name} for client ${opportunity.clientId}`;
  }

  private static generateFakeSections(
    vendor: { name: string },
    client: { name: string; sectorHint?: string },
    service: { name: string; shortDescription: string },
    opportunityContext: string
  ): ClientIntelDashboardSections {
    const accountSnapshot = this.generateAccountSnapshot(client);
    return {
      accountSnapshot,
      opportunitySummary: this.generateOpportunitySummary(client, opportunityContext, accountSnapshot),
      marketContext: this.generateMarketContext(client),
      opportunityRequirements: this.generateFakeOpportunityRequirements(service, opportunityContext),
      stakeholderMap: this.generateStakeholderMap(),
      competitiveLandscape: this.generateCompetitiveLandscape(client, vendor),
      vendorFitAndPlays: this.generateVendorFitAndPlays(service),
      evidencePack: this.generateEvidencePack(vendor, service),
      gapsAndQuestions: this.generateGapsAndQuestions(),
      newsOfInterest: this.generateFakeNewsOfInterest(client),
      criticalDates: this.generateFakeCriticalDates(),
      proposalOutline: undefined,
    };
  }

  private static generateOpportunitySummary(
    client: { name: string; sectorHint?: string },
    opportunityContext: string,
    accountSnapshot: AccountSnapshotSection
  ): OpportunitySummarySection {
    // Extract brief from opportunity context (first 200 chars)
    const opportunityBrief = opportunityContext
      ? opportunityContext.length > 200
        ? opportunityContext.substring(0, 200) + '...'
        : opportunityContext
      : `Oportunidad de transformación digital con ${client.name} enfocada en modernización tecnológica y eficiencia operativa.`;

    return {
      companyName: client.name,
      industry: client.sectorHint || accountSnapshot.industry || 'Technology',
      headquarters: accountSnapshot.headquarters,
      opportunityBrief,
      clientKPIs: [
        {
          label: 'Empleados',
          value: accountSnapshot.employeeCount || 'N/A',
          trend: 'up',
        },
        {
          label: 'Ingresos',
          value: accountSnapshot.revenue || 'N/A',
          trend: 'stable',
        },
        ...(accountSnapshot.keyMetrics.slice(0, 2).map((m) => ({
          label: m.label,
          value: m.value,
          trend: 'up' as const,
        }))),
      ],
      opportunityKPIs: [
        {
          label: 'Presupuesto Estimado',
          value: '€2-5M',
          importance: 'high',
        },
        {
          label: 'Timeline',
          value: '6-12 meses',
          importance: 'high',
        },
        {
          label: 'Probabilidad de Cierre',
          value: '65%',
          importance: 'medium',
        },
        {
          label: 'Stakeholders Clave',
          value: '3-5',
          importance: 'medium',
        },
      ],
    };
  }

  private static generateAccountSnapshot(client: { name: string; sectorHint?: string }): AccountSnapshotSection {
    return {
      companyName: client.name,
      industry: client.sectorHint || 'Technology',
      headquarters: 'Unknown',
      employeeCount: '1,000-5,000',
      revenue: '€50M - €200M',
      description: `${client.name} is a leading company in their sector, focused on innovation and growth.`,
      keyMetrics: [
        { label: 'Market Share', value: '15%' },
        { label: 'Growth Rate', value: '12% YoY' },
        { label: 'Customer Satisfaction', value: '4.2/5' },
      ],
    };
  }

  private static generateMarketContext(_client: { name: string }): MarketContextSection {
    return {
      industryTrends: [
        {
          trend: 'Digital Transformation',
          impact: 'high',
          description: 'Industry is rapidly adopting digital solutions to improve efficiency.',
        },
        {
          trend: 'Cloud Migration',
          impact: 'medium',
          description: 'Companies are moving infrastructure to cloud platforms.',
        },
      ],
      recentEvents: [
        {
          date: '2024-01-15',
          event: 'New CEO appointment',
          significance: 'Leadership change may indicate strategic shift.',
        },
        {
          date: '2023-12-10',
          event: 'Major acquisition',
          significance: 'Expansion into new markets.',
        },
      ],
      marketSize: '€2.5B',
      growthRate: '8% CAGR',
    };
  }

  private static generateFakeOpportunityRequirements(
    service: { name: string; shortDescription?: string },
    opportunityContext: string
  ): OpportunityRequirementsSection {
    return {
      requirements: [
        {
          id: 'req_1',
          category: 'requirement',
          title: 'Implementación en 6 meses',
          description: 'El cliente requiere que la solución esté operativa en un plazo máximo de 6 meses desde la firma del contrato.',
          priority: 'high',
          relevanceToService: 90,
        },
        {
          id: 'req_2',
          category: 'requirement',
          title: 'Soporte 24/7',
          description: 'Necesidad de soporte técnico disponible las 24 horas del día, 7 días a la semana.',
          priority: 'high',
          relevanceToService: 85,
        },
        {
          id: 'req_3',
          category: 'criteria',
          title: 'Experiencia en sector',
          description: 'El cliente valora especialmente la experiencia previa en su sector específico.',
          priority: 'medium',
          relevanceToService: 80,
        },
        {
          id: 'req_4',
          category: 'exclusion',
          title: 'No soluciones on-premise',
          description: 'El cliente ha excluido explícitamente soluciones que requieran infraestructura on-premise.',
          priority: 'high',
          relevanceToService: 100,
        },
      ],
      whatClientSeeks: [
        'Transformación digital acelerada',
        'Reducción de costos operativos',
        'Mejora en la experiencia del cliente',
        'Escalabilidad para crecimiento futuro',
      ],
      scope: [
        'Migración de sistemas legacy',
        'Implementación de nuevas plataformas',
        'Capacitación del equipo',
        'Soporte durante los primeros 12 meses',
      ],
      exclusions: [
        'Infraestructura on-premise',
        'Desarrollo de software personalizado desde cero',
        'Servicios de mantenimiento a largo plazo sin renovación',
      ],
      selectionCriteria: [
        'Experiencia en el sector',
        'Tiempo de implementación',
        'ROI demostrable',
        'Referencias de clientes similares',
        'Capacidad de escalabilidad',
      ],
      summary:
        opportunityContext ||
        `El cliente busca una solución integral enfocada en ${service.name}${
          service.shortDescription ? ` (${service.shortDescription})` : ''
        } que se alinee con sus objetivos estratégicos y operativos.`,
    };
  }

  private static generateFakeNewsOfInterest(client: { name: string }): NewsOfInterestSection {
    const now = new Date();
    return {
      items: [
        {
          id: 'news_1',
          title: `${client.name} anuncia nueva estrategia de transformación digital`,
          source: 'TechCrunch',
          date: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          url: 'https://example.com/news1',
          relevance: 'high',
          summary: 'La empresa ha anunciado una inversión significativa en tecnologías de transformación digital para los próximos 2 años.',
          impactOnOpportunity: 'Positivo: Indica presupuesto y compromiso con proyectos de transformación',
        },
        {
          id: 'news_2',
          title: `Nuevo CEO nombrado en ${client.name}`,
          source: 'Financial Times',
          date: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          url: 'https://example.com/news2',
          relevance: 'medium',
          summary: 'Cambio de liderazgo que podría traer nuevas prioridades estratégicas.',
          impactOnOpportunity: 'Neutro: Puede afectar tiempos de decisión',
        },
        {
          id: 'news_3',
          title: `${client.name} adquiere startup de tecnología`,
          source: 'Bloomberg',
          date: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString(),
          relevance: 'low',
          summary: 'Adquisición estratégica que expande las capacidades tecnológicas de la empresa.',
          impactOnOpportunity: 'Positivo: Muestra apetito por inversión en tecnología',
        },
      ],
      summary: 'Noticias recientes muestran un enfoque activo en transformación digital y cambios organizacionales.',
    };
  }

  private static generateFakeCriticalDates(): CriticalDatesSection {
    const now = new Date();
    return {
      dates: [
        {
          id: 'date_1',
          date: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          event: 'Deadline para presentación de propuestas',
          type: 'deadline',
          importance: 'critical',
          description: 'Fecha límite para entregar la propuesta técnica y comercial completa.',
          stakeholders: ['Director de Transformación Digital', 'CFO'],
        },
        {
          id: 'date_2',
          date: new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000).toISOString(),
          event: 'Reunión de evaluación de propuestas',
          type: 'meeting',
          importance: 'high',
          description: 'Sesión interna del comité de evaluación para revisar todas las propuestas recibidas.',
          stakeholders: ['Comité de Evaluación'],
        },
        {
          id: 'date_3',
          date: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          event: 'Presentaciones finales (shortlist)',
          type: 'meeting',
          importance: 'critical',
          description: 'Presentaciones en persona de los finalistas seleccionados.',
          stakeholders: ['CEO', 'CTO', 'Director de Transformación Digital'],
        },
        {
          id: 'date_4',
          date: new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000).toISOString(),
          event: 'Decisión final y notificación',
          type: 'decision',
          importance: 'critical',
          description: 'Fecha prevista para la toma de decisión final y notificación a los proveedores.',
          stakeholders: ['Consejo Directivo'],
        },
        {
          id: 'date_5',
          date: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString(),
          event: 'Inicio del proyecto (si somos seleccionados)',
          type: 'milestone',
          importance: 'high',
          description: 'Fecha objetivo para el inicio del proyecto, asumiendo que somos seleccionados.',
          stakeholders: ['Equipo del Proyecto'],
        },
      ],
      summary: 'Calendario crítico con deadlines importantes en las próximas semanas. La decisión final está prevista para dentro de 45 días.',
    };
  }

  private static generateStakeholderMap(): StakeholderMapSection {
    return {
      stakeholders: [
        {
          id: 'stakeholder_1',
          name: 'John Smith',
          role: 'CTO',
          department: 'Technology',
          influence: 'high',
          stance: 'supporter',
          notes: 'Interested in innovation and new technologies.',
          priorities: ['Digital transformation', 'Security'],
        },
        {
          id: 'stakeholder_2',
          name: 'Sarah Johnson',
          role: 'CFO',
          department: 'Finance',
          influence: 'high',
          stance: 'neutral',
          notes: 'Focused on ROI and cost efficiency.',
          priorities: ['Cost reduction', 'ROI'],
        },
        {
          id: 'stakeholder_3',
          name: 'Mike Davis',
          role: 'VP Operations',
          department: 'Operations',
          influence: 'medium',
          stance: 'champion',
          notes: 'Strong advocate for process improvement.',
          priorities: ['Efficiency', 'Automation'],
        },
      ],
      summary: 'Key stakeholders identified with varying levels of influence and support.',
    };
  }

  private static generateCompetitiveLandscape(
    _client: { name: string },
    _vendor: { name: string }
  ): CompetitiveLandscapeSection {
    return {
      clientCompetitors: [
        {
          id: 'comp_1',
          name: 'Competitor A',
          type: 'client_competitor',
          description: 'Main competitor in the same market segment.',
          strengths: ['Market presence', 'Brand recognition'],
          weaknesses: ['Legacy systems', 'Slow innovation'],
        },
      ],
      vendorCompetitors: [
        {
          id: 'comp_2',
          name: 'Alternative Vendor X',
          type: 'vendor_competitor',
          description: 'Competing solution in the same category.',
          strengths: ['Lower pricing', 'Established customer base'],
          weaknesses: ['Limited features', 'Poor support'],
        },
      ],
      alternatives: [
        {
          id: 'alt_1',
          name: 'Build in-house',
          type: 'alternative_solution',
          description: 'Internal development option.',
          strengths: ['Full control', 'Customization'],
          weaknesses: ['High cost', 'Time to market'],
        },
      ],
      summary: 'Competitive landscape shows opportunities for differentiation.',
    };
  }

  private static generateVendorFitAndPlays(_service: { name: string }): VendorFitAndPlaysSection {
    return {
      overallFit: 'high',
      fitScore: 82,
      fitDimensions: [
        {
          dimension: 'Technical Capability',
          score: 90,
          reasoning: 'Our solution directly addresses their technical needs.',
        },
        {
          dimension: 'Business Alignment',
          score: 85,
          reasoning: 'Strong alignment with their strategic priorities.',
        },
        {
          dimension: 'Cultural Fit',
          score: 70,
          reasoning: 'Good cultural match, some differences in approach.',
        },
      ],
      recommendedPlays: [
        {
          id: 'play_1',
          name: 'Efficiency Play',
          description: 'Focus on operational efficiency and cost savings.',
          rationale: 'Aligns with their priority on improving efficiency.',
          targetStakeholders: ['stakeholder_3', 'stakeholder_2'],
          successFactors: ['Demonstrate ROI', 'Show quick wins', 'Provide case studies'],
        },
        {
          id: 'play_2',
          name: 'Innovation Play',
          description: 'Position as innovative solution for digital transformation.',
          rationale: 'CTO is interested in innovation and new technologies.',
          targetStakeholders: ['stakeholder_1'],
          successFactors: ['Highlight cutting-edge features', 'Showcase innovation', 'Provide technical demos'],
        },
      ],
      summary: 'Strong overall fit with multiple strategic plays available.',
    };
  }

  private static generateEvidencePack(_vendor: { name: string }, _service: { name: string }): EvidencePackSection {
    return {
      items: [
        {
          id: 'evidence_1',
          type: 'case_study',
          title: 'Similar Client Success Story',
          description: 'Case study from similar industry showing 30% efficiency improvement.',
          snippet: `${_vendor.name} helped a similar client achieve 30% operational efficiency improvement within 6 months.`,
          source: 'Internal case study',
          relevance: 90,
        },
        {
          id: 'evidence_2',
          type: 'kpi',
          title: 'Industry-leading KPIs',
          description: 'Key performance indicators that demonstrate value.',
          snippet: 'Average customer sees 25% cost reduction and 40% faster processing times.',
          source: 'Internal metrics',
          relevance: 85,
        },
        {
          id: 'evidence_3',
          type: 'testimonial',
          title: 'Client Testimonial',
          description: 'Positive feedback from existing clients.',
          snippet: '"The solution transformed our operations and exceeded our expectations." - CEO, Similar Company',
          source: 'Client reference',
          relevance: 80,
        },
      ],
      summary: 'Strong evidence portfolio available to support the sales process.',
    };
  }

  private static generateGapsAndQuestions(): GapsAndQuestionsSection {
    return {
      gaps: [
        {
          id: 'gap_1',
          topic: 'Current Technology Stack',
          impact: 'high',
          description: 'Need to understand their existing technology infrastructure.',
        },
        {
          id: 'gap_2',
          topic: 'Budget and Timeline',
          impact: 'high',
          description: 'Critical to know budget constraints and implementation timeline.',
        },
        {
          id: 'gap_3',
          topic: 'Decision Process',
          impact: 'medium',
          description: 'Understanding their decision-making process and key stakeholders.',
        },
      ],
      questions: [
        {
          id: 'question_1',
          question: 'What are the main pain points you are experiencing with your current solution?',
          context: 'Understanding current challenges helps position our solution.',
          targetStakeholder: 'stakeholder_1',
        },
        {
          id: 'question_2',
          question: 'What is your budget range for this initiative?',
          context: 'Budget information is critical for proposal development.',
          targetStakeholder: 'stakeholder_2',
        },
        {
          id: 'question_3',
          question: 'What is your ideal timeline for implementation?',
          context: 'Timeline helps prioritize features and plan delivery.',
        },
      ],
      summary: 'Key information gaps identified with targeted questions prepared.',
    };
  }
}
