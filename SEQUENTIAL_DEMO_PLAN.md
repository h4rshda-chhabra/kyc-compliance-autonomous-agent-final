# Sequential Demo Plan: Complete KYC Compliance System Walkthrough

**Total Duration**: ~30–40 minutes (depending on audience questions)  
**Prerequisite**: All systems running, seeds seeded, logged in

---

## Phase 0: Pre-Demo Setup (5 min) — DO THIS BEFORE STARTING

### 0.1 Start All Services
```bash
# Terminal 1: Start Docker (Postgres)
docker-compose up -d

# Terminal 2: Start Backend (from backend directory)
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Terminal 3: Start Frontend (from frontend directory)
cd frontend
npm run dev
```

### 0.2 Seed Database
```bash
# Terminal 4: Seed demo data
cd project-root
python scripts/seed_demo_data.py
python scripts/seed_contamination_demo.py
```

**Expected output:**
```
✓ Demo companies seeded
✓ Contamination demo seeded
Verification - contamination links the next Nordwind audit will find:
  [CROSS-CONTAMINATION] 'Viktor Orlov' is also a director at 'Crimson Star Logistics FZE' (HIGH risk)
  [CROSS-CONTAMINATION] 'Priya Nair' is also a director at 'Helios Marine Services Ltd' (MEDIUM risk)
```

### 0.3 Verify System Health
```bash
# Check backend is running
curl http://localhost:8000/health
# Expected: {"status":"ok","timestamp":"..."}

# Check frontend loads
Open http://localhost:5173 in browser
# Expected: Login page loads
```

### 0.4 Clear Browser Cache (if needed)
- Hard refresh: `Ctrl+Shift+R` (or `Cmd+Shift+R` on Mac)
- Clear any old auth tokens

---

## Phase 1: System Introduction (2–3 min)

### 1.1 Show the Problem Statement (Slides or Verbal)
**Say to audience:**

> "KYC (Know Your Customer) compliance is critical but manual. Compliance teams must:
> 1. Screen companies against sanctions watchlists (OFAC, OpenSanctions)
> 2. Monitor adverse news and media coverage
> 3. Detect cross-company risk links (directors shared with flagged companies)
> 4. Generate audit reports (SARs) when risk escalates
> 5. Get alerts and review findings in time
> 
> This system automates all of this. It runs **continuously** (every 15 minutes), detects **material changes**, and **auto-alerts** compliance officers. Today we'll show three key scenarios."

### 1.2 Architecture Overview (Verbal)
> "The system has:
> - **Backend**: Python/FastAPI → runs audits, detects risk, generates SARs
> - **Postgres Database**: Stores companies, directors, risk assessments, SARs, audit logs
> - **Frontend**: React → compliance officers review SARs and make decisions
> - **Scheduler**: Runs background audits every 15 min (autonomous monitoring)
> - **Sanctions Database**: SQLite with 1M+ sanctioned entities (OFAC, OpenSanctions)
> 
> When risk increases or sanctions hit, system auto-generates a SAR and alerts the officer."

---

## Phase 2: Login & Dashboard Orientation (2–3 min)

### 2.1 Open Login Page
**URL:** `http://localhost:5173`

**Expected:** Login page with email + password fields

### 2.2 Login as Compliance Officer
**Credentials:**
- Email: `demo@example.com`
- Password: `password123`

**Click:** "Login" button

**Wait:** 2–3 seconds for dashboard to load

**Expected:** Compliance Officer Dashboard with:
- Header showing "Logged in as Demo Auditor Analyst"
- Navigation menu (Companies, SARs, Audits, etc.)
- SAR Review Queue section (may be empty or have old SARs)

### 2.3 Explain Dashboard Layout
**Point to:**
- **Top left:** Company list button
- **Top center:** Title "KYC Compliance Auditor"
- **Top right:** User menu (logout, profile)
- **Main area:** "Review Queue" section (SARs awaiting compliance officer)
- **Secondary area:** "Recent Audits" section (monitoring runs)

