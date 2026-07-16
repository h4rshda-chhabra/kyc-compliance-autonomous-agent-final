// Mirrors backend/app/models/*.py 1:1 (SQLAlchemy → JSON). IDs are UUIDs,
// serialized as strings. Statuses the backend leaves as free strings are
// typed as string here; known values are listed in the comments.

/** Backend default is "unknown"; scoring produces low/medium/high/critical. */
export type RiskLevel = "unknown" | "low" | "medium" | "high" | "critical";

export interface Company {
  /** OpenSanctions/OFAC entity id (e.g. "NK-...", "OFAC-36") — the company
   *  directory is served straight from the sanctions dataset. */
  id: string;
  legal_name: string;
  registration_number: string | null;
  jurisdiction: string | null;
  industry: string | null;
  /** e.g. "not_monitored" (directory only), "onboarding", "active", "escalated" */
  monitoring_status: string;
  risk_level: RiskLevel;
  onboarded_at: string | null;
  /** null until the company has been scanned (no Postgres row yet). */
  created_at: string | null;
  updated_at: string | null;
  news_monitoring_enabled?: boolean;
  news_monitoring_interval_minutes?: number;
  last_news_check_at?: string | null;
  /** Soft-delete flag — false once an admin has approved a deactivation
   *  recommendation. Orthogonal to monitoring_status/risk_level; a
   *  deactivated company is permanently excluded from the monitoring
   *  scheduler but its history remains fully accessible. */
  is_active: boolean;
  deactivated_at?: string | null;
  deactivation_reason?: string | null;
}

export interface MonitoringRun {
  id: string;
  company_id: string;
  /** e.g. "scheduled", "manual", "event_driven" */
  trigger_type: string;
  /** e.g. "queued" (default), "running", "completed", "failed" */
  status: string;
  summary: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface RiskReport {
  id: string;
  company_id: string;
  monitoring_run_id: string | null;
  risk_score: number;
  risk_level: RiskLevel;
  rationale: string | null;
  created_at: string;
}

export interface HumanReview {
  id: string;
  company_id: string;
  monitoring_run_id: string | null;
  sar_report_id: string | null;
  /** Compliance officer stage */
  reviewer_id: string | null;
  /** "recommend_deactivation" | "reject" */
  decision: string | null;
  notes: string | null;
  reviewed_at: string | null;
  /** Admin stage — only populated when decision === "recommend_deactivation" */
  admin_id: string | null;
  /** "approved_deactivation" | "rejected" */
  final_decision: string | null;
  admin_notes: string | null;
  admin_reviewed_at: string | null;
  created_at: string;
}

/** The subset of HumanReview embedded in SAR responses (GET /review/sar/{id},
 *  the compliance/admin queue endpoints, and the recommend/approve/reject
 *  action responses) — see _serialize_review in routes/review.py. */
export interface SarReviewSummary {
  id: string;
  reviewer_id: string | null;
  decision: string | null;
  notes: string | null;
  reviewed_at: string | null;
  admin_id: string | null;
  final_decision: string | null;
  admin_notes: string | null;
  admin_reviewed_at: string | null;
}

export interface SARReport {
  id: string;
  company_id: string;
  monitoring_run_id: string | null;
  /** "draft" (awaiting compliance officer) → "pending_admin_review" (officer
   *  recommended deactivation) → "deactivation_approved" (admin approved) or
   *  "closed" (rejected at either stage). "archived" = superseded by a newer
   *  SAR for the same company. */
  status: string;
  narrative: string | null;
  filed_at: string | null;
  created_at: string;
  /** Only present on queue-listing endpoints. */
  company_name?: string;
  company_risk_level?: RiskLevel;
  /** Only present when fetched via GET /review/sar/{id} or a queue endpoint;
   *  null if no compliance officer has acted on this SAR yet. */
  review?: SarReviewSummary | null;
}

export interface Evidence {
  id: string;
  company_id: string;
  monitoring_run_id: string | null;
  /** e.g. "news", "sanction", "registry", "court" */
  evidence_type: string;
  source_url: string | null;
  content: string | null;
  collected_at: string;
}

export interface TimelineEvent {
  id: string;
  company_id: string;
  event_type: string;
  description: string | null;
  occurred_at: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  event_metadata: Record<string, unknown> | null;
  created_at: string;
}

export type UserRole = "ADMIN" | "COMPLIANCE_OFFICER";

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** Shape of GET /dashboard/summary for a COMPLIANCE_OFFICER (routes/dashboard.py). */
export interface ComplianceOfficerDashboardSummary {
  companies_under_monitoring: number;
  pending_sar_reviews: number;
  high_risk_companies: number;
  manual_audits_today: number;
}

/** Shape of GET /dashboard/summary for an ADMIN (routes/dashboard.py). */
export interface AdminDashboardSummary {
  active_companies: number;
  pending_deactivation_requests: number;
  deactivated_companies: number;
  companies_added_this_month: number;
}

/** The endpoint returns one shape or the other depending on the caller's
 *  role — never both — so check current user's role to know which. */
export type DashboardSummary = ComplianceOfficerDashboardSummary | AdminDashboardSummary;

/** Shape of POST /auth/login (routes/auth.py). */
export interface LoginResponse {
  access_token: string;
  token_type: string;
}
