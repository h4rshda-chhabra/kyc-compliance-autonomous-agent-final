import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/services/apiClient";
import type { Evidence, RiskReport, TimelineEvent } from "@/types/models";

export function useCompanyRiskReport(companyId: string | undefined) {
  return useQuery({
    queryKey: ["companies", companyId, "risk-report"],
    queryFn: async () => {
      const { data } = await apiClient.get<RiskReport>(
        `/reports/companies/${companyId}/risk`
      );
      return data;
    },
    enabled: Boolean(companyId),
  });
}

export function useCompanyTimeline(companyId: string | undefined) {
  return useQuery({
    queryKey: ["companies", companyId, "timeline"],
    queryFn: async () => {
      const { data } = await apiClient.get<TimelineEvent[]>(
        `/reports/companies/${companyId}/timeline`
      );
      return data;
    },
    enabled: Boolean(companyId),
  });
}

export function useCompanyEvidence(companyId: string | undefined) {
  return useQuery({
    queryKey: ["companies", companyId, "evidence"],
    queryFn: async () => {
      const { data } = await apiClient.get<Evidence[]>(
        `/reports/companies/${companyId}/evidence`
      );
      return data;
    },
    enabled: Boolean(companyId),
  });
}
