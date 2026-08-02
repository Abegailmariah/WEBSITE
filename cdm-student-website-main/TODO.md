# TODO — Critical + High Improvement Implementation

## Backend ✅
- [x] `backend/src/auth.ts`: session TTL (8h), timing-safe PIN compare, cookie + Bearer token support
- [x] `backend/src/types.ts`: add `email`, `response`, `tracking_code` to Concern; add `AuditLog`
- [x] `backend/src/database.ts`: atomic writes, migrations (email/response/tracking_code + audit_log), tracking-code generation/backfill, `getConcernByTrackingCode`, `getAllConcernsRaw`, `addAuditLog`/`getAuditLog`, announcement sort + pagination
- [x] `backend/src/routes/concerns.ts`: consent + email + max-length validation, return tracking_code
- [x] `backend/src/routes/announcements.ts`: protect POST with auth, sort/pagination, audit log
- [x] `backend/src/routes/track.ts` (new): `GET /track/:code`
- [x] `backend/src/routes/admin.ts`: httpOnly cookie, `GET /admin/session`, CSV export, audit endpoint, response field in PATCH, audit logging
- [x] `backend/src/index.ts`: CORS allowlist, admin mutation limiter, mount track router
- [x] `backend/test-features.mjs`: add `consent: true` + new endpoint tests

## Frontend ✅
- [x] `src/lib/admin-api.ts`: cookie-based auth (no localStorage), session check, CSV export, audit log, response support
- [x] `src/lib/announcements-api.ts`: sort param, paginated fetch, credentials on create
- [x] `src/lib/submit-concern-api.ts`: email + consent fields, typed result with tracking_code, `trackConcern`
- [x] `src/routes/admin.tsx`: session check, Audit Log tab, CSV button, response editing, announcement pagination
- [x] `src/routes/submit-concern.tsx`: email field, consent checkbox, tracking-code success screen
- [x] `src/routes/contact.tsx`: track-concern widget
- [x] `src/routes/announcements.tsx`: sort toggle
- [x] `src/routes/index.tsx`: wrap `fetchAnnouncements` queryFn

## Verify ✅
- [x] Backend `npm run build` (tsc) passes
- [x] Frontend `npx tsc --noEmit` passes
- [x] Server + `backend/test-features.mjs` passes (18/18)
- [x] Manual smoke test: `/track/:code`, `/admin/session`, CSV export, audit log

## 🔧 Bug Fix — Admin Portal 500s (root cause) ✅
- [x] `backend/src/database.ts` `saveDatabase()`: initial version used `fs.renameSync`
      over the open DB file, which throws **EPERM on Windows** on EVERY write.
      This broke all write endpoints (admin login via audit log, concern submission).
- [x] Rewrote `saveDatabase()` with a Windows-safe fallback (attempt atomic rename,
      fall back to direct `writeFileSync` if the rename fails).
- [x] Verified after restart: `POST /admin/login` 200 + sets httpOnly cookie,
      `GET /admin/session` `{"authenticated":true}`, `POST /submit-concern` 201
      with tracking code, `GET /admin/stats` 200, `test-features.mjs` 17/17 PASS.

