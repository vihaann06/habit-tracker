import { useMemo } from "react";
import { Habit, HabitLog } from "@/types";

type HabitGridProps = {
  habit: Habit;
  logs: HabitLog[];
  year: number;
  onToggle: (dateISO: string, nextCompleted: boolean) => void;
};

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

const HabitGrid = ({ habit, logs, year, onToggle }: HabitGridProps) => {
  const calendar = useMemo(() => buildCalendar(year), [year]);
  const logMap = useMemo(() => {
    const map = new Map<string, HabitLog>();
    logs.forEach((log) => map.set(log.date, log));
    return map;
  }, [logs]);

  const weeks = useMemo(() => {
    const maxWeek = Math.max(...calendar.map((day) => day.weekIndex));
    return Array.from({ length: maxWeek + 1 }, (_, weekIndex) =>
      calendar.filter((day) => day.weekIndex === weekIndex),
    );
  }, [calendar]);

  return (
    <div className="grid-card">
      <div className="grid-card__header">
        <div>
          <p className="eyebrow">Habit</p>
          <h3 className="card-title">{habit.title}</h3>
        </div>
        <div className="chip small">{year}</div>
      </div>

      <div className="habit-grid" role="grid" aria-label={`${habit.title} streak view`}>
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="week-column" role="row">
            {week.map((day) => {
              const log = logMap.get(day.iso);
              const completed = Boolean(log?.completed);
              return (
                <button
                  key={day.iso}
                  role="gridcell"
                  aria-label={`${day.iso} ${completed ? "completed" : "not completed"}`}
                  className={[
                    "day-cell",
                    completed ? "completed" : "",
                    day.isToday ? "today" : "",
                  ]
                    .join(" ")
                    .trim()}
                  style={
                    completed
                      ? {
                          backgroundColor: habit.color ?? "#22c55e",
                          borderColor: habit.color ?? "#16a34a",
                        }
                      : undefined
                  }
                  onClick={() => onToggle(day.iso, !completed)}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

export default HabitGrid;

