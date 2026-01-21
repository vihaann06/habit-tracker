"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthChangeEvent, Session } from "@supabase/supabase-js";
import AuthPanel from "@/components/AuthPanel";
import { getSupabaseClient } from "@/lib/supabaseClient";

const supabase = getSupabaseClient();

const AuthPage = () => {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth
      .getSession()
      .then(({ data }: { data: { session: Session | null } }) => {
        setSession(data.session ?? null);
        if (data.session) router.replace("/");
      });
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, nextSession: Session | null) => {
        setSession(nextSession);
        if (nextSession) router.replace("/");
      },
    );
    return () => listener?.subscription.unsubscribe();
  }, [router]);

  if (!supabase) {
    return (
      <main className="page">
        <h1 className="title">Supabase not configured</h1>
        <p className="muted">
          Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to{" "}
          <code>.env.local</code>, then restart the dev server.
        </p>
      </main>
    );
  }

  return (
    <main className="page">
      <header className="header">
        <div>
          <p className="eyebrow">Welcome back</p>
          <h1 className="title">Sign in or create an account</h1>
          <p className="muted">Secure email login powered by Supabase.</p>
        </div>
        <button className="button ghost" onClick={() => router.push("/")}>
          ← Back to landing
        </button>
      </header>

      <div className="card">
        <AuthPanel supabase={supabase} onSession={setSession} />
      </div>
    </main>
  );
};

export default AuthPage;

