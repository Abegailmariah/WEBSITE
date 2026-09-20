# Security Guide — CdM Area-Based Academic Information Dissemination System

Area-Based Academic Information Dissemination System using BLE Beacon Technology
— Colegio de Montalban capstone.

- Frontend (TanStack Start) → **Vercel**: https://cdm-student-website-main.vercel.app
- API (Express + sql.js) → **Render**: see `render.yaml`

This file is both a record of what the code already protects and the checklist of
things only an operator (you) can do. Anything marked **ACTION** is not done yet.

---

## 1. What the code already enforces

| Control | Where |
|---|---|
| No SQL injection — every query parameterized; `LIMIT/OFFSET` clamped, `ASC/DESC` whitelisted | `backend/src/database.ts` |
| No stored XSS — React escapes by default, no `dangerouslySetInnerHTML` on user data; concern input sanitized server-side | `backend/src/routes/concerns.ts` |
| Constant-time secret comparison (`timingSafeEqual`) | `backend/src/auth.ts`, `backend/src/csrf.ts` |
| CSRF: signed, session-bound, stateless double-submit; token echoed in `X-CSRF-Token` | `backend/src/csrf.ts` |
| Rate limiting: global 600/min/IP + 10/min login + 10/min concern submit + 30/min admin mutations | `backend/src/index.ts` |
| Admin brute-force lockout: 5 failures → 15 min lock per IP | `backend/src/routes/admin.ts` |
| Session hardening: `httpOnly`, `SameSite=None; Secure`, `__Host-` prefix in production, 2 h sliding idle + 12 h absolute cap, max 10 concurrent sessions | `backend/src/auth.ts`, `backend/src/cookies.ts` |
| Session token never returned to JavaScript (nothing to steal via XSS/localStorage) | `backend/src/routes/admin.ts` |
| Security headers on the API: CSP, HSTS, COOP/CORP, no-sniff, `frame-ancestors 'self'` | `helmet()` in `backend/src/index.ts` |
| Security headers on the site: `X-Frame-Options: DENY`, no-sniff, Referrer-Policy, Permissions-Policy, COOP, CSP in **Report-Only** | `cdm-student-website-main/vercel.json` |
| One shared validation schema for create + update; safe character set for the BLE area; explicit length caps | `backend/src/validation.ts` |
| CSV export neutralizes spreadsheet formula injection (`=`, `+`, `-`, `@`, tab, CR) | `backend/src/routes/admin.ts` |
| Anti-bot honeypot + minimum fill time on the public concern form | `backend/src/validation.ts`, `src/routes/submit-concern.tsx` |
| Admin console not indexable (`Disallow: /admin` + `noindex`) | `public/robots.txt`, `src/routes/admin.tsx` |
| Audit log records what happened from where (IP + user agent), including failed logins and every CSV export | `backend/src/audit.ts`, `backend/src/database.ts` |
| 16 KB request body cap | `express.json({ limit: "16kb" })` |
| Secrets never committed (`ADMIN_PIN`, `CSRF_SECRET`, `.env`, `*.db`, cookie jars) | `.gitignore` ×2 |
| Health probe that actually reads the database | `GET /health` in `backend/src/index.ts` |
| Dead public `/student/*` routes removed (they had no frontend consumer) | `backend/src/index.ts` |

---

## 2. ACTION — Required before you call this "safe"

### 2.1 Secrets and accounts

- [ ] **`ADMIN_PIN` must be long and random** (≥ 32 hex chars), not a 6-digit code:
      `node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"`
      Set it in Render only (`render.yaml` uses `sync: false`). Never in a
      `VITE_*` variable — every `VITE_` value is baked into the public bundle.
- [ ] **Rotate `ADMIN_PIN` now** if it was ever demoed, shared, or typed on a
      shared laptop. Rotating it also invalidates outstanding CSRF tokens
      (benign — the SPA re-bootstraps one per request).
- [ ] Enable **2FA on GitHub, Vercel and Render**. The dashboard is only as strong
      as those accounts.
- [ ] GitHub → Settings → **Code security**: enable *Dependabot alerts*,
      *Dependabot security updates*, ***Secret scanning* + push protection**. A
      leaked `ADMIN_PIN` in a commit is otherwise invisible.
- [ ] GitHub → Branches → protect `main`: require a PR + 1 review, block force
      pushes. `AGENTS.md` notes the repo is connected to Lovable, so never rewrite
      published history.
- [ ] Consider TOTP (authenticator app) as a second factor on `/admin/login` —
      today a single shared secret guards all PII.

### 2.2 Edge protection (not in code — you must enable it)

- [ ] Put **Cloudflare** in front of the Render API (proxied DNS, free plan):
      WAF rules, bot fight mode, DDoS absorption. In-process limiters then become
      a second layer instead of the only one.
- [ ] Add **Cloudflare Turnstile** (free) to the public concern form and verify
      the token server-side. The honeypot raises the bar; it does not stop a
      determined spammer.
- [ ] Vercel → Project → **Firewall**: enable the managed ruleset / DDoS rules.
- [ ] Once Vercel's CSP report shows no legitimate violations, rename
      `Content-Security-Policy-Report-Only` to `Content-Security-Policy` in
      `cdm-student-website-main/vercel.json` to start *enforcing* it.

### 2.3 Data protection (Data Privacy Act, RA 10173)

Complaints/questions are personal data: name, student number, section, institute,
program, free-text message.

- [ ] **Backups**: the free Render filesystem is ephemeral — data is wiped on
      every restart/redeploy. Run `cd backend; npm run build; npm run backup`
      (or a Render Cron Job) and keep snapshots off-instance.
- [ ] **Retention**: pick a window (e.g. 180 days) and run
      `CONCERN_RETENTION_DAYS=180 npm run purge` (`DRY_RUN=1` to preview).
      Resolved concerns older than the window are deleted; Pending/Read ones are
      never touched.
- [ ] **Persistent storage** for real data: `render.yaml` documents the paid
      `disk:` + `DB_PATH` option. Better still, move to an encrypted managed
      Postgres (Neon/Render Postgres) instead of a file on disk.
- [ ] Publish a **DPO / privacy contact** on the Privacy Policy page and in
      `public/.well-known/security.txt` (currently `info@cdm.edu.ph` — point it at
      a mailbox someone actually reads).
- [ ] Review `concern.export` audit entries periodically — every export is a full
      PII egress.

### 2.4 Operations

- [ ] Uptime + alert monitoring on `GET /health` (expects `{"status":"ok"}`).
- [ ] Free Render instances sleep after ~15 min: warm the API before a demo, or the
      site falls back to mock data (5 s timeout in `announcements-api.ts`).
- [ ] Keep one lockfile authoritative for CI/deploy (Render runs `npm ci` →
      `package-lock.json`). `bun.lock` exists for Lovable; if the two drift,
      environments get different dependency trees.
- [ ] Re-run the pre-deploy checks in `DEPLOYMENT.md` §5 before each release.

---

## 3. Reporting a vulnerability

Keep a monitored `Contact:` mailbox in `public/.well-known/security.txt`
(RFC 9116) so researchers have a private channel. Do not publish exploit details
before a fix ships.

---

## 4. Verifying these controls locally

With the API running on :8000 (`cd backend; npm run build; npm start`):

```powershell
cd cdm-student-website-main/backend
node test-features.mjs
```

The script exercises the real CSRF flow (cookie jar + `X-CSRF-Token`), the
honeypot, admin login + lockout, audited export, the removal of `/student/*`, and
the "unauthenticated POST /announcements is rejected" rule.

