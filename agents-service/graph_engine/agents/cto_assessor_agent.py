"""
CTO Assessor Agent — Arquiteto de Soluções Sênior e Analista de Qualidade.

Papel: segunda opinião crítica e independente sobre TODAS as proposals antes de irem ao humano.

Fluxo obrigatório:
  Agente cria proposal
    → CTO avalia e aprova internamente
      → CTO Assessor revisa (este agente)
        → Score ≥ 7: validated → aprovação humana
        → Score 4-6: needs_revision → CTO → Agente corrige → Assessor revalida
        → Score < 4: rejected → CTO → Agente corrige → Assessor revalida

Responsabilidades do Assessor:
1. Revisar código, planos e soluções buscando falhas, gaps e vulnerabilidades
2. Verificar se a proposal conflita com a arquitetura do sistema
3. Buscar abordagens alternativas e paralelas
4. Criticar visão incompleta ou parcial do problema
5. Detectar backdoors, vulnerabilidades de segurança, código mal escrito
6. Garantir que ações propostas sejam efetivas (não soluções paliativas)
7. Avaliar requisitos: são claros, completos e corretos?
8. Aplicar nota 0-10 com justificativa detalhada
9. Gerar tags de alerta para o humano

SLA: 100% das proposals aprovadas pelo CTO passam pelo Assessor antes de irem ao humano.
"""
import json
import logging
import re
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

# Critérios de avaliação com pesos
_CRITERIA = {
    "problem_clarity":      ("Clareza do problema", 1.5),
    "solution_completeness":("Completude da solução", 2.0),
    "code_quality":         ("Qualidade do código", 1.5),
    "security":             ("Segurança e ausência de backdoors", 2.0),
    "architecture_fit":     ("Alinhamento com a arquitetura Jarvis", 1.5),
    "effectiveness":        ("Efetividade real da ação proposta", 1.5),
    "requirements":         ("Clareza e completude dos requisitos", 1.0),
    "risk_assessment":      ("Avaliação de riscos e impactos", 1.0),
    "scalability":          ("Escalabilidade e performance", 1.0),
    "rollback":             ("Plano de rollback/reversão", 1.0),
}
_MAX_SCORE = sum(v[1] for v in _CRITERIA.values())  # = 14.5, normalizado para 10

_ARCHITECTURE_CONTEXT = """
Sistema Jarvis — Arquitetura Resumida:
- 6 microsserviços FastAPI (Python 3.11): core:8001, monitoring:8002, freshservice:8003, moneypenny:8004, agents:8005, expenses:8006
- Frontend React 18 + TypeScript + Vite + Tailwind
- Gateway: Kong (config declarativa em volumes/api/kong.yml)
- Banco: Supabase self-hosted (PostgreSQL 15 + PostgREST + GoTrue + Realtime + Storage)
- LLMs: Groq → Together AI → HuggingFace → Ollama (cascata gratuita)
- Autenticação: JWT HS256, domínios @voetur.com.br e @vtclog.com.br
- Deploy: GitHub Actions + self-hosted runner Windows → deploy.sh → docker compose up -d --build
- Arquivos compartilhados: db.py, auth.py, limiter.py, app_logger.py (copias em cada serviço)
- Pipelines de agentes: monitoring(15min), security(30min), cicd(5min), dba(4h), governance(diário), evolution(diário)
- PROIBIDO: DDL direto no banco sem migration, DROP TABLE/COLUMN sem aprovação humana, secrets no código
"""

