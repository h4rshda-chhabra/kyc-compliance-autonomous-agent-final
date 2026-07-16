import { useMemo } from "react";
import { Link } from "react-router-dom";
import { BellRing, Check, ShieldAlert, TriangleAlert } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { acknowledgeAlert, useAlerts } from "@/lib/alerts";

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function riskColor(score: number) {
  if (score >= 90) return "text-destructive";
  if (score >= 60) return "text-destructive";
  if (score >= 35) return "text-yellow-500";
  return "text-primary";
}

export function AlertsPage() {
  const alerts = useAlerts();

  const stats = useMemo(() => {
    const open = alerts.filter((a) => !a.acknowledged);
    return {
      total: alerts.length,
      open: open.length,
      critical: open.filter((a) => a.riskScore >= 90).length,
    };
  }, [alerts]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Risk Alerts"
        description={
          stats.open > 0
            ? `${stats.open} open alert${stats.open === 1 ? "" : "s"} need${stats.open === 1 ? "s" : ""} your attention.`
            : "No open alerts — all companies within risk tolerance."
        }
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Open alerts
                </p>
                <p className="text-3xl font-bold tabular-nums text-destructive">
                  {stats.open}
                </p>
              </div>
              <div className="flex size-12 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                <BellRing className="size-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Critical (≥90%)
                </p>
                <p className="text-3xl font-bold tabular-nums">{stats.critical}</p>
              </div>
              <div className="flex size-12 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                <ShieldAlert className="size-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Total raised
                </p>
                <p className="text-3xl font-bold tabular-nums">{stats.total}</p>
              </div>
              <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <TriangleAlert className="size-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts table */}
      <Card>
        <CardContent className="px-0">
          {alerts.length === 0 ? (
            <EmptyState
              icon={BellRing}
              title="No alerts yet"
              description="When a scan finds a company with a high risk score, an alert appears here."
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Risk</TableHead>
                    <TableHead>Alert</TableHead>
                    <TableHead>Raised</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alerts.map((alert) => (
                    <TableRow
                      key={alert.id}
                      className={`transition-colors hover:bg-muted/40 ${
                        alert.acknowledged ? "opacity-60" : ""
                      }`}
                    >
                      <TableCell className="max-w-xs truncate font-medium">
                        <Link
                          to={`/companies/${alert.companyId}`}
                          className="block truncate underline-offset-4 hover:underline"
                        >
                          {alert.companyName}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`font-mono text-sm font-semibold tabular-nums ${riskColor(alert.riskScore)}`}
                        >
                          {alert.riskScore}%
                        </span>
                        <span className="ml-2 text-xs capitalize text-muted-foreground">
                          {alert.riskLevel}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-sm text-sm text-muted-foreground">
                        {alert.message}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm tabular-nums text-muted-foreground">
                        {formatDateTime(alert.createdAt)}
                      </TableCell>
                      <TableCell>
                        {alert.acknowledged ? (
                          <Badge variant="outline">Acknowledged</Badge>
                        ) : (
                          <Badge variant="destructive">Open</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {alert.acknowledged ? (
                          <span className="text-xs text-muted-foreground">
                            {alert.acknowledgedAt
                              ? formatDateTime(alert.acknowledgedAt)
                              : "—"}
                          </span>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="cursor-pointer"
                            onClick={() => acknowledgeAlert(alert.id)}
                          >
                            <Check data-icon="inline-start" />
                            Acknowledge
                          </Button>
                        )}
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
