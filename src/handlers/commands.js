// src/handlers/commands.js
// Full command handling system

const { Composer } = require('telegraf');
const logger = require('../utils/logger');
const userService = require('../services/userService');
const habitService = require('../services/habitService');
const streakService = require('../services/streakService');
const { showMainMenu } = require('../scenes/onboardingScene');
const { formatProgressMessage, formatStatsMessage, WELCOME_MESSAGE, buildMainMenu, buildQuickDoneKeyboard } = require('../utils/formatters');

const commands = new Composer();

// ════════════════════════════════════════════════════════════
// /START - Entry point and user detection
// ════════════════════════════════════════════════════════════

commands.command('start', async (ctx) => {
  try {
    const telegramId = ctx.from.id;
    logger.info(`User ${telegramId} sent /start`);

    const user = await userService.findOrCreateUser(ctx.from);

    if (user.is_new) {
      logger.info(`First-time user: ${telegramId}`);
      await ctx.reply(WELCOME_MESSAGE, { parse_mode: 'Markdown' });
      await ctx.scene.enter('onboarding_welcome');
    } else if (!user.onboarding_completed) {
      logger.info(`Resuming onboarding for user: ${telegramId}`);
      await ctx.scene.enter('onboarding_welcome');
    } else {
      logger.info(`Returning user: ${telegramId}`);
      const firstName = ctx.from.first_name || 'there';
      await ctx.reply(
        `Welcome back, ${firstName} 👋\nWhat would you like to do?`,
        buildMainMenu()
      );
    }

  } catch (err) {
    logger.error(`/start error: ${err.message}`);
    await ctx.reply('❌ Error starting bot. Please try again.');
  }
});

// ════════════════════════════════════════════════════════════
// /ADD_HABIT
// ════════════════════════════════════════════════════════════

commands.command('add_habit', async (ctx) => {
  try {
    logger.info(`User ${ctx.from.id} triggered /add_habit`);
    await ctx.scene.enter('add_habit');
  } catch (err) {
    logger.error(`/add_habit error: ${err.message}`);
    await ctx.reply('❌ Error. Try again.');
  }
});

// ════════════════════════════════════════════════════════════
// /HABITS - Helper
// ════════════════════════════════════════════════════════════

async function listHabits(ctx) {
  const telegramId = ctx.from.id;
  const habits = await habitService.getActiveHabits(telegramId);

  if (habits.length === 0) {
    await ctx.reply(
      '📋 No habits tracked yet.\n\nStart by clicking ➕ Add Habit!',
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '➕ Add Your First Habit', callback_data: 'cmd_add_habit' }],
          ],
        },
      }
    );
    return;
  }

  let message = '📋 YOUR ACTIVE HABITS\n\n━━━━━━━━━━━━━━━━━━━━━━\n\n';
  habits.forEach((habit, index) => {
    const freq = habit.frequency === 'daily' ? 'Daily' : `${habit.frequency_target}x/week`;
    message += `${index + 1}. ${habit.name} (${freq})\n`;
  });
  message += `\n━━━━━━━━━━━━━━━━━━━━━━\nTotal: ${habits.length} habit(s)`;

  const quickDoneRows = await buildQuickDoneKeyboard(telegramId, habits);

  await ctx.reply(message, {
    reply_markup: {
      inline_keyboard: [
        ...quickDoneRows,
        [{ text: '📊 View Progress', callback_data: 'cmd_progress' }],
        [{ text: '➕ Add New Habit', callback_data: 'cmd_add_habit' }],
      ],
    },
  });
}

commands.command('habits', async (ctx) => {
  try {
    logger.info(`User ${ctx.from.id} requesting habit list`);
    await listHabits(ctx);
  } catch (err) {
    logger.error(`/habits error: ${err.message}`);
    await ctx.reply('❌ Error loading habits.');
  }
});

// ════════════════════════════════════════════════════════════
// /DONE - Mark habit complete
// ════════════════════════════════════════════════════════════

commands.command('done', async (ctx) => {
  try {
    const telegramId = ctx.from.id;
    const args = ctx.message.text.split(' ').slice(1);
    const habitName = args.join(' ').toLowerCase().trim();

    if (habitName) {
      logger.info(`User ${telegramId} marking done: ${habitName}`);

      const habit = await habitService.findHabitByName(telegramId, habitName);
      if (!habit) {
        await ctx.reply(
          `❌ Habit "${habitName}" not found.\n\nUse /habits to see your habits.`
        );
        return;
      }

      const alreadyDone = await streakService.isHabitCompleteToday(telegramId, habit.id);
      if (alreadyDone) {
        await ctx.reply(`✅ ${habit.name} already marked complete today! Keep it up! 💪`);
        return;
      }

      await habitService.markHabitComplete(telegramId, habit.id);
      const streak = await streakService.calculateStreak(telegramId, habit.id);
      const weeklyRate = await streakService.getWeeklyCompletionRate(telegramId, habit.id);

      const streakEmoji = streak >= 30 ? '🔥🔥🔥' : streak >= 7 ? '🔥' : '✅';
      await ctx.reply(
        `${streakEmoji} ${habit.name} marked complete!\n\n` +
        `📊 Streak: ${streak} day${streak !== 1 ? 's' : ''}\n` +
        `📅 This week: ${weeklyRate}%`
      );

    } else {
      await ctx.scene.enter('mark_done');
    }

  } catch (err) {
    logger.error(`/done error: ${err.message}`);
    await ctx.reply('❌ Error marking habit. Try again.');
  }
});