**Say:**
> "This dashboard shows SARs awaiting officer review. Officers can approve deactivation, reject, or review details. The system auto-generates SARs when risk escalates. Let's walk through three scenarios."

---

## Phase 3: Scenario 1 — Cross-Company Director Contamination (7–10 min)

### 3.1 Navigate to Companies
**Click:** "Companies" in top navigation (or left sidebar)

**Wait:** 1–2 seconds for Companies page to load

**Expected:** List of all companies:
- TechNova Solutions Pvt Ltd (India)
- Vostok Shipping Agency (Russia)
- Theranos Inc (USA)
- Crimson Star Logistics FZE (UAE) — **HIGH risk, escalated**
- Helios Marine Services Ltd (Cyprus) — **MEDIUM risk, review**
- Nordwind Capital Partners (Singapore) — **UNKNOWN risk**

### 3.2 Show the Setup (Explain the Problem)
**Point to** the three contamination-scenario companies:

**Say:**
> "Notice three new companies:
> 1. **Crimson Star Logistics FZE** — flagged HIGH risk (shipping, UAE)
> 2. **Helios Marine Services Ltd** — flagged MEDIUM risk (maritime, Cyprus)
> 3. **Nordwind Capital Partners** — clean, never audited (investment, Singapore)
>
> The interesting part: Nordwind's directors include people who also work at the high-risk companies. This is a **KYC loophole**: a director cleared at Company A may already be flagged at Company B.
>
> Our system detects this automatically."

### 3.3 Click Nordwind Capital Partners
**Click:** "Nordwind Capital Partners" row

**Wait:** 1–2 seconds for detail page to load

**Expected:** Company detail page showing:
- Legal Name: Nordwind Capital Partners
- Jurisdiction: Singapore
- Industry: Investment Management
- Risk Level: **UNKNOWN** (not yet audited)
- Monitoring Status: **monitored**
- Directors section (if visible)

### 3.4 Show Directors
**Scroll down** to see **Directors** section

**Expected to see:**
- Viktor Orlov (Russia)
- Priya Nair (India)
- Deepa Krishnamoorthy (Singapore)

**Say:**
> "These are Nordwind's directors. Viktor and Priya also work at the flagged companies. Let's audit Nordwind and see if the system detects this."

### 3.5 Trigger Manual Audit
**Look for** "Scan Now" or "Audit" or "Trigger Audit" button

**Click:** The audit button

**Expected:** Modal or page showing "Audit in progress..." or audit result appearing

**Wait:** 30–60 seconds for audit to complete

**Say while waiting:**
> "The system is now:
> 1. Screening Viktor Orlov, Priya Nair, Deepa against the sanctions database
> 2. Checking for adverse media
> 3. **Detecting cross-company links** — is Viktor or Priya listed at HIGH/MEDIUM risk companies?
> 4. Calculating risk score
> 5. Deciding whether to generate a SAR"

### 3.6 Observe Risk Escalation
**After audit completes, page refreshes showing:**

**Expected:**
- Risk Level: **MEDIUM** (escalated from unknown)
- Risk Score: ~40–50 (base 15 + 30 for HIGH link, or +25 for MEDIUM link)
- Monitoring Status: Still "monitored"

**Say:**
> "Risk jumped from UNKNOWN to MEDIUM. This is because the system found cross-company links. Let's see the details."

### 3.7 Show Risk Tab (Timeline & Evidence)
**Click:** "Risk" tab (or similar)

**Wait:** 1–2 seconds to load risk details

**Expected to see:**
- **Timeline section** showing events:
  - `[CROSS-CONTAMINATION] Viktor Orlov is also listed at 'Crimson Star Logistics FZE' which has HIGH risk.`
  - `[CROSS-CONTAMINATION] Priya Nair is also listed at 'Helios Marine Services Ltd' which has MEDIUM risk.`
  - Possibly other events (entity resolution, audit started, etc.)

**Say:**
> "Here are the two contamination links the system detected:
> 1. Viktor Orlov → Crimson Star (HIGH) — adds +30 to risk score
> 2. Priya Nair → Helios (MEDIUM) — adds +25 to risk score
>
> This pushed Nordwind from LOW (baseline 15) to MEDIUM. The system treats shared directors at high-risk companies as a major red flag."

