import { useState } from "react";
import type { Period } from "../../types/freshservice";

type Preset = { label: string; days?: number; isCurrentMonth?: boolean };

const PRESETS: Preset[] = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
  { label: "Mês atual", isCurrentMonth: true },
];

function toISO(d: Date) {
  return d.toISOString().split("T")[0];
}

function presetToPeriod(p: Preset): Period {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (p.isCurrentMonth) {
    const from = new Date(today.getFullYear(), today.getMonth(), 1);
    const to = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    return { from: from.toISOString(), to: to.toISOString() };
  }

  const from = new Date(today);
  from.setDate(from.getDate() - (p.days ?? 30));
  const to = new Date(today);
  to.setDate(to.getDate() + 1);
  return { from: from.toISOString(), to: to.toISOString() };
}

type Props = {
  value: Period;
  onChange: (p: Period) => void;
};

export default function PeriodSelector({ value, onChange }: Props) {
  const [showCustom, setShowCustom] = useState(false);
  const [customFrom, setCustomFrom] = useState(toISO(new Date(value.from)));
  const [customTo, setCustomTo] = useState(toISO(new Date(value.to)));

  function applyCustom() {
    if (customFrom && customTo && customFrom <= customTo) {
      onChange({
        from: new Date(customFrom).toISOString(),
        to: new Date(customTo + "T23:59:59Z").toISOString(),
      });
      setShowCustom(false);
    }
  }

  function isActive(p: Preset) {
    const pp = presetToPeriod(p);
    return (
      Math.abs(new Date(value.from).getTime() - new Date(pp.from).getTime()) < 60_000 &&
      Math.abs(new Date(value.to).getTime() - new Date(pp.to).getTime()) < 60_000
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {PRESETS.map((p) => (
        <button
          key={p.label}
          type="button"
          onClick={() => { onChange(presetToPeriod(p)); setShowCustom(false); }}
          className={`px-3 py-1.5 rounded-lg text-[13px] font-medium border transition-colors ${
            isActive(p)
              ? "bg-brand-green text-white border-brand-green"
              : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-brand-green/60"
          }`}
        >
          {p.label}
        </button>
      ))}

      <button
        type="button"
        onClick={() => setShowCustom((v) => !v)}
        className={`px-3 py-1.5 rounded-lg text-[13px] font-medium border transition-colors ${
          showCustom
            ? "bg-brand-green text-white border-brand-green"
            : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-brand-green/60"
        }`}
      >
        Personalizado
      </button>

      {showCustom && (
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1.5 text-[13px] text-gray-900 dark:text-gray-100 focus:outline-none focus:border-brand-green"
          />
          <span className="text-xs text-gray-400">até</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1.5 text-[13px] text-gray-900 dark:text-gray-100 focus:outline-none focus:border-brand-green"
          />
          <button
            type="button"
            onClick={applyCustom}
            className="px-3 py-1.5 rounded-lg bg-brand-green text-white text-[13px] font-medium hover:bg-brand-deep transition-colors"
          >
            Aplicar
          </button>
        </div>
      )}

      <span className="ml-auto text-[11px] text-gray-400 dark:text-gray-500 hidden sm:block">
        {toISO(new Date(value.from))} → {toISO(new Date(value.to))}
      </span>
    </div>
  );
}
