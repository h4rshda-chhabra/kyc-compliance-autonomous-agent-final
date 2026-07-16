# KYC Compliance System Demo Guide

**Objective**: Demonstrate autonomous risk assessment, material-change detection, SAR generation, and compliance officer review workflow.

## System Overview

The system performs **continuous monitoring** via a background scheduler (15-min interval by default). Every scan:
1. Screens the company against sanctions watchlists + adverse media
2. Detects **cross-company director contamination** (directors shared with already-flagged companies)
3. Calculates a composite risk score (0–100)
4. Compares against the previous scan to detect material change
5. **Generates a SAR if**:
   - Sanctions found AND risk ≥ 70 AND (first scan OR material change detected), OR
   - Manual "scan now" triggered (always generates)
6. Routes the SAR to **Compliance Officer Review Queue** (status="draft")

---

## Overview: How SARs Are Automatically Generated

A SAR is generated **automatically** (no human clicks) when:
1. **Manual audit triggered** by compliance officer ("scan now"), OR
2. **Scheduled sweep detects**:
   - A **new sanctions match** found on the company, AND
   - Risk score ≥ 70 (threshold), AND
   - Either this is the first SAR or material change was detected since last SAR

**Material change** = one of:
- Risk level escalation (e.g., medium → high)
- New sanctions match (director or company)
- 2+ new adverse media articles
- Entity-match confidence jumps 15+ points

The system runs scheduled audits **every 15 minutes** automatically. When a SAR is generated, a **compliance officer alert** is logged and the SAR enters the review queue (status="draft").

---

## Demo Scenario 1: Cross-Company Director Contamination

Shows how shared directorships across high/medium-risk companies escalate risk on a clean-looking company.

### Setup
Three companies are pre-seeded:

| Company | Jurisdiction | Risk | Status | Directors |
|---------|--------------|------|--------|-----------|
| **Crimson Star Logistics FZE** | UAE | **HIGH** | Escalated | Viktor Orlov, Dmitri Sokolov |
| **Helios Marine Services Ltd** | Cyprus | **MEDIUM** | Review | Priya Nair, Helena Brandt |
| **Nordwind Capital Partners** | Singapore | Unknown | Monitored | **Viktor Orlov**, **Priya Nair**, Deepa Krishnamoorthy |

**Key**: Nordwind shares directors with two already-flagged companies, but has never been audited yet.

### Demo Flow

**1. Show the companies in the dashboard**
   - Navigate to **Companies** page
   - Point out Crimson Star (HIGH risk, escalated) and Helios Marine (MEDIUM risk, review)
   - Show Nordwind Capital Partners (unknown risk, clean status)

**2. Show company detail pages**
   - Open Crimson Star: click on Risk tab, show high risk rationale
   - Open Helios Marine: show medium risk rationale
   - Open Nordwind: show directors list — highlight Viktor Orlov and Priya Nair

**3. Manually audit Nordwind**
   - On Nordwind detail, click **"Scan Now"** button (triggers immediate audit)
   - Watch the audit progress (may take 30 seconds)
   - Refresh page after completion

**4. View the contamination result**
   - Risk has escalated to **MEDIUM** (15 base + 30 escalation from HIGH link = 45)
   - Open **Risk** tab → see timeline
   - Look for events: `[CROSS-CONTAMINATION] Viktor Orlov → Crimson Star (HIGH)` and `[CROSS-CONTAMINATION] Priya Nair → Helios Marine (MEDIUM)`
   - Open **Evidence** tab → see `connected_entity` type evidence for both contamination links

**5. Show SAR generated & in review queue**
   - Navigate to **Compliance Officer Dashboard** (or SAR Reviews page)
   - A new draft SAR for Nordwind Capital Partners appears in the queue
   - Open the SAR → scroll to **Contamination Findings** section
   - Read rationale explaining the shared-director risk

**Expected SAR Rationale** (excerpt):
> "Medium risk flagged. Shared directors detected at previously flagged entities: 'Viktor Orlov' → Crimson Star Logistics FZE (HIGH), 'Priya Nair' → Helios Marine Services Ltd (MEDIUM)."

---

## Demo Scenario 2: Watchlist Update → Risk Escalation → SAR Generation

Shows how a **real-time sanctions watchlist update** triggers automated re-screening and escalates risk, resulting in a new SAR.

### Setup

**Theranos Inc** is pre-seeded in the system with:
- **Current Risk**: MEDIUM (risk score ~40–65, driven by 8 adverse media articles about fraud/litigation)
- **Existing SAR**: status="closed" (from previous audit)
- **Directors**: Elizabeth Holmes, Sunny Balwani

