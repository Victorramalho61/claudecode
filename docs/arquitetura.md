# Jarvis — Arquitetura e Documentação

## Visão Geral

Sistema interno da Voetur/VTCLog com autenticação própria e cinco módulos:

| Módulo | Serviço | Descrição |
|---|---|---|
| Core | core-service | Autenticação, usuários, administração |
| Monitoramento | monitoring-service | Health checks agendados, dashboard em tempo real |
| Freshservice | freshservice-service | Dashboard e sync de tickets do helpdesk |
| Moneypenny | moneypenny-service | Resumo diário de e-mails e agenda via Microsoft 365 |
| Agentes | agents-service | Jobs agendados configuráveis |

---

## Arquitetura

```
Browser
  └─► nginx:443 (HTTPS — frontend container)
        ├─ /api/* ─────────────────────────► Kong:8000 (interno Docker)
        │                                     ├─ /api/auth, /api/users, /api/admin, /api/health
        │                                     │     └─► core-service:8001
        │                                     ├─ /api/monitoring/*
        │                                     │     └─► monitoring-service:8002
        │                                     ├─ /api/freshservice/*
        │                                     │     └─► freshservice-service:8003
        │                                     ├─ /api/moneypenny/*
        │                                     │     └─► moneypenny-service:8004
        │                                     └─ /api/agents/*
        │                                           └─► agents-service:8005
        └─ / ──────────────────────────────► SPA React (nginx serve estático)

Inter-serviço (Docker app_net):
  agents-service → freshservice-service:8003 (HTTP interno + JWT gerado em agent_runner.py)

Supabase Self-Hosted (Docker app_net):
  Kong:8000 → postgrest, gotrue, realtime, storage
  postgres:5432  (127.0.0.1 — nunca exposto)
  studio:54323   (127.0.0.1 — admin local)
```

---

## Portas

| Porta | Serviço | Bind | Acesso externo |
|---|---|---|---|
| 443 | nginx (HTTPS) | 0.0.0.0 | sim |
| 80 | nginx (redirect) | 0.0.0.0 | sim |
| 5432 | PostgreSQL | 127.0.0.1 | bloqueado |
| 9100 | Monitor Agent | 127.0.0.1 | bloqueado |
| 8080 | Evolution API | 127.0.0.1 | bloqueado |
| 54321 | Supabase Kong | 127.0.0.1 | bloqueado |
| 54323 | Supabase Studio | 127.0.0.1 | bloqueado |

Microsserviços (8001–8005): sem portas expostas ao host, apenas rede interna Docker.

---

## Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS → build com `nginx:alpine`
- **Microsserviços**: FastAPI (Python 3.11) + Supabase SDK + APScheduler + httpx + slowapi
- **Gateway**: Kong 2.8.1 — config declarativa em `volumes/api/kong.yml`
- **Banco**: Supabase self-hosted (PostgreSQL 15, GoTrue, PostgREST, Realtime, Storage)
- **Monitor Agent**: Python 3.12 + psutil — expõe `/metrics` (CPU/RAM/disco)
- **CI/CD**: GitHub Actions (self-hosted runner) → `deploy.sh` → `docker compose up -d --build`

---

## Microsserviços — Estrutura Padrão

Cada serviço tem a mesma estrutura:

```
{service}/
├── Dockerfile
├── requirements.txt
├── main.py          # FastAPI: routers + CORS + lifespan
├── db.py            # Supabase client + Settings (pydantic-settings)
├── auth.py          # JWT decode + require_role dependency
├── limiter.py       # slowapi rate limiter
├── app_logger.py    # log_event → tabela app_logs
├── routes/
│   ├── health.py    # GET /health (liveness) + GET /ready (readiness)
│   └── {module}.py
└── services/
    └── {specific}.py
```

`db.py`, `auth.py`, `limiter.py` e `app_logger.py` são cópias compartilhadas — mudanças devem ser replicadas nos 5 serviços.

### Schedulers

| Serviço | Job | Frequência |
|---|---|---|
| monitoring-service | run_all_checks | a cada 5 min |
| freshservice-service | run_daily_sync | diariamente às 9h UTC |
| moneypenny-service | run_daily_summaries | a cada hora (minuto 0) |
| agents-service | jobs dinâmicos por agente | configurável via CRUD |

---

## Autenticação e Segurança

- JWT HS256 assinado com `JWT_SECRET` (compartilhado entre todos os microsserviços)
- Token contém: `id`, `username`, `email`, `role` (`admin` ou `user`), `active`
- Rotas admin: `Depends(require_role("admin"))` — retorna 403 para role `user`
- Rate limits: login 10 req/min, registro 5 req/min (slowapi)
- Senhas: bcrypt, mínimo 8 caracteres
- Domínios permitidos para registro: `@voetur.com.br`, `@vtclog.com.br`
- Primeiro usuário registrado vira admin automaticamente

---

## Kong Gateway

Arquivo: `volumes/api/kong.yml` (config declarativa — restart do Kong aplica mudanças).

