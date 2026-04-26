# Jarvis — Documentação do Projeto

## Visão Geral

Sistema interno da Voetur/VTCLog com autenticação própria e módulo **Moneypenny** (resumo diário de e-mails e agenda via Microsoft 365).

## Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│  Servidor Windows Server 2022 — 10.61.10.100            │
│                                                         │
│  ┌──────────────┐    ┌──────────────┐                  │
│  │  Frontend    │    │  Backend     │                  │
│  │  React+Vite  │───▶│  FastAPI     │                  │
│  │  nginx :3000 │    │  Python :8000│                  │
│  └──────────────┘    └──────┬───────┘                  │
│                             │ http://kong:8000          │
│  ┌──────────────────────────▼──────────────────────┐   │
│  │  Supabase Self-Hosted (Docker Compose)          │   │
│  │                                                 │   │
│  │  kong :54321  ──▶  postgrest (REST API)         │   │
│  │                ──▶  gotrue   (auth)             │   │
│  │                ──▶  realtime                   │   │
│  │                ──▶  storage                    │   │
│  │                                                 │   │
│  │  postgres :5432  (supabase/postgres:15.1.1.78)  │   │
│  │  studio   :54323 (dashboard local)              │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## Portas dos Serviços

| Porta  | Serviço              | Acesso          |
|--------|----------------------|-----------------|
| 3000   | Frontend (nginx)     | interno         |
| 8000   | Backend (FastAPI)    | interno         |
| 5432   | PostgreSQL           | interno         |
| 54321  | Supabase API (Kong)  | interno         |
| 54322  | Supabase API (HTTPS) | interno         |
| 54323  | Supabase Studio      | interno         |

> Firewall: nenhuma porta está aberta externamente. Liberação deve ser feita manualmente após validação.

## Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS — build Docker com `nginx:alpine`
- **Backend**: FastAPI (Python 3.11) + Supabase Python SDK + APScheduler + httpx
- **Banco**: Supabase self-hosted (PostgreSQL 15, GoTrue, PostgREST, Realtime, Storage, Kong)
- **CI/CD**: GitHub Actions → SSH → `deploy.sh` → `docker compose up -d --build`

## Configuração Local (`docker-compose.yml`)

O arquivo `.env` na raiz do projeto configura todos os serviços. **Nunca commitar o `.env`.**

### Variáveis Críticas

| Variável              | Descrição                                              |
|-----------------------|--------------------------------------------------------|
| `POSTGRES_PASSWORD`   | Senha do PostgreSQL (todos os usuários internos)       |
| `SUPABASE_JWT_SECRET` | Secret JWT do Supabase (GoTrue + PostgREST + Kong)     |
| `ANON_KEY`           | JWT com role `anon` — gerado do JWT_SECRET             |
| `SERVICE_ROLE_KEY`   | JWT com role `service_role` — gerado do JWT_SECRET     |
| `JWT_SECRET`          | Secret JWT da aplicação (diferente do Supabase)        |
| `API_EXTERNAL_URL`    | URL externa do Supabase API (ex: http://IP:54321)      |
| `SITE_URL`            | URL do frontend (ex: http://IP:3000)                   |
| `MICROSOFT_*`         | Credenciais do Azure AD app "Moneypenny"               |
| `WHATSAPP_API_URL`    | URL da Evolution API (WhatsApp)                        |

### Geração dos JWTs do Supabase

`ANON_KEY` e `SERVICE_ROLE_KEY` são JWTs assinados com `SUPABASE_JWT_SECRET`:

```python
import jwt, datetime
secret = "SEU_SUPABASE_JWT_SECRET"
# anon
jwt.encode({"iss":"supabase-local","role":"anon","exp":2051222400}, secret, algorithm="HS256")
# service_role
jwt.encode({"iss":"supabase-local","role":"service_role","exp":2051222400}, secret, algorithm="HS256")
```

## Schema do Banco

Arquivo: `schema.sql` — aplicar em um banco novo com:
```bash
docker exec -i jarvis-db-1 bash -c \
  "PGPASSWORD='...' psql -U postgres -d postgres" < schema.sql
```

### Tabelas

**`profiles`** — usuários da aplicação
- Autenticação própria com bcrypt (não usa GoTrue)
- `role`: `admin` | `user`
- Primeiro usuário a se cadastrar vira admin automaticamente

**`connected_accounts`** — OAuth Microsoft 365
- `access_token` expira em ~1h; renovado automaticamente via `refresh_token`
- `provider`: sempre `"microsoft"` por enquanto

**`notification_prefs`** — configurações do Moneypenny
- `channels_config` (JSONB): `{"email":{"enabled":true,"content":["emails","calendar"]},...}`
- Canais disponíveis: `email`, `teams`, `whatsapp`

**`app_logs`** — logs de eventos do sistema (acessíveis em `/admin/logs`)

## CI/CD

### GitHub Actions (`.github/workflows/deploy.yml`)

1. **security-scan**: Gitleaks (detecção de secrets)
2. **test-backend**: pytest + pip-audit
3. **test-frontend**: typecheck + npm audit
4. **deploy**: SSH no servidor → `bash ~/app/backend/deploy.sh`

### Secrets do GitHub necessários

| Secret            | Valor                                          |
|-------------------|------------------------------------------------|
| `SSH_HOST`        | IP do servidor (10.61.10.100)                  |
| `SSH_USER`        | Usuário SSH                                    |
| `SSH_PRIVATE_KEY` | Chave privada SSH (PEM)                        |
| `SUPABASE_URL`    | `http://localhost:54321` (para testes CI)      |
| `SUPABASE_KEY`    | Service role key (para testes CI)              |
| `JWT_SECRET`      | Secret JWT da app (para testes CI)             |

### `deploy.sh`

Roda no servidor via SSH:
1. Verifica que `.env` existe
2. `git fetch` + `git checkout origin/main`
3. `docker compose up -d --build`

## Microsoft 365 / Azure AD

App registrado: **Moneypenny** (`e1084655-9bfe-41fc-bc59-3f76bd172b17`)
Tenant: `fb902eca-dc08-4dec-9e2c-7ce70ee14cf5`

Scopes: `Calendars.Read Mail.Read Mail.Send User.Read`

**Redirect URI deve estar registrado no Azure AD:**
```
http://10.61.10.100:8000/api/moneypenny/auth/microsoft/callback
```

## WhatsApp (Evolution API)

- URL: `http://10.61.10.100:8080` (instância local)
- Envio sempre em background (evita timeout da API OCI free tier)
- `ReadTimeout` tratado como "enviado" — a Evolution API processa mas raramente responde

## Comandos Úteis

```bash
# Ver todos os containers
docker compose ps

# Logs do backend em tempo real
docker compose logs -f backend

# Rebuild de um serviço específico
docker compose up -d --build backend

# Acessar o banco diretamente
docker exec -it jarvis-db-1 bash -c \
  "PGPASSWORD='...' psql -U postgres -d postgres"

# Reiniciar tudo
docker compose restart
```