// ════════════════════════════════════════════════════════════
// /PROGRESS
// ════════════════════════════════════════════════════════════

async function sendProgress(ctx) {
  const telegramId = ctx.from.id;
  const habits = await habitService.getActiveHabits(telegramId);

  if (habits.length === 0) {
    await ctx.reply('No habits tracked yet. Add your first habit! /add_habit');
    return;
  }

  const progressMessage = await formatProgressMessage(telegramId, habits);
  const quickDoneRows = await buildQuickDoneKeyboard(telegramId, habits);
  await ctx.reply(progressMessage, {
    reply_markup: {
      inline_keyboard: [
        ...quickDoneRows,
        [{ text: '📈 Full Stats', callback_data: 'cmd_stats' }],
      ],
    },
  });
}

commands.command('progress', async (ctx) => {
  try {
    logger.info(`User ${ctx.from.id} requesting progress`);
    await sendProgress(ctx);
  } catch (err) {
    logger.error(`/progress error: ${err.message}`);
    await ctx.reply('❌ Error loading progress.');
  }
});

// ════════════════════════════════════════════════════════════
// /DELETE_HABIT
// ════════════════════════════════════════════════════════════

commands.command('delete_habit', async (ctx) => {
  try {
    const telegramId = ctx.from.id;
    const args = ctx.message.text.split(' ').slice(1);
    const habitName = args.join(' ').toLowerCase().trim();

    if (!habitName) {
      await ctx.reply('Usage: /delete_habit [habit name]\nExample: /delete_habit exercise');
      return;
    }

    const habit = await habitService.findHabitByName(telegramId, habitName);
    if (!habit) {
      await ctx.reply(`❌ Habit "${habitName}" not found.`);
      return;
    }

    await ctx.reply(
      `⚠️ Delete "${habit.name}"?\n\nThis will stop tracking this habit (history preserved).`,
      {
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🗑️ Yes, Delete', callback_data: `confirm_delete_${habit.id}` },
              { text: '❌ Cancel', callback_data: 'cancel_delete' }
            ],
          ],
        },
      }
    );

  } catch (err) {
    logger.error(`/delete_habit error: ${err.message}`);
    await ctx.reply('❌ Error. Try again.');
  }
});

commands.action(/confirm_delete_(\d+)/, async (ctx) => {
  try {
    const habitId = parseInt(ctx.match[1]);
    await habitService.deactivateHabit(ctx.from.id, habitId);
    await ctx.deleteMessage();
    await ctx.reply('✅ Habit removed from tracking.\n(History preserved for your records)');
    ctx.answerCbQuery('Habit deleted');
  } catch (err) {
    logger.error(`Delete confirmation error: ${err.message}`);
  }
});

commands.action('cancel_delete', async (ctx) => {
  await ctx.deleteMessage();
  await ctx.reply('✅ Deletion cancelled. Habit still active.');
  ctx.answerCbQuery('Cancelled');
});

// ════════════════════════════════════════════════════════════
// /REMINDER_TIME
// ════════════════════════════════════════════════════════════

commands.command('reminder_time', async (ctx) => {
  try {
    const telegramId = ctx.from.id;
    const args = ctx.message.text.split(' ');
    const timeStr = args[1];

    if (!timeStr || !/^\d{2}:\d{2}$/.test(timeStr)) {
      await ctx.reply(
        '⏰ Set Reminder Time\n\nFormat: /reminder_time HH:MM\nExample: /reminder_time 08:00\n\nUse 24-hour format (08:00 = 8 AM, 20:00 = 8 PM)'
      );
      return;
    }

    await userService.updateReminderTime(telegramId, timeStr);
    await ctx.reply(`✅ Reminder time set to ${timeStr} UTC\n\nYou'll get a daily reminder at this time listing your habits.`);

  } catch (err) {
    logger.error(`/reminder_time error: ${err.message}`);
    await ctx.reply('❌ Error setting reminder time.');
  }
});

// ════════════════════════════════════════════════════════════
// /HELP
// ════════════════════════════════════════════════════════════

commands.command('help', async (ctx) => {
  await ctx.reply(
`HabitBuddy Commands:

/start - Welcome / main menu
/add_habit - Add a new habit
/habits - List active habits
/done [name] - Mark a habit complete (or pick from list)
/progress - View streaks and weekly %
/delete_habit [name] - Remove a habit
/reminder_time HH:MM - Set daily reminder time (UTC)
/help - This message`
  );
});

// ════════════════════════════════════════════════════════════
// MAIN MENU REPLY-KEYBOARD BUTTONS
// ════════════════════════════════════════════════════════════

commands.hears('➕ Add Habit', (ctx) => ctx.scene.enter('add_habit'));
commands.hears('📋 My Habits', listHabits);
commands.hears('✅ Mark Done', (ctx) => ctx.scene.enter('mark_done'));
commands.hears('📊 Progress', sendProgress);
commands.hears('📈 Stats', async (ctx) => {
  const habits = await habitService.getActiveHabits(ctx.from.id);
  const stats = await formatStatsMessage(ctx.from.id, habits);
  await ctx.reply(stats);
});
commands.hears('⚙️ Settings', async (ctx) => {
  await ctx.reply('⚙️ SETTINGS\n\nAvailable settings:\n/reminder_time [HH:MM] - Set reminder time (UTC)\n/delete_habit [name] - Remove a habit');
});

// ════════════════════════════════════════════════════════════
// MAIN MENU INLINE BUTTON CALLBACKS (returning users)
// Each callback_data matches a slash command name (without slash).
// ════════════════════════════════════════════════════════════

commands.action('add_habit', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.scene.enter('add_habit');
});

commands.action('habits', async (ctx) => {
  await ctx.answerCbQuery();
  await listHabits(ctx);
});

commands.action('done', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.scene.enter('mark_done');
});

commands.action('progress', async (ctx) => {
  await ctx.answerCbQuery();
  await sendProgress(ctx);
});

commands.action('reminder_time', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply(
    '⏰ Set Reminder Time\n\nFormat: /reminder_time HH:MM\nExample: /reminder_time 08:00\n\nUse 24-hour format (08:00 = 8 AM, 20:00 = 8 PM)'
  );
});

commands.action('help', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply(
`HabitBuddy Commands:

/start - Welcome / main menu
/add_habit - Add a new habit
/habits - List active habits
/done [name] - Mark a habit complete (or pick from list)
/progress - View streaks and weekly %
/delete_habit [name] - Remove a habit
/reminder_time HH:MM - Set daily reminder time (UTC)
/help - This message`
  );
});

// ════════════════════════════════════════════════════════════
// QUICK-DONE - one-tap completion from /habits, /progress, and reminders
// ════════════════════════════════════════════════════════════

commands.action(/quickdone_(\d+)/, async (ctx) => {
  try {
    const habitId = parseInt(ctx.match[1]);
    const telegramId = ctx.from.id;

    const alreadyDone = await streakService.isHabitCompleteToday(telegramId, habitId);
    if (alreadyDone) {
      ctx.answerCbQuery('Already marked complete today! 😊');
      return;
    }

    await habitService.markHabitComplete(telegramId, habitId);
    const habit = await habitService.getHabitById(habitId);
    const streak = await streakService.calculateStreak(telegramId, habitId);
    const weeklyRate = await streakService.getWeeklyCompletionRate(telegramId, habitId);
    const streakEmoji = streak >= 30 ? '🔥🔥🔥' : streak >= 7 ? '🔥' : '✅';

    ctx.answerCbQuery(`${habit.name} marked complete!`);
    await ctx.reply(
      `${streakEmoji} ${habit.name} marked complete!\n\n` +
      `📊 Streak: ${streak} day${streak !== 1 ? 's' : ''}\n` +
      `📅 This week: ${weeklyRate}%`
    );
  } catch (err) {
    logger.error(`quickdone error: ${err.message}`);
    ctx.answerCbQuery('❌ Error marking habit.').catch(() => {});
  }
});

// ════════════════════════════════════════════════════════════
// INLINE BUTTON CALLBACKS
// ════════════════════════════════════════════════════════════

commands.action('cmd_add_habit', async (ctx) => {
  try { await ctx.deleteMessage(); } catch (_) {}
  await ctx.scene.enter('add_habit');
  ctx.answerCbQuery();
});

commands.action('cmd_mark_done', async (ctx) => {
  try { await ctx.deleteMessage(); } catch (_) {}
  await ctx.scene.enter('mark_done');
  ctx.answerCbQuery();
});

commands.action('cmd_progress', async (ctx) => {
  try { await ctx.deleteMessage(); } catch (_) {}
  await sendProgress(ctx);
  ctx.answerCbQuery();
});

commands.action('cmd_stats', async (ctx) => {
  try { await ctx.deleteMessage(); } catch (_) {}
  const habits = await habitService.getActiveHabits(ctx.from.id);
  const msg = await formatStatsMessage(ctx.from.id, habits);
  await ctx.reply(msg);
  ctx.answerCbQuery();
});

// Unknown text fallback (must be last)
commands.on('text', async (ctx) => {
  await ctx.reply(
    '❓ Unknown command.\n\nUse the menu buttons or:\n/start - Main menu\n/help - All commands',
    {
      reply_markup: {
        keyboard: [
          [{ text: '➕ Add Habit' }, { text: '📋 My Habits' }],
          [{ text: '✅ Mark Done' }, { text: '📊 Progress' }],
          [{ text: '📈 Stats' }, { text: '⚙️ Settings' }],
        ],
        resize_keyboard: true,
      },
    }
  );
});

module.exports = commands;
