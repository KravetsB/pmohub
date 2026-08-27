import { useQuery } from '@tanstack/react-query';
import { apiRequest, loadBootstrap, loadInitiativeCardModel, loadInitiativeYearModel, loadInitiativeYears, loadQuarterCards } from './apiClient';
import { queryKeys } from './queryClient';

export const useBootstrapQuery = (enabled: boolean) => useQuery({
  queryKey: queryKeys.bootstrap,
  queryFn: ({ signal }) => loadBootstrap(signal),
  enabled,
  staleTime: 30_000,
});

export const useInitiativeYearsQuery = (kind: 'project' | 'task', enabled = true) => useQuery({
  queryKey: queryKeys.initiativeYears(kind),
  queryFn: ({ signal }) => loadInitiativeYears(kind, signal),
  enabled,
});
export const useQuarterCardsQuery = (kind: 'project' | 'task', enabled = true) => useQuery({
  queryKey: queryKeys.portfolioCards(kind),
  queryFn: ({ signal }) => loadQuarterCards(kind, signal),
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
  queryFn: ({ signal }) => apiRequest<Array<{ id: string; date: string; author: string; action: string; code: string }>>(`/audit/${aggregateType}/${aggregateId}`, { signal }),
  enabled: Boolean(aggregateType && aggregateId),
});
