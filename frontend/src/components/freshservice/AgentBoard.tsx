import type { AgentStats } from "../../types/freshservice";

type Props = {
  data: AgentStats[];
  onAgentClick?: (agentId: number | null) => void;
};

function fmtMin(min: number | null) {
  if (min == null) return "—";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const AVATAR_COLORS = [
  "bg-brand-green",
  "bg-brand-deep",
  "bg-amber-600",
  "bg-purple-600",
  "bg-teal-600",
  "bg-rose-600",
];

export default function AgentBoard({ data, onAgentClick }: Props) {
  if (!data.length) {
    return (
      <p className="text-sm text-gray-400 dark:text-gray-500 py-2">
        Sem dados de técnicos no período.
      </p>
    );
  }

  const maxCount = Math.max(...data.map((d) => d.closed_count), 1);

  return (
    <div className="space-y-2">
      {data.slice(0, 10).map((agent, idx) => {
        const pct = Math.round((agent.closed_count / maxCount) * 100);
        const color = AVATAR_COLORS[idx % AVATAR_COLORS.length];

        return (
          <div
            key={agent.agent_id ?? `anon-${idx}`}
            className={`flex items-center gap-3 ${onAgentClick ? "cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg px-1 -mx-1" : ""}`}
            onClick={() => onAgentClick?.(agent.agent_id)}
          >
            <div
              className={`h-7 w-7 rounded-full ${color} text-white text-[11px] font-bold grid place-items-center shrink-0`}
            >
              {initials(agent.agent_name)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline gap-2">
                <span className="text-[13px] font-medium text-gray-900 dark:text-gray-100 truncate">
                  {agent.agent_name}
                </span>
                <span className="text-[13px] font-semibold text-brand-deep dark:text-brand-mid shrink-0">
                  {agent.closed_count}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="flex-1 h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-brand-green/70"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-[11px] text-gray-400 shrink-0">
                  {fmtMin(agent.avg_resolution_min)}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