The demo inserts mock OFAC sanctions entries for **THERANOS INC** and **ELIZABETH HOLMES** into the watchlist.

### Demo Flow

**1. Show Theranos before the watchlist update**
   - Navigate to **Companies** → click **Theranos Inc**
   - Show current risk: **MEDIUM** (score ~40–65)
   - Open **Risk** tab: rationale mentions "adverse media" (fraud, litigation), NOT sanctions
   - Open **Adverse Media** section: see 8 articles about Holmes' conviction, Balwani trial, etc.
   - Open **SAR Reviews** page: Theranos' old SAR shows status="closed"

**2. Simulate a watchlist update**
   - Open **Agent Execution** page (or use curl to POST `/monitor/watchlist/simulate`)
   - Click **"Simulate Watchlist Update"** button (or call the endpoint)
   - Wait for result: confirms "2 entities inserted, 1 affected company"
   - System automatically triggers targeted re-screening for Theranos

**3. View the escalated risk**
   - Return to Theranos detail page, refresh
   - Risk now shows: **HIGH** (score 95)
   - Risk is now driven by **sanctions match**, not just adverse media
   - Open **Risk** tab → new timeline event: `Director 'Elizabeth Holmes' identified on global watchlist OFAC...`
   - Open **Sanctions** section: see new match for Holmes

**4. Show the new SAR in review queue**
   - Navigate to **Compliance Officer Dashboard**
   - A new draft SAR for **Theranos Inc** now appears in the queue (the old closed one is archived)
   - Open the new SAR
   - **Analyst Recommendation**: "Reject Onboarding" (risk is HIGH)
   - Scroll down to read full rationale, evidence, and timeline

**5. Officer actions (human-in-the-loop)**
   - Officer can click **"Review SAR"**
   - Three options:
     - **Reject SAR**: Close the report, keep Theranos monitored; no deactivation
     - **Recommend Deactivation**: Move SAR to Admin Queue for final approval (company gets soft-deleted)

---

## API Endpoints Used in Demo

### Manual Audit Trigger
```bash
POST /monitor/companies/{company_id}/trigger
# Returns: monitoring run details + SAR decision
```

### Watchlist Simulation (Demo Only)
```bash
POST /monitor/watchlist/simulate
# Inserts demo OFAC entries, triggers impact analysis, re-screens affected companies
# Returns: { success, entities_inserted, affected_companies, affected_company_ids }
```

### Compliance Officer Review Queue
```bash
GET /review/queue/compliance
# Returns: [{ sar_id, company_name, risk_level, created_at, status }, ...]
```

### SAR Detail (for review)
```bash
GET /review/sar/{sar_id}
# Returns: full SAR with narrative, evidence sections, and previous review (if any)
```

### Officer Actions
```bash
POST /review/sar/{sar_id}/recommend-deactivation
# Body: { reason: "string", action_notes: "string" }
# Status changes: draft → pending_approval (admin queue)

POST /review/sar/{sar_id}/reject
# Body: { reason: "string" }
# Status changes: draft → closed (SAR archived, company remains monitored)
```

---

## Key Concepts to Highlight

### 1. Autonomous Screening
- **No human clicks required** for re-audits; scheduler runs every 15 min
- Watchlist updates trigger **targeted re-screening** (only affected companies)
- Each run is fully logged (audit trail)

### 2. Material Change Detection
Helps avoid duplicate SARs. Only generates new SAR if:
- **First scan** for this company, OR
- **Material change detected**:
  - New sanctions match (director or company)
  - Risk escalation (e.g., medium → high)
  - 2+ new adverse media articles
  - Entity-resolution confidence jumps 15+ points

**Why it matters**: Theranos went from MEDIUM (adverse media) → HIGH (new sanctions) = **RISK_ESCALATION** = material change = new SAR.

### 3. Cross-Company Contamination
- **Problem**: A director cleared at Company A may already be flagged at Company B
- **Solution**: On every audit, check if any of this company's directors appear in other medium/high-risk companies
- **Escalation**: Found a contamination link? Add +25 to +30 points to risk score
- **Result**: Nordwind went from 15 (clean) → 45 (contamination found + escalation) = MEDIUM risk = SAR generated

### 4. Human-in-the-Loop Review
- **Compliance Officer** reviews draft SARs in their queue
- Can **reject** (close SAR, keep monitoring) or **recommend deactivation** (move to Admin for approval)
- **Admin** can approve deactivation (soft-delete company, stop monitoring)
- Full audit trail of who reviewed what and why

---

## Troubleshooting

