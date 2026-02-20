const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, 'tradevault.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS trades (
    id                TEXT PRIMARY KEY,
    symbol            TEXT NOT NULL,
    asset_type        TEXT NOT NULL DEFAULT 'stock',
    direction         TEXT NOT NULL DEFAULT 'long',
    entry_price       REAL NOT NULL,
    exit_price        REAL NOT NULL,
    quantity          REAL NOT NULL,
    entry_date        TEXT,
    exit_date         TEXT,
    stop_loss         REAL,
    take_profit       REAL,
    strategy          TEXT,
    notes             TEXT,
    commission        REAL DEFAULT 0,
    market_conditions TEXT,
    pnl               REAL NOT NULL,
    broker            TEXT DEFAULT 'manual',
    broker_trade_id   TEXT,
    created_at        TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS journal_entries (
    id          TEXT PRIMARY KEY,
    entry_date  TEXT NOT NULL,
    content     TEXT NOT NULL,
    created_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS broker_connections (
    id           TEXT PRIMARY KEY,
    broker_name  TEXT NOT NULL,
    api_key      TEXT,
    api_secret   TEXT,
    account_id   TEXT,
    is_active    INTEGER DEFAULT 1,
    last_sync    TEXT,
    created_at   TEXT DEFAULT (datetime('now'))
  );
`);

console.log('✅ Database ready:', dbPath);
module.exports = db;
