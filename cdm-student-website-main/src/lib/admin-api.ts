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
  status: "Pending" | "Read" | "Resolved";
  created_at?: string;
};

export type AdminAnnouncement = {
  id: number;
  title: string;
  date: string;
  priority: "Critical" | "Normal";
  content: string;
};

const DEFAULT_ADMIN_ENDPOINT = "http://localhost:8000/admin";

export function getAdminEndpoint(): string {
  const env = import.meta.env;
  return (env?.VITE_ADMIN_ENDPOINT as string) ?? DEFAULT_ADMIN_ENDPOINT;
}

// ── Token storage ──────────────────────────────────────────────────
const TOKEN_KEY = "cdm-admin-token";

export function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setAdminToken(token: string): void {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearAdminToken(): void {
  window.localStorage.removeItem(TOKEN_KEY);
}

// ── API helpers ────────────────────────────────────────────────────

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAdminToken();
  const headers: Record<string, string> = {
    "content-type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers.authorization = `Bearer ${token}`;

  const res = await fetch(`${getAdminEndpoint()}${path}`, { ...options, headers });

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
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ pin }),
  });

  if (!res.ok) {
    throw new Error("Invalid PIN");
  }

  const data = (await res.json()) as { token: string };
  setAdminToken(data.token);
  return data.token;
}

export async function adminLogout(): Promise<void> {
  try {
    await request("/logout", { method: "POST" });
  } catch {
    // ignore
  }
  clearAdminToken();
}

export function fetchAdminStats(): Promise<AdminStats> {
  return request<AdminStats>("/stats");
}

export function fetchAdminConcerns(
  page: number = 1,
  limit: number = 10,
  search: string = "",
): Promise<{ data: AdminConcern[]; total: number; page: number; totalPages: number }> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (search) params.set("search", search);
  return request<{ data: AdminConcern[]; total: number; page: number; totalPages: number }>(
    `/concerns?${params.toString()}`,
  );
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

