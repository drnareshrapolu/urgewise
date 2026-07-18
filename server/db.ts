import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import Database from "better-sqlite3";
import { config } from "./config.ts";
import type { Habit, HabitLog } from "./insights.ts";

export type Db = Database.Database;

export function openDatabase(databasePath = config.databasePath): Db {
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  const db = new Database(databasePath);
  db.exec("PRAGMA foreign_keys = ON");
  migrate(db);
  seedConfiguredUser(db);
  return db;
}

export function migrate(db: Db): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS habits (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      target_behavior TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS habit_logs (
      id TEXT PRIMARY KEY,
      habit_id TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
      timestamp TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('relapse', 'resisted', 'neutral')),
      note TEXT,
      mood TEXT,
      urge_level INTEGER,
      trigger TEXT,
      context TEXT,
      timezone TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS coaching_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      habit_id TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS coach_messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES coaching_sessions(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS nudges (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      habit_id TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      model_used TEXT NOT NULL,
      generated_at TEXT NOT NULL,
      triggered_by TEXT NOT NULL,
      source_context_hash TEXT NOT NULL,
      is_cached INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS llm_audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      habit_id TEXT,
      route TEXT NOT NULL,
      model_used TEXT NOT NULL,
      prompt_context_json TEXT NOT NULL,
      response_id TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_habits_user_id ON habits(user_id);
    CREATE INDEX IF NOT EXISTS idx_habit_logs_habit_timestamp ON habit_logs(habit_id, timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_nudges_cache ON nudges(user_id, habit_id, source_context_hash, generated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_sessions_user_habit ON coaching_sessions(user_id, habit_id, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_messages_session_created ON coach_messages(session_id, created_at ASC);
  `);
}

export function seedConfiguredUser(db: Db): void {
  if (!config.seedUserEmail || !config.seedUserPassword) return;

  const existing = db.prepare("SELECT id, password_hash FROM users WHERE email = ?").get(config.seedUserEmail) as
    | { id: string; password_hash: string }
    | undefined;
  const passwordHash = bcrypt.hashSync(config.seedUserPassword, 10);

  if (existing) {
    if (!bcrypt.compareSync(config.seedUserPassword, existing.password_hash)) {
      db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(passwordHash, existing.id);
    }
    return;
  }

  const digest = createHash("sha256").update(config.seedUserEmail).digest("hex").slice(0, 24);
  db.prepare("INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)").run(
    `seed-${digest}`,
    config.seedUserEmail,
    passwordHash,
    new Date().toISOString()
  );
}

export function getHabitForUser(db: Db, userId: string, habitId: string): Habit | undefined {
  return db.prepare("SELECT * FROM habits WHERE id = ? AND user_id = ?").get(habitId, userId) as Habit | undefined;
}

export function getLogsForHabit(db: Db, habitId: string): HabitLog[] {
  return db.prepare("SELECT * FROM habit_logs WHERE habit_id = ? ORDER BY timestamp DESC").all(habitId) as HabitLog[];
}
