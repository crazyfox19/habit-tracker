// src/scenes/onboardingScene.js
// Complete first-time user onboarding system

const { Scenes } = require('telegraf');
const logger = require('../utils/logger');
const userService = require('../services/userService');

// ════════════════════════════════════════════════════════════
// STEP 1: WELCOME MESSAGE
// ════════════════════════════════════════════════════════════

const welcomeScene = new Scenes.BaseScene('onboarding_welcome');

welcomeScene.enter(async (ctx) => {
  try {
    logger.info(`🎉 New user onboarding: ${ctx.from.id}`);

    await userService.updateOnboardingStep(ctx.from.id, 1);

    const firstName = ctx.from.first_name || 'Friend';

    const welcomeMessage =
`👋 Welcome to HabitBuddy, ${firstName}!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 What is HabitBuddy?
I'm your personal habit-building assistant, right here in Telegram.

💡 What I help you do:
  • Build habits that actually stick
  • Track completions with one tap
  • Watch your streaks grow daily
  • Get reminded so you never forget
  • See your weekly progress clearly

Perfect for: Exercise, reading, meditation, studying, journaling, or any habit you want to build.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Ready to build your first habit? 🚀`;

    await ctx.reply(welcomeMessage, {
      reply_markup: {
        inline_keyboard: [
          [{ text: '📖 How It Works', callback_data: 'ob_how_it_works' }],
          [{ text: '➕ Add First Habit', callback_data: 'ob_add_habit' }],
          [{ text: '📊 See Example Progress', callback_data: 'ob_example' }],
          [{ text: '⏭️ Skip to Main Menu', callback_data: 'ob_skip' }],
        ],
      },
    });

  } catch (err) {
    logger.error(`Onboarding welcome error: ${err.message}`);
    await ctx.reply('Error loading welcome. Type /start to try again.');
  }
});

welcomeScene.action('ob_how_it_works', async (ctx) => {
  try {
    await ctx.deleteMessage();
    await ctx.scene.enter('onboarding_guide');
    ctx.answerCbQuery();
  } catch (err) {
    logger.error(`ob_how_it_works error: ${err.message}`);
  }
});

welcomeScene.action('ob_add_habit', async (ctx) => {
  try {
    await ctx.deleteMessage();
    await userService.completeOnboarding(ctx.from.id);
    await ctx.scene.enter('add_habit');
    ctx.answerCbQuery('Let\'s add your first habit!');
  } catch (err) {
    logger.error(`ob_add_habit error: ${err.message}`);
  }
});

welcomeScene.action('ob_example', async (ctx) => {
  try {
    await ctx.deleteMessage();
    await ctx.scene.enter('onboarding_example');
    ctx.answerCbQuery();
  } catch (err) {
    logger.error(`ob_example error: ${err.message}`);
  }
});

welcomeScene.action('ob_skip', async (ctx) => {
  try {
    await ctx.deleteMessage();
    await userService.completeOnboarding(ctx.from.id);
    await showMainMenu(ctx);
    await ctx.scene.leave();
    ctx.answerCbQuery('Welcome to HabitBuddy!');
  } catch (err) {
    logger.error(`ob_skip error: ${err.message}`);
  }
});

// ════════════════════════════════════════════════════════════
// STEP 2: HOW IT WORKS GUIDE
// ════════════════════════════════════════════════════════════

const guideScene = new Scenes.BaseScene('onboarding_guide');

