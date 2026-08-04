# Student Dashboard Feature — Implementation TODO

## Backend
- [x] Add `students` table migration + seed demo account in `backend/src/database.ts`
- [x] Add password hashing (scrypt) + `createStudent`, `getStudentByStudentNumber`, `getConcernsByStudent` functions
- [x] Add student session management (reuse auth pattern) in `backend/src/auth.ts` or new file
- [x] Create `backend/src/routes/students.ts` with:
  - POST /student/login (student number + password)
  - POST /student/register (create account)
  - GET /student/session (check session)
  - POST /student/logout
  - GET /student/concerns (logged-in student's concerns)
  - GET /student/announcements (filtered by institute/program)
- [x] Register student router in `backend/src/index.ts`

## Frontend
- [x] Create `src/lib/student-api.ts` (API client)
- [x] Create `src/routes/student.tsx` (student dashboard page)
- [x] Add "Student" nav link to `src/components/Navbar.tsx`
- [x] Update `src/routeTree.gen.ts` to include new route

## Verification
- [x] Run TypeScript checks on backend + frontend
- [x] Test backend endpoints (login, register, concerns)
- [x] Verify frontend renders at /student
