# Jarvis — Documentação do Projeto

## Visão Geral

Sistema interno da Voetur/VTCLog com autenticação própria e cinco módulos:
- **Core** — autenticação, usuários e administração
- **Moneypenny** — resumo diário de e-mails e agenda via Microsoft 365 (e-mail, Teams, WhatsApp)
- **Monitoramento** — health check agendado de sistemas com dashboard em tempo real
- **Freshservice** — dashboard e sync de tickets do helpdesk
- **Agentes** — jobs agendados configuráveis (ex: sync Freshservice diário)

## Arquitetura

```
Browser
  └─► nginx:443 (HTTPS — frontend container)
        ├─ /api/* ──────────────────────────────► Kong:8000 (interno Docker)
        │                                           ├─ /api/auth, /api/users, /api/admin, /api/health
        │                                           │     └─► core-service:8001
        │                                           ├─ /api/monitoring/*
        │                                           │     └─► monitoring-service:8002
        │                                           ├─ /api/freshservice/*
        │                                           │     └─► freshservice-service:8003
        │                                           ├─ /api/moneypenny/*
        │                                           │     └─► moneypenny-service:8004
        │                                           └─ /api/agents/*
        │                                                 └─► agents-service:8005
        └─ / ───────────────────────────────────► SPA React (nginx serve estático)

Inter-serviço (Docker app_net):
  agents-service → freshservice-service:8003/api/freshservice/sync/daily (HTTP interno + JWT)

Supabase Self-Hosted (Docker app_net):
  Kong:8000 → postgrest (REST API)
           → gotrue (auth)
           → realtime
           → storage
  postgres:5432 (127.0.0.1 only)
  studio:54323  (127.0.0.1 only — admin local)
```

## Portas dos Serviços

| Porta  | Serviço                  | Bind              | Acesso externo  |
|--------|--------------------------|-------------------|-----------------|
| 443    | nginx (HTTPS frontend)   | 0.0.0.0           | sim (produção)  |
| 80     | nginx (redirect → 443)   | 0.0.0.0           | sim (redirect)  |
| 5432   | PostgreSQL               | **127.0.0.1**     | bloqueado       |
| 9100   | Monitor Agent            | **127.0.0.1**     | bloqueado       |
| 8080   | Evolution API            | **127.0.0.1**     | bloqueado       |
| 54321  | Supabase Kong            | **127.0.0.1**     | bloqueado       |
| 54322  | Supabase Kong (HTTPS)    | **127.0.0.1**     | bloqueado       |
| 54323  | Supabase Studio          | **127.0.0.1**     | bloqueado       |

Microsserviços (8001–8005) não têm portas expostas ao host — apenas rede interna Docker.

## Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS → build Docker com `nginx:alpine` (HTTPS)
- **Microsserviços**: 5x FastAPI (Python 3.11) + Supabase Python SDK + APScheduler + httpx + slowapi
- **Gateway**: Kong 2.8.1 (declarativo via `volumes/api/kong.yml`) — roteia `/api/*` para cada serviço
- **Banco**: Supabase self-hosted (PostgreSQL 15, GoTrue, PostgREST, Realtime, Storage, Kong)
- **Monitor Agent**: Python 3.12 + psutil — expõe `/metrics` com CPU/RAM/disco em JSON
- **CI/CD**: GitHub Actions (self-hosted runner) → `deploy.sh` → `docker compose up -d --build`

## Microsserviços

### Estrutura padrão (todos os serviços)

```
{service}/
├── Dockerfile
├── requirements.txt
├── main.py             # FastAPI: routers + CORS + healthcheck + lifespan
├── db.py               # Supabase client + Settings (pydantic-settings)
├── auth.py             # JWT validation + require_role dependency
├── limiter.py          # slowapi rate limiter
├── app_logger.py       # log_event → tabela app_logs
├── routes/
│   ├── health.py       # GET /health + GET /ready
│   └── {module}.py
└── services/
    └── {specific}.py
```

### Portas internas

| Serviço               | Porta | Scheduler                          |
|-----------------------|-------|------------------------------------|
| core-service          | 8001  | nenhum                             |
| monitoring-service    | 8002  | run_all_checks a cada 5 min        |
| freshservice-service  | 8003  | run_daily_sync diariamente às 9h   |
| moneypenny-service    | 8004  | run_daily_summaries a cada hora    |
| agents-service        | 8005  | jobs dinâmicos por agente (CRUD)   |

### Healthcheck endpoints (todos os serviços)

- `GET /health` — liveness (retorna imediatamente, sem dependências)
- `GET /ready` — readiness (verifica Supabase + dependências específicas)

## Módulos

### Core (core-service:8001)
Autenticação, usuários e gestão de acesso.
- Login com JWT (HS256), expiração configurável via `JWT_EXPIRE_MINUTES`
- Domínios permitidos para registro: `@voetur.com.br`, `@vtclog.com.br`
- Primeiro usuário registrado vira admin automaticamente
- Roles: `admin` | `user`
- Admins aprovam ou recusam solicitações (recusar deleta o perfil pendente)

