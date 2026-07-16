# Software Requirements Specification

## Continuous KYC Autonomous Auditor

**Version:** 1.0
**Date:** 2026-07-15
**Status:** Reflects the implementation as it exists in this repository at the time of writing.

---

## 1. Introduction

### 1.1 Purpose

This document specifies the requirements for the **Continuous KYC Autonomous Auditor**, a system that autonomously and continuously monitors high-risk corporate entities for sanctions exposure, adverse media, and cross-entity director risk, and generates Suspicious Activity Report (SAR) drafts for human compliance review only when a material compliance event occurs.

It is written directly from the current implementation — every business rule, threshold, data field, and API route named here exists in the codebase as described, not as an aspirational design.

### 1.2 Scope

The system:

- Screens companies and their directors against a sanctions/watchlist dataset (OFAC SDN + OpenSanctions), using fuzzy name matching and entity resolution to reduce false positives.
- Screens for adverse media via live RSS news search, classified by keyword-based category and severity.
- Detects cross-company director contamination (a director shared with another already medium/high-risk company).
- Calculates a composite risk score and level per audit run.
- Runs this screening **continuously** on a scheduler, not only on manual request.
- Detects **material change** between audits and generates a new SAR draft only when warranted, preventing duplicate/near-identical reports.
- Provides a human-in-the-loop review workflow (approve/reject) for SAR drafts.
- Maintains a full audit trail of AI decisions and reviewer actions.
- Exposes all of the above through a REST API and a React single-page application.

Out of scope / not implemented: filing SARs with a real regulator, a real compliance notification channel (email/Slack — currently a logged placeholder), multi-tenant access control, and a distinct standalone "investigation agent" (see §9).

### 1.3 Definitions, Acronyms, Abbreviations

| Term | Meaning |
|---|---|
| SAR | Suspicious Activity Report — the draft compliance document this system generates |
| KYC | Know Your Customer |
| PEP | Politically Exposed Person |
| OFAC SDN | US Treasury Office of Foreign Assets Control, Specially Designated Nationals list |
| Material change | A compliance-relevant change in a company's risk profile, as defined in §5.6 |
| Monitoring run | One execution of the audit pipeline for one company, recorded in `monitoring_runs` |
| Sweep | One scheduled execution cycle that runs a monitoring run for every eligible company |

### 1.4 References

- Source repository: this codebase (`backend/`, `frontend/`).
- Sanctions dataset: OFAC SDN + OpenSanctions, pre-compiled into `datasets/processed/sanctions_lookup.db`.

### 1.5 Document Conventions

Functional requirements are numbered `FR-<module>.<n>`. Each cites the exact source file responsible for it. Constants and thresholds are given with their literal current values and the environment variable that overrides them, where applicable.

---

## 2. Overall Description

### 2.1 Product Perspective

The system is a self-contained three-tier application:

- **Backend**: FastAPI (Python) REST API, PostgreSQL for transactional/monitoring data, SQLite (read-only, pre-built) for the sanctions lookup dataset, APScheduler for the continuous monitoring loop.
- **Frontend**: React 19 + TypeScript single-page application (Vite), served independently and talking to the backend over HTTP.
- **Deployment**: Docker Compose, three services (`postgres`, `backend`, `frontend`) plus a bind-mounted `datasets/` volume.

### 2.2 Product Functions (Summary)

1. User authentication (register/login/logout, JWT session).
2. Company directory browsing (1.3M+ sanctions-dataset entities) and onboarding.
3. On-demand and scheduled (every 15 minutes by default) autonomous audits per company.
4. Sanctions screening with fuzzy entity resolution (company + each director).
5. Adverse media screening via live Google News RSS.
6. Cross-company director contamination detection.
7. Composite risk scoring (LOW / MEDIUM / HIGH).
8. Material-change detection between successive audits.
9. SAR draft generation, gated by sanctions + risk threshold + material change, with archive-not-delete versioning.
10. Human review workflow (approve/reject) for SAR drafts.
11. Full audit log of system and reviewer actions.
12. Dashboard, monitoring run history, and per-company timeline.

