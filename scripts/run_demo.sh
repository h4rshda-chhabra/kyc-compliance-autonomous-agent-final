#!/bin/bash
# Demo automation script — seeds data and provides quick commands to trigger scenarios

set -e

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "=========================================="
echo "KYC Compliance System — Demo Setup"
echo "=========================================="
echo ""

# Check if backend dependencies are installed
python_check=$(python -c "import sqlalchemy, psycopg2; print('ok')" 2>&1)
if [ "$python_check" != "ok" ]; then
    echo "❌ Backend dependencies missing. Please activate the virtual environment first."
    echo "   Run: python -m venv venv && source venv/bin/activate (or venv\Scripts\activate on Windows)"
    exit 1
fi

echo "✓ Python dependencies OK"
echo ""

# Seed the database
echo "Seeding demo companies..."
python scripts/seed_demo_data.py > /dev/null 2>&1 && echo "✓ Demo companies seeded" || echo "⚠ Demo seed already exists (idempotent)"

echo "Seeding cross-contamination scenario..."
python scripts/seed_contamination_demo.py > /dev/null 2>&1 && echo "✓ Contamination demo seeded" || echo "⚠ Contamination seed already exists"

echo ""
echo "=========================================="
echo "Demo Ready!"
echo "=========================================="
echo ""

echo "SCENARIO 1: Cross-Company Director Contamination"
echo "─────────────────────────────────────────────────"
echo "1. Open dashboard: http://localhost:5173"
echo "2. Login: demo@example.com / password123"
echo "3. Go to Companies → find 'Nordwind Capital Partners' (Singapore)"
echo "4. Click 'Scan Now' button to trigger audit"
echo "5. Check Risk tab → see contamination alerts for Viktor Orlov and Priya Nair"
echo "6. Go to Compliance Officer Dashboard → see new SAR in review queue"
echo ""

echo "SCENARIO 2: Watchlist Update → Risk Escalation"
echo "───────────────────────────────────────────────"
echo "1. Open dashboard: http://localhost:5173"
echo "2. Go to Companies → click 'Theranos Inc' (USA)"
echo "3. Note current risk level (MEDIUM, ~40-65 from adverse media)"
echo "4. On Theranos detail, scroll down → click 'Simulate Watchlist Update' button"
echo "   (This adds THERANOS INC and ELIZABETH HOLMES to the sanctions watchlist)"
echo "5. Wait 30-60 seconds for auto re-screen to complete"
echo "6. Refresh page → risk now shows HIGH (95, from sanctions match)"
echo "7. Open Risk tab → see new 'Director Elizabeth Holmes identified on watchlist' event"
echo "8. Go to Compliance Officer Dashboard → new SAR for Theranos in queue"
echo ""

echo "SCENARIO 3: Autonomous Monitoring + Auto-SAR on Risk Escalation"
echo "──────────────────────────────────────────────────────────────────"
echo "Demonstrates continuous background scanning with automatic SAR generation (no manual trigger)."
echo ""
echo "1. Open dashboard: http://localhost:5173"
echo "2. Go to Companies → click 'Vostok Shipping Agency' (Russia)"
echo "3. Open Risk tab:"
echo "   • Point out multiple audit log entries (run_monitoring)"
echo "   • Explain: 'The system automatically audited this company every 15 min'"
echo "   • Show risk has been stable MEDIUM with no sanctions"
echo "4. Click 'Simulate Watchlist Update' button on Vostok detail"
echo "   (Adds KIM Yong Chol to OFAC watchlist)"
echo "5. Wait 30-60 seconds for automated re-screening"
echo "6. Refresh page → risk now shows HIGH (95)"
echo "   • Open Risk tab → see new 'Director KIM Yong Chol identified on watchlist'"
echo "   • Open Audit Logs → see new run_monitoring + notify_compliance entries"
echo "7. Go to Compliance Officer Dashboard → new SAR for Vostok in queue"
echo "   • This SAR was auto-generated (no manual 'scan' click needed)"
echo ""

echo "COMPLIANCE OFFICER ACTIONS"
echo "─────────────────────────"
echo "1. In Dashboard → click SAR in queue"
echo "2. Read narrative + evidence + timeline"
echo "3. Either:"
echo "   • Click 'Recommend Deactivation' → moves SAR to Admin queue (soft-delete pending)"
echo "   • Click 'Reject' → closes SAR, company stays monitored"
echo "4. View Audit Logs to see your action recorded"
echo ""

echo "=========================================="
echo "Useful Database Queries"
echo "=========================================="
echo ""
echo "See all companies and their risk levels:"
echo "  psql -U kyc -d kyc_auditor -h localhost -c \"SELECT legal_name, risk_level, monitoring_status FROM companies ORDER BY created_at;\""
echo ""
echo "See all SARs and their status:"
echo "  psql -U kyc -d kyc_auditor -h localhost -c \"SELECT c.legal_name, s.status, s.created_at FROM sar_reports s JOIN companies c ON c.id = s.company_id ORDER BY s.created_at DESC;\""
echo ""
echo "See audit logs (who did what):"
echo "  psql -U kyc -d kyc_auditor -h localhost -c \"SELECT actor, action, event_metadata, created_at FROM audit_logs ORDER BY created_at DESC LIMIT 20;\""
echo ""
echo "Reset (delete) demo contamination companies (Crimson Star, Helios, Nordwind):"
echo "  python scripts/seed_contamination_demo.py"
echo ""
