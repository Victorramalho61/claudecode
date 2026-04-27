import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { apiFetch, ApiError } from "../../lib/api";
import type { Agent, AgentRun, AgentType } from "../../types/agents";

const AGENT_TYPE_LABEL: Record<AgentType, string> = {
  freshservice_sync: "Freshservice Sync",
  script: "Script Python",
};

const RUN_STATUS_STYLE: Record<string, string> = {
  running: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  success: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  error: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

interface AgentFormProps {
  initial?: Agent;
  onClose: () => void;
  onSaved: () => void;
  token: string | null;
}

function AgentForm({ initial, onClose, onSaved, token }: AgentFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [agentType, setAgentType] = useState<AgentType>(initial?.agent_type ?? "freshservice_sync");
  const [code, setCode] = useState<string>((initial?.config?.code as string) ?? "");
  const [intervalMinutes, setIntervalMinutes] = useState(initial?.interval_minutes ?? 0);
  const [enabled, setEnabled] = useState(initial?.enabled ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name,
        description,
        agent_type: agentType,
        config: agentType === "script" ? { code } : {},
        interval_minutes: intervalMinutes,
        enabled,
      };
      if (initial) {
        await apiFetch(`/api/agents/${initial.id}`, { method: "PATCH", token, body: payload });
      } else {
        await apiFetch("/api/agents", { method: "POST", token, body: payload });
      }
      onSaved();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erro ao salvar agente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl">
        <div className="border-b border-gray-100 dark:border-gray-800 px-5 py-4 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">
            {initial ? "Editar Agente" : "Novo Agente"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">✕</button>
        </div>
        <div className="p-5 space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-2 text-sm text-red-700 dark:text-red-300">{error}</div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Nome</label>
            <input value={name} onChange={e => setName(e.target.value)} className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-green" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Descrição</label>
            <input value={description} onChange={e => setDescription(e.target.value)} className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-green" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Tipo</label>
            <select value={agentType} onChange={e => setAgentType(e.target.value as AgentType)} className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none">
              <option value="freshservice_sync">Freshservice Sync</option>
              <option value="script">Script Python</option>
            </select>
          </div>
          {agentType === "script" && (
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Código Python</label>
              <textarea value={code} onChange={e => setCode(e.target.value)} rows={8} className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-xs font-mono text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-green" placeholder="# seu código Python aqui" />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Intervalo (minutos) — 0 = apenas manual</label>
            <input type="number" min={0} value={intervalMinutes} onChange={e => setIntervalMinutes(Number(e.target.value))} className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none" />
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="enabled" checked={enabled} onChange={e => setEnabled(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-brand-green" />
            <label htmlFor="enabled" className="text-sm text-gray-700 dark:text-gray-300">Habilitado</label>
          </div>
        </div>
        <div className="border-t border-gray-100 dark:border-gray-800 px-5 py-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">Cancelar</button>
          <button onClick={save} disabled={saving || !name} className="rounded-lg bg-brand-green px-4 py-2 text-sm font-medium text-white hover:bg-brand-deep disabled:opacity-50">
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AgentsPage() {
  const { token } = useAuth();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editAgent, setEditAgent] = useState<Agent | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [runsLoading, setRunsLoading] = useState(false);
  const [running, setRunning] = useState<string | null>(null);

  const fetchAgents = useCallback(async () => {
    try {
      const data = await apiFetch<Agent[]>("/api/agents", { token });
      setAgents(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erro ao carregar agentes.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchAgents(); }, [fetchAgents]);

  async function fetchRuns(agent: Agent) {
    setSelectedAgent(agent);
    setRunsLoading(true);
    try {
      const data = await apiFetch<AgentRun[]>(`/api/agents/${agent.id}/runs`, { token });
      setRuns(data);
    } catch {
      setRuns([]);
    } finally {
      setRunsLoading(false);
    }
  }

  async function executeAgent(agent: Agent) {
    setRunning(agent.id);
    try {
      await apiFetch(`/api/agents/${agent.id}/run`, { method: "POST", token });
      setTimeout(() => { if (selectedAgent?.id === agent.id) fetchRuns(agent); }, 2000);
    } catch {
      /* silencioso */
    } finally {
      setRunning(null);
    }
  }

  async function deleteAgent(agent: Agent) {
    if (!confirm(`Remover agente "${agent.name}"?`)) return;
    await apiFetch(`/api/agents/${agent.id}`, { method: "DELETE", token });
    fetchAgents();
    if (selectedAgent?.id === agent.id) setSelectedAgent(null);
  }

  if (loading) return <div className="p-8 text-sm text-gray-400">Carregando...</div>;

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Agentes</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Tarefas agendadas ou manuais</p>
        </div>
        <button
          onClick={() => { setEditAgent(null); setShowForm(true); }}
          className="rounded-lg bg-brand-green px-4 py-2 text-sm font-medium text-white hover:bg-brand-deep"
        >
          + Novo Agente
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-300">{error}</div>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          {agents.length === 0 ? (
            <div className="py-16 text-center text-sm text-gray-400 dark:text-gray-500">Nenhum agente cadastrado.</div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800/50 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                  <tr>
                    <th className="px-4 py-3 text-left">Nome</th>
                    <th className="px-4 py-3 text-left">Tipo</th>
                    <th className="px-4 py-3 text-left">Intervalo</th>
                    <th className="px-4 py-3 text-left">Ativo</th>
                    <th className="px-4 py-3 text-left">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {agents.map(agent => (
                    <tr
                      key={agent.id}
                      className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer ${selectedAgent?.id === agent.id ? "bg-brand-soft dark:bg-brand-green/10" : ""}`}
                      onClick={() => fetchRuns(agent)}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 dark:text-gray-100">{agent.name}</p>
                        {agent.description && <p className="text-xs text-gray-400 dark:text-gray-500">{agent.description}</p>}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{AGENT_TYPE_LABEL[agent.agent_type]}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                        {agent.interval_minutes > 0 ? `${agent.interval_minutes}min` : "Manual"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${agent.enabled ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"}`}>
                          {agent.enabled ? "Sim" : "Não"}
                        </span>
                      </td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <div className="flex gap-2">
                          <button
                            onClick={() => executeAgent(agent)}
                            disabled={running === agent.id}
                            className="rounded border border-gray-300 dark:border-gray-700 px-2 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
                          >
                            {running === agent.id ? "..." : "Executar"}
                          </button>
                          <button
                            onClick={() => { setEditAgent(agent); setShowForm(true); }}
                            className="rounded border border-gray-300 dark:border-gray-700 px-2 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => deleteAgent(agent)}
                            className="rounded border border-red-200 dark:border-red-800 px-2 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            Remover
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          {selectedAgent ? (
            <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-medium text-gray-900 dark:text-gray-100">{selectedAgent.name} — Histórico</h3>
                <button onClick={() => fetchRuns(selectedAgent)} className="text-xs text-brand-green hover:underline">Atualizar</button>
              </div>
              {runsLoading ? (
                <p className="text-sm text-gray-400">Carregando...</p>
              ) : runs.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">Nenhuma execução ainda.</p>
              ) : (
                <div className="space-y-3">
                  {runs.map(run => (
                    <div key={run.id} className="rounded-lg border border-gray-100 dark:border-gray-800 p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${RUN_STATUS_STYLE[run.status] ?? ""}`}>{run.status}</span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">{new Date(run.started_at).toLocaleString("pt-BR")}</span>
                      </div>
                      {run.output && (
                        <pre className="mt-2 max-h-24 overflow-auto rounded bg-gray-50 dark:bg-gray-800 p-2 text-xs text-gray-700 dark:text-gray-300">{run.output}</pre>
                      )}
                      {run.error && (
                        <pre className="mt-2 max-h-24 overflow-auto rounded bg-red-50 dark:bg-red-900/20 p-2 text-xs text-red-700 dark:text-red-300">{run.error}</pre>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 text-center text-sm text-gray-400 dark:text-gray-500">
              Selecione um agente para ver o histórico.
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <AgentForm
          initial={editAgent ?? undefined}
          token={token}
          onClose={() => { setShowForm(false); setEditAgent(null); }}
          onSaved={() => { setShowForm(false); setEditAgent(null); fetchAgents(); }}
        />
      )}
    </div>
  );
}
