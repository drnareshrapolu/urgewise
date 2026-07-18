import crypto from "node:crypto";

export type Habit = {
  id: string;
  user_id: string;
  name: string;
  category: string;
  target_behavior: string;
  created_at: string;
};

export type HabitLog = {
  id: string;
  habit_id: string;
  timestamp: string;
  status: "relapse" | "resisted" | "neutral";
  note: string | null;
  mood: string | null;
  urge_level: number | null;
  trigger: string | null;
  context: string | null;
  timezone: string | null;
  created_at: string;
};

export type InsightContext = {
  habit: Pick<Habit, "name" | "category" | "target_behavior">;
  generated_at: string;
  window_days: number;
  current_streak_days: number;
  totals: {
    logs: number;
    relapses: number;
    resisted: number;
    neutral: number;
  };
  trend: "improving" | "worsening" | "steady" | "not_enough_data";
  top_relapse_hour: string | null;
  top_trigger: string | null;
  top_context: string | null;
  average_urge_level: number | null;
  recent_logs: Array<{
    timestamp: string;
    status: HabitLog["status"];
    note: string | null;
    mood: string | null;
    urge_level: number | null;
    trigger: string | null;
    context: string | null;
  }>;
};

function daysBetween(a: Date, b: Date): number {
  return Math.max(0, Math.floor((a.getTime() - b.getTime()) / 86_400_000));
}

function mostFrequent(values: Array<string | null | undefined>): string | null {
  const counts = new Map<string, number>();
  for (const value of values) {
    const cleaned = value?.trim();
    if (!cleaned) continue;
    counts.set(cleaned, (counts.get(cleaned) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

function topRelapseHour(logs: HabitLog[]): string | null {
  const relapseHours = logs
    .filter((log) => log.status === "relapse")
    .map((log) => new Date(log.timestamp).getHours().toString().padStart(2, "0"));
  const hour = mostFrequent(relapseHours);
  return hour ? `${hour}:00-${hour}:59` : null;
}

export function computeInsightContext(habit: Habit, logs: HabitLog[], now = new Date()): InsightContext {
  const cutoff = new Date(now.getTime() - 30 * 86_400_000);
  const scopedLogs = logs
    .map((log) => ({ log, time: new Date(log.timestamp).getTime() }))
    .filter((entry) => entry.time >= cutoff.getTime())
    .sort((a, b) => b.time - a.time)
    .map((entry) => entry.log);

  const relapseLogs = scopedLogs.filter((log) => log.status === "relapse");
  const resistedLogs = scopedLogs.filter((log) => log.status === "resisted");
  const neutralLogs = scopedLogs.filter((log) => log.status === "neutral");
  const latestRelapse = relapseLogs[0];
  const earliestScopedLog = scopedLogs.at(-1);
  const streakStart = latestRelapse?.timestamp ?? earliestScopedLog?.timestamp ?? habit.created_at;
  const currentStreakDays = daysBetween(now, new Date(streakStart));

  const sevenDaysAgo = new Date(now.getTime() - 7 * 86_400_000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 86_400_000);
  const recentRelapses = relapseLogs.filter((log) => new Date(log.timestamp) >= sevenDaysAgo).length;
  const previousRelapses = relapseLogs.filter((log) => {
    const date = new Date(log.timestamp);
    return date >= fourteenDaysAgo && date < sevenDaysAgo;
  }).length;

  const trend =
    scopedLogs.length < 4
      ? "not_enough_data"
      : recentRelapses < previousRelapses
        ? "improving"
        : recentRelapses > previousRelapses
          ? "worsening"
          : "steady";

  const urgeValues = scopedLogs
    .map((log) => log.urge_level)
    .filter((value): value is number => typeof value === "number");
  const averageUrge = urgeValues.length
    ? Math.round((urgeValues.reduce((sum, value) => sum + value, 0) / urgeValues.length) * 10) / 10
    : null;

  return {
    habit: {
      name: habit.name,
      category: habit.category,
      target_behavior: habit.target_behavior
    },
    generated_at: now.toISOString(),
    window_days: 30,
    current_streak_days: currentStreakDays,
    totals: {
      logs: scopedLogs.length,
      relapses: relapseLogs.length,
      resisted: resistedLogs.length,
      neutral: neutralLogs.length
    },
    trend,
    top_relapse_hour: topRelapseHour(scopedLogs),
    top_trigger: mostFrequent(relapseLogs.map((log) => log.trigger)),
    top_context: mostFrequent(relapseLogs.map((log) => log.context)),
    average_urge_level: averageUrge,
    recent_logs: scopedLogs.slice(0, 12).map((log) => ({
      timestamp: log.timestamp,
      status: log.status,
      note: log.note,
      mood: log.mood,
      urge_level: log.urge_level,
      trigger: log.trigger,
      context: log.context
    }))
  };
}

export function hashContext(context: unknown): string {
  return crypto.createHash("sha256").update(JSON.stringify(context)).digest("hex");
}

export function triggeredBy(context: InsightContext): string {
  if (context.top_trigger) {
    return `${context.totals.relapses} relapses in ${context.window_days} days; top trigger: ${context.top_trigger}`;
  }
  if (context.top_relapse_hour) {
    return `${context.totals.relapses} relapses in ${context.window_days} days; common hour: ${context.top_relapse_hour}`;
  }
  if (context.totals.logs === 0) return "No logs yet";
  return `${context.totals.logs} logged events with ${context.current_streak_days}-day current streak`;
}
