import type { AnnouncementSource } from "@/lib/announcements-api";

interface BackendStatusBannerProps {
  source: AnnouncementSource;
}

const messages: Record<
  Exclude<AnnouncementSource, "api">,
  { label: string; detail: string; tone: string }
> = {
  unconfigured: {
    label: "No backend connected",
    detail:
      "This build has no API address configured, so the announcements below are hardcoded sample " +
      "data and new concerns cannot be saved. Set VITE_ANNOUNCEMENTS_ENDPOINT, " +
      "VITE_SUBMIT_CONCERN_ENDPOINT and VITE_ADMIN_ENDPOINT, then redeploy without the build cache.",
    tone: "border-destructive/40 bg-destructive/10 text-destructive",
  },
  sample: {
    label: "Live data unavailable — showing sample announcements",
    detail:
      "The announcements API could not be reached (it may be waking up from sleep). " +
      "The list below is example content, not current college announcements. Retrying automatically.",
    tone: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
};

/**
 * Explains, in the page, when the announcements on screen are not live.
 *
 * The app previously fell back to hardcoded rows with no indication they were
 * examples, so a misconfigured deployment looked healthy. Renders nothing when
 * the data is genuinely live.
 */
export function BackendStatusBanner({ source }: BackendStatusBannerProps) {
  if (source === "api") return null;
  const { label, detail, tone } = messages[source];

  return (
    <div
      role="status"
      aria-live="polite"
      className={`mb-6 flex items-start gap-3 rounded-md border px-4 py-3 text-sm ${tone}`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="mt-0.5 h-4 w-4 shrink-0"
        aria-hidden="true"
      >
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
      </svg>
      <div>
        <p className="font-semibold">{label}</p>
        <p className="mt-0.5 opacity-90">{detail}</p>
      </div>
    </div>
  );
}
