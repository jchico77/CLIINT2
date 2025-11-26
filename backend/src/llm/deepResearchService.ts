import OpenAI from 'openai';
import { llmConfig } from '../config/llm';
import { runClientDeepResearch } from './deepResearchClient';
import {
  ClientDeepResearchInput,
  ClientDeepResearchReport,
} from '../domain/models/clientDeepResearchReport';
import { ClientAccount } from '../domain/models/clientAccount';
import { ServiceOffering } from '../domain/models/serviceOffering';
import { logger } from '../lib/logger';

/**
 * Deep Research Service
 * Centraliza el acceso a los modelos de Deep Research y expone utilidades
 * adicionales (competidores, noticias) todavía basadas en prompts legacy.
 */
export class DeepResearchService {
  private client: OpenAI | null;

  constructor() {
    this.client = llmConfig.openaiApiKey
      ? new OpenAI({
          apiKey: llmConfig.openaiApiKey,
        })
      : null;

    if (!llmConfig.openaiApiKey) {
      logger.warn(
        { feature: 'deepResearch' },
        'OpenAI API key not configured; deep research features are disabled',
      );
    }
  }

  private ensureClient(): OpenAI {
    if (!this.client) {
      throw new Error('OpenAI API key not configured');
    }

    return this.client;
  }

  async getClientReport(
    client: ClientAccount,
    service: ServiceOffering,
  ): Promise<ClientDeepResearchReport> {
    logger.info(
      {
        clientId: client.id,
        serviceOfferingId: service.id,
        model: llmConfig.deepResearchModel,
      },
      'Running structured deep research report',
    );

    return this.runClientResearchStructured({
      clientName: client.name,
      clientWebsiteUrl: client.websiteUrl,
      country: client.country,
      sectorHint: client.sectorHint,
      serviceOfferingName: service.name,
    });
  }

  async runClientResearchStructured(
    input: ClientDeepResearchInput,
  ): Promise<ClientDeepResearchReport> {
    return runClientDeepResearch(input);
  }

  async researchCompetitors(
    companyName: string,
    sector: string,
    serviceType: string,
  ): Promise<{
    clientCompetitors: Array<{
      name: string;
      description: string;
      strengths: string[];
      weaknesses: string[];
    }>;
    vendorCompetitors: Array<{
      name: string;
      description: string;
      differentiators: string[];
    }>;
    alternatives: Array<{
      name: string;
      description: string;
      whyConsidered: string;
    }>;
  }> {
    const systemPrompt = `Eres un analista competitivo experto. Realiza investigación profunda sobre competidores
usando búsqueda web y análisis de múltiples fuentes.

IMPORTANTE: Responde SIEMPRE en formato JSON válido.`;

    const userPrompt = `Investiga el paisaje competitivo para:
- Cliente: ${companyName}
- Sector: ${sector}
- Tipo de servicio: ${serviceType}

Identifica:
1. Competidores directos del cliente
2. Competidores del vendor (otros proveedores de servicios similares)
3. Alternativas que el cliente podría considerar

Para cada uno, proporciona análisis detallado basado en investigación real.

Genera la respuesta en formato JSON con la siguiente estructura:
{
  "clientCompetitors": [
    {
      "name": "string",
      "description": "string",
      "strengths": ["string"],
      "weaknesses": ["string"]
    }
  ],
  "vendorCompetitors": [
    {
      "name": "string",
      "description": "string",
      "differentiators": ["string"]
    }
  ],
  "alternatives": [
    {
      "name": "string",
      "description": "string",
      "whyConsidered": "string"
    }
  ]
}`;

    try {
      logger.info(
        { companyName, sector, serviceType },
        'DeepResearchService researching competitors',
      );
      const openaiClient = this.ensureClient();
      const response = await openaiClient.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 6000,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from LLM');
      }

      let cleaned = content.trim();
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
      }

      const parsed = JSON.parse(cleaned);
      logger.info(
        { companyName, sector, serviceType },
        'Competitor research completed',
      );
      return parsed;
    } catch (error) {
      logger.error(
        { companyName, sector, serviceType, error },
        'Competitor research failed',
      );
      throw error;
    }
  }

  async researchNews(
    companyName: string,
    sector: string,
    timeframe: '1month' | '3months' | '6months' | '1year' = '6months',
  ): Promise<
    Array<{
      title: string;
      source: string;
      date: string;
      url?: string;
      relevance: 'high' | 'medium' | 'low';
      summary: string;
      impactOnOpportunity?: string;
    }>
  > {
    const systemPrompt = `Eres un analista de noticias B2B. Busca y analiza noticias relevantes sobre empresas,
usando búsqueda web para obtener información actualizada.

IMPORTANTE: Responde SIEMPRE en formato JSON válido.`;

    const timeframeMap = {
      '1month': 'último mes',
      '3months': 'últimos 3 meses',
      '6months': 'últimos 6 meses',
      '1year': 'último año',
    } as const;

    const userPrompt = `Busca noticias relevantes sobre ${companyName} (sector: ${sector}) del ${timeframeMap[timeframe]}.

Prioriza:
- Noticias sobre estrategia, transformación digital, inversiones
- Cambios organizacionales, nombramientos clave
- Adquisiciones, fusiones, partnerships
- Lanzamientos de productos/servicios
- Resultados financieros, expansiones

Para cada noticia, proporciona:
- Título, fuente, fecha
- Resumen del contenido
- Relevancia (high/medium/low)
- Impacto potencial en oportunidades B2B (si aplica)

Genera la respuesta en formato JSON con la siguiente estructura:
{
  "news": [
    {
      "title": "string",
      "source": "string",
      "date": "YYYY-MM-DD",
      "url": "string o null",
      "relevance": "high" | "medium" | "low",
      "summary": "string",
      "impactOnOpportunity": "string o null"
    }
  ]
}`;

    try {
      logger.info(
        { companyName, sector, timeframe },
        'DeepResearchService researching news',
      );
      const openaiClient = this.ensureClient();
      const response = await openaiClient.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 4000,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from LLM');
      }

      let cleaned = content.trim();
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
      }

      const result = JSON.parse(cleaned);
      const parsedNews = result.news || result.items || [];
      logger.info(
        { companyName, sector, timeframe, items: parsedNews.length },
        'News research completed',
      );
      return parsedNews;
    } catch (error) {
      logger.error(
        { companyName, sector, timeframe, error },
        'News research failed',
      );
      throw error;
    }
  }
}

export const deepResearchService = new DeepResearchService();

