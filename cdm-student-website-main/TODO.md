# Fix Errors & Run Full Stack — Progress Tracker

## Backend Fixes
- [x] Install `@types/sql.js` in `backend/`
- [x] Fix `src/database.ts` implicit `any` errors (row, col, i params)

## Frontend Fixes
- [x] Fix `no-explicit-any` errors in `src/lib/announcements-api.ts`
- [x] Fix `no-explicit-any` errors in `src/lib/submit-concern-api.ts`
- [x] Auto-fix prettier formatting errors (`npm run format` / eslint --fix)

## Verification
- [x] Backend `tsc --noEmit` passes with 0 errors
- [ ] Frontend `tsc --noEmit` passes with 0 errors
- [ ] ESLint clean (no errors)

## Run Both Servers
- [ ] Start backend API server (`localhost:8000`)
- [ ] Start frontend dev server (Vite)
- [ ] Confirm endpoints respond

