import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { apiFetch, ApiError } from "../../lib/api";
import type { FreshserviceTicket, TicketFilters, TicketsPage } from "../../types/freshservice";
import { CSAT_EMOJIS, PRIORITY_COLORS, PRIORITY_LABELS } from "../../types/freshservice";

type Props = {
  filters: TicketFilters;
};

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function fmtMin(min: number | null) {
  if (min == null) return "—";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function TicketsTable({ filters }: Props) {
  const { token } = useAuth();
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<TicketsPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const PAGE_SIZE = 50;

  const load = useCallback(
    async (p: number) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (filters.from) params.set("from", filters.from);
        if (filters.to) params.set("to", filters.to);
        if (filters.group_id != null) params.set("group_id", String(filters.group_id));
        if (filters.responder_id != null) params.set("responder_id", String(filters.responder_id));
        if (filters.company_id != null) params.set("company_id", String(filters.company_id));
        if (filters.priority != null) params.set("priority", String(filters.priority));
        if (filters.sla_breached != null) params.set("sla_breached", String(filters.sla_breached));
        if (filters.csat_rating != null) params.set("csat_rating", String(filters.csat_rating));
        params.set("page", String(p));
        params.set("page_size", String(PAGE_SIZE));

        const data = await apiFetch<TicketsPage>(`/api/freshservice/tickets?${params}`, { token });
        setResult(data);
        setPage(p);
      } catch (e) {
        setError(e instanceof ApiError ? e.message : "Erro ao carregar tickets.");
      } finally {
        setLoading(false);
      }
    },
    [token, filters]
  );

  useEffect(() => {
    load(1);
  }, [load]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="h-6 w-6 rounded-full border-2 border-brand-green border-t-transparent animate-spin" />
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-red-500 py-4">{error}</p>;
  }

  if (!result || !result.data.length) {
    return <p className="text-sm text-gray-400 dark:text-gray-500 py-4">Nenhum ticket encontrado com esses filtros.</p>;
  }

  const totalPages = Math.ceil(result.total / PAGE_SIZE);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-[12px] text-gray-400 dark:text-gray-500">
        <span>{result.total.toLocaleString("pt-BR")} tickets encontrados</span>
        {totalPages > 1 && (
          <span>Página {page} de {totalPages}</span>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="w-full text-[12px]">
          <thead className="bg-gray-50 dark:bg-gray-800/50">
            <tr>
              <th className="text-left px-3 py-2.5 font-medium text-gray-500 dark:text-gray-400">#</th>
              <th className="text-left px-3 py-2.5 font-medium text-gray-500 dark:text-gray-400 min-w-[200px]">Assunto</th>
              <th className="text-left px-3 py-2.5 font-medium text-gray-500 dark:text-gray-400 hidden md:table-cell">Grupo</th>
              <th className="text-left px-3 py-2.5 font-medium text-gray-500 dark:text-gray-400 hidden lg:table-cell">Técnico</th>
              <th className="text-center px-3 py-2.5 font-medium text-gray-500 dark:text-gray-400">Prior.</th>
              <th className="text-right px-3 py-2.5 font-medium text-gray-500 dark:text-gray-400 hidden sm:table-cell">Resolvido</th>
              <th className="text-right px-3 py-2.5 font-medium text-gray-500 dark:text-gray-400 hidden sm:table-cell">T. Resolução</th>
              <th className="text-center px-3 py-2.5 font-medium text-gray-500 dark:text-gray-400">SLA</th>
              <th className="text-center px-3 py-2.5 font-medium text-gray-500 dark:text-gray-400">CSAT</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {result.data.map((t: FreshserviceTicket) => (
              <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                <td className="px-3 py-2.5 text-gray-400 dark:text-gray-500">{t.id}</td>
                <td className="px-3 py-2.5 text-gray-900 dark:text-gray-100 max-w-xs">
                  <span className="line-clamp-2">{t.subject}</span>
                  {t.company_name && (
                    <span className="block text-[11px] text-gray-400 dark:text-gray-500 truncate">{t.company_name}</span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-gray-600 dark:text-gray-400 hidden md:table-cell truncate max-w-[120px]">
                  {t.group_name ?? "—"}
                </td>
                <td className="px-3 py-2.5 text-gray-600 dark:text-gray-400 hidden lg:table-cell truncate max-w-[120px]">
                  {t.agent_name ?? "—"}
                </td>
                <td className="px-3 py-2.5 text-center">
                  <span className={`font-medium ${PRIORITY_COLORS[t.priority ?? 0] ?? "text-gray-400"}`}>
                    {PRIORITY_LABELS[t.priority ?? 0] ?? "—"}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right text-gray-500 dark:text-gray-400 hidden sm:table-cell">
                  {fmtDate(t.resolved_at ?? t.closed_at)}
                </td>
                <td className="px-3 py-2.5 text-right text-gray-500 dark:text-gray-400 hidden sm:table-cell">
                  {fmtMin(t.resolution_time_min)}
                </td>
                <td className="px-3 py-2.5 text-center">
                  {t.sla_breached == null ? (
                    <span className="text-gray-300 dark:text-gray-600">—</span>
                  ) : t.sla_breached ? (
                    <span className="inline-flex items-center rounded-full bg-red-100 dark:bg-red-900/30 px-1.5 py-0.5 text-[10px] font-semibold text-red-700 dark:text-red-400">
                      Breach
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-green-100 dark:bg-green-900/30 px-1.5 py-0.5 text-[10px] font-semibold text-green-700 dark:text-green-400">
                      OK
                    </span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-center text-base">
                  {t.csat_rating ? CSAT_EMOJIS[t.csat_rating] ?? "—" : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => load(page - 1)}
            className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-[13px] disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            ← Anterior
          </button>
          <span className="text-[13px] text-gray-500">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => load(page + 1)}
            className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-[13px] disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Próxima →
          </button>
        </div>
      )}
    </div>
  );
}
