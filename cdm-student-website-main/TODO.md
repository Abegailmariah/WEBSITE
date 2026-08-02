# TODO — Website improvement features

## Backend (done)
- [x] `backend/src/routes/concerns.ts`: strict `YY-NNNNN` student number validation, `GET /:id` track endpoint, `GET /student/:studentNumber` list endpoint
- [x] `backend/src/routes/admin.ts`: search param on `GET /concerns`, `PUT /announcements/:id`, `DELETE /concerns/:id`
- [x] `backend/src/database.ts`: `getAllConcerns` search, `updateAnnouncement`, `deleteConcern`, `getConcernById`, `getConcernsByStudentNumber`

## Frontend API libs (done)
- [x] `src/lib/submit-concern-api.ts`: `TrackedConcern` type, `trackConcern()`, `fetchMyConcerns()`
- [x] `src/lib/admin-api.ts`: `updateAnnouncement`, `deleteConcern`, search support, `AdminAnnouncement` type

## Frontend UI
- [x] `src/routes/track-concern.tsx`: NEW - concern tracking page (reference ID → status)
- [x] `src/routes/my-concerns.tsx`: NEW - list concerns by student number
- [x] `src/components/Navbar.tsx`: added Track Concern + My Concerns links
- [x] `src/routes/announcements.tsx`: search + priority filter
- [x] `src/routes/admin.tsx`: announcement edit UI, concerns search + delete

## Verify
- [x] Backend `tsc` build passes
- [x] Frontend `tsc --noEmit` passes
- [x] End-to-end Node test script (`backend/test-features.mjs`): 12/12 PASS — track, my-concerns, admin edit/delete/search
- [x] `npm run build` (backend) passes
- [ ] Commit + push to `origin/main`

