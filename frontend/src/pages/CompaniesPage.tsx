import { useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
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
import { CompanyActiveBadge, CompanyStatusBadge } from "@/components/status-badges";
import { useCompanies } from "@/hooks/useCompanies";
import type { Company } from "@/types/models";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function CompaniesPage() {
  const [search, setSearch] = useState("");
  const { data: companies } = useCompanies(search, "active", "monitored");

  const list = companies ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Companies"
        description={`${list.length} compan${list.length === 1 ? "y" : "ies"} under continuous monitoring.`}
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

      <Card>
        <CardContent className="px-0">
          {list.length === 0 ? (
            <EmptyState
              title="No companies onboarded yet"
              description="Head to Onboarding to add companies from the sanctions dataset."
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Legal name</TableHead>
                    <TableHead>Jurisdiction</TableHead>
                    <TableHead>Onboarded</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.map((entry: Company) => (
                      <TableRow
                        key={entry.id}
                        className="transition-colors hover:bg-muted/40"
                      >
                        <TableCell className="max-w-xs truncate font-medium text-foreground">
                          <Link
                            to={`/companies/${entry.id}`}
                            className="block truncate underline-offset-4 hover:underline"
                          >
                            {entry.legal_name}
                          </Link>
                        </TableCell>
                        <TableCell className="max-w-40 truncate font-mono text-xs uppercase text-muted-foreground">
                          {entry.jurisdiction || "—"}
                        </TableCell>
                        <TableCell className="tabular-nums text-muted-foreground">
                          {entry.onboarded_at ? formatDate(entry.onboarded_at) : "—"}
                        </TableCell>
                        <TableCell className="space-x-1.5">
                          <CompanyStatusBadge status={entry.monitoring_status} />
                          <CompanyActiveBadge isActive={entry.is_active} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Link to={`/companies/${entry.id}`} className="text-sm text-muted-foreground hover:text-foreground">
                              View details
                            </Link>
                          </div>
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
