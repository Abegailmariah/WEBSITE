# System Update Plan — Completed

## ✅ Step 1: Announcements API Integration
- [x] Created `src/lib/announcements-api.ts` with `Announcement` type + fetch function
- [x] Updated `src/routes/announcements.tsx` — fetches from API, falls back to mock data, has loading/error/empty states
- [x] Uses React Query for caching/stale-while-revalidate

## ✅ Step 2: Expanded Institutes & Programs
- [x] Updated `src/routes/submit-concern.tsx` — added more institutes and programs

## ✅ Step 3: Dark Mode Toggle
- [x] Updated `src/components/Navbar.tsx` — added dark mode toggle button with sun/moon icons
- [x] Updated `src/routes/__root.tsx` — added flash-of-wrong-theme prevention script
- [x] Updated `src/styles.css` — smooth dark mode transitions
- [x] Persists preference in localStorage (`cdm-theme` key)
- [x] Respects system `prefers-color-scheme` as default

## ✅ Step 4: Backend Environment Configuration
- [x] Created `.env.example` with documented variables
- [x] Added console warnings when env vars are not configured

## ✅ Step 5: General UI Polish
- [x] Added character counter on message textarea (2000 char limit)
- [x] Added loading skeleton for announcements
- [x] Added error state with retry button
- [x] Added empty state for announcements

