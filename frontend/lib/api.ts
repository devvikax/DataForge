const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type RequestOptions = {
  method?: string;
  body?: unknown;
  token?: string;
};

export class ApiError extends Error {
  constructor(
    public status: number,
    public detail: string
  ) {
    super(detail);
    this.name = "ApiError";
  }
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, token } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const err = await response.json();
      detail = err.detail ?? detail;
    } catch {}
    throw new ApiError(response.status, detail);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export interface FormRead {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  unique_field_ids: string[];
  submission_counter: number;
  created_at: string;
  updated_at: string;
}

export interface FormFieldRead {
  id: string;
  form_id: string;
  field_type: string;
  label: string;
  placeholder: string | null;
  description: string | null;
  default_value: string | null;
  is_required: boolean;
  order: number;
  options: string[] | null;
  conditions: any[] | null;
  file_accepted_types: string[] | null;
  file_max_size_mb: number | null;
  file_max_count: number | null;
  created_at: string;
  updated_at: string;
}

export interface FormDetailRead extends FormRead {
  fields: FormFieldRead[];
}

export const api = {
  get: <T>(endpoint: string, token?: string) =>
    request<T>(endpoint, { method: "GET", token }),

  post: <T>(endpoint: string, body: unknown, token?: string) =>
    request<T>(endpoint, { method: "POST", body, token }),

  patch: <T>(endpoint: string, body: unknown, token?: string) =>
    request<T>(endpoint, { method: "PATCH", body, token }),

  delete: <T>(endpoint: string, token?: string) =>
    request<T>(endpoint, { method: "DELETE", token }),

  login: (username: string, password: string) =>
    request<{ access_token: string; token_type: string; expires_in: number }>(
      "/api/auth/login",
      { method: "POST", body: { username, password } }
    ),

  getMe: (token: string) =>
    request<{ id: string; username: string; is_admin: boolean }>(
      "/api/auth/me",
      { method: "GET", token }
    ),

  // Form API endpoints
  getForms: (token: string) =>
    request<FormRead[]>("/api/forms", { method: "GET", token }),

  getForm: (id: string, token?: string) =>
    request<FormDetailRead>(`/api/forms/${id}`, { method: "GET", token }),

  getFormPublic: (slug: string) =>
    request<FormDetailRead>(`/api/forms/public/${slug}`, { method: "GET" }),

  createForm: (body: { name: string; slug: string; description?: string }, token: string) =>
    request<FormRead>("/api/forms", { method: "POST", body, token }),

  updateForm: (
    id: string,
    body: Partial<{
      name: string;
      slug: string;
      description: string | null;
      is_active: boolean;
      unique_field_ids: string[];
    }>,
    token: string
  ) =>
    request<FormRead>(`/api/forms/${id}`, { method: "PATCH", body, token }),

  deleteForm: (id: string, token: string) =>
    request<void>(`/api/forms/${id}`, { method: "DELETE", token }),

  saveFields: (formId: string, fields: any[], token: string) =>
    request<FormFieldRead[]>(`/api/forms/${formId}/fields`, { method: "POST", body: fields, token }),

  reorderFields: (formId: string, fieldIds: string[], token: string) =>
    request<void>(`/api/forms/${formId}/fields/reorder`, {
      method: "PUT",
      body: { field_ids: fieldIds },
      token,
    }),
};
