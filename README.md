# Habit Tracker (Supabase + Next.js)

Track daily habits with Supabase auth and a GitHub-style yearly grid.

## Features
- Supabase email/password sign-in & sign-up.
- Create habits with color coding.
- Year-long grid per habit that shows daily completion (GitHub contribution style).
- Click any day to toggle completion; data is persisted in Supabase.

## Quick start
1) Copy `env.example` to `.env.local` and fill your Supabase values:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```
2) Install deps and run the app:
```
npm install
npm run dev
```
3) Open http://localhost:3000, sign up/in, create a habit, and start toggling days in the grid.

## Supabase schema
Run the SQL below in the Supabase SQL editor:
```sql
create table public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  title text not null,
  color text,
  created_at timestamptz default now()
);

create table public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid references public.habits(id) on delete cascade,
  date date not null,
  completed boolean default false,
  inserted_at timestamptz default now(),
  constraint habit_logs_unique unique (habit_id, date)
);

alter table public.habits enable row level security;
alter table public.habit_logs enable row level security;

-- Only allow owners to read/write their habits
create policy "Habits select" on public.habits
  for select using (auth.uid() = user_id);
create policy "Habits insert" on public.habits
  for insert with check (auth.uid() = user_id);
create policy "Habits update" on public.habits
  for update using (auth.uid() = user_id);
create policy "Habits delete" on public.habits
  for delete using (auth.uid() = user_id);

-- Logs policy: must belong to the user's habit
create policy "Logs select" on public.habit_logs
  for select using (
    exists (
      select 1 from public.habits h
      where h.id = habit_logs.habit_id and h.user_id = auth.uid()
    )
  );

create policy "Logs insert" on public.habit_logs
  for insert with check (
    exists (
      select 1 from public.habits h
      where h.id = habit_logs.habit_id and h.user_id = auth.uid()
    )
  );

create policy "Logs update" on public.habit_logs
  for update using (
    exists (
      select 1 from public.habits h
      where h.id = habit_logs.habit_id and h.user_id = auth.uid()
    )
  );

create policy "Logs delete" on public.habit_logs
  for delete using (
    exists (
      select 1 from public.habits h
      where h.id = habit_logs.habit_id and h.user_id = auth.uid()
    )
  );
```

## Notes
- The grid shows the current year and scrolls horizontally by weeks (like GitHub contributions).
- Day cells are clickable to toggle completion; today is outlined.
- You can safely style further via `src/app/globals.css`.