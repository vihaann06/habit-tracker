"use client";

import { FormEvent, useEffect, useState } from "react";
import { AuthChangeEvent, Session, SupabaseClient } from "@supabase/supabase-js";

type AuthPanelProps = {
  supabase: SupabaseClient | null;
  onSession: (session: Session | null) => void;
};

const AuthPanel = ({ supabase, onSession }: AuthPanelProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth
      .getSession()
      .then(({ data: sessionData }: { data: { session: Session | null } }) =>
        onSession(sessionData.session ?? null),
      );
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => onSession(session),
    );
    return () => authListener?.subscription.unsubscribe();
  }, [supabase, onSession]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) return;
    setLoading(true);
    setMessage(null);

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage("Check your email to confirm the sign-up link.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to authenticate.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <p className="eyebrow">Auth</p>
          <h2 className="card-title">
            {mode === "signin" ? "Sign in" : "Create an account"}
          </h2>
        </div>
        <div className="chip">Supabase</div>
      </div>
      <form className="stack" onSubmit={handleSubmit}>
        <label className="field">
          <span>Email</span>
          <input
            type="email"
            required
            value={email}
            placeholder="you@example.com"
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            type="password"
            required
            value={password}
            placeholder="••••••••"
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <div className="stack row">
          <button className="button primary" type="submit" disabled={loading || !supabase}>
            {loading ? "Working..." : mode === "signin" ? "Sign in" : "Sign up"}
          </button>
          <button
            className="button ghost"
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          >
            {mode === "signin" ? "Need an account?" : "Already have an account?"}
          </button>
        </div>
        {message && <p className="muted">{message}</p>}
        {!supabase && (
          <p className="muted">
            Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
            <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to continue.
          </p>
        )}
      </form>
    </div>
  );
};

export default AuthPanel;

