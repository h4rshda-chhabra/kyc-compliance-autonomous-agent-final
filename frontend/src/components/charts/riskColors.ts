import type { RiskLevel } from "@/types/models";

/** CSS-variable-backed status colors — resolve per theme (see index.css). */
export const riskVar: Record<RiskLevel, string> = {
  unknown: "var(--muted-foreground)",
  low: "var(--risk-low)",
  medium: "var(--risk-medium)",
  high: "var(--risk-high)",
  critical: "var(--risk-critical)",
};
