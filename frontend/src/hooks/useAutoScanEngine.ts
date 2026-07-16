import { useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  invalidateScanData,
  scanAllCompanies,
  useAutoScanSettings,
  type ScannableCompany,
} from "@/lib/autoScan";
import { useCompanies } from "@/hooks/useCompanies";
import type { Company } from "@/types/models";

/**
 * Drives continuous scanning. Mounted once in AppLayout so the interval keeps
 * firing no matter which page the officer is on. Every `intervalMinutes` it
 * scans every company actually under monitoring (the real "monitored" scope
 * from the backend) and raises alerts for high-risk scores.
 */
export function useAutoScanEngine() {
  const settings = useAutoScanSettings();
  const { data: monitored } = useCompanies(undefined, "active", "monitored");
  const queryClient = useQueryClient();

  const companies = useMemo<ScannableCompany[]>(
    () => (monitored ?? []).map((c: Company) => ({ companyId: c.id, legalName: c.legal_name ?? c.id })),
    [monitored],
  );

  useEffect(() => {
    if (!settings.enabled || companies.length === 0) return;
    const ms = Math.max(1, settings.intervalMinutes) * 60_000;
    const timer = setInterval(() => {
      void scanAllCompanies(companies, "auto").then(() =>
        invalidateScanData(queryClient),
      );
    }, ms);
    return () => clearInterval(timer);
  }, [settings.enabled, settings.intervalMinutes, companies, queryClient]);
}
