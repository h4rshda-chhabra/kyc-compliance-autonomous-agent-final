# Demo automation script for Windows PowerShell
# Seeds data and provides quick commands to trigger scenarios

$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $ProjectRoot

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "KYC Compliance System — Demo Setup" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check Python dependencies
$PythonCheck = python -c "import sqlalchemy, psycopg2; print('ok')" 2>&1
if ($PythonCheck -ne "ok") {
    Write-Host "❌ Backend dependencies missing. Please activate the virtual environment first." -ForegroundColor Red
    Write-Host "   Run: python -m venv venv && .\venv\Scripts\activate"
    exit 1
}

Write-Host "✓ Python dependencies OK" -ForegroundColor Green
Write-Host ""

# Seed the database
Write-Host "Seeding demo companies..."
python scripts/seed_demo_data.py 2>&1 | Out-Null
if ($?) {
    Write-Host "✓ Demo companies seeded" -ForegroundColor Green
} else {
    Write-Host "⚠ Demo seed already exists (idempotent)" -ForegroundColor Yellow
}

Write-Host "Seeding cross-contamination scenario..."
python scripts/seed_contamination_demo.py 2>&1 | Out-Null
if ($?) {
    Write-Host "✓ Contamination demo seeded" -ForegroundColor Green
} else {
    Write-Host "⚠ Contamination seed already exists" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Demo Ready!" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "SCENARIO 1: Cross-Company Director Contamination" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────" -ForegroundColor Yellow
Write-Host "1. Open dashboard: http://localhost:5173"
Write-Host "2. Login: demo@example.com / password123"
Write-Host "3. Go to Companies → find 'Nordwind Capital Partners' (Singapore)"
Write-Host "4. Click 'Scan Now' button to trigger audit"
Write-Host "5. Check Risk tab → see contamination alerts for Viktor Orlov and Priya Nair"
Write-Host "6. Go to Compliance Officer Dashboard → see new SAR in review queue"
Write-Host ""
Write-Host "Or use PowerShell to trigger the audit:" -ForegroundColor Gray
Write-Host '  `$COMPANY_ID = "<nordwind-id>"' -ForegroundColor Gray
Write-Host '  `$headers = @{ "Authorization" = "Bearer <token>" }' -ForegroundColor Gray
Write-Host '  Invoke-RestMethod -Uri "http://localhost:8000/monitor/companies/`$COMPANY_ID/trigger" -Method POST -Headers `$headers' -ForegroundColor Gray
Write-Host ""

Write-Host "SCENARIO 2: Watchlist Update → Risk Escalation" -ForegroundColor Yellow
Write-Host "───────────────────────────────────────────────" -ForegroundColor Yellow
Write-Host "1. Open dashboard: http://localhost:5173"
Write-Host "2. Go to Companies → click 'Theranos Inc' (USA)"
Write-Host "3. Note current risk level (MEDIUM, ~40-65 from adverse media)"
Write-Host "4. On Theranos detail, scroll down → click 'Simulate Watchlist Update' button"
Write-Host "   (This adds THERANOS INC and ELIZABETH HOLMES to the sanctions watchlist)"
Write-Host "5. Wait 30-60 seconds for auto re-screen to complete"
Write-Host "6. Refresh page → risk now shows HIGH (95, from sanctions match)"
Write-Host "7. Open Risk tab → see new 'Director Elizabeth Holmes identified on watchlist' event"
Write-Host "8. Go to Compliance Officer Dashboard → new SAR for Theranos in queue"
Write-Host ""

Write-Host "SCENARIO 3: Autonomous Monitoring + Auto-SAR on Risk Escalation" -ForegroundColor Yellow
Write-Host "──────────────────────────────────────────────────────────────────" -ForegroundColor Yellow
Write-Host "Demonstrates continuous background scanning with automatic SAR generation (no manual trigger)."
Write-Host ""
Write-Host "1. Open dashboard: http://localhost:5173"
Write-Host "2. Go to Companies → click 'Vostok Shipping Agency' (Russia)"
Write-Host "3. Open Risk tab:"
Write-Host "   • Point out multiple audit log entries (run_monitoring)"
Write-Host "   • Explain: 'The system automatically audited this company every 15 min'"
Write-Host "   • Show risk has been stable MEDIUM with no sanctions"
Write-Host "4. Click 'Simulate Watchlist Update' button on Vostok detail"
Write-Host "   (Adds KIM Yong Chol to OFAC watchlist)"
Write-Host "5. Wait 30-60 seconds for automated re-screening"
Write-Host "6. Refresh page → risk now shows HIGH (95)"
Write-Host "   • Open Risk tab → see new 'Director KIM Yong Chol identified on watchlist'"
Write-Host "   • Open Audit Logs → see new run_monitoring + notify_compliance entries"
Write-Host "7. Go to Compliance Officer Dashboard → new SAR for Vostok in queue"
Write-Host "   • This SAR was auto-generated (no manual 'scan' click needed)"
Write-Host ""

Write-Host "COMPLIANCE OFFICER ACTIONS" -ForegroundColor Yellow
Write-Host "─────────────────────────" -ForegroundColor Yellow
Write-Host "1. In Dashboard → click SAR in queue"
Write-Host "2. Read narrative + evidence + timeline"
Write-Host "3. Either:"
Write-Host "   • Click 'Recommend Deactivation' → moves SAR to Admin queue (soft-delete pending)"
Write-Host "   • Click 'Reject' → closes SAR, company stays monitored"
Write-Host "4. View Audit Logs to see your action recorded"
Write-Host ""

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Useful Database Queries" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "See all companies and their risk levels:" -ForegroundColor Gray
Write-Host '  docker exec kyc-compliance-autonomous-agent-postgres-1 psql -U kyc -d kyc_auditor -c "SELECT legal_name, risk_level, monitoring_status FROM companies ORDER BY created_at;"' -ForegroundColor Gray
Write-Host ""

Write-Host "See all SARs and their status:" -ForegroundColor Gray
Write-Host '  docker exec kyc-compliance-autonomous-agent-postgres-1 psql -U kyc -d kyc_auditor -c "SELECT c.legal_name, s.status, s.created_at FROM sar_reports s JOIN companies c ON c.id = s.company_id ORDER BY s.created_at DESC;"' -ForegroundColor Gray
Write-Host ""

Write-Host "See audit logs (who did what):" -ForegroundColor Gray
Write-Host '  docker exec kyc-compliance-autonomous-agent-postgres-1 psql -U kyc -d kyc_auditor -c "SELECT actor, action, event_metadata, created_at FROM audit_logs ORDER BY created_at DESC LIMIT 20;"' -ForegroundColor Gray
Write-Host ""

Write-Host "Reset (delete) demo contamination companies (Crimson Star, Helios, Nordwind):" -ForegroundColor Gray
Write-Host "  python scripts/seed_contamination_demo.py" -ForegroundColor Gray
Write-Host ""