### 2.3 User Classes and Characteristics

| User class | Description | Access |
|---|---|---|
| Compliance Analyst / Reviewer | Reviews SAR drafts, approves/rejects, manually triggers scans | Full application access (single `role` value observed: `reviewer`) |
| System (scheduler) | Non-human actor that triggers scheduled sweeps | No UI; runs inside the backend process |

The system currently implements a single role (`reviewer`, set at registration, default value) with no differentiated permission tiers — any authenticated user can perform any action exposed by the API.

### 2.4 Operating Environment

- Backend: Python (FastAPI/Uvicorn), containerized, listens on port 8000.
- Frontend: Vite dev server (or static build), containerized, listens on port 5173.
- Database: PostgreSQL 16 (Alpine image), port 5432.
- Browser: any modern evergreen browser (React 19 target).

### 2.5 Design and Implementation Constraints

- Sanctions matching runs against a **pre-built, static SQLite file** (`datasets/processed/sanctions_lookup.db`); the system does not re-fetch or update this dataset at runtime.
- Adverse media screening depends on live internet access to `news.google.com` RSS endpoints (`GOOGLE_NEWS_RSS` setting); results are non-deterministic run to run.
- LLM-assisted SAR narrative polishing is optional and only activates if `GEMINI_API_KEY` is configured; otherwise a fully templated narrative is used.
- JWT auth is a hand-rolled HS256 implementation (`backend/app/core/security.py`), not a third-party library (e.g. `python-jose`).

### 2.6 Assumptions and Dependencies

- The sanctions lookup database exists and is mounted before backend startup.
- The `.env` file (or environment) provides `DATABASE_URL`, `SECRET_KEY`, and optionally `GEMINI_API_KEY`.
- Single-node deployment; the APScheduler instance is in-process, not distributed (running multiple backend replicas would duplicate scheduled sweeps).

---

## 3. System Architecture

### 3.1 Technology Stack

**Backend** (`backend/requirements.txt`):

| Component | Library | Version |
|---|---|---|
| Web framework | FastAPI | 0.115.6 |
| ASGI server | Uvicorn | 0.34.0 |
| Validation | Pydantic / pydantic-settings | 2.10.4 / 2.7.1 |
| ORM | SQLAlchemy | 2.0.36 |
| Migrations | Alembic | 1.14.0 |
| DB driver | psycopg2-binary | 2.9.10 |
| Scheduler | APScheduler | 3.10.4 |
| Fuzzy matching | RapidFuzz | 3.14.5 |
| RSS parsing | feedparser | 6.0.12 |
| LLM (optional) | google-generativeai | 0.8.3 |
| Markdown → SAR text | markdown | 3.10.2 |

**Frontend** (`frontend/package.json`):

| Component | Library | Version |
|---|---|---|
| UI framework | React / React DOM | 19.2.7 |
| Build tool | Vite | 8.1.1 |
| Routing | react-router-dom | 7.18.1 |
| Server state | @tanstack/react-query | 5.101.2 |
| HTTP client | axios | 1.18.1 |
| Styling | Tailwind CSS 4 (+ `@tailwindcss/typography`) | 4.3.2 |
| Charts | recharts | 3.9.2 |
| Markdown rendering | react-markdown | 10.1.0 |
| Animation | framer-motion | 12.42.2 |

### 3.2 Continuous Monitoring Pipeline

This is the core architectural pattern of the system, and it is deliberately split into stages with separated responsibilities:

