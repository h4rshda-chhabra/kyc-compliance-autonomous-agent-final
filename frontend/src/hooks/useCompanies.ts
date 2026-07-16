import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/apiClient";
import type { Company } from "@/types/models";

export type CompanyStatusFilter = "active" | "inactive" | "all";
export type CompanyScope = "directory" | "monitored";

/** Companies directory, served straight from the sanctions dataset on the
 *  backend. Pass `search` to query the full dataset server-side.
 *  `status` defaults to "active" (matches the backend default) — pass "all"
 *  when resolving company names for historical records (e.g. past
 *  monitoring runs) that may reference a now-deactivated company.
 *  `scope` defaults to "directory" (scanned companies + the rest of the
 *  sanctions directory, for browsing/onboarding); pass "monitored" for the
 *  compliance officer's focused view of companies actually under monitoring. */
export function useCompanies(
  search?: string,
  status: CompanyStatusFilter = "active",
  scope: CompanyScope = "directory"
) {
  const q = search?.trim() || undefined;
  return useQuery({
    queryKey: ["companies", { q: q ?? "", status, scope }],
    queryFn: async () => {
      const { data } = await apiClient.get<Company[]>("/companies", {
        params: { ...(q ? { q } : {}), status, scope },
      });
      return data;
    },
  });
}

export function useCompany(id: string | undefined) {
  return useQuery({
    queryKey: ["companies", id],
    queryFn: async () => {
      const { data } = await apiClient.get<Company>(`/companies/${id}`);
      return data;
    },
    enabled: Boolean(id),
  });
}

export function useCreateCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (company: { legal_name: string; jurisdiction?: string; industry?: string }) => {
      const { data } = await apiClient.post<Company>("/companies", company);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
  });
}

/** Toggles automated monitoring on/off. The interval itself isn't settable
 *  here — it's derived automatically from risk level (see CompanyDetailPage's
 *  cadence note). */
export function useUpdateCompanyCadence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      companyId,
      news_monitoring_enabled,
    }: {
      companyId: string;
      news_monitoring_enabled?: boolean;
    }) => {
      const { data } = await apiClient.patch<Company>(`/companies/${companyId}/cadence`, {
        news_monitoring_enabled,
      });
      return data;
    },
    onSuccess: (data: Company) => {
      queryClient.invalidateQueries({ queryKey: ["companies", data.id] });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
  });
}

