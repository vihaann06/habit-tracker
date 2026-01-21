import { FormEvent, useMemo, useState } from "react";
import { SupabaseClient } from "@supabase/supabase-js";
import { Habit } from "@/types";

type HabitFormProps = {
  supabase: SupabaseClient;
  userId: string;
  onCreated: (habit: Habit) => void;
  onDone?: () => void;
};

const presetColors = ["#22c55e", "#16a34a", "#0ea5e9", "#6366f1", "#f97316", "#ef4444", "#eab308"];

const HabitForm = ({ supabase, userId, onCreated, onDone }: HabitFormProps) => {
  const [title, setTitle] = useState("");
  const [color, setColor] = useState(presetColors[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const colorOptions = useMemo(() => presetColors, []);

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
      onDone?.();
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
      <div className="field">
        <span>Color</span>
        <div className="color-grid">
          {colorOptions.map((option) => (
            <button
              type="button"
              key={option}
              aria-label={`Choose color ${option}`}
              className={`color-swatch ${color === option ? "selected" : ""}`}
              style={{ backgroundColor: option }}
              onClick={() => setColor(option)}
            />
          ))}
        </div>
      </div>
      <div className="stack row">
        <button className="button primary" type="submit" disabled={loading || !title}>
          {loading ? "Saving..." : "Create habit"}
        </button>
        {onDone && (
          <button className="button ghost" type="button" onClick={onDone} disabled={loading}>
            Cancel
          </button>
        )}
      </div>
      {error && <p className="muted">{error}</p>}
    </form>
  );
};

export default HabitForm;