_ASSESSOR_SYSTEM_PROMPT = f"""Você é o Assessor do CTO do sistema Jarvis — arquiteto de soluções sênior e analista de qualidade.

Sua missão: garantir que NENHUMA proposta inferior chegue ao humano. Você é crítico, exigente e meticuloso.

CONTEXTO DO SISTEMA:
{_ARCHITECTURE_CONTEXT}

CRITÉRIOS DE AVALIAÇÃO (total: 10 pontos):
- Clareza do problema (1.5): O problema está bem definido? A causa raiz foi identificada?
- Completude da solução (2.0): A solução resolve COMPLETAMENTE o problema? Não é paliativa?
- Qualidade do código (1.5): Código bem escrito, sem anti-patterns, seguindo convenções do projeto?
- Segurança (2.0): Sem backdoors, injeção SQL, XSS, secrets expostos, permissões excessivas?
- Alinhamento arquitetural (1.5): Respeita a arquitetura Jarvis? Não quebra contratos existentes?
- Efetividade (1.5): A ação proposta vai REALMENTE resolver o problema?
- Requisitos (1.0): Requisitos claros, completos e corretos?
- Riscos (1.0): Riscos identificados e mitigados?
- Escalabilidade (1.0): Solução escala? Não cria gargalos?
- Rollback (1.0): Há plano claro de reversão?

THRESHOLDS:
- Score ≥ 7.0: APPROVED — vai para aprovação humana
- Score 4.0-6.9: NEEDS_REVISION — deve ser corrigida
- Score < 4.0: REJECTED — proposta com problemas fundamentais

RESPONDA EM JSON:
{{
  "score": float (0-10),
  "status": "approved|needs_revision|rejected",
  "scores_by_criteria": {{"criterion": float}},
  "critical_issues": [str],     // problemas que IMPEDEM aprovação
  "warnings": [str],             // problemas que precisam atenção
  "improvements": [str],         // sugestões de melhoria
  "alternative_approach": str,   // abordagem alternativa (se houver)
  "tags": [str],                 // tags para o humano: ["security_risk", "needs_arch_review", "good_solution", ...]
  "cto_feedback": str,           // mensagem ao CTO com recomendação
  "agent_feedback": str          // mensagem ao agente com o que precisa corrigir
}}
"""


def _read_architecture() -> str:
    """Tenta ler o arquitetura.md do repositório."""
    try:
        from graph_engine.tools.github_tools import read_file
        content = read_file("docs/arquitetura.md")
        return content[:3000] if content else _ARCHITECTURE_CONTEXT
    except Exception:
        return _ARCHITECTURE_CONTEXT


def _assess_proposal(proposal: dict, arch_context: str) -> dict:
    """Avalia uma proposal e retorna o resultado da revisão."""
    from graph_engine.llm import invoke_with_fallback
    from langchain_core.messages import SystemMessage, HumanMessage

    proposal_text = (
        f"TÍTULO: {proposal.get('title','')}\n"
        f"TIPO: {proposal.get('proposal_type','')}\n"
        f"PRIORIDADE: {proposal.get('priority','')}\n"
        f"DESCRIÇÃO: {proposal.get('description','')}\n"
        f"AÇÃO PROPOSTA: {proposal.get('proposed_action','')}\n"
        f"PLANO/CÓDIGO: {(proposal.get('proposed_fix') or '')[:2000]}\n"
        f"SQL PROPOSTO: {(proposal.get('sql_proposal') or '')[:500]}\n"
        f"GANHO ESPERADO: {proposal.get('expected_gain','')}\n"
        f"RISCO: {proposal.get('risk','')}\n"
        f"REVISÕES ANTERIORES: {proposal.get('revision_count', 0)}\n"
        f"FEEDBACK ANTERIOR: {(proposal.get('assessor_feedback') or '')[:500]}\n"
    )

    try:
        response = invoke_with_fallback([
            SystemMessage(content=_ASSESSOR_SYSTEM_PROMPT),
            HumanMessage(content=f"PROPOSTA PARA REVISÃO:\n{proposal_text}\n\nARQUITETURA ATUAL:\n{arch_context[:1500]}"),
        ], timeout_s=60)

        content = response.content
        match = re.search(r"\{.*\}", content, re.DOTALL)
        if match:
            return json.loads(match.group())
    except Exception as exc:
        logger.error("cto_assessor: LLM error: %s", exc)

    # Fallback: aprovação cautelosa se LLM falhar
    return {
        "score": 5.0,
        "status": "needs_revision",
        "critical_issues": ["LLM indisponível para revisão completa"],
        "warnings": ["Revisão automática incompleta — requer análise manual"],
        "improvements": ["Executar revisão manual antes de aprovar"],
        "alternative_approach": "",
        "tags": ["needs_manual_review", "llm_unavailable"],
        "cto_feedback": "LLM indisponível para revisão. Recomendo revisão manual antes de aprovar para humano.",
        "agent_feedback": "Revisão automatizada incompleta. Aguarde revisão manual do Assessor.",
    }


