import { useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  Check,
  Pause,
  Pencil,
  Play,
  RefreshCw,
  Search,
  Timer,
  TriangleAlert,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CompanyStatusBadge } from "@/components/status-badges";
import { useCompanies, useUpdateCompanyCadence } from "@/hooks/useCompanies";
import { logAudit } from "@/lib/auditLog";
import {
  HIGH_RISK_THRESHOLD,
  invalidateScanData,
  scanAllCompanies,
  scanCompanyForRisk,
  setAutoScan,
  useAutoScanSettings,
  type ScannableCompany,
} from "@/lib/autoScan";
import type { Company } from "@/types/models";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Live risk % straight from the company row (already computed server-side). */
function RiskCell({ company }: { company: Company }) {
  if (company.risk_level === "unknown") {
    return <span className="text-xs text-muted-foreground">Not scanned</span>;
  }

  const score = company.risk_level === "critical" ? 95 : company.risk_level === "high" ? 75 : company.risk_level === "medium" ? 45 : 15;
  const color =
    score >= HIGH_RISK_THRESHOLD
      ? "text-destructive"
      : score >= 35
        ? "text-yellow-500"
        : "text-primary";

  return (
    <div className="flex items-center gap-1.5">
      <span className={`font-mono text-sm font-semibold tabular-nums ${color} capitalize`}>
        {company.risk_level}
      </span>
      {score >= HIGH_RISK_THRESHOLD ? (
        <TriangleAlert className="size-3.5 text-destructive" />
      ) : null}
    </div>
  );
}

