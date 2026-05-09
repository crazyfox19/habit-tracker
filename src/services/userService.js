// src/services/userService.js
// User management operations

const db = require('../config/database');
const logger = require('../utils/logger');

async function findOrCreateUser(telegramUser) {
  const { id: telegramId, username, first_name, last_name } = telegramUser;

  try {
    const existingUser = await db.query(
      'SELECT * FROM users WHERE telegram_id = $1',
      [telegramId]
    );

    if (existingUser.rows.length > 0) {
      return { ...existingUser.rows[0], is_new: false };
    }

    const newUser = await db.query(
      `INSERT INTO users
         (telegram_id, username, first_name, last_name, onboarding_completed, created_at)
       VALUES ($1, $2, $3, $4, false, NOW())
       RETURNING *`,
      [telegramId, username, first_name, last_name]
    );

    logger.info(`✅ New user created: ${telegramId}`);
    return { ...newUser.rows[0], is_new: true };

  } catch (err) {
    logger.error(`findOrCreateUser error: ${err.message}`);
    throw err;
  }
}

async function updateOnboardingStep(telegramId, step) {
  try {
    await db.query(
      `UPDATE users SET
         onboarding_step = $1,
         onboarding_started_at = COALESCE(onboarding_started_at, NOW()),
         updated_at = NOW()
       WHERE telegram_id = $2`,
      [step, telegramId]
    );
  } catch (err) {
    logger.error(`updateOnboardingStep error: ${err.message}`);
  }
}

async function completeOnboarding(telegramId) {
  try {
    await db.query(
      `UPDATE users SET
         onboarding_completed = true,
         onboarding_completed_at = NOW(),
         updated_at = NOW()
       WHERE telegram_id = $1`,
      [telegramId]
    );
    logger.info(`Onboarding completed for: ${telegramId}`);
  } catch (err) {
    logger.error(`completeOnboarding error: ${err.message}`);
  }
}

async function updateReminderTime(telegramId, timeStr) {
  try {
    await db.query(
      'UPDATE users SET reminder_time = $1, updated_at = NOW() WHERE telegram_id = $2',
      [timeStr, telegramId]
    );
  } catch (err) {
    logger.error(`updateReminderTime error: ${err.message}`);
    throw err;
  }
}

module.exports = {
  findOrCreateUser,
  updateOnboardingStep,
  completeOnboarding,
  updateReminderTime,
};