### 3.8 Show Evidence Tab (Connected Entity Evidence)
**Click:** "Evidence" tab (if available)

**Expected to see:**
- Type: `connected_entity` (or `contamination`)
- Description: Details about the shared directorships
- Source: links to the linked companies

### 3.9 Show Generated SAR
**Navigate back** to Compliance Officer Dashboard (click back or navigate home)

**Expected:** "Review Queue" now shows a **new draft SAR for Nordwind Capital Partners**

**Say:**
> "The system automatically generated a SAR (Suspicious Activity Report) for Nordwind because:
> - Risk escalated (material change detected)
> - Two contamination links found
> - Risk score >= 40 (which meets internal threshold for manual audits)
>
> This SAR is now in the compliance officer's queue for review."

**Click on** the Nordwind SAR to show it

**Expected to see:**
- Status: "draft"
- Narrative section mentioning contamination findings
- Evidence section with connected_entity items
- Timeline showing all events

**Time check:** Should be ~7–10 min into demo

---

## Phase 4: Scenario 2 — Watchlist Update & Risk Escalation (7–10 min)

### 4.1 Navigate to Companies
**Click:** "Companies" in navigation

**Wait:** 1 sec for list to load

### 4.2 Show Theranos Current State (Baseline)
**Click:** "Theranos Inc" (USA)

**Wait:** 1–2 sec for detail page

**Expected:**
- Legal Name: Theranos Inc
- Jurisdiction: United States
- Risk Level: **MEDIUM** (~40–65)
- Rationale: "Multiple adverse media articles found..." (fraud, litigation)
- Directors: Elizabeth Holmes, Sunny Balwani

**Say:**
> "Theranos is currently MEDIUM risk, driven entirely by **adverse media** — there are 8 news articles about Elizabeth Holmes' conviction and Sunny Balwani's trial.
>
> However, there are **no sanctions matches** yet. This is important because SARs are normally only generated when:
> 1. Sanctions match found, AND
> 2. Risk score >= 70, AND
> 3. Material change detected
>
> Let's simulate a real event: the OFAC sanctions list is updated to include Theranos and Elizabeth Holmes. What happens?"

### 4.3 Show Risk Tab (Stable History)
**Click:** "Risk" tab

**Expected:**
- Multiple audit entries showing MEDIUM risk across several scans
- Adverse media articles listed
- **NO sanctions matches**

**Say:**
> "You can see Theranos has been audited multiple times, always with MEDIUM risk from adverse media, but never sanctions. Now watch what happens when we add sanctions to the watchlist."

### 4.4 Trigger Watchlist Simulation
**Scroll down** to find "Simulate Watchlist Update" button (or similar)

**Click:** Button

**Expected:** 
- Modal appears or page indicates "Processing..."
- Message appears: "Watchlist update simulated. 2 entities inserted. 1 company affected: Theranos Inc. Initiating re-screening..."

**Say:**
> "The system just:
> 1. Added THERANOS INC and ELIZABETH HOLMES to the OFAC watchlist (simulating real update)
> 2. Ran impact analysis to find which companies are affected
> 3. Identified Theranos Inc as affected
> 4. Queued an immediate re-screening (not waiting for the 15-min scheduler)"

### 4.5 Wait for Re-screening
**Wait:** 30–60 seconds

**Say while waiting:**
> "The system is re-screening Theranos now:
> - Checking directors against new watchlist entries
> - Should find Elizabeth Holmes matches OFAC SDN
> - Risk should jump from MEDIUM to HIGH
> - Since risk escalated (material change), a new SAR will be generated"

### 4.6 Refresh and Observe Risk Jump
**Click:** Refresh button (or wait for auto-refresh)

**Expected:**
- Risk Level: **HIGH** (95)
- Risk Score: **95.0**
- New timeline entry: "Director 'Elizabeth Holmes' identified on watchlist OFAC SDN"
- Sanctions section now shows: "Elizabeth Holmes — Matched on OFAC SDN"

