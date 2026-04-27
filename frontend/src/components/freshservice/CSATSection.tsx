import type { CSATSummary } from "../../types/freshservice";

type Props = {
  data: CSATSummary | null;
  onRatingClick?: (rating: number) => void;
};

function Bar({ pct, color }: { pct: number | null; color: string }) {
  const w = pct ?? 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-3 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${w}%` }} />
      </div>
      <span className="text-[12px] font-semibold w-8 text-right text-gray-700 dark:text-gray-300">
        {w != null ? `${w}%` : "—"}
      </span>
    </div>
  );
}

export default function CSATSection({ data, onRatingClick }: Props) {
  if (!data || !data.total_rated) {
    return (
      <p className="text-sm text-gray-400 dark:text-gray-500 py-2">
        Sem avaliações no período.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {/* Visão geral */}
      <div className="grid grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() => onRatingClick?.(3)}
          className="rounded-xl border border-green-200 dark:border-green-900/50 bg-green-50 dark:bg-green-900/20 p-3 text-center hover:ring-1 ring-green-400 transition"
        >
          <div className="text-2xl">😊</div>
          <div className="mt-1 text-lg font-bold text-green-700 dark:text-green-400">
            {data.happy_pct ?? 0}%
          </div>
          <div className="text-[11px] text-green-600 dark:text-green-500">Satisfeito</div>
        </button>
        <button
          type="button"
          onClick={() => onRatingClick?.(2)}
          className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-900/20 p-3 text-center hover:ring-1 ring-amber-400 transition"
        >
          <div className="text-2xl">😐</div>
          <div className="mt-1 text-lg font-bold text-amber-700 dark:text-amber-400">
            {data.neutral_pct ?? 0}%
          </div>
          <div className="text-[11px] text-amber-600 dark:text-amber-500">Neutro</div>
        </button>
        <button
          type="button"
          onClick={() => onRatingClick?.(1)}
          className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 p-3 text-center hover:ring-1 ring-red-400 transition"
        >
          <div className="text-2xl">😞</div>
          <div className="mt-1 text-lg font-bold text-red-700 dark:text-red-400">
            {data.unhappy_pct ?? 0}%
          </div>
          <div className="text-[11px] text-red-600 dark:text-red-500">Insatisfeito</div>
        </button>
      </div>

      <p className="text-[11px] text-gray-400 dark:text-gray-500 -mt-2">
        Total de avaliações: {data.total_rated.toLocaleString("pt-BR")}
      </p>

      {/* Por grupo */}
      {data.by_group.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">
            Por grupo
          </h4>
          <div className="space-y-2.5">
            {data.by_group.map((g) => (
              <div key={g.group_id ?? "none"}>
                <div className="flex justify-between text-[12px] mb-1">
                  <span className="text-gray-700 dark:text-gray-300 font-medium truncate">{g.group_name}</span>
                  <span className="text-gray-400 ml-2 shrink-0">{g.count} aval.</span>
                </div>
                <div className="space-y-1">
                  <Bar pct={g.happy_pct} color="bg-green-500" />
                  <Bar pct={g.unhappy_pct} color="bg-red-500" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Últimos comentários negativos */}
      {data.recent_comments.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">
            Últimos comentários negativos
          </h4>
          <div className="space-y-2">
            {data.recent_comments.map((c) => (
              <div
                key={c.id}
                className="rounded-lg border border-red-100 dark:border-red-900/30 bg-red-50 dark:bg-red-900/10 p-3"
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-sm">{c.csat_rating === 1 ? "😞" : "😐"}</span>
                  <span className="text-[12px] font-medium text-gray-800 dark:text-gray-200 truncate">
                    #{c.id} — {c.subject}
                  </span>
                </div>
                <p className="text-[12px] text-gray-600 dark:text-gray-400 italic">
                  "{c.csat_comment}"
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
