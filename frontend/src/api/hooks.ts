import { useQuery } from '@tanstack/react-query';
import { ApiResponse, apiRequest, loadBootstrap, loadInitiativeCardModel, loadInitiativeYearModel, loadInitiativeYears, loadPermissions, loadQuarterCards, loadUsers } from './apiClient';
import { queryKeys } from './queryClient';

export const useBootstrapQuery = (enabled: boolean) => useQuery({
  queryKey: queryKeys.bootstrap,
  queryFn: ({ signal }) => loadBootstrap(signal),
  enabled,
  staleTime: 30_000,
});

export const useInitiativeYearsQuery = (kind: 'project' | 'task', enabled = true, year?: number) => useQuery({
  queryKey: queryKeys.initiativeYears(kind, year),
  queryFn: ({ signal }) => loadInitiativeYears(kind, signal, year),
  enabled,
});
export const useQuarterCardsQuery = (kind: 'project' | 'task', enabled = true, year?: number, quarter?: string, view?: 'analytics') => useQuery({
  queryKey: queryKeys.portfolioCards(kind, year, quarter, view ?? 'detail'),
  queryFn: ({ signal }) => loadQuarterCards(kind, signal, year, quarter, view),
  enabled,
});
export const useQuarterCardDetailQuery = (id?: string) => useQuery({
  queryKey: queryKeys.initiativeCard(id ?? ''),
  queryFn: ({ signal }) => loadInitiativeCardModel(id!, signal).then((response) => response.data),
  enabled: Boolean(id),
});
export const useInitiativeYearQuery = (id?: string) => useQuery({ queryKey: queryKeys.initiativeYear(id ?? ''), queryFn: ({ signal }) => loadInitiativeYearModel(id!, signal).then((response) => response.data), enabled: Boolean(id) });
export const useAuditQuery = (aggregateType?: string, aggregateId?: string) => useQuery({
  queryKey: queryKeys.audit(aggregateType ?? '', aggregateId ?? ''),
  queryFn: ({ signal }) => apiRequest<ApiResponse<Array<{ id: string; date: string; author: string; action: string; code: string }>>>(`/audit/${aggregateType}/${aggregateId}`, { signal }).then((response) => response.data),
  enabled: Boolean(aggregateType && aggregateId),
});
export const useUsersQuery = (enabled = false) => useQuery({
  queryKey: queryKeys.users,
  queryFn: ({ signal }) => loadUsers(signal),
  enabled,
});
export const usePermissionsQuery = (enabled = false) => useQuery({
  queryKey: queryKeys.permissions,
  queryFn: ({ signal }) => loadPermissions(signal),
  enabled,
});
