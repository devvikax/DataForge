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

// ── Form types ──────────────────────────────────────────────────────────────

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

// ── Phase 4: Submission types ────────────────────────────────────────────────

export interface SubmissionValueRead {
  id: string;
  field_id: string;
  value_text: string | null;
  value_json: any;
}

export interface FileUploadRead {
  id: string;
  field_id: string;
  cloudinary_url: string;
  cloudinary_secure_url: string;
  original_filename: string;
  file_type: string;
  file_size_bytes: number;
  uploaded_at: string;
}

export interface SubmissionRead {
  id: string;
  submission_id: string;
  form_id: string;
  status: string;
  admin_notes: string | null;
  submitter_ip: string | null;
  submitted_at: string;
  updated_at: string;
  values: SubmissionValueRead[];
  file_uploads: FileUploadRead[];
}

export interface PaginatedSubmissions {
  submissions: SubmissionRead[];
  total_count: number;
  page: number;
  limit: number;
  total_pages: number;
}

// ── Phase 4: Edit Request types ──────────────────────────────────────────────

export interface EditRequestRead {
  id: string;
  submission_id: string;
  reason: string;
  status: string;
  admin_note: string | null;
  edit_token: string | null;
  token_expires_at: string | null;
  token_used: boolean;
  created_at: string;
  reviewed_at: string | null;
  form_name: string | null;
  human_submission_id: string | null;
}

export interface EditRequestFormDetail {
  form: FormDetailRead;
  submission_id: string;
  values: SubmissionValueRead[];
  file_uploads: FileUploadRead[];
}

// ── API client ───────────────────────────────────────────────────────────────

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

  // ── Forms ──────────────────────────────────────────────────────────────────

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
    request<FormFieldRead[]>(`/api/forms/${formId}/fields`, {
      method: "POST",
      body: fields,
      token,
    }),

  reorderFields: (formId: string, fieldIds: string[], token: string) =>
    request<void>(`/api/forms/${formId}/fields/reorder`, {
      method: "PUT",
      body: { field_ids: fieldIds },
      token,
    }),

  // ── Phase 4: Submissions management ────────────────────────────────────────

  getSubmissions: (
    formId: string,
    params: {
      page?: number;
      limit?: number;
      sort_by?: string;
      sort_order?: string;
      search?: string;
      status_filter?: string;
    },
    token: string
  ) => {
    const query = new URLSearchParams();
    if (params.page !== undefined) query.set("page", String(params.page));
    if (params.limit !== undefined) query.set("limit", String(params.limit));
    if (params.sort_by) query.set("sort_by", params.sort_by);
    if (params.sort_order) query.set("sort_order", params.sort_order);
    if (params.search) query.set("search", params.search);
    if (params.status_filter) query.set("status_filter", params.status_filter);
    const qs = query.toString();
    return request<PaginatedSubmissions>(
      `/api/submissions/form/${formId}${qs ? `?${qs}` : ""}`,
      { method: "GET", token }
    );
  },

  updateSubmissionStatus: (
    id: string,
    status: string,
    admin_notes: string | null,
    token: string
  ) =>
    request<SubmissionRead>(`/api/submissions/${id}/status`, {
      method: "PATCH",
      body: { status, admin_notes },
      token,
    }),

  bulkUpdateStatus: (submission_ids: string[], status: string, token: string) =>
    request<{ updated_count: number }>("/api/submissions/bulk-status", {
      method: "POST",
      body: { submission_ids, status },
      token,
    }),

  bulkArchive: (submission_ids: string[], token: string) =>
    request<{ archived_count: number }>("/api/submissions/bulk-archive", {
      method: "POST",
      body: { submission_ids },
      token,
    }),

  // ── Phase 4: Edit Requests — admin ─────────────────────────────────────────

  getEditRequests: (status_filter: string | null, token: string) => {
    const qs = status_filter ? `?status_filter=${status_filter}` : "";
    return request<EditRequestRead[]>(`/api/submissions/edit-requests${qs}`, {
      method: "GET",
      token,
    });
  },

  approveEditRequest: (id: string, admin_note: string | null, token: string) =>
    request<EditRequestRead>(`/api/submissions/edit-requests/${id}/approve`, {
      method: "POST",
      body: { admin_note },
      token,
    }),

  rejectEditRequest: (id: string, admin_note: string | null, token: string) =>
    request<EditRequestRead>(`/api/submissions/edit-requests/${id}/reject`, {
      method: "POST",
      body: { admin_note },
      token,
    }),

  // ── Phase 4: Edit Requests — public (no auth) ──────────────────────────────

  createEditRequest: (submission_id: string, reason: string) =>
    request<{ message: string }>("/api/submissions/edit-requests", {
      method: "POST",
      body: { submission_id, reason },
    }),

  getSubmissionByToken: (editToken: string) =>
    request<EditRequestFormDetail>(`/api/submissions/edit-by-token/${editToken}`, {
      method: "GET",
    }),

  applyEditByToken: (
    editToken: string,
    payload: { values: any[]; file_uploads: any[] }
  ) =>
    request<{ message: string }>(`/api/submissions/edit-by-token/${editToken}`, {
      method: "PATCH",
      body: payload,
    }),
};
