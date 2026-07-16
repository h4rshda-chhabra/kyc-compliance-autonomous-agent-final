import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { RiskLevel } from "@/types/models";

// Backend statuses are free-form strings; badges style the known values and
// fall back to a neutral outline for anything unexpected.

const neutral = "bg-muted text-muted-foreground border-border";
const emerald =
  "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20";
const amber =
  "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20";
const orange =
  "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20";
const red =
  "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20";
const blue =
  "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20";

function StatusBadge({
  value,
  styles,
}: {
  value: string;
  styles: Record<string, string>;
}) {
  return (
    <Badge variant="outline" className={cn("capitalize", styles[value] ?? neutral)}>
      {value.replace(/_/g, " ")}
    </Badge>
  );
}

const riskStyles: Record<RiskLevel, string> = {
  unknown: neutral,
  low: emerald,
  medium: amber,
  high: orange,
  critical: red,
};

export function RiskBadge({ level }: { level: RiskLevel }) {
  return <StatusBadge value={level} styles={riskStyles} />;
}

const companyStatusStyles: Record<string, string> = {
  onboarding: blue,
  not_monitored: neutral,
  monitored: emerald,
  active: emerald,
  paused: neutral,
  inactive: neutral,
  review: amber,
  under_review: amber,
  escalated: red,
  flagged: red,
};

export function CompanyStatusBadge({ status }: { status: string }) {
  return <StatusBadge value={status} styles={companyStatusStyles} />;
}

const runStatusStyles: Record<string, string> = {
  queued: neutral,
  pending: neutral,
  running: blue,
  completed: emerald,
  failed: red,
};

export function RunStatusBadge({ status }: { status: string }) {
  return <StatusBadge value={status} styles={runStatusStyles} />;
}

const sarStatusStyles: Record<string, string> = {
  draft: amber,
  pending_review: amber,
  pending_admin_review: blue,
  deactivation_approved: red,
  closed: neutral,
  archived: neutral,
  approved: emerald,
  rejected: red,
  filed: emerald,
  reviewed: emerald,
};

export function SarStatusBadge({ status }: { status: string }) {
  return <StatusBadge value={status} styles={sarStatusStyles} />;
}

const decisionStyles: Record<string, string> = {
  pending: neutral,
  approved: emerald,
  rejected: red,
  escalated: orange,
};

export function ReviewDecisionBadge({ decision }: { decision: string }) {
  return <StatusBadge value={decision} styles={decisionStyles} />;
}

export function CompanyActiveBadge({ isActive }: { isActive: boolean }) {
  return (
    <Badge
      variant="outline"
      className={cn(isActive ? emerald : neutral)}
    >
      {isActive ? "Active" : "Deactivated"}
    </Badge>
  );
}
