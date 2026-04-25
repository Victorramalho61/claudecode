from typing import Annotated

from fastapi import APIRouter, Depends

from auth import require_role
from db import get_supabase

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/logs")
def get_logs(_: Annotated[dict, Depends(require_role("admin"))]) -> list[dict]:
    db = get_supabase()
    result = (
        db.table("app_logs")
        .select("id,created_at,level,module,message,detail,user_id")
        .order("created_at", desc=True)
        .limit(300)
        .execute()
    )
    return result.data
