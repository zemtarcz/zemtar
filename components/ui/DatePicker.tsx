"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

const WEEKDAYS = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"] as const;

const MONTHS = [
  "leden",
  "únor",
  "březen",
  "duben",
  "květen",
  "červen",
  "červenec",
  "srpen",
  "září",
  "říjen",
  "listopad",
  "prosinec",
] as const;

function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseIso(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parts = value.split("-").map(Number);
  const y = parts[0];
  const m = parts[1];
  const d = parts[2];
  if (y === undefined || m === undefined || d === undefined) return null;
  const date = new Date(y, m - 1, d);
  if (
    date.getFullYear() !== y ||
    date.getMonth() !== m - 1 ||
    date.getDate() !== d
  ) {
    return null;
  }
  return date;
}

function formatCs(value: string): string {
  const d = parseIso(value);
  if (!d) return "";
  return new Intl.DateTimeFormat("cs-CZ", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  }).format(d);
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d: Date, delta: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + delta, 1);
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Po=0 … Ne=6 (české pořadí). */
function mondayIndex(d: Date): number {
  return (d.getDay() + 6) % 7;
}

type Props = {
  name: string;
  id?: string;
  defaultValue?: string;
  className?: string;
  required?: boolean;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
  onValueChange?: (iso: string) => void;
};

export function DatePicker({
  name,
  id,
  defaultValue = "",
  className = "",
  required = false,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
  onValueChange,
}: Props) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const initial = parseIso(defaultValue) ?? new Date();
  const [view, setView] = useState(() => startOfMonth(initial));
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const selected = parseIso(value);
  const today = new Date();
  const monthStart = startOfMonth(view);
  const leading = mondayIndex(monthStart);
  const daysInMonth = new Date(
    view.getFullYear(),
    view.getMonth() + 1,
    0,
  ).getDate();

  const cells: Array<Date | null> = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from(
      { length: daysInMonth },
      (_, i) => new Date(view.getFullYear(), view.getMonth(), i + 1),
    ),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  function pick(d: Date) {
    const iso = toIso(d);
    setValue(iso);
    onValueChange?.(iso);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function onTriggerKey(e: KeyboardEvent<HTMLButtonElement>) {
    if (e.key === "ArrowDown" && !open) {
      e.preventDefault();
      setOpen(true);
    }
  }

  const label = formatCs(value) || "Vyberte datum";
  const invalid = Boolean(ariaInvalid);

  return (
    <div ref={rootRef} className={`relative mt-2 ${className}`}>
      <input
        type="hidden"
        name={name}
        value={value}
        required={required}
        data-inquiry-term=""
      />
      <button
        ref={triggerRef}
        id={inputId}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-describedby={ariaDescribedBy}
        data-invalid={invalid ? "true" : undefined}
        data-required={required ? "true" : undefined}
        onClick={() => {
          setOpen((v) => !v);
          if (selected) setView(startOfMonth(selected));
        }}
        onKeyDown={onTriggerKey}
        className="flex h-12 w-full cursor-pointer items-center justify-between border border-line bg-transparent px-3 text-left text-base leading-normal text-white outline-none transition"
      >
        <span className={value ? "text-white" : "text-white/60"}>{label}</span>
        <span
          className="font-mono text-[11px] uppercase tracking-wide text-white/60"
          aria-hidden
        >
          Kalendář
        </span>
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Výběr data"
          className="absolute left-0 top-[calc(100%+6px)] z-40 w-[min(100%,17.5rem)] border border-line bg-panel p-3 shadow-[0_12px_40px_rgba(0,0,0,0.55)]"
        >
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              className="cursor-pointer border border-line px-2 py-1 text-sm text-white/70 hover:border-white/30 hover:text-white"
              aria-label="Předchozí měsíc"
              onClick={() => setView((v) => addMonths(v, -1))}
            >
              ‹
            </button>
            <p className="font-display text-xs uppercase tracking-wide text-white">
              {MONTHS[view.getMonth()]} {view.getFullYear()}
            </p>
            <button
              type="button"
              className="cursor-pointer border border-line px-2 py-1 text-sm text-white/70 hover:border-white/30 hover:text-white"
              aria-label="Následující měsíc"
              onClick={() => setView((v) => addMonths(v, 1))}
            >
              ›
            </button>
          </div>

          <div className="mt-2 grid grid-cols-7 gap-0.5">
            {WEEKDAYS.map((w) => (
              <div
                key={w}
                className="py-0.5 text-center font-mono text-[10px] uppercase tracking-wide text-white/60"
              >
                {w}
              </div>
            ))}
            {cells.map((d, i) => {
              if (!d) {
                return <div key={`e-${i}`} className="h-8" />;
              }
              const isSelected = selected ? sameDay(d, selected) : false;
              const isToday = sameDay(d, today);
              return (
                <button
                  key={toIso(d)}
                  type="button"
                  onClick={() => pick(d)}
                  className={`flex h-8 cursor-pointer items-center justify-center text-sm transition ${
                    isSelected
                      ? "bg-komatsu-yellow text-void"
                      : isToday
                        ? "border border-komatsu-yellow text-white hover:bg-white/10"
                        : "text-white/85 hover:bg-white/10"
                  }`}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
