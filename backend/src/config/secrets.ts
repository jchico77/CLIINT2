interface SecretsConfig {
  openaiApiKey: string;
}

const resolvedOpenAiKey = process.env.OPENAI_API_KEY || '';

export const secretsConfig: SecretsConfig = {
  openaiApiKey: resolvedOpenAiKey,
};

