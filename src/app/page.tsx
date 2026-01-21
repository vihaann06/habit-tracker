"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AuthChangeEvent, Session } from "@supabase/supabase-js";
import HabitForm from "@/components/HabitForm";
import HabitGrid from "@/components/HabitGrid";
import PeriodSelect, { PeriodValue } from "@/components/PeriodSelect";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { Habit, HabitLog } from "@/types";

const supabase = getSupabaseClient();

type CalendarDay = {
  date: Date;
  iso: string;
  weekIndex: number;
  dayOfWeek: number;
  isToday: boolean;
};

const buildCalendar = (year: number): CalendarDay[] => {
  const start = new Date(year, 0, 1);
  const end = new Date(year + 1, 0, 1);
  const days: CalendarDay[] = [];
  let weekIndex = 0;

  for (let cursor = new Date(start); cursor < end; cursor.setDate(cursor.getDate() + 1)) {
    const day = new Date(cursor);
    if (day.getDay() === 0 && days.length > 0) {
      weekIndex += 1;
    }
    const iso = day.toISOString().slice(0, 10);
    days.push({
      date: day,
      iso,
      weekIndex,
      dayOfWeek: day.getDay(),
      isToday: iso === new Date().toISOString().slice(0, 10),
    });
  }

  return days;
};

const buildRangeCalendar = (start: Date, endInclusive: Date): CalendarDay[] => {
  const days: CalendarDay[] = [];
  let weekIndex = 0;
  const startCopy = new Date(start);
  startCopy.setHours(0, 0, 0, 0);
  const endCopy = new Date(endInclusive);
  endCopy.setHours(0, 0, 0, 0);

  for (let cursor = new Date(startCopy); cursor <= endCopy; cursor.setDate(cursor.getDate() + 1)) {
    const day = new Date(cursor);
    if (day.getDay() === 0 && days.length > 0) {
      weekIndex += 1;
    }
    const iso = day.toISOString().slice(0, 10);
    days.push({
      date: day,
      iso,
      weekIndex,
      dayOfWeek: day.getDay(),
      isToday: iso === new Date().toISOString().slice(0, 10),
    });
  }

  return days;
};

const getColorForRatio = (ratio: number) => {
  if (ratio <= 0) {
    return { bg: "#e5e7eb", border: "#d1d5db" };
  }
  // Purple ramp for >0% completion with a lighter start
  const hue = 265;
  const saturation = 76;
  const lightHigh = 92; // lightness near 0%
  const lightLow = 38; // lightness at 100%
  const clamped = Math.min(ratio, 1);
  const lightness = lightHigh - (lightHigh - lightLow) * clamped;
  const borderLight = Math.max(lightness - 10, 26);
  return {
    bg: `hsl(${hue}deg ${saturation}% ${lightness}%)`,
    border: `hsl(${hue}deg ${saturation + 6}% ${borderLight}%)`,
  };
};

