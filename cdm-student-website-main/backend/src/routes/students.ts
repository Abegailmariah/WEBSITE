import { Router, type Request, type Response } from "express";
import {
  getStudentByStudentNumber,
  getStudentById,
  createStudent,
  createConcern,
  getConcernsByStudent,
  getAllAnnouncements,
} from "../database.js";
import {
  hashPassword,
  verifyPassword,
  createStudentSession,
  destroyStudentSession,
  getStudentIdFromToken,
  requireStudent,
  STUDENT_COOKIE_NAME,
  extractStudentToken,
  isStudentLocked,
  recordFailedAttempt,
  clearFailedAttempts,
  getLockoutRemaining,
} from "../student-auth.js";

const router = Router();

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  secure: process.env.NODE_ENV === "production",
  maxAge: 12 * 60 * 60 * 1000, // 12 hours, matches session TTL
};

// Strip sensitive fields (password_hash) from a student object.
function toPublicStudent(student: {
  id?: number;
  student_number: string;
  last_name: string;
  first_name: string;
  middle_name?: string;
  section: string;
  institute: string;
  program: string;
}) {
  return {
    id: student.id,
    student_number: student.student_number,
    last_name: student.last_name,
    first_name: student.first_name,
    middle_name: student.middle_name,
    section: student.section,
    institute: student.institute,
    program: student.program,
  };
}

