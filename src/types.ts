export type User = {
  id: string;
  email: string;
};

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
  habit?: Pick<Habit, "name" | "category" | "target_behavior">;
  generated_at: string;
  window_days?: number;
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
  recent_logs: HabitLog[];
};

export type Insight = {
  content: string;
  model_used: string;
  generated_at: string;
  triggered_by: string;
  source_context_hash: string;
  is_cached: boolean;
  source_context: InsightContext;
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  created_at?: string;
};
