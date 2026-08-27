import React, { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ReferenceDataState, CustomFieldDef, Department, InitiativeMetadata, InitiativeYearReadModel, QuarterCardReadModel,
  InitiativeSizeDef, InitiativeStatusDef, Manager, MutationResult, OperationalTask,
  PriorityDef, Project, Quarter, RolePermissions,
  TaskWeightDef, User,
} from "../../shared/types";
import {
  ApiError, changePassword as changeApiPassword, loadBootstrap, loadInitiativeCardModel, loadInitiativeYears, loadQuarterCards,
  loginSession, logoutSession, refreshSession, setAuthFailureHandler, toInitiativeYearViewModel, toQuarterCardViewModel,
} from "../../api/apiClient";
import { queryKeys } from "../../api/queryClient";
import { useBootstrapQuery, useInitiativeYearsQuery, useQuarterCardsQuery } from "../../api/hooks";
import { getChainId, getYearSnapshot, preparationMetadataFrom } from "../../domain/initiatives";
import { getPermissions } from "../../domain/permissions";
import { executeBackendMutation } from "./backend-mutation";
import { dictionaryApiType, dictionaryPayload, DictionaryItem, DictionaryStateKey } from "./dictionary-api";
import { fail, ok } from "./helpers";
import { serverCommands } from "./server-commands";
import { uuidOrUndefined } from "./api-contract-mappers";

type Initiative = Project | OperationalTask;
type InitiativeKind = "project" | "task";

export interface AppContextType extends ReferenceDataState {
  isHydrating: boolean;
  backendEnabled: true;
  authenticate: (email: string, password: string) => Promise<MutationResult>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<MutationResult>;
  login: (user: User) => MutationResult;
  logout: () => void;
  addUser: (user: User) => Promise<MutationResult<{ temporary_password: string }>>;
  updateUser: (id: string, patch: Partial<User>) => Promise<MutationResult>;
  deleteUser: (id: string) => Promise<MutationResult>;
  resetUserPassword: (id: string) => Promise<MutationResult<{ temporary_password: string }>>;
  addProject: (item: Project) => Promise<MutationResult>;
  updateProject: (id: string, patch: Partial<Project>) => Promise<MutationResult>;
  deleteProject: (id: string) => Promise<MutationResult>;
  addTask: (item: OperationalTask) => Promise<MutationResult>;
  updateTask: (id: string, patch: Partial<OperationalTask>) => Promise<MutationResult>;
  deleteTask: (id: string) => Promise<MutationResult>;
  moveCard: (cardId: string, toYear: number, toQuarter: Quarter, isProject: boolean) => Promise<MutationResult>;
  continueCard: (cardId: string, toYear: number, toQuarter: Quarter, isProject: boolean) => Promise<MutationResult>;
  moveScopeItem: (cardId: string, itemId: string, toYear: number, toQuarter: Quarter, isProject: boolean) => Promise<MutationResult>;
  copyScopeItem: (cardId: string, itemId: string, toYear: number, toQuarter: Quarter, isProject: boolean) => Promise<MutationResult>;
  createBacklogSnapshot: (kind: InitiativeKind, masterId: string, sourceYear: number, targetYear: number) => Promise<MutationResult>;
  createBacklogSnapshots: (kind: InitiativeKind, masterIds: string[], sourceYear: number, targetYear: number) => Promise<MutationResult<{ created: number }>>;
  createBacklogWithCards: (kind: InitiativeKind, master: Project | OperationalTask, quarters: Quarter[], initialScope?: Project["checklist"]) => Promise<MutationResult>;
  updatePreparationStage: (kind: InitiativeKind, masterId: string, patch: Partial<InitiativeMetadata>) => Promise<MutationResult>;
  addPriority: (item: PriorityDef) => Promise<MutationResult>;
  updatePriority: (id: string, patch: Partial<PriorityDef>) => Promise<MutationResult>;
  deletePriority: (id: string) => Promise<MutationResult>;
  addInitiativeStatus: (item: InitiativeStatusDef) => Promise<MutationResult>;
  updateInitiativeStatus: (id: string, patch: Partial<InitiativeStatusDef>) => Promise<MutationResult>;
  deleteInitiativeStatus: (id: string) => Promise<MutationResult>;
  addTaskWeight: (item: TaskWeightDef) => Promise<MutationResult>;
  updateTaskWeight: (id: string, patch: Partial<TaskWeightDef>) => Promise<MutationResult>;
  deleteTaskWeight: (id: string) => Promise<MutationResult>;
  addInitiativeSize: (item: InitiativeSizeDef) => Promise<MutationResult>;
  updateInitiativeSize: (id: string, patch: Partial<InitiativeSizeDef>) => Promise<MutationResult>;
  deleteInitiativeSize: (id: string) => Promise<MutationResult>;
  addDepartment: (item: Department) => Promise<MutationResult>;
  updateDepartment: (id: string, patch: Partial<Department>) => Promise<MutationResult>;
  deleteDepartment: (id: string) => Promise<MutationResult>;
  addManager: (item: Manager) => Promise<MutationResult>;
  updateManager: (id: string, patch: Partial<Manager>) => Promise<MutationResult>;
  deleteManager: (id: string) => Promise<MutationResult>;
  checkDepartmentDeletion: (id: string) => MutationResult;
  checkManagerDeletion: (id: string) => MutationResult;
  checkPriorityDeletion: (id: string) => MutationResult;
  checkInitiativeStatusDeletion: (id: string) => MutationResult;
  updateRolePermission: (role: string, patch: Partial<RolePermissions>) => Promise<MutationResult>;
  applyTaskWeightToOpenCards: (id: string) => Promise<MutationResult<{ cards: number; tasks: number }>>;
  refreshOpenInitiativeSizes: () => Promise<MutationResult<{ cards: number }>>;
  addCustomField: (item: CustomFieldDef) => Promise<MutationResult>;
  updateCustomField: (id: string, patch: Partial<CustomFieldDef>) => Promise<MutationResult>;
  deleteCustomField: (id: string) => Promise<MutationResult>;
}