```
Scheduler (APScheduler, every SWEEP_INTERVAL_MINUTES)
        │
        ▼
run_company_audit(company_id, trigger_type)      [backend/app/orchestrator/pipeline.py]
        │
        ├──▶ AgentOrchestrator.execute_audit()     — collects evidence, calculates risk.
        │        Returns AuditResult. Makes NO persistence or SAR decisions.
        │
        ├──▶ RiskChangeDetector.compare()          — diffs AuditResult against the
        │        company's last audit baseline (CompanyAuditState).
        │        Returns MaterialChangeResult (material_change_detected, change_type,
        │        change_summary, old_state, new_state). Computes no persistence,
        │        makes no SAR decision.
        │
        ├──▶ SARDecisionService.decide()           — the ONLY place that decides whether
        │        to generate a SAR. Consumes AuditResult, MaterialChangeResult, and the
        │        company's existing SAR(s) from the database.
        │
        └──▶ AgentOrchestrator.finalize()          — persists evidence, timeline events,
                 risk history, and the audit-state baseline UNCONDITIONALLY; generates
                 or archives the SAR document ONLY per SARDecisionService's decision.
```

Both the scheduler (`backend/app/orchestrator/scheduler.py`) and the manual "Scan now" API endpoint (`POST /monitor/companies/{id}/trigger`) call the same `run_company_audit()` entry point, so scheduled and manual runs are governed by identical rules.

### 3.3 Deployment Topology

`docker-compose.yml` defines:

- `postgres` — Postgres 16-alpine, credentials `kyc`/`kyc`, database `kyc_auditor`, healthchecked.
- `backend` — built from `./backend`, mounts `./backend` and `./datasets` as volumes, `uvicorn --reload` on port 8000, depends on `postgres` healthy.
- `frontend` — built from `./frontend`, mounts `./frontend` (with an anonymous `node_modules` volume), `vite --host 0.0.0.0` on port 5173, depends on `backend`.

---

## 4. Data Model

All tables below are SQLAlchemy ORM models under `backend/app/models/`, managed via Alembic (`backend/alembic/versions/`: `83bbeee0342b_initial_schema`, `ede3be15cf82_add_company_audit_state_table`).

| Table | Key columns | Purpose |
|---|---|---|
| `users` | `id (uuid pk)`, `email (unique)`, `hashed_password`, `full_name`, `role (default "reviewer")`, `is_active` | Application accounts |
| `companies` | `id (str pk` — either a sanctions-dataset entity id, or `CUSTOM-<hex8>` `)`, `legal_name`, `registration_number`, `jurisdiction`, `industry`, `monitoring_status`, `risk_level`, `onboarded_at` | The monitored entity; only materialized once first scanned or manually created |
| `company_directors` | `id (uuid pk)`, `company_id (fk)`, `full_name`, `role_title`, `nationality`, `date_of_birth`, `is_pep` | Directors/officers screened alongside their company |
| `company_audit_states` | `company_id (pk/fk)`, `last_risk_level`, `last_sanction_count`, `last_sanction_ids (json)`, `last_news_count`, `last_news_hash`, `last_entity_confidence`, `last_audit_at`, `last_sar_generated_at`, `last_sar_risk` | Baseline snapshot used by `RiskChangeDetector` to diff each new audit |
| `monitoring_runs` | `id (uuid pk)`, `company_id (fk)`, `trigger_type ("manual"\|"scheduled")`, `status ("running"\|"completed"\|"failed")`, `summary`, `started_at`, `completed_at` | One record per audit execution |
| `sanction_matches` | `id`, `company_id`, `monitoring_run_id`, `list_name`, `matched_name`, `match_score`, `status (default "pending_review")` | Persisted sanctions hits (only written when a SAR is generated for that run — see §5.6) |
| `news_articles` | `id`, `company_id`, `monitoring_run_id`, `title`, `url`, `source`, `sentiment`, `published_at` | Persisted adverse media hits (same gating as above) |
| `evidence` | `id`, `company_id`, `monitoring_run_id`, `evidence_type ("sanction"\|"adverse_media"\|"connected_entity")`, `source_url`, `content`, `collected_at` | Free-text evidence backing a finding |
| `risk_reports` | `id`, `company_id`, `monitoring_run_id`, `risk_score (float)`, `risk_level`, `rationale` | Risk-score time series — written on **every** run, regardless of SAR decision |
| `timeline_events` | `id`, `company_id`, `event_type`, `description`, `occurred_at` | Human-readable event log per company |
| `sar_reports` | `id`, `company_id`, `monitoring_run_id`, `status ("draft"\|"archived"\|deleted-on-decision)`, `narrative (text, markdown)`, `filed_at`, `created_at` | The generated SAR document |
| `human_reviews` | `id`, `company_id`, `monitoring_run_id`, `reviewer_id`, `decision`, `notes`, `reviewed_at` | Reviewer decision record |
| `audit_logs` | `id`, `actor`, `action`, `resource_type`, `resource_id`, `event_metadata (json)`, `created_at` | System-wide audit trail |
| `watchlist_matches` | *(defined, currently unused by the active pipeline — see §9)* | Legacy/placeholder |

