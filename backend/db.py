from supabase import create_client, Client
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    supabase_url: str
    supabase_key: str

    model_config = {"env_file": ".env"}


settings = Settings()


def get_supabase() -> Client:
    return create_client(settings.supabase_url, settings.supabase_key)
