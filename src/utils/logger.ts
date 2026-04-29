const LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };

const MODE_TO_LEVEL: Record<string, number> = {
  production: LEVELS.INFO,
  warn: LEVELS.WARN,
  error: LEVELS.ERROR,
};

export interface Logger {
  debug(msg: string, data?: Record<string, unknown>): void;
  info(msg: string, data?: Record<string, unknown>): void;
  warn(msg: string, data?: Record<string, unknown>): void;
  error(msg: string, data?: Record<string, unknown>): void;
}

export function createLogger(mode?: string): Logger {
  const activeLevel =
    mode !== undefined && MODE_TO_LEVEL[mode] !== undefined
      ? MODE_TO_LEVEL[mode]
      : LEVELS.DEBUG;

  function formatMessage(
    level: string,
    msg: string,
    data?: Record<string, unknown>
  ): string {
    let out = `[HMC-VIZ][${level}] ${msg}`;
    if (data !== undefined) {
      const pairs = Object.entries(data)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ');
      out += ` — ${pairs}`;
    }
    return out;
  }

  return {
    debug(msg: string, data?: Record<string, unknown>): void {
      if (LEVELS.DEBUG < activeLevel) return;
      console.debug(formatMessage('DEBUG', msg, data));
    },
    info(msg: string, data?: Record<string, unknown>): void {
      if (LEVELS.INFO < activeLevel) return;
      console.info(formatMessage('INFO', msg, data));
    },
    warn(msg: string, data?: Record<string, unknown>): void {
      if (LEVELS.WARN < activeLevel) return;
      console.warn(formatMessage('WARN', msg, data));
    },
    error(msg: string, data?: Record<string, unknown>): void {
      if (LEVELS.ERROR < activeLevel) return;
      console.error(formatMessage('ERROR', msg, data));
    },
  };
}

type ViteImportMeta = ImportMeta & { env?: { MODE?: string } };
export const logger: Logger = createLogger(
  // import.meta.env is a Vite-specific augmentation not present in plain tsc's ImportMeta
  typeof import.meta !== 'undefined'
    ? (import.meta as ViteImportMeta).env?.MODE
    : undefined
);
