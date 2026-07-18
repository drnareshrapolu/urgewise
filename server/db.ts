import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { config } from "./config.ts";
import type { Habit, HabitLog } from "./insights.ts";

export type Db = DatabaseSync;

export function openDatabase(databasePath = config.databasePath): Db {
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  const db = new DatabaseSync(databasePath);
  db.exec("PRAGMA foreign_keys = ON");
  migrate(db);
  seedDemo(db);
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

export function seedDemo(db: Db): void {
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(config.demoEmail) as { id: string } | undefined;
  if (existing) return;

  const userId = randomUUID();
  const habitId = randomUUID();
  const now = new Date();

  db.prepare("INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)").run(
    userId,
    config.demoEmail,
    "demo-mode-disabled",
    now.toISOString()
  );
  db.prepare("INSERT INTO habits (id, user_id, name, category, target_behavior, created_at) VALUES (?, ?, ?, ?, ?, ?)").run(
    habitId,
    userId,
    "Evening doomscrolling",
    "screen time",
    "Stop scrolling in bed after 10pm",
    now.toISOString()
  );

  const logs = [
    [-12, "relapse", "Stayed up after a stressful work message.", "tense", 8, "work stress", "in bed"],
    [-10, "resisted", "Put the phone outside the room.", "steady", 4, "bedtime boredom", "bedroom"],
    [-8, "relapse", "Opened short videos after dinner.", "tired", 7, "after dinner", "sofa"],
    [-6, "resisted", "Read a paperback for 20 minutes instead.", "calm", 3, "bedtime boredom", "bedroom"],
    [-4, "neutral", "Used the phone but stopped before midnight.", "okay", 5, "habit loop", "bedroom"],
    [-2, "resisted", "Charged the phone in the kitchen.", "proud", 2, "bedtime boredom", "kitchen"],
    [-1, "resisted", "Did breathing exercise when the urge hit.", "calm", 3, "work stress", "bedroom"]
  ] as const;

  for (const [offset, status, note, mood, urge, trigger, context] of logs) {
    const timestamp = new Date(now.getTime() + offset * 86_400_000);
    timestamp.setHours(22, 30, 0, 0);
    db.prepare(`
      INSERT INTO habit_logs
      (id, habit_id, timestamp, status, note, mood, urge_level, trigger, context, timezone, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(randomUUID(), habitId, timestamp.toISOString(), status, note, mood, urge, trigger, context, "Asia/Kolkata", now.toISOString());
  }
}

export function getHabitForUser(db: Db, userId: string, habitId: string): Habit | undefined {
  return db.prepare("SELECT * FROM habits WHERE id = ? AND user_id = ?").get(habitId, userId) as Habit | undefined;
}

export function getLogsForHabit(db: Db, habitId: string): HabitLog[] {
  return db.prepare("SELECT * FROM habit_logs WHERE habit_id = ? ORDER BY timestamp DESC").all(habitId) as HabitLog[];
}
