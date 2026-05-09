// src/scenes/addHabitScene.js
// Guided add habit wizard

const { Scenes, Composer } = require('telegraf');
const logger = require('../utils/logger');
const userService = require('../services/userService');
const habitService = require('../services/habitService');

// ════════════════════
// STEP 1: Ask Name
// ════════════════════

const step1 = new Composer();

step1.command('cancel', async (ctx) => {
  await ctx.reply('❌ Cancelled.', { reply_markup: { remove_keyboard: true } });
  await ctx.scene.leave();
});

step1.hears('❌ Cancel', async (ctx) => {
  await ctx.reply('❌ Cancelled.', { reply_markup: { remove_keyboard: true } });
  await ctx.scene.leave();
});

step1.on('text', async (ctx) => {
  const text = ctx.message.text;

  // Skip if user typed a button label from main menu
  if (['➕ Add Habit', '📋 My Habits', '✅ Mark Done', '📊 Progress', '📈 Stats', '⚙️ Settings'].includes(text)) {
    return;
  }

  const habitName = text.trim().toLowerCase();

  // Validate
  if (habitName.length < 2) {
    await ctx.reply('❌ Name too short (min 2 characters). Try again:');
    return;
  }

  if (habitName.length > 50) {
    await ctx.reply('❌ Name too long (max 50 characters). Try again:');
    return;
  }

  // Check duplicate
  const existing = await habitService.findHabitByName(ctx.from.id, habitName);
  if (existing) {
    await ctx.reply(`❌ You already have a habit called "${habitName}".\n\nTry a different name:`);
    return;
  }

  // Save and advance
  ctx.scene.state.habitName = habitName;
  ctx.scene.state.step = 2;
  ctx.wizard.next();

  await ctx.reply(
    `✅ Habit: "${habitName}"\n\nHow often do you want to do this?`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: '📅 Every Day (Daily)', callback_data: 'freq_daily' }],
          [{ text: '📊 2x per week', callback_data: 'freq_2' }],
          [{ text: '📊 3x per week', callback_data: 'freq_3' }],
          [{ text: '📊 4x per week', callback_data: 'freq_4' }],
          [{ text: '📊 5x per week', callback_data: 'freq_5' }],
          [{ text: '❌ Cancel', callback_data: 'freq_cancel' }],
        ],
      },
    }
  );
});

// ════════════════════
// STEP 2: Select Freq
// ════════════════════

const step2 = new Composer();

step2.action(/freq_(.+)/, async (ctx) => {
  try {
    const freqInput = ctx.match[1];

    if (freqInput === 'cancel') {
      await ctx.deleteMessage();
      await ctx.reply('❌ Cancelled.', { reply_markup: { remove_keyboard: true } });
      ctx.answerCbQuery();
      return ctx.scene.leave();
    }

    let frequency, frequencyTarget;
    if (freqInput === 'daily') {
      frequency = 'daily';
      frequencyTarget = 1;
    } else {
      frequency = 'weekly';
      frequencyTarget = parseInt(freqInput);
    }

    const habitName = ctx.scene.state.habitName;

    // Resolve internal user id
    const user = await userService.findOrCreateUser(ctx.from);

    // Save to database
    await habitService.createHabit({
      userId: user.id,
      name: habitName,
      frequency,
      frequencyTarget,
    });

    const freqDisplay = frequency === 'daily' ? 'every day' : `${frequencyTarget}x per week`;
    await ctx.deleteMessage();

    await ctx.reply(
      `🎉 Habit Created!\n\n` +
      `📌 Name: ${habitName}\n` +
      `📅 Frequency: ${freqDisplay}\n\n` +
      `You'll get daily reminders and streak tracking starts now!`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '✅ Mark Done Today', callback_data: 'cmd_mark_done' }],
            [{ text: '➕ Add Another Habit', callback_data: 'cmd_add_habit' }],
            [{ text: '📊 View Progress', callback_data: 'cmd_progress' }],
          ],
        },
      }
    );

    // Restore main-menu reply keyboard since step1 set a Cancel-only one
    await ctx.reply('🏠 Back to main menu.', {
      reply_markup: {
        keyboard: [
          [{ text: '➕ Add Habit' }, { text: '📋 My Habits' }],
          [{ text: '✅ Mark Done' }, { text: '📊 Progress' }],
          [{ text: '📈 Stats' }, { text: '⚙️ Settings' }],
        ],
        resize_keyboard: true,
      },
    });

    ctx.answerCbQuery('Habit created!');
    await ctx.scene.leave();

  } catch (err) {
    logger.error(`Frequency selection error: ${err.message}`);
    await ctx.reply('❌ Error saving habit. Try again.');
  }
});

// ════════════════════
// SCENE DEFINITION
// ════════════════════

const addHabitScene = new Scenes.WizardScene('add_habit', step1, step2);

addHabitScene.enter(async (ctx) => {
  ctx.scene.state.step = 1;
  ctx.scene.state.habitName = null;

  await ctx.reply(
    '➕ ADD NEW HABIT\n\n' +
    'What habit do you want to track?\n\n' +
    'Examples:\n• Exercise\n• Read 30 min\n• Meditate\n• Study\n• Journal\n\nType the habit name:',
    {
      reply_markup: {
        keyboard: [[{ text: '❌ Cancel' }]],
        resize_keyboard: true,
        one_time_keyboard: false,
      },
    }
  );
});

module.exports = addHabitScene;
