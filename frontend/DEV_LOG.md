# Frontend Dev Log

## 2026-07-14

**Scaffolded the frontend project** — `/frontend` previously had only empty placeholder folders (`src/components`, `hooks`, `layouts`, `pages`, `services`, `types`, `utils`) with no `package.json` or build config. Set up:

- Vite + React 19 + TypeScript (scaffolded via `npm create vite@latest`, merged into the existing folder structure so the placeholder subfolders were preserved).
- Tailwind CSS v4 via `@tailwindcss/vite` plugin; `src/index.css` now just `@import "tailwindcss";` plus shadcn theme tokens.
- `@/*` path alias wired in `tsconfig.json`, `tsconfig.app.json`, and `vite.config.ts` (required for shadcn/ui resolution; note TS 6.0 deprecates `baseUrl` so `paths` is declared without it).
- shadcn/ui initialized (`components.json`, `src/lib/utils.ts`, `src/components/ui/button.tsx`, theme CSS vars). Used `shadcn@4.12.0` — `shadcn@latest` (4.13.0) currently fails `init` outside a git repo/monorepo (`Could not load the workspace config`) due to its workspace-root detection walking up looking for `.git`.
- Installed `framer-motion`, `@tanstack/react-query`, and `axios` (foundation for the `apiClient` service described in the project rules — not yet implemented).
- Replaced the default Vite demo `App.tsx`/`App.css`/template assets with a minimal placeholder page.
- Verified: `tsc -b --noEmit` clean, `npm run dev` boots without errors, all modules serve 200.

**Not yet done:** `@/services/apiClient`, TanStack Query provider setup, actual pages/routes, dashboard/company/report/review/audit views.

---

**Added `uipro-cli` design-system skill (repo root, not frontend-scoped)** — user installed `uipro-cli` globally and ran `uipro init --ai all` from the **monorepo root** (`kyc-compliance-autonomous-agent-develop/`), not inside `/frontend`. This dropped a `ui-ux-pro-max` skill (SKILL.md + CSV data + Python `search.py`/`design_system.py`/`core.py` scripts covering styles, palettes, font pairings, charts, and per-stack UX guidelines incl. React/Tailwind/shadcn) into a config folder for every supported AI assistant: `.agent`, `.claude`, `.codebuddy`, `.codex`, `.continue`, `.cursor`, `.gemini`, `.kiro`, `.opencode`, `.qoder`, `.roo`, `.trae`, `.windsurf`. It's tooling/config, not application code — no changes under `/frontend/src`. Relevant going forward: this skill can be invoked to get design-system recommendations (colors, typography, component patterns) before building new UI, particularly for the shadcn/Tailwind stack this project uses.

---

**Wired up shadcn MCP server for Claude Code** — ran `npx shadcn@latest mcp init --client claude` from `/frontend`. Wrote `frontend/.mcp.json` registering the `shadcn` MCP server (`npx shadcn@latest mcp`), which exposes component search/examples from the shadcn registry as MCP tools instead of only the CLI. Requires a Claude Code session restart/reload to pick up the new server.

---

**Drafted `src/types/models.ts`** — `/backend/app/models` is empty scaffolding (no SQLAlchemy models exist yet to mirror), so per user direction these types were authored from the KYC domain + the 7 documented API routes rather than read from backend code. Added:

- Entities: `Company`, `MonitoringRun`, `RiskReport`, `Review`, `AuditLog`, `DashboardSummary`
- Shared unions: `RiskLevel`, `CompanyStatus`, `MonitoringRunStatus`, `MonitoringTriggerType`, `RiskReportStatus`, `ReviewDecision`

**Pending user review** — these fields are a proposal, not confirmed against a real backend contract. Once corrected/approved, next up is `@/services/apiClient` and TanStack Query hooks built on top of these types.

---

