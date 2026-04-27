import asyncio
import logging
import os
import subprocess
import tempfile
from datetime import datetime, timezone

from db import get_supabase
from services.app_logger import log_event

logger = logging.getLogger(__name__)


async def run_agent(agent: dict) -> dict:
    db = get_supabase()
    run = db.table("agent_runs").insert({
        "agent_id": agent["id"],
        "status": "running",
        "started_at": datetime.now(timezone.utc).isoformat(),
    }).execute().data[0]
    run_id = run["id"]

    try:
        if agent["agent_type"] == "freshservice_sync":
            output = await _run_freshservice_sync()
        elif agent["agent_type"] == "script":
            output = await asyncio.get_event_loop().run_in_executor(
                None, _run_script_sync, agent
            )
        else:
            raise ValueError(f"Tipo desconhecido: {agent['agent_type']}")

        db.table("agent_runs").update({
            "status": "success",
            "finished_at": datetime.now(timezone.utc).isoformat(),
            "output": output,
        }).eq("id", run_id).execute()
        log_event("info", "agents", f"Agente '{agent['name']}' concluído")
        return {"status": "success", "run_id": run_id}

    except Exception as exc:
        db.table("agent_runs").update({
            "status": "error",
            "finished_at": datetime.now(timezone.utc).isoformat(),
            "error": str(exc),
        }).eq("id", run_id).execute()
        log_event("error", "agents", f"Erro no agente '{agent['name']}'", detail=str(exc))
        return {"status": "error", "run_id": run_id, "error": str(exc)}


async def _run_freshservice_sync() -> str:
    from services.freshservice import run_daily_sync
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, run_daily_sync)
    return "Sync Freshservice concluído"


def _run_script_sync(agent: dict) -> str:
    code = (agent.get("config") or {}).get("code", "")
    if not code.strip():
        raise ValueError("Nenhum código definido no agente")
    with tempfile.NamedTemporaryFile(suffix=".py", mode="w", delete=False) as f:
        f.write(code)
        tmppath = f.name
    try:
        result = subprocess.run(
            ["python3", tmppath], capture_output=True, text=True, timeout=300
        )
        output = (result.stdout or "")[-10_000:]
        if result.returncode != 0:
            raise RuntimeError((result.stderr or "exit code não zero")[-2_000:])
        return output
    finally:
        os.unlink(tmppath)
