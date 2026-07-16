import { Link } from "react-router-dom";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader } from "@/components/PageHeader";
import { RunStatusBadge } from "@/components/status-badges";
import { Card, CardContent } from "@/components/ui/card";
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
import { useMonitoringRuns } from "@/hooks/useMonitoringRuns";
import type { Company, MonitoringRun } from "@/types/models";

export function MonitoringPage() {
  const { data: runs, isLoading, isError, refetch } = useMonitoringRuns();
  const { data: companies } = useCompanies();

  const companyName = (companyId: string) =>
    companies?.find((c: Company) => c.id === companyId)?.legal_name || companyId.slice(0, 8);

  return (
    <div className="space-y-6">
      <PageHeader title="Monitoring" description="Scheduled and manual monitoring runs across the portfolio." />

      <Card>
        <CardContent className="px-0">
          {isLoading ? (
            <div className="space-y-3 px-4 py-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          ) : isError ? (
            <ErrorState message="Could not load monitoring runs." onRetry={() => refetch()} />
          ) : !runs || runs.length === 0 ? (
            <EmptyState
              title="No monitoring runs yet"
              description="Runs triggered manually or on a schedule will appear here."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Run</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Trigger</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Summary</TableHead>
                  <TableHead className="text-right">Started</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((run: MonitoringRun) => (
                  <TableRow key={run.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {run.id.slice(0, 8)}
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      <Link to={`/companies/${run.company_id}`} className="hover:underline">
                        {companyName(run.company_id)}
                      </Link>
                    </TableCell>
                    <TableCell className="capitalize text-muted-foreground">
                      {run.trigger_type.replace(/_/g, " ")}
                    </TableCell>
                    <TableCell>
                      <RunStatusBadge status={run.status} />
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">
                      {run.summary || "—"}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {run.started_at ? new Date(run.started_at).toLocaleString() : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
