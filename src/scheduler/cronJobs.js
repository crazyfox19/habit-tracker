// src/scheduler/cronJobs.js
// Scheduled task definitions

const cron = require('node-cron');
const db = require('../config/database');
const logger = require('../utils/logger');
const { buildQuickDoneKeyboard } = require('../utils/formatters');

let botRef = null;

function setBotReference(bot) {
  botRef = bot;
}

async function sendReminder(userId) {
  try {
    const userResult = await db.query(
      'SELECT telegram_id, first_name FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) return;

    const { telegram_id: telegramId, first_name: firstName } = userResult.rows[0];

    const habitsResult = await db.query(
      'SELECT id, name, frequency, frequency_target FROM habits WHERE user_id = $1 AND active = true',
      [userId]
    );

    const habits = habitsResult.rows;

    if (habits.length === 0) {
      await botRef.telegram.sendMessage(
        telegramId,
        '📌 Good morning! You haven\'t added any habits yet.\n\nClick /add_habit to get started!'
      );
      return;
    }

    const name = firstName || 'there';
    let message = `📌 Good morning, ${name}!\n\nYour habits for today:\n━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    for (const habit of habits) {
      const lastLog = await db.query(
        'SELECT date FROM habit_logs WHERE habit_id = $1 ORDER BY date DESC LIMIT 1',
        [habit.id]
      );

      const freq = habit.frequency === 'daily' ? 'Daily' : `${habit.frequency_target}x/week`;
      let lastText = 'Never completed';

      if (lastLog.rows.length > 0) {
        const lastDate = new Date(lastLog.rows[0].date);
        const today = new Date();
        const msPerDay = 1000 * 60 * 60 * 24;
        const daysAgo = Math.round((today - lastDate) / msPerDay);

        if (daysAgo === 0) lastText = 'Done today ✅';
        else if (daysAgo === 1) lastText = 'Yesterday';
        else lastText = `${daysAgo} days ago`;
      }

      message += `• ${habit.name} (${freq})\n  Last: ${lastText}\n\n`;
    }

    message += '━━━━━━━━━━━━━━━━━━━━━━\nTap a habit below to mark it complete!';

    const quickDoneRows = await buildQuickDoneKeyboard(telegramId, habits);

    await botRef.telegram.sendMessage(telegramId, message, {
      reply_markup: {
        inline_keyboard: [
          ...quickDoneRows,
          [{ text: '📊 View Progress', callback_data: 'cmd_progress' }],
        ],
      },
    });

    await db.query(
      'UPDATE users SET last_reminder_sent = NOW() WHERE id = $1',
      [userId]
    );

    logger.info(`✅ Reminder sent to user ${telegramId}`);

  } catch (err) {
    logger.error(`sendReminder error for user ${userId}: ${err.message}`);
  }
}

async function checkAndSendReminders() {
  try {
    const utcNow = new Date();

    const result = await db.query(
      `SELECT id, timezone, reminder_time::text
       FROM users WHERE reminders_enabled = true`
    );

    for (const user of result.rows) {
      try {
        const userNow = new Date(
          utcNow.toLocaleString('en-US', { timeZone: user.timezone || 'UTC' })
        );

        const userHH = String(userNow.getHours()).padStart(2, '0');
        const userMM = String(userNow.getMinutes()).padStart(2, '0');
        const userTime = `${userHH}:${userMM}`;

        const reminderTime = user.reminder_time.substring(0, 5);

        if (userTime === reminderTime) {
          // Skip if we already fired in the current minute (idempotency)
          const lastSent = await db.query(
            'SELECT last_reminder_sent FROM users WHERE id = $1',
            [user.id]
          );
          const lastTs = lastSent.rows[0].last_reminder_sent;
          if (lastTs) {
            const secondsAgo = (Date.now() - new Date(lastTs).getTime()) / 1000;
            if (secondsAgo < 90) continue;
          }

          logger.info(`⏰ Reminder time for user ${user.id}: ${userTime} matches ${reminderTime}`);
          await sendReminder(user.id);
        }

      } catch (userErr) {
        logger.error(`Error processing user ${user.id}: ${userErr.message}`);
      }
    }

  } catch (err) {
    logger.error(`checkAndSendReminders error: ${err.message}`);
  }
}

function startScheduler(bot) {
  setBotReference(bot);

  logger.info('📅 Starting scheduler...');

  cron.schedule('* * * * *', async () => {
    try {
      logger.debug('🕐 Checking reminders...');
      await checkAndSendReminders();
    } catch (err) {
      logger.error(`Scheduler tick failed (will retry next minute): ${err.message}`);
    }
  }, {
    timezone: 'UTC',
  });

  logger.success('✅ Scheduler started (checks every minute)');
}

module.exports = { startScheduler, sendReminder };
