import { Router, type Request, type Response } from "express";
import { createConcern } from "../database.js";
import { looksAutomated } from "../validation.js";

const MAX_MESSAGE_LENGTH = 2000;
const MAX_FIELD_LENGTH = 120;

// Strip HTML tags, encoded entities, angle brackets, and control characters,
// then trim. Conservative sanitizer for plain-text storage.
function sanitize(str: string): string {
  return (
    str
      .replace(/<[^>]*>/g, "") // Strip HTML tags
      .replace(/[<>]/g, "") // Remove any remaining angle brackets
      .replace(/&[a-zA-Z0-9#]+;/g, "") // Strip HTML entities (&amp; < &#123; etc.)
      // eslint-disable-next-line no-control-regex -- intentionally stripping control characters
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "") // Strip control chars
      .trim()
  );
}

const router = Router();

// POST /submit-concern — Submit a student concern
router.post("/", async (req: Request, res: Response) => {
  try {
    // Anti-bot checks for this unauthenticated endpoint: a hidden honeypot
    // field that humans never fill in, plus an implausibly-fast-submission
    // check. Neither is a substitute for edge protection (Cloudflare/WAF +
    // Turnstile, see SECURITY.md) — it raises the cost of trivial spam.
    const automated = looksAutomated((req.body ?? {}) as Record<string, unknown>);
    if (automated) {
      res.status(400).json({ error: automated });
      return;
    }

    const {
      last,
      first,
      middle,
      studentNumber,
      section,
      institute,
      program,
      type,
      message,
      consent,
    } = req.body;

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
    });

    res.status(201).json({
      message: "Concern submitted successfully",
      id: concern.id,
      status: concern.status,
    });
  } catch (err) {
    console.error("[Concerns] Failed to submit:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