**Say:**
> "Risk jumped from MEDIUM (40–65) to HIGH (95) because:
> 1. Elizabeth Holmes now matches OFAC watchlist
> 2. Risk escalated (material change: MEDIUM → HIGH)
> 3. Score >= 70 threshold met
> 4. Therefore: new SAR was automatically generated"

### 4.7 Show New SAR in Queue
**Navigate to** Compliance Officer Dashboard

**Expected:** New **draft SAR for Theranos Inc** appears in Review Queue

**Say:**
> "A new SAR just appeared in the queue. This happened **automatically** — no one clicked a button to generate it. The system detected material change and generated it on its own.
>
> The analyst recommendation is 'Reject Onboarding' because risk is now HIGH."

**Click on** the Theranos SAR

**Expected:**
- Status: "draft"
- Analyst Recommendation: "Reject Onboarding"
- Narrative includes: sanctions findings, adverse media, overall risk rationale
- Timeline shows: new sanctions match event

**Time check:** Should be ~7–10 min into Phase 4 (17–20 min total)

---

## Phase 5: Scenario 3 — Autonomous Monitoring & Auto-SAR Generation (5–8 min)

### 5.1 Navigate to Companies
**Click:** "Companies"

### 5.2 Show Vostok (Continuous Monitoring Proof)
**Click:** "Vostok Shipping Agency"

**Wait:** 1–2 sec

**Expected:**
- Risk Level: **MEDIUM** (~40–50, no sanctions yet)
- Monitoring Status: **monitored** (eligible for auto-scans)
- Directors: Ananya Sharma, KIM Yong Chol

### 5.3 Show Audit History (Key Teaching Point)
**Click:** "Risk" or "Audit Logs" tab

**Expected:** Multiple audit entries (MonitoringRun records) showing:
- `run_monitoring` entries with timestamps ~15 min apart
- Each shows "Audit completed. Risk level: MEDIUM"
- No SARs generated (because no material change, no sanctions)

**Say:**
> "Here's the key: Vostok has been audited **multiple times automatically**. The system runs scheduled sweeps every 15 minutes without any human clicking anything.
>
> Each audit found MEDIUM risk with no sanctions, so no SAR was generated (it would be duplicate). But notice: **the system is continuously vigilant**. It's always auditing, always checking for changes.
>
> Now let's show what happens when conditions change."

### 5.4 Show Current Sanctions Status
**Scroll to** "Sanctions" section (if visible)

**Expected:** "No sanctions matches found"

**Say:**
> "Currently, no sanctions matches. Director KIM Yong Chol is on the OFAC watchlist, but he's not flagged yet. Let's add him."

### 5.5 Trigger Watchlist Update (Again, on Vostok)
**Scroll down, click:** "Simulate Watchlist Update"

**Expected:** Confirmation message

**Say:**
> "The system just added KIM Yong Chol to the active OFAC watchlist. Impact analysis will identify Vostok as affected (has KIM as director), and immediately queue a re-screening. No scheduler wait needed."

### 5.6 Wait for Auto Re-screening
**Wait:** 30–60 seconds

**Say while waiting:**
> "The system is automatically re-screening Vostok:
> - Checking KIM Yong Chol against new OFAC list
> - Should find a match
> - Risk will jump to HIGH
> - Material change detected (MEDIUM → HIGH)
> - New SAR will be **automatically generated** (no manual request)
> - Compliance officer will be **automatically alerted** (audit log entry created)"

### 5.7 Refresh and Observe Auto-Escalation
**Refresh** page

**Expected:**
- Risk Level: **HIGH** (95)
- New timeline entry: "Director 'KIM, Yong Chol' identified on OFAC watchlist"
- Sanctions section: "KIM, Yong Chol — OFAC SDN"
- New audit log entry: `run_monitoring` + `notify_compliance`

**Say:**
> "Same story: risk escalated, SAR auto-generated. But notice — **we didn't manually trigger this audit**. The system detected the watchlist change and reacted autonomously.
>
> In production:
> - OFAC updates its SDN list weekly (real data)
> - Our system automatically downloads and processes it
> - All affected companies are re-screened
> - SARs are auto-generated
> - Compliance officers are auto-notified
> - All within minutes, not days"

