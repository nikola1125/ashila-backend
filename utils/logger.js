// Lightweight structured logger. Emits JSON in production (easy to ingest by
// log platforms) and human-readable lines in development. Honors LOG_LEVEL.

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const currentLevel = LEVELS[process.env.LOG_LEVEL] ?? (process.env.NODE_ENV === 'production' ? LEVELS.info : LEVELS.debug);
const isProd = process.env.NODE_ENV === 'production';

const emit = (level, message, meta) => {
  if (LEVELS[level] > currentLevel) return;

  if (isProd) {
    const entry = { level, time: new Date().toISOString(), message };
    if (meta !== undefined) entry.meta = meta;
    const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
    fn(JSON.stringify(entry));
  } else {
    const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
    fn(`[${level.toUpperCase()}] ${message}`, meta !== undefined ? meta : '');
  }
};

module.exports = {
  error: (msg, meta) => emit('error', msg, meta),
  warn: (msg, meta) => emit('warn', msg, meta),
  info: (msg, meta) => emit('info', msg, meta),
  debug: (msg, meta) => emit('debug', msg, meta)
};
