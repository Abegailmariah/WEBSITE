# Deployment Guide

Area-Based Academic Information Dissemination System using Bluetooth Low Energy
(BLE) Beacon Technology — Colegio de Montalban capstone.

The project is split across two hosts:

| Part | Host | Folder | URL |
|---|---|---|---|
| Frontend (TanStack Start + Vite) | Vercel | `cdm-student-website-main/` | https://cdm-student-website-main.vercel.app |
| Backend API (Express + sql.js) | Render | `cdm-student-website-main/backend/` | to be created |

---

## 1. Backend → Render

The backend is a long-running Express server, so it **cannot** be hosted on
Vercel (Vercel has no persistent process and no writable disk).

1. Render Dashboard → **New +** → **Blueprint**
2. Connect `Abegailmariah/WEBSITE`
3. Render reads `render.yaml` at the repo root and asks for `ADMIN_PIN`.
   Generate one with:
   ```powershell
   node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
   ```
4. Wait for the deploy, then copy the service URL, e.g.
   `https://cdm-ble-api.onrender.com`
5. Verify the API is alive:
   ```powershell
   Invoke-RestMethod https://cdm-ble-api.onrender.com/
   ```
6. Verify the datastore is reachable as well — `/health` reads the SQLite file,
   `/` does not:
   ```powershell
   Invoke-RestMethod https://cdm-ble-api.onrender.com/health
   # -> { status: ok, database: ok, announcements: 5, concerns: 0 }
   ```

### Environment variables (already in `render.yaml`)

| Key | Value | Why |
|---|---|---|
| `NODE_ENV` | `production` | Enables Secure cookies + `__Host-` cookie prefixes |
| `COOKIE_SAMESITE` | `none` | Cross-site cookies (Vercel → Render) |
| `ADMIN_PIN` | secret | Server refuses to start without it. Must be **≥ 32 random hex chars** |
| `CSRF_SECRET` | generated | Signs CSRF tokens (`generateValue: true`, never in Git) |
| `CORS_ORIGINS` | `https://cdm-student-website-main.vercel.app` | Blocks other origins |
| `SESSION_TTL_MS` | `7200000` | 2-hour *sliding* admin session |
| `SESSION_ABSOLUTE_MAX_MS` | `43200000` | 12-hour hard cap on any session |
| `ADMIN_MAX_FAILED` | `5` | Failed PIN attempts before lockout |
| `ADMIN_LOCKOUT_MS` | `900000` | 15-minute lockout once tripped |

### Data persistence

`render.yaml` defaults to `plan: free`, whose filesystem is **ephemeral**:
`cdm_portal.db` is deleted on every restart/redeploy, so announcements and
concerns revert to seed data. Persistent disks are available on paid instance
types only. To keep real data:

1. Change `plan: free` → `plan: starter` in `render.yaml`
2. Uncomment the `disk:` block (`mountPath: /var/data`)
3. Uncomment `DB_PATH: /var/data/cdm_portal.db`

### Free-tier cold starts

A free Render service sleeps after ~15 minutes of inactivity. The first request
after that can take 30–60 seconds, which exceeds the 5-second timeout in
`src/lib/announcements-api.ts` — the site then shows its fallback data. Warm the
API before a demo by opening the API URL in a browser.

### Backups

The free filesystem is not only ephemeral, it is the **only** copy of the data.
Snapshot it off-instance (Render Cron Job, Task Scheduler, or manually):

```powershell
cd cdm-student-website-main\backend
npm run build
npm run backup              # -> backend/backups/cdm_portal-<timestamp>.db (keeps 14)
```

`DB_PATH`, `BACKUP_DIR` and `BACKUP_KEEP` override the locations. To restore:
stop the API, copy a snapshot over `DB_PATH`, start the API.

### Data retention (RA 10173)

Complaints/questions are personal data and should not be kept forever:

