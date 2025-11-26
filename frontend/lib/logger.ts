import pino from 'pino';

type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
type LogMetadata = Record<string, unknown>;

const level = process.env.NEXT_PUBLIC_LOG_LEVEL ?? 'info';

const baseLogger = pino({
  level,
  browser: {
    asObject: true,
  },
  timestamp: () => `,"time":"${new Date().toISOString()}"`,
});

const buildPayload = (metadata?: LogMetadata) => ({
  ...(metadata ?? {}),
});

const log = (logLevel: LogLevel, message: string, metadata?: LogMetadata) => {
  const payload = buildPayload(metadata);
  switch (logLevel) {
    case 'trace':
      baseLogger.trace(payload, message);
      break;
    case 'debug':
      baseLogger.debug(payload, message);
      break;
    case 'info':
      baseLogger.info(payload, message);
      break;
    case 'warn':
      baseLogger.warn(payload, message);
      break;
    case 'error':
      baseLogger.error(payload, message);
      break;
    case 'fatal':
      baseLogger.fatal(payload, message);
      break;
    default:
      baseLogger.info(payload, message);
      break;
  }
};

export const logger = {
  trace: (message: string, metadata?: LogMetadata) => log('trace', message, metadata),
  debug: (message: string, metadata?: LogMetadata) => log('debug', message, metadata),
  info: (message: string, metadata?: LogMetadata) => log('info', message, metadata),
  warn: (message: string, metadata?: LogMetadata) => log('warn', message, metadata),
  error: (message: string, metadata?: LogMetadata) => log('error', message, metadata),
  fatal: (message: string, metadata?: LogMetadata) => log('fatal', message, metadata),
};