Ordem de roteamento (específico antes do genérico):
```
/api/monitoring   → monitoring-service:8002
/api/freshservice → freshservice-service:8003
/api/moneypenny   → moneypenny-service:8004
/api/agents       → agents-service:8005
/api/             → core-service:8001
```

CORS gerenciado pelos microsserviços (plugin Kong desabilitado para rotas de app).

---

## Schema do Banco

Arquivos SQL na raiz:
- `schema.sql` — tabelas core
- `schema_freshservice.sql` — tabelas do módulo Freshservice

Aplicar em banco novo:
```bash
docker exec -i jarvis-db-1 bash -c "PGPASSWORD='...' psql -U postgres -d postgres" < schema.sql
docker exec -i jarvis-db-1 bash -c "PGPASSWORD='...' psql -U postgres -d postgres" < schema_freshservice.sql
```

### Tabelas

| Tabela | Serviço | Descrição |
|---|---|---|
| `profiles` | core | Usuários — bcrypt, role admin/user |
| `connected_accounts` | moneypenny | OAuth Microsoft 365 — access/refresh token |
| `notification_prefs` | moneypenny | Preferências — channels_config JSONB, horário UTC |
| `app_logs` | todos | Audit trail — login, erros, alertas |
| `monitored_systems` | monitoring | Sistemas — tipo, URL, consecutive_down_count |
| `system_checks` | monitoring | Histórico de checks — status, latência, métricas |
| `scheduled_agents` | agents | Jobs agendados — cron, action |
| `agent_runs` | agents | Histórico de execuções |
| `freshservice_tickets` | freshservice | Tickets sincronizados |
| `freshservice_agents` | freshservice | Agentes do helpdesk |
| `freshservice_groups` | freshservice | Grupos do helpdesk |
| `freshservice_companies` | freshservice | Empresas do helpdesk |
| `freshservice_sync_log` | freshservice | Log de sincronizações |

---

## Variáveis de Ambiente

Ver `.env.example` na raiz para a lista completa. Variáveis críticas:

| Variável | Descrição |
|---|---|
| `POSTGRES_PASSWORD` | Senha PostgreSQL |
| `SUPABASE_JWT_SECRET` | JWT do Supabase (GoTrue + PostgREST + Kong) |
| `ANON_KEY` / `SERVICE_ROLE_KEY` | JWTs gerados do `SUPABASE_JWT_SECRET` |
| `JWT_SECRET` | JWT da aplicação (compartilhado entre microsserviços) |
| `FRESHSERVICE_API_KEY` | API key do Freshservice |
| `MICROSOFT_CLIENT_ID/TENANT_ID/SECRET` | Azure AD — app Moneypenny |
| `WHATSAPP_API_KEY` / `WHATSAPP_INSTANCE` | Evolution API |
| `MONITOR_AGENT_TOKENS` | Token de autenticação do monitor-agent |
| `VITE_API_URL` | URL da API para build do frontend |

Geração dos JWTs do Supabase:
```python
import jwt
secret = "SEU_SUPABASE_JWT_SECRET"
jwt.encode({"iss":"supabase-local","role":"anon","exp":2051222400}, secret, algorithm="HS256")
jwt.encode({"iss":"supabase-local","role":"service_role","exp":2051222400}, secret, algorithm="HS256")
```

---

## CI/CD

### GitHub Actions (`.github/workflows/deploy.yml`)

1. **security-scan** — Gitleaks (detecção de secrets no código)
2. **test-frontend** — typecheck + npm audit
3. **deploy** — self-hosted runner → `deploy.sh`

### Self-Hosted Runner

Runner em `C:\actions-runner` no servidor Windows.
- Conecta ao GitHub por saída (não abre portas)
- Iniciar após reboot: `Start-Process C:\actions-runner\run.cmd -WindowStyle Hidden`
- Como serviço permanente: `cd C:\actions-runner && .\config.cmd --runasservice`

### deploy.sh

```bash
cd $APP_DIR
git fetch origin main && git checkout origin/main
docker compose up -d --build
```

---

## Microsoft 365 / Azure AD

App: **Moneypenny**
Tenant: `fb902eca-dc08-4dec-9e2c-7ce70ee14cf5`
Scopes: `Calendars.Read Mail.Read Mail.Send User.Read`

Redirect URI (registrado no Azure AD):
```
https://jarvis.voetur.com.br/api/moneypenny/auth/microsoft/callback
```

---

## WhatsApp (Evolution API)

- Servidor: OCI São Paulo (bind 127.0.0.1 no host)
- Instância e credenciais: ver `.env`
- Envio em background — `ReadTimeout` tratado como entregue (OCI free tier lento)

---

## Comandos Úteis

```bash
# Status de todos os containers
docker compose ps

# Logs de um serviço
docker compose logs -f core-service
docker compose logs -f freshservice-service

# Rebuild de serviço específico
docker compose up -d --build freshservice-service

# Acessar banco
docker exec -it jarvis-db-1 bash -c "PGPASSWORD='...' psql -U postgres -d postgres"

# Métricas do servidor
curl http://localhost:9100/metrics

# Healthcheck
curl https://jarvis.voetur.com.br/api/health
curl https://jarvis.voetur.com.br/api/ready
```
