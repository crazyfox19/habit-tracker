// src/utils/formatters.js
const { Markup } = require('telegraf');
const streakService = require('../services/streakService');

const WELCOME_MESSAGE =
`👋 *Welcome to HabitBuddy!*

I'm your personal habit-tracking companion. I help you build daily habits, track streaks, and stay consistent with gentle reminders.

Here's what I can do:

📌 *Create habits* — track anything from "drink water" to "read 10 pages"
✅ *Mark daily progress* — one tap to log a completed habit
🔥 *Build streaks* — see how many days in a row you've stayed consistent
📊 *Weekly stats* — view your completion rate and progress
⏰ *Daily reminders* — get a nudge at your chosen time

Let's get you set up — I'll walk you through your first habit next.`;

function buildMainMenu() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('➕ Add Habit',  'add_habit'),
      Markup.button.callback('📋 My Habits',  'habits'),
    ],
    [
      Markup.button.callback('✅ Mark Done',  'done'),
      Markup.button.callback('📊 Progress',   'progress'),
    ],
    [
      Markup.button.callback('⏰ Reminder',   'reminder_time'),
      Markup.button.callback('❓ Help',       'help'),
    ],
  ]);
}

async function buildQuickDoneKeyboard(telegramId, habits) {
  const rows = [];
  for (const h of habits) {
    const done = await streakService.isHabitCompleteToday(telegramId, h.id);
    if (!done) {
      rows.push([{ text: `✅ ${h.name}`, callback_data: `quickdone_${h.id}` }]);
    }
  }
  return rows;
}

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

module.exports = { formatProgressMessage, formatStatsMessage, WELCOME_MESSAGE, buildMainMenu, buildQuickDoneKeyboard };