guideScene.enter(async (ctx) => {
  try {
    await userService.updateOnboardingStep(ctx.from.id, 2);

    const guideMessage =
`📚 HOW HABITBUDDY WORKS

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1️⃣ ADD A HABIT
Tell me what you want to track.
Example: Exercise, Reading, Meditation

2️⃣ COMPLETE DAILY
Each day, mark habits done with one click.
I record the date and update your streak.

3️⃣ TRACK PROGRESS
See your streaks, weekly %, and total stats.
Watch momentum build day by day.

4️⃣ GET REMINDERS
Set your preferred time.
I'll remind you every day so you don't forget.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

That's it. Simple and powerful. 💪`;

    await ctx.reply(guideMessage, {
      reply_markup: {
        inline_keyboard: [
          [{ text: '1️⃣ Add Habit Guide', callback_data: 'ob_guide_1' }],
          [{ text: '2️⃣ Complete Daily Guide', callback_data: 'ob_guide_2' }],
          [{ text: '3️⃣ Progress Guide', callback_data: 'ob_guide_3' }],
          [{ text: '4️⃣ Reminders Guide', callback_data: 'ob_guide_4' }],
          [{ text: '➕ Add First Habit', callback_data: 'ob_start_adding' }],
          [{ text: '⬅️ Back to Welcome', callback_data: 'ob_back_welcome' }],
        ],
      },
    });

  } catch (err) {
    logger.error(`Guide scene error: ${err.message}`);
  }
});

guideScene.action('ob_guide_1', async (ctx) => {
  await ctx.deleteMessage();

  await ctx.reply(
`1️⃣ ADDING A HABIT

Click "➕ Add Habit" from the main menu
or type /add_habit

Then:
• Type your habit name
  Example: "Exercise" or "Read 30 min"
• Choose frequency:
  [📅 Daily] [📊 2x/week] [📊 3x/week] etc.
• Bot saves it and starts tracking

You can add as many habits as you want!

Next: Learn how to mark habits complete →`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: '➡️ Next: Daily Completion', callback_data: 'ob_guide_2' }],
          [{ text: '⬅️ Back to Overview', callback_data: 'ob_back_guide' }],
          [{ text: '➕ Add First Habit Now', callback_data: 'ob_start_adding' }],
        ],
      },
    }
  );
  ctx.answerCbQuery();
});

guideScene.action('ob_guide_2', async (ctx) => {
  await ctx.deleteMessage();

  await ctx.reply(
`2️⃣ MARKING HABITS COMPLETE

Each day, mark completions with one click:

• Click "✅ Mark Done" from main menu
• Select the habit you completed
• Bot records it instantly
• Streak automatically updated

Or type: /done [habit name]
Example: /done exercise

Rules:
• Can only mark once per day
• Missed days break your streak
• Bot confirms with streak info

Next: See your progress →`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: '➡️ Next: Progress', callback_data: 'ob_guide_3' }],
          [{ text: '⬅️ Back', callback_data: 'ob_guide_1' }],
          [{ text: '➕ Add First Habit Now', callback_data: 'ob_start_adding' }],
        ],
      },
    }
  );
  ctx.answerCbQuery();
});

guideScene.action('ob_guide_3', async (ctx) => {
  await ctx.deleteMessage();

  await ctx.reply(
`3️⃣ TRACKING PROGRESS

Type /progress or click "📊 Progress"

You'll see for each habit:
  • Current streak (consecutive days)
  • This week's completion %
  • Status (on track / behind)

Example:
  ✅ Exercise (Daily)
  • Streak: 7 days 🔥
  • This week: 5/7 (71%)
  • Status: On track!

  ❌ Reading (3x/week)
  • Streak: 0 (missed yesterday)
  • This week: 1/3 (33%)
  • Status: Behind — catch up!

Next: Set up reminders →`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: '➡️ Next: Reminders', callback_data: 'ob_guide_4' }],
          [{ text: '⬅️ Back', callback_data: 'ob_guide_2' }],
          [{ text: '➕ Add First Habit Now', callback_data: 'ob_start_adding' }],
        ],
      },
    }
  );
  ctx.answerCbQuery();
});

