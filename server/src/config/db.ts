import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import fs from 'fs';
import path from 'path';

const dbPath = process.env.DATABASE_PATH || './data/journal.db';
const dbDir = path.dirname(dbPath);
let dbInstance: Database;

export async function initializeDatabase(): Promise<void> {
  // Ensure the database directory exists
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  // Open the SQLite database
  dbInstance = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  // Create tables if they don't exist
  await dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      entry_date TEXT NOT NULL,
      content TEXT,
      tags TEXT DEFAULT '[]',
      mood INTEGER DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (user_id, entry_date),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS habits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      icon TEXT DEFAULT '✅',
      color TEXT DEFAULT '#8B5CF6',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS habit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      habit_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      log_date TEXT NOT NULL,
      completed INTEGER DEFAULT 0,
      UNIQUE (habit_id, log_date),
      FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS quick_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      color TEXT DEFAULT '#FFE066',
      pinned INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Add columns if they don't exist (for entries)
  // Add columns for entries
  try {
    await dbInstance.exec(`ALTER TABLE entries ADD COLUMN tags TEXT DEFAULT '[]'`);
  } catch (e) { /* ignore */ }
  try {
    await dbInstance.exec(`ALTER TABLE entries ADD COLUMN mood INTEGER DEFAULT NULL`);
  } catch (e) { /* ignore */ }

  // Add columns for Quick Notes 2.0
  try {
    await dbInstance.exec(`ALTER TABLE quick_notes ADD COLUMN tags TEXT DEFAULT '[]'`);
  } catch (e) { /* ignore */ }
  try {
    await dbInstance.exec(`ALTER TABLE quick_notes ADD COLUMN type TEXT DEFAULT 'text'`);
  } catch (e) { /* ignore */ }
  try {
    await dbInstance.exec(`ALTER TABLE quick_notes ADD COLUMN position INTEGER DEFAULT 0`);
  } catch (e) { /* ignore */ }
  try {
    await dbInstance.exec(`ALTER TABLE quick_notes ADD COLUMN title TEXT DEFAULT ''`);
  } catch (e) { /* ignore */ }

  // Add columns for Habit Tracker 2.0
  try {
    await dbInstance.exec(`ALTER TABLE habits ADD COLUMN category TEXT DEFAULT 'General'`);
  } catch (e) { /* ignore */ }
  try {
    await dbInstance.exec(`ALTER TABLE habits ADD COLUMN frequency_days TEXT DEFAULT '[0,1,2,3,4,5,6]'`); // Default: All days
  } catch (e) { /* ignore */ }
  try {
    await dbInstance.exec(`ALTER TABLE habits ADD COLUMN target_count INTEGER DEFAULT 1`);
  } catch (e) { /* ignore */ }

  console.log('Database initialized successfully');
}

export function getDb(): Database {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call initializeDatabase first.');
  }
  return dbInstance;
}
