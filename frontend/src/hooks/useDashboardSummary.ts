import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/services/apiClient";
import type { DashboardSummary } from "@/types/models";

export function useDashboardSummary() {
  return useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: async () => {
      const { data } = await apiClient.get<DashboardSummary>("/dashboard/summary");
      return data;
    },
  });
}
