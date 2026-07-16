import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/services/apiClient";
import type { AuditLog } from "@/types/models";

export function useAuditLogs() {
  return useQuery({
    queryKey: ["audit-logs"],
    queryFn: async () => {
      const { data } = await apiClient.get<AuditLog[]>("/audit/logs");
      return data;
    },
  });
}
