import { useEffect, useMemo, useRef, useState } from "react";
import PeriodSelect, { PeriodValue } from "@/components/PeriodSelect";
import { Habit, HabitLog } from "@/types";

type HabitGridProps = {
  habit: Habit;
  logs: HabitLog[];
  year?: number;
  calendar?: CalendarDay[];
  periodValue?: PeriodValue;
  periodOptions?: PeriodValue[];
  onPeriodChange?: (value: PeriodValue) => void;
  onToggle: (dateISO: string, nextCompleted: boolean) => void;
  readOnly?: boolean;
  onRename?: (habit: Habit) => void;
  onDelete?: (habit: Habit) => void;
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

const HabitGrid = ({
  habit,
  logs,
  year,
  calendar,
  periodValue,
  periodOptions,
  onPeriodChange,
  onToggle,
  readOnly = false,
  onRename,
  onDelete,
}: HabitGridProps) => {
  const calendarDays = useMemo(
    () => calendar ?? buildCalendar(year ?? new Date().getFullYear()),
    [calendar, year],
  );
  const logMap = useMemo(() => {
    const map = new Map<string, HabitLog>();
    logs.forEach((log) => map.set(log.date, log));
    return map;
  }, [logs]);

  const weeks = useMemo(() => {
    const maxWeek = Math.max(...calendarDays.map((day) => day.weekIndex));
    return Array.from({ length: maxWeek + 1 }, (_, weekIndex) =>
      calendarDays.filter((day) => day.weekIndex === weekIndex),
    );
  }, [calendarDays]);

  const renderSelector = onPeriodChange && periodOptions && periodOptions.length > 0;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="grid-card">
      <div className="grid-card__header">
        <div>
          <p className="eyebrow">Habit</p>
          <h3 className="card-title">{habit.title}</h3>
        </div>
        <div className="grid-card__actions">
          {renderSelector ? (
            <PeriodSelect
              size="small"
              value={periodValue ?? "last-365"}
              options={periodOptions ?? []}
              onChange={(val) => onPeriodChange?.(val)}
            />
          ) : year ? (
            <div className="chip small">{year}</div>
          ) : null}
          {(onRename || onDelete) && (
            <div className="menu" ref={menuRef}>
              <button className="menu-trigger ghost" type="button" onClick={() => setMenuOpen((v) => !v)}>
                ⋮
              </button>
              {menuOpen && (
                <div className="menu-items">
                  {onRename && (
                    <button className="menu-item" type="button" onClick={() => onRename(habit)}>
                      Rename
                    </button>
                  )}
                  {onDelete && (
                    <button className="menu-item danger" type="button" onClick={() => onDelete(habit)}>
                      Delete
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="habit-grid-wrapper">
        <div className="weekday-legend" aria-hidden="true">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <span key={d} className="weekday-label">
              {d}
            </span>
          ))}
        </div>
        <div className="habit-grid" role="grid" aria-label={`${habit.title} streak view`}>
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="week-column" role="row">
              {Array.from({ length: 7 }, (_, dayIdx) => {
                const day = week.find((d) => d.dayOfWeek === dayIdx);
                if (!day) {
                  return <span key={`empty-${weekIndex}-${dayIdx}`} className="day-cell placeholder" aria-hidden="true" />;
                }
                const log = logMap.get(day.iso);
                const completed = Boolean(log?.completed);
                const tooltipLabel = day.date.toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                });
                return (
                  <button
                    key={day.iso}
                    role="gridcell"
                    title={tooltipLabel}
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
                    disabled={readOnly}
                    onClick={!readOnly ? () => onToggle(day.iso, !completed) : undefined}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HabitGrid;