def _apply_assessment(db, proposal_id: str, assessment: dict, decisions: list) -> None:
    """Aplica o resultado da avaliação na proposal."""
    score = float(assessment.get("score", 5.0))
    status_raw = assessment.get("status", "needs_revision")

    # Mapeia status do assessor
    if status_raw == "approved" and score >= 7.0:
        assessor_status = "validated"
        validation_status_update = None  # não muda validation_status ainda
    elif score < 4.0:
        assessor_status = "rejected"
        validation_status_update = None
    else:
        assessor_status = "needs_revision"
        validation_status_update = None

    feedback = (
        f"SCORE: {score}/10 | STATUS: {assessor_status}\n\n"
        f"PROBLEMAS CRÍTICOS:\n" + "\n".join(f"• {i}" for i in assessment.get("critical_issues", [])[:5]) +
        f"\n\nALERTAS:\n" + "\n".join(f"• {w}" for w in assessment.get("warnings", [])[:5]) +
        f"\n\nSUGESTÕES:\n" + "\n".join(f"• {s}" for s in assessment.get("improvements", [])[:5]) +
        (f"\n\nABORDAGEM ALTERNATIVA:\n{assessment.get('alternative_approach','')}" if assessment.get("alternative_approach") else "")
    )

    update_data = {
        "assessor_status":   assessor_status,
        "assessor_score":    score,
        "assessor_feedback": feedback[:3000],
        "assessor_tags":     assessment.get("tags", []),
        "reviewed_at":       datetime.now(timezone.utc).isoformat(),
    }
    if assessor_status == "needs_revision":
        update_data["revision_count"] = (db.table("improvement_proposals").select("revision_count").eq("id", proposal_id).limit(1).execute().data or [{}])[0].get("revision_count", 0) + 1

    try:
        db.table("improvement_proposals").update(update_data).eq("id", proposal_id).execute()
        decisions.append(f"Assessed: score={score}/10, status={assessor_status} — ID {proposal_id[:8]}")
    except Exception as exc:
        logger.error("cto_assessor: apply_assessment %s: %s", proposal_id, exc)


