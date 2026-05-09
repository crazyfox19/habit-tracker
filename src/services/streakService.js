// src/services/streakService.js
// Streak and progress calculation logic

const db = require('../config/database');
const logger = require('../utils/logger');

async function isHabitCompleteToday(telegramId, habitId) {
  try {
    const today = new Date().toISOString().split('T')[0];

    const result = await db.query(
      `SELECT hl.id FROM habit_logs hl
       JOIN users u ON hl.user_id = u.id
       WHERE u.telegram_id = $1 AND hl.habit_id = $2 AND hl.date = $3
       LIMIT 1`,
      [telegramId, habitId, today]
    );

    return result.rows.length > 0;

  } catch (err) {
    logger.error(`isHabitCompleteToday error: ${err.message}`);
    return false;
  }
}

async function calculateStreak(telegramId, habitId) {
  try {
    const result = await db.query(
      `SELECT hl.date::text FROM habit_logs hl
       JOIN users u ON hl.user_id = u.id
       WHERE u.telegram_id = $1 AND hl.habit_id = $2
       ORDER BY hl.date DESC`,
      [telegramId, habitId]
    );

    const logDates = result.rows.map(r => r.date);

    if (logDates.length === 0) return 0;

    let streak = 0;
    // Use UTC consistently so streak math aligns with Postgres CURRENT_DATE
    // (database stores DATE values written by markHabitComplete using toISOString)
    const checkDate = new Date();
    checkDate.setUTCHours(0, 0, 0, 0);

    while (true) {
      const dateStr = checkDate.toISOString().split('T')[0];
      const found = logDates.includes(dateStr);

      if (found) {
        streak++;
        checkDate.setUTCDate(checkDate.getUTCDate() - 1);
      } else {
        break;
      }
    }

    return streak;

  } catch (err) {
    logger.error(`calculateStreak error: ${err.message}`);
    return 0;
  }
}

async function getWeeklyCompletionRate(telegramId, habitId) {
  try {
    const habitResult = await db.query(
      'SELECT frequency_target FROM habits WHERE id = $1',
      [habitId]
    );
    if (habitResult.rows.length === 0) return 0;
    const frequencyTarget = habitResult.rows[0].frequency_target;

    // Use UTC for week boundary so it aligns with stored DATE values
    const today = new Date();
    const dayOfWeek = today.getUTCDay();
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setUTCDate(today.getUTCDate() + daysToMonday);
    monday.setUTCHours(0, 0, 0, 0);

    const mondayStr = monday.toISOString().split('T')[0];
    const todayStr = today.toISOString().split('T')[0];

    const result = await db.query(
      `SELECT COUNT(*) FROM habit_logs hl
       JOIN users u ON hl.user_id = u.id
       WHERE u.telegram_id = $1 AND hl.habit_id = $2
       AND hl.date >= $3 AND hl.date <= $4`,
      [telegramId, habitId, mondayStr, todayStr]
    );

    const completions = parseInt(result.rows[0].count);
    const rate = Math.round((completions / frequencyTarget) * 100);

    return Math.min(rate, 100);

  } catch (err) {
    logger.error(`getWeeklyCompletionRate error: ${err.message}`);
    return 0;
  }
}

module.exports = {
  isHabitCompleteToday,
  calculateStreak,
  getWeeklyCompletionRate,
};