### Moneypenny (moneypenny-service:8004)
Resumo diário via Microsoft Graph API.
- Busca e-mails não lidos e agenda do dia, envia via canal configurado pelo usuário
- Canais: e-mail (HTML), Teams (Adaptive Card), WhatsApp (texto)
- `channels_config` JSONB define quais canais e conteúdo por canal
- Tokens OAuth Microsoft renovados automaticamente via refresh_token
- WhatsApp enviado em background (Evolution API OCI free tier é lenta)

### Monitoramento (monitoring-service:8002)
Health checks agendados via APScheduler (a cada 5 min).
- Tipos de check:
  - `http` — verifica status code HTTP (segue redirects 301/302)
  - `tcp` — abre conexão TCP na porta (bancos de dados, serviços sem HTTP). URL: `host:porta`
  - `evolution` — verifica `connectionState` da Evolution API
  - `metrics` — CPU/RAM/disco via monitor-agent
  - `custom` — endpoint HTTP configurável com headers/body
- Anti-flapping: alerta só após 2 checks consecutivos DOWN (`consecutive_down_count`)
- Alerta de recuperação quando sistema volta de DOWN → UP
- Dashboard em tempo real com auto-refresh a cada 30s

### Freshservice (freshservice-service:8003)
Dashboard e sync de tickets do helpdesk Freshservice.
- Sync diário às 9h UTC (APScheduler)
- Endpoints de backfill e sync manual
- Dashboard: summary, SLA por grupo, agentes, top requesters, CSAT, live metrics
- Todas as rotas requerem `role: admin`

### Agentes (agents-service:8005)
Jobs agendados configuráveis via CRUD.
- Jobs dinâmicos: reload do scheduler após criação/edição/exclusão de agente
- Chamada inter-serviço para sync Freshservice via HTTP interno (não import direto)
- Token JWT gerado internamente com `role: admin` para autenticação inter-serviço

## Segurança

| Camada | Proteção |
|---|---|
| Login | Rate limit: 10 req/min por IP |
| Solicitação de acesso | Rate limit: 5 req/min por IP |
| Todas as rotas admin | `require_role("admin")` — 403 para role `user` |
| Senhas | bcrypt + mínimo 8 caracteres |
| Audit trail | Login (sucesso/falha) registrado em `app_logs` |
| PostgreSQL | Bind em 127.0.0.1 |
| Kong (Supabase) | Bind em 127.0.0.1 |
| Evolution API | Bind em 127.0.0.1 |
| Microsserviços | Sem portas expostas ao host (Docker network interno) |
| Tokens JWT | HS256, assinados com `JWT_SECRET` |

## Kong Gateway (`volumes/api/kong.yml`)

Roteamento declarativo. Ordem importa: rotas específicas têm prioridade sobre `/api/`.

```
/api/monitoring  → monitoring-service:8002
/api/freshservice → freshservice-service:8003
/api/moneypenny  → moneypenny-service:8004
/api/agents      → agents-service:8005
/api/            → core-service:8001  (auth, users, admin, health)
```

CORS gerenciado pelos próprios microsserviços (plugin CORS do Kong desabilitado para rotas de app).

## Configuração (`docker-compose.yml` + `.env`)

O arquivo `.env` na raiz configura todos os serviços. **Nunca commitar o `.env`.**

### Variáveis Críticas

| Variável                    | Descrição                                                   |
|-----------------------------|-------------------------------------------------------------|
| `POSTGRES_PASSWORD`         | Senha do PostgreSQL (todos os usuários internos)            |
| `SUPABASE_JWT_SECRET`       | Secret JWT do Supabase (GoTrue + PostgREST + Kong)          |
| `ANON_KEY`                  | JWT role `anon` — gerado do `SUPABASE_JWT_SECRET`           |
| `SERVICE_ROLE_KEY`          | JWT role `service_role` — gerado do `SUPABASE_JWT_SECRET`   |
| `JWT_SECRET`                | Secret JWT da aplicação (compartilhado entre microsserviços) |
| `API_EXTERNAL_URL`          | URL externa da API Supabase (ex: `http://IP:54321`)         |
| `SITE_URL`                  | URL do frontend (ex: `https://jarvis.voetur.com.br`)        |
| `ALLOWED_ORIGINS`           | CORS: `https://jarvis.voetur.com.br`                        |
| `MICROSOFT_CLIENT_ID`       | Azure AD app "Moneypenny" — ID do cliente                   |
| `MICROSOFT_TENANT_ID`       | Azure AD tenant ID                                          |
| `MICROSOFT_CLIENT_SECRET`   | Azure AD client secret                                      |
| `MICROSOFT_REDIRECT_URI`    | `https://jarvis.voetur.com.br/api/moneypenny/auth/...`      |
| `WHATSAPP_API_URL`          | URL da Evolution API                                        |
| `WHATSAPP_API_KEY`          | API key da Evolution API                                    |
| `WHATSAPP_INSTANCE`         | Nome da instância WhatsApp                                  |
| `MONITOR_AGENT_URL`         | `http://monitor-agent:9100` (interno Docker)                |
| `MONITOR_AGENT_TOKENS`      | Token(s) para autenticar o agente (separados por vírgula)   |
| `FRESHSERVICE_API_KEY`      | API key da conta Freshservice                               |
| `FRESHSERVICE_SERVICE_URL`  | `http://freshservice-service:8003` (inter-serviço)          |
| `VITE_API_URL`              | URL da API para build do frontend                           |
| `REALTIME_SECRET_KEY_BASE`  | Secret base do Supabase Realtime                            |
| `REALTIME_DB_ENC_KEY`       | Chave de criptografia do Realtime                           |

