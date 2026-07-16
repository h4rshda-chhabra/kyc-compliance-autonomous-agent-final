import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, FileText } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCompany } from "@/hooks/useCompanies";

interface Evidence {
  id: string;
  type: "document" | "media" | "sanction" | "transaction";
  title: string;
  source: string;
  severity: "high" | "medium" | "low";
  status: "verified" | "pending" | "dismissed";
  date: string;
  description: string;
}

export function EvidencePage() {
  const { id } = useParams();
  const { data: company } = useCompany(id);

  const mockEvidence: Evidence[] = useMemo(
    () => [
      {
        id: "ev-001",
        type: "media",
        title: "Adverse Media: Regulatory Investigation",
        source: "Financial Times",
        severity: "high",
        status: "verified",
        date: "2026-06-15",
        description:
          "News article reporting regulatory investigation into company practices",
      },
      {
        id: "ev-002",
        type: "sanction",
        title: "Sanction List Match",
        source: "OFAC SDN List",
        severity: "high",
        status: "verified",
        date: "2026-06-10",
        description: "Entity appears on OFAC Specially Designated Nationals list",
      },
      {
        id: "ev-003",
        type: "transaction",
        title: "High-Value Transaction Alert",
        source: "Transaction Monitoring",
        severity: "medium",
        status: "pending",
        date: "2026-06-20",
        description:
          "Transaction exceeds risk threshold; awaiting compliance review",
      },
      {
        id: "ev-004",
        type: "document",
        title: "UBO Documentation Review",
        source: "Internal Verification",
        severity: "low",
        status: "verified",
        date: "2026-06-01",
        description: "Ultimate beneficial owner documentation verified",
      },
    ],
    []
  );

  const stats = useMemo(() => {
    return {
      total: mockEvidence.length,
      verified: mockEvidence.filter((e) => e.status === "verified").length,
      pending: mockEvidence.filter((e) => e.status === "pending").length,
      highSeverity: mockEvidence.filter((e) => e.severity === "high").length,
    };
  }, [mockEvidence]);

  const getSeverityColor = (severity: Evidence["severity"]) => {
    switch (severity) {
      case "high":
        return "text-destructive";
      case "medium":
        return "text-yellow-500";
      case "low":
        return "text-primary";
    }
  };

  const getStatusBadge = (status: Evidence["status"]) => {
    switch (status) {
      case "verified":
        return "default";
      case "pending":
        return "secondary";
      case "dismissed":
        return "outline";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to={company ? `/companies/${id}` : "/monitoring"}>
          <Button variant="ghost" size="sm" className="cursor-pointer">
            <ArrowLeft className="mr-2 size-4" />
            Back
          </Button>
        </Link>
      </div>

      <PageHeader
        title="Evidence Review"
        description={`${stats.total} evidence items found • ${stats.highSeverity} high severity`}
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Total Evidence
              </p>
              <p className="text-3xl font-bold tabular-nums">{stats.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Verified
              </p>
              <p className="text-3xl font-bold tabular-nums text-primary">
                {stats.verified}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Pending Review
              </p>
              <p className="text-3xl font-bold tabular-nums text-yellow-500">
                {stats.pending}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                High Severity
              </p>
              <p className="text-3xl font-bold tabular-nums text-destructive">
                {stats.highSeverity}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Evidence table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Evidence Items</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Evidence</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockEvidence.map((evidence) => (
                  <TableRow
                    key={evidence.id}
                    className="transition-colors hover:bg-muted/40"
                  >
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <FileText className="size-4 text-muted-foreground" />
                          <span className="font-medium">{evidence.title}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {evidence.description}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {evidence.source}
                    </TableCell>
                    <TableCell>
                      <span className={`text-sm font-medium ${getSeverityColor(evidence.severity)}`}>
                        {evidence.severity.charAt(0).toUpperCase() +
                          evidence.severity.slice(1)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadge(evidence.status)}>
                        {evidence.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(evidence.date).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