**Built the full app shell + all 7 route views** — user supplied AI-generated "Cyber Sentinel" HTML mockups (Dashboard / Live Investigation / Company List) as reference. Per user decisions: build to our existing specifications, **keep the shadcn neutral theme** (not the mockups' Material-3 palette), **keep "Continuous KYC Autonomous Auditor" branding** (not "Cyber Sentinel"). Mockup layout ideas (sidebar nav, stat-card grid, table-in-card) were adapted; hardcoded mock data, stock photos, and CDN-Tailwind were not.

- Deps: added `react-router-dom`. shadcn components added via `shadcn@4.12.0 add`: card, table, badge, input, skeleton, avatar, separator, tabs.
- `src/services/apiClient.ts` — axios instance, base URL `${VITE_API_BASE_URL ?? http://localhost:8000}/api/v1`; `.env.example` documents the var.
- `src/main.tsx` — wrapped app in `QueryClientProvider` (staleTime 30s, no refetch-on-focus) + `BrowserRouter`.
- Hooks (one per resource, all via apiClient + models.ts types): `useDashboardSummary` (/dashboard/summary), `useCompanies`+`useCompany` (/companies, /companies/{id}), `useMonitoringRuns` (/monitor/runs), `useReports` (/reports), `useReviews` (/review), `useAuditLogs` (/audit).
- `src/layouts/AppLayout.tsx` — fixed sidebar (desktop) + bottom tab bar (mobile), framer-motion page-enter transition keyed on pathname.
- Shared components: `PageHeader`, `EmptyState`, `ErrorState` (with retry), `status-badges.tsx` (RiskBadge, CompanyStatusBadge, RunStatusBadge, ReportStatusBadge, ReviewDecisionBadge — tinted per level/status, dark-mode variants included).
- Pages: `DashboardPage` (5 stat cards, staggered framer-motion entrance, skeleton loading), `CompaniesPage` (searchable table, links to detail), `CompanyDetailPage` (profile card + back nav), `MonitoringPage`, `ReportsPage`, `ReviewsPage`, `AuditPage` (all tables in cards with loading/error/empty states).
- Routing in `App.tsx`: `/`, `/companies`, `/companies/:id`, `/monitoring`, `/reports`, `/reviews`, `/audit`, wildcard → `/`.
- Verified: `tsc -b` clean, all 7 routes + all page modules serve 200 on fresh dev server, `npm run build` succeeds (one >500 kB chunk warning — consider route-level code-splitting later).
- Gotcha noted: `TaskStop` on the npm dev-server wrapper leaves the node child holding the port on Windows — kill via `Get-NetTCPConnection -LocalPort <port>` + `Stop-Process`.

---

**Added dark mode toggle** — theme persisted in `localStorage("theme")`, applied via `.dark` class on `<html>` (matches the `@custom-variant dark` already in `index.css`).

- `index.html`: inline pre-paint script (saved theme, else `prefers-color-scheme`) to prevent flash of wrong theme.
- `src/hooks/useTheme.ts`: theme state + toggle, syncs class and localStorage.
- `src/components/ThemeToggle.tsx`: ghost icon button, sun/moon crossfade-rotate via framer-motion `AnimatePresence`.
- Placed in desktop sidebar footer and mobile top bar (`AppLayout`).
- Verified: `tsc -b` clean, `npm run build` succeeds.

---

**Added Login & Signup pages** — user asked to build them "with the code i gave", but the earlier mockup paste was truncated before any login/signup mockup; per user choice, built in the app's own style instead (shadcn neutral theme, KYC Auditor branding).

- shadcn components added: `label`, `checkbox`.
- `src/layouts/AuthLayout.tsx` — split-screen: form panel (with brand mark + ThemeToggle) and a `bg-primary` marketing panel (hidden below `lg`) with staggered framer-motion feature highlights.
- `src/components/PasswordInput.tsx` — Input wrapper with eye/eye-off visibility toggle.
- `src/pages/LoginPage.tsx` — email/password with client-side validation (email regex, min 8 chars), remember-me checkbox, forgot-password stub.
- `src/pages/SignupPage.tsx` — name/email/password/confirm + terms checkbox, full validation incl. password match.
- Routes `/login` and `/signup` under `AuthLayout` in `App.tsx`.
- **Important:** submit is simulated (600 ms spinner → navigate to `/`). No `/auth` endpoints exist in the backend contract (the 7 documented routes don't include auth), so there is no real session/token handling, no route guarding, and app routes remain publicly reachable. Wire to real auth + add protected routes once the backend defines the contract.
- Verified: `tsc -b` clean; `/login`, `/signup`, and all modules serve 200 on dev server.

---

**Added Log out button** — sidebar (desktop): full-width "Log out" row above the theme-toggle footer, destructive hover tint; mobile top bar: LogOut icon button next to ThemeToggle. Both call `handleLogout()` in `AppLayout`, which currently just navigates to `/login` (no real session to clear — same simulated-auth caveat as the login/signup entry). `tsc -b` clean.

---

**Added user profile menu + Profile page** — shadcn `dropdown-menu` added.

- `src/lib/currentUser.ts` — **placeholder** profile constant (name/role/email) + `userInitials()`; deliberately NOT in `types/models.ts` since no User model exists in the backend contract. Swap for real session data later.
- `src/components/UserMenu.tsx` — avatar (initials fallback) dropdown with user info header, "View profile" → `/profile`, and destructive "Log out" → `/login`. Two variants: `full` (avatar + name + role row, used in sidebar footer) and `compact` (avatar only, used in mobile top bar).
- `src/pages/ProfilePage.tsx` at `/profile` — avatar, role badge, detail rows; explicitly labels the data as placeholder pending a backend user endpoint.
- Layout changes: sidebar footer now stacks UserMenu above the existing Log out row; **mobile top bar's standalone logout icon was replaced by the compact UserMenu** (logout now lives inside the menu there) to avoid crowding.
- Verified: `tsc -b` clean, `npm run build` succeeds.

---

**Hackathon plan build-out: Investigation Workspace, SAR Review, Dashboard charts** — user supplied a 50h hackathon frontend plan (Next.js/dark-slate/new screens) and asked for adherence check. Decisions made: **stay on Vite** (plan's Next.js rejected — original spec + zero migration value), **keep current neutral theme** (plan's dark slate palette rejected), **demo data in a separate mock layer** (plan's investigation/people/timeline/SAR screens have no backend contract; `models.ts` untouched).

- Deps: `recharts`, `@xyflow/react`. shadcn: `progress`, `dialog`, `scroll-area` (fixed registry's unused React import in scroll-area.tsx for `noUnusedLocals`).
- **Chart palette validated with the dataviz six-checks validator**: risk status colors = 600-steps light (#059669/#d97706/#ea580c/#dc2626) / 400-steps dark (#34d399/#fbbf24/#fb923c/#f87171), as CSS vars `--risk-*` + `--chart-line` in index.css. Amber↔orange CVD pair is inherently weak on severity scales → relief everywhere: direct labels, legends, 2px gaps; never color-alone.
- `src/mocks/demoTypes.ts` + `demoData.ts` — demo-only types & one coherent story (ABC Logistics, director Rajesh Sharma OFAC hit, risk 32→87, 4 evidence exhibits, 5 people, 5 timeline events, full SAR document).
- `src/hooks/useInvestigationSimulation.ts` — plays a 12-step scripted agent investigation (~19s): agent status transitions, feed lines, evidence drops, progress 0→100, phase idle/running/completed.
- Charts (`src/components/charts/`): `RiskDistributionChart` (donut + center total + legend w/ counts), `RiskHistoryChart` (line, crosshair tooltip), `RiskGauge` (semicircle + score + level label).
- Investigation components (`src/components/investigation/`): `AgentPanel` (status dots, running pulse), `LiveFeed` (auto-scroll reasoning stream), `EvidencePanel` (cards → Dialog popup with source/confidence), `RelationshipGraph` (@xyflow/react static graph, flagged nodes in risk-critical color), `InvestigationResult` (risk 32→87 strip, confidence, root cause, recommendations, evidence, graph, link to SAR).
- **CompanyDetailPage rebuilt as tabbed workspace**: Overview (profile + RiskGauge + RiskHistory + latest alerts), People (director/UBO/shareholder cards w/ flags), Investigation (start button → 3-panel live view → result view), Timeline (vertical, risk-colored dots, confidence badges), Reports (SAR card → /sar/:id).
- `SarReviewPage` at `/sar/:id` — document-style SAR with numbered sections, Approve/Reject/Export actions (decision local-only, demo).
- Dashboard upgraded: + Risk Distribution donut, Active Investigations progress cards (link into workspaces), Recent Alerts table.
- Verified: `tsc -b` clean, `npm run build` succeeds, all routes + new modules 200. Known: single JS chunk >500 kB (recharts+xyflow) — route-level code-splitting is the next perf task if needed.
- Plan items intentionally NOT built: `/settings` page, audit-log filters, alerts-by-type bar chart (low value vs. time). Companies page kept as table (plan wanted cards+filters).

---

**Added "Explore the demo" button on Login** — outline button under the sign-in CTA (separated by an "or" divider, Sparkles icon, spinner state). Skips credential entry entirely: 600 ms simulated load → navigate to `/`. Both buttons disable while either is loading. Same simulated-auth caveat as before. `tsc -b` clean.

---

**Hardcoded-data mode: every screen now works without the backend** — per user request (backend being built by a teammate; integrate later, then remove hardcoding).

- `src/mocks/apiMockData.ts` — hardcoded datasets typed **exactly** against `types/models.ts`: `DashboardSummary`, 8 `Company` rows (ids 1–8, incl. ABC Logistics id 1 and Northgate Capital id 7 matching the demo story), 8 `MonitoringRun`s, 5 `RiskReport`s (ABC = score 87 pending_review), 5 `Review`s, 12 `AuditLog`s. All cross-references (company_id, report_id, monitoring_run_id) are consistent.
- `src/mocks/mockAdapter.ts` — custom axios adapter resolving all 7 contract routes (`/dashboard/summary`, `/companies`, `/companies/{id}`, `/monitor/runs`, `/reports`, `/review`, `/audit`) with 450 ms latency (skeletons stay visible); unknown routes reject with a 404 AxiosError → ErrorState renders.
- `services/apiClient.ts` — adapter attached only when `VITE_USE_MOCKS !== "false"` (default ON). Pages/hooks/types untouched — they still go through apiClient exactly as before.
- RiskGauge critical threshold moved 80→90 so score 87 renders "High" (matches the demo narrative).
- **Integration plan agreed with user:** when the teammate's backend is ready — (1) set `VITE_USE_MOCKS=false` in `.env`, verify every screen against real endpoints; (2) then delete `src/mocks/apiMockData.ts`, `src/mocks/mockAdapter.ts`, and the adapter wiring in `apiClient.ts`. (`src/mocks/demoTypes.ts`/`demoData.ts` for investigation/SAR screens stay until those endpoints exist too.)
- Verified: `tsc -b` clean, build succeeds, all routes 200.

---

**Aligned frontend to the REAL backend contract** — teammate's backend now exists (clone of h4rshda-chhabra/kyc-compliance-autonomous-agent, branch `develop`); its SQLAlchemy models + FastAPI routes differ from the originally documented contract, so the frontend was rebuilt against reality (backend untouched, read-only).

- `types/models.ts` now mirrors `backend/app/models/*.py` 1:1: **all IDs are UUID strings**; `Company{legal_name, jurisdiction, monitoring_status, nullable registration/industry/onboarded_at}`; `MonitoringRun{summary, no agent_name/findings_count}`; `RiskReport{rationale}`; `HumanReview{notes, reviewer_id}`; new `SARReport`, `Evidence`, `TimelineEvent`, `User`, `LoginResponse`; `RiskLevel` gains `"unknown"`; free-string statuses typed as `string` with known values in comments.
- Status badges rewritten: accept any string, style known values, neutral fallback; added `SarStatusBadge`.
- Hooks: `/audit/logs` (was `/audit`); deleted `useReports`/`useReviews`; new `useSarReports`/`useSarReport`/`useSarDecision` (`/review/sar`, `/review/sar/{id}`, POST `.../decision`) and `useAuth` (`useLogin`→POST `/auth/login` storing `access_token`, `useLogout`, `useCurrentUser`→GET `/auth/me`).
- Pages: Dashboard summary now the real 4 keys (`total_companies, active_monitoring, escalated, open_reviews`); Companies/CompanyDetail use new fields + nullable fallbacks ("—"); Monitoring shows Summary column, short run ids, company-name lookup; **ReportsPage + ReviewsPage replaced by SarReviewsPage** (`/reviews`, `/reports` redirects there); SarReviewPage loads the real SAR via hook, Approve/Reject POSTs the decision (rich sectioned document kept for the ABC demo SAR, plain narrative otherwise); AuditPage shows resource_type/resource_id; Profile + UserMenu read `GET /auth/me`; login form + demo button both go through `useLogin`; logout POSTs `/auth/logout`.
- Nav: Dashboard, Companies, Monitoring, SAR Reviews, Audit Trail.
- Note for backend teammate: dummy route payloads currently return only partial fields (e.g. `/companies/{id}` returns 4 keys) — once they serialize full models, everything matches `types/models.ts`.

---

## 2026-07-15

**Removed the hardcoded API layer — frontend now talks to the real backend only.**

- Deleted `src/mocks/apiMockData.ts` + `src/mocks/mockAdapter.ts`; `services/apiClient.ts` is a plain axios instance again; `VITE_USE_MOCKS` removed from `.env.example`. All contract screens (Dashboard, Companies, Monitoring, SAR Reviews, Audit, auth/profile) hit `http://localhost:8000/api/v1/*` directly.
- **Expected UI state right now:** backend dummy routes return `[]`/zeros/partial objects → lists show their empty states, dashboard shows 0s, company detail shows "—" fallbacks. This is correct integration behavior; it fills in as the backend implements real serialization.
- Guarded against partial `/auth/me` dummy payload (no `full_name`) — UserMenu/Profile fall back to email instead of crashing.
- **KEPT (presentation-only demo layer, no backend equivalent yet):** `src/mocks/demoIds.ts` (fake UUID constants), `demoTypes.ts`, `demoData.ts`, the investigation simulation, demo content in the company workspace tabs (People/Investigation/Timeline), dashboard's Risk Distribution / Active Investigations / Recent Alerts widgets, and the ABC SAR's rich document sections. Demo links point at fake UUIDs → clicking them 404s against the real backend (error state with retry) — expected until real data exists.

---

**Folder consolidation + reconstruction** — user deleted the original `-develop` working copy and consolidated into the git clone (`kyc-compliance-autonomous-agent`). The frontend copied into the clone beforehand was a stale pre-alignment snapshot mixed with old skeleton files (`router.tsx`, `tailwind.config.js`, old pages, `apiMockData.ts`, `ReportsPage`, etc.). Reconstructed the final state (backend alignment + mock removal) directly in the clone from the assistant's working context, deleted stale files, and re-verified. Teammate's `Dockerfile`/`.dockerignore` preserved. The old skeleton remains recoverable via git history; the pre-alignment snapshot exists in `kyc-compliance-autonomous-agent-develop.zip` on the Desktop.

---

**Discovered the "reconstruction" above never actually landed on disk, then rebuilt it for real.** A fresh session found `src/main.tsx` importing `./App.tsx`, but `App.tsx` didn't exist — nor did `AppLayout`, `UserMenu`, `LoginPage`, `ProfilePage`, `DashboardPage`, `CompaniesPage`, `CompanyDetailPage`, `MonitoringPage`, `SarReviewsPage`, `SarReviewPage`, or `AuditPage`. Only `AuthLayout.tsx` and `SignupPage.tsx` had survived; the app could not build. Root cause unclear (likely the consolidation step wrote its summary before the files were actually persisted) — noted for awareness, not chased further.

- Rebuilt every missing file from scratch, matching the conventions of what *did* survive (`AuthLayout`, `SignupPage`, `status-badges`, charts, `lib/utils.ts`, the base-ui-flavored shadcn primitives). `App.tsx` routes: `/login`, `/signup` under `AuthLayout`; `/`, `/companies`, `/companies/:id`, `/monitoring`, `/reviews`, `/sar/:id`, `/audit`, `/profile` under `AppLayout`; wildcard → `/`.
- `AppLayout.tsx` — desktop sidebar (nav + `UserMenu` + logout row + `ThemeToggle`) and a mobile top bar + bottom tab bar, framer-motion page-enter transition keyed on pathname.
- `UserMenu.tsx` — avatar dropdown backed by the real `useCurrentUser`/`useLogout` hooks (not a placeholder), `full`/`compact` variants for sidebar vs. mobile.
- `LoginPage.tsx` now goes through the real `useLogin` hook (POSTs `/auth/login`, stores the token) instead of a simulated timeout; kept the "Explore the demo" shortcut (logs in with a fixed demo credential pair — the dummy backend accepts any credentials).
- **Verified against the actual backend code** (`/backend/app/models/*.py`, `/backend/app/routes/*.py`) rather than assumptions — `types/models.ts` already matched 1:1 and needed no changes, but two real endpoints existed with no frontend hook wired to them:
  - `GET /reports/companies/{id}/risk|timeline|evidence` → new `hooks/useReports.ts`. Company Detail's risk gauge, Timeline tab, and Evidence section now read this real data instead of anything hardcoded.
  - `POST /monitor/companies/{id}/trigger` → `useTriggerMonitoringRun` added to `hooks/useMonitoringRuns.ts` (alongside `useMonitoringRun` for a single run).
- `apiClient.ts` gained a request interceptor attaching `Authorization: Bearer <access_token>` from `localStorage` — it was being stored on login but never actually sent.

---

**Removed the demo/presentation-only layer entirely, per user request — the app is now 100% backend-driven.** Previously several screens showed a fixed "ABC Logistics / director Rajesh Sharma" narrative (OFAC hit, scripted investigation, People tab, rich SAR document) since the backend had no equivalent endpoints. User asked to cut this rather than keep carrying it.

- Deleted `src/mocks/` (`demoData.ts`, `demoTypes.ts`, `demoIds.ts`), `src/hooks/useInvestigationSimulation.ts`, `src/components/investigation/` (`AgentPanel`, `EvidencePanel`, `InvestigationResult`, `LiveFeed`, `RelationshipGraph`), and `src/components/charts/RiskHistoryChart.tsx` (no backend endpoint returns a risk time series — `/reports/companies/{id}/risk` is a single current snapshot, not history).
- `RiskDistributionChart` rewritten to take a `companies: Company[]` prop and compute real counts per `risk_level`, instead of importing canned demo counts.
- `DashboardPage` now shows the 4 real summary stats + real Risk Distribution (from `useCompanies`) + a real "Recent Monitoring Runs" table (from `useMonitoringRuns`), replacing the demo Risk Trend / Active Investigations / Recent Alerts widgets.
- `CompanyDetailPage` dropped the People and Investigation tabs (no `CompanyDirector` or investigation-stream endpoint exists yet — the `company_directors` table exists in the backend models but nothing routes it). Down to 3 tabs: Overview (profile + real risk gauge), Timeline (real, unchanged), Reports (real SAR list + evidence, unchanged).
- `SarReviewPage` dropped the "rich sectioned document for the ABC demo SAR id" special case — every SAR now renders its real `narrative` field plainly, whatever it is (currently empty string from the dummy route).
- Added a **Scan** action wired to the real trigger endpoint in two places: a per-row button on `CompaniesPage` (tracks per-row pending state via `triggerRun.variables`) and a header button on `CompanyDetailPage` (relabeled from "Trigger run").
- Verified: `tsc -b` clean, `npm run build` succeeds — bundle dropped from ~1.25 MB to ~997 KB after removing the xyflow-based relationship graph.
- **Left as-is, not cleaned up:** `@xyflow/react` is now an unused dependency in `package.json` (only the deleted `RelationshipGraph` used it). Removing it needs `npm uninstall @xyflow/react` to keep `package-lock.json` in sync — left for the user to run themselves rather than edit the lockfile by hand.
- **Scope boundary respected:** user explicitly reiterated frontend-only, no backend/database work. The backend's dummy routes (`/backend/app/routes/*.py`) still return `[]`/zeros/echoed-partial-objects, so most screens correctly show empty states until the backend team wires up real persistence — no frontend workaround was added for this, it's expected integration behavior.

---

**Scope later reopened: user explicitly authorized real backend work this session** (see `backend/DEV_LOG.md` for the full backend-side history — real DB queries replacing all stub routes, a sanctions-screening service wired against a real OFAC/OpenSanctions dataset found at the repo root, and a new `POST /companies`). The frontend picked up two small pieces to actually surface that work:

- `hooks/useCompanies.ts` — added `useCreateCompany` (POST `/companies`, invalidates the `companies` and `dashboard-summary` query keys on success).
- `pages/CompaniesPage.tsx` — added a `ScanCompanyCard` above the table: a single name input + "Scan a company" button that chains `useCreateCompany` → `useTriggerMonitoringRun` (the same trigger hook the per-row Scan buttons already used) and navigates to the new company's detail page on success. Resolves as one user action even though it's two backend calls — no new backend route needed for that merge, matching the user's explicit choice of "type a name, hit Scan" as a single step over a separate "add company" form.
- Verified: `tsc -b` clean.

---

**Pivoted again, per user: Companies page now browses the sanctions dataset directly — ScanCompanyCard and useCreateCompany removed the same day they were added.** Backend now serves `GET /companies` straight from `sanctions_lookup.db` (see `backend/DEV_LOG.md`); company ids are dataset entity ids (strings like `"OFAC-36"`), and a scan on a directory company materializes it in Postgres, screens it, and drafts a SAR on high/critical risk.

- `types/models.ts` — `Company.created_at`/`updated_at` are now `string | null` (null until first scan materializes the row); comments updated for the dataset-id semantics and the new `"not_monitored"` status (renders via the existing neutral badge fallback, no badge change needed).
- `hooks/useCompanies.ts` — `useCompanies(search?)` now passes `?q=` for server-side search of the full 1.3M-entity dataset; `useCreateCompany` deleted.
- `pages/CompaniesPage.tsx` — ScanCompanyCard removed; search box drives the server query (`useDeferredValue`, no client-side filtering); "Onboarded" column replaced with "Source" (dataset provenance, mapped on `industry`); truncation added since dataset names/sources run long. Per-row Scan buttons and the CompanyDetail header Scan button unchanged — they work with dataset ids as-is.
- `hooks/useMonitoringRuns.ts` — `useTriggerMonitoringRun` now invalidates `companies` (covers the detail page's risk/evidence/timeline sub-keys via prefix), `sar-reports`, `audit-logs`, and `dashboard-summary` in addition to `monitoring-runs`, so a completed scan updates every affected screen without a manual refresh.
- Verified: `tsc -b` clean.

---

**Environment file added** — created `frontend/.env` with `VITE_API_BASE_URL=http://localhost:8000` (same value as `.env.example` and the code default in `apiClient.ts`, so behavior is unchanged — it just makes the config explicit), and added `.env` to `frontend/.gitignore` (it wasn't ignored; only `*.local` was).
