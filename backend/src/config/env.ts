import { z } from 'zod';
import { config } from 'dotenv';
import path from 'path';

config({
  path: path.resolve(__dirname, '../../.env'),
});

const envSchema = z.object({
  PORT: z.string().default('3001'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  OPENAI_API_KEY: z.string().optional(),
  LLM_MODEL: z.string().default('gpt-4o'),
  LLM_TEMPERATURE: z.string().default('0.4'),
  DEEP_RESEARCH_MODEL: z.string().default('o3-deep-research-2025-06-26'),
  ADMIN_API_TOKEN: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

let env: Env;

try {
  env = envSchema.parse(process.env);
} catch (error) {
  console.error('Invalid environment variables:', error);
  process.exit(1);
}

export { env };

