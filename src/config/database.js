// src/config/database.js
// PostgreSQL connection pool configuration

require('dotenv').config();
const { Pool } = require('pg');
const logger = require('../utils/logger');

// Create connection pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'habitbuddy_user',
  password: process.env.DB_PASSWORD || 'habitbuddy_pass_2024',
  database: process.env.DB_NAME || 'habitbuddy_db',

  // Railway-managed Postgres requires SSL in production
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,

  // Pool configuration
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Handle pool-level errors
pool.on('error', (err) => {
  logger.error(`Unexpected database error: ${err.message}`);
});

// Test connection on startup
const testConnection = async () => {
  let client;
  try {
    client = await pool.connect();
    const result = await client.query('SELECT NOW() as time, version() as version');
    logger.success('✅ Database connected successfully');
    logger.info(`   PostgreSQL: ${result.rows[0].version.split(' ')[0]} ${result.rows[0].version.split(' ')[1]}`);
    logger.info(`   Server time: ${result.rows[0].time}`);
  } catch (err) {
    logger.error('❌ Database connection FAILED');
    logger.error(`   Error: ${err.message}`);
    logger.error('   Action: Run "docker-compose up -d" and wait 10 seconds');
    process.exit(1);
  } finally {
    if (client) client.release();
  }
};

// Run schema migration
const runMigration = async () => {
  const fs = require('fs');
  const path = require('path');

  const migrationPath = path.join(__dirname, '../../migrations/001_initial_schema.sql');

  if (!fs.existsSync(migrationPath)) {
    logger.warn('Migration file not found, skipping');
    return;
  }

  try {
    const sql = fs.readFileSync(migrationPath, 'utf8');
    await pool.query(sql);
    logger.success('✅ Database schema ready');
  } catch (err) {
    logger.error(`Migration failed: ${err.message}`);
    throw err;
  }
};

// Initialize database
const initDatabase = async () => {
  await testConnection();
  await runMigration();
};

module.exports = pool;
module.exports.initDatabase = initDatabase;
module.exports.testConnection = testConnection;
