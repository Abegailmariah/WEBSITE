import { Router, type Request, type Response } from "express";
import { createConcern } from "../database.js";

const MAX_MESSAGE_LENGTH = 2000;
const MAX_FIELD_LENGTH = 120;

// Strip HTML tags and trim whitespace
function sanitize(str: string): string {
  return str
    .replace(/<[^>]*>/g, "") // Strip HTML tags
    .replace(/[<>]/g, "") // Remove any remaining angle brackets
    .trim();
}

const router = Router();

// POST /submit-concern — Submit a student concern
router.post("/", async (req: Request, res: Response) => {
  try {
    const { last, first, middle, studentNumber, section, institute, program, type, message, email, consent } =
      req.body;

    // Sanitize all string inputs
    const sanitized = {
      last: last ? sanitize(String(last)) : "",
      first: first ? sanitize(String(first)) : "",
      middle: middle ? sanitize(String(middle)) : "",
      studentNumber: studentNumber ? sanitize(String(studentNumber)) : "",
      section: section ? sanitize(String(section)) : "",
      institute: institute ? sanitize(String(institute)) : "",
      program: program ? sanitize(String(program)) : "",
      type: type ? String(type).trim() : "",
      message: message ? sanitize(String(message)) : "",
      email: email ? sanitize(String(email)) : "",
    };

    // Validation
    const errors: string[] = [];
    if (!sanitized.last) errors.push("last (name) is required");
    if (!sanitized.first) errors.push("first (name) is required");
    if (!sanitized.studentNumber) errors.push("studentNumber is required");
    if (!sanitized.section) errors.push("section is required");
    if (!sanitized.institute) errors.push("institute is required");
    if (!sanitized.program) errors.push("program is required");
    if (!["Complaint", "Question", "Suggestion"].includes(sanitized.type))
      errors.push("type must be 'Complaint', 'Question', or 'Suggestion'");
    if (!sanitized.message) errors.push("message is required");
    if (sanitized.studentNumber && !/^\d{2}-\d{5}$/.test(sanitized.studentNumber))
      errors.push("studentNumber must match format YY-NNNNN (e.g., 24-00123)");

    // Max length enforcement (server-side)
    if (sanitized.message.length > MAX_MESSAGE_LENGTH)
      errors.push(`message must be at most ${MAX_MESSAGE_LENGTH} characters`);
    for (const [field, value] of Object.entries(sanitized)) {
      if (value && value.length > MAX_FIELD_LENGTH && field !== "message") {
        errors.push(`${field} must be at most ${MAX_FIELD_LENGTH} characters`);
      }
    }

    // Email format check (optional field)
    if (sanitized.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitized.email)) {
      errors.push("email must be a valid email address");
    }

    // Data Privacy Act (RA 10173) consent
    if (consent !== true) {
      errors.push("consent is required to process your personal information");
    }

    if (errors.length > 0) {
      res.status(400).json({ errors });
      return;
    }

    const concern = await createConcern({
      last_name: sanitized.last,
      first_name: sanitized.first,
      middle_name: sanitized.middle || undefined,
      student_number: sanitized.studentNumber,
      section: sanitized.section,
      institute: sanitized.institute,
      program: sanitized.program,
      type: sanitized.type as "Complaint" | "Question" | "Suggestion",
      message: sanitized.message,
      email: sanitized.email || undefined,
    });

    res.status(201).json({
      message: "Concern submitted successfully",
      id: concern.id,
      status: concern.status,
      tracking_code: concern.tracking_code,
    });
  } catch (err) {
    console.error("[Concerns] Failed to submit:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

