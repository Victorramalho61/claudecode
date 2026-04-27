type KPICardProps = {
  label: string;
  value: string | number | null;
  sub?: string;
  active?: boolean;
  onClick?: () => void;
  colorClass?: string;
};

export default function KPICard({
  label,
  value,
  sub,
  active = false,
  onClick,
  colorClass = "text-brand-deep dark:text-brand-mid",
}: KPICardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col gap-1 rounded-xl border p-4 text-left transition-all w-full ${
        active
          ? "border-brand-green bg-brand-soft dark:bg-brand-green/10 shadow-sm"
          : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-brand-green/60 hover:shadow-sm"
      }`}
    >
      <span className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
        {label}
      </span>
      <span className={`text-2xl font-bold leading-none ${colorClass}`}>
        {value ?? "—"}
      </span>
      {sub && (
        <span className="text-[11px] text-gray-400 dark:text-gray-500">{sub}</span>
      )}
      {onClick && (
        <span className={`mt-1 text-[10px] font-medium ${active ? "text-brand-green" : "text-gray-400"}`}>
          {active ? "Fechar detalhes ↑" : "Ver detalhes ↓"}
        </span>
      )}
    </button>
  );
}
