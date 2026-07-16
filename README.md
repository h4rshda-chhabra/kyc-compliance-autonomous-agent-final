# Continuous KYC Autonomous Auditor

A continuous, autonomous KYC monitoring and audit platform, built for a 45-hour hackathon.

This repository is the **base repository** every developer clones. It is a working, compiling skeleton with no business logic, no agent implementations, and no real API behavior — every endpoint returns a dummy response and every page renders placeholder UI. The goal is that four people can `git clone`, run one setup command each for backend and frontend, and start building their own piece without touching shared scaffolding.

See `docs/` for the architecture design (added separately from this scaffold).

## Tech Stack

| Layer | Stack |
|---|---|
| Frontend | React + TypeScript + Vite + TailwindCSS + shadcn/ui + React Router + TanStack Query |
| Backend | FastAPI + SQLAlchemy + PostgreSQL + Pydantic + Alembic |
| AI | Gemini / OpenRouter (SDKs installed, not wired to any logic yet) |
| Scheduler | APScheduler (initialized, no jobs registered yet) |
| Vector Search | FAISS (dependency installed, not wired to any logic yet) |

## Folder Structure

```
continuous-kyc-autonomous-auditor/
├── backend/
│   ├── app/
│   │   ├── agents/        # autonomous agent graph nodes (empty — future phase)
│   │   ├── routes/        # FastAPI routers, one file per domain area
│   │   ├── services/      # business logic layer (empty — future phase)
│   │   ├── schemas/       # Pydantic request/response models
│   │   ├── database/      # SQLAlchemy engine/session/declarative base
│   │   ├── models/        # SQLAlchemy ORM models (13 tables)
│   │   ├── orchestrator/  # APScheduler lifecycle (no jobs yet)
│   │   ├── config/        # Settings (env-driven)
│   │   ├── utils/         # shared helpers (empty — future phase)
│   │   ├── middleware/    # request logging middleware
│   │   ├── core/          # logging setup
│   │   └── main.py        # FastAPI app factory
│   ├── alembic/           # migrations
│   ├── tests/
│   ├── requirements.txt
│   └── pyproject.toml
├── frontend/
│   ├── public/
│   └── src/
│       ├── components/    # shared components + shadcn/ui primitives
│       ├── pages/         # one component per route
│       ├── layouts/       # MainLayout (navbar + outlet)
│       ├── services/      # API client + TanStack Query client
│       ├── hooks/         # shared hooks
│       ├── types/         # TS interfaces mirroring backend models
│       ├── assets/
│       └── utils/         # cn() helper, etc.
├── datasets/processed/    # local data artifacts (gitignored contents)
├── scripts/                # one-off scripts (empty — future phase)
├── docs/                   # architecture and design docs
├── .github/workflows/      # CI
├── docker-compose.yml
└── .env.example
```

## Setup

### Prerequisites

- Python 3.11+
- Node.js 20+
- PostgreSQL 16 (or use `docker-compose up postgres`)

### 1. Environment variables

```bash
cp .env.example .env
```

Fill in `GEMINI_API_KEY` / `OPENROUTER_API_KEY` when you actually need them — the app runs without them.

### 2. Backend

```bash
cd backend
python -m venv .venv
.venv/Scripts/activate        # Windows
# source .venv/bin/activate   # macOS/Linux
pip install -r requirements.txt

# with Postgres running and DATABASE_URL set in .env:
alembic upgrade head

uvicorn app.main:app --reload
```

