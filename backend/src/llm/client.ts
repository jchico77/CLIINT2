import OpenAI from 'openai';
import { llmConfig } from '../config/llm';

export class LLMClient {
  private client: OpenAI | null = null;

  constructor() {
    if (llmConfig.openaiApiKey) {
      this.client = new OpenAI({
        apiKey: llmConfig.openaiApiKey,
      });
    }
  }

  async generate(
    systemPrompt: string,
    userPrompt: string,
    options?: {
      model?: string;
      temperature?: number;
      responseFormat?: { type: 'json_object' };
      maxTokens?: number;
    }
  ): Promise<string> {
    if (!this.client) {
      throw new Error('OpenAI client not initialized. Check OPENAI_API_KEY.');
    }

    const model = options?.model || llmConfig.defaultModel;
    const temperature = options?.temperature ?? llmConfig.temperature;

    try {
      const response = await this.client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature,
        response_format: options?.responseFormat,
        max_tokens: options?.maxTokens || 4000,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from LLM');
      }

      return content;
    } catch (error) {
      console.error('LLM generation error:', error);
      throw error;
    }
  }

  async generateJSON<T>(
    systemPrompt: string,
    userPrompt: string,
    options?: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<T> {
    const response = await this.generate(systemPrompt, userPrompt, {
      ...options,
      responseFormat: { type: 'json_object' },
    });

    try {
      // Clean response (remove markdown code blocks if present)
      let cleaned = response.trim();
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
      }

      return JSON.parse(cleaned) as T;
    } catch (error) {
      console.error('Failed to parse JSON response:', error);
      console.error('Response:', response);
      throw new Error('Invalid JSON response from LLM');
    }
  }
}

export const llmClient = new LLMClient();

