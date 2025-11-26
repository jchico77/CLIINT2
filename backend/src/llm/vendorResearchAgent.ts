import { llmClient } from './client';
import { Vendor } from '../domain/models/vendor';
import { ServiceOffering } from '../domain/models/serviceOffering';
import { EvidenceItem } from '../domain/models/clientIntelDashboard';

export interface VendorResearchOutput {
  serviceOfferings: Array<{
    name: string;
    description: string;
    categoryTags: string[];
  }>;
  differentiators: Array<{
    claim: string;
    evidence: string;
  }>;
  evidence: EvidenceItem[];
}

export class VendorResearchAgent {
  async research(vendor: Vendor, service: ServiceOffering): Promise<VendorResearchOutput> {
    const systemPrompt = `Eres un analista de negocio B2B experto. Tu objetivo es analizar un vendor (proveedor) y extraer:
1. Service Offerings: Servicios y soluciones que ofrece
2. Differentiators: Diferenciadores y claims respaldados
3. Evidence: Evidencias (casos de estudio, KPIs, testimonios, premios)

IMPORTANTE:
- Extrae información de la web corporativa del vendor
- Identifica claims respaldados por algo concreto (rankings, casos, métricas)
- Genera evidencias relevantes y específicas
- Responde SIEMPRE en formato JSON válido`;

    const userPrompt = `Analiza el siguiente vendor:

**Vendor:**
- Nombre: ${vendor.name}
- Website: ${vendor.websiteUrl}
- Descripción: ${vendor.description || 'No disponible'}

**Servicio Específico:**
- Nombre: ${service.name}
- Descripción: ${service.shortDescription}
- Categorías: ${service.categoryTags.join(', ')}

Genera un análisis completo con la siguiente estructura JSON:

{
  "serviceOfferings": [
    {
      "name": "string",
      "description": "string",
      "categoryTags": ["string"]
    }
  ],
  "differentiators": [
    {
      "claim": "string (ej: 'Líder en el mercado')",
      "evidence": "string (ej: 'Ranking Gartner 2024')"
    }
  ],
  "evidence": [
    {
      "id": "evidence_1",
      "type": "case_study" | "kpi" | "testimonial" | "award" | "certification",
      "title": "string",
      "description": "string",
      "snippet": "string (texto corto para usar en propuestas)",
      "source": "string o null",
      "relevance": 0-100
    }
  ]
}`;

    try {
      console.log(`[VendorResearchAgent] Analizando vendor: ${vendor.name}`);
      const result = await llmClient.generateJSON<VendorResearchOutput>(
        systemPrompt,
        userPrompt,
        {
          model: 'gpt-4o',
          temperature: 0.4,
          maxTokens: 3000,
        }
      );

      console.log(`[VendorResearchAgent] ✓ Análisis completado para ${vendor.name}`);
      return result;
    } catch (error) {
      console.error('[VendorResearchAgent] Error:', error);
      throw new Error(`Failed to research vendor: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