Backend runs at `http://localhost:8000`. Health check: `GET /api/v1/health`. Interactive docs: `http://localhost:8000/docs`.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`.

### 4. Everything via Docker Compose

```bash
docker-compose up --build
```

Starts Postgres, backend (`:8000`), and frontend (`:5173`) together.

## Development Workflow

- Each backend route file (`auth`, `dashboard`, `companies`, `monitor`, `reports`, `review`, `audit`) and each frontend page are independent — you can build one without waiting on another.
- Business logic goes in `backend/app/services/`, never directly in `routes/`.
- Agent implementations go in `backend/app/agents/`, wired together later in `backend/app/orchestrator/`.
- New DB tables/columns: edit the model in `backend/app/models/`, then `alembic revision --autogenerate -m "..."` and `alembic upgrade head`.
- New frontend types: keep `frontend/src/types/models.ts` in sync with `backend/app/models/` by hand.
- Run `ruff check app tests` + `black app tests` (backend) and `npm run lint` + `npm run format` (frontend) before pushing.

## Branch Strategy

- `main` — always deployable/demoable. Protected.
- `develop` — integration branch for the hackathon window.
- `feat/<area>-<short-desc>` — one branch per person per feature (e.g. `feat/agents-sanctions-screening`, `feat/frontend-dashboard`).
- Open a PR into `develop`, merge once CI is green. Merge `develop` into `main` at each demo-ready checkpoint.
- Rebase on `develop` before opening a PR to avoid last-minute conflicts.

## Commands Reference

| Command | Where | What |
|---|---|---|
| `uvicorn app.main:app --reload` | `backend/` | Run API with hot reload |
| `pytest -q` | `backend/` | Run backend tests |
| `ruff check app tests` | `backend/` | Lint backend |
| `black app tests` | `backend/` | Format backend |
| `alembic revision --autogenerate -m "msg"` | `backend/` | Generate a migration |
| `alembic upgrade head` | `backend/` | Apply migrations |
| `npm run dev` | `frontend/` | Run frontend dev server |
| `npm run build` | `frontend/` | Type-check + production build |
| `npm run lint` | `frontend/` | Lint frontend |
| `npm run format` | `frontend/` | Format frontend |
| `docker-compose up --build` | repo root | Run the full stack |

---

## Hackathon Demo Guide

### 1. API Keys & Configuration
Copy `.env.example` to `.env` in the root directory:
```bash
cp .env.example .env
```
Fill in the `GEMINI_API_KEY` (or `OPENROUTER_API_KEY`) to enable the agent reasoning nodes.

### 2. Preprocess Datasets
Download the OpenSanctions and OFAC SDN delimited CSV lists into `datasets/processed/` as described in the setup, then build the pre-indexed SQLite lookup file:
```bash
python scripts/preprocess_datasets.py
```

### 3. Database Migration & Seeding
Start your PostgreSQL instance and apply the Alembic database migrations:
```bash
# 1. Start Postgres service
docker-compose up -d postgres

# 2. Generate and apply SQLAlchemy tables schema
cd backend
alembic revision --autogenerate -m "initial_schema"
alembic upgrade head
cd ..

# 3. Seed the demo customer profiles and sanction matches
python scripts/seed_demo_data.py

# 4. (Optional) Create/refresh the admin login on its own — the demo seed
#    already creates it. ADMIN accounts are never self-registerable; the
#    credentials come from ADMIN_EMAIL / ADMIN_PASSWORD in .env.
python scripts/seed_admin.py
```

### 4. Run Diagnostics Verification
Run the diagnostics verification script to test system integrity:
```bash
python scripts/verify_demo.py
```

### 5. Expected Demo Outputs
The seed script creates two logins:
* **Compliance Officer**: `demo@example.com` / `password123`
* **Admin**: `admin@example.com` / `admin12345` (configurable via `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `.env`)

It also populates three specific profiles in the system database:
* **TechNova Solutions Pvt Ltd** (Clean Profile):
  * *Results*: No watchlist or media hits. Risk: **Low (15.0)**. Recommendation: **Approve**.
* **Vostok Shipping Agency** (Sanctions Match):
  * *Results*: Director *KIM, Yong Chol* matches an active entity on the OFAC SDN list. Risk: **High (95.0)**. Recommendation: **Reject**.
* **Theranos Inc** (Adverse Media Match):
  * *Results*: Director *Elizabeth Holmes* matches multiple negative news alerts. Risk: **Medium (65.0)**. Recommendation: **Manual Review**.

### 6. Running the Stack
Run the full local development stack (make sure ports `8000` and `5173` are free):
* **Backend API**: Run `uvicorn app.main:app --reload` inside `/backend`.
* **Frontend Portal**: Run `npm run dev` inside `/frontend` and access `http://localhost:5173`.

#   k y c - c o m p l i a n c e - a u t o n o m o u s - a g e n t - f i n a l  
 