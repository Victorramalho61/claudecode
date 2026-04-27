import type { GroupSLA } from "../../types/freshservice";

type Props = {
  data: GroupSLA[];
  onGroupClick?: (groupId: number | null) => void;
};

function fmtMin(min: number | null) {
  if (min == null) return "—";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function SLAGroupTable({ data, onGroupClick }: Props) {
  if (!data.length) {
    return (
      <p className="text-sm text-gray-400 dark:text-gray-500 py-4">
        Sem dados de SLA por grupo no período.
      </p>
    );
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-gray-100 dark:border-gray-800">
            <th className="text-left py-2 pr-4 font-medium text-gray-500 dark:text-gray-400 w-1/3">Grupo / Tenant</th>
            <th className="text-right py-2 px-2 font-medium text-gray-500 dark:text-gray-400">Chamados</th>
            <th className="py-2 px-2 font-medium text-gray-500 dark:text-gray-400 w-1/4 hidden sm:table-cell">Volume</th>
            <th className="text-right py-2 px-2 font-medium text-gray-500 dark:text-gray-400">Tempo médio</th>
            <th className="text-right py-2 pl-2 font-medium text-gray-500 dark:text-gray-400">SLA breach</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
          {data.map((row) => {
            const pct = (row.count / maxCount) * 100;
            const breach = row.breach_pct ?? 0;
            const breachColor =
              breach > 30
                ? "text-red-600 dark:text-red-400"
                : breach > 10
                ? "text-amber-600 dark:text-amber-400"
                : "text-green-600 dark:text-green-400";

            return (
              <tr
                key={row.group_id ?? "none"}
                className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 ${onGroupClick ? "cursor-pointer" : ""}`}
                onClick={() => onGroupClick?.(row.group_id)}
              >
                <td className="py-2.5 pr-4 text-gray-900 dark:text-gray-100 font-medium">
                  {row.group_name}
                </td>
                <td className="py-2.5 px-2 text-right text-gray-700 dark:text-gray-300">
                  {row.count.toLocaleString("pt-BR")}
                </td>
                <td className="py-2.5 px-2 hidden sm:table-cell">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-brand-green/60"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-gray-400 w-8 text-right">
                      {Math.round(pct)}%
                    </span>
                  </div>
                </td>
                <td className="py-2.5 px-2 text-right text-gray-600 dark:text-gray-400">
                  {fmtMin(row.avg_resolution_min)}
                </td>
                <td className={`py-2.5 pl-2 text-right font-semibold ${breachColor}`}>
                  {breach != null ? `${breach}%` : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
