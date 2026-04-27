import json
import logging
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    import anthropic as _anthropic_type

logger = logging.getLogger(__name__)

_client: "_anthropic_type.Anthropic | None" = None


def _get_client():
    global _client
    if _client is None:
        import anthropic
        _client = anthropic.Anthropic()  # reads ANTHROPIC_API_KEY from env
    return _client

_SYSTEM_PROMPT = (
    "Você é um analista de suporte técnico da Voetur/VTCLog. "
    "Analise os dados de chamados do Freshservice e produza um relatório em JSON com exatamente 3 campos:\n"
    '1. "summary": resumo conciso em português (máx 280 caracteres) para exibir no dashboard interno\n'
    '2. "anomaly": true se SLA breach estiver acima de 25% ou volume de chamados fechados for zero, false caso contrário\n'
    '3. "anomaly_detail": string descrevendo a anomalia (string vazia se anomaly=false)\n\n'
    "Responda SOMENTE com JSON válido, sem texto adicional, sem markdown."
)


def generate_daily_summary_sync(stats: dict) -> dict:
    try:
        response = _get_client().messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=512,
            system=[{
                "type": "text",
                "text": _SYSTEM_PROMPT,
                "cache_control": {"type": "ephemeral"},
            }],
            messages=[{
                "role": "user",
                "content": (
                    f"Dados do dia {stats.get('date', '')}:\n"
                    + json.dumps(stats, ensure_ascii=False, indent=2)
                ),
            }],
        )
        text = response.content[0].text.strip()
        # Strip markdown code fences if model adds them
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        return json.loads(text)
    except Exception:
        logger.exception("Claude API error generating freshservice summary")
        return {
            "summary": f"Sync concluído: {stats.get('total_closed', 0)} chamados fechados em {stats.get('date', '')}.",
            "anomaly": False,
            "anomaly_detail": "",
        }


async def generate_daily_summary(stats: dict) -> dict:
    import asyncio
    return await asyncio.to_thread(generate_daily_summary_sync, stats)
