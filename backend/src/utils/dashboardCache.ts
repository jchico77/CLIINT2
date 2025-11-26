import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { logger } from '../lib/logger';

type CacheMode = 'off' | 'read' | 'write' | 'readwrite';

const baseDir = join(process.cwd(), '.cache', 'dashboard');
const mode = normalizeMode(process.env.DASHBOARD_CACHE_MODE);

function normalizeMode(raw?: string): CacheMode {
  switch ((raw || 'off').toLowerCase()) {
    case 'read':
      return 'read';
    case 'write':
      return 'write';
    case 'readwrite':
    case 'rw':
    case 'full':
      return 'readwrite';
    default:
      return 'off';
  }
}

function ensureDir(path: string): void {
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true });
  }
}

function getPhasePath(opportunityId: string, phase: string): string {
  const safeId = opportunityId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const safePhase = phase.replace(/[^a-zA-Z0-9_-]/g, '_');
  return join(baseDir, safeId, `${safePhase}.json`);
}

export function loadPhase<T>(opportunityId: string | undefined, phase: string): T | null {
  if (!opportunityId || (mode !== 'read' && mode !== 'readwrite')) {
    return null;
  }
  const filePath = getPhasePath(opportunityId, phase);
  if (!existsSync(filePath)) {
    return null;
  }
  try {
    const raw = readFileSync(filePath, 'utf-8');
    logger.info({ opportunityId, phase }, 'Dashboard cache hit');
    return JSON.parse(raw) as T;
  } catch (error) {
    logger.warn({ opportunityId, phase, error }, 'Failed to read dashboard cache');
    return null;
  }
}

export function savePhase<T>(opportunityId: string | undefined, phase: string, payload: T): void {
  if (!opportunityId || (mode !== 'write' && mode !== 'readwrite')) {
    return;
  }
  const filePath = getPhasePath(opportunityId, phase);
  ensureDir(dirname(filePath));
  try {
    writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf-8');
    logger.info({ opportunityId, phase }, 'Dashboard cache saved');
  } catch (error) {
    logger.warn({ opportunityId, phase, error }, 'Failed to write dashboard cache');
  }
}

export function getCacheMode(): CacheMode {
  return mode;
}

export function deletePhase(opportunityId: string | undefined, phase: string): void {
  if (!opportunityId) {
    return;
  }
  const filePath = getPhasePath(opportunityId, phase);
  if (!existsSync(filePath)) {
    return;
  }
  try {
    unlinkSync(filePath);
    logger.info({ opportunityId, phase }, 'Dashboard cache file deleted');
  } catch (error) {
    logger.warn({ opportunityId, phase, error }, 'Failed to delete dashboard cache file');
  }
}



