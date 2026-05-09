# HabitBuddy

A Telegram bot for building daily habits — guided onboarding, streak tracking, weekly progress, and personalized reminders.

## Stack

Node.js 18+, Telegraf 4, PostgreSQL 15 (Docker locally / Railway managed in prod), `pg`, `node-cron`.

## Quickstart (local)

1. **Get a Telegram bot token** from [@BotFather](https://t.me/BotFather) using `/newbot`.

2. **Configure environment**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` and set `BOT_TOKEN=<your token>`. Leave the DB defaults as-is.

3. **Start the database**

   ```bash
   docker-compose up -d
   ```

   Wait until `docker inspect habitbuddy_postgres --format='{{.State.Health.Status}}'` prints `healthy`.

4. **Install dependencies and start the bot**

   ```bash
   npm install
   npm run dev
   ```

   You should see:
   ```
   ✅ Database connected successfully
   ✅ Database schema ready
   ✅ Bot connected: @yourbotusername
   ✅ Scheduler started (checks every minute)
   ✅ HabitBuddy Bot is running!
   ```

5. **Try it** — open Telegram, find your bot, send `/start`.

## Commands

| Command | What it does |
|---|---|
| `/start` | First-time onboarding or main menu |
| `/add_habit` | Guided habit creation wizard |
| `/habits` | List active habits |
| `/done [name]` | Mark a habit complete (or pick from list) |
| `/progress` | Streaks and weekly completion % |
| `/delete_habit [name]` | Soft-delete a habit (history preserved) |
| `/reminder_time HH:MM` | Set daily reminder time (UTC, 24-hour) |
| `/help` | Command list |

## Project structure

```
src/
├── config/database.js          PG connection pool + auto-migration
├── handlers/commands.js        Commands + button handlers
├── scenes/
│   ├── onboardingScene.js      Welcome / guide / example
│   ├── addHabitScene.js        Add-habit wizard
│   └── markDoneScene.js        Mark-complete picker
├── services/
│   ├── userService.js          User CRUD + onboarding state
│   ├── habitService.js         Habit CRUD + completion logging
│   └── streakService.js        Streak + weekly-rate math (UTC)
├── utils/
│   ├── logger.js               Console logger
│   └── formatters.js           Progress/stats message builders
└── scheduler/cronJobs.js       node-cron reminder dispatcher
migrations/001_initial_schema.sql
docker-compose.yml
index.js
```

## NPM scripts

- `npm run dev` — start with nodemon (local development)
- `npm start` — start without nodemon (production)
- `npm run db:start` / `db:stop` / `db:reset` — Docker Postgres lifecycle
- `npm run db:shell` — open a `psql` shell inside the container
- `npm run db:logs` — tail Postgres logs

## Deploying to Railway

1. Push this repo to GitHub.
2. Create a Railway project from the repo.
3. Add a **PostgreSQL** plugin in the same project.
4. In the bot service's **Variables** tab:

   ```
   BOT_TOKEN=<your token>
   DB_HOST=${{Postgres.PGHOST}}
   DB_PORT=${{Postgres.PGPORT}}
   DB_USER=${{Postgres.PGUSER}}
   DB_PASSWORD=${{Postgres.PGPASSWORD}}
   DB_NAME=${{Postgres.PGDATABASE}}
   NODE_ENV=production
   LOG_LEVEL=info
   ```

5. Deploy. The DB module auto-enables SSL when `NODE_ENV=production`.
6. Stop the local bot before testing production — Telegram does not allow two pollers on the same token.

## Notes

- All date math uses **UTC**. The `reminder_time` column stores a UTC `TIME`. Per-user timezone awareness is wired (`users.timezone`) but defaults to UTC; localized reminders work as long as the user's timezone is set in the database.
- Schema migrations are idempotent (`IF NOT EXISTS` everywhere) and re-run on every startup, so a fresh `docker-compose down -v && docker-compose up -d` always yields a clean working DB.
- Unique constraints prevent duplicate active habit names and duplicate completions on the same day.
