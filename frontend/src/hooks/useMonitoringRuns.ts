import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/apiClient";
import type { MonitoringRun } from "@/types/models";

export function useMonitoringRuns(companyId?: string) {
  return useQuery({
    queryKey: ["monitoring-runs", { companyId: companyId ?? "" }],
    queryFn: async () => {
      const { data } = await apiClient.get<MonitoringRun[]>("/monitor/runs", {
        params: companyId ? { company_id: companyId } : undefined,
      });
      return data;
    },
  });
}

export function useMonitoringRun(id: string | undefined) {
  return useQuery({
    queryKey: ["monitoring-runs", id],
    queryFn: async () => {
      const { data } = await apiClient.get<MonitoringRun>(`/monitor/runs/${id}`);
      return data;
    },
    enabled: Boolean(id),
  });
}

export function useTriggerMonitoringRun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (companyId: string) => {
      const { data } = await apiClient.post<MonitoringRun>(
        `/monitor/companies/${companyId}/trigger`
      );
      return data;
    },
    onSuccess: () => {
      // A scan touches the company row, its risk/evidence reports, possibly
      // drafts a SAR, and writes audit entries — refresh all of it.
      queryClient.invalidateQueries({ queryKey: ["monitoring-runs"] });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      queryClient.invalidateQueries({ queryKey: ["sar-reports"] });
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
  });
}

export interface WatchlistSimulateResult {
  success: boolean;
  entities_inserted: number;
  affected_companies: number;
  affected_company_ids: string[];
}

export function useOnboardCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (companyId: string) => {
      const { data } = await apiClient.post(
        `/monitor/companies/${companyId}/onboard`
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
  });
}

export function useSimulateWatchlistUpdate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post<WatchlistSimulateResult>("/monitor/watchlist/simulate");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["monitoring-runs"] });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      queryClient.invalidateQueries({ queryKey: ["sar-reports"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
  });
}
