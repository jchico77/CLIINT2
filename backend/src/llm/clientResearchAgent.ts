import { llmClient } from './client';
import { deepResearchService } from './deepResearchService';
import {
  AccountSnapshotSection,
  MarketContextSection,
  StrategicPrioritiesSection,
} from '../domain/models/clientIntelDashboard';
import { ClientAccount } from '../domain/models/clientAccount';

interface ClientResearchOutput {
  accountSnapshot: AccountSnapshotSection;
  marketContext: MarketContextSection;
  strategicPriorities: StrategicPrioritiesSection;
}

export class ClientResearchAgent {
  async research(
    client: ClientAccount,
    opportunityContext: string
  ): Promise<ClientResearchOutput> {
    // Paso 1: Realizar investigación profunda
    console.log(`[ClientResearchAgent] Iniciando investigación profunda para ${client.name}...`);
    let deepResearch;
    try {
      deepResearch = await deepResearchService.researchCompany(
        client.name,
        client.websiteUrl,
        client.sectorHint,
        client.country
      );
      console.log(`[ClientResearchAgent] ✓ Investigación profunda completada`);
    } catch (error) {
      console.warn(`[ClientResearchAgent] ⚠️  Deep research falló, continuando con análisis básico:`, error);
      deepResearch = null;
    }

    // Paso 2: Análisis con LLM usando información de deep research
    const systemPrompt = `Eres un analista de negocio B2B experto con acceso a información en tiempo real.
Tu objetivo es analizar un cliente B2B y generar información estructurada sobre:
1. Account Snapshot: Resumen de la empresa, métricas clave, industria
2. Market Context: Tendencias de la industria, eventos recientes, tamaño de mercado
3. Strategic Priorities: Prioridades estratégicas del cliente y pain points relacionados

IMPORTANTE:
- Usa información de investigación profunda cuando esté disponible
- NO inventes datos financieros específicos si no los conoces. Usa rangos o "unknown"
- Prioriza información relevante para decisiones B2B (no curiosidades)
- Sé específico y basado en conocimiento del sector y hechos reales
- Si tienes acceso a búsqueda web, úsala para obtener información actualizada
- Responde SIEMPRE en formato JSON válido`;

    const deepResearchContext = deepResearch
      ? `
**INFORMACIÓN DE INVESTIGACIÓN PROFUNDA DISPONIBLE:**
${JSON.stringify(deepResearch, null, 2)}

Usa esta información como base para tu análisis, complementándola con búsqueda web adicional si es necesario.
`
      : `
**NOTA:** No hay información de investigación profunda disponible. Realiza búsqueda web para obtener información actualizada sobre la empresa.
`;

    const userPrompt = `Analiza el siguiente cliente B2B realizando investigación profunda:

**Cliente:**
- Nombre: ${client.name}
- Website: ${client.websiteUrl}
- País: ${client.country || 'No especificado'}
- Sector: ${client.sectorHint || 'No especificado'}
- Notas: ${client.notes || 'Ninguna'}

**Contexto de la Oportunidad:**
${opportunityContext}

${deepResearchContext}

**INSTRUCCIONES:**
1. Si no tienes información suficiente, usa búsqueda web para obtener datos actualizados
2. Analiza noticias recientes, reportes públicos, y tendencias del sector
3. Genera insights basados en hechos reales, no en suposiciones
4. Prioriza información relevante para la oportunidad descrita

Genera un análisis completo con la siguiente estructura JSON:

{
  "accountSnapshot": {
    "companyName": "string",
    "industry": "string",
    "headquarters": "string o null",
    "employeeCount": "string (ej: '1,000-5,000' o 'unknown')",
    "revenue": "string (ej: '€50M - €200M' o 'unknown')",
    "description": "string (2-3 párrafos sobre la empresa)",
    "keyMetrics": [
      {"label": "string", "value": "string"}
    ]
  },
  "marketContext": {
    "industryTrends": [
      {
        "trend": "string",
        "impact": "high" | "medium" | "low",
        "description": "string"
      }
    ],
    "recentEvents": [
      {
        "date": "YYYY-MM-DD",
        "event": "string",
        "significance": "string"
      }
    ],
    "marketSize": "string o null",
    "growthRate": "string o null"
  },
  "strategicPriorities": {
    "priorities": [
      {
        "id": "priority_1",
        "name": "string",
        "description": "string",
        "relevanceToService": 0-100,
        "painPoints": [
          {
            "id": "pain_1",
            "description": "string",
            "severity": "high" | "medium" | "low"
          }
        ]
      }
    ],
    "summary": "string"
  }
}`;

    try {
      console.log(`[ClientResearchAgent] Analizando cliente con GPT-4o: ${client.name}`);
      
      // Usar GPT-4o con capacidades nativas maximizadas
      const result = await llmClient.generateJSON<ClientResearchOutput>(
        systemPrompt,
        userPrompt,
        {
          model: 'gpt-4o', // GPT-4o con acceso a herramientas nativas
          temperature: 0.3, // Más bajo para análisis preciso
          maxTokens: 8000, // Más tokens para análisis profundo
        }
      );

      // Enriquecer con información de deep research si está disponible
      if (deepResearch) {
        // Combinar información de deep research con análisis LLM
        if (deepResearch.companyInfo.recentNews && deepResearch.companyInfo.recentNews.length > 0) {
          // Enriquecer marketContext con noticias de deep research
          if (!result.marketContext.recentEvents || result.marketContext.recentEvents.length === 0) {
            result.marketContext.recentEvents = deepResearch.companyInfo.recentNews.map((news) => ({
              date: news.date,
              event: news.title,
              significance: news.summary,
            }));
          }
        }

        // Enriquecer accountSnapshot con métricas de deep research
        if (deepResearch.companyInfo.keyMetrics && deepResearch.companyInfo.keyMetrics.length > 0) {
          result.accountSnapshot.keyMetrics = [
            ...result.accountSnapshot.keyMetrics,
            ...deepResearch.companyInfo.keyMetrics,
          ];
        }
      }

      console.log(`[ClientResearchAgent] ✓ Análisis completado para ${client.name}`);
      return result;
    } catch (error) {
      console.error('[ClientResearchAgent] Error:', error);
      throw new Error(`Failed to research client: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

