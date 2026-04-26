-- ============================================================
-- Schema local — gerado a partir do código do backend
-- ============================================================

-- profiles
CREATE TABLE IF NOT EXISTS public.profiles (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    username    text UNIQUE NOT NULL,
    display_name text NOT NULL,
    email       text UNIQUE NOT NULL,
    role        text NOT NULL DEFAULT 'user' CHECK (role IN ('admin','user')),
    active      boolean NOT NULL DEFAULT false,
    password_hash text,
    whatsapp_phone text DEFAULT '',
    created_at  timestamptz NOT NULL DEFAULT now()
);

-- connected_accounts
CREATE TABLE IF NOT EXISTS public.connected_accounts (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    provider      text NOT NULL,
    email         text NOT NULL DEFAULT '',
    access_token  text NOT NULL DEFAULT '',
    refresh_token text NOT NULL DEFAULT '',
    token_expiry  timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, provider)
);

-- notification_prefs
CREATE TABLE IF NOT EXISTS public.notification_prefs (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          uuid UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    active           boolean NOT NULL DEFAULT true,
    send_hour_utc    integer NOT NULL DEFAULT 10 CHECK (send_hour_utc BETWEEN 0 AND 23),
    channels_config  jsonb,
    teams_webhook_url text DEFAULT '',
    whatsapp_phone   text DEFAULT '',
    updated_at       timestamptz NOT NULL DEFAULT now()
);

-- app_logs
CREATE TABLE IF NOT EXISTS public.app_logs (
    id         bigserial PRIMARY KEY,
    created_at timestamptz NOT NULL DEFAULT now(),
    level      text NOT NULL CHECK (level IN ('info','warning','error')),
    module     text NOT NULL,
    message    text NOT NULL,
    detail     text,
    user_id    uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Permissões para PostgREST (anon + authenticated)
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- RLS desabilitado — acesso controlado pelo backend via service_role key
ALTER TABLE public.profiles          DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.connected_accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_prefs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_logs          DISABLE ROW LEVEL SECURITY;
