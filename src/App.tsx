import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BrainCircuit,
  CalendarCheck,
  Loader2,
  LogOut,
  MessageCircle,
  Plus,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  TimerReset,
  Target,
  TrendingUp
} from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "./api";
import { AuthScreen, SessionLoading } from "./AuthScreen";
import type { ChatMessage, Habit, HabitLog, Insight, InsightContext, User } from "./types";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [activeHabitId, setActiveHabitId] = useState("");
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [context, setContext] = useState<InsightContext | null>(null);
  const [insight, setInsight] = useState<Insight | null>(null);
  const [latestNudge, setLatestNudge] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [checkingSession, setCheckingSession] = useState(true);
  const [habitLoading, setHabitLoading] = useState(false);
  const [urgeLevel, setUrgeLevel] = useState(5);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const activeHabit = habits.find((habit) => habit.id === activeHabitId) ?? null;

  useEffect(() => {
    api
      .me()
      .then(({ user }) => setUser(user))
      .catch(() => undefined)
      .finally(() => setCheckingSession(false));
  }, []);

  useEffect(() => {
    if (!user) return;
    void loadHabits();
  }, [user?.id]);

  useEffect(() => {
    if (!activeHabitId) return;
    void loadHabitData(activeHabitId);
  }, [activeHabitId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy]);

  async function loadHabits() {
    try {
      const { habits } = await api.habits();
      setHabits(habits);
      setActiveHabitId((current) => current || habits[0]?.id || "");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Habit loading failed");
    }
  }

  async function loadHabitData(habitId: string) {
    setError("");
    setHabitLoading(true);
    try {
      const [logResult, summaryResult, chatResult] = await Promise.all([api.logs(habitId), api.summary(habitId), api.chat(habitId)]);
      setLogs(logResult.logs);
      setContext(summaryResult.context);
      setLatestNudge(summaryResult.latestNudge?.content ?? "");
      setMessages(chatResult.messages);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Habit data loading failed");
    } finally {
      setHabitLoading(false);
    }
  }

  async function handleAuth(email: string, password: string, mode: "login" | "signup") {
    setBusy(mode);
    setError("");
    try {
      const result = mode === "login" ? await api.login(email, password) : await api.signup(email, password);
      setUser(result.user);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Authentication failed");
    } finally {
      setBusy("");
    }
  }

  async function logout() {
    setBusy("logout");
    try {
      await api.logout();
    } finally {
      setUser(null);
      setHabits([]);
      setActiveHabitId("");
      setLogs([]);
      setMessages([]);
      setContext(null);
      setInsight(null);
      setLatestNudge("");
      setError("");
      setBusy("");
    }
  }

  async function addHabit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setBusy("habit");
    setError("");
    try {
      const { habit } = await api.createHabit({
        name: String(form.get("name")),
        category: String(form.get("category") || "general"),
        target_behavior: String(form.get("target_behavior"))
      });
      formElement.reset();
      setHabits((items) => [habit, ...items]);
      setActiveHabitId(habit.id);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Habit creation failed");
    } finally {
      setBusy("");
    }
  }

  async function addLog(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeHabitId) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setBusy("log");
    setError("");
    try {
      await api.createLog(activeHabitId, {
        timestamp: new Date().toISOString(),
        status: String(form.get("status")),
        note: String(form.get("note") || ""),
        mood: String(form.get("mood") || ""),
        urge_level: Number(form.get("urge_level")),
        trigger: String(form.get("trigger") || ""),
        context: String(form.get("context") || ""),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      });
      formElement.reset();
      await loadHabitData(activeHabitId);
      setUrgeLevel(5);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Log entry failed");
    } finally {
      setBusy("");
    }
  }

  async function generate(force = false) {
    if (!activeHabitId) return;
    setBusy(force ? "regenerate" : "insight");
    setError("");
    try {
      const { insight } = await api.insight(activeHabitId, force);
      setInsight(insight);
      setLatestNudge(insight.content);
    } catch (error) {
      setError(error instanceof Error ? error.message : "AI insight failed");
    } finally {
      setBusy("");
    }
  }

  async function sendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeHabitId) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const content = String(form.get("message") || "").trim();
    if (!content) return;
    formElement.reset();
    await sendChatContent(content);
  }

  async function sendChatContent(content: string) {
    if (!activeHabitId || !content.trim()) return;
    setMessages((items) => [...items, { role: "user", content }]);
    setBusy("chat");
    setError("");
    try {
      const { reply } = await api.sendChat(activeHabitId, content);
      setMessages((items) => [...items, { role: "assistant", content: reply }]);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Coach reply failed");
    } finally {
      setBusy("");
    }
  }

  const chartData = useMemo(() => buildChartData(logs), [logs]);

  if (checkingSession) return <SessionLoading />;
  if (!user) return <AuthScreen onSubmit={handleAuth} busy={busy} error={error} />;

  return (
    <main className="min-h-screen bg-paper text-ink">
      <header className="border-b border-stone-200 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-md bg-ink text-white">
              <BrainCircuit size={22} aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">UrgeWise</h1>
              <p className="text-sm text-stone-600">GenAI habit recovery coach</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-stone-600 sm:inline">{user.email}</span>
            <button className="icon-button" onClick={() => void logout()} disabled={busy === "logout"} aria-label="Log out" title="Log out">
              {busy === "logout" ? <Loader2 className="animate-spin" size={18} /> : <LogOut size={18} />}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-6 sm:px-6 lg:grid-cols-[280px_1fr] lg:px-8">
        <aside className="space-y-4">
          <section className="panel">
            <div className="panel-title">
              <Target size={18} />
              <h2>Habits</h2>
            </div>
            <div className="space-y-2">
              {habits.map((habit) => (
                <button
                  key={habit.id}
                  onClick={() => setActiveHabitId(habit.id)}
                  className={`habit-tab ${habit.id === activeHabitId ? "habit-tab-active" : ""}`}
                  aria-pressed={habit.id === activeHabitId}
                >
                  <span className="font-medium">{habit.name}</span>
                  <span className="text-xs text-stone-500">{habit.category}</span>
                </button>
              ))}
              {habits.length === 0 && <p className="empty">No habits yet.</p>}
            </div>
          </section>

          <section className="panel">
            <div className="panel-title">
              <Plus size={18} />
              <h2>New Habit</h2>
            </div>
            <form className="space-y-3" onSubmit={addHabit}>
              <label className="field">
                <span>Name</span>
                <input name="name" placeholder="Evening doomscrolling" required />
              </label>
              <label className="field">
                <span>Category</span>
                <input name="category" placeholder="screen time" />
              </label>
              <label className="field">
                <span>Target behavior</span>
                <textarea name="target_behavior" placeholder="Stop scrolling in bed after 10pm" required />
              </label>
              <button className="primary-button w-full" disabled={busy === "habit"}>
                {busy === "habit" ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
                Create
              </button>
            </form>
          </section>
        </aside>

        <section className="space-y-5">
          {error && (
            <div className={error.includes("API key") ? "info-banner" : "alert"}>
              <AlertTriangle size={18} />
              <span>{error}</span>
            </div>
          )}

          {!activeHabit ? (
            <EmptyDashboard />
          ) : (
            <>
              <section className="hero-band">
                <div>
                  <p className="eyebrow">Active habit</p>
                  <h2>{activeHabit.name}</h2>
                  <p>{activeHabit.target_behavior}</p>
                </div>
                <button
                  className="primary-button"
                  onClick={() => generate(false)}
                  disabled={busy === "insight" || busy === "regenerate"}
                  aria-busy={busy === "insight"}
                >
                  {busy === "insight" ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
                  {busy === "insight" ? "Generating..." : "Generate Insight"}
                </button>
              </section>

              {habitLoading && (
                <div className="info-banner">
                  <Loader2 className="animate-spin" size={18} />
                  <span>Refreshing habit data...</span>
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-4">
                <Metric icon={<CalendarCheck size={18} />} label="Current streak" value={`${context?.current_streak_days ?? 0}d`} />
                <Metric icon={<Activity size={18} />} label="Logs" value={String(context?.totals.logs ?? 0)} />
                <Metric icon={<TrendingUp size={18} />} label="Trend" value={context?.trend.replaceAll("_", " ") ?? "none"} />
                <Metric icon={<ShieldCheck size={18} />} label="Top trigger" value={context?.top_trigger ?? "none yet"} />
              </div>

              <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
                <section className="panel min-h-[360px]">
                  <div className="panel-title">
                    <TrendingUp size={18} />
                    <h2>Behavior Trend</h2>
                  </div>
                  {chartData.length ? (
                    <>
                      <ResponsiveContainer width="100%" height={280}>
                        <AreaChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e7e0d3" />
                          <XAxis dataKey="day" tickLine={false} axisLine={false} />
                          <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                          <Tooltip />
                          <Area type="monotone" dataKey="resisted" stackId="1" stroke="#1f9d7a" fill="#8bd8c2" />
                          <Area type="monotone" dataKey="relapse" stackId="1" stroke="#df6b57" fill="#f2a095" />
                          <Area type="monotone" dataKey="neutral" stackId="1" stroke="#3b5f7f" fill="#9fb9ce" />
                        </AreaChart>
                      </ResponsiveContainer>
                      <ChartTextSummary context={context} />
                    </>
                  ) : (
                    <p className="empty">No logs yet.</p>
                  )}
                </section>

                <section className="panel">
                  <div className="panel-title">
                    <Sparkles size={18} />
                    <h2>AI Insight</h2>
                  </div>
                  <div className="insight-box">
                    <p aria-live="polite">
                      {busy === "insight" ? "Gemini is analyzing your habit pattern..." : insight?.content || latestNudge || "No AI insight generated yet."}
                    </p>
                    {(insight || latestNudge) && (
                      <p className="mt-3 text-xs text-stone-500">
                        {insight?.is_cached ? "Cached" : "Generated"} {formatDate(insight?.generated_at)}
                      </p>
                    )}
                  </div>
                  <button
                    className="secondary-button mt-3 w-full"
                    onClick={() => generate(true)}
                    disabled={busy === "regenerate"}
                    aria-busy={busy === "regenerate"}
                  >
                    {busy === "regenerate" ? <Loader2 className="animate-spin" size={16} /> : <RefreshCcw size={16} />}
                    {busy === "regenerate" ? "Regenerating..." : "Regenerate"}
                  </button>
                </section>
              </div>

              <div className="grid gap-5 xl:grid-cols-[390px_1fr]">
                <section className="panel">
                  <div className="panel-title">
                    <Plus size={18} />
                    <h2>Log Now</h2>
                  </div>
                  <form className="space-y-3" onSubmit={addLog}>
                    <label className="field">
                      <span>Status</span>
                      <select name="status" defaultValue="resisted">
                        <option value="resisted">Resisted</option>
                        <option value="relapse">Relapse</option>
                        <option value="neutral">Neutral</option>
                      </select>
                    </label>
                    <label className="field">
                      <span>Urge level: {urgeLevel}/10</span>
                      <input
                        name="urge_level"
                        type="range"
                        min="1"
                        max="10"
                        value={urgeLevel}
                        aria-valuetext={`${urgeLevel} out of 10`}
                        onChange={(event) => setUrgeLevel(Number(event.target.value))}
                      />
                    </label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="field">
                        <span>Mood</span>
                        <input name="mood" placeholder="tired" />
                      </label>
                      <label className="field">
                        <span>Trigger</span>
                        <input name="trigger" placeholder="work stress" />
                      </label>
                    </div>
                    <label className="field">
                      <span>Context</span>
                      <input name="context" placeholder="bedroom, sofa, commute" />
                    </label>
                    <label className="field">
                      <span>Note</span>
                      <textarea name="note" placeholder="What happened?" />
                    </label>
                    <button className="primary-button w-full" disabled={busy === "log"}>
                      {busy === "log" ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
                      Save Log
                    </button>
                  </form>
                </section>

                <section className="panel">
                  <div className="panel-title">
                    <MessageCircle size={18} />
                    <h2>Coach Chat</h2>
                  </div>
                  <div className="quick-prompts">
                    {["I'm feeling a trigger", "Help me reframe a thought", "Give me a 2-minute reset"].map((prompt) => (
                      <button key={prompt} type="button" onClick={() => void sendChatContent(prompt)} disabled={busy === "chat"} aria-pressed="false">
                        {prompt}
                      </button>
                    ))}
                  </div>
                  <div className="chat-window">
                    {messages.map((message, index) => (
                      <div key={`${message.role}-${index}`} className={`bubble ${message.role === "assistant" ? "bubble-ai" : "bubble-user"}`}>
                        {message.content}
                      </div>
                    ))}
                    {messages.length === 0 && <p className="empty">No coaching conversation yet.</p>}
                    <div ref={chatEndRef} />
                  </div>
                  <form className="mt-3 flex gap-2" onSubmit={sendMessage}>
                    <label className="sr-only" htmlFor="message">
                      Message
                    </label>
                    <input id="message" name="message" className="min-w-0 flex-1" placeholder="Ask about the latest pattern..." />
                    <button className="icon-button bg-ink text-white" disabled={busy === "chat"} aria-label="Send message">
                      {busy === "chat" ? <Loader2 className="animate-spin" size={18} /> : <MessageCircle size={18} />}
                    </button>
                  </form>
                </section>
              </div>

              <div className="grid gap-5 xl:grid-cols-[390px_1fr]">
                <UrgeSurfingPanel />
                <SkillsLibrary />
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <section className="metric">
      <div className="text-steel">{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
    </section>
  );
}

function ChartTextSummary({ context }: { context: InsightContext | null }) {
  if (!context) return null;

  return (
    <dl className="chart-summary" aria-label="Behavior chart totals">
      <div>
        <dt>Resisted</dt>
        <dd>{context.totals.resisted}</dd>
      </div>
      <div>
        <dt>Relapse</dt>
        <dd>{context.totals.relapses}</dd>
      </div>
      <div>
        <dt>Neutral</dt>
        <dd>{context.totals.neutral}</dd>
      </div>
    </dl>
  );
}

function EmptyDashboard() {
  return (
    <section className="hero-band">
      <div>
        <p className="eyebrow">Start here</p>
        <h2>Create a habit to track</h2>
        <p>No habits yet. Add one from the left panel to begin logging real behavior.</p>
      </div>
    </section>
  );
}

function buildChartData(logs: HabitLog[]) {
  const byDay = new Map<string, { day: string; relapse: number; resisted: number; neutral: number }>();
  for (const log of [...logs].reverse()) {
    if (!["relapse", "resisted", "neutral"].includes(log.status)) continue;
    const day = new Date(log.timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" });
    const row = byDay.get(day) ?? { day, relapse: 0, resisted: 0, neutral: 0 };
    row[log.status] += 1;
    byDay.set(day, row);
  }
  return [...byDay.values()].slice(-14);
}

function UrgeSurfingPanel() {
  const [seconds, setSeconds] = useState(120);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running || seconds <= 0) return;
    const timer = window.setTimeout(() => setSeconds((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [running, seconds]);

  return (
    <section className="panel support-panel">
      <div className="panel-title">
        <TimerReset size={18} />
        <h2>Urge Surfing</h2>
      </div>
      <div className="breathing-circle" aria-hidden="true" />
      <p className="text-sm leading-6 text-stone-700">
        Notice the urge as a wave. Breathe slowly, name what you feel, and let the next two minutes pass before acting.
      </p>
      <button
        className="secondary-button mt-3 w-full"
        onClick={() => {
          setSeconds(120);
          setRunning((value) => !value);
        }}
      >
        <TimerReset size={16} />
        {running ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}` : "Start 2-minute reset"}
      </button>
    </section>
  );
}

function SkillsLibrary() {
  const skills = [
    { title: "STOP Skill", text: "Stop, take a breath, observe the trigger, then proceed with one deliberate next action." },
    { title: "Thought Reframe", text: "Write the automatic thought, name the evidence, and choose a kinder practical replacement." },
    { title: "Values Check", text: "Pick the value this habit blocks, then choose one tiny action aligned with that value today." }
  ];

  return (
    <section className="panel">
      <div className="panel-title">
        <BrainCircuit size={18} />
        <h2>Skills Library</h2>
      </div>
      <div className="skills-grid">
        {skills.map((skill) => (
          <article key={skill.title} className="skill-card">
            <h3>{skill.title}</h3>
            <p>{skill.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function formatDate(value?: string) {
  if (!value) return "";
  return new Date(value).toLocaleString();
}
