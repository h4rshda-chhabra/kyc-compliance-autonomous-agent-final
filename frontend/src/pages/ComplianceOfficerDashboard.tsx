import { useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Radar,
  TrendingUp,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CompaniesModal } from "@/components/CompaniesModal";
import { SARsModal } from "@/components/SARsModal";
import { useAuditLogs } from "@/hooks/useAuditLogs";
import { useDashboardSummary } from "@/hooks/useDashboardSummary";
import { useComplianceQueue } from "@/hooks/useSarReports";
import { useCompanies } from "@/hooks/useCompanies";
import type { AuditLog, ComplianceOfficerDashboardSummary, SARReport, Company } from "@/types/models";

function StatCard({
  icon: Icon,
  label,
  value,
  trend,
  trendLabel,
  onClick,
}: {
  icon: typeof AlertCircle;
  label: string;
  value: number | string;
  trend?: "up" | "down" | "neutral";
  trendLabel?: string;
  onClick?: () => void;
}) {
  const trendColor =
    trend === "up"
      ? "text-destructive"
      : trend === "down"
        ? "text-primary"
        : "text-muted-foreground";

  return (
    <Card
      className={`transition-colors hover:bg-muted/40 ${onClick ? "cursor-pointer hover:shadow-md" : ""}`}
      onClick={onClick}
    >
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="text-3xl font-bold tabular-nums">{value}</p>
            {trendLabel && (
              <p className={`text-xs font-medium ${trendColor}`}>{trendLabel}</p>
            )}
          </div>
          <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="size-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ComplianceOfficerDashboard() {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalFilter, setModalFilter] = useState<"high-risk" | "monitored" | null>(null);
  const [sarModalOpen, setSarModalOpen] = useState(false);

  const { data: summaryData, isLoading: summaryLoading } = useDashboardSummary();
  const { data: queue, isLoading: queueLoading } = useComplianceQueue();
  const { data: auditLogs } = useAuditLogs();
  const { data: allCompanies } = useCompanies();

  // This page only renders for COMPLIANCE_OFFICER users (gated by RequireRole
  // in App.tsx), so the summary is always the officer shape.
  const summary = summaryData as ComplianceOfficerDashboardSummary | undefined;

  const recentSars = (queue ?? [])
    .slice()
    .sort((a: SARReport, b: SARReport) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const recentActivity = (auditLogs ?? []).slice(0, 10);

  // Filter companies based on modal filter
  const filteredCompanies = (allCompanies ?? []).filter((company: Company) => {
    if (modalFilter === "high-risk") {
      return company.risk_level.toLowerCase() === "high";
    }
    if (modalFilter === "monitored") {
      return company.monitoring_status !== "onboarding" && company.monitoring_status !== "not_monitored";
    }
    return true;
  });

  const handleOpenModal = (filter: "high-risk" | "monitored", title: string) => {
    setModalFilter(filter);
    setModalTitle(title);
    setModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Compliance Dashboard"
        description={
          summary
            ? `Active monitoring: ${summary.companies_under_monitoring} companies • ${summary.pending_sar_reviews} SARs need your review`
            : "Portfolio-wide continuous KYC compliance overview."
        }
      />

      {/* Top metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryLoading || !summary ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <StatCard
              icon={Radar}
              label="Under monitoring"
              value={summary.companies_under_monitoring}
              trendLabel={`${summary.companies_under_monitoring} under watch`}
              onClick={() => handleOpenModal("monitored", "Companies Under Monitoring")}
            />
            <StatCard
              icon={FileText}
              label="SARs to review"
              value={summary.pending_sar_reviews}
              trend={summary.pending_sar_reviews > 0 ? "up" : "neutral"}
              trendLabel={
                summary.pending_sar_reviews > 0
                  ? `${summary.pending_sar_reviews} awaiting your review`
                  : "All caught up"
              }
              onClick={() => setSarModalOpen(true)}
            />
            <StatCard
              icon={AlertCircle}
              label="High risk companies"
              value={summary.high_risk_companies}
              trend={summary.high_risk_companies > 0 ? "up" : "neutral"}
              trendLabel="High or critical risk level"
              onClick={() => handleOpenModal("high-risk", "High Risk Companies")}
            />
            <StatCard
              icon={CheckCircle2}
              label="Manual audits today"
              value={summary.manual_audits_today}
              trendLabel="Triggered by your team"
            />
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Quick actions */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(summary?.pending_sar_reviews ?? 0) > 0 ? (
              <Link to="/reviews" className="block">
                <Button variant="outline" className="w-full cursor-pointer justify-start">
                  <FileText className="mr-2 size-4" />
                  Review SAR reports ({summary?.pending_sar_reviews})
                </Button>
              </Link>
            ) : null}
            <Link to="/monitoring" className="block">
              <Button variant="outline" className="w-full cursor-pointer justify-start">
                <Radar className="mr-2 size-4" />
                Check monitoring runs
              </Button>
            </Link>
            <Link to="/audit" className="block">
              <Button variant="outline" className="w-full cursor-pointer justify-start">
                <TrendingUp className="mr-2 size-4" />
                View audit trail
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Status overview */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Monitoring status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1 rounded-lg bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">Companies monitored</p>
                <p className="text-2xl font-bold">{summary?.companies_under_monitoring ?? 0}</p>
              </div>
              <div className="space-y-1 rounded-lg bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">High risk</p>
                <p className="text-2xl font-bold">{summary?.high_risk_companies ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent SARs */}
      {!queueLoading && recentSars.length > 0 ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">SARs awaiting review</CardTitle>
            <Link to="/reviews">
              <Button variant="ghost" size="sm" className="cursor-pointer">
                View all
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="px-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Risk</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentSars.map((sar: SARReport) => (
                    <TableRow key={sar.id} className="transition-colors hover:bg-muted/40">
                      <TableCell className="font-medium text-foreground">
                        {sar.company_name ?? sar.company_id.slice(0, 8)}
                      </TableCell>
                      <TableCell>
                        {sar.company_risk_level ? (
                          <Badge variant="outline" className="capitalize">
                            {sar.company_risk_level}
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(sar.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link to={`/sar/${sar.id}`}>
                          <Button size="sm" variant="outline" className="cursor-pointer">
                            Review
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : queueLoading ? (
        <Card>
          <CardContent className="space-y-3 pt-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : null}

      {/* Recent activity */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent activity</CardTitle>
          <Link to="/audit">
            <Button variant="ghost" size="sm" className="cursor-pointer">
              Audit trail
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="px-0">
          {recentActivity.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <p className="text-sm text-muted-foreground">No recent activity</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Actor</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead className="text-right">When</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentActivity.map((log: AuditLog) => (
                    <TableRow key={log.id} className="transition-colors hover:bg-muted/40">
                      <TableCell className="text-sm font-medium text-foreground">
                        {log.actor}
                      </TableCell>
                      <TableCell className="text-sm capitalize text-muted-foreground">
                        {log.action.replace(/_/g, " ")}
                      </TableCell>
                      <TableCell className="text-sm">
                        <span className="font-mono text-xs uppercase">
                          {log.resource_type}
                        </span>
                        {log.resource_id && (
                          <span className="ml-1 text-xs text-muted-foreground">
                            · {log.resource_id.slice(0, 8)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {new Date(log.created_at).toLocaleTimeString(undefined, {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Companies Modal */}
      <CompaniesModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        companies={filteredCompanies}
        title={modalTitle}
      />

      {/* SARs Modal */}
      <SARsModal
        isOpen={sarModalOpen}
        onClose={() => setSarModalOpen(false)}
        sars={queue ?? []}
        companies={allCompanies ?? []}
        isLoading={queueLoading}
      />
    </div>
  );
}
