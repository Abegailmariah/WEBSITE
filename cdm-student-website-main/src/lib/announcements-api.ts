export type Announcement = {
  id: number;
  title: string;
  date: string;
  priority: "Critical" | "Normal";
  content: string;
};

const DEFAULT_ANNOUNCEMENTS_ENDPOINT = "http://localhost:8000/announcements";

export function getAnnouncementsEndpoint(): string {
  const env = import.meta.env;
  const endpoint = env?.VITE_ANNOUNCEMENTS_ENDPOINT ?? DEFAULT_ANNOUNCEMENTS_ENDPOINT;

  if (typeof window !== "undefined" && !env?.VITE_ANNOUNCEMENTS_ENDPOINT) {
    console.warn(
      "[CdM Portal] VITE_ANNOUNCEMENTS_ENDPOINT is not set. Using default:",
      DEFAULT_ANNOUNCEMENTS_ENDPOINT,
      "\nCreate a .env file based on .env.example to configure.",
    );
  }

  return endpoint;
}

// Fallback mock data used when the backend is unreachable
const fallbackAnnouncements: Announcement[] = [
  {
    id: 1,
    title: "Class Suspension",
    date: "Oct 20",
    priority: "Critical",
    content:
      "Classes are suspended due to typhoon. Stay safe and monitor official channels for updates.",
  },
  {
    id: 2,
    title: "Enrollment Schedule",
    date: "Oct 25",
    priority: "Normal",
    content:
      "Enrollment for this Semester starts. Please prepare your requirements early.\n\n1st Year: October 25-26\n2nd Year: October 27-28\n3rd Year: October 29-30\n4th Year: October 31 - November 1",
  },
  {
    id: 3,
    title: "OJT Orientation",
    date: "Nov 03",
    priority: "Normal",
    content: "Mandatory OJT orientation for all 4th-year students at the AVR.",
  },
  {
    id: 4,
    title: "System Maintenance",
    date: "Nov 08",
    priority: "Critical",
    content: "The student portal will be under maintenance from 10PM to 2AM.",
  },
  {
    id: 5,
    title: "Scholarship Application",
    date: "Nov 10",
    priority: "Normal",
    content:
      "Scholarship applications are now open for the upcoming semester!\n\nEligible students may apply for:\n- TES (Tertiary Education Subsidy)\n- TDP (Tulong Dunong Program)\n\nDeadline: November 30\nLocation: Registrar's Office\n\nFor inquiries, visit the Scholarship Office or email scholarships@cdm.edu.ph.",
  },
];

export async function fetchAnnouncements(): Promise<Announcement[]> {
  const endpoint = getAnnouncementsEndpoint();

  try {
    const res = await fetch(endpoint, {
      method: "GET",
      headers: { accept: "application/json" },
      // Timeout after 5s so the UI doesn't hang
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      console.warn(`Announcements API returned HTTP ${res.status}. Falling back to mock data.`);
      return fallbackAnnouncements;
    }

    const data: Announcement[] = await res.json();
    return data;
  } catch (err) {
    console.warn("Failed to fetch announcements from backend. Falling back to mock data.", err);
    return fallbackAnnouncements;
  }
}