### 5.8 Show Auto-Generated SAR
**Navigate to** Compliance Officer Dashboard

**Expected:** New **draft SAR for Vostok** in Review Queue

**Say:**
> "Another SAR in the queue, auto-generated. This is the **key capability**: the system is autonomous. It doesn't need a human to click 'audit' — it runs on a schedule, detects changes in real-time, and escalates risk with SARs automatically.
>
> Compliance officer gets the alert and reviews. That's the human-in-the-loop: officer reviews the SAR findings and decides what to do next."

**Time check:** Should be ~5–8 min into Phase 5 (22–28 min total)

---

## Phase 6: Compliance Officer Review Actions (5–7 min)

### 6.1 Show Review Queue with Multiple SARs
**On Compliance Officer Dashboard**, point out:
- **Nordwind Capital Partners** SAR (contamination)
- **Theranos Inc** SAR (watchlist escalation)
- **Vostok Shipping Agency** SAR (auto-escalation)

**Say:**
> "The compliance officer now has three SARs to review, all auto-generated by the system. Let's walk through one review process."

### 6.2 Open a SAR for Detailed Review
**Click on** Vostok SAR (or Theranos — either works)

**Wait:** 1–2 sec for SAR detail page to load

**Expected SAR Detail Page showing:**
- **Header**: Company name, risk level (HIGH), recommendation (Reject Onboarding)
- **Risk Score**: 95
- **Narrative Section**: Summary of findings
- **Sanctions Findings**: KIM Yong Chol match on OFAC SDN
- **Evidence Section**: Connected entities, sanctions, adverse media
- **Timeline Section**: All events during audit (discovery of sanctions, risk calculations, etc.)
- **Action Buttons** (bottom):
  - "Recommend Deactivation"
  - "Reject"

**Say:**
> "Here's the full SAR. The system has already done all the analysis:
> - Identified the risk (sanctions match)
> - Calculated the score (95/100)
> - Compiled evidence (where the match came from, what it means)
> - Generated a recommendation (Reject Onboarding — too risky)
>
> The officer now has to decide: should we reject this company (close the SAR, company stays monitored) or recommend deactivation (soft-delete, stop monitoring)?"

### 6.3 Demonstrate Officer Action: Recommend Deactivation
**Say:**
> "Let's say the officer decides this company is too risky to have in our portfolio. They can recommend deactivation, which moves it to the admin queue for final approval."

**Click:** "Recommend Deactivation" button

**Expected:** 
- Modal or form appears asking for reason
- Fields: reason (text area), notes (optional)

**Fill in:**
- Reason: "Sanctions match on OFAC SDN list; high risk to compliance"
- Notes: "Recommend rejecting onboarding pending further investigation"

**Click:** "Submit" or "Recommend" button

**Expected:**
- Modal closes
- Page shows: "SAR moved to pending approval status"
- Or returns to list, SAR status now shows "pending_approval"

**Say:**
> "The SAR has been moved to the **admin queue**. An administrator will review the officer's recommendation and either approve (company gets deactivated) or reject (SAR returns to officer for further review)."

### 6.4 Show Audit Trail
**Navigate to** Audit Logs (if available via menu)

**Expected:** Recent log entries showing:
- `action: "manual_audit_triggered"` — officer triggered audits
- `action: "run_monitoring"` — system ran audits
- `action: "notify_compliance"` — system notified officer of SAR
- `action: "recommend_deactivation"` — officer recommended deactivation
- All with timestamps and actor info

**Say:**
> "Every action — by system and by officer — is logged. This creates a full audit trail for compliance. Auditors can see exactly what happened, when, and who made each decision."

### 6.5 (Optional) Demonstrate Reject Action
**If time allows**, go back to another SAR (Nordwind or Theranos)

**Click:** "Reject" button

**Expected:** Modal asking for reason

