import { QueryClient } from "@tanstack/react-query";

export const queryKeys = {
  bootstrap: ["bootstrap"] as const,
  initiativeYears: (kind: "project" | "task", year?: number) => ["initiative-years", kind, year ?? "all"] as const,
  portfolioCards: (kind: "project" | "task", year?: number, quarter?: string, view: "detail" | "analytics" = "detail") => ["quarter-cards", kind, year ?? "all", quarter ?? "all", view] as const,
  initiativeCard: (id: string) => ["quarter-cards", "detail", id] as const,
  initiativeYear: (id: string) => ["initiative-years", "detail", id] as const,
  audit: (aggregateType: string, aggregateId: string) => ["audit", aggregateType, aggregateId] as const,
  users: ["reference-data", "users"] as const,
  permissions: ["reference-data", "permissions"] as const,
  customFields: ["reference-data", "custom-fields"] as const,
  analytics: (mode: "quarterly" | "annual", params: string) => ["analytics", mode, params] as const,
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: { retry: false },
  },
});
