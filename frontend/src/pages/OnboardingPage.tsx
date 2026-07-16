import { useDeferredValue, useState } from "react";
import { Link } from "react-router-dom";
import {
  Building2,
  CheckCircle2,
  ClipboardList,
  Gavel,
  PlusCircle,
  Search,
  Ban,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { RiskBadge } from "@/components/status-badges";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCompanies } from "@/hooks/useCompanies";
import { useDashboardSummary } from "@/hooks/useDashboardSummary";
import { useOnboardCompany } from "@/hooks/useMonitoringRuns";
import { CreateCompanyDialog } from "@/components/CreateCompanyDialog";
import type { AdminDashboardSummary } from "@/types/models";
import type { Company } from "@/types/models";

function StatTile({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Building2;
  label: string;
  value: number;
  hint: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-start gap-4 pt-6">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold tabular-nums text-foreground">{value}</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{hint}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function OnboardingPage() {
  const [search, setSearch] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const deferredSearch = useDeferredValue(search);
  const { data: companies, isLoading, isError, refetch } = useCompanies(deferredSearch);
  const onboard = useOnboardCompany();
  const { data: summaryData } = useDashboardSummary();

  // This page only renders for ADMIN users (gated by RequireRole in App.tsx).
  const summary = summaryData as AdminDashboardSummary | undefined;

  function handleOnboard(company: { id: string }) {
    // Onboard the company (materialize it from dataset without scanning).
    setErrorMessage(null);
    onboard.mutate(company.id, {
      onError: (err: unknown) => {
        const message =
          (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
          "Failed to onboard company";
        setErrorMessage(message);
        // Auto-clear error after 5 seconds
        setTimeout(() => setErrorMessage(null), 5000);
      },
    });
  }

  return (
    <div className="space-y-6">
      {errorMessage && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {errorMessage}
        </div>
      )}
      <PageHeader
        title="Company Onboarding"
        description="Bring companies from the sanctions dataset under continuous monitoring."
        action={<CreateCompanyDialog onCreated={(company) => handleOnboard({ id: company.id })} />}
      />

      {/* Workflow at a glance */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile
          icon={Building2}
          label="Active companies"
          value={summary?.active_companies ?? 0}
          hint="Under continuous monitoring"
        />
        <StatTile
          icon={ClipboardList}
          label="Pending deactivation"
          value={summary?.pending_deactivation_requests ?? 0}
          hint="Awaiting your final decision"
        />
        <StatTile
          icon={Gavel}
          label="Deactivated"
          value={summary?.deactivated_companies ?? 0}
          hint="No longer monitored"
        />
      </div>

      {/* Dataset search */}
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Sanctions dataset directory</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {companies
                ? `${companies.length} result${companies.length === 1 ? "" : "s"}${
                    deferredSearch ? ` for “${deferredSearch}”` : ""
                  }`
                : "Search the full dataset by legal name."}
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by legal name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
              aria-label="Search the sanctions dataset"
            />
          </div>
        </CardHeader>
        <CardContent className="px-0">
          {isLoading ? (
            <div className="space-y-3 px-4 py-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          ) : isError ? (
            <ErrorState message="Could not load companies." onRetry={() => refetch()} />
          ) : !companies || companies.length === 0 ? (
            <EmptyState
              title={search ? "No companies match your search" : "No companies found"}
              description={
                search
                  ? "Try a different company name, or add it as a custom company."
                  : "The company directory could not be loaded from the dataset."
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Legal name</TableHead>
                    <TableHead>Jurisdiction</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Risk</TableHead>
                    <TableHead className="text-right">Onboard</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companies.map((company: Company) => {
                    // A company that has never been scanned has no Postgres
                    // row yet, so monitoring_status is always "not_monitored".
                    const alreadyOnboarded = company.monitoring_status !== "not_monitored";
                    const isOnboarding =
                      onboard.isPending && onboard.variables === company.id;
                    return (
                      <TableRow
                        key={company.id}
                        className="transition-colors hover:bg-muted/40"
                      >
                        <TableCell className="max-w-xs truncate font-medium text-foreground">
                          <Link
                            to={`/companies/${company.id}`}
                            className="block truncate underline-offset-4 hover:underline"
                          >
                            {company.legal_name || "—"}
                          </Link>
                        </TableCell>
                        <TableCell className="max-w-40 truncate font-mono text-xs uppercase text-muted-foreground">
                          {company.jurisdiction || "—"}
                        </TableCell>
                        <TableCell className="max-w-56 truncate text-muted-foreground">
                          {company.industry || "—"}
                        </TableCell>
                        <TableCell>
                          <RiskBadge level={company.risk_level} />
                        </TableCell>
                        <TableCell className="text-right">
                          {!company.is_active ? (
                            <div title={company.deactivation_reason || "Deactivated"} className="inline-flex items-center gap-1.5 text-sm font-medium text-destructive cursor-help">
                              <Ban className="size-4" />
                              Deactivated
                            </div>
                          ) : alreadyOnboarded ? (
                            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                              <CheckCircle2 className="size-4" />
                              Onboarded
                            </span>
                          ) : (
                            <Button
                              size="sm"
                              className="cursor-pointer"
                              disabled={isOnboarding}
                              onClick={() => handleOnboard(company)}
                            >
                              <PlusCircle data-icon="inline-start" />
                              {isOnboarding ? "Onboarding..." : "Onboard"}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
