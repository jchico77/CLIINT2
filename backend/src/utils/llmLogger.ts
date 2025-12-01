import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from 'fs';
import { join } from 'path';
import { logger } from '../lib/logger';

const baseDir = join(process.cwd(), 'storage', 'llm-logs');

interface LLMCallLog {
  timestamp: string;
  opportunityId?: string;
  phase?: string;
  callIndex: number;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  options: {
    temperature?: number;
    maxTokens?: number;
    responseFormat?: { type: string };
    [key: string]: unknown;
  };
  response: string;
  responseTimeMs: number;
  metadata?: Record<string, unknown>;
}

interface PhaseResultLog {
  timestamp: string;
  opportunityId: string;
  phase: string;
  result: unknown;
  metadata?: Record<string, unknown>;
}

function ensureDir(path: string): void {
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true });
  }
}

function getOpportunityDir(opportunityId?: string): string {
  if (!opportunityId) {
    return join(baseDir, 'unknown');
  }
  const safeId = opportunityId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return join(baseDir, safeId);
}

function getPhaseDir(opportunityId?: string, phase?: string): string {
  const oppDir = getOpportunityDir(opportunityId);
  if (!phase) {
    return oppDir;
  }
  const safePhase = phase.replace(/[^a-zA-Z0-9_-]/g, '_');
  return join(oppDir, safePhase);
}

function getPhaseCallsFile(opportunityId?: string, phase?: string): string {
  const phaseDir = getPhaseDir(opportunityId, phase);
  return join(phaseDir, 'llm-calls.log');
}

function getPhaseResultFile(opportunityId?: string, phase?: string): string {
  const phaseDir = getPhaseDir(opportunityId, phase);
  return join(phaseDir, 'phase-result.json');
}

export function logLLMCall(log: Omit<LLMCallLog, 'timestamp' | 'callIndex'>): void {
  try {
    const phaseDir = getPhaseDir(log.opportunityId, log.phase);
    ensureDir(phaseDir);

    const callsFile = getPhaseCallsFile(log.opportunityId, log.phase);
    
    let callIndex = 1;
    if (existsSync(callsFile)) {
      const existingContent = readFileSync(callsFile, 'utf-8');
      const lines = existingContent.split('\n').filter((line) => line.trim());
      if (lines.length > 0) {
        try {
          const lastCall = JSON.parse(lines[lines.length - 1]) as LLMCallLog;
          callIndex = (lastCall.callIndex || 0) + 1;
        } catch {
          callIndex = lines.length + 1;
        }
      }
    }

    const fullLog: LLMCallLog = {
      timestamp: new Date().toISOString(),
      callIndex,
      ...log,
    };

    const logLine = JSON.stringify(fullLog) + '\n';
    appendFileSync(callsFile, logLine, 'utf-8');

    logger.debug(
      {
        opportunityId: log.opportunityId,
        phase: log.phase,
        callIndex,
        model: log.model,
        responseTimeMs: log.responseTimeMs,
      },
      'LLM call logged',
    );
  } catch (error) {
    logger.warn(
      {
        opportunityId: log.opportunityId,
        phase: log.phase,
        error: error instanceof Error ? error.message : String(error),
      },
      'Failed to log LLM call',
    );
  }
}

export function logPhaseResult(
  opportunityId: string,
  phase: string,
  result: unknown,
  metadata?: Record<string, unknown>,
): void {
  try {
    const phaseDir = getPhaseDir(opportunityId, phase);
    ensureDir(phaseDir);

    const resultFile = getPhaseResultFile(opportunityId, phase);

    const log: PhaseResultLog = {
      timestamp: new Date().toISOString(),
      opportunityId,
      phase,
      result,
      metadata,
    };

    writeFileSync(resultFile, JSON.stringify(log, null, 2), 'utf-8');

    logger.info(
      {
        opportunityId,
        phase,
      },
      'Phase result logged',
    );
  } catch (error) {
    logger.warn(
      {
        opportunityId,
        phase,
        error: error instanceof Error ? error.message : String(error),
      },
      'Failed to log phase result',
    );
  }
}

export function getAllLLMCallsForPhase(
  opportunityId?: string,
  phase?: string,
): LLMCallLog[] {
  try {
    const callsFile = getPhaseCallsFile(opportunityId, phase);
    if (!existsSync(callsFile)) {
      return [];
    }

    const content = readFileSync(callsFile, 'utf-8');
    return content
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => JSON.parse(line) as LLMCallLog);
  } catch (error) {
    logger.warn(
      {
        opportunityId,
        phase,
        error: error instanceof Error ? error.message : String(error),
      },
      'Failed to read LLM calls',
    );
    return [];
  }
}

export function getPhaseResult(
  opportunityId: string,
  phase: string,
): PhaseResultLog | null {
  try {
    const resultFile = getPhaseResultFile(opportunityId, phase);
    if (!existsSync(resultFile)) {
      return null;
    }

    const content = readFileSync(resultFile, 'utf-8');
    return JSON.parse(content) as PhaseResultLog;
  } catch (error) {
    logger.warn(
      {
        opportunityId,
        phase,
        error: error instanceof Error ? error.message : String(error),
      },
      'Failed to read phase result',
    );
    return null;
  }
}

