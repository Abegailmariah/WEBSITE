// Single source of truth for the backend API endpoints.
//
// ─── Why this file exists ────────────────────────────────────────────────────
// Each API module used to resolve its own endpoint with
//   `import.meta.env.VITE_X ?? "http://localhost:8000/..."`.
// That meant a Vercel build with NO VITE_* environment variables still built
// successfully and shipped a bundle pointing at http://localhost:8000 — a URL
// that only resolves on the developer's own machine. Every visitor silently
// got the mock/fallback path instead of the real API, and nothing failed
// loudly. Resolution and validation now live here, in exactly one place.
//
// Rules:
//   • development → unset values fall back to the local dev API (good UX).
//   • production  → an unset or localhost value is a MISCONFIGURATION. The
//     value resolves to "" so callers refuse the request with a clear message
//     instead of firing a doomed fetch. `scripts/check-env.mjs` additionally
//     fails the build, so this state should never reach a deploy.
//
// NOTE: Vite inlines `import.meta.env` at build time. Changing a value in the
// Vercel dashboard does NOT affect an existing deployment — it must be
// rebuilt (Redeploy without build cache).

/** The Express API's local dev origin (see DEPLOYMENT.md §4). */
const DEV_API_ORIGIN = "http://localhost:8000";

type ViteEnv = Record<string, string | boolean | undefined>;

const env = import.meta.env as ViteEnv;

export const IS_DEV = env.DEV === true;

const ENDPOINT_KEYS = [
  "VITE_ANNOUNCEMENTS_ENDPOINT",
  "VITE_SUBMIT_CONCERN_ENDPOINT",
  "VITE_ADMIN_ENDPOINT",
] as const;

export type EndpointKey = (typeof ENDPOINT_KEYS)[number];

/** Matches anything that cannot work for a real visitor. */
const UNREACHABLE = /localhost|127\.0\.0\.1|0\.0\.0\.0|::1|\.local\b|:8000/i;

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

/** Reads one VITE_ value as a trimmed string ("" when absent or non-string). */
function readKey(key: EndpointKey): string {
  const value = env[key];
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Resolve one endpoint.
 *
 * @returns an absolute URL, or "" when the endpoint is unusable in this build.
 */
function resolve(key: EndpointKey, devPath: string): string {
  const raw = readKey(key);

  if (raw) {
    const value = trimTrailingSlash(raw);
    // A localhost value in a production build is the original bug: keep it out
    // of the request path entirely rather than issuing a doomed fetch.
    if (!IS_DEV && UNREACHABLE.test(value)) return "";
    return value;
  }

  // Unset: only development gets the convenience default.
  return IS_DEV ? `${DEV_API_ORIGIN}${devPath}` : "";
}

export const ANNOUNCEMENTS_ENDPOINT = resolve("VITE_ANNOUNCEMENTS_ENDPOINT", "/announcements");
export const SUBMIT_CONCERN_ENDPOINT = resolve("VITE_SUBMIT_CONCERN_ENDPOINT", "/submit-concern");
export const ADMIN_ENDPOINT = resolve("VITE_ADMIN_ENDPOINT", "/admin");

/**
 * Endpoint keys that are missing or unreachable for this build.
 * Empty in a correctly configured deployment.
 */
export function getUnconfiguredEndpoints(): EndpointKey[] {
  return ENDPOINT_KEYS.filter((key) => {
    const raw = readKey(key);
    if (!raw) return !IS_DEV;
    return !IS_DEV && UNREACHABLE.test(trimTrailingSlash(raw));
  });
}

/** True when every endpoint this app needs is usable. */
export const BACKEND_CONFIGURED = getUnconfiguredEndpoints().length === 0;

/**
 * The API origin, used to bootstrap the CSRF token (see `csrf.ts`).
 * Derived from the first usable endpoint so there is no fourth URL to keep in
 * sync. Returns "" when nothing is configured.
 */
export function getApiOrigin(): string {
  for (const endpoint of [ANNOUNCEMENTS_ENDPOINT, ADMIN_ENDPOINT, SUBMIT_CONCERN_ENDPOINT]) {
    if (!endpoint) continue;
    try {
      return new URL(endpoint).origin;
    } catch {
      // Malformed value — fall through to the next candidate.
    }
  }
  return "";
}

/**
 * Thrown by API helpers when the build has no usable endpoint. Surfaced to the
 * user as an actionable message rather than a raw `TypeError: Failed to fetch`.
 */
export class BackendNotConfiguredError extends Error {
  readonly unconfigured: EndpointKey[];

  constructor(context: string) {
    const missing = getUnconfiguredEndpoints();
    super(
      `No backend is configured for ${context}. Missing or unreachable in this build: ` +
        `${missing.join(", ")}. Set them in Vercel → Project → Settings → Environment ` +
        `Variables (all environments) and redeploy WITHOUT the build cache.`,
    );
    this.name = "BackendNotConfiguredError";
    this.unconfigured = missing;
  }
}

/**
 * Warn once per missing key, in the browser only. Kept because the build-time
 * guard can be intentionally bypassed for an offline demo build.
 */
let warned = false;
export function warnIfUnconfigured(context: string): void {
  if (typeof window === "undefined" || BACKEND_CONFIGURED || warned) return;
  warned = true;
  console.warn(
    `[CdM AID System] Backend endpoints are not configured for ${context}.`,
    getUnconfiguredEndpoints(),
    "\nSet VITE_ANNOUNCEMENTS_ENDPOINT / VITE_SUBMIT_CONCERN_ENDPOINT / VITE_ADMIN_ENDPOINT",
    "and redeploy without the build cache (Vite bakes these values in at build time).",
  );
}
