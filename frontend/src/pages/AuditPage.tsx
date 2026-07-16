import { useMemo } from "react";
import { ScrollText } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
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
import { useAuditLogs } from "@/hooks/useAuditLogs";
import { useLocalAudit } from "@/lib/auditLog";

export function AuditPage() {
  const { data: backendLogs, isLoading } = useAuditLogs();
  const localLogs = useLocalAudit();

  // Merge platform (backend) entries with locally recorded user actions,
  // newest first. Entries are append-only — nothing here can delete them.
  const logs = useMemo(() => {
    const merged = [...(backendLogs ?? []), ...localLogs];
    return merged.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }, [backendLogs, localLogs]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Trail"
        description="Immutable, timestamped log of every action. Entries cannot be edited or deleted."
      />

      <Card>
        <CardContent className="px-0">
          {isLoading && logs.length === 0 ? (
            <div className="space-y-3 px-4 py-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <EmptyState
              icon={ScrollText}
              title="No audit entries yet"
              description="Actions taken by users and agents will be recorded here."
            />
          ) : (
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
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium text-foreground">{log.actor}</TableCell>
                    <TableCell className="capitalize text-muted-foreground">
                      {log.action.replace(/_/g, " ")}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {log.resource_type}
                      {log.resource_id ? (
                        <span className="text-xs"> · {log.resource_id.slice(0, 8)}</span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {new Date(log.created_at).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "medium",
                      })}
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
