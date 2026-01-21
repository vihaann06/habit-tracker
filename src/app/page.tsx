"use client";

import { useEffect, useMemo, useState } from "react";
import { Session } from "@supabase/supabase-js";
import AuthPanel from "@/components/AuthPanel";
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

  const currentYear = new Date().getFullYear();
  const missingEnv = !supabase;

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

  return (
    <main className="page">
      <header className="header">
        <div>
          <p className="eyebrow">Habit tracker</p>
          <h1 className="title">Stay consistent every day</h1>
          <p className="muted">
            Supabase auth + GitHub-style grid to visualize your streaks for the whole year.
          </p>
        </div>
        {session?.user && supabase && (
          <button className="button ghost" onClick={handleSignOut}>
            Sign out
          </button>
        )}
      </header>

      <div className="card-row">
        <AuthPanel supabase={supabase} onSession={setSession} />
        <div className="card">
          <div className="card-header">
            <div>
              <p className="eyebrow">Habits</p>
              <h2 className="card-title">Create a new habit</h2>
            </div>
            <div className="chip">Year {currentYear}</div>
          </div>
          {session?.user && supabase ? (
            <HabitForm
              supabase={supabase}
              userId={session.user.id}
              onCreated={handleHabitCreated}
            />
          ) : (
            <p className="muted">Sign in to create and track your habits.</p>
          )}
        </div>
      </div>

      {error && (
        <div className="card">
          <p className="muted">Error: {error}</p>
        </div>
      )}

      {session?.user && supabase ? (
        habitsForYear.length > 0 ? (
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
          <div className="card">
            <p className="muted">No habits yet. Create one to start tracking.</p>
          </div>
        )
      ) : (
        <div className="card">
          <p className="muted">
            {missingEnv
              ? "Add your Supabase URL and anon key to .env.local to get started."
              : "Sign in to see your yearly grid."}
          </p>
        </div>
      )}

      <footer>
        <p className="muted">
          Data model: tables <code>habits</code> and <code>habit_logs</code> with auth enabled via
          Supabase RLS.
        </p>
      </footer>
    </main>
  );
};

export default HomePage;

