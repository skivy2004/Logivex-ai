/**
 * Lightweight structured logger. Never logs secrets (API keys, tokens).
 */

const PREFIX = '[Logivex]';

function safeString(value) {
  if (value == null) return '';
  const s = String(value);
  if (/\b(?:key|token|secret|password|auth)\s*[:=]/i.test(s)) return '[REDACTED]';
  return s;
}

function log(level, message, meta = {}) {
  const timestamp = new Date().toISOString();
  const metaStr = Object.keys(meta).length
    ? ' ' + JSON.stringify(Object.fromEntries(
        Object.entries(meta).map(([k, v]) => [k, safeString(v)])
      ))
    : '';
  const line = `${timestamp} ${PREFIX} ${level} ${message}${metaStr}`;
  if (level === 'ERROR') console.error(line);
  else if (level === 'WARN') console.warn(line);
  else console.log(line);
}

module.exports = {
  info(message, meta) {
    log('INFO', message, meta);
  },
  warn(message, meta) {
    log('WARN', message, meta);
  },
  error(message, meta) {
    log('ERROR', message, meta);
  }
};