The sanctions lookup dataset itself (`datasets/processed/sanctions_lookup.db`, SQLite, read-only) contains **1,338,308 entities** and **1,203,113 aliases** across 11 entity types (`Organization`, `Person`, `Vessel`, `Aircraft`, `Company`, `LegalEntity`, `Airplane`, `Security`, `Address`, `PublicBody`, `CryptoWallet`).

---

## 5. Functional Requirements

### 5.1 Authentication (`backend/app/routes/auth.py`)

- **FR-AUTH.1** — `POST /auth/register`: creates a user with `email`, `password` (min length 8), `full_name`, optional `role` (default `"reviewer"`). Password is hashed with PBKDF2-HMAC-SHA256, 100,000 iterations, random 16-byte salt (`backend/app/core/security.py`).
- **FR-AUTH.2** — `POST /auth/login`: verifies credentials, returns a bearer `access_token` (custom HS256 JWT, default expiry 30 minutes via `access_token_expire_minutes`). Rejects with 401 on bad credentials, 403 if `is_active` is false.
- **FR-AUTH.3** — `GET /auth/me`: returns the current user, resolved from the bearer token.
- **FR-AUTH.4** — `POST /auth/logout`: stateless no-op (client discards the token).
- **FR-AUTH.5** — The frontend clears the token and redirects to `/login` on any 401/403 from a non-auth endpoint (`frontend/src/services/apiClient.ts`), and gates all authenticated routes behind a token-presence guard (`RequireAuth`).

### 5.2 Company Directory & Onboarding (`backend/app/routes/companies.py`)

- **FR-COMP.1** — `GET /companies?q=`: merges live sanctions-dataset entities (`services/company_directory.py`) with any already-onboarded Postgres rows, deduplicated by id; supports substring search on legal name.
- **FR-COMP.2** — `GET /companies/{id}`: returns the onboarded record if it exists, else the raw directory entry.
- **FR-COMP.3** — `POST /companies`: creates a custom (non-dataset) company with id `CUSTOM-<8 hex chars>`, `monitoring_status="not_monitored"`, `risk_level="unknown"`.
- **FR-COMP.4** — First scan of a dataset entity auto-materializes it into `companies` (`monitor.py: trigger_manual_run`), with `jurisdiction` from the dataset's `countries` field and `industry` left `null` (the dataset carries no real industry field).

### 5.3 Sanctions Screening & Entity Resolution

- **FR-SCREEN.1** — For the company itself and every `company_directors` row, the system queries `sanctions_lookup.db` for primary-name and alias substring (`LIKE %name%`) matches (`AgentOrchestrator._get_sqlite_candidates`).
- **FR-SCREEN.2** — Raw candidates are scored by `EntityResolutionAgent` (`backend/app/agents/entity_resolution_agent.py`):
  - Base score = `max(token_sort_ratio, WRatio)` (RapidFuzz), against a **default threshold of 80.0**.
  - Nationality bonus **+5** / penalty **−10** if the candidate's country list does/doesn't overlap the subject's nationality.
  - DOB bonus **+10** / penalty **−15** on substring match / birth-year mismatch.
  - `final_confidence = clamp(0, 100, base_score + bonus − penalty)`; only kept if `final_confidence >= threshold`.
  - Each retained hit is tagged `subject_type: "company"` or `"director"`.
