import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  CalendarClock,
  FileText,
  Hash,
  MapPin,
  RefreshCw,
  TrendingUp,
  Clock,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader } from "@/components/PageHeader";
import { CompanyStatusBadge, RiskBadge, SarStatusBadge } from "@/components/status-badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RiskGauge } from "@/components/charts/RiskGauge";
import { useCompany } from "@/hooks/useCompanies";
import { useCompanyEvidence, useCompanyRiskReport, useCompanyTimeline } from "@/hooks/useReports";
import { useTriggerMonitoringRun } from "@/hooks/useMonitoringRuns";
import { useSarReports } from "@/hooks/useSarReports";
import { useRole } from "@/lib/roles";
import type { Evidence, SARReport, TimelineEvent } from "@/types/models";

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Building2;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}

function OverviewTab({ companyId }: { companyId: string }) {
  const { data: company } = useCompany(companyId);
  const { data: riskReport, isLoading: riskLoading } = useCompanyRiskReport(companyId);

  if (!company) return null;

  const hasAssessment = riskReport && riskReport.risk_level !== "unknown";

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle>Company profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <DetailRow icon={Hash} label="Registration number" value={company.registration_number || "—"} />
          <DetailRow icon={MapPin} label="Jurisdiction" value={company.jurisdiction || "—"} />
          <DetailRow icon={Building2} label="Industry" value={company.industry || "—"} />
          <DetailRow
            icon={CalendarClock}
            label="Onboarded"
            value={company.onboarded_at ? new Date(company.onboarded_at).toLocaleDateString() : "—"}
          />
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Risk assessment</CardTitle>
        </CardHeader>
        <CardContent>
          {riskLoading ? (
            <Skeleton className="mx-auto h-32 w-56" />
          ) : hasAssessment ? (
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:justify-center sm:gap-10">
              <RiskGauge score={riskReport.risk_score} />
              {riskReport.rationale ? (
                <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
                  {riskReport.rationale}
                </p>
              ) : null}
            </div>
          ) : (
            <EmptyState
              title="No risk assessment yet"
              description="A risk score appears here once monitoring has run for this company."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function TimelineTab({ companyId }: { companyId: string }) {
  const { data: events, isLoading, isError, refetch } = useCompanyTimeline(companyId);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }
  if (isError) {
    return <ErrorState message="Could not load the timeline." onRetry={() => refetch()} />;
  }
  if (!events || events.length === 0) {
    return (
      <EmptyState
        title="No timeline events recorded"
        description="Monitoring events for this company will appear here as they occur."
      />
    );
  }

  return (
    <ol className="space-y-6 border-l border-border pl-6">
      {events.map((event: TimelineEvent) => (
        <li key={event.id} className="relative">
          <span className="absolute -left-[29px] top-1 size-2.5 rounded-full bg-primary" />
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="capitalize">
              {event.event_type.replace(/_/g, " ")}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {new Date(event.occurred_at).toLocaleString()}
            </span>
          </div>
          {event.description ? (
            <p className="mt-1.5 text-sm text-foreground">{event.description}</p>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

function ReportsTab({ companyId }: { companyId: string }) {
  const { data: evidence, isLoading: evidenceLoading } = useCompanyEvidence(companyId);
  const { data: sarReports, isLoading: sarLoading } = useSarReports();
  const companySars = (sarReports ?? []).filter((s: SARReport) => s.company_id === companyId);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>SAR reports</CardTitle>
        </CardHeader>
        <CardContent>
          {sarLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : companySars.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No SAR reports"
              description="Suspicious activity reports for this company will appear here."
            />
          ) : (
            <ul className="space-y-2">
              {companySars.map((sar: SARReport) => (
                <li key={sar.id}>
                  <Link
                    to={`/sar/${sar.id}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5 transition-colors hover:border-primary/40 hover:bg-muted/50"
                  >
                    <span className="text-sm font-medium text-foreground">
                      SAR {sar.id.slice(0, 8)}
                    </span>
                    <SarStatusBadge status={sar.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Evidence</CardTitle>
        </CardHeader>
        <CardContent>
          {evidenceLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : !evidence || evidence.length === 0 ? (
            <EmptyState title="No evidence collected yet" />
          ) : (
            <ul className="space-y-2">
              {evidence.map((item: Evidence) => (
                <li key={item.id} className="rounded-lg border border-border px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize">
                      {item.evidence_type}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(item.collected_at).toLocaleDateString()}
                    </span>
                  </div>
                  {item.content ? (
                    <p className="mt-1.5 text-sm text-foreground">{item.content}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: company, isLoading, isError, refetch } = useCompany(id);
  const triggerRun = useTriggerMonitoringRun();
  const role = useRole();

  return (
    <div className="space-y-6">
      <Link
        to="/companies"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to companies
      </Link>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : isError || !company ? (
        <Card>
          <CardContent>
            <ErrorState message="Could not load this company." onRetry={() => refetch()} />
          </CardContent>
        </Card>
      ) : (
        <>
          <PageHeader
            title={company.legal_name || "Unnamed company"}
            action={
              <>
                <CompanyStatusBadge status={company.monitoring_status} />
                <RiskBadge level={company.risk_level} />
                <Link to={`/companies/${company.id}/evidence`}>
                  <Button variant="outline" size="sm" className="cursor-pointer">
                    <AlertCircle data-icon="inline-start" />
                    Evidence
                  </Button>
                </Link>
                <Link to={`/companies/${company.id}/risk`}>
                  <Button variant="outline" size="sm" className="cursor-pointer">
                    <TrendingUp data-icon="inline-start" />
                    Risk
                  </Button>
                </Link>
                <Link to={`/companies/${company.id}/timeline`}>
                  <Button variant="outline" size="sm" className="cursor-pointer">
                    <Clock data-icon="inline-start" />
                    Timeline
                  </Button>
                </Link>
                {role === "compliance_officer" ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={triggerRun.isPending}
                      onClick={() => triggerRun.mutate(company.id)}
                    >
                      <RefreshCw
                        data-icon="inline-start"
                        className={triggerRun.isPending ? "animate-spin" : undefined}
                      />
                      {triggerRun.isPending ? "Scanning..." : "Scan now"}
                    </Button>
                    <Link to={`/companies/${company.id}/execute`}>
                      <Button variant="default" size="sm" className="cursor-pointer">
                        <Sparkles data-icon="inline-start" />
                        Run Audit
                      </Button>
                    </Link>
                  </>
                ) : null}
              </>
            }
          />

          <Tabs defaultValue="overview">
            <TabsList variant="line">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="reports">Reports</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="pt-4">
              <OverviewTab companyId={company.id} />
            </TabsContent>
            <TabsContent value="timeline" className="pt-4">
              <TimelineTab companyId={company.id} />
            </TabsContent>
            <TabsContent value="reports" className="pt-4">
              <ReportsTab companyId={company.id} />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
