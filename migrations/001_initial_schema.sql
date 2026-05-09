-- ═══════════════════════════════════════════════════════════
-- HabitBuddy Database Schema
-- Migration: 001_initial_schema.sql
-- ═══════════════════════════════════════════════════════════

-- USERS TABLE
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,

  telegram_id BIGINT UNIQUE NOT NULL,
  username VARCHAR(255),
  first_name VARCHAR(255),
  last_name VARCHAR(255),

  onboarding_completed BOOLEAN DEFAULT false,
  onboarding_step INTEGER DEFAULT 0,
  onboarding_started_at TIMESTAMP,
  onboarding_completed_at TIMESTAMP,

  reminder_time TIME DEFAULT '08:00',
  timezone VARCHAR(50) DEFAULT 'UTC',
  reminders_enabled BOOLEAN DEFAULT true,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_reminder_sent TIMESTAMP
);

-- HABITS TABLE
CREATE TABLE IF NOT EXISTS habits (
  id SERIAL PRIMARY KEY,

  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  name VARCHAR(100) NOT NULL,
  frequency VARCHAR(20) DEFAULT 'daily',
  frequency_target INTEGER DEFAULT 1,

  active BOOLEAN DEFAULT true,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- HABIT LOGS TABLE
CREATE TABLE IF NOT EXISTS habit_logs (
  id SERIAL PRIMARY KEY,

  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  habit_id INTEGER NOT NULL REFERENCES habits(id) ON DELETE CASCADE,

  date DATE NOT NULL,
  completed_at TIMESTAMP DEFAULT NOW(),

  note TEXT
);

-- ═══════════════════════════════════════════════════════════
-- INDEXES FOR PERFORMANCE
-- ═══════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_users_reminder_time ON users(reminder_time);
CREATE INDEX IF NOT EXISTS idx_users_onboarding ON users(onboarding_completed);

CREATE INDEX IF NOT EXISTS idx_habits_user_id ON habits(user_id);
CREATE INDEX IF NOT EXISTS idx_habits_user_active ON habits(user_id, active);

CREATE INDEX IF NOT EXISTS idx_habit_logs_user_habit_date ON habit_logs(user_id, habit_id, date);
CREATE INDEX IF NOT EXISTS idx_habit_logs_date ON habit_logs(date);

-- ═══════════════════════════════════════════════════════════
-- CONSTRAINTS
-- ═══════════════════════════════════════════════════════════

CREATE UNIQUE INDEX IF NOT EXISTS idx_habits_unique_name
  ON habits(user_id, name)
  WHERE active = true;

CREATE UNIQUE INDEX IF NOT EXISTS idx_habit_logs_unique_day
  ON habit_logs(user_id, habit_id, date);

-- ═══════════════════════════════════════════════════════════
-- VERIFY SCHEMA CREATED
-- ═══════════════════════════════════════════════════════════

DO $$
BEGIN
  RAISE NOTICE '✅ HabitBuddy schema created successfully';
  RAISE NOTICE '   Tables: users, habits, habit_logs';
  RAISE NOTICE '   Indexes: performance indexes applied';
  RAISE NOTICE '   Constraints: duplicate prevention active';
END $$;