- **FR-SCREEN.3** — Results are ranked descending by `resolution_score`.

### 5.4 Adverse Media Screening

- **FR-MEDIA.1** — For the company name and up to 2 directors (3 queries max per run, to bound RSS load), the system fetches up to 5 articles each from Google News RSS (`services/rss_news_service.py`, endpoint from `GOOGLE_NEWS_RSS`).
- **FR-MEDIA.2** — Each article is classified by `NewsClassifier` (`services/news_classifier.py`) via regex keyword matching into one of 10 categories, each with a fixed severity:
  - **Critical**: Terror Financing, Sanctions, Money Laundering
  - **High**: Organized Crime, Bribery, Corruption, Tax Evasion, Fraud
  - **Medium**: Cybercrime, Litigation
  - **Low**: everything else (`"Other"`)
- **FR-MEDIA.3** — Only articles classified **Medium, High, or Critical** are retained as adverse-media alerts.

### 5.5 Cross-Company Director Contamination

- **FR-CONTAM.1** — `AgentOrchestrator._check_cross_company_contamination`: for each director of the company under audit, queries `company_directors` joined to `companies` for **the same full name** at a **different** company whose `risk_level` is `medium` or `high`.
- **FR-CONTAM.2** — Each hit is recorded as a `connected_entity` evidence item and folds into the risk score (§5.6) and into a `cross_company_contamination` timeline event.

### 5.6 Risk Scoring

Computed in `AgentOrchestrator.execute_audit()`:

- Base: `risk_score = 15.0`, `risk_level = "low"`.
- If any sanctions hit exists: `risk_score = max(15, 95) = 95`, `risk_level = "high"`.
- Else if any adverse-media hit has severity High/Critical: `risk_score = max(15, 65) = 65`, `risk_level = "medium"`.
- Else if any adverse-media hit exists (Medium severity): `risk_score = max(15, 40) = 40`, `risk_level = "medium"`.
- **Cross-director contamination escalation** (applied on top of the above): if any contamination alert exists, add **+30** (if any linked company is `high` risk) or **+25** (otherwise), capped at 100; a `"low"` level is bumped to `"medium"` if contamination is found (it does not by itself force `"high"`).
- `company.risk_level` and `company.monitoring_status` (`"escalated"` / `"review"` / `"monitored"`) are updated on **every** run, independent of SAR generation.

### 5.7 Material Change Detection (`backend/app/services/risk_change_detector.py`)

`RiskChangeDetector.compare(previous_state, current_audit_result)` diffs against `CompanyAuditState` and returns a `MaterialChangeResult` with one of these `change_type` values:

| `change_type` | Trigger condition |
|---|---|
| `NEW_DIRECTOR_SANCTION` | A newly-appeared sanction id belongs to a director (`subject_type == "director"`) |
| `NEW_SANCTION` | A newly-appeared sanction id belongs to the company itself (covers both "previously clean → now sanctioned" and "additional list matched") |
| `RISK_ESCALATION` | `risk_level` rank increased (`low`=0 < `medium`=1 < `high`=2) versus the last audit — only evaluated once a real prior reading exists |
| `NEW_ADVERSE_MEDIA` | Net-new adverse media article count since the last audit ≥ **2** (`ADVERSE_MEDIA_INCREASE_THRESHOLD`) |
| `ENTITY_CONFIDENCE_CHANGE` | Max entity-resolution confidence increased by ≥ **15.0** points (`ENTITY_CONFIDENCE_INCREASE_THRESHOLD`) since the last audit |
| `NO_CHANGE` | None of the above |

