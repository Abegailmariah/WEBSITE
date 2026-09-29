import { getCsrfHeaderAsync } from "./csrf";
import {
  ANNOUNCEMENTS_ENDPOINT,
  BackendNotConfiguredError,
  warnIfUnconfigured,
} from "./api-config";

export type Announcement = {
  id: number;
  title: string;
  date: string;
  priority: "Critical" | "Normal";
  /** Campus area this announcement applies to (mirrored to the BLE beacon in that area). */
  area: string;
  content: string;
};

export type NewAnnouncement = {
  title: string;
  date: string;
  priority: "Critical" | "Normal";
  area: string;
  content: string;
};

export type AnnouncementsResponse = {
  data: Announcement[];
  total: number;
  page: number;
  totalPages: number;
};

/**
 * Where the announcements currently on screen came from. Surfaced in the UI so
 * sample data is never mistaken for a real announcement.
 *  - "api": live rows from the backend.
 *  - "sample": backend unreachable — hardcoded demo rows are shown.
 *  - "unconfigured": this build has no usable backend URL at all.
 */
export type AnnouncementSource = "api" | "sample" | "unconfigured";

export type AnnouncementsResult = {
  items: Announcement[];
  source: AnnouncementSource;
};

// Readable, stable name for callers/tests; "" when this build is unconfigured.
export const announcementsEndpoint = ANNOUNCEMENTS_ENDPOINT;

// Hardcoded demo rows, shown ONLY when the backend cannot be reached, and then
// only behind a visible "sample data" banner (see BackendStatusBanner).
const fallbackAnnouncements: Announcement[] = [
  {
    id: 1,
    title: "Class Suspension",
    date: "Oct 20",
    priority: "Critical",
    area: "Campus-Wide",
    content:
      "Classes are suspended due to typhoon. Stay safe and monitor official channels for updates.",
  },
  {
    id: 2,
    title: "Enrollment Schedule",
    date: "Oct 25",
    priority: "Normal",
    area: "Registrar's Office",
    content:
      "Enrollment for this Semester starts. Please prepare your requirements early.\n\n1st Year: October 25-26\n2nd Year: October 27-28\n3rd Year: October 29-30\n4th Year: October 31 - November 1",
  },
  {
    id: 3,
    title: "OJT Orientation",
    date: "Nov 03",
    priority: "Normal",
    area: "AVR",
    content: "Mandatory OJT orientation for all 4th-year students at the AVR.",
  },
  {
    id: 4,
    title: "System Maintenance",
    date: "Nov 08",
    priority: "Critical",
    area: "Campus-Wide",
    content: "The dissemination system will be under maintenance from 10PM to 2AM.",
  },
  {
    id: 5,
    title: "Scholarship Application",
    date: "Nov 10",
    priority: "Normal",
    area: "Scholarship Office",
    content:
      "Scholarship applications are now open for the upcoming semester!\n\nEligible students may apply for:\n- TES (Tertiary Education Subsidy)\n- TDP (Tulong Dunong Program)\n\nDeadline: November 30\nLocation: Registrar's Office\n\nFor inquiries, visit the Scholarship Office or email scholarships@cdm.edu.ph.",
  },
];

/**
 * Request budget for the public list. A free Render instance can take 30-60s to
 * cold-start; 15s covers a warm-but-slow API without hanging the page, and the
 * 60s polling in the routes recovers once the instance is awake.
 */
const FETCH_TIMEOUT_MS = 15_000;

export async function fetchAnnouncements(
  sort: "newest" | "oldest" = "newest",
): Promise<AnnouncementsResult> {
  const endpoint = ANNOUNCEMENTS_ENDPOINT;

  // No usable URL in this build: say so instead of firing a doomed fetch at a
  // localhost address that would fail as an opaque network error.
  if (!endpoint) {
    warnIfUnconfigured("announcements");
    return { items: fallbackAnnouncements, source: "unconfigured" };
  }

  const params = new URLSearchParams({ sort });
  const url = `${endpoint}?${params.toString()}`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (!res.ok) {
      console.warn(`Announcements API returned HTTP ${res.status}. Showing sample data.`);
      return { items: fallbackAnnouncements, source: "sample" };
    }

    const data = await res.json();
    // Backward-compatible: array or { data, total, page, totalPages }
    if (Array.isArray(data)) return { items: data as Announcement[], source: "api" };
    if (data && Array.isArray(data.data))
      return { items: data.data as Announcement[], source: "api" };
    return { items: fallbackAnnouncements, source: "sample" };
  } catch (err) {
    console.warn("Failed to fetch announcements from backend. Showing sample data.", err);
    return { items: fallbackAnnouncements, source: "sample" };
  }
}

// Paginated + sortable fetch for the admin dashboard.
export async function fetchAnnouncementsPage(
  page: number = 1,
  limit: number = 10,
  sort: "newest" | "oldest" = "newest",
): Promise<AnnouncementsResponse> {
  if (!ANNOUNCEMENTS_ENDPOINT) throw new BackendNotConfiguredError("the announcements list");
  const endpoint = ANNOUNCEMENTS_ENDPOINT;
  const params = new URLSearchParams({ page: String(page), limit: String(limit), sort });

  const res = await fetch(`${endpoint}?${params.toString()}`, {
    method: "GET",
    headers: { accept: "application/json" },
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch announcements: HTTP ${res.status}`);
  }

  return res.json() as Promise<AnnouncementsResponse>;
}

export async function createAnnouncement(announcement: NewAnnouncement): Promise<Announcement> {
  if (!ANNOUNCEMENTS_ENDPOINT) throw new BackendNotConfiguredError("creating announcements");
  const endpoint = ANNOUNCEMENTS_ENDPOINT;

  const res = await fetch(endpoint, {
    method: "POST",
    credentials: "include",
    headers: {
      "content-type": "application/json",
      // Attach the CSRF token for state-changing requests (double-submit).
      // Bootstraps the token cookie first if this is the first API call.
      ...(await getCsrfHeaderAsync(endpoint)),
    },
    body: JSON.stringify(announcement),
  });

  if (!res.ok) {
    let details = "";
    try {
      details = await res.text();
    } catch {
      // ignore
    }
    throw new Error(
      `Failed to create announcement: HTTP ${res.status}${details ? ` - ${details}` : ""}`,
    );
  }

  return res.json() as Promise<Announcement>;
}