### Geração dos JWTs do Supabase

```python
import jwt
secret = "SEU_SUPABASE_JWT_SECRET"
jwt.encode({"iss":"supabase-local","role":"anon","exp":2051222400}, secret, algorithm="HS256")
jwt.encode({"iss":"supabase-local","role":"service_role","exp":2051222400}, secret, algorithm="HS256")
```

## Schema do Banco

Arquivos:
- `schema.sql` — tabelas core (profiles, app_logs, monitored_systems, etc.)
- `schema_freshservice.sql` — tabelas do módulo Freshservice

Aplicar em banco novo:
```bash
docker exec -i jarvis-db-1 bash -c "PGPASSWORD='...' psql -U postgres -d postgres" < schema.sql
docker exec -i jarvis-db-1 bash -c "PGPASSWORD='...' psql -U postgres -d postgres" < schema_freshservice.sql
```

### Tabelas principais

| Tabela | Serviço | Descrição |
|---|---|---|
| `profiles` | core | Usuários — bcrypt, role admin/user |
| `connected_accounts` | moneypenny | OAuth Microsoft 365 — access/refresh token |
| `notification_prefs` | moneypenny | Preferências — channels_config JSONB, horário UTC |
| `app_logs` | todos | Audit trail — login, erros, alertas |
| `monitored_systems` | monitoring | Sistemas monitorados — tipo, URL, consecutive_down_count |
| `system_checks` | monitoring | Histórico de checks — status, latência, métricas |
| `scheduled_agents` | agents | Jobs agendados — cron, action, último run |
| `agent_runs` | agents | Histórico de execuções de agentes |
| `freshservice_tickets` | freshservice | Tickets sincronizados |
| `freshservice_agents` | freshservice | Agentes do helpdesk |
| `freshservice_groups` | freshservice | Grupos do helpdesk |
| `freshservice_companies` | freshservice | Empresas do helpdesk |
| `freshservice_sync_log` | freshservice | Log de sincronizações |

## CI/CD

### GitHub Actions (`.github/workflows/deploy.yml`)

1. **security-scan** — Gitleaks (detecção de secrets no código)
2. **test-frontend** — typecheck + npm audit
3. **deploy** — roda no **self-hosted runner** do próprio servidor

### Self-Hosted Runner

Runner instalado em `C:\actions-runner` no servidor Windows.
- Registrado como `jarvis-server` no repositório
- Faz conexão de saída para o GitHub (não abre portas)
- Iniciar manualmente após reboot: `Start-Process C:\actions-runner\run.cmd -WindowStyle Hidden`
- Para instalar como serviço permanente (requer admin): `cd C:\actions-runner && .\config.cmd --runasservice`

### Secrets do GitHub

| Secret         | Valor                                     |
|----------------|-------------------------------------------|
| `SUPABASE_URL` | `http://localhost:54321` (para testes CI) |
| `SUPABASE_KEY` | Service role key                          |
| `JWT_SECRET`   | Secret JWT da aplicação                   |

### `deploy.sh` (raiz do repositório)

1. Verifica `.env` existe
2. `git fetch` + `git checkout origin/main`
3. `docker compose up -d --build`

## Microsoft 365 / Azure AD

App: **Moneypenny** (`e1084655-9bfe-41fc-bc59-3f76bd172b17`)
Tenant: `fb902eca-dc08-4dec-9e2c-7ce70ee14cf5`
Scopes: `Calendars.Read Mail.Read Mail.Send User.Read`

Redirect URI registrado no Azure AD:
```
https://jarvis.voetur.com.br/api/moneypenny/auth/microsoft/callback
```

## WhatsApp (Evolution API)

- Instância: `voetur` | API Key: `voetur_evolution_2026`
- Servidor: OCI São Paulo — `http://168.138.129.157:8080` (bind 127.0.0.1 no host)
- Envio em background — `ReadTimeout` tratado como entregue (OCI free tier lento)

## Comandos Úteis

```bash
# Status de todos os containers
docker compose ps

# Logs em tempo real de um serviço
docker compose logs -f core-service
docker compose logs -f freshservice-service
docker compose logs -f agents-service

# Rebuild de serviço específico
docker compose up -d --build freshservice-service

# Acessar banco diretamente
docker exec -it jarvis-db-1 bash -c \
  "PGPASSWORD='...' psql -U postgres -d postgres"

# Métricas do servidor (CPU/RAM/disco)
curl http://localhost:9100/metrics

# Reiniciar tudo
docker compose restart

# Healthcheck de todos os microsserviços
curl https://jarvis.voetur.com.br/api/health
curl https://jarvis.voetur.com.br/api/ready
```