guideScene.action('ob_guide_4', async (ctx) => {
  await ctx.deleteMessage();

  await ctx.reply(
`4️⃣ DAILY REMINDERS

Set your preferred reminder time:
Type: /reminder_time 08:00
Or select from settings menu

What reminders look like:
📌 Good morning! Your habits for today:
  • Exercise — Last done: Yesterday
  • Reading — Last done: 3 days ago
  • Meditation — Never completed

[✅ Mark Done] button included

Reminders are sent once per day at your chosen time.

That's everything! Ready to start? 🎉`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🎉 Add My First Habit!', callback_data: 'ob_start_adding' }],
          [{ text: '⏭️ Skip to Main Menu', callback_data: 'ob_skip_final' }],
          [{ text: '⬅️ Back', callback_data: 'ob_guide_3' }],
        ],
      },
    }
  );
  ctx.answerCbQuery();
});

guideScene.action('ob_back_guide', async (ctx) => {
  await ctx.deleteMessage();
  await ctx.scene.reenter();
  ctx.answerCbQuery();
});

guideScene.action('ob_back_welcome', async (ctx) => {
  await ctx.deleteMessage();
  await ctx.scene.enter('onboarding_welcome');
  ctx.answerCbQuery();
});

guideScene.action('ob_start_adding', async (ctx) => {
  await ctx.deleteMessage();
  await userService.completeOnboarding(ctx.from.id);
  await ctx.scene.enter('add_habit');
  ctx.answerCbQuery('Let\'s add your first habit!');
});

guideScene.action('ob_skip_final', async (ctx) => {
  await ctx.deleteMessage();
  await userService.completeOnboarding(ctx.from.id);
  await showMainMenu(ctx);
  await ctx.scene.leave();
  ctx.answerCbQuery();
});

// ════════════════════════════════════════════════════════════
// STEP 3: EXAMPLE PROGRESS VIEW
// ════════════════════════════════════════════════════════════

const exampleScene = new Scenes.BaseScene('onboarding_example');

exampleScene.enter(async (ctx) => {
  try {
    const exampleMessage =
`📊 EXAMPLE PROGRESS VIEW

Here's what your progress will look like after a week:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

YOUR HABIT PROGRESS

🔥 Exercise (Daily)
   • Current streak: 7 days 🔥
   • This week: 7/7 (100%) — Perfect!
   • Status: ✅ On track

✅ Reading (3x/week)
   • Current streak: 3 days
   • This week: 3/3 (100%) — Goal met!
   • Status: ✅ On track

⚠️ Meditation (Daily)
   • Current streak: 0 days (missed 2 days)
   • This week: 2/7 (29%)
   • Status: ⚠️ Behind — restart today!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This is what consistency looks like.
Your data will look like this soon! 💪`;

    await ctx.reply(exampleMessage, {
      reply_markup: {
        inline_keyboard: [
          [{ text: '➕ Add First Habit', callback_data: 'ob_add_from_example' }],
          [{ text: '⬅️ Back to Welcome', callback_data: 'ob_example_back' }],
        ],
      },
    });

  } catch (err) {
    logger.error(`Example scene error: ${err.message}`);
  }
});

exampleScene.action('ob_add_from_example', async (ctx) => {
  await ctx.deleteMessage();
  await userService.completeOnboarding(ctx.from.id);
  await ctx.scene.enter('add_habit');
  ctx.answerCbQuery();
});

exampleScene.action('ob_example_back', async (ctx) => {
  await ctx.deleteMessage();
  await ctx.scene.enter('onboarding_welcome');
  ctx.answerCbQuery();
});

// ════════════════════════════════════════════════════════════
// HELPER: SHOW MAIN MENU
// ════════════════════════════════════════════════════════════

async function showMainMenu(ctx) {
  await ctx.reply(
    '🏠 Main Menu\n\nWhat would you like to do?',
    {
      reply_markup: {
        keyboard: [
          [{ text: '➕ Add Habit' }, { text: '📋 My Habits' }],
          [{ text: '✅ Mark Done' }, { text: '📊 Progress' }],
          [{ text: '📈 Stats' }, { text: '⚙️ Settings' }],
        ],
        resize_keyboard: true,
        one_time_keyboard: false,
      },
    }
  );
}

module.exports = { welcomeScene, guideScene, exampleScene, showMainMenu };
