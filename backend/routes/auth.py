import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from auth import create_access_token, get_current_user
from db import get_settings
from ldap_client import authenticate_ldap

router = APIRouter(prefix="/auth")
logger = logging.getLogger(__name__)


class LoginRequest(BaseModel):
    username: str
    password: str


class UserInfo(BaseModel):
    username: str
    display_name: str
    email: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserInfo


@router.post("/login", response_model=LoginResponse)
async def login(body: LoginRequest) -> LoginResponse:
    settings = get_settings()

    if settings.ldap_server:
        user_info = authenticate_ldap(
            username=body.username,
            password=body.password,
            server_url=settings.ldap_server,
            domain=settings.ldap_domain,
            base_dn=settings.ldap_base_dn,
        )
        if not user_info:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciais inválidas")
    else:
        logger.warning("LDAP não configurado — modo dev ativo")
        if not body.username or not body.password:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciais inválidas")
        user_info = {
            "username": body.username,
            "display_name": body.username.capitalize(),
            "email": f"{body.username}@dev.local",
        }

    token = create_access_token(user_info)
    return LoginResponse(access_token=token, user=UserInfo(**user_info))


@router.get("/me", response_model=UserInfo)
async def me(current_user: Annotated[dict, Depends(get_current_user)]) -> UserInfo:
    return UserInfo(**current_user)