**Fill in:**
- Reason: "Risk assessment appears accurate; maintain monitoring rather than deactivate"

**Click:** "Submit"

**Expected:** SAR status changes to "closed"

**Say:**
> "Rejecting a SAR closes it but keeps the company monitored. The system will continue auditing it automatically. If risk increases further, another SAR can be generated on the next material change."

**Time check:** Should be ~5–7 min into Phase 6 (27–35 min total)

---

## Phase 7: Summary & Key Takeaways (3–5 min)

### 7.1 Recap the Three Scenarios
**Say:**

> **Scenario 1: Cross-Company Contamination**
> - System detected that Nordwind's directors also work at flagged companies
> - Automatically escalated risk (15 + 30 = 45)
> - Auto-generated SAR for officer review
>
> **Scenario 2: Watchlist-Triggered Escalation**
> - Real sanctions data added to watchlist (simulated)
> - System immediately re-screened Theranos
> - Risk jumped from MEDIUM to HIGH
> - Material change detected, SAR auto-generated
>
> **Scenario 3: Autonomous Monitoring**
> - System proved it runs continuously (multiple audits in history)
> - Watchlist update queued immediate re-screen (no waiting for 15-min scheduler)
> - Vostok risk escalated, SAR auto-generated
> - All without any manual intervention

### 7.2 Explain the Core Innovation
**Say:**

> "The innovation here is **autonomy + intelligence**:
>
> **Old way (manual):**
> - Compliance team manually searches OFAC list
> - Manually reviews each company's directors
> - Manually flags risks
> - Takes weeks to process changes
>
> **New way (this system):**
> - Runs 24/7, audits every 15 min
> - Detects cross-company links automatically
> - Finds sanctions matches in milliseconds
> - Screens adverse media in real-time
> - Escalates risk **immediately** when material change detected
> - Generates reports (SARs) automatically
> - Alerts compliance officer instantly
> - Officer reviews findings and makes decision
>
> **Result:** Risk exposure window shrinks from weeks to minutes. Compliance team focuses on decision-making, not data gathering."

### 7.3 Show the Gate Logic (Diagram Verbally)
**Say:**

> "The system uses a **gate** to decide when to generate a SAR:
>
> ```
> SAR Generated IF:
>   (Trigger == "manual")  [Officer clicked "scan"] OR
>   (
>     Sanctions_Found AND
>     Risk_Score >= 70 AND
>     (First_SAR OR Material_Change_Detected)
>   )
> ```
>
> This prevents **alert fatigue**. Every SAR corresponds to a real compliance event, not noise."

### 7.4 Mention the Audit Trail
**Say:**

> "Every action is logged:
> - System audits: when, why, what was found
> - Officer decisions: who approved/rejected, when, why
> - Admin actions: who deactivated, when
>
> This creates a **defensible compliance record**. If regulators ask 'did you audit this company?', the answer is in the logs with a timestamp."

### 7.5 Invite Questions
**Say:**

> "That's the full demo. Questions on:
> - How the risk scoring works?
> - How the scheduler interval adjusts (15 min → 1 hour → daily based on risk)?
> - How to integrate with real OFAC feeds?
> - How to add custom compliance rules?
> - Architecture or deployment?"

---

## Phase 8: Technical Q&A (Open-Ended)

**Be ready to answer:**

1. **"How does entity resolution work?"**
   - Uses fuzzy string matching (token_sort_ratio >= 85%)
   - Handles name variations, typos, aliases
   - Example: "Kim, Yong Chol" vs "KIM Yong Chol" both match

2. **"What if a company is flagged by mistake?"**
   - Officer can reject the SAR (closes it, continues monitoring)
   - Company stays monitored, next audit may find no issues
   - Risk is recalculated on every audit

3. **"How are roles separated?"**
   - **Compliance Officer**: Reviews SARs, approves/rejects, can't deactivate
   - **Admin**: Approves deactivation recommendations, manages users
   - **System**: Runs audits, generates SARs, logs everything

