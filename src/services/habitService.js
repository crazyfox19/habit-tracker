// src/services/habitService.js
// Habit CRUD operations

const db = require('../config/database');
const logger = require('../utils/logger');

async function createHabit({ userId, name, frequency, frequencyTarget }) {
  const result = await db.query(
    `INSERT INTO habits (user_id, name, frequency, frequency_target, active, created_at)
     VALUES ($1, $2, $3, $4, true, NOW())
     RETURNING *`,
    [userId, name, frequency, frequencyTarget]
  );
  logger.info(`Habit created: ${name} for user ${userId}`);
  return result.rows[0];
}

async function getActiveHabits(telegramId) {
  const result = await db.query(
    `SELECT h.* FROM habits h
     JOIN users u ON h.user_id = u.id
     WHERE u.telegram_id = $1 AND h.active = true
     ORDER BY h.created_at ASC`,
    [telegramId]
  );
  return result.rows;
}

async function findHabitByName(telegramId, habitName) {
  const result = await db.query(
    `SELECT h.* FROM habits h
     JOIN users u ON h.user_id = u.id
     WHERE u.telegram_id = $1 AND h.name = $2 AND h.active = true`,
    [telegramId, habitName]
  );
  return result.rows[0] || null;
}

async function getHabitById(habitId) {
  const result = await db.query('SELECT * FROM habits WHERE id = $1', [habitId]);
  return result.rows[0] || null;
}

async function markHabitComplete(telegramId, habitId) {
  const today = new Date().toISOString().split('T')[0];
  const userResult = await db.query('SELECT id FROM users WHERE telegram_id = $1', [telegramId]);
  const userId = userResult.rows[0].id;

  await db.query(
    `INSERT INTO habit_logs (user_id, habit_id, date, completed_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (user_id, habit_id, date) DO NOTHING`,
    [userId, habitId, today]
  );
}

async function deactivateHabit(telegramId, habitId) {
  await db.query(
    `UPDATE habits SET active = false, updated_at = NOW()
     WHERE id = $1 AND user_id = (SELECT id FROM users WHERE telegram_id = $2)`,
    [habitId, telegramId]
  );
}

module.exports = {
  createHabit,
  getActiveHabits,
  findHabitByName,
  getHabitById,
  markHabitComplete,
  deactivateHabit,
};
