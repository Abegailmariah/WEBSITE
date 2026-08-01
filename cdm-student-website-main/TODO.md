# Phase 3 — Admin Dashboard — Progress Tracker

## Backend
- [x] Add admin auth module (PIN → session token) in `backend/src/auth.ts`
- [x] Add query helpers in `backend/src/database.ts`:
  - `getAllConcerns()`
  - `updateConcernStatus(id, status)`
  - `deleteAnnouncement(id)`
  - `getStats()`
- [x] Add `backend/src/routes/admin.ts`:
  - `POST /admin/login`
  - `GET /admin/stats`
  - `GET /admin/concerns`
  - `PATCH /admin/concerns/:id`
  - `DELETE /admin/announcements/:id`
  - Auth middleware
- [x] Mount admin router in `backend/src/index.ts`

## Frontend
- [x] Add `src/lib/admin-api.ts` (login, stats, concerns, status update, announcement delete)
- [x] Add `createAnnouncement` to `src/lib/announcements-api.ts`
- [x] Create `src/routes/admin.tsx` (login screen + dashboard with tabs)
- [x] Add an "Admin" link in the footer

## Verification
- [x] Backend `tsc --noEmit` passes
- [x] Start backend API server (`localhost:8000`) and test endpoints
- [x] Verify admin login + dashboard in browser (frontend dev server)
- [x] Verify announcement create/delete and concern status update flows
- [ ] Commit and push to GitHub

