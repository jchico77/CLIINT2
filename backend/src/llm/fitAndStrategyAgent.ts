import { llmClient } from './client';
import { deepResearchService } from './deepResearchService';
import {
  StakeholderMapSection,
  CompetitiveLandscapeSection,
  VendorFitAndPlaysSection,
  GapsAndQuestionsSection,
  AccountSnapshotSection,
  MarketContextSection,
  StrategicPrioritiesSection,
  EvidenceItem,
} from '../domain/models/clientIntelDashboard';
import { Vendor } from '../domain/models/vendor';
import { ClientAccount } from '../domain/models/clientAccount';
import { ServiceOffering } from '../domain/models/serviceOffering';

export interface FitAndStrategyOutput {
  stakeholderMap: StakeholderMapSection;
  competitiveLandscape: CompetitiveLandscapeSection;
  vendorFitAndPlays: VendorFitAndPlaysSection;
  gapsAndQuestions: GapsAndQuestionsSection;
}

export class FitAndStrategyAgent {
  async generate(
    vendor: Vendor,
    client: ClientAccount,
    service: ServiceOffering,
    opportunityContext: string,
    clientResearch: {
      accountSnapshot: AccountSnapshotSection;
      marketContext: MarketContextSection;
      strategicPriorities: StrategicPrioritiesSection;
    },
    vendorEvidence: EvidenceItem[]
  ): Promise<FitAndStrategyOutput> {
    // Realizar investigación profunda de competidores
    console.log(`[FitAndStrategyAgent] Investigando competidores para ${client.name}...`);
    let competitiveResearch;
    try {
      competitiveResearch = await deepResearchService.researchCompetitors(
        client.name,
        client.sectorHint || clientResearch.accountSnapshot.industry,
        service.name
      );
      console.log(`[FitAndStrategyAgent] ✓ Investigación de competidores completada`);
    } catch (error) {
      console.warn(`[FitAndStrategyAgent] ⚠️  Investigación de competidores falló:`, error);
      competitiveResearch = null;
    }

    const systemPrompt = `Eres un estratega de ventas B2B experto con acceso a información en tiempo real. 
Tu objetivo es analizar el encaje entre un vendor (proveedor) y un cliente, y generar:

1. Stakeholder Map: Stakeholders clave del cliente con influencia, stance y prioridades
2. Competitive Landscape: Competidores del cliente, competidores del vendor, y alternativas
3. Vendor Fit & Plays: Análisis de encaje, dimensiones de fit, y plays estratégicos recomendados
4. Gaps & Questions: Gaps de información críticos y preguntas inteligentes para el cliente

IMPORTANTE:
- Usa investigación profunda de competidores cuando esté disponible
- Si necesitas información adicional, usa búsqueda web para obtener datos actualizados
- Basa tus análisis en información real y específica, no genérica
- Los plays deben ser accionables, estratégicos y relevantes
- Las preguntas deben ser inteligentes, contextualizadas y basadas en insights reales
- Responde SIEMPRE en formato JSON válido`;

    const competitiveContext = competitiveResearch
      ? `
**INVESTIGACIÓN DE COMPETIDORES DISPONIBLE:**
${JSON.stringify(competitiveResearch, null, 2)}

Usa esta información como base para el competitive landscape, complementándola con búsqueda web adicional si es necesario.
`
      : `
**NOTA:** Realiza búsqueda web para identificar competidores reales del cliente y del vendor en el sector ${client.sectorHint || clientResearch.accountSnapshot.industry}.
`;

    const userPrompt = `Analiza el encaje estratégico entre vendor y cliente realizando investigación profunda:

**VENDOR:**
- Nombre: ${vendor.name}
- Website: ${vendor.websiteUrl}
- Descripción: ${vendor.description || 'No disponible'}

**CLIENTE:**
- Nombre: ${client.name}
- Website: ${client.websiteUrl}
- País: ${client.country || 'No especificado'}
- Sector: ${client.sectorHint || 'No especificado'}
- Industria: ${clientResearch.accountSnapshot.industry}
- Descripción: ${clientResearch.accountSnapshot.description}

**SERVICIO:**
- Nombre: ${service.name}
- Descripción: ${service.shortDescription}
- Categorías: ${service.categoryTags.join(', ')}

**CONTEXTO DE OPORTUNIDAD:**
${opportunityContext}

**PRIORIDADES ESTRATÉGICAS DEL CLIENTE:**
${clientResearch.strategicPriorities.priorities.map(p => `- ${p.name}: ${p.description}`).join('\n')}

**EVIDENCIAS DEL VENDOR:**
${vendorEvidence.map(e => `- ${e.title}: ${e.snippet}`).join('\n')}

${competitiveContext}

**INSTRUCCIONES:**
1. Si necesitas información adicional sobre competidores, usa búsqueda web
2. Identifica stakeholders reales basándote en la estructura típica del sector
3. Genera plays estratégicos específicos y accionables
4. Las preguntas deben ser inteligentes y basadas en insights reales del sector

Genera un análisis estratégico completo con la siguiente estructura JSON:

{
  "stakeholderMap": {
    "stakeholders": [
      {
        "id": "stakeholder_1",
        "name": "string (nombre realista basado en el sector)",
        "role": "string (ej: 'CTO', 'CFO', 'Director de Transformación Digital')",
        "department": "string o null",
        "influence": "high" | "medium" | "low",
        "stance": "champion" | "supporter" | "neutral" | "skeptic" | "blocker",
        "notes": "string (observaciones relevantes)",
        "priorities": ["string"] (prioridades de este stakeholder)
      }
    ],
    "summary": "string"
  },
  "competitiveLandscape": {
    "clientCompetitors": [
      {
        "id": "comp_1",
        "name": "string (competidor real del cliente)",
        "type": "client_competitor",
        "description": "string",
        "strengths": ["string"],
        "weaknesses": ["string"]
      }
    ],
    "vendorCompetitors": [
      {
        "id": "comp_2",
        "name": "string (competidor real del vendor)",
        "type": "vendor_competitor",
        "description": "string",
        "strengths": ["string"],
        "weaknesses": ["string"]
      }
    ],
    "alternatives": [
      {
        "id": "alt_1",
        "name": "string (alternativa como 'Build in-house', 'No hacer nada', etc.)",
        "type": "alternative_solution",
        "description": "string"
      }
    ],
    "summary": "string"
  },
  "vendorFitAndPlays": {
    "overallFit": "high" | "medium" | "low",
    "fitScore": 0-100,
    "fitDimensions": [
      {
        "dimension": "string (ej: 'Technical Capability', 'Business Alignment', 'Cultural Fit')",
        "score": 0-100,
        "reasoning": "string (explicación del score)"
      }
    ],
    "recommendedPlays": [
      {
        "id": "play_1",
        "name": "string (nombre del play estratégico)",
        "description": "string",
        "rationale": "string (por qué este play funciona)",
        "targetStakeholders": ["stakeholder_1", "stakeholder_2"],
        "successFactors": ["string"] (factores clave para el éxito)
      }
    ],
    "summary": "string"
  },
  "gapsAndQuestions": {
    "gaps": [
      {
        "id": "gap_1",
        "topic": "string (tema del gap)",
        "impact": "high" | "medium" | "low",
        "description": "string (qué información falta y por qué es importante)"
      }
    ],
    "questions": [
      {
        "id": "question_1",
        "question": "string (pregunta inteligente y específica)",
        "context": "string (por qué esta pregunta es importante)",
        "targetStakeholder": "string o null (stakeholder específico si aplica)"
      }
    ],
    "summary": "string"
  }
}`;

    try {
      console.log(`[FitAndStrategyAgent] Generando análisis estratégico con GPT-4o para ${vendor.name} ↔ ${client.name}`);
      const result = await llmClient.generateJSON<FitAndStrategyOutput>(
        systemPrompt,
        userPrompt,
        {
          model: 'gpt-4o', // GPT-4o con capacidades nativas maximizadas
          temperature: 0.3, // Más bajo para análisis estratégico preciso
          maxTokens: 8000, // Más tokens para análisis profundo
        }
      );

      // Enriquecer competitive landscape con investigación profunda si está disponible
      if (competitiveResearch) {
        if (competitiveResearch.clientCompetitors && competitiveResearch.clientCompetitors.length > 0) {
          result.competitiveLandscape.clientCompetitors = competitiveResearch.clientCompetitors.map((comp, idx) => ({
            id: `comp_client_${idx}`,
            name: comp.name,
            type: 'client_competitor' as const,
            description: comp.description,
            strengths: comp.strengths || [],
            weaknesses: comp.weaknesses || [],
          }));
        }

        if (competitiveResearch.vendorCompetitors && competitiveResearch.vendorCompetitors.length > 0) {
          result.competitiveLandscape.vendorCompetitors = competitiveResearch.vendorCompetitors.map((comp, idx) => ({
            id: `comp_vendor_${idx}`,
            name: comp.name,
            type: 'vendor_competitor' as const,
            description: comp.description,
            strengths: comp.differentiators || [],
            weaknesses: [],
          }));
        }

        if (competitiveResearch.alternatives && competitiveResearch.alternatives.length > 0) {
          result.competitiveLandscape.alternatives = competitiveResearch.alternatives.map((alt, idx) => ({
            id: `alt_${idx}`,
            name: alt.name,
            type: 'alternative_solution' as const,
            description: alt.description,
          }));
        }
      }

      console.log(`[FitAndStrategyAgent] ✓ Análisis estratégico completado`);
      return result;
    } catch (error) {
      console.error('[FitAndStrategyAgent] Error:', error);
      throw new Error(`Failed to generate fit and strategy: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

