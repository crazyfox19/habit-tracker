// index.js
// HabitBuddy Bot Entry Point

require('dotenv').config();
const { Telegraf, Scenes, session } = require('telegraf');
const logger = require('./src/utils/logger');
const { initDatabase } = require('./src/config/database');
const commands = require('./src/handlers/commands');
const { welcomeScene, guideScene, exampleScene } = require('./src/scenes/onboardingScene');
const addHabitScene = require('./src/scenes/addHabitScene');
const markDoneScene = require('./src/scenes/markDoneScene');
const { startScheduler } = require('./src/scheduler/cronJobs');

if (!process.env.BOT_TOKEN || process.env.BOT_TOKEN === 'REPLACE_WITH_TELEGRAM_BOT_TOKEN') {
  console.error('❌ BOT_TOKEN is required in .env');
  console.error('   Edit .env and replace REPLACE_WITH_TELEGRAM_BOT_TOKEN with the token from @BotFather');
  process.exit(1);
}

async function startBot() {
  try {
    logger.info('🚀 Starting HabitBuddy Bot...');

    await initDatabase();

    const bot = new Telegraf(process.env.BOT_TOKEN);

    const stage = new Scenes.Stage([
      welcomeScene,
      guideScene,
      exampleScene,
      addHabitScene,
      markDoneScene,
    ]);

    bot.use(session());
    bot.use(stage.middleware());
    bot.use(commands);

    bot.catch((err, ctx) => {
      logger.error(`Bot error: ${err.message}`);
      ctx.reply('❌ An error occurred. Please try again or type /start').catch(() => {});
    });

    const me = await bot.telegram.getMe();
    logger.success(`✅ Bot connected: @${me.username}`);

    startScheduler(bot);

    await bot.telegram.setMyCommands([
      { command: 'start',          description: 'Start the bot or open the main menu' },
      { command: 'add_habit',      description: 'Create a new habit' },
      { command: 'habits',         description: 'List your active habits' },
      { command: 'done',           description: 'Mark a habit as complete for today' },
      { command: 'progress',       description: 'View streaks and weekly progress' },
      { command: 'delete_habit',   description: 'Delete a habit (history kept)' },
      { command: 'reminder_time',  description: 'Set your daily reminder time (UTC)' },
      { command: 'help',           description: 'Show all commands' },
    ]);
    logger.success('✅ Bot command menu registered');

    process.on('SIGINT', async () => {
      logger.info('Shutting down...');
      await bot.stop('SIGINT');
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger.info('Shutting down...');
      await bot.stop('SIGTERM');
      process.exit(0);
    });

    await bot.launch();
    logger.success('✅ HabitBuddy Bot is running!');
    logger.info('📱 Open Telegram and send /start to your bot');

  } catch (err) {
    logger.error(`Failed to start: ${err.message}`);
    process.exit(1);
  }
}

startBot();
