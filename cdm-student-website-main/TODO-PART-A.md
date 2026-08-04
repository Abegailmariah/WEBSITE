# Part A — Dashboard Concern Submission — TODO

## Backend
- [x] Add `POST /student/concerns` route in `backend/src/routes/students.ts`
  - [x] Uses logged-in student's info (auto-fill)
  - [x] Requires type, message, consent (RA 10173)
  - [x] Sanitizes inputs (reuse pattern from public route)
  - [x] Reuses `createConcern()`

## Frontend
- [x] Add `submitStudentConcern()` to `src/lib/student-api.ts`
- [x] Add "Submit a Concern" form to `src/routes/student.tsx`
  - [x] Auto-fill (read-only) student info
  - [x] Type radio, message textarea + char counter, DP consent
  - [x] Refetch concerns on submit

## Verification
- [x] TypeScript checks (backend + frontend)
- [x] Test POST /student/concerns
- [x] Verify frontend at /student
