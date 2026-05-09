// src/utils/logger.js
const ts = () => new Date().toISOString();
const lvl = (process.env.LOG_LEVEL || 'info').toLowerCase();
const order = { debug: 0, info: 1, success: 1, warn: 2, error: 3 };
const minRank = order[lvl] ?? 1;

function log(level, prefix, msg) {
  if ((order[level] ?? 1) < minRank) return;
  console.log(`[${ts()}] ${prefix} ${msg}`);
}

module.exports = {
  debug:   (m) => log('debug',   '🔍', m),
  info:    (m) => log('info',    'ℹ️ ', m),
  success: (m) => log('success', '✅', m),
  warn:    (m) => log('warn',    '⚠️ ', m),
  error:   (m) => log('error',   '❌', m),
};
