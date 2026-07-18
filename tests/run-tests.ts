import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import request from "supertest";
import { createApp } from "../server/app.ts";
import { openDatabase } from "../server/db.ts";
import { computeInsightContext, hashContext, triggeredBy } from "../server/insights.ts";
import type { Habit, HabitLog } from "../server/insights.ts";
import { detectSafetyRisk, safetyResponse } from "../server/safety.ts";

const habit: Habit = {
  id: "habit-1",
  user_id: "user-1",
  name: "Evening scrolling",
  category: "screen time",
  target_behavior: "Stop scrolling after 10pm",
  created_at: "2026-07-01T00:00:00.000Z"
};

function log(offsetDays: number, status: HabitLog["status"], trigger: string): HabitLog {
  const timestamp = new Date(Date.UTC(2026, 6, 18, 22, 0, 0) + offsetDays * 86_400_000).toISOString();
  return {
    id: `${status}-${offsetDays}`,
    habit_id: habit.id,
    timestamp,
    status,
    note: "sample behavior note",
    mood: "tired",
    urge_level: status === "relapse" ? 8 : 3,
    trigger,
    context: "bedroom",
    timezone: "Asia/Calcutta",
    created_at: timestamp
  };
}

async function run() {
  const context = computeInsightContext(
    habit,
    [log(-10, "relapse", "stress"), log(-9, "relapse", "stress"), log(-2, "resisted", "boredom"), log(-1, "resisted", "boredom")],
    new Date(Date.UTC(2026, 6, 18, 22, 0, 0))
  );

  assert.equal(context.totals.logs, 4, "insight totals should use real logs");
  assert.equal(context.totals.relapses, 2, "relapses should be counted");
  assert.equal(context.current_streak_days, 9, "streak should be based on latest relapse");
  assert.equal(context.top_trigger, "stress", "top relapse trigger should be computed");
  assert.equal(context.trend, "improving", "trend should compare recent and previous relapses");
  assert.match(triggeredBy(context), /stress/, "triggered_by should explain the real signal");
  assert.equal(hashContext(context), hashContext(context), "context hash should be stable");

  const noRelapseContext = computeInsightContext(
    habit,
    [log(-1, "resisted", "boredom"), log(-1, "resisted", "stress"), log(-1, "neutral", "routine")],
    new Date(Date.UTC(2026, 6, 18, 22, 0, 0))
  );
  assert.equal(noRelapseContext.current_streak_days, 1, "same-day resisted entries should not inflate streak days");

  assert.equal(detectSafetyRisk("I might overdose tonight").flagged, true, "overdose language should be flagged");
  assert.equal(detectSafetyRisk("I am having severe withdrawal symptoms").flagged, true, "withdrawal risk should be flagged");
  assert.equal(detectSafetyRisk("I want to reduce late-night scrolling").flagged, false, "normal habit language should not be flagged");
  assert.match(safetyResponse, /not medical care/i, "safety response should state boundary");

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "urgewise-"));
  const db = openDatabase(path.join(tempDir, "test.sqlite"));
  const app = createApp(db);

  const seededHabits = await request(app).get("/api/habits").expect(200);
  assert.equal(seededHabits.body.habits.length, 1, "demo mode should expose the seeded habit without login");

  const createdHabit = await request(app)
    .post("/api/habits")
    .send({ name: "Sugar snacking", category: "food", target_behavior: "Avoid candy after lunch" })
    .expect(201);
  assert.equal(createdHabit.body.habit.name, "Sugar snacking", "demo mode should create real habits");

  const habits = await request(app).get("/api/habits").expect(200);
  assert.equal(habits.body.habits.length, 2, "created habit should be listed for the demo user");

  db.close();
  fs.rmSync(tempDir, { recursive: true, force: true });

  console.log("All UrgeWise tests passed.");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
