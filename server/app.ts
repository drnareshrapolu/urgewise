import { randomUUID } from "node:crypto";
import path from "node:path";
import bcrypt from "bcryptjs";
import cookieParser from "cookie-parser";
import express from "express";
import { config } from "./config.ts";
import { clearSessionCookie, requireAuth, setSessionCookie, signSession } from "./auth.ts";
import type { Db } from "./db";
import { getHabitForUser, getLogsForHabit, openDatabase } from "./db.ts";
import { computeInsightContext } from "./insights.ts";
import { generateCoachReply, generateInsight } from "./llm.ts";
import { detectSafetyRisk, safetyResponse } from "./safety.ts";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const statuses = new Set(["relapse", "resisted", "neutral"]);
const recentRequests = new Map<string, number[]>();

function cleanText(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim().slice(0, 800) : fallback;
}

function routeParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] : value ?? "";
}

function rateLimit(key: string, limit = 8, windowMs = 60_000): boolean {
  const now = Date.now();
  for (const [entryKey, timestamps] of recentRequests.entries()) {
    const kept = timestamps.filter((time) => now - time < windowMs);
    if (kept.length) recentRequests.set(entryKey, kept);
    else recentRequests.delete(entryKey);
  }
  const requests = (recentRequests.get(key) ?? []).filter((time) => now - time < windowMs);
  if (requests.length >= limit) {
    recentRequests.set(key, requests);
    return false;
  }
  requests.push(now);
  recentRequests.set(key, requests);
  return true;
}

function clientIp(req: express.Request): string {
  return req.ip || req.socket.remoteAddress || "unknown";
}

function publicAiError(error: unknown, fallback: string): { status: number; message: string } {
  const status = typeof error === "object" && error && "status" in error ? Number(error.status) : 500;
  const message =
    status === 503
      ? "AI features need a configured API key. Add ANTHROPIC_API_KEY, OPENAI_API_KEY, or GEMINI_API_KEY in .env."
      : status === 429
        ? "The AI provider is rate limiting requests. Try again shortly."
        : fallback;
  return { status: status || 500, message };
}

export function createApp(db: Db = openDatabase()) {
  const app = express();
  const authRequired = requireAuth(db);
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    next();
  });

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.post("/api/auth/signup", (req, res) => {
    if (!rateLimit(`signup:${clientIp(req)}`, 6, 5 * 60_000)) {
      return res.status(429).json({ error: "Too many signup attempts. Try again shortly." });
    }

    const email = cleanText(req.body.email).toLowerCase();
    const password = cleanText(req.body.password).slice(0, 128);
    if (!emailRegex.test(email) || password.length < 8) {
      return res.status(400).json({ error: "Use a valid email and a password of at least 8 characters" });
    }
    if (db.prepare("SELECT id FROM users WHERE email = ?").get(email)) {
      return res.status(409).json({ error: "An account already exists for that email" });
    }

    const user = { id: randomUUID(), email };
    try {
      db.prepare("INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)").run(
        user.id,
        user.email,
        bcrypt.hashSync(password, 10),
        new Date().toISOString()
      );
    } catch {
      return res.status(409).json({ error: "An account already exists for that email" });
    }

    setSessionCookie(res, signSession(user));
    return res.status(201).json({ user });
  });

  app.post("/api/auth/login", (req, res) => {
    const email = cleanText(req.body.email).toLowerCase();
    if (!rateLimit(`login:${clientIp(req)}:${email}`, 8, 5 * 60_000)) {
      return res.status(429).json({ error: "Too many login attempts. Try again shortly." });
    }

    const password = cleanText(req.body.password).slice(0, 128);
    const row = db.prepare("SELECT id, email, password_hash FROM users WHERE email = ?").get(email) as
      | { id: string; email: string; password_hash: string }
      | undefined;
    const passwordMatches = row?.password_hash.startsWith("$2") && bcrypt.compareSync(password, row.password_hash);
    if (!row || !passwordMatches) return res.status(401).json({ error: "Invalid email or password" });

    const user = { id: row.id, email: row.email };
    setSessionCookie(res, signSession(user));
    return res.json({ user });
  });

  app.post("/api/auth/logout", (_req, res) => {
    clearSessionCookie(res);
    res.json({ ok: true });
  });

  app.get("/api/auth/me", authRequired, (req, res) => {
    res.json({ user: req.user });
  });

  app.get("/api/habits", authRequired, (req, res) => {
    const habits = db.prepare("SELECT * FROM habits WHERE user_id = ? ORDER BY created_at DESC").all(req.user!.id);
    res.json({ habits });
  });

  app.post("/api/habits", authRequired, (req, res) => {
    const name = cleanText(req.body.name);
    const category = cleanText(req.body.category, "general");
    const target = cleanText(req.body.target_behavior);
    if (!name || !target) return res.status(400).json({ error: "Habit name and target behavior are required" });

    const habit = {
      id: randomUUID(),
      user_id: req.user!.id,
      name,
      category,
      target_behavior: target,
      created_at: new Date().toISOString()
    };
    db.prepare("INSERT INTO habits (id, user_id, name, category, target_behavior, created_at) VALUES (?, ?, ?, ?, ?, ?)").run(
      habit.id,
      habit.user_id,
      habit.name,
      habit.category,
      habit.target_behavior,
      habit.created_at
    );
    res.status(201).json({ habit });
  });

  app.get("/api/habits/:habitId/logs", authRequired, (req, res) => {
    const habit = getHabitForUser(db, req.user!.id, routeParam(req.params.habitId));
    if (!habit) return res.status(404).json({ error: "Habit not found" });
    res.json({ logs: getLogsForHabit(db, habit.id) });
  });

  app.post("/api/habits/:habitId/logs", authRequired, (req, res) => {
    const habit = getHabitForUser(db, req.user!.id, routeParam(req.params.habitId));
    if (!habit) return res.status(404).json({ error: "Habit not found" });

    const status = cleanText(req.body.status);
    if (!statuses.has(status)) return res.status(400).json({ error: "Status must be relapse, resisted, or neutral" });

    const urge = Number(req.body.urge_level);
    const log = {
      id: randomUUID(),
      habit_id: habit.id,
      timestamp: cleanText(req.body.timestamp, new Date().toISOString()),
      status,
      note: cleanText(req.body.note),
      mood: cleanText(req.body.mood),
      urge_level: Number.isFinite(urge) ? Math.max(1, Math.min(10, Math.round(urge))) : null,
      trigger: cleanText(req.body.trigger),
      context: cleanText(req.body.context),
      timezone: cleanText(req.body.timezone, Intl.DateTimeFormat().resolvedOptions().timeZone),
      created_at: new Date().toISOString()
    };

    db.prepare(`
      INSERT INTO habit_logs
      (id, habit_id, timestamp, status, note, mood, urge_level, trigger, context, timezone, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      log.id,
      log.habit_id,
      log.timestamp,
      log.status,
      log.note,
      log.mood,
      log.urge_level,
      log.trigger,
      log.context,
      log.timezone,
      log.created_at
    );
    res.status(201).json({ log });
  });

  app.get("/api/habits/:habitId/summary", authRequired, (req, res) => {
    const habit = getHabitForUser(db, req.user!.id, routeParam(req.params.habitId));
    if (!habit) return res.status(404).json({ error: "Habit not found" });
    const context = computeInsightContext(habit, getLogsForHabit(db, habit.id));
    const latestNudge = db
      .prepare("SELECT content, generated_at, triggered_by, is_cached FROM nudges WHERE habit_id = ? ORDER BY generated_at DESC LIMIT 1")
      .get(habit.id);
    res.json({ habit, context, latestNudge });
  });

  app.post("/api/habits/:habitId/insights", authRequired, async (req, res) => {
    const habit = getHabitForUser(db, req.user!.id, routeParam(req.params.habitId));
    if (!habit) return res.status(404).json({ error: "Habit not found" });
    if (!rateLimit(`insights:${req.user!.id}`)) return res.status(429).json({ error: "Too many AI requests. Try again soon." });

    try {
      const result = await generateInsight(db, req.user!.id, habit, getLogsForHabit(db, habit.id), Boolean(req.body.force));
      res.json({ insight: result });
    } catch (error) {
      const aiError = publicAiError(error, "AI insight generation failed");
      res.status(aiError.status).json({ error: aiError.message });
    }
  });

  app.get("/api/habits/:habitId/chat", authRequired, (req, res) => {
    const habit = getHabitForUser(db, req.user!.id, routeParam(req.params.habitId));
    if (!habit) return res.status(404).json({ error: "Habit not found" });
    const session = getOrCreateSession(db, req.user!.id, habit.id);
    const messages = db.prepare("SELECT role, content, created_at FROM coach_messages WHERE session_id = ? ORDER BY created_at ASC").all(session.id);
    res.json({ session, messages });
  });

  app.post("/api/habits/:habitId/chat", authRequired, async (req, res) => {
    const habit = getHabitForUser(db, req.user!.id, routeParam(req.params.habitId));
    if (!habit) return res.status(404).json({ error: "Habit not found" });
    if (!rateLimit(`chat:${req.user!.id}`)) return res.status(429).json({ error: "Too many coach requests. Try again soon." });

    const content = cleanText(req.body.content, "").slice(0, 1200);
    if (!content) return res.status(400).json({ error: "Message is required" });

    const session = getOrCreateSession(db, req.user!.id, habit.id);
    const createdAt = new Date().toISOString();
    db.prepare("INSERT INTO coach_messages (id, session_id, role, content, created_at) VALUES (?, ?, 'user', ?, ?)").run(
      randomUUID(),
      session.id,
      content,
      createdAt
    );

    const safety = detectSafetyRisk(content);
    if (safety.flagged) {
      db.prepare("INSERT INTO coach_messages (id, session_id, role, content, created_at) VALUES (?, ?, 'assistant', ?, ?)").run(
        randomUUID(),
        session.id,
        safetyResponse,
        new Date().toISOString()
      );
      return res.json({ reply: safetyResponse, safety: true });
    }

    try {
      const messages = db.prepare("SELECT role, content FROM coach_messages WHERE session_id = ? ORDER BY created_at ASC").all(session.id) as Array<{
        role: "user" | "assistant";
        content: string;
      }>;
      const reply = await generateCoachReply(db, req.user!.id, habit, getLogsForHabit(db, habit.id), messages);
      db.prepare("INSERT INTO coach_messages (id, session_id, role, content, created_at) VALUES (?, ?, 'assistant', ?, ?)").run(
        randomUUID(),
        session.id,
        reply,
        new Date().toISOString()
      );
      res.json({ reply, safety: false });
    } catch (error) {
      const aiError = publicAiError(error, "Coach reply generation failed");
      res.status(aiError.status).json({ error: aiError.message });
    }
  });

  const dist = path.join(config.rootDir, "dist", "client");
  app.use(express.static(dist));
  app.get(/.*/, (_req, res, next) => {
    if (config.isProduction) return res.sendFile(path.join(dist, "index.html"));
    next();
  });

  return app;
}

function getOrCreateSession(db: Db, userId: string, habitId: string) {
  const existing = db.prepare("SELECT * FROM coaching_sessions WHERE user_id = ? AND habit_id = ? ORDER BY updated_at DESC LIMIT 1").get(userId, habitId) as
    | { id: string; user_id: string; habit_id: string; created_at: string; updated_at: string }
    | undefined;
  if (existing) return existing;

  const now = new Date().toISOString();
  const session = { id: randomUUID(), user_id: userId, habit_id: habitId, created_at: now, updated_at: now };
  db.prepare("INSERT INTO coaching_sessions (id, user_id, habit_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)").run(
    session.id,
    session.user_id,
    session.habit_id,
    session.created_at,
    session.updated_at
  );
  return session;
}