4. **"Can you customize the risk scoring?"**
   - Yes, thresholds are in `backend/app/config/settings.py`
   - SAR_RISK_THRESHOLD = 70.0 (customizable)
   - Contamination escalation: +30 for HIGH links, +25 for MEDIUM (in code)

5. **"How often does it audit?"**
   - Default: every 15 min for all companies
   - Can be adjusted per-company based on risk level
   - High-risk: every 1 hour
   - Medium-risk: every 6 hours
   - Low-risk: every 24 hours

---

## Appendix: Troubleshooting During Demo

### Issue: Audit doesn't complete
**Solution**: 
- Check backend logs for errors
- Refresh page and try again
- It may be getting stuck on AI agent (Gemini/OpenRouter API)

### Issue: Watchlist simulation doesn't show new SAR
**Solution**:
- Wait 60 seconds (scheduler may not have run yet)
- Manually refresh page
- Check if risk actually escalated (open company detail)

### Issue: Contamination links not showing
**Solution**:
- Verify Crimson Star and Helios have correct risk_levels:
  ```bash
  docker exec kyc-compliance-autonomous-agent-postgres-1 psql -U kyc -d kyc_auditor -c "SELECT legal_name, risk_level FROM companies WHERE legal_name LIKE '%Crimson%' OR legal_name LIKE '%Helios%';"
  ```
- If risk_level is "low" or "unknown", re-run seed:
  ```bash
  python scripts/seed_contamination_demo.py
  ```

### Issue: Login fails
**Solution**:
- Clear browser cache/cookies
- Hard refresh: `Ctrl+Shift+R`
- Check backend is running: `curl http://localhost:8000/health`

### Issue: Dashboard empty (no SAR queue visible)
**Solution**:
- Refresh page
- Log out and log back in
- Check database:
  ```bash
  docker exec kyc-compliance-autonomous-agent-postgres-1 psql -U kyc -d kyc_auditor -c "SELECT status FROM sar_reports LIMIT 5;"
  ```

---

## Timing Reference

| Phase | Component | Duration | Cumulative |
|-------|-----------|----------|------------|
| 0 | Pre-demo setup (offline) | 5 min | 5 min |
| 1 | Problem statement | 2–3 min | 7–8 min |
| 2 | Login & orientation | 2–3 min | 9–11 min |
| 3 | Scenario 1: Contamination | 7–10 min | 16–21 min |
| 4 | Scenario 2: Watchlist escalation | 7–10 min | 23–31 min |
| 5 | Scenario 3: Autonomous monitoring | 5–8 min | 28–39 min |
| 6 | Officer review actions | 5–7 min | 33–46 min |
| 7 | Summary & takeaways | 3–5 min | 36–51 min |
| 8 | Q&A | Open-ended | +10–20 min |

**Recommended Demo Duration**: 30–40 min (Phases 0–7 without Q&A)  
**With Q&A**: 40–60 min

---

## Pre-Demo Checklist (Final)

- [ ] Docker Postgres container running
- [ ] Backend server running (localhost:8000)
- [ ] Frontend dev server running (localhost:5173)
- [ ] Both seed scripts executed successfully
- [ ] Browser cache cleared
- [ ] Logged in as `demo@example.com`
- [ ] Companies page loads showing all 6 companies
- [ ] Nordwind shows "unknown" risk
- [ ] Theranos shows "medium" risk
- [ ] Vostok shows "medium" risk
- [ ] Crimson Star shows "high" risk
- [ ] Helios shows "medium" risk
- [ ] Compliance Officer Dashboard loads
- [ ] Presentation slides ready (if using)
- [ ] Microphone/audio tested (if remote)

---

## Go Live Checklist

- [ ] Open browser to localhost:5173
- [ ] Have all 3 tabs/windows ready:
  - Tab 1: Dashboard
  - Tab 2: Companies (ready to click Nordwind)
  - Tab 3: Companies (ready to click Theranos)
- [ ] Have Terminal 4 ready to run queries if Q&A requests DB inspection
- [ ] Have this guide open in second monitor (if available) for reference
- [ ] Audio/video recording enabled (if needed)
- [ ] Camera positioned to show browser + presenter face

**Ready to demo!**
