export type Habit = {
  id: string;
  title: string;
  color: string | null;
  created_at?: string | null;
};

export type HabitLog = {
  id: string;
  habit_id: string;
  date: string;
  completed: boolean;
};

