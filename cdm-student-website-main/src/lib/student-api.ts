import { getCsrfHeader } from "./csrf";

export type Student = {
  id?: number;
  student_number: string;
  last_name: string;
  first_name: string;
  middle_name?: string;
  section: string;
  institute: string;
  program: string;
};

export type StudentAnnouncement = {
  id: number;
  title: string;
  date: string;
  priority: "Critical" | "Normal";
  content: string;
};

export type StudentConcern = {
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
  response?: string;
  created_at?: string;
};

export type StudentRegisterPayload = {
  studentNumber: string;
  last: string;
  first: string;
  middle?: string;
  section: string;
  institute: string;
  program: string;
  password: string;
};

export type StudentSubmitConcernPayload = {
  type: StudentConcern["type"];
  message: string;
  consent: boolean;
};

export type StudentSubmitConcernResult = {
  message: string;
  id: number;
  status: string;
};

const DEFAULT_STUDENT_ENDPOINT = "http://localhost:8000/student";

export function getStudentEndpoint(): string {
  const env = import.meta.env;
  return (env?.VITE_STUDENT_ENDPOINT as string) ?? DEFAULT_STUDENT_ENDPOINT;
}

// All student requests use credentials: "include" so the httpOnly cookie is sent.
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method ?? "GET").toUpperCase();
  const isStateChanging = method !== "GET" && method !== "HEAD" && method !== "OPTIONS";
  const res = await fetch(`${getStudentEndpoint()}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "content-type": "application/json",
      // Attach the CSRF token for state-changing requests (double-submit).
      ...(isStateChanging ? getCsrfHeader() : {}),
      ...(options.headers as Record<string, string> | undefined),
    },
  });

  if (!res.ok) {
    let message = `Request failed: HTTP ${res.status}`;
    let errors: string[] | undefined;
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
      if (Array.isArray(data?.errors)) errors = data.errors;
    } catch {
      // ignore body parse errors
    }
    const err = new Error(message) as Error & { status?: number; errors?: string[] };
    err.status = res.status;
    err.errors = errors;
    throw err;
  }

  return res.json() as Promise<T>;
}

export async function studentLogin(
  studentNumber: string,
  password: string,
): Promise<{ student: Student; token: string }> {
  return request<{ student: Student; token: string }>("/login", {
    method: "POST",
    body: JSON.stringify({ studentNumber, password }),
  });
}

export async function studentRegister(
  payload: StudentRegisterPayload,
): Promise<{ student: Student; token: string }> {
  return request<{ student: Student; token: string }>("/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function checkStudentSession(): Promise<{
  authenticated: boolean;
  student?: Student;
}> {
  return request<{ authenticated: boolean; student?: Student }>("/session");
}

export async function studentLogout(): Promise<void> {
  try {
    await request<{ ok: boolean }>("/logout", { method: "POST" });
  } catch {
    // ignore
  }
}

export async function fetchStudentConcerns(): Promise<StudentConcern[]> {
  const data = await request<{ concerns: StudentConcern[] }>("/concerns");
  return data.concerns ?? [];
}

export async function fetchStudentAnnouncements(): Promise<StudentAnnouncement[]> {
  const data = await request<{ announcements: StudentAnnouncement[] }>("/announcements");
  return data.announcements ?? [];
}

export async function submitStudentConcern(
  payload: StudentSubmitConcernPayload,
): Promise<StudentSubmitConcernResult> {
  return request<StudentSubmitConcernResult>("/concerns", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
