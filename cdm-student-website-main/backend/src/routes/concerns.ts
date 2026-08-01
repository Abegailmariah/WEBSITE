import { Router, type Request, type Response } from "express";
import { createConcern } from "../database.js";

const router = Router();

// POST /submit-concern — Submit a student concern
router.post("/", async (req: Request, res: Response) => {
  try {
    const { last, first, middle, studentNumber, section, institute, program, type, message } =
      req.body;

    // Validation
    const errors: string[] = [];
    if (!last || typeof last !== "string") errors.push("last (name) is required");
    if (!first || typeof first !== "string") errors.push("first (name) is required");
    if (!studentNumber || typeof studentNumber !== "string")
      errors.push("studentNumber is required");
    if (!section || typeof section !== "string") errors.push("section is required");
    if (!institute || typeof institute !== "string") errors.push("institute is required");
    if (!program || typeof program !== "string") errors.push("program is required");
    if (!type || !["Complaint", "Question", "Suggestion"].includes(type))
      errors.push("type must be 'Complaint', 'Question', or 'Suggestion'");
    if (!message || typeof message !== "string") errors.push("message is required");
    if (studentNumber && !/^\d+$/.test(studentNumber))
      errors.push("studentNumber must contain only digits");

    if (errors.length > 0) {
      res.status(400).json({ errors });
      return;
    }

    const concern = await createConcern({
      last_name: last,
      first_name: first,
      middle_name: middle || undefined,
      student_number: studentNumber,
      section,
      institute,
      program,
      type,
      message,
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
