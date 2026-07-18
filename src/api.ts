async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {})
    },
    ...options
  });

  const responseCopy = response.clone();
  const payload = await response.json().catch(async () => {
    const text = await responseCopy.text().catch(() => "");
    return { error: text || response.statusText };
  });
  if (!response.ok) {
    throw new Error(payload.error ? `${response.status}: ${payload.error}` : `${response.status}: Request failed`);
  }
  return payload as T;
}

export const api = {
  habits: () => request<{ habits: import("./types").Habit[] }>("/api/habits"),
  createHabit: (habit: { name: string; category: string; target_behavior: string }) =>
    request<{ habit: import("./types").Habit }>("/api/habits", {
      method: "POST",
      body: JSON.stringify(habit)
    }),
  logs: (habitId: string) => request<{ logs: import("./types").HabitLog[] }>(`/api/habits/${habitId}/logs`),
  createLog: (habitId: string, log: Record<string, unknown>) =>
    request<{ log: import("./types").HabitLog }>(`/api/habits/${habitId}/logs`, {
      method: "POST",
      body: JSON.stringify(log)
    }),
  summary: (habitId: string) =>
    request<{
      habit: import("./types").Habit;
      context: import("./types").InsightContext;
      latestNudge?: Pick<import("./types").Insight, "content" | "generated_at" | "triggered_by" | "is_cached">;
    }>(`/api/habits/${habitId}/summary`),
  insight: (habitId: string, force = false) =>
    request<{ insight: import("./types").Insight }>(`/api/habits/${habitId}/insights`, {
      method: "POST",
      body: JSON.stringify({ force })
    }),
  chat: (habitId: string) => request<{ messages: import("./types").ChatMessage[] }>(`/api/habits/${habitId}/chat`),
  sendChat: (habitId: string, content: string) =>
    request<{ reply: string; safety: boolean }>(`/api/habits/${habitId}/chat`, {
      method: "POST",
      body: JSON.stringify({ content })
    })
};
