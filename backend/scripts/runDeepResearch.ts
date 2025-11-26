import { runClientDeepResearch } from '../src/llm/deepResearchClient';
import { llmConfig } from '../src/config/llm';
import { ClientDeepResearchReport } from '../src/domain/models/clientDeepResearchReport';

type CliOptions = {
  clientName: string;
  clientWebsiteUrl?: string;
  country?: string;
  sectorHint?: string;
  serviceOfferingName: string;
  models: string[];
  reasoningEffort?: 'low' | 'medium' | 'high';
  timeoutMs?: number;
  quiet?: boolean;
};

const DEFAULT_INPUT = {
  clientName: 'Telefónica',
  clientWebsiteUrl: 'https://www.telefonica.com',
  country: 'Spain',
  sectorHint: 'Telecommunications',
  serviceOfferingName: 'Enterprise AI Transformation',
};

const parseArgs = (): CliOptions => {
  const args = process.argv.slice(2);
  const options: Record<string, string> = {};

  for (const arg of args) {
    if (!arg.startsWith('--')) continue;
    const [rawKey, rawValue] = arg.slice(2).split('=');
    if (!rawKey) continue;
    const key = rawKey.trim();
    const value = (rawValue ?? '').trim();
    options[key] = value;
  }

  const modelsValue = options.model || llmConfig.deepResearchModel;
  const models = modelsValue
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean);

  const reasoning = options.reasoning as 'low' | 'medium' | 'high' | undefined;
  const timeoutMs = options.timeoutMs ? Number(options.timeoutMs) : undefined;

  return {
    clientName: options.clientName || DEFAULT_INPUT.clientName,
    clientWebsiteUrl: options.clientWebsiteUrl || DEFAULT_INPUT.clientWebsiteUrl,
    country: options.country || DEFAULT_INPUT.country,
    sectorHint: options.sectorHint || DEFAULT_INPUT.sectorHint,
    serviceOfferingName:
      options.serviceOfferingName || DEFAULT_INPUT.serviceOfferingName,
    models: models.length > 0 ? models : [llmConfig.deepResearchModel],
    reasoningEffort: reasoning,
    timeoutMs: timeoutMs && Number.isFinite(timeoutMs) ? timeoutMs : undefined,
    quiet: options.quiet === '1' || options.quiet === 'true',
  };
};

async function runForModel(
  model: string,
  cli: CliOptions,
): Promise<ClientDeepResearchReport> {
  const start = Date.now();
  console.log(
    `[DeepResearchDemo] ▶ Ejecutando Deep Research con modelo "${model}"...`,
  );

  const report = await runClientDeepResearch(
    {
      clientName: cli.clientName,
      clientWebsiteUrl: cli.clientWebsiteUrl,
      country: cli.country,
      sectorHint: cli.sectorHint,
      serviceOfferingName: cli.serviceOfferingName,
    },
    {
      model,
      reasoningEffort: cli.reasoningEffort,
      timeoutMs: cli.timeoutMs,
    },
  );

  const durationMs = Date.now() - start;
  console.log(
    `[DeepResearchDemo] ✓ ${model} completado en ${(durationMs / 1000).toFixed(
      1,
    )}s`,
  );

  if (!cli.quiet) {
    console.dir(report, { depth: null });
  }

  return report;
}

async function main() {
  const cli = parseArgs();
  for (const model of cli.models) {
    await runForModel(model, cli);
  }
}

main().catch((error) => {
  console.error('Deep research demo failed:', error);
  process.exit(1);
});