```powershell
# Preview how many resolved concerns would be removed
$env:DRY_RUN=1; $env:CONCERN_RETENTION_DAYS=180; npm run purge

# Actually delete resolved concerns older than 180 days
Remove-Item Env:DRY_RUN; npm run purge
```

Pending/Read concerns are never touched. Every run is reported on stdout so the
result can be pasted into the project log.

---

## 2. Frontend → Vercel

1. Vercel → Project → **Settings** → **Environment Variables** (all
   environments), add:
   ```
   VITE_ANNOUNCEMENTS_ENDPOINT=https://cdm-ble-api.onrender.com/announcements
   VITE_SUBMIT_CONCERN_ENDPOINT=https://cdm-ble-api.onrender.com/submit-concern
   VITE_ADMIN_ENDPOINT=https://cdm-ble-api.onrender.com/admin
   ```
2. **Deployments → Redeploy** (without build cache).
   Vite inlines `import.meta.env` at build time, so without a fresh build the
   old `http://localhost:8000` values stay in the bundle.
3. Vercel → **Settings** → **Root Directory** must be `cdm-student-website-main`
   (the repo has an extra `WEBSITE-main/` level on disk — if the repo root is
   the project folder, leave this empty).

`vercel.json` deliberately does **not** set `framework` or `outputDirectory`;
the Nitro `vercel` preset in `vite.config.ts` produces `.vercel/output`.

It **does** add the site's security headers (`X-Frame-Options: DENY`, nosniff,
Referrer-Policy, Permissions-Policy, COOP) plus a CSP in
`Content-Security-Policy-Report-Only` mode. Report-Only cannot break the site:
watch the browser console / Vercel logs, fix any violation caused by our own
code, then rename the header key to `Content-Security-Policy` to enforce it.

---

## 3. Cross-site cookies and CSRF

Because the frontend and API are on different sites, three things must be true
and are already handled in code:

- Cookies are issued with `SameSite=None; Secure`
  (`backend/src/routes/admin.ts`, `students.ts`, `csrf.ts`) — driven by
  `COOKIE_SAMESITE=none` + `NODE_ENV=production`.
- The API allows the Vercel origin and exposes the CSRF header
  (`backend/src/index.ts`: `CORS_ORIGINS`, `exposedHeaders`).
- The SPA cannot read the API's CSRF cookie (`document.cookie` is origin
  scoped), so `src/lib/csrf.ts` bootstraps the token from the
  `X-CSRF-Token` response header instead.

---

## 4. Local development

```powershell
# terminal 1 — API on :8000
cd cdm-student-website-main\backend
npm install
Copy-Item .env.example .env   # then set ADMIN_PIN
npm run dev

# terminal 2 — site on :5173
cd cdm-student-website-main
npm install
npm run dev
```

`CORS_ORIGINS` in `backend/.env` should include `http://localhost:5173`.

---

## 5. Pre-deploy checks

```powershell
cd cdm-student-website-main; npx tsc --noEmit; npm run build
cd cdm-student-website-main\backend; npx tsc --noEmit
```

Never commit: `.env`, `backend/cdm_portal.db`, `*.log`, `*.txt` build output —
all are covered by `.gitignore`.

### Security review

`SECURITY.md` at the repo root is the companion checklist. It lists every control
that is already in the code (CSRF binding, lockout, rate limits, validation,
audit log, retention tooling) **and** the items only the operator can do:
long random `ADMIN_PIN`, 2FA on GitHub/Vercel/Render, Dependabot + secret
scanning, Cloudflare/WAF + Turnstile, branch protection, backups and retention.

### API regression tests

With the API running on :8000:

```powershell
cd cdm-student-website-main\backend
$env:TEST_PIN = "<your admin PIN>"
node test-features.mjs
```

It exercises the real cookie + CSRF flow and asserts the security behaviours
(29 checks): CSRF required and session-bound, token never returned in the login
body, honeypot/timing checks, per-IP login lockout, unauthenticated writes
rejected, removed `/student/*` routes, audited exports, and input validation.
