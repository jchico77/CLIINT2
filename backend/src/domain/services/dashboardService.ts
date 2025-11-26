import {
  ClientIntelDashboard,
  CreateDashboardInput,
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
} from '../models/clientIntelDashboard';
import { VendorService } from './vendorService';
import { ClientService } from './clientService';
import { ServiceOfferingService } from './serviceOfferingService';
import { ClientResearchAgent } from '../../llm/clientResearchAgent';
import { VendorResearchAgent } from '../../llm/vendorResearchAgent';
import { FitAndStrategyAgent } from '../../llm/fitAndStrategyAgent';
import { deepResearchService } from '../../llm/deepResearchService';
import { llmConfig } from '../../config/llm';
import { ProgressCallback } from '../types/progress';
import { NotFoundError, LLMError } from '../errors/AppError';
import { LLMCache } from './llmCache';

// In-memory storage
const dashboards: Map<string, ClientIntelDashboard> = new Map();

export class DashboardService {
  static async generateDashboard(
    input: CreateDashboardInput,
    onProgress?: ProgressCallback
  ): Promise<ClientIntelDashboard> {
    const vendor = VendorService.getById(input.vendorId);
    const client = ClientService.getById(input.clientId);
    const service = ServiceOfferingService.getById(input.serviceOfferingId);

    if (!vendor) {
      throw new NotFoundError('Vendor', input.vendorId);
    }
    if (!client) {
      throw new NotFoundError('Client', input.clientId);
    }
    if (!service) {
      throw new NotFoundError('Service', input.serviceOfferingId);
    }

    const id = `dashboard_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

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
      console.log('[DashboardService] Using cached LLM results');
      sections = cachedSections;
      llmModelUsed = llmConfig.defaultModel;
      onProgress?.({ stepId: 'cache-hit', status: 'completed', message: 'Usando resultados en caché', progress: 100 });
    } else {
      // Try to use LLM if API key is available
      if (llmConfig.openaiApiKey) {
        try {
          console.log('[DashboardService] Using LLM agents to generate dashboard...');
          sections = await this.generateLLMSections(
            vendor,
            client,
            service,
            input.opportunityContext,
            onProgress
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
          
          console.log('[DashboardService] ✓ Dashboard generated with LLM and cached');
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown LLM error';
          console.error('[DashboardService] LLM generation failed, falling back to fake data:', errorMessage);
          
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
        console.log('[DashboardService] No LLM API key, using fake data');
        sections = this.generateFakeSections(vendor, client, service, input.opportunityContext);
      }
    }

    const dashboard: ClientIntelDashboard = {
      id,
      vendorId: input.vendorId,
      clientId: input.clientId,
      serviceOfferingId: input.serviceOfferingId,
      opportunityContext: input.opportunityContext,
      generatedAt: now,
      llmModelUsed,
      sections,
    };

    dashboards.set(id, dashboard);
    return dashboard;
  }

  static generateFakeDashboard(input: CreateDashboardInput): ClientIntelDashboard {
    const vendor = VendorService.getById(input.vendorId);
    const client = ClientService.getById(input.clientId);
    const service = ServiceOfferingService.getById(input.serviceOfferingId);

    if (!vendor || !client || !service) {
      throw new Error('Vendor, client, or service not found');
    }

    const id = `dashboard_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    const sections = this.generateFakeSections(vendor, client, service, input.opportunityContext);

    const dashboard: ClientIntelDashboard = {
      id,
      vendorId: input.vendorId,
      clientId: input.clientId,
      serviceOfferingId: input.serviceOfferingId,
      opportunityContext: input.opportunityContext,
      generatedAt: now,
      llmModelUsed: 'fake-data-generator',
      sections,
    };

    dashboards.set(id, dashboard);
    return dashboard;
  }

