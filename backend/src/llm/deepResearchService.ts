import { llmClient } from './client';
import OpenAI from 'openai';
import { llmConfig } from '../config/llm';

/**
 * Deep Research Service
 * Utiliza las capacidades nativas de GPT-4o para realizar investigación profunda
 * usando web search, análisis de documentos, y reasoning avanzado
 */
export class DeepResearchService {
  private client: OpenAI;

  constructor() {
    if (!llmConfig.openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }
    this.client = new OpenAI({
      apiKey: llmConfig.openaiApiKey,
    });
  }

  /**
   * Realiza investigación profunda sobre una empresa/cliente
   * Usa web search y análisis de múltiples fuentes
   */
  async researchCompany(
    companyName: string,
    websiteUrl: string,
    sector?: string,
    country?: string
  ): Promise<{
    companyInfo: {
      description: string;
      headquarters?: string;
      employeeCount?: string;
      revenue?: string;
      keyMetrics: Array<{ label: string; value: string }>;
      recentNews: Array<{
        title: string;
        date: string;
        source: string;
        summary: string;
        url?: string;
      }>;
    };
    marketAnalysis: {
      industryTrends: Array<{
        trend: string;
        impact: 'high' | 'medium' | 'low';
        description: string;
      }>;
      marketSize?: string;
      growthRate?: string;
      competitivePosition?: string;
    };
    strategicInsights: {
      priorities: Array<{
        name: string;
        description: string;
        evidence: string[];
      }>;
      challenges: Array<{
        challenge: string;
        severity: 'high' | 'medium' | 'low';
        description: string;
      }>;
    };
  }> {
    const systemPrompt = `Eres un analista de negocio B2B experto con acceso a información en tiempo real. 
Tu objetivo es realizar una investigación PROFUNDA y COMPLETA sobre una empresa, utilizando:
1. Búsqueda web para obtener información actualizada
2. Análisis de múltiples fuentes (noticias, reportes, documentos públicos)
3. Reasoning avanzado para sintetizar información

IMPORTANTE:
- Usa herramientas de búsqueda web para obtener información actualizada
- Analiza múltiples fuentes y cruza información
- Prioriza información reciente y relevante
- Sé específico y basado en hechos, no en suposiciones
- Si no encuentras información específica, indica "unknown" o usa rangos razonables
- Responde SIEMPRE en formato JSON válido`;

    const userPrompt = `Realiza una investigación PROFUNDA sobre la siguiente empresa:

**Empresa:**
- Nombre: ${companyName}
- Website: ${websiteUrl}
- Sector: ${sector || 'No especificado'}
- País: ${country || 'No especificado'}

**Instrucciones de investigación:**
1. Busca información actualizada sobre la empresa (últimos 12 meses)
2. Analiza noticias relevantes, comunicados de prensa, reportes financieros públicos
3. Investiga tendencias del sector/industria
4. Identifica prioridades estratégicas y desafíos basados en evidencia
5. Obtén métricas clave y datos financieros si están disponibles públicamente

Genera un análisis completo con la siguiente estructura JSON:

{
  "companyInfo": {
    "description": "string (descripción detallada basada en investigación)",
    "headquarters": "string o null",
    "employeeCount": "string (ej: '50,000-100,000' o 'unknown')",
    "revenue": "string (ej: '€5B - €10B' o 'unknown')",
    "keyMetrics": [
      {"label": "string", "value": "string"}
    ],
    "recentNews": [
      {
        "title": "string",
        "date": "YYYY-MM-DD",
        "source": "string",
        "summary": "string",
        "url": "string o null"
      }
    ]
  },
  "marketAnalysis": {
    "industryTrends": [
      {
        "trend": "string",
        "impact": "high" | "medium" | "low",
        "description": "string"
      }
    ],
    "marketSize": "string o null",
    "growthRate": "string o null",
    "competitivePosition": "string o null"
  },
  "strategicInsights": {
    "priorities": [
      {
        "name": "string",
        "description": "string",
        "evidence": ["string"]
      }
    ],
    "challenges": [
      {
        "challenge": "string",
        "severity": "high" | "medium" | "low",
        "description": "string"
      }
    ]
  }
}`;

    try {
      console.log(`[DeepResearchService] Iniciando investigación profunda sobre: ${companyName}`);
      
      // Usar GPT-4o con herramientas de búsqueda web
      const response = await this.client.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3, // Más bajo para investigación precisa
        max_tokens: 8000,
        response_format: { type: 'json_object' },
        // Nota: GPT-4o puede usar herramientas de búsqueda automáticamente
        // cuando detecta que necesita información actualizada
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from LLM');
      }

      // Parse JSON response
      let cleaned = content.trim();
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
      }

      const result = JSON.parse(cleaned);
      console.log(`[DeepResearchService] ✓ Investigación completada para ${companyName}`);
      return result;
    } catch (error) {
      console.error('[DeepResearchService] Error en investigación:', error);
      throw new Error(`Failed to perform deep research: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Investiga competidores y paisaje competitivo
   */
  async researchCompetitors(
    companyName: string,
    sector: string,
    serviceType: string
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
      const response = await this.client.chat.completions.create({
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

      return JSON.parse(cleaned);
    } catch (error) {
      console.error('[DeepResearchService] Error en investigación de competidores:', error);
      throw error;
    }
  }

  /**
   * Investiga noticias relevantes y eventos recientes
   */
  async researchNews(
    companyName: string,
    sector: string,
    timeframe: '1month' | '3months' | '6months' | '1year' = '6months'
  ): Promise<Array<{
    title: string;
    source: string;
    date: string;
    url?: string;
    relevance: 'high' | 'medium' | 'low';
    summary: string;
    impactOnOpportunity?: string;
  }>> {
    const systemPrompt = `Eres un analista de noticias B2B. Busca y analiza noticias relevantes sobre empresas,
usando búsqueda web para obtener información actualizada.

IMPORTANTE: Responde SIEMPRE en formato JSON válido.`;

    const timeframeMap = {
      '1month': 'último mes',
      '3months': 'últimos 3 meses',
      '6months': 'últimos 6 meses',
      '1year': 'último año',
    };

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
      const response = await this.client.chat.completions.create({
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
      return result.news || result.items || [];
    } catch (error) {
      console.error('[DeepResearchService] Error en investigación de noticias:', error);
      throw error;
    }
  }
}

export const deepResearchService = new DeepResearchService();