const HomePage = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isHabitModalOpen, setHabitModalOpen] = useState(false);
  const [view, setView] = useState<"today" | "streaks" | "progress">("streaks");
  const [progressMode, setProgressMode] = useState<PeriodValue>("last-365");
  const [habitPeriods, setHabitPeriods] = useState<Record<string, PeriodValue>>({});

  const currentYear = new Date().getFullYear();
  const missingEnv = !supabase;
  const todayISO = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const todayDate = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth
      .getSession()
      .then(({ data }: { data: { session: Session | null } }) =>
        setSession(data.session ?? null),
      );
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, nextSession: Session | null) => setSession(nextSession),
    );
    return () => listener?.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!supabase || !session?.user) return;
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      const { data: habitsData, error: habitsError } = await supabase
        .from("habits")
        .select("id, title, color, created_at")
        .order("created_at", { ascending: true });

      if (habitsError) {
        setError(habitsError.message);
        setLoading(false);
        return;
      }

      setHabits(habitsData ?? []);

      const { data: logsData, error: logsError } = await supabase
        .from("habit_logs")
        .select("id, habit_id, date, completed");

      if (logsError) {
        setError(logsError.message);
      } else {
        setLogs(logsData ?? []);
      }

      setLoading(false);
    };

    fetchData();
  }, [session?.user?.id, supabase]);

  const toggleLog = async (habitId: string, dateISO: string, nextCompleted: boolean) => {
    if (!supabase) return;
    const { data, error: upsertError } = await supabase
      .from("habit_logs")
      .upsert(
        { habit_id: habitId, date: dateISO, completed: nextCompleted },
        { onConflict: "habit_id,date" },
      )
      .select()
      .single();

    if (upsertError) {
      setError(upsertError.message);
      return;
    }

    if (data) {
      setLogs((prev) => {
        const existingIndex = prev.findIndex(
          (log) => log.habit_id === habitId && log.date === dateISO,
        );
        const nextLogs = [...prev];
        if (existingIndex >= 0) {
          nextLogs[existingIndex] = data as HabitLog;
        } else {
          nextLogs.push(data as HabitLog);
        }
        return nextLogs;
      });
    }
  };

  const handleHabitCreated = (habit: Habit) => {
    setHabits((prev) => [...prev, habit]);
    setHabitPeriods((prev) => ({ ...prev, [habit.id]: "last-365" }));
    setHabitModalOpen(false);
  };

  const handleSignOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setHabits([]);
    setLogs([]);
  };

  const todayList = useMemo(
    () =>
      habits.map((habit) => {
        const todayLog = logs.find((log) => log.habit_id === habit.id && log.date === todayISO);
        return { habit, completed: Boolean(todayLog?.completed) };
      }),
    [habits, logs, todayISO],
  );

  const ratioByDate = useMemo(() => {
    const ratios = new Map<string, number>();
    if (habits.length === 0) return ratios;
    const total = habits.length;
    const completedByDate = new Map<string, number>();

    logs.forEach((log) => {
      if (!log.completed) return;
      completedByDate.set(log.date, (completedByDate.get(log.date) ?? 0) + 1);
    });

    completedByDate.forEach((count, date) => ratios.set(date, Math.min(count / total, 1)));
    return ratios;
  }, [habits, logs]);

  const userCreatedYear = useMemo(() => {
    const created = session?.user?.created_at ? new Date(session.user.created_at) : null;
    return created ? created.getFullYear() : currentYear;
  }, [session?.user?.created_at, currentYear]);

  const periodOptions = useMemo(
    () => [
      "last-365" as const,
      ...Array.from({ length: currentYear - userCreatedYear + 1 }, (_, idx) => currentYear - idx),
    ],
    [currentYear, userCreatedYear],
  );

  const getRangeForPeriod = (period: "last-365" | number) => {
    if (period === "last-365") {
      const endMs = todayDate.getTime();
      const startDate = new Date(todayDate);
      startDate.setDate(startDate.getDate() - 364);
      return { startMs: startDate.getTime(), endMs };
    }
    const startDate = new Date(Number(period), 0, 1);
    const endDate = new Date(Number(period) + 1, 0, 1);
    return { startMs: startDate.getTime(), endMs: endDate.getTime() - 1 };
  };

  const getCalendarForPeriod = (period: "last-365" | number) => {
    if (period === "last-365") {
      const start = new Date(todayDate);
      start.setDate(start.getDate() - 364);
      return buildRangeCalendar(start, todayDate);
    }
    return buildCalendar(period);
  };

  const progressCalendar = useMemo(() => {
    if (progressMode === "last-365") {
      const start = new Date(todayDate);
      start.setDate(start.getDate() - 364);
      return buildRangeCalendar(start, todayDate);
    }
    return buildCalendar(progressMode);
  }, [progressMode, todayDate]);

  const progressWeeksDynamic = useMemo(() => {
    const maxWeek = Math.max(...progressCalendar.map((day) => day.weekIndex));
    return Array.from({ length: maxWeek + 1 }, (_, weekIndex) =>
      progressCalendar.filter((day) => day.weekIndex === weekIndex),
    );
  }, [progressCalendar]);

  const habitsForPeriod = useMemo(() => {
    const makeRange = getRangeForPeriod;
    const makeCalendar = getCalendarForPeriod;
    return habits.map((habit) => {
      const period = habitPeriods[habit.id] ?? "last-365";
      const range = makeRange(period);
      return {
        habit,
        period,
        logs: logs.filter((log) => {
          if (log.habit_id !== habit.id) return false;
          const ms = new Date(log.date).getTime();
          return ms >= range.startMs && ms <= range.endMs;
        }),
        calendar: makeCalendar(period),
      };
    });
  }, [habits, logs, habitPeriods, todayDate]);

  if (!session?.user || !supabase) {
    return (
      <main className="page">
        <header className="header">
          <div>
            <p className="eyebrow">Habit tracker</p>
            <h1 className="title">Stay consistent every day</h1>
            <p className="muted">
              GitHub-style grids that turn your yearly habits into a visual streak.
            </p>
          </div>
          <Link href="/auth" className="button primary">
            Sign in / Sign up
          </Link>
        </header>

        <div className="hero">
          <div className="hero-copy">
            <p className="eyebrow">Why this app</p>
            <h2>Clarity, accountability, and streaks you can see.</h2>
            <p className="muted">
              Create habits, mark days complete, and watch your consistency fill the grid. Securely
              stored with Supabase.
            </p>
            <div className="feature-list">
              <div className="pill">Email login</div>
              <div className="pill">Daily toggle grid</div>
              <div className="pill">Year view</div>
              <div className="pill">Private data</div>
            </div>
            <div className="cta-row">
              <Link href="/auth" className="button primary">
                Get started
              </Link>
              <span className="muted">Sign in to create your first habit.</span>
            </div>
          </div>
          <div className="hero-card card">
            <div className="card-header">
              <div>
                <p className="eyebrow">Preview</p>
                <h3 className="card-title">Yearly streak grid</h3>
              </div>
              <div className="chip">Live sync</div>
            </div>
            <div className="hero-grid-placeholder">
              <div className="grid-legend">
                <span className="pill">Week</span>
                <span className="pill">Today outlined</span>
                <span className="pill">Click to toggle</span>
              </div>
              <div className="placeholder-grid">
                {Array.from({ length: 8 }).map((_, col) => (
                  <div key={col} className="placeholder-week">
                    {Array.from({ length: 7 }).map((_, row) => (
                      <div
                        key={`${col}-${row}`}
                        className={`placeholder-day ${row % 2 === 0 ? "on" : ""}`}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {missingEnv && (
          <div className="card">
            <p className="muted">
              Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>{" "}
              to <code>.env.local</code>, then restart the dev server.
            </p>
          </div>
        )}
      </main>
    );
  }

  return (
    <main className="page">
      <header className="header">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1 className="title">Your habits for {currentYear}</h1>
        </div>
        <div className="stack row">
          <button className="button primary" onClick={handleSignOut}>
            Sign out
          </button>
        </div>
      </header>

      {error && (
        <div className="card">
          <p className="muted">Error: {error}</p>
        </div>
      )}

      <div className="view-tabs">
        <button
          className={`tab ${view === "today" ? "active" : ""}`}
          onClick={() => setView("today")}
        >
          Today&apos;s logs
        </button>
        <button
          className={`tab ${view === "streaks" ? "active" : ""}`}
          onClick={() => setView("streaks")}
        >
          Habit streaks
        </button>
        <button
          className={`tab ${view === "progress" ? "active" : ""}`}
          onClick={() => setView("progress")}
        >
          Track progress
        </button>
      </div>

      {view === "today" ? (
        <div className="card">
          <div className="card-header">
            <div>
              <p className="eyebrow">Today</p>
              <h2 className="card-title">Today&apos;s checklist</h2>
            </div>
            <button className="button primary" onClick={() => setHabitModalOpen(true)}>
              Add habit
            </button>
          </div>
          {habits.length > 0 ? (
            <div className="today-list">
              {todayList.map(({ habit, completed }) => (
                <button
                  key={habit.id}
                  className={`today-item ${completed ? "completed" : ""}`}
                  onClick={() => toggleLog(habit.id, todayISO, !completed)}
                >
                  <span
                    className={`check ${completed ? "on" : ""}`}
                    style={{ borderColor: habit.color ?? "#7c3aed", backgroundColor: completed ? habit.color ?? "#7c3aed" : "transparent" }}
                  />
                  <div className="today-content">
                    <span className="today-item__title">{habit.title}</span>
                    <span className="today-subtext">
                      {completed ? "Completed" : "Tap to mark complete"}
                    </span>
                  </div>
                  <span className={`today-chip ${completed ? "on" : ""}`}>
                    {completed ? "Done" : "Mark"}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="muted">No habits yet. Add one to start tracking today.</p>
          )}
        </div>
      ) : view === "streaks" ? (
        <>
          {habitsForPeriod.length > 0 ? (
            <div className="habits-list">
              {habitsForPeriod.map(({ habit, logs: habitLogs, period, calendar: habitCalendar }) => (
                <HabitGrid
                  key={habit.id}
                  habit={habit}
                  logs={habitLogs}
                  calendar={habitCalendar}
                  periodValue={period}
                  periodOptions={periodOptions}
                  onPeriodChange={(value) =>
                    setHabitPeriods((prev) => ({ ...prev, [habit.id]: value }))
                  }
                  onToggle={(date, nextCompleted) => toggleLog(habit.id, date, nextCompleted)}
                />
              ))}
            </div>
          ) : (
            <div className="card empty-card">
              <div className="stack">
                <h3 className="card-title">No habits yet</h3>
                <p className="muted">Add your first habit to start tracking consistency.</p>
              </div>
              <button className="button primary" onClick={() => setHabitModalOpen(true)}>
                Add habit
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="card">
          <div className="card-header">
            <div>
              <p className="eyebrow">Track progress</p>
              <h2 className="card-title">All habits combined</h2>
            </div>
            <PeriodSelect
              value={progressMode}
              options={periodOptions}
              onChange={(val) => setProgressMode(val)}
            />
          </div>

          <div className="progress-grid" role="grid" aria-label="Yearly combined progress">
            {progressWeeksDynamic.map((week, weekIndex) => (
              <div key={weekIndex} className="week-column" role="row">
                {Array.from({ length: 7 }, (_, dayIdx) => {
                  const day = week.find((d) => d.dayOfWeek === dayIdx);
                  if (!day) {
                    return (
                      <span
                        key={`progress-empty-${weekIndex}-${dayIdx}`}
                        className="day-cell placeholder"
                        aria-hidden="true"
                      />
                    );
                  }
                  const ratio = ratioByDate.get(day.iso) ?? 0;
                  const { bg } = getColorForRatio(ratio);
                  const label = day.date.toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                  });
                  const percent = Math.round(ratio * 100);
                  return (
                    <button
                      key={day.iso}
                      role="gridcell"
                      title={`${label} • ${percent}% of habits`}
                      aria-label={`${day.iso} ${percent} percent of habits`}
                      className={[
                        "day-cell",
                        ratio > 0 ? "completed" : "",
                        day.isToday ? "today" : "",
                      ]
                        .join(" ")
                        .trim()}
                      style={{
                        backgroundColor: bg,
                        borderColor: bg,
                      }}
                      disabled={true}
                    />
                  );
                })}
              </div>
            ))}
          </div>

          <div className="legend-row">
            <div className="legend-dot" style={{ backgroundColor: "#e5e7eb", borderColor: "#d1d5db" }} />
            <span className="muted">No completions</span>
            <div className="legend-dot" style={{ backgroundColor: "hsl(265deg 76% 88%)", borderColor: "hsl(265deg 82% 76%)" }} />
            <span className="muted">Some completions</span>
            <div className="legend-dot" style={{ backgroundColor: "hsl(265deg 76% 42%)", borderColor: "hsl(265deg 82% 34%)" }} />
            <span className="muted">All habits done</span>
          </div>
        </div>
      )}

      {isHabitModalOpen && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal">
            <div className="card-header">
              <div>
                <p className="eyebrow">New habit</p>
                <h3 className="card-title">Create a habit</h3>
              </div>
              <button className="button ghost" onClick={() => setHabitModalOpen(false)}>
                ✕
              </button>
            </div>
            <HabitForm
              supabase={supabase}
              userId={session.user.id}
              onCreated={handleHabitCreated}
              onDone={() => setHabitModalOpen(false)}
            />
          </div>
        </div>
      )}
    </main>
  );
};

export default HomePage;