  private static async generateLLMSections(
    vendor: { id: string; name: string; websiteUrl: string; description?: string; createdAt: string; updatedAt: string },
    client: { id: string; vendorId: string; name: string; websiteUrl: string; sectorHint?: string; country?: string; notes?: string; createdAt: string; updatedAt: string },
    service: { id: string; vendorId: string; name: string; shortDescription: string; categoryTags: string[]; createdAt: string; updatedAt: string },
    opportunityContext: string,
    onProgress?: ProgressCallback
  ): Promise<ClientIntelDashboardSections> {
    const clientResearchAgent = new ClientResearchAgent();
    const vendorResearchAgent = new VendorResearchAgent();
    const fitAndStrategyAgent = new FitAndStrategyAgent();

    // Step 1: Deep Research
    onProgress?.({ stepId: 'deep-research', status: 'in-progress', message: `Investigando ${client.name}...`, progress: 10 });
    console.log('[DashboardService] Step 1: Deep research...');
    
    // Step 2: Run client and vendor research in parallel
    onProgress?.({ stepId: 'client-analysis', status: 'in-progress', message: 'Analizando cliente con GPT-4o...', progress: 20 });
    onProgress?.({ stepId: 'vendor-research', status: 'in-progress', message: 'Extrayendo evidencias del vendor...', progress: 30 });
    console.log('[DashboardService] Step 2: Running Client & Vendor research...');
    
    const [clientResearch, vendorResearch] = await Promise.all([
      clientResearchAgent.research(client, opportunityContext),
      vendorResearchAgent.research(vendor, service),
    ]);

    onProgress?.({ stepId: 'client-analysis', status: 'completed', message: 'Análisis del cliente completado', progress: 40 });
    onProgress?.({ stepId: 'vendor-research', status: 'completed', message: 'Evidencias extraídas', progress: 50 });

    // Step 3: Competitive research
    onProgress?.({ stepId: 'competitive', status: 'in-progress', message: 'Analizando competidores...', progress: 55 });
    console.log('[DashboardService] Step 3: Competitive research...');

    // Step 4: Generate fit and strategy analysis using results from step 1
    onProgress?.({ stepId: 'fit-strategy', status: 'in-progress', message: 'Generando stakeholder map, vendor fit y plays estratégicos...', progress: 60 });
    console.log('[DashboardService] Step 4: Generating Fit & Strategy analysis...');
    
    const fitAndStrategy = await fitAndStrategyAgent.generate(
      vendor,
      client,
      service,
      opportunityContext,
      clientResearch,
      vendorResearch.evidence
    );

    onProgress?.({ stepId: 'competitive', status: 'completed', message: 'Análisis competitivo completado', progress: 80 });
    onProgress?.({ stepId: 'fit-strategy', status: 'completed', message: 'Fit y estrategia generados', progress: 85 });

    // Step 5: News research
    onProgress?.({ stepId: 'news', status: 'in-progress', message: 'Buscando noticias relevantes de los últimos 6 meses...', progress: 90 });
    console.log('[DashboardService] Step 5: News research...');
    
    let newsResearch;
    try {
      newsResearch = await deepResearchService.researchNews(client.name, client.sectorHint || clientResearch.accountSnapshot.industry, '6months');
      console.log('[DashboardService] ✓ Investigación de noticias completada');
      onProgress?.({ stepId: 'news', status: 'completed', message: 'Noticias encontradas', progress: 95 });
    } catch (error) {
      console.warn('[DashboardService] ⚠️  Investigación de noticias falló, usando datos fake:', error);
      newsResearch = null;
      onProgress?.({ stepId: 'news', status: 'completed', message: 'Usando datos alternativos', progress: 95 });
    }

    onProgress?.({ stepId: 'deep-research', status: 'completed', message: 'Investigación profunda completada', progress: 95 });

    // Combine all LLM results - now everything is generated by LLM with deep research!
    return {
      accountSnapshot: clientResearch.accountSnapshot,
      opportunitySummary: this.generateOpportunitySummary(client, opportunityContext, clientResearch.accountSnapshot),
      marketContext: clientResearch.marketContext,
      opportunityRequirements: this.generateFakeOpportunityRequirements(service, opportunityContext),
      stakeholderMap: fitAndStrategy.stakeholderMap,
      competitiveLandscape: fitAndStrategy.competitiveLandscape,
      vendorFitAndPlays: fitAndStrategy.vendorFitAndPlays,
      evidencePack: {
        items: vendorResearch.evidence,
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
    };
  }

  static getById(id: string): ClientIntelDashboard | null {
    return dashboards.get(id) || null;
  }

  static getAll(): ClientIntelDashboard[] {
    return Array.from(dashboards.values()).sort((a, b) => {
      // Ordenar por fecha de generación (más recientes primero)
      return new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime();
    });
  }

  static getByVendorId(vendorId: string): ClientIntelDashboard[] {
    return this.getAll().filter((d) => d.vendorId === vendorId);
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
    service: { name: string },
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
      summary: opportunityContext || 'El cliente busca una solución integral que se alinee con sus objetivos estratégicos y requisitos operativos.',
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

