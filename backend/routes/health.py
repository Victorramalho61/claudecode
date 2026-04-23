from fastapi import APIRouter, Depends
from supabase import Client

from db import get_supabase

router = APIRouter()


@router.get("/health")
async def health(db: Client = Depends(get_supabase)) -> dict[str, str]:
    return {"status": "ok"}
