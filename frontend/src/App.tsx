import { Navigate, Route, Routes } from "react-router-dom";
import { RequireAuth } from "@/components/RequireAuth";
import { RequireRole } from "@/components/RequireRole";
import { AppLayout } from "@/layouts/AppLayout";
import { AuthLayout } from "@/layouts/AuthLayout";
import { AgentExecution } from "@/pages/AgentExecution";
import { AlertsPage } from "@/pages/AlertsPage";
import { AuditPage } from "@/pages/AuditPage";
import { CompaniesPage } from "@/pages/CompaniesPage";
import { CompanyDetailPage } from "@/pages/CompanyDetailPage";
import { ComplianceOfficerDashboard } from "@/pages/ComplianceOfficerDashboard";
import { DecisionsPage } from "@/pages/DecisionsPage";
import { EvidencePage } from "@/pages/EvidencePage";
import { LandingPage } from "@/pages/LandingPage";
import { LoginPage } from "@/pages/LoginPage";
import { MonitoringPage } from "@/pages/MonitoringPage";
import { OfficerCompaniesPage } from "@/pages/OfficerCompaniesPage";
import { OnboardingPage } from "@/pages/OnboardingPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { RiskPage } from "@/pages/RiskPage";
import { SarReviewPage } from "@/pages/SarReviewPage";
import { SarReviewsPage } from "@/pages/SarReviewsPage";
import { SignupPage } from "@/pages/SignupPage";
import { TimelinePage } from "@/pages/TimelinePage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />

      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
      </Route>

      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          {/* Officer: dashboard is their home */}
          <Route
            path="/dashboard"
            element={
              <RequireRole role="compliance_officer">
                <ComplianceOfficerDashboard />
              </RequireRole>
            }
          />
          <Route path="/companies/:id" element={<CompanyDetailPage />} />
          <Route path="/companies/:id/evidence" element={<EvidencePage />} />
          <Route path="/companies/:id/risk" element={<RiskPage />} />
          <Route path="/companies/:id/timeline" element={<TimelinePage />} />
          <Route
            path="/companies/:companyId/execute"
            element={
              <RequireRole role="compliance_officer">
                <AgentExecution />
              </RequireRole>
            }
          />
          <Route path="/sar/:id" element={<SarReviewPage />} />
          <Route path="/audit" element={<AuditPage />} />
          <Route path="/profile" element={<ProfilePage />} />

          {/* Admin only: onboarding, portfolio + final decisions */}
          <Route
            path="/onboarding"
            element={
              <RequireRole role="admin">
                <OnboardingPage />
              </RequireRole>
            }
          />
          <Route
            path="/companies"
            element={
              <RequireRole role="admin">
                <CompaniesPage />
              </RequireRole>
            }
          />
          <Route
            path="/decisions"
            element={
              <RequireRole role="admin">
                <DecisionsPage />
              </RequireRole>
            }
          />

          {/* Compliance officer only: portfolio, monitoring + review queue */}
          <Route
            path="/portfolio"
            element={
              <RequireRole role="compliance_officer">
                <OfficerCompaniesPage />
              </RequireRole>
            }
          />
          <Route
            path="/alerts"
            element={
              <RequireRole role="compliance_officer">
                <AlertsPage />
              </RequireRole>
            }
          />
          <Route
            path="/monitoring"
            element={
              <RequireRole role="compliance_officer">
                <MonitoringPage />
              </RequireRole>
            }
          />
          <Route
            path="/reviews"
            element={
              <RequireRole role="compliance_officer">
                <SarReviewsPage />
              </RequireRole>
            }
          />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
