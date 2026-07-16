import { useMutation, useQuery } from "@tanstack/react-query";
import { apiClient, TOKEN_KEY } from "@/services/apiClient";
import type { LoginResponse, User } from "@/types/models";

export function useLogin() {
  return useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const { data } = await apiClient.post<LoginResponse>(
        "/auth/login",
        credentials
      );
      localStorage.setItem(TOKEN_KEY, data.access_token);
      return data;
    },
  });
}

export function useLogout() {
  return useMutation({
    mutationFn: async () => {
      await apiClient.post("/auth/logout");
      localStorage.removeItem(TOKEN_KEY);
    },
  });
}

export function useCurrentUser() {
  return useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      const { data } = await apiClient.get<User>("/auth/me");
      return data;
    },
  });
}
