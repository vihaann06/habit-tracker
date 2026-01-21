"use client";

import { useEffect, useRef, useState } from "react";

export type PeriodValue = "last-365" | number;

type PeriodSelectProps = {
  value: PeriodValue;
  options: PeriodValue[];
  onChange: (value: PeriodValue) => void;
  size?: "small" | "default";
};

const labelFor = (value: PeriodValue) => (value === "last-365" ? "Last 365 days" : String(value));

const PeriodSelect = ({ value, options, onChange, size = "default" }: PeriodSelectProps) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handle = (event: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const triggerClass = ["select-trigger", size === "small" ? "small" : ""].join(" ").trim();

  return (
    <div className="select-box" ref={ref}>
      <button className={triggerClass} type="button" onClick={() => setOpen((v) => !v)}>
        {labelFor(value)}
        <span className="select-caret">▾</span>
      </button>
      {open && (
        <div className="select-options">
          {options.map((opt) => {
            const isActive = opt === value;
            return (
              <button
                key={opt === "last-365" ? "last-365" : opt}
                className={`select-option ${isActive ? "active" : ""}`}
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
                type="button"
              >
                {labelFor(opt)}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PeriodSelect;

