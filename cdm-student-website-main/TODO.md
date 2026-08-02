# TODO — Website improvement features

## Backend (done)
- [x] `backend/src/routes/concerns.ts`: strict `YY-NNNNN` student number validation
- [x] `backend/src/routes/admin.ts`: search param on `GET /concerns`, `PUT /announcements/:id`, `DELETE /concerns/:id`
- [x] `backend/src/database.ts`: `getAllConcerns` search, `updateAnnouncement`, `deleteConcern`

## Frontend API libs (done)
- [x] `src/lib/admin-api.ts`: `updateAnnouncement`, `deleteConcern`, search support, `AdminAnnouncement` type

## Frontend UI
- [x] `src/components/Navbar.tsx`: kept Home, Announcements, Submit Concern, Contact
- [x] `src/routes/announcements.tsx`: search + priority filter
- [x] `src/routes/admin.tsx`: announcement edit UI, concerns search + delete

## Removed (per user request)
- [x] Removed "Track Concern" and "My Concerns" features (pages, endpoints, helpers, nav links)

## Verify
- [x] Backend `tsc` build passes
- [x] Frontend `tsc --noEmit` passes
- [x] End-to-end Node test script (`backend/test-features.mjs`): 8/8 PASS
- [x] `npm run build` (backend) passes
- [x] Commit + push to `origin/main`

