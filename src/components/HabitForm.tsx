import { FormEvent, useState } from "react";
import { SupabaseClient } from "@supabase/supabase-js";
import { Habit } from "@/types";

type HabitFormProps = {
  supabase: SupabaseClient;
  userId: string;
  onCreated: (habit: Habit) => void;
};

const HabitForm = ({ supabase, userId, onCreated }: HabitFormProps) => {
  const [title, setTitle] = useState("");
  const [color, setColor] = useState("#22c55e");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error: insertError } = await supabase
      .from("habits")
      .insert({ title, color, user_id: userId })
      .select()
      .single();

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    if (data) {
      onCreated(data as Habit);
      setTitle("");
    }
    setLoading(false);
  };

  return (
    <form className="stack" onSubmit={handleSubmit}>
      <label className="field">
        <span>Habit name</span>
        <input
          type="text"
          required
          value={title}
          placeholder="Drink water"
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>
      <label className="field">
        <span>Color</span>
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          title="Color used in the grid"
        />
      </label>
      <button className="button primary" type="submit" disabled={loading || !title}>
        {loading ? "Saving..." : "Create habit"}
      </button>
      {error && <p className="muted">{error}</p>}
    </form>
  );
};

export default HabitForm;

