// src/scenes/markDoneScene.js
// Guided habit completion flow

const { Scenes } = require('telegraf');
const logger = require('../utils/logger');
const habitService = require('../services/habitService');
const streakService = require('../services/streakService');

const markDoneScene = new Scenes.BaseScene('mark_done');

markDoneScene.enter(async (ctx) => {
  try {
    const telegramId = ctx.from.id;
    const habits = await habitService.getActiveHabits(telegramId);

    if (habits.length === 0) {
      await ctx.reply(
        '❌ No habits tracked yet.\n\nAdd a habit first!',
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '➕ Add First Habit', callback_data: 'cmd_add_habit' }],
            ],
          },
        }
      );
      return ctx.scene.leave();
    }

    // Build habit buttons
    const habitButtons = [];
    for (const habit of habits) {
      const doneToday = await streakService.isHabitCompleteToday(telegramId, habit.id);
      const buttonText = doneToday
        ? `✅ ${habit.name} (done today!)`
        : `⭕ ${habit.name}`;

      habitButtons.push([{
        text: buttonText,
        callback_data: doneToday
          ? `already_done_${habit.id}`
          : `mark_done_${habit.id}`
      }]);
    }

    habitButtons.push([{ text: '❌ Cancel', callback_data: 'cancel_done' }]);

    await ctx.reply(
      '✅ MARK HABIT COMPLETE\n\nWhich habit did you complete today?',
      {
        reply_markup: { inline_keyboard: habitButtons },
      }
    );

  } catch (err) {
    logger.error(`Mark done scene error: ${err.message}`);
    await ctx.reply('❌ Error loading habits. Try again.');
    await ctx.scene.leave();
  }
});

// Handle habit selection
markDoneScene.action(/mark_done_(\d+)/, async (ctx) => {
  try {
    const habitId = parseInt(ctx.match[1]);
    const telegramId = ctx.from.id;

    await habitService.markHabitComplete(telegramId, habitId);

    const habit = await habitService.getHabitById(habitId);

    const streak = await streakService.calculateStreak(telegramId, habitId);
    const weeklyRate = await streakService.getWeeklyCompletionRate(telegramId, habitId);

    const streakEmoji = streak >= 30 ? '🔥🔥🔥' : streak >= 14 ? '🔥🔥' : streak >= 7 ? '🔥' : '✅';

    await ctx.deleteMessage();
    await ctx.reply(
      `${streakEmoji} Great work! "${habit.name}" marked complete!\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📊 Streak: ${streak} day${streak !== 1 ? 's' : ''}\n` +
      `📅 This week: ${weeklyRate}%\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `Keep it up! 💪`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '✅ Mark Another', callback_data: 'mark_another' }],
            [{ text: '📊 View Progress', callback_data: 'cmd_progress' }],
          ],
        },
      }
    );

    ctx.answerCbQuery('Marked complete!');
    await ctx.scene.leave();

  } catch (err) {
    logger.error(`Mark done action error: ${err.message}`);
  }
});

// Already done today
markDoneScene.action(/already_done_(\d+)/, async (ctx) => {
  ctx.answerCbQuery('Already marked complete today! Great job! 😊');
});

// Mark another habit
markDoneScene.action('mark_another', async (ctx) => {
  await ctx.deleteMessage();
  await ctx.scene.reenter();
  ctx.answerCbQuery();
});

markDoneScene.action('cancel_done', async (ctx) => {
  await ctx.deleteMessage();
  await ctx.reply('✅ Ok, come back when you\'re done!');
  await ctx.scene.leave();
  ctx.answerCbQuery('Cancelled');
});

module.exports = markDoneScene;
