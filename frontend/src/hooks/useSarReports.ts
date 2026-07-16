import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/apiClient";
import type { SARReport } from "@/types/models";

export function useSarReports() {
  return useQuery({
    queryKey: ["sar-reports"],
    queryFn: async () => {
      const { data } = await apiClient.get<SARReport[]>("/review/sar");
      return data;
    },
  });
}

export function useSarReport(id: string | undefined) {
  return useQuery({
    queryKey: ["sar-reports", id],
    queryFn: async () => {
      const { data } = await apiClient.get<SARReport>(`/review/sar/${id}`);
      return data;
    },
    enabled: Boolean(id),
  });
}

/** SARs in status "draft" — awaiting compliance officer review.
 *  `enabled` defaults to true, but callers should pass false when the current
 *  user definitely isn't a compliance officer — this endpoint 403s for
 *  anyone else, and firing it unconditionally for e.g. an admin wastes a
 *  request that can only ever fail. */
export function useComplianceQueue(enabled = true) {
  return useQuery({
    queryKey: ["sar-reports", "queue", "compliance"],
    queryFn: async () => {
      const { data } = await apiClient.get<SARReport[]>("/review/queue/compliance");
      return data;
    },
    enabled,
  });
}

/** SARs in status "pending_admin_review" — an officer has already recommended
 *  deactivation; only an admin's decision is outstanding. Same `enabled`
 *  caveat as useComplianceQueue, mirrored for the admin-only endpoint. */
export function useAdminQueue(enabled = true) {
  return useQuery({
    queryKey: ["sar-reports", "queue", "admin"],
    queryFn: async () => {
      const { data } = await apiClient.get<SARReport[]>("/review/queue/admin");
      return data;
    },
    enabled,
  });
}

function useReviewAction(action: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, remarks }: { id: string; remarks?: string }) => {
      const { data } = await apiClient.post<SARReport>(`/review/sar/${id}/${action}`, { remarks });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sar-reports"] });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
  });
}

/** Compliance officer: recommend the company be deactivated. */
export function useRecommendDeactivation() {
  return useReviewAction("recommend-deactivation");
}

/** Compliance officer: reject — no basis for deactivation, keep monitoring. */
export function useRejectByOfficer() {
  return useReviewAction("reject");
}

/** Admin: approve a compliance officer's deactivation recommendation. */
export function useApproveDeactivation() {
  return useReviewAction("approve-deactivation");
}

/** Admin: reject a compliance officer's deactivation recommendation. */
export function useRejectByAdmin() {
  return useReviewAction("reject-recommendation");
}
