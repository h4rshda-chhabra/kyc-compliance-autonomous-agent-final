import { Link } from "react-router-dom";
import { FileText } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader } from "@/components/PageHeader";
import { SarStatusBadge } from "@/components/status-badges";
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
import { useSarReports } from "@/hooks/useSarReports";
import type { Company, SARReport } from "@/types/models";

export function SarReviewsPage() {
  const { data: sarReports, isLoading, isError, refetch } = useSarReports();
  const { data: companies } = useCompanies();

  const companyName = (companyId: string) =>
    companies?.find((c: Company) => c.id === companyId)?.legal_name || companyId.slice(0, 8);

  return (
    <div className="space-y-6">
      <PageHeader title="SAR Reviews" description="Suspicious activity reports awaiting human review." />

      <Card>
        <CardContent className="px-0">
          {isLoading ? (
            <div className="space-y-3 px-4 py-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          ) : isError ? (
            <ErrorState message="Could not load SAR reports." onRetry={() => refetch()} />
          ) : !sarReports || sarReports.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No SAR reports"
              description="Suspicious activity reports drafted by the agent pipeline will appear here."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Report</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sarReports.map((sar: SARReport) => (
                  <TableRow key={sar.id} className="cursor-pointer">
                    <TableCell className="font-medium text-foreground">
                      <Link to={`/sar/${sar.id}`} className="block">
                        SAR {sar.id.slice(0, 8)}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {companyName(sar.company_id)}
                    </TableCell>
                    <TableCell>
                      <SarStatusBadge status={sar.status} />
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {new Date(sar.created_at).toLocaleDateString()}
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
