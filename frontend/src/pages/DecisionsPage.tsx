import { useState } from "react";
import { Link } from "react-router-dom";
import { Download, LoaderCircle } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { useAdminQueue } from "@/hooks/useSarReports";
import { downloadSarPdf } from "@/lib/sarPdf";
import type { SARReport } from "@/types/models";

function DownloadSarButton({ sarId }: { sarId: string }) {
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    setDownloading(true);
    try {
      await downloadSarPdf(sarId);
    } catch {
      // Swallow: button returns to idle
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="cursor-pointer"
      disabled={downloading}
      onClick={(e) => {
        e.stopPropagation();
        handleDownload();
      }}
    >
      {downloading ? (
        <LoaderCircle data-icon="inline-start" className="animate-spin" />
      ) : (
        <Download data-icon="inline-start" />
      )}
      PDF
    </Button>
  );
}

export function DecisionsPage() {
  const { data: queue, isLoading, isError, refetch } = useAdminQueue();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Decisions"
        description="Deactivation recommendations from compliance officers awaiting your final call."
      />

      <Card>
        <CardContent className="px-0">
          {isLoading ? (
            <div className="space-y-3 px-4 py-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          ) : isError ? (
            <ErrorState message="Could not load the admin review queue." onRetry={() => refetch()} />
          ) : !queue || queue.length === 0 ? (
            <EmptyState
              title="No recommendations pending"
              description="When a compliance officer recommends deactivating a company, it will appear here for your final decision."
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Legal company name</TableHead>
                    <TableHead>Risk</TableHead>
                    <TableHead>SAR report</TableHead>
                    <TableHead>Officer notes</TableHead>
                    <TableHead className="text-right">Review</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {queue.map((sar: SARReport) => (
                    <TableRow key={sar.id} className="transition-colors hover:bg-muted/40">
                      <TableCell className="font-mono text-xs uppercase text-muted-foreground">
                        {sar.id.slice(0, 8)}
                      </TableCell>
                      <TableCell className="max-w-xs truncate font-medium text-foreground">
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
                      <TableCell>
                        <DownloadSarButton sarId={sar.id} />
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                        {sar.review?.notes ?? "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link to={`/sar/${sar.id}`}>
                          <Button size="sm" className="cursor-pointer">
                            Review
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
