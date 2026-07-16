# KYC Compliance Autonomous Agent

A production-ready Know Your Customer (KYC) compliance monitoring system with autonomous risk detection, Suspicious Activity Report (SAR) generation, and director contamination screening.

## 🎯 Features

- ✅ Continuous automated KYC monitoring
- ✅ Material change detection & alerts
- ✅ AI-powered SAR generation
- ✅ Cross-company director contamination detection
- ✅ Sanctions watchlist screening (OFAC, EU, UK, etc.)
- ✅ News-based risk monitoring
- ✅ Interactive dashboard with drill-down modals
- ✅ Complete audit trail & role-based access control

## 🚀 Quick Start

### Setup
```bash
# Frontend
cd frontend
npm install && npm run dev  # http://localhost:5173

# Backend (separate terminal)
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload  # http://localhost:8000
```

### Demo Credentials
- **Compliance Officer**: `compliance@kyc.local` / `compliance123`
- **Admin**: `admin@kyc.local` / `admin123`

## 📊 Dashboard

All stat cards are clickable:
- 🔍 "Under Monitoring" → View monitored companies
- 📄 "SARs to Review" → Pending SAR reports
- 🚨 "High Risk Companies" → Filter by risk level

## 📺 Demo Presentation

**https://drive.google.com/file/d/1liVNsRxCP1itV_xKf3C4hBCPp1Yawyc1/view?usp=sharing**

## 🏗️ Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: FastAPI + SQLAlchemy + PostgreSQL/SQLite
- **AI**: Google Generative AI for SAR narratives
- **Scheduler**: APScheduler for continuous monitoring

## 🔐 Security

- JWT authentication
- Role-based access control
- Complete audit trail
- SQL injection protection

---

**Built with** ⚡ Vite • React • FastAPI • SQLAlchemy
