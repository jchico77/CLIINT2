import OpenAI from 'openai';
import { logLLMCall } from './llmLogger';

/**
 * Helper function to log OpenAI API calls directly
 * Use this when making direct calls to OpenAI client (not through LLMClient)
 */
export async function logOpenAICall<T>(
  callFn: () => Promise<T>,
  options: {
    opportunityId?: string;
    phase?: string;
    model: string;
    systemPrompt: string;
    userPrompt: string;
    metadata?: Record<string, unknown>;
  },
): Promise<T> {
  const startTime = Date.now();
  
  try {
    const result = await callFn();
    const responseTimeMs = Date.now() - startTime;
    
    // Try to extract the response content from the result
    let responseContent = '';
    if (typeof result === 'string') {
      responseContent = result;
    } else if (result && typeof result === 'object') {
      // For structured outputs, try to extract the content
      if ('output_text' in result) {
        responseContent = Array.isArray(result.output_text)
          ? result.output_text.join('')
          : String(result.output_text);
      } else if ('choices' in result && Array.isArray(result.choices) && result.choices[0]) {
        // OpenAI ChatCompletion format
        const choice = result.choices[0];
        if ('message' in choice && choice.message && 'content' in choice.message) {
          responseContent = String(choice.message.content || '');
        }
      } else {
        // Fallback: stringify the whole result
        responseContent = JSON.stringify(result, null, 2);
      }
    }
    
    logLLMCall({
      opportunityId: options.opportunityId,
      phase: options.phase,
      model: options.model,
      systemPrompt: options.systemPrompt,
      userPrompt: options.userPrompt,
      options: {},
      response: responseContent,
      responseTimeMs,
      metadata: options.metadata,
    });
    
    return result;
  } catch (error) {
    const responseTimeMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    logLLMCall({
      opportunityId: options.opportunityId,
      phase: options.phase,
      model: options.model,
      systemPrompt: options.systemPrompt,
      userPrompt: options.userPrompt,
      options: {},
      response: `ERROR: ${errorMessage}`,
      responseTimeMs,
      metadata: {
        ...options.metadata,
        error: true,
        errorMessage,
      },
    });
    
    throw error;
  }
}

/**
 * Helper to extract prompts from OpenAI messages array
 */
export function extractPromptsFromMessages(
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
): { systemPrompt: string; userPrompt: string } {
  let systemPrompt = '';
  let userPrompt = '';
  
  for (const msg of messages) {
    if (msg.role === 'system' && 'content' in msg && typeof msg.content === 'string') {
      systemPrompt = msg.content;
    } else if (msg.role === 'user' && 'content' in msg) {
      if (typeof msg.content === 'string') {
        userPrompt = msg.content;
      } else if (Array.isArray(msg.content)) {
        // Handle content array (text, images, etc.)
        const textParts = msg.content
          .filter((part) => part.type === 'text' && 'text' in part)
          .map((part) => (part as { text: string }).text);
        userPrompt = textParts.join('\n');
      }
    }
  }
  
  return { systemPrompt, userPrompt };
}