If multiple conditions fire, the highest-priority one (in the order listed) sets `change_type`; `change_summary` concatenates every triggered reason's human-readable text (e.g. *"Previously clean company is now sanctioned (2 hit(s)). Risk escalated from MEDIUM to HIGH."*).

### 5.8 SAR Generation Decision (`backend/app/services/sar_decision_service.py`)

`SARDecisionService.decide()` is the **sole** authority on SAR generation:

```
generate_new_sar =
    sanction_found                                   (len(audit_result.sanction_ids) > 0)
    AND risk_score >= SAR_RISK_THRESHOLD              (default 70.0, env SAR_RISK_THRESHOLD)
    AND ( no_previous_sar_exists  OR  material_change_detected )
```

- **If true**: every currently-active (non-`archived`) SAR for the company is set to `status="archived"` (never deleted); exactly one new SAR is created with `status="draft"`; an `AuditLog` entry (`action="notify_compliance"`) is written as a placeholder for a real notification channel; `CompanyAuditState.last_sar_generated_at` / `last_sar_risk` are updated.
- **If false**: no SAR row is created or modified. The most recent active SAR (if any) is returned **completely unchanged** — same `id`, same `created_at`. If no SAR has ever existed for the company, the response carries the message *"No SAR has been generated yet because no material compliance event has occurred."*

### 5.9 Evidence & Monitoring History Persistence (`AgentOrchestrator.finalize()`)

Regardless of the SAR decision, **every** monitoring run unconditionally persists:

- All sanctions hits (`sanction_matches` + `evidence`) and adverse-media hits (`news_articles` + `evidence`) found in that run.
- Cross-company contamination evidence (`evidence`, type `connected_entity`).
- Granular timeline events for each finding, plus one summary "why" event when `material_change_detected` is true.
- A `risk_reports` row (risk-score time series).
- The `monitoring_runs` row is marked `completed`/`failed` with a human-readable `summary`.
- An `audit_logs` entry (`action="run_monitoring"`) capturing `risk_level`, `material_change`, and `sar_generated`.
- The `company_audit_states` baseline row (used as the comparison basis for the *next* run).

### 5.10 Continuous Scheduling (`backend/app/orchestrator/scheduler.py`)

- **FR-SCHED.1** — On backend startup, an APScheduler `BackgroundScheduler` registers a single recurring job (`run_monitoring_sweep`), `IntervalTrigger(minutes=MONITORING_SWEEP_INTERVAL_MINUTES)` (default **15**), `max_instances=1`, `coalesce=True`. Disabled entirely if `SCHEDULER_ENABLED=false`.
- **FR-SCHED.2** — Each sweep queries every `companies` row where `monitoring_status != "onboarding"` and runs `run_company_audit(trigger_type="scheduled")` for each, catching and logging per-company exceptions so one failure doesn't abort the sweep.
- **FR-SCHED.3** — `POST /monitor/companies/{id}/trigger` runs the identical pipeline with `trigger_type="manual"`, auto-onboarding the company from the directory on first call.

### 5.11 Human Review Workflow (`backend/app/routes/review.py`)

- **FR-REVIEW.1** — `GET /review/sar`: lists all SAR reports (all statuses); the frontend excludes `archived` from the "awaiting review" queue but shows full history (including archived) on the company detail page.
- **FR-REVIEW.2** — `GET /review/sar/{id}`: fetches one SAR report.
- **FR-REVIEW.3** — `POST /review/sar/{id}/decision` with `{"decision": "approved" | "rejected"}`:
  - Writes a `human_reviews` row, a `timeline_events` row (`event_type="human_review"`), and an `audit_logs` entry (`action="submit_review"`).
  - On **approve**: `company.monitoring_status = "active"`.
  - On **reject**: `company.monitoring_status = "active"`, `company.risk_level = "low"` (analyst dismissal).
  - **The reviewed `SARReport` row is deleted** (not archived) after the decision is recorded — this is distinct from the archive-on-regeneration behavior in §5.8.

