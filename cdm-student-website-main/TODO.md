# TODO: Remove "My Concerns" & Tracking Concept

## Frontend
- [x] Delete `src/routes/my-concerns.tsx`
- [x] Delete `src/lib/my-concerns-api.ts`
- [x] Remove "My Concerns" nav link from `src/components/Navbar.tsx`
- [x] Update `src/routeTree.gen.ts` to remove MyConcernsRoute
- [x] Remove `TrackConcernWidget` from `src/routes/contact.tsx`
- [x] Remove tracking code display from `src/routes/submit-concern.tsx`
- [x] Remove `trackConcern`/`TrackedConcern`/`getTrackEndpoint` from `src/lib/submit-concern-api.ts`
- [x] Remove `tracking_code` from `src/lib/admin-api.ts`
- [x] Remove tracking code display from `src/routes/admin.tsx`

## Backend
- [x] Delete `backend/src/routes/myConcerns.ts`
- [x] Delete `backend/src/routes/track.ts`
- [x] Remove routes from `backend/src/index.ts`
- [x] Remove tracking functions from `backend/src/database.ts`
- [x] Remove `tracking_code` from `backend/src/types.ts`
- [x] Update `backend/src/routes/concerns.ts` to not return tracking_code
- [x] Update `backend/src/routes/admin.ts` CSV export

## Tests / Cleanup
- [x] Delete `backend/test-myconcerns.mjs`
- [x] Update `backend/test-features.mjs` to remove tracking code tests
