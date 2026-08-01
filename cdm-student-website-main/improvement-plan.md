# Improvement Plan — All Items (G)

> Status: ✅ ALL ITEMS COMPLETE

## A) Remove Dark Mode Entirely ✅
**Files edited:**
- `src/styles.css` — Removed `@custom-variant dark`, entire `.dark { ... }` block, and the theme transition block
- `src/routes/__root.tsx` — Removed the inline flash-prevention `<script>` in `RootShell`
- `src/components/Navbar.tsx` — Removed `dark` state, `useEffect`, `localStorage` calls, and the toggle button
- `src/components/ui/alert.tsx` — Removed `dark:border-destructive` class
- `src/components/ui/chart.tsx` — `THEMES` now only has `light`

## B) Fix Broken Admin Dashboard Status Chart ✅
**File:** `src/routes/admin.tsx`
- Fixed `OverviewTab` to use explicit hex colors (`#f59e0b`, `#3b82f6`, `#10b981`) instead of broken `s.color.replace("bg-", "")`

## C) Add Pagination to Admin Concerns Tab ✅
**Files edited:**
- `backend/src/routes/admin.ts` — Added `page`/`limit` query params to `GET /admin/concerns`
- `backend/src/database.ts` — Modified `getAllConcerns()` to accept pagination params and return `{ data, total, page, totalPages }`
- `src/lib/admin-api.ts` — Updated `fetchAdminConcerns()` to accept page/limit params
- `src/routes/admin.tsx` — Added pagination controls (Previous/Next) to `ConcernsTab`

## D) Add Search/Filter on Admin Announcements Tab ✅
**File:** `src/routes/admin.tsx`
- Added search input to `AnnouncementsTab` that filters by title (client-side)

## E) Improve Mobile Responsiveness Site-Wide ✅
**Files edited:**
- `src/routes/index.tsx` — Hero section: smaller padding on mobile (`py-14 sm:py-20`), responsive heading/text sizes
- `src/routes/submit-concern.tsx` — More touch-friendly inputs (`py-2.5`), larger radio buttons, better spacing
- `src/routes/admin.tsx` — Responsive tab bar and search input layout

## F) Add Rate Limiting + Input Sanitization ✅
**Files edited:**
- `backend/package.json` — Added `express-rate-limit`
- `backend/src/index.ts` — Applied rate limiters (admin login 10/min, concern submission 10/min)
- `backend/src/routes/concerns.ts` — Added input sanitization (strips HTML tags/angle brackets)
- `backend/src/routes/admin.ts` — Login endpoint protected by rate limiter

## Extra ✅
- Removed map section from Contact page (`src/routes/contact.tsx`)
