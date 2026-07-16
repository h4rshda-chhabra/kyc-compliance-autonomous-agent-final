# KYC Compliance Autonomous Agent

A Know Your Customer (KYC) compliance monitoring system with autonomous risk detection, AI-generated Suspicious Activity Reports (SARs), sanctions screening, and cross-company director contamination analysis.

## 📺 Demo Presentation

**https://drive.google.com/file/d/1liVNsRxCP1itV_xKf3C4hBCPp1Yawyc1/view?usp=sharing**

## 🎯 Features

- ✅ **Continuous autonomous monitoring** — APScheduler sweeps every monitored company on a 15-minute cycle (configurable)
- ✅ **Sanctions watchlist screening** — fuzzy matching against a pre-built lookup DB compiled from OFAC SDN + OpenSanctions
- ✅ **Adverse media monitoring** — Google News RSS ingestion with risk-relevant keyword analysis
- ✅ **AI-powered SAR generation** — Gemini / OpenRouter drafts SAR narratives automatically when a sanctions match coincides with a risk score ≥ 70
- ✅ **Cross-company director contamination detection** — flags companies sharing directors with high-risk or sanctioned entities
- ✅ **SAR review workflow** — compliance officer review queue → recommend deactivation → admin approval, with PDF export
- ✅ **Interactive dashboard** — clickable stat cards, risk drill-downs, monitoring timelines, agent execution views
- ✅ **Complete audit trail & role-based access control** — every automated and human action is logged

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript + Vite + Tailwind CSS 4, TanStack Query, React Router, Recharts |
| Backend | FastAPI + SQLAlchemy 2 + Alembic, PostgreSQL |
| AI | Google Gemini / OpenRouter for SAR narratives, FAISS for vector search |
| Matching | RapidFuzz for sanctions name matching |
| Scheduler | APScheduler for continuous monitoring sweeps |
| Reports | xhtml2pdf for SAR PDF export |

## 📁 Project Structure

```
├── backend/
│   ├── app/
│   │   ├── agents/        # Entity resolution agent
│   │   ├── orchestrator/  # Monitoring scheduler
│   │   ├── routes/        # auth, companies, dashboard, monitor, reports, review, audit, health
│   │   ├── services/      # Screening, media, SAR generation
│   │   └── models/        # SQLAlchemy models
│   ├── alembic/           # DB migrations
│   └── tests/
├── frontend/src/          # Pages, components, hooks, services
├── datasets/              # Sanctions source data + processed lookup DB
├── scripts/               # Seeding, preprocessing, demo automation
└── docs/SRS.md            # Software requirements specification
```

## 🚀 Quick Start

### Option A: Docker Compose

```bash
cp .env.example .env   # or create .env (see Configuration below)
docker compose up --build
```

- Frontend → http://localhost:5173
- Backend API → http://localhost:8000 (docs at `/docs`, API under `/api/v1`)
- PostgreSQL → localhost:5432 (`kyc` / `kyc` / `kyc_auditor`)

### Option B: Manual Setup

```bash
# 1. Database — Postgres running with the kyc_auditor DB (or use docker compose up postgres)

# 2. Backend
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload   # http://localhost:8000

# 3. Frontend (separate terminal)
cd frontend
npm install
npm run dev                      # http://localhost:5173
```

### Seed Demo Data

```bash
# From the repo root (backend venv active)
python scripts/seed_admin.py               # Admin login from ADMIN_* env vars
python scripts/seed_demo_data.py           # Demo companies + compliance officer
python scripts/seed_contamination_demo.py  # Cross-contamination scenario

# Or run the full guided demo setup:
scripts/run_demo.sh        # Windows: scripts/run_demo.ps1
```

### Demo Credentials

| Role | Email | Password |
|---|---|---|
| Compliance Officer | `demo@example.com` | `password123` |
| Admin | `ADMIN_EMAIL` from `.env` (default `admin@example.com`) | `ADMIN_PASSWORD` from `.env` |

> Admin accounts are never self-registerable — they are seeded from `.env` via `scripts/seed_admin.py`.

## ⚙️ Configuration (`.env`)

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | SQLAlchemy connection string | `postgresql+psycopg2://kyc:kyc@localhost:5432/kyc_auditor` |
| `SECRET_KEY` | JWT signing key | `change-me-in-env` |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_FULL_NAME` | Seeded admin account | `admin@example.com` / … |
| `GEMINI_API_KEY` | Google Gemini key for SAR narratives | — |
| `OPENROUTER_API_KEY` | OpenRouter fallback AI provider | — |
| `GOOGLE_NEWS_RSS` | Adverse media RSS endpoint | Google News search RSS |
| `SCHEDULER_ENABLED` | Toggle background monitoring | `true` |
| `MONITORING_SWEEP_INTERVAL_MINUTES` | Sweep frequency | `15` |
| `SAR_RISK_THRESHOLD` | Min risk score (0–100) to auto-draft a SAR | `70` |

At least one AI key (`GEMINI_API_KEY` or `OPENROUTER_API_KEY`) is required for agent execution.

## 🎬 Demo Scenarios

1. **Director contamination** — scan *Nordwind Capital Partners*; shared directors with sanctioned entities raise contamination alerts and queue a SAR.
2. **Watchlist update → risk escalation** — on a company detail page, click *Simulate Watchlist Update*; auto re-screening escalates risk from MEDIUM to HIGH (95) and drafts a SAR.
3. **Fully autonomous monitoring** — the background scheduler detects the watchlist change on its own sweep and generates a SAR with no manual trigger.
4. **Officer workflow** — review the SAR narrative and evidence, then *Recommend Deactivation* (moves to admin queue) or *Reject*; every action lands in the audit log.

Full step-by-step walkthrough: `scripts/run_demo.sh`.

## 📊 Dashboard

All stat cards are clickable:
- 🔍 **Under Monitoring** → view monitored companies
- 📄 **SARs to Review** → pending SAR reports
- 🚨 **High Risk Companies** → filter by risk level

## 🔐 Security

- JWT authentication with role-based access control (Compliance Officer / Admin)
- Restricted CORS origins
- Complete audit trail of automated and human actions
- SQL injection protection via SQLAlchemy ORM

---

**Built with** ⚡ Vite • React • FastAPI • SQLAlchemy
