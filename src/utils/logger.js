const LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };

const MODE_TO_LEVEL = {
  production: LEVELS.INFO,
  warn: LEVELS.WARN,
  error: LEVELS.ERROR,
};

function createLogger(mode) {
  const activeLevel =
    MODE_TO_LEVEL[mode] !== undefined ? MODE_TO_LEVEL[mode] : LEVELS.DEBUG;

  function formatMessage(level, msg, data) {
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
    debug(msg, data) {
      if (LEVELS.DEBUG < activeLevel) return;
      console.debug(formatMessage('DEBUG', msg, data));
    },
    info(msg, data) {
      if (LEVELS.INFO < activeLevel) return;
      console.info(formatMessage('INFO', msg, data));
    },
    warn(msg, data) {
      if (LEVELS.WARN < activeLevel) return;
      console.warn(formatMessage('WARN', msg, data));
    },
    error(msg, data) {
      if (LEVELS.ERROR < activeLevel) return;
      console.error(formatMessage('ERROR', msg, data));
    },
  };
}

export { createLogger };
export const logger = createLogger(
  typeof import.meta !== 'undefined' ? import.meta.env?.MODE : undefined
);
