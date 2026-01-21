"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AuthChangeEvent, Session } from "@supabase/supabase-js";
import HabitForm from "@/components/HabitForm";
import HabitGrid from "@/components/HabitGrid";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { Habit, HabitLog } from "@/types";

const supabase = getSupabaseClient();

const HomePage = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isHabitModalOpen, setHabitModalOpen] = useState(false);
  const [view, setView] = useState<"today" | "streaks">("streaks");

  const currentYear = new Date().getFullYear();
  const missingEnv = !supabase;
  const todayISO = useMemo(() => new Date().toISOString().slice(0, 10), []);

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
    setHabitModalOpen(false);
  };

  const handleSignOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setHabits([]);
    setLogs([]);
  };

  const habitsForYear = useMemo(
    () => habits.map((habit) => ({
      habit,
      logs: logs.filter(
        (log) => log.habit_id === habit.id && log.date.startsWith(String(currentYear)),
      ),
    })),
    [habits, logs, currentYear],
  );

  const todayList = useMemo(
    () =>
      habits.map((habit) => {
        const todayLog = logs.find((log) => log.habit_id === habit.id && log.date === todayISO);
        return { habit, completed: Boolean(todayLog?.completed) };
      }),
    [habits, logs, todayISO],
  );

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
      ) : (
        <>
          {habitsForYear.length > 0 ? (
            <div className="habits-list">
              {habitsForYear.map(({ habit, logs: habitLogs }) => (
                <HabitGrid
                  key={habit.id}
                  habit={habit}
                  logs={habitLogs}
                  year={currentYear}
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