// POST /student/register — create a student account
router.post("/register", async (req: Request, res: Response) => {
  try {
    const { studentNumber, last, first, middle, section, institute, program, password } = req.body ?? {};

    const errors: string[] = [];
    if (!studentNumber || typeof studentNumber !== "string") errors.push("studentNumber is required");
    if (!last || typeof last !== "string") errors.push("last is required");
    if (!first || typeof first !== "string") errors.push("first is required");
    if (!section || typeof section !== "string") errors.push("section is required");
    if (!institute || typeof institute !== "string") errors.push("institute is required");
    if (!program || typeof program !== "string") errors.push("program is required");
    if (!password || typeof password !== "string") errors.push("password is required");
    if (password && password.length < 8) errors.push("password must be at least 8 characters");
    if (password && !/[a-zA-Z]/.test(password)) errors.push("password must contain at least one letter");
    if (password && !/\d/.test(password)) errors.push("password must contain at least one number");
    if (studentNumber && !/^\d{2}-\d{5}$/.test(String(studentNumber).trim()))
      errors.push("studentNumber must match format YY-NNNNN (e.g., 24-00123)");

    if (errors.length > 0) {
      res.status(400).json({ errors });
      return;
    }

    const studentNumberTrim = String(studentNumber).trim();
    const existing = await getStudentByStudentNumber(studentNumberTrim);
    if (existing) {
      res.status(409).json({ error: "An account with this student number already exists" });
      return;
    }

    const student = await createStudent({
      student_number: studentNumberTrim,
      last_name: String(last).trim(),
      first_name: String(first).trim(),
      middle_name: middle ? String(middle).trim() : undefined,
      section: String(section).trim(),
      institute: String(institute).trim(),
      program: String(program).trim(),
      password_hash: hashPassword(String(password)),
    });

    const token = createStudentSession(student.id ?? 0);
    res.cookie(STUDENT_COOKIE_NAME, token, COOKIE_OPTIONS);
    res.status(201).json({ student: toPublicStudent(student), token });
  } catch (err) {
    console.error("[Students] Failed to register:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /student/login — verify credentials and create a session
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { studentNumber, password } = req.body ?? {};

    if (!studentNumber || !password) {
      res.status(400).json({ error: "studentNumber and password are required" });
      return;
    }

    const studentNumberTrim = String(studentNumber).trim();

    // Account lockout check before attempting verification.
    if (isStudentLocked(studentNumberTrim)) {
      const remaining = Math.ceil(getLockoutRemaining(studentNumberTrim) / 1000);
      res.status(429).json({ error: `Account temporarily locked. Try again in ${remaining} seconds.` });
      return;
    }

    const student = await getStudentByStudentNumber(studentNumberTrim);
    const valid = !!student && !!student.password_hash && verifyPassword(String(password), student.password_hash);

    if (!valid) {
      recordFailedAttempt(studentNumberTrim);
      res.status(401).json({ error: "Invalid student number or password" });
      return;
    }

    // Successful login — clear any prior failed attempts.
    clearFailedAttempts(studentNumberTrim);

    const token = createStudentSession(student.id ?? 0);
    res.cookie(STUDENT_COOKIE_NAME, token, COOKIE_OPTIONS);
    res.json({ student: toPublicStudent(student), token });
  } catch (err) {
    console.error("[Students] Failed to login:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /student/session — check whether the current session is valid
router.get("/session", async (req: Request, res: Response) => {
  const token = extractStudentToken(req);
  const studentId = getStudentIdFromToken(token);
  if (!studentId) {
    res.json({ authenticated: false });
    return;
  }
  const student = await getStudentById(studentId);
  if (!student) {
    res.json({ authenticated: false });
    return;
  }
  res.json({ authenticated: true, student: toPublicStudent(student) });
});

// POST /student/logout — invalidate the session
router.post("/logout", requireStudent, (req: Request, res: Response) => {
  const { studentToken } = req as Request & { studentToken?: string };
  if (studentToken) destroyStudentSession(studentToken);
  res.clearCookie(STUDENT_COOKIE_NAME, { path: "/" });
  res.json({ ok: true });
});

// GET /student/concerns — the logged-in student's concerns
router.get("/concerns", requireStudent, async (req: Request, res: Response) => {
  try {
    const { studentId } = req as Request & { studentId?: number };
    const student = await getStudentById(studentId ?? 0);
    if (!student) {
      res.status(404).json({ error: "Student not found" });
      return;
    }
    const concerns = await getConcernsByStudent(student.student_number);
    res.json({ concerns });
  } catch (err) {
    console.error("[Students] Failed to fetch concerns:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// sanitize: strip HTML tags, encoded entities, angle brackets, and control
// characters, then trim. This is a deliberately conservative sanitizer for
// plain-text storage.
function sanitize(str: string): string {
  return String(str)
    .replace(/<[^>]*>/g, "") // Strip HTML tags
    .replace(/[<>]/g, "") // Remove any remaining angle brackets
    .replace(/&[a-zA-Z0-9#]+;/g, "") // Strip HTML entities (&amp; < &#123; etc.)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "") // Strip control chars
    .trim();
}

const MAX_MESSAGE_LENGTH = 2000;

// POST /student/concerns — submit a concern as the logged-in student
router.post("/concerns", requireStudent, async (req: Request, res: Response) => {
  try {
    const { studentId } = req as Request & { studentId?: number };
    const student = await getStudentById(studentId ?? 0);
    if (!student) {
      res.status(404).json({ error: "Student not found" });
      return;
    }

    const { type, message, consent } = req.body ?? {};

    const errors: string[] = [];
    if (!type || !["Complaint", "Question", "Suggestion"].includes(String(type)))
      errors.push("type must be 'Complaint', 'Question', or 'Suggestion'");
    if (!message || typeof message !== "string") errors.push("message is required");
    if (message && sanitize(String(message)).length === 0) errors.push("message is required");
    if (message && sanitize(String(message)).length > MAX_MESSAGE_LENGTH)
      errors.push(`message must be at most ${MAX_MESSAGE_LENGTH} characters`);
    // Data Privacy Act (RA 10173) consent
    if (consent !== true) errors.push("consent is required to process your personal information");

    if (errors.length > 0) {
      res.status(400).json({ errors });
      return;
    }

    const concern = await createConcern({
      last_name: student.last_name,
      first_name: student.first_name,
      middle_name: student.middle_name || undefined,
      student_number: student.student_number,
      section: student.section,
      institute: student.institute,
      program: student.program,
      type: String(type) as "Complaint" | "Question" | "Suggestion",
      message: sanitize(String(message)),
    });

    res.status(201).json({
      message: "Concern submitted successfully",
      id: concern.id,
      status: concern.status,
    });
  } catch (err) {
    console.error("[Students] Failed to submit concern:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /student/announcements — announcements relevant to the student
router.get("/announcements", requireStudent, async (req: Request, res: Response) => {
  try {
    const announcements = await getAllAnnouncements(undefined, undefined, "newest");
    res.json({ announcements });
  } catch (err) {
    console.error("[Students] Failed to fetch announcements:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