export function OfficerCompaniesPage() {
  const [search, setSearch] = useState("");
  const [scanningIds, setScanningIds] = useState<Set<string>>(new Set());
  const [scanningAll, setScanningAll] = useState(false);
  const [editingInterval, setEditingInterval] = useState(false);
  const [intervalDraft, setIntervalDraft] = useState("");
  const { data: companies } = useCompanies(search, "active", "monitored");
  const autoScan = useAutoScanSettings();
  const updateCadence = useUpdateCompanyCadence();
  const queryClient = useQueryClient();

  const monitored = companies ?? [];

  async function handleScanOne(company: Company) {
    const target: ScannableCompany = { companyId: company.id, legalName: company.legal_name ?? company.id };
    setScanningIds((prev) => new Set(prev).add(company.id));
    try {
      await scanCompanyForRisk(target);
      invalidateScanData(queryClient);
    } finally {
      setScanningIds((prev) => {
        const next = new Set(prev);
        next.delete(company.id);
        return next;
      });
    }
  }

  async function handleScanAll() {
    setScanningAll(true);
    try {
      await scanAllCompanies(
        monitored.map((c: Company) => ({ companyId: c.id, legalName: c.legal_name ?? c.id })),
      );
      invalidateScanData(queryClient);
    } finally {
      setScanningAll(false);
    }
  }

  function startEditingInterval() {
    setIntervalDraft(String(autoScan.intervalMinutes));
    setEditingInterval(true);
  }

  function saveInterval() {
    const v = Math.round(Number(intervalDraft));
    if (Number.isFinite(v) && v >= 1) {
      setAutoScan({ intervalMinutes: Math.min(v, 720) });
      logAudit("auto_scan_interval_changed", "portfolio", null);
    }
    setEditingInterval(false);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Companies"
        description={`${monitored.length} compan${monitored.length === 1 ? "y" : "ies"} under continuous monitoring.`}
        action={
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Filter by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
              aria-label="Filter monitored companies"
            />
          </div>
        }
      />

      {/* Continuous scanning controls */}
      <Card>
        <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Timer className="size-5" />
            </div>
            <div>
              <p className="text-sm font-medium">Continuous scanning</p>
              <p className="text-xs text-muted-foreground">
                {autoScan.enabled
                  ? `Scanning all companies every ${autoScan.intervalMinutes} min`
                  : "Paused — enable to scan on a schedule"}
                {autoScan.lastRunAt
                  ? ` · Last run ${formatTime(autoScan.lastRunAt)}`
                  : ""}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {editingInterval ? (
              <>
                <label
                  htmlFor="scan-interval"
                  className="text-xs text-muted-foreground"
                >
                  Every
                </label>
                <Input
                  id="scan-interval"
                  type="number"
                  min={1}
                  max={720}
                  autoFocus
                  value={intervalDraft}
                  onChange={(e) => setIntervalDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveInterval();
                    if (e.key === "Escape") setEditingInterval(false);
                  }}
                  className="w-20 tabular-nums"
                  aria-label="Scan interval in minutes"
                />
                <span className="text-xs text-muted-foreground">min</span>
                <Button
                  variant="default"
                  size="sm"
                  className="cursor-pointer"
                  onClick={saveInterval}
                >
                  <Check data-icon="inline-start" />
                  Save
                </Button>
              </>
            ) : (
              <>
                <span className="rounded-md border border-border bg-muted/40 px-3 py-1.5 font-mono text-sm tabular-nums">
                  Every {autoScan.intervalMinutes} min
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="cursor-pointer"
                  onClick={startEditingInterval}
                >
                  <Pencil data-icon="inline-start" />
                  Edit
                </Button>
              </>
            )}
            <Button
              variant={autoScan.enabled ? "secondary" : "default"}
              size="sm"
              className="cursor-pointer"
              onClick={() => {
                const enabled = !autoScan.enabled;
                setAutoScan({ enabled });
                logAudit(
                  enabled ? "auto_scan_enabled" : "auto_scan_paused",
                  "portfolio",
                  null,
                );
              }}
            >
              {autoScan.enabled ? (
                <>
                  <Pause data-icon="inline-start" />
                  Pause
                </>
              ) : (
                <>
                  <Play data-icon="inline-start" />
                  Enable
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="cursor-pointer"
              disabled={scanningAll || monitored.length === 0}
              onClick={handleScanAll}
            >
              <RefreshCw
                data-icon="inline-start"
                className={scanningAll ? "animate-spin" : undefined}
              />
              {scanningAll ? "Scanning all..." : "Scan all now"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="px-0">
          {monitored.length === 0 ? (
            <EmptyState
              title="No companies under monitoring yet"
              description="Companies appear here once the admin onboards them for monitoring."
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Legal name</TableHead>
                    <TableHead>Jurisdiction</TableHead>
                    <TableHead>Onboarded</TableHead>
                    <TableHead>Risk</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monitored.map((company: Company) => {
                    const isScanning = scanningAll || scanningIds.has(company.id);
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
                        <TableCell className="tabular-nums text-muted-foreground">
                          {company.onboarded_at
                            ? new Date(company.onboarded_at).toLocaleDateString(undefined, {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <RiskCell company={company} />
                        </TableCell>
                        <TableCell>
                          <CompanyStatusBadge status={company.monitoring_status} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="cursor-pointer"
                              disabled={isScanning}
                              onClick={() => handleScanOne(company)}
                            >
                              <RefreshCw
                                data-icon="inline-start"
                                className={isScanning ? "animate-spin" : undefined}
                              />
                              {isScanning ? "Scanning..." : "Scan"}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="cursor-pointer text-muted-foreground"
                              disabled={updateCadence.isPending && updateCadence.variables?.companyId === company.id}
                              onClick={() =>
                                updateCadence.mutate({
                                  companyId: company.id,
                                  news_monitoring_enabled: !company.news_monitoring_enabled,
                                })
                              }
                            >
                              {company.news_monitoring_enabled ? (
                                <>
                                  <Pause data-icon="inline-start" />
                                  Pause
                                </>
                              ) : (
                                <>
                                  <Play data-icon="inline-start" />
                                  Resume
                                </>
                              )}
                            </Button>
                          </div>
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