def run(state: dict) -> dict:
    from graph_engine.tools.supabase_tools import send_agent_message, log_event, insert_agent_event
    from db import get_supabase

    findings = []
    decisions = []
    db = get_supabase()

    arch_context = _read_architecture()

    # Busca proposals aprovadas pelo CTO mas não revisadas pelo assessor
    try:
        pending = (
            db.table("improvement_proposals")
            .select("*")
            .eq("validation_status", "approved")
            .eq("assessor_status", "pending_review")
            .order("approved_at")
            .limit(20)
            .execute()
            .data or []
        )
    except Exception as exc:
        logger.error("cto_assessor: busca proposals: %s", exc)
        pending = []

    # Também revisita proposals em needs_revision que foram atualizadas
    try:
        revised = (
            db.table("improvement_proposals")
            .select("*")
            .eq("validation_status", "approved")
            .eq("assessor_status", "needs_revision")
            .not_.is_("proposed_fix", "null")
            .gt("revision_count", 0)
            .order("reviewed_at")
            .limit(10)
            .execute()
            .data or []
        )
    except Exception:
        revised = []

    all_to_review = pending + revised
    validated = 0
    needs_revision = 0
    rejected = 0

    findings.append({
        "agent": "cto_assessor_agent",
        "proposals_to_review": len(all_to_review),
        "new_pending": len(pending),
        "revisiting": len(revised),
    })

    for proposal in all_to_review:
        pid = proposal["id"]
        title = proposal.get("title", "")[:60]

        assessment = _assess_proposal(proposal, arch_context)
        _apply_assessment(db, pid, assessment, decisions)

        score = float(assessment.get("score", 5.0))
        status = assessment.get("status", "needs_revision")

        if status == "approved" and score >= 7.0:
            validated += 1
            # Notifica o CTO: proposal validada, pode ir ao humano
            try:
                send_agent_message(
                    from_agent="cto_assessor_agent",
                    to_agent="cto",
                    message=(
                        f"✅ PROPOSAL VALIDADA pelo Assessor (score: {score}/10)\n"
                        f"Título: {title}\n"
                        f"Tags: {', '.join(assessment.get('tags', []))}\n"
                        f"Pronta para aprovação humana.\n\n"
                        f"{assessment.get('cto_feedback','')}"
                    ),
                    context={"proposal_id": pid, "score": score, "validated": True},
                )
            except Exception:
                pass
        else:
            if score < 4.0:
                rejected += 1
            else:
                needs_revision += 1
            # Notifica CTO e agente de origem para corrigir
            source_agent = proposal.get("source_agent", "evolution_agent")
            try:
                send_agent_message(
                    from_agent="cto_assessor_agent",
                    to_agent="cto",
                    message=(
                        f"{'❌ REJEITADA' if score < 4 else '⚠️ PRECISA REVISÃO'} pelo Assessor (score: {score}/10)\n"
                        f"Título: {title}\n"
                        f"Problemas críticos: {'; '.join(assessment.get('critical_issues', [])[:3])}\n\n"
                        f"{assessment.get('cto_feedback','')}"
                    ),
                    context={"proposal_id": pid, "score": score, "source_agent": source_agent},
                )
                send_agent_message(
                    from_agent="cto_assessor_agent",
                    to_agent=source_agent,
                    message=(
                        f"Sua proposal '{title}' foi {'REJEITADA' if score < 4 else 'DEVOLVIDA PARA REVISÃO'} pelo Assessor do CTO.\n"
                        f"Score: {score}/10\n\n"
                        f"{assessment.get('agent_feedback','')}\n\n"
                        f"Por favor, corrija os pontos abaixo e resubmeta:\n"
                        + "\n".join(f"• {i}" for i in assessment.get("critical_issues", [])[:5])
                    ),
                    context={"proposal_id": pid, "needs_revision": True, "score": score},
                )
            except Exception as exc:
                logger.warning("cto_assessor: notificação %s: %s", pid, exc)

    # SLA: 100% das proposals aprovadas revisadas
    sla_coverage = 100.0 if not pending else round(100 * validated / max(len(all_to_review), 1), 1)

    try:
        from graph_engine.tools.sla_tracker import report_sla
        report_sla("cto_assessor_agent", "proposals_reviewed_pct", sla_coverage)
        report_sla("cto_assessor_agent", "avg_quality_score", round(sum(float(assessment.get("score", 5)) for _ in all_to_review) / max(len(all_to_review), 1), 1) if all_to_review else 10.0)
        report_sla("cto_assessor_agent", "rejection_rate_pct", round(100 * rejected / max(len(all_to_review), 1), 1))
    except Exception:
        pass

    findings.append({
        "agent": "cto_assessor_agent",
        "reviewed": len(all_to_review),
        "validated": validated,
        "needs_revision": needs_revision,
        "rejected": rejected,
        "sla_coverage_pct": sla_coverage,
    })

    # Relatório ao CTO
    now_str = datetime.now(timezone.utc).strftime("%d/%m/%Y %H:%M UTC")
    try:
        send_agent_message(
            from_agent="cto_assessor_agent",
            to_agent="cto",
            message=(
                f"📋 RELATÓRIO ASSESSOR — {now_str}\n\n"
                f"Proposals revisadas: {len(all_to_review)}\n"
                f"✅ Validadas (prontas para humano): {validated}\n"
                f"⚠️ Precisam revisão: {needs_revision}\n"
                f"❌ Rejeitadas: {rejected}\n"
                f"SLA cobertura: {sla_coverage}%\n\n"
                f"Ações tomadas:\n" + "\n".join(f"• {d}" for d in decisions[:5])
            ),
            context={
                "validated": validated,
                "needs_revision": needs_revision,
                "rejected": rejected,
                "sla": sla_coverage,
            },
        )
        decisions.append("Relatório enviado ao CTO")
    except Exception as exc:
        logger.warning("cto_assessor: relatório CTO: %s", exc)

    # Evento se muitas rejeitadas
    if rejected > 3:
        try:
            insert_agent_event(
                event_type="high_proposal_rejection_rate",
                source="cto_assessor_agent",
                payload={"rejected": rejected, "total": len(all_to_review)},
                priority="high",
            )
        except Exception:
            pass

    log_event(
        "info" if sla_coverage >= 90 else "warning",
        "cto_assessor_agent",
        f"Revisão: {len(all_to_review)} proposals | {validated} validadas | {needs_revision} revisão | {rejected} rejeitadas | SLA {sla_coverage}%",
    )

    return {
        "findings": findings,
        "decisions": decisions,
        "context": {
            "cto_assessor_run": datetime.now(timezone.utc).isoformat(),
            "validated": validated,
            "needs_revision": needs_revision,
            "rejected": rejected,
        },
        "next_agent": "END",
    }


def build():
    from graph_engine.agents.base import build_deterministic_agent
    return build_deterministic_agent(run)