### Scenario 1: "Nordwind audit didn't find contamination links"
- **Check**: Are Crimson Star and Helios Marine marked as **risk_level = 'high'** or **'medium'** in the DB?
  ```sql
  SELECT legal_name, risk_level FROM companies WHERE legal_name IN ('Crimson Star Logistics FZE', 'Helios Marine Services Ltd');
  ```
- If risk_level is 'unknown' or 'low', the contamination check won't match them (it only looks for medium/high)
- Re-run seed: `python scripts/seed_contamination_demo.py`

### Scenario 2: "Watchlist simulate didn't affect Theranos"
- **Check**: Is Theranos in the DB and in monitoring status?
  ```sql
  SELECT legal_name, monitoring_status, is_active FROM companies WHERE legal_name = 'Theranos Inc';
  ```
- If `monitoring_status = 'onboarding'`, it won't be picked up (must be monitored/review/escalated)
- If `is_active = false`, it's been deactivated and won't re-screen
- Re-run seed: `python scripts/seed_demo_data.py`

### Scenario 3: "SAR didn't appear in compliance queue"
- **Check**: What's the SAR status?
  ```sql
  SELECT c.legal_name, s.status, s.created_at FROM sar_reports s JOIN companies c ON c.id = s.company_id ORDER BY s.created_at DESC LIMIT 5;
  ```
- If status is **not** 'draft', it won't appear in the compliance queue
- 'draft' = pending compliance officer review
- 'pending_approval' = waiting for admin approval (after officer recommends deactivation)
- 'closed' or 'archived' = no longer in queue
- Try a fresh manual audit to generate a new draft SAR

---

## Demo Scenario 3: Autonomous Monitoring → Automatic SAR on Risk Escalation

Shows how **the system runs scheduled scans in the background** (every 15 min) and **automatically generates a SAR** when risk escalates and crosses the compliance threshold — **without any manual trigger**.

### Key Concept

Unlike Scenarios 1 & 2 (manual "Scan Now" clicks), this demonstrates:
- **Zero human intervention** after company is onboarded
- Background scheduler audits on fixed 15-minute interval
- When audit detects: material change (risk escalation) + sanctions match + risk ≥ 70 → SAR auto-generated
- Compliance officer is **automatically alerted** in review queue

### Setup