type CommandResponse<T = undefined> = { success?: boolean; message?: string; data?: T };
const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const queryClient = useQueryClient();
  const [sessionReady, setSessionReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const bootstrapQuery = useBootstrapQuery(authenticated);
  const projectYearsQuery = useInitiativeYearsQuery("project", authenticated);
  const taskYearsQuery = useInitiativeYearsQuery("task", authenticated);
  const projectCardsQuery = useQuarterCardsQuery("project", authenticated);
  const taskCardsQuery = useQuarterCardsQuery("task", authenticated);
  const reload = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.bootstrap }),
      queryClient.invalidateQueries({ queryKey: queryKeys.initiativeYears("project") }),
      queryClient.invalidateQueries({ queryKey: queryKeys.initiativeYears("task") }),
      queryClient.invalidateQueries({ queryKey: queryKeys.portfolioCards("project") }),
      queryClient.invalidateQueries({ queryKey: queryKeys.portfolioCards("task") }),
    ]);
    await Promise.all([
      queryClient.fetchQuery({ queryKey: queryKeys.bootstrap, queryFn: ({ signal }) => loadBootstrap(signal), staleTime: 0 }),
      queryClient.fetchQuery({ queryKey: queryKeys.initiativeYears("project"), queryFn: ({ signal }) => loadInitiativeYears("project", signal), staleTime: 0 }),
      queryClient.fetchQuery({ queryKey: queryKeys.initiativeYears("task"), queryFn: ({ signal }) => loadInitiativeYears("task", signal), staleTime: 0 }),
      queryClient.fetchQuery({ queryKey: queryKeys.portfolioCards("project"), queryFn: ({ signal }) => loadQuarterCards("project", signal), staleTime: 0 }),
      queryClient.fetchQuery({ queryKey: queryKeys.portfolioCards("task"), queryFn: ({ signal }) => loadQuarterCards("task", signal), staleTime: 0 }),
    ]);
  }, [queryClient]);
  const executeRemote = useCallback(<T,>(request: () => Promise<CommandResponse<T>>, refresh: () => Promise<void> = async () => { await reload(); }) =>
    executeBackendMutation<T>(request, refresh),
  [reload]);

  useEffect(() => {
    setAuthFailureHandler(() => { setAuthenticated(false); queryClient.clear(); });
    refreshSession().then(async () => { setAuthenticated(true); await reload(); })
      .catch(() => setAuthenticated(false)).finally(() => setSessionReady(true));
    return () => setAuthFailureHandler(null);
  }, [reload]);

  const bootstrap = bootstrapQuery.data ?? queryClient.getQueryData<Partial<ReferenceDataState>>(queryKeys.bootstrap);
  const state: ReferenceDataState = {
    departments: bootstrap?.departments ?? [],
    priorities: bootstrap?.priorities ?? [],
    initiativeStatuses: bootstrap?.initiativeStatuses ?? [],
    taskWeights: bootstrap?.taskWeights ?? [],
    initiativeSizes: bootstrap?.initiativeSizes ?? [],
    managers: bootstrap?.managers ?? [],
    users: bootstrap?.users ?? [],
    rolePermissions: bootstrap?.rolePermissions ?? [],
    customFields: bootstrap?.customFields ?? [],
    currentUser: bootstrap?.currentUser ?? null,
    projects: [
      ...(projectYearsQuery.data ?? []).map(toInitiativeYearViewModel),
      ...(projectCardsQuery.data ?? []).map(toQuarterCardViewModel),
    ],
    tasks: [
      ...(taskYearsQuery.data ?? []).map(toInitiativeYearViewModel),
      ...(taskCardsQuery.data ?? []).map(toQuarterCardViewModel),
    ],
  };
  const recordsFor = (kind: InitiativeKind): Initiative[] => kind === "project" ? state.projects : state.tasks;
  const wireKind = (kind: InitiativeKind) => kind === "project" ? "PROJECT" as const : "OPERATIONAL_TASK" as const;
  const createBody = (kind: InitiativeKind, raw: Initiative) => ({
    kind: wireKind(kind),
    name: raw.name.trim(),
    year: raw.year,
    strategic_goal: raw.strategic_goal,
    preparation: {
      manager_id: uuidOrUndefined(raw.manager_id),
      priority_id: uuidOrUndefined(raw.priority),
      department_ids: raw.cross_functional_dept_ids.filter((id) => uuidOrUndefined(id)),
    },
  });
  const cardBody = (record: Initiative, revision = record.revision) => {
    const statusId = healthStatusId(record.health_status, record);
    if (!revision || !statusId) return null;
    const fallbackWeightId = state.taskWeights.find((weight) => weight.is_active && weight.weight === 0)?.id;
    const scope = record.checklist.map((item) => ({
      ...(uuidOrUndefined(item.id) ? { id: uuidOrUndefined(item.id) } : {}),
      ...(uuidOrUndefined(item.id) && item.revision ? { revision: item.revision } : {}),
      text: item.text,
      status_code: (item.color === "GRAY" ? "DEFAULT" : (item.color ?? (item.is_completed ? "GREEN" : "DEFAULT"))) as "DEFAULT" | "GREEN" | "YELLOW" | "RED",
      weight_definition_id: uuidOrUndefined(item.weightId ?? item.weightSnapshot?.definitionId) ?? fallbackWeightId ?? "",
      executor_department_ids: (item.implementer_dept_ids ?? []).filter((id) => uuidOrUndefined(id)),
    }));
    return {
      revision,
      manager_id: uuidOrUndefined(record.manager_id),
      priority_id: uuidOrUndefined(record.priority),
      department_ids: record.cross_functional_dept_ids.filter((id) => uuidOrUndefined(id)),
      status_id: statusId,
      notes: record.notes,
      custom_fields: record.custom_fields ?? {},
      scope,
    };
  };
  const healthStatusId = (value: string | undefined, record?: Initiative) =>
    uuidOrUndefined(value)
    ?? state.initiativeStatuses.find((status) => status.code === value)?.id
    ?? uuidOrUndefined(record?.health_status_id);
  const hasRevision = (item: Initiative | undefined): item is Initiative & { revision: number } => typeof item?.revision === "number";
  const adminAllowed = () => Boolean(getPermissions(state.currentUser, state.rolePermissions)?.canAccessAdmin);
  const authenticate = async (email: string, password: string): Promise<MutationResult> => {
    try { await loginSession(email, password); setAuthenticated(true); await reload(); return ok("Вхід виконано"); }
    catch (error) { return fail(error instanceof ApiError ? error.message : "Не вдалося підключитися до сервера"); }
  };
  const logout = () => { setAuthenticated(false); void logoutSession().finally(() => queryClient.clear()); };
  const changePassword = async (currentPassword: string, newPassword: string): Promise<MutationResult> => {
    try { await changeApiPassword(currentPassword, newPassword); await reload(); return ok("Пароль успішно змінено"); }
    catch (error) { return fail(error instanceof ApiError ? error.message : "Не вдалося змінити пароль"); }
  };

  const addUser = async (user: User): Promise<MutationResult<{ temporary_password: string }>> => {
    if (!adminAllowed()) return fail("Недостатньо прав");
    const result = await executeRemote<{ user: User; temporary_password: string }>(() => serverCommands.user("POST", undefined, { name: user.name, email: user.email, role: user.role, department_id: user.departmentId }));
    return result.success && result.data ? ok(result.message, { temporary_password: result.data.temporary_password }) : fail(result.message);
  };
  const updateUser = (id: string, patch: Partial<User>) => executeRemote(() => serverCommands.user("PATCH", id, {
    ...(patch.name !== undefined ? { name: patch.name } : {}), ...(patch.email !== undefined ? { email: patch.email } : {}),
    ...(patch.role !== undefined ? { role: patch.role } : {}), ...(patch.departmentId !== undefined ? { department_id: patch.departmentId } : {}),
  }));
  const deleteUser = (id: string) => state.currentUser?.id === id ? Promise.resolve(fail("Не можна видалити активного користувача")) : executeRemote(() => serverCommands.user("DELETE", id));
  const resetUserPassword = async (id: string): Promise<MutationResult<{ temporary_password: string }>> => {
    const result = await executeRemote<{ user: unknown; temporary_password: string }>(() => serverCommands.resetUserPassword(id));
    return result.success && result.data ? ok(result.message, { temporary_password: result.data.temporary_password }) : fail(result.message);
  };

  const addInitiative = (kind: InitiativeKind, raw: Initiative): Promise<MutationResult> => raw.is_backlog
    ? executeRemote(() => serverCommands.createInitiative(createBody(kind, raw)))
    : raw.backlog_id ? executeRemote(() => serverCommands.createCard(raw.backlog_id!, { quarter: raw.quarter }))
    : Promise.resolve(fail("Потрібен валідний master backlog_id"));
  const updateInitiative = <T extends Initiative>(kind: InitiativeKind, id: string, patch: Partial<T>): Promise<MutationResult> => {
    const record = recordsFor(kind).find((item) => item.id === id);
    if (!hasRevision(record)) return Promise.resolve(fail("Запис не знайдено або недоступний для цієї команди"));
    if (record.is_backlog) {
      return (async () => {
        if (!record.initiative_revision) return fail("Відсутня revision кореня ініціативи");
        const rename = await executeRemote(() => serverCommands.updateInitiative(getChainId(record), record.initiative_revision!, patch.name ?? record.name), async () => {});
        if (!rename.success) return rename;
        const goal = await executeRemote(() => serverCommands.updateYear(record.id, record.revision!, patch.strategic_goal ?? record.strategic_goal), async () => {});
        if (!goal.success) return goal;
        await reload();
        return ok("Дані беклогу оновлено");
      })();
    }
    const refreshCard = async () => {
      const response = await loadInitiativeCardModel(id);
      if (!response.data) throw new Error("Канонічну картку не отримано");
      queryClient.setQueryData<QuarterCardReadModel[]>(queryKeys.portfolioCards(kind), (current) => current?.map((item) => item.id === id ? response.data : item));
      queryClient.setQueryData(queryKeys.initiativeCard(id), response.data);
    };
    const updatedRecord = { ...record, ...patch };
    const body = cardBody(updatedRecord, record.revision);
    if (!body || body.scope.some((item) => !item.weight_definition_id)) return Promise.resolve(fail("Для кожного завдання потрібна активна вага"));
    return executeRemote(() => serverCommands.updateCard(id, body), refreshCard);
  };
  const removeInitiative = (kind: InitiativeKind, id: string): Promise<MutationResult> => {
    const record = recordsFor(kind).find((item) => item.id === id);
    return hasRevision(record) ? executeRemote(() => record.is_backlog ? serverCommands.deleteYear(id, record.revision) : serverCommands.deleteCard(id, record.revision)) : Promise.resolve(fail("Запис не знайдено або відсутня revision"));
  };
  const moveCard = (cardId: string, toYear: number, toQuarter: Quarter, isProject: boolean) => { const card = recordsFor(isProject ? "project" : "task").find((item) => item.id === cardId); return card?.revision ? executeRemote(() => serverCommands.moveCard(cardId, card.revision!, toYear, toQuarter)) : Promise.resolve(fail("Картку не знайдено або відсутня revision")); };
  const continueCard = (cardId: string, toYear: number, toQuarter: Quarter, isProject: boolean) => { const card = recordsFor(isProject ? "project" : "task").find((item) => item.id === cardId); return card?.revision ? executeRemote(() => serverCommands.continueCard(cardId, card.revision!, toYear, toQuarter)) : Promise.resolve(fail("Картку не знайдено або відсутня revision")); };
  const moveScopeItem = (cardId: string, itemId: string, toYear: number, toQuarter: Quarter, isProject: boolean) => { const records = recordsFor(isProject ? "project" : "task"); const card = records.find((item) => item.id === cardId); const target = card && records.find((item) => !item.is_backlog && getChainId(item) === getChainId(card) && item.year === toYear && item.quarter === toQuarter); return card?.revision ? executeRemote(() => serverCommands.moveScope(cardId, itemId, card.revision!, toYear, toQuarter, target?.revision)) : Promise.resolve(fail("Картку не знайдено або відсутня revision")); };
  const copyScopeItem = (cardId: string, itemId: string, toYear: number, toQuarter: Quarter, isProject: boolean) => { const records = recordsFor(isProject ? "project" : "task"); const card = records.find((item) => item.id === cardId); const target = card && records.find((item) => !item.is_backlog && getChainId(item) === getChainId(card) && item.year === toYear && item.quarter === toQuarter); return card?.revision ? executeRemote(() => serverCommands.copyScope(cardId, itemId, card.revision!, toYear, toQuarter, target?.revision)) : Promise.resolve(fail("Картку не знайдено або відсутня revision")); };
  const createBacklogSnapshots = (kind: InitiativeKind, masterIds: string[], _sourceYear: number, targetYear: number) => {
    const sources = [...new Set(masterIds)].map((id) => recordsFor(kind).find((item) => item.id === id && item.is_backlog)).filter(hasRevision).map(({ id, revision }) => ({ id, revision }));
    return executeRemote<{ years: unknown[] }>(() => serverCommands.extendYears(sources, targetYear)).then((result) => result.success ? ok(result.message, { created: result.data?.years.length ?? 0 }) : fail<{ created: number }>(result.message));
  };
  const createBacklogSnapshot = async (kind: InitiativeKind, masterId: string, sourceYear: number, targetYear: number): Promise<MutationResult> => {
    const result = await createBacklogSnapshots(kind, [masterId], sourceYear, targetYear); return result.success ? ok("Snapshot створено") : fail(result.message);
  };
  const createBacklogWithCards = async (kind: InitiativeKind, raw: Initiative, quarters: Quarter[], _initialScope: Initiative["checklist"] = []) => {
    const created = await executeRemote<{ year_id: string }>(
      () => serverCommands.createInitiative(createBody(kind, raw)) as Promise<CommandResponse<{ year_id: string }>>,
      async () => {},
    );
    if (!created.success || !created.data?.year_id) return fail(created.message);
    for (const quarter of quarters) {
      const card = await executeRemote(() => serverCommands.createCard(created.data!.year_id, { quarter }), async () => {});
      if (!card.success) {
        await reload();
        return fail(card.message);
      }
    }
    await reload();
    return ok("Запис у беклозі створено");
  };
  const updatePreparationStage = (kind: InitiativeKind, masterId: string, patch: Partial<InitiativeMetadata>) => {
    const master = recordsFor(kind).find((item) => item.is_backlog && item.id === masterId); if (!hasRevision(master)) return Promise.resolve(fail("Річний запис не знайдено або відсутня revision"));
    const stage = getYearSnapshot(master, master.year)?.preparationStage ?? preparationMetadataFrom(master);
    const updatedStage = { ...stage, ...patch };
    return executeRemote(() => serverCommands.updatePreparation(masterId, {
      revision: stage.revision ?? master.revision,
      manager_id: updatedStage.manager_id,
      priority_id: updatedStage.priority,
      department_ids: updatedStage.cross_functional_dept_ids ?? [],
    }));
  };

  const dictionaryOps = <T extends DictionaryItem>(key: DictionaryStateKey) => ({
    add: (item: T) => executeRemote(() => serverCommands.dictionary(dictionaryApiType(key), "POST", undefined, dictionaryPayload(item))),
    update: (id: string, patch: Partial<T>) => { const current = (state[key] as unknown as T[]).find((item) => item.id === id); return current ? executeRemote(() => serverCommands.dictionary(dictionaryApiType(key), "PATCH", id, dictionaryPayload({ ...current, ...patch } as T))) : Promise.resolve(fail("Запис не знайдено")); },
    remove: (id: string) => executeRemote(() => serverCommands.dictionary(dictionaryApiType(key), "DELETE", id)),
  });
  const departments = dictionaryOps<Department>("departments"), managers = dictionaryOps<Manager>("managers"), priorities = dictionaryOps<PriorityDef>("priorities"), statuses = dictionaryOps<InitiativeStatusDef>("initiativeStatuses"), weights = dictionaryOps<TaskWeightDef>("taskWeights"), sizes = dictionaryOps<InitiativeSizeDef>("initiativeSizes");
  const checkDictionary = (key: DictionaryStateKey, id: string): MutationResult => !adminAllowed() ? fail("Недостатньо прав адміністратора") : (state[key] as unknown as Array<{ id: string }>).some((item) => item.id === id) ? ok("Видалення дозволено") : fail("Запис не знайдено");
  const addCustomField = (item: CustomFieldDef) => { const { id: _id, ...body } = item; return executeRemote(() => serverCommands.customField("POST", undefined, body)); };
  const updateCustomField = (id: string, patch: Partial<CustomFieldDef>) => { const current = state.customFields.find((item) => item.id === id); if (!current) return Promise.resolve(fail("Поле не знайдено")); const { id: _id, ...body } = { ...current, ...patch }; return executeRemote(() => serverCommands.customField("PATCH", id, body)); };
  const deleteCustomField = (id: string) => executeRemote(() => serverCommands.customField("DELETE", id));
  const value: AppContextType = {
    ...state, isHydrating: !sessionReady || (authenticated && (bootstrapQuery.isPending || projectYearsQuery.isPending || taskYearsQuery.isPending || projectCardsQuery.isPending || taskCardsQuery.isPending)), backendEnabled: true,
    authenticate, changePassword, login: () => fail("Локальний вхід вимкнено"), logout,
    addUser, updateUser, deleteUser, resetUserPassword,
    addProject: (item) => addInitiative("project", item), updateProject: (id, patch) => updateInitiative("project", id, patch), deleteProject: (id) => removeInitiative("project", id),
    addTask: (item) => addInitiative("task", item), updateTask: (id, patch) => updateInitiative("task", id, patch), deleteTask: (id) => removeInitiative("task", id),
    moveCard, continueCard, moveScopeItem, copyScopeItem, createBacklogSnapshot, createBacklogSnapshots, createBacklogWithCards, updatePreparationStage,
    addPriority: priorities.add, updatePriority: priorities.update, deletePriority: priorities.remove,
    addInitiativeStatus: statuses.add, updateInitiativeStatus: statuses.update, deleteInitiativeStatus: statuses.remove,
    addTaskWeight: weights.add, updateTaskWeight: weights.update, deleteTaskWeight: weights.remove,
    addInitiativeSize: sizes.add, updateInitiativeSize: sizes.update, deleteInitiativeSize: sizes.remove,
    addDepartment: departments.add, updateDepartment: departments.update, deleteDepartment: departments.remove,
    addManager: managers.add, updateManager: managers.update, deleteManager: managers.remove,
    checkDepartmentDeletion: (id) => checkDictionary("departments", id), checkManagerDeletion: (id) => checkDictionary("managers", id), checkPriorityDeletion: (id) => checkDictionary("priorities", id), checkInitiativeStatusDeletion: (id) => checkDictionary("initiativeStatuses", id),
    updateRolePermission: (role, patch) => executeRemote(() => serverCommands.updatePermission(role, patch)),
    applyTaskWeightToOpenCards: (id) => executeRemote<{ cards: number; tasks: number }>(() => serverCommands.applyWeight(id)),
    refreshOpenInitiativeSizes: () => executeRemote<{ cards: number }>(() => serverCommands.recalculateSizes()),
    addCustomField, updateCustomField, deleteCustomField,
  };
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => { const context = useContext(AppContext); if (!context) throw new Error("useAppContext must be used within AppProvider"); return context; };
