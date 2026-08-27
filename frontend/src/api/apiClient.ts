import { notify } from "../components/ui/ToastNotifications";
import {
  ReferenceDataState,
  InitiativeYearReadModel,
  Project,
  QuarterCardReadModel,
  User,
} from "../shared/types";

const configuredBase = import.meta.env.VITE_API_URL?.replace(/\/$/, "");
export const backendEnabled = true;
const baseUrl = configuredBase ?? "http://localhost:4000/api/v1";

let accessToken: string | null = null;
export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

let refreshPromise: Promise<SessionResponse> | null = null;
let authFailureHandler: (() => void) | null = null;
export const setAuthFailureHandler = (handler: (() => void) | null) => { authFailureHandler = handler; };

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

type RequestOptions = RequestInit & { retryAuth?: boolean; notify?: boolean };
export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has("content-type"))
    headers.set("content-type", "application/json");
  if (accessToken) headers.set("authorization", `Bearer ${accessToken}`);
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });
  if (
    response.status === 401 &&
    options.retryAuth !== false &&
    path !== "/auth/refresh"
  ) {
    try {
      await refreshSession();
      return apiRequest<T>(path, { ...options, retryAuth: false });
    } catch {
      setAccessToken(null);
      authFailureHandler?.();
    }
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new ApiError(
      body.code ?? "HTTP_ERROR",
      body.message ?? "Помилка API",
      response.status,
      body.details,
    );
    if (options.notify) notify("error", error.message);
    throw error;
  }
  if (options.notify)
    notify("success", body.message ?? "Зміни успішно збережено");
  return body as T;
}

export interface SessionResponse {
  access_token: string;
  expires_in: number;
  user: User;
}
type WireUser = Omit<User, "departmentId"> & {
  department_id?: string;
  is_active?: boolean;
};
type BootstrapResponse = Omit<ReferenceDataState, "projects" | "tasks" | "users" | "currentUser"> & {
  users: WireUser[];
  currentUser: WireUser;
};
export async function loginSession(email: string, password: string) {
  const session = await apiRequest<SessionResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
    retryAuth: false,
  });
  setAccessToken(session.access_token);
  return session;
}
export async function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = apiRequest<SessionResponse>("/auth/refresh", {
      method: "POST",
      retryAuth: false,
    })
      .then((session) => {
        setAccessToken(session.access_token);
        return session;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}
export async function logoutSession() {
  try {
    await apiRequest("/auth/logout", { method: "POST", retryAuth: false });
  } finally {
    setAccessToken(null);
  }
}
export const changePassword = (
  current_password: string,
  new_password: string,
) =>
  apiRequest("/auth/change-password", {
    method: "POST",
    body: JSON.stringify({ current_password, new_password }),
    notify: false,
  });

export async function loadBootstrap(signal?: AbortSignal) {
  const bootstrap = await apiRequest<ApiResponse<BootstrapResponse>>("/bootstrap", { signal });
  const normalizeUser = (user: WireUser): User => ({
    ...user,
    departmentId: user.department_id,
  });
  return {
    ...bootstrap.data!,
    currentUser: normalizeUser(bootstrap.data!.currentUser),
    users: bootstrap.data!.users.filter((user) => user.is_active !== false).map(normalizeUser),
  };
}
const wireKind = (kind: "project" | "task") => kind === "project" ? "PROJECT" : "OPERATIONAL_TASK";
export const loadInitiativeYears = (kind: "project" | "task", signal?: AbortSignal) =>
  apiRequest<ApiResponse<InitiativeYearReadModel[]>>(`/initiative-years?kind=${wireKind(kind)}`, { signal }).then((response) => response.data);
export const loadQuarterCards = (kind: "project" | "task", signal?: AbortSignal) =>
  apiRequest<ApiResponse<QuarterCardReadModel[]>>(`/quarter-cards?kind=${wireKind(kind)}`, { signal }).then((response) => response.data);

export const toInitiativeYearViewModel = (year: InitiativeYearReadModel): Project => ({
  id: year.id,
  initiative_chain_id: year.initiative_id,
  revision: year.revision,
  initiative_revision: year.initiative_revision,
  name: year.name,
  strategic_goal: year.strategic_goal ?? undefined,
  manager_id: year.preparation?.manager_id ?? undefined,
  priority: year.preparation?.priority_id ?? undefined,
  implementer_dept_ids: [],
  cross_functional_dept_ids: year.preparation?.department_ids ?? [],
  year: year.year,
  quarter: "Q1",
  health_status: "DEFAULT",
  health_status_code: "DEFAULT",
  checklist: [],
  is_backlog: true,
  history: [],
  yearSnapshots: {
    [String(year.year)]: {
      name: year.name,
      strategic_goal: year.strategic_goal ?? undefined,
      manager_id: year.preparation?.manager_id ?? undefined,
      priority: year.preparation?.priority_id ?? undefined,
      implementer_dept_ids: [],
      cross_functional_dept_ids: year.preparation?.department_ids ?? [],
      year: year.year,
      history: [],
      preparationStage: {
        revision: year.preparation?.revision,
        manager_id: year.preparation?.manager_id ?? undefined,
        priority: year.preparation?.priority_id ?? undefined,
        cross_functional_dept_ids: year.preparation?.department_ids ?? [],
        history: [],
      },
    },
  },
});

export const toQuarterCardViewModel = (card: QuarterCardReadModel): Project => ({
  id: card.id,
  initiative_chain_id: card.initiative_id,
  backlog_id: card.initiative_year_id,
  revision: card.revision,
  name: card.name,
  strategic_goal: card.strategic_goal ?? undefined,
  manager_id: card.manager_id ?? undefined,
  priority: card.priority_id ?? undefined,
  notes: card.notes ?? undefined,
  implementer_dept_ids: [],
  cross_functional_dept_ids: card.department_ids,
  custom_fields: card.custom_fields,
  year: card.year,
  quarter: card.quarter,
  health_status: card.status_id,
  health_status_id: card.status_id,
  health_status_code: card.status_code,
  checklist: card.scope.map((item) => ({
    id: item.id,
    revision: item.revision,
    text: item.text,
    is_completed: item.status_code === "GREEN",
    color: item.status_code,
    status_code: item.status_code,
    weightId: item.weight_definition_id ?? undefined,
    weightSnapshot: { definitionId: item.weight_definition_id ?? undefined, name: item.weight_snapshot.name, value: item.weight_snapshot.value },
    implementer_dept_ids: item.executor_department_ids,
  })),
  is_backlog: false,
  moved_from: card.moved_from ? `${card.moved_from.quarter} ${card.moved_from.year}` : undefined,
  history: [],
  sizeSnapshot: { definitionId: card.size_snapshot.definition_id ?? undefined, name: card.size_snapshot.name, totalWeight: card.total_weight },
});


export const command = <T = ApiResponse<unknown>>(
  path: string,
  method: "POST" | "PATCH" | "DELETE",
  body?: unknown,
) =>
  apiRequest<T>(path, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
    notify: false,
  });

export type ApiResponse<T = undefined> = {
  success: true;
  message?: string;
  data: T;
};

export const loadInitiativeCardModel = (id: string, signal?: AbortSignal) =>
  apiRequest<ApiResponse<QuarterCardReadModel>>(`/quarter-cards/${id}`, { signal });
export const loadInitiativeYearModel = (id: string, signal?: AbortSignal) =>
  apiRequest<ApiResponse<InitiativeYearReadModel>>(`/initiative-years/${id}`, { signal });
