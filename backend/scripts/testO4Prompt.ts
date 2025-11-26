import OpenAI from 'openai';
import { llmConfig } from '../src/config/llm';
import { logger } from '../src/lib/logger';

const TEST_MODEL = 'o4-mini-deep-research-2025-06-26';
const HEARTBEAT_INTERVAL_MS = 30_000;

const TEST_INPUT = {
  clientName: 'Telefónica',
  clientWebsiteUrl: 'https://www.telefonica.com',
  country: 'Spain',
  sectorHint: 'Telecommunications',
  serviceOfferingName: 'Enterprise AI Transformation',
};

const buildPrompt = (): string =>
  [
    `You are an enterprise Deep Research assistant. Analyze the client "${TEST_INPUT.clientName}" and produce a JSON report.`,
    '',
    'Context:',
    `- Website: ${TEST_INPUT.clientWebsiteUrl ?? 'Unknown'}`,
    `- Country: ${TEST_INPUT.country ?? 'Unknown'}`,
    `- Sector hint: ${TEST_INPUT.sectorHint ?? 'Unknown'}`,
    `- Service offering we want to pitch: ${TEST_INPUT.serviceOfferingName}`,
    '',
    'Return concise, evidence-based insights.',
  ].join('\n');

async function main() {
  if (!llmConfig.openaiApiKey) {
    logger.error(
      { envVar: 'OPENAI_API_KEY' },
      'No se ha encontrado la API key de OpenAI en el entorno',
    );
    process.exit(1);
  }

  const client = new OpenAI({ apiKey: llmConfig.openaiApiKey });
  const start = Date.now();

  const prompt = buildPrompt();

  logger.info(
    {
      model: TEST_MODEL,
      prompt,
      clientName: TEST_INPUT.clientName,
      serviceOfferingName: TEST_INPUT.serviceOfferingName,
    },
    'Enviando prompt de la aplicación contra el modelo O4',
  );

  const heartbeat = setInterval(() => {
    logger.info(
      { model: TEST_MODEL, elapsedMs: Date.now() - start },
      'El prompt de prueba con O4 sigue en espera',
    );
  }, HEARTBEAT_INTERVAL_MS);

  try {
    const response = await client.responses.create({
      model: TEST_MODEL,
      tools: [{ type: 'web_search_preview' }],
      input: [
        {
          role: 'user',
          content: [{ type: 'input_text', text: prompt }],
        },
      ],
    });

    logger.info(
      { model: TEST_MODEL, rawResponse: response },
      'Respuesta cruda recibida desde O4',
    );

    logger.info(
      { model: TEST_MODEL, durationMs: Date.now() - start },
      'Petición de prueba contra O4 completada',
    );
  } finally {
    clearInterval(heartbeat);
  }
}

main().catch((error) => {
  logger.error(
    { model: TEST_MODEL, error },
    'El test rápido contra O4 ha fallado',
  );
  process.exit(1);
});