**Vostok Shipping Agency** (Russia) is pre-seeded with:
- **Current Risk**: MEDIUM (~40–50, no sanctions yet)
- **Status**: "monitored" (in automatic sweep rotation)
- **Audit History**: Multiple completed audits (visible in timeline)
- **Director**: KIM Yong Chol (matches OFAC watchlist if/when he's added)

**Progression:**
1. **Audit 1** (past): Risk = MEDIUM, no sanctions, stable
2. **Audit 2** (recent): Risk = MEDIUM, unchanged → no new SAR (no material change)
3. **Audit 3** (after watchlist update): Risk = HIGH (95), sanctions hit + material change detected → **SAR auto-generated by scheduler**
4. **Result**: Compliance officer alerted in queue

### Demo Flow

**1. Show Vostok's audit history (prove continuous monitoring)**
   - Navigate to **Companies** → click **Vostok Shipping Agency**
   - Open **Risk** tab (or **Audit Logs** if available)
   - Point out: **Multiple `run_monitoring` entries** in the timeline
   - Explain: "These audits happened automatically, every 15 minutes. The system ran these scans without any user clicking 'Scan Now'."
   - Show risk has been stable at **MEDIUM** across the last few audits (no material change = no duplicate SARs)
   - Open **Sanctions** tab: currently shows **no matches** (this is why SAR wasn't generated despite MEDIUM risk)

**2. Trigger watchlist update (simulates real sanctions list change)**
   - Click **"Simulate Watchlist Update"** button (bottom of Vostok detail page)
   - System adds KIM Yong Chol to OFAC watchlist
   - Backend identifies Vostok as affected (has KIM as director)
   - Immediately queues targeted re-screening

**3. Observe automatic escalation & auto-generated SAR**
   - Wait 30–60 seconds, then **refresh Vostok page**
   - Risk now shows **HIGH** (95, jumped from MEDIUM ~45)
   - Open **Risk** tab:
     - New timeline entry: "Director 'KIM, Yong Chol' identified on OFAC watchlist"
     - New audit log: `run_monitoring` (scheduled sweep that triggered the re-screen)
     - New audit log: `notify_compliance` (SAR was generated, officer is notified)
   - Open **Sanctions** section: see KIM Yong Chol match
   - Note: **This re-screen was triggered automatically** by the watchlist change, not by manual audit

**4. Show SAR in compliance queue (proof of auto-alert)**
   - Navigate to **Compliance Officer Dashboard**
   - New **draft SAR** for Vostok appears in queue
   - This SAR was **auto-generated** (not manually triggered)
   - Open SAR:
     - Analyst Recommendation: "Reject Onboarding" (HIGH risk)
     - Rationale explains the sanctions match
     - Timeline shows when the SAR was generated

**5. Demonstrate the alert mechanism**
   - Look at audit logs: find `action = "notify_compliance"` entry
   - Timestamp shows when SAR was auto-generated
   - Explain: "In production, this audit log would trigger an email/Slack message to compliance officer immediately"

**6. Officer takes action**
   - In Compliance Officer Dashboard, open the SAR
   - Officer can:
     - **Reject**: Close SAR, company stays monitored (continues auto-scanning)
     - **Recommend Deactivation**: Move to Admin queue (company soft-deleted if approved)
   - Show the audit log entry recording the officer's action

### Why Scenario 3 Matters (Teaching Points)

| Feature | Scenario 1 | Scenario 2 | Scenario 3 |
|---------|-----------|-----------|-----------|
| **Trigger** | Manual "Scan Now" | Manual "Simulate Watchlist" | Automatic scheduler |
| **Initial State** | Clean company | Medium-risk company | Medium-risk company |
| **What Escalates** | Director contamination | Sanctions match | Sanctions match |
| **SAR Generation** | Immediate (manual) | Immediate (sanctions + threshold) | Automatic (no user action) |
| **Alert Mechanism** | Officer reviews SARs in queue | Officer reviews SARs in queue | **System auto-alerts officer** |
| **Autonomy Level** | Analyst-driven | Analyst-driven (with watchlist) | **Fully autonomous** |

**Key takeaway**: "The system doesn't wait for humans to click buttons. It continuously monitors, detects changes, and escalates when risk increases. Compliance officer is notified automatically."

### Production Analogy

In production, Scenario 3 represents:
- Real OFAC SDN list updates (weekly)
- RSS news feeds checking for adverse media (continuous)
- Scheduled re-audits (every 15 min for high-risk, daily for low-risk)
- When risk escalates, SAR auto-generates and compliance team is notified via email/Slack/webhook
- Officer logs into system, reviews SAR, makes decision
- Full audit trail of system actions + human decisions

---

## Demo Timing

- **Scenario 1 (Contamination)**: 5–10 min
  - Show companies: 1 min
  - Manual audit trigger: 30 sec
  - Review risk escalation: 2–3 min
  - Show SAR in queue: 1–2 min

- **Scenario 2 (Watchlist → Escalation)**: 5–10 min
  - Show Theranos current state: 1–2 min
  - Simulate watchlist: 30 sec
  - View risk escalation: 1–2 min
  - Show new SAR in queue: 1–2 min

- **Scenario 3 (Autonomous Monitoring)**: 5–10 min
  - Show Vostok audit history: 1–2 min
  - Simulate watchlist: 30 sec
  - Observe auto-escalation: 1–2 min
  - Show auto-generated SAR: 1–2 min

- **Bonus: Officer Review & Actions** (2–3 min)
  - Open SAR in queue
  - Recommend deactivation or reject
  - Show audit log entry of action
  - Explain compliance officer vs admin roles

**Total: ~20–30 min for all three scenarios + officer review**

---

## Pre-Demo Checklist

- **Scenario 1 (Contamination)**: 5–10 min
  - Setup companies: 30 sec
  - Manual audit: 30 sec
  - Review results: 2–3 min
  - Show SAR in queue: 1–2 min

- **Scenario 2 (Watchlist)**: 5–10 min
  - Show Theranos before: 1–2 min
  - Simulate watchlist: 30 sec
  - View escalation: 1–2 min
  - Show new SAR in queue: 1–2 min

- **Bonus: Officer Review** (2–3 min)
  - Open SAR
  - Recommend deactivation or reject
  - Show audit log entry
  - Explain difference between compliance officer and admin roles

**Total: ~15–20 min for both scenarios + officer review**

---

## Pre-Demo Checklist

- [ ] Backend running (`docker-compose up` or `uvicorn` locally)
- [ ] Frontend running (`npm run dev`)
- [ ] Postgres container healthy
- [ ] Seed script has been run:
  ```bash
  python scripts/seed_demo_data.py      # Demo companies
  python scripts/seed_contamination_demo.py  # Contamination scenario
  ```
- [ ] Logged in as demo user: `demo@example.com` / `password123`
- [ ] Check browser console for any errors before starting