### 5.12 Audit Trail & Reporting

- **FR-AUDIT.1** — `GET /audit/logs`, `GET /audit/logs/{id}`: full system audit log (`backend/app/routes/audit.py`).
- **FR-REPORT.1** — `GET /reports/companies/{id}/risk`: latest risk report.
- **FR-REPORT.2** — `GET /reports/companies/{id}/timeline`: full timeline, newest first.
- **FR-REPORT.3** — `GET /reports/companies/{id}/evidence`: all evidence, newest first.
- **FR-DASH.1** — `GET /dashboard/summary`: total dataset company count, count of `monitoring_status="active"`, count of `"escalated"`, and count of SAR reports with `status="pending_review"`.

### 5.13 Frontend Application

Routes (`frontend/src/App.tsx`), all under `RequireAuth` except `/login` and `/signup`:

| Route | Page | Purpose |
|---|---|---|
| `/login`, `/signup` | `LoginPage`, `SignupPage` | Auth, including a one-click "Explore the demo" login |
| `/` | `DashboardPage` | Summary tiles, risk distribution chart, recent monitoring runs |
| `/companies` | `CompaniesPage` | Directory table with search, status/risk badges, manual scan trigger |
| `/companies/:id` | `CompanyDetailPage` | Overview / Timeline / Reports (SAR history + evidence) tabs |
| `/companies/:companyId/execute` | `AgentExecution` | Animated "agent pipeline" view driving the real `/monitor/.../trigger` call |
| `/monitoring` | `MonitoringPage` | Monitoring run history |
| `/reviews` | `SarReviewsPage` | Active SAR review queue (archived excluded) |
| `/sar/:id` | `SarReviewPage` | Full SAR narrative (rendered as Markdown via `react-markdown` + Tailwind Typography), approve/reject actions |
| `/audit` | `AuditPage` | Audit log viewer |
| `/profile` | `ProfilePage` | Current user info |

---

## 6. External Interface Requirements — API Summary

Base path: `/api/v1`. All routes except `/health`, `/auth/register`, `/auth/login` require `Authorization: Bearer <token>`.

| Method & Path | Purpose |
|---|---|
| `GET /health` | Liveness check |
| `POST /auth/register` | Create account |
| `POST /auth/login` | Obtain access token |
| `GET /auth/me` | Current user |
| `POST /auth/logout` | Client-side token discard |
| `GET /companies` | Directory + onboarded companies (search via `?q=`) |
| `GET /companies/{id}` | One company |
| `POST /companies` | Create custom company |
| `GET /monitor/runs` | All monitoring runs |
| `GET /monitor/runs/{id}` | One monitoring run |
| `POST /monitor/companies/{id}/trigger` | Run the full audit pipeline now (manual) |
| `GET /review/sar` | All SAR reports |
| `GET /review/sar/{id}` | One SAR report |
| `POST /review/sar/{id}/decision` | Approve/reject a SAR |
| `GET /reports/companies/{id}/risk` | Latest risk report |
| `GET /reports/companies/{id}/timeline` | Company timeline |
| `GET /reports/companies/{id}/evidence` | Company evidence |
| `GET /audit/logs` | Full audit log |
| `GET /audit/logs/{id}` | One audit log entry |
| `GET /dashboard/summary` | Dashboard tile counts |

---

## 7. Non-Functional Requirements

