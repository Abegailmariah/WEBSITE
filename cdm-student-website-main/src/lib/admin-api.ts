export type AdminStats = {
  announcements: number;
  concerns: number;
  pending: number;
  read: number;
  resolved: number;
};

export type AdminConcern = {
  id: number;
  last_name: string;
  first_name: string;
  middle_name?: string;
  student_number: string;
  section: string;
  institute: string;
  program: string;
  type: "Complaint" | "Question" | "Suggestion";
  message: string;
  email?: string;
  status: "Pending" | "Read" | "Resolved";
  response?: string;
  tracking_code?: string;
  created_at?: string;
};

export type AdminAnnouncement = {
  id: number;
  title: string;
  date: string;
  priority: "Critical" | "Normal";
  content: string;
};

export type AuditLogEntry = {
  id: number;
  action: string;
  detail?: string;
  created_at?: string;
};

export type AdminConcernsResponse = {
  data: AdminConcern[];
  total: number;
  page: number;
  totalPages: number;
};

const DEFAULT_ADMIN_ENDPOINT = "http://localhost:8000/admin";

export function getAdminEndpoint(): string {
  const env = import.meta.env;
  return (env?.VITE_ADMIN_ENDPOINT as string) ?? DEFAULT_ADMIN_ENDPOINT;
}

// All admin requests use credentials: "include" so the httpOnly cookie is sent.
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${getAdminEndpoint()}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "content-type": "application/json",
      ...(options.headers as Record<string, string> | undefined),
    },
  });

  if (!res.ok) {
    let message = `Request failed: HTTP ${res.status}`;
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {
      // ignore body parse errors
    }
    const err = new Error(message) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }

  return res.json() as Promise<T>;
}

export async function adminLogin(pin: string): Promise<string> {
  const res = await fetch(`${getAdminEndpoint()}/login`, {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ pin }),
  });

  if (!res.ok) {
    throw new Error("Invalid PIN");
  }

  const data = (await res.json()) as { token: string };
  return data.token;
}

export async function adminLogout(): Promise<void> {
  try {
    await request("/logout", { method: "POST" });
  } catch {
    // ignore
  }
}

// Check whether the current httpOnly session cookie is valid.
export async function checkAdminSession(): Promise<boolean> {
  try {
    const data = await request<{ authenticated: boolean }>("/session");
    return data.authenticated === true;
  } catch {
    return false;
  }
}

export function fetchAdminStats(): Promise<AdminStats> {
  return request<AdminStats>("/stats");
}

export function fetchAdminConcerns(
  page: number = 1,
  limit: number = 10,
  search: string = "",
): Promise<AdminConcernsResponse> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (search) params.set("search", search);
  return request<AdminConcernsResponse>(`/concerns?${params.toString()}`);
}

// Download all concerns as CSV via a hidden anchor.
export function downloadConcernsCsv(search: string = ""): void {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  const url = `${getAdminEndpoint()}/concerns/export?${params.toString()}`;
  const a = document.createElement("a");
  a.href = url;
  a.rel = "noopener";
  a.click();
}

export function updateConcernStatus(
  id: number,
  status: AdminConcern["status"],
): Promise<AdminConcern> {
  return request<AdminConcern>(`/concerns/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function updateConcernWithResponse(
  id: number,
  status: AdminConcern["status"],
  response: string,
): Promise<AdminConcern> {
  return request<AdminConcern>(`/concerns/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status, response }),
  });
}

export function deleteConcern(id: number): Promise<{ ok: boolean; id: number }> {
  return request<{ ok: boolean; id: number }>(`/concerns/${id}`, {
    method: "DELETE",
  });
}

export function updateAnnouncement(
  id: number,
  announcement: {
    title: string;
    date: string;
    priority: "Critical" | "Normal";
    content: string;
  },
): Promise<AdminAnnouncement> {
  return request<AdminAnnouncement>(`/announcements/${id}`, {
    method: "PUT",
    body: JSON.stringify(announcement),
  });
}

export function deleteAnnouncement(id: number): Promise<{ ok: boolean; id: number }> {
  return request<{ ok: boolean; id: number }>(`/announcements/${id}`, {
    method: "DELETE",
  });
}

export function fetchAuditLog(limit: number = 50): Promise<AuditLogEntry[]> {
  return request<AuditLogEntry[]>(`/audit?limit=${limit}`);
}

