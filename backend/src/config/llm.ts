// LLM configuration

export interface LLMConfig {
  openaiApiKey: string;
  defaultModel: string;
  temperature: number;
}

export const llmConfig: LLMConfig = {
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  defaultModel: process.env.LLM_MODEL || 'gpt-4o', // GPT-4o con capacidades nativas maximizadas
  temperature: parseFloat(process.env.LLM_TEMPERATURE || '0.3'), // Más bajo para investigación precisa
};

if (!llmConfig.openaiApiKey) {
  console.warn('⚠️  OPENAI_API_KEY not set. LLM features will not work.');
}

