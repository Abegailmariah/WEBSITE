// Build-time guard: refuses a production build whose frontend would point at a
// backend that no visitor can reach.
//
// Why: Vite inlines `import.meta.env.VITE_*` into the bundle at build time. The
// app used to default to http://localhost:8000 when those variables were absent,
// so a Vercel project with no environment variables built green and shipped a
// dead site — announcements silently served mock data and every concern
// submission failed. This script turns that into a hard, readable build failure.
//
// Run automatically by `npm run build` (and therefore by Vercel, whose
// buildCommand is `npm run build`). Bypass deliberately for an offline demo with:
//   ALLOW_UNCONFIGURED_BUILD=1 npm run build

import process from "node:process";

const REQUIRED = [
  "VITE_ANNOUNCEMENTS_ENDPOINT",
  "VITE_SUBMIT_CONCERN_ENDPOINT",
  "VITE_ADMIN_ENDPOINT",
];

// Anything matching this can only ever resolve on the developer's own machine.
const UNREACHABLE = /localhost|127\.0\.0\.1|0\.0\.0\.0|::1|\.local\b|:8000/i;

const modeArgIndex = process.argv.indexOf("--mode");
const mode =
  modeArgIndex >= 0 && process.argv[modeArgIndex + 1]
    ? process.argv[modeArgIndex + 1]
    : (process.env.NODE_ENV ?? "production");

// `npm run build:dev` builds with --mode development: the app's dev-only
// localhost default is correct there, so there is nothing to guard.
if (mode !== "production" && mode !== "test") {
  console.log(`[check-env] mode="${mode}" is not a deploy build — skipping endpoint guard.`);
  process.exit(0);
}

// Merge .env files with the real environment (Vercel injects VITE_* as process
// env vars). Vite's loadEnv already prefers process.env over .env files.
let env = { ...process.env };
try {
  const { loadEnv } = await import("vite");
  env = { ...loadEnv(mode, process.cwd(), "VITE_"), ...pickViteEnv(process.env) };
} catch (err) {
  console.warn(
    `[check-env] vite.loadEnv unavailable (${err?.message}); falling back to process.env only.`,
  );
}

function pickViteEnv(source) {
  const out = {};
  for (const [k, v] of Object.entries(source)) if (k.startsWith("VITE_")) out[k] = v;
  return out;
}

const problems = [];

for (const key of REQUIRED) {
  const value = env[key]?.trim();

  if (!value) {
    problems.push(`${key} is not set.`);
    continue;
  }

  if (UNREACHABLE.test(value)) {
    problems.push(
      `${key} = ${value}\n      ${" ".repeat(key.length)}→ unreachable for a real visitor ` +
        `(development-only default). Set it to the deployed API origin.`,
    );
    continue;
  }

  let url;
  try {
    url = new URL(value);
  } catch {
    problems.push(`${key} = ${value}\n      ${" ".repeat(key.length)}→ not a valid absolute URL.`);
    continue;
  }

  if (url.protocol !== "https:") {
    problems.push(
      `${key} = ${value}\n      ${" ".repeat(key.length)}→ must be https:// — the frontend is on ` +
        `https://*.vercel.app, and a mixed-content http:// request is blocked by the browser.`,
    );
  }
}

if (problems.length > 0) {
  if (process.env.ALLOW_UNCONFIGURED_BUILD === "1") {
    console.warn(
      "[check-env] bypassed via ALLOW_UNCONFIGURED_BUILD=1. The site will run in demo mode:",
    );
    for (const p of problems) console.warn(`  - ${p}`);
    process.exit(0);
  }

  console.error(
    [
      "",
      "✗ Build aborted: the backend endpoints are not configured for this production build.",
      "",
      "  Vite bakes import.meta.env into the bundle, so shipping this would hard-code a",
      "  broken API URL into every visitor's download and the failure would be silent",
      "  (mock announcements + submissions that always fail).",
      "",
      "  Problems:",
      ...problems.map((p) => `    - ${p}`),
      "",
      "  Fix (Vercel → Project → Settings → Environment Variables, add for ALL environments):",
      "    VITE_ANNOUNCEMENTS_ENDPOINT=https://<your-api>/announcements",
      "    VITE_SUBMIT_CONCERN_ENDPOINT=https://<your-api>/submit-concern",
      "    VITE_ADMIN_ENDPOINT=https://<your-api>/admin",
      "",
      "  then redeploy WITHOUT the build cache, or for local verification:",
      "    $env:VITE_ANNOUNCEMENTS_ENDPOINT='https://<your-api>/announcements'; ...",
      "",
      "  Offline demo build (deliberate, ships in demo mode):",
      "    ALLOW_UNCONFIGURED_BUILD=1 npm run build",
      "",
    ].join("\n"),
  );
  process.exit(1);
}

const origin = new URL(env.VITE_ANNOUNCEMENTS_ENDPOINT.trim()).origin;
console.log(`[check-env] ✓ all 3 endpoints configured for ${origin} (mode="${mode}").`);