- **NFR-PERF.1** — Sanctions candidate lookup narrows via an indexed SQL `LIKE` query before fuzzy scoring, to keep per-name screening tractable against a 1.3M-row dataset (`sanctions_screening.py` design note; the active path in `orchestrator.py` uses the equivalent narrow-then-score pattern via `_get_sqlite_candidates`).
- **NFR-PERF.2** — Adverse media queries are capped at 3 subjects × 5 articles per monitoring run to bound external RSS latency and avoid rate limiting.
- **NFR-REL.1** — A scheduled sweep isolates per-company failures (`try/except` around each `run_company_audit` call) so one failing company does not abort the sweep; failed runs are recorded with `status="failed"` and the exception message.
- **NFR-REL.2** — `execute_audit()` and `finalize()` each roll back their own transaction and mark the `monitoring_run` as `"failed"` on any exception, rather than leaving a run stuck `"running"`.
- **NFR-SEC.1** — Passwords: PBKDF2-HMAC-SHA256, 100,000 iterations, per-user random salt.
- **NFR-SEC.2** — Sessions: HS256-signed JWT, server-side secret (`SECRET_KEY`), signature and expiry verified on every request; CORS restricted to `cors_allow_origins` (default `http://localhost:5173`).
- **NFR-USAB.1** — Failed or unauthenticated API calls clear the client-side session and redirect to `/login` rather than rendering a broken authenticated view.
- **NFR-MAINT.1** — The audit pipeline is split into four independently testable stages (§3.2) specifically so evidence collection, diffing, and the SAR-generation policy can each change without the others being touched.
- **NFR-SCAL.1** — The scheduler is a single in-process `BackgroundScheduler`; horizontal scaling of the backend would duplicate scheduled sweeps unless externalized (not currently implemented).

---

## 8. Configuration Reference

All settings load from environment / `.env` (`backend/app/config/settings.py`):

| Setting | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | `postgresql+psycopg2://kyc:kyc@localhost:5432/kyc_auditor` | Postgres connection |
| `SANCTIONS_DB_PATH` | `datasets/processed/sanctions_lookup.db` | Sanctions SQLite dataset |
| `SECRET_KEY` | `change-me-in-env` | JWT signing key |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` | JWT lifetime |
| `GEMINI_API_KEY` | unset | Enables LLM-polished SAR narratives if present |
| `GOOGLE_NEWS_RSS` | `https://news.google.com/rss/search` | Adverse media source |
| `SCHEDULER_ENABLED` | `true` | Toggle the continuous sweep entirely |
| `MONITORING_SWEEP_INTERVAL_MINUTES` | `15` | Continuous sweep interval |
| `SAR_RISK_THRESHOLD` | `70.0` | Minimum risk score (0-100) for SAR eligibility |
| `CORS_ALLOW_ORIGINS` | `["http://localhost:5173"]` | Allowed frontend origins |

---

## 9. Known Limitations & Unused Components

Documented explicitly because this SRS is meant to describe the system *exactly* as built:

- **No distinct "investigation agent."** The challenge concept of a separate deep-dive agent triggered specifically by a high-risk signal is not implemented as a separate component — all screening (sanctions, media, contamination) runs identically on every audit, whether scheduled or manual.
- **`watchlist_matches` table and `services/sanctions_screening.py`** are defined but not called by the active pipeline (`AgentOrchestrator` uses its own inline SQLite query + `EntityResolutionAgent` instead). Legacy/dead code, kept for schema compatibility.
- **Single role.** `User.role` exists and defaults to `"reviewer"`, but no endpoint currently enforces role-based authorization — any authenticated user can approve/reject SARs.
- **Notification channel is a log entry.** "Notify compliance" on SAR generation writes an `AuditLog` row (`action="notify_compliance"`); no email/Slack/webhook integration exists yet.
- **`monitoring_status` values are informally defined** across the codebase (`"onboarding"`, `"not_monitored"`, `"monitored"`, `"review"`, `"escalated"`, `"active"`) rather than a single enum, set by different routes for different purposes — accurately reflects current behavior, not necessarily ideal design.
- **Test coverage is minimal.** `backend/tests/` exists with `pytest`/`pytest-asyncio` wired up (`conftest.py`), but at the time of writing it contains only `test_health.py` (a liveness-check test) — no automated coverage of the audit pipeline, SAR decision logic, or API routes described in this document.
