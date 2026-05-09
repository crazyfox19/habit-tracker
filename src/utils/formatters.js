// src/utils/formatters.js
const streakService = require('../services/streakService');

async function formatProgressMessage(telegramId, habits) {
  let out = '📊 YOUR HABIT PROGRESS\n\n━━━━━━━━━━━━━━━━━━━━━━\n\n';
  for (const h of habits) {
    const streak = await streakService.calculateStreak(telegramId, h.id);
    const rate = await streakService.getWeeklyCompletionRate(telegramId, h.id);
    const freq = h.frequency === 'daily' ? 'Daily' : `${h.frequency_target}x/week`;
    const emoji = streak >= 7 ? '🔥' : streak > 0 ? '✅' : '⚠️';
    const status = rate >= 80 ? 'On track!' : rate >= 50 ? 'Keep going' : 'Behind — catch up!';
    out += `${emoji} ${h.name} (${freq})\n`;
    out += `   • Streak: ${streak} day${streak !== 1 ? 's' : ''}\n`;
    out += `   • This week: ${rate}%\n`;
    out += `   • Status: ${status}\n\n`;
  }
  out += '━━━━━━━━━━━━━━━━━━━━━━';
  return out;
}

async function formatStatsMessage(telegramId, habits) {
  if (habits.length === 0) return '📈 No habits to summarize yet.';
  let totalStreak = 0;
  let totalRate = 0;
  for (const h of habits) {
    totalStreak += await streakService.calculateStreak(telegramId, h.id);
    totalRate += await streakService.getWeeklyCompletionRate(telegramId, h.id);
  }
  const avgRate = Math.round(totalRate / habits.length);
  return (
    '📈 OVERALL STATS\n\n' +
    `• Active habits: ${habits.length}\n` +
    `• Combined streak days: ${totalStreak}\n` +
    `• Average weekly completion: ${avgRate}%`
  );
}

module.exports = { formatProgressMessage, formatStatsMessage };
