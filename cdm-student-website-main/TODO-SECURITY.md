# Security Hardening — Implementation TODO

## Steps
- [x] 0. Read and analyze security-relevant files
- [x] 1. Remove default admin PIN (fail-closed) — `backend/src/auth.ts`
- [x] 2. Add Helmet security headers + CSRF protection — `backend/src/index.ts` + new `backend/src/csrf.ts`
- [x] 3. Add student-login rate limiter + account lockout — `backend/src/index.ts` + `backend/src/routes/students.ts` + `backend/src/student-auth.ts`
- [x] 4. Strengthen password policy — `backend/src/routes/students.ts`
- [x] 5. Harden CSV export against formula injection — `backend/src/routes/admin.ts`
- [x] 6. Gate demo/seed student behind non-production + harden `sanitize()` — `backend/src/database.ts` + route files
- [x] 7. Install `helmet` dependency
- [x] 8. Verify TypeScript compiles (tsc)
