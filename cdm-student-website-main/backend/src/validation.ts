import { z } from "zod";

// Campus areas mirrored to BLE beacons. Kept in sync with CAMPUS_AREAS in
// src/routes/admin.tsx (frontend).
export const CAMPUS_AREAS = [
  "Campus-Wide",
  "Main Gate",
  "Registrar's Office",
  "Accounting Office",
  "Scholarship Office",
  "Guidance & Counseling",
  "ICS Building",
  "IBE Building",
  "ITE Building",
  "AVR",
  "Library",
  "Canteen",
] as const;

// The admin form also offers an "Other" option with a free-text area, so a
// strict enum would reject legitimate announcements. Instead the value is
// length-capped and restricted to characters that can appear in a campus
// location name — which also stops stored markup from reaching the UI.
const AREA_PATTERN = /^[\p{L}\p{N}\s&'’.,()#\-/]+$/u;

export const MAX_TITLE_LENGTH = 150;
export const MAX_DATE_LENGTH = 40;
export const MAX_AREA_LENGTH = 80;
export const MAX_CONTENT_LENGTH = 4000;

const requiredString = (field: string, max: number) =>
  z
    .string({ required_error: `${field} is required`, invalid_type_error: `${field} is required` })
    .trim()
    .min(1, `${field} is required`)
    .max(max, `${field} must be at most ${max} characters`);

// Shared by POST /announcements and PUT /admin/announcements/:id so both write
// paths enforce exactly the same rules.
export const announcementInputSchema = z.object({
  title: requiredString("title", MAX_TITLE_LENGTH),
  date: requiredString("date", MAX_DATE_LENGTH),
  priority: z.enum(["Critical", "Normal"], {
    errorMap: () => ({ message: "priority must be 'Critical' or 'Normal'" }),
  }),
  area: requiredString("area", MAX_AREA_LENGTH).regex(
    AREA_PATTERN,
    "area contains unsupported characters (letters, numbers, spaces, & ' . , ( ) # - / only)",
  ),
  content: requiredString("content", MAX_CONTENT_LENGTH),
});

export type AnnouncementInput = z.infer<typeof announcementInputSchema>;

/**
 * Render zod issues as the `{ errors: string[] }` shape the existing routes and
 * frontend already expect, so this hardening stays backward compatible.
 */
export function zodErrorMessages(error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.join(".");
    return path ? `${path}: ${issue.message}` : issue.message;
  });
}

// Public concern form.
//
// `website` and `formOpenedAt` are anti-bot fields: the form renders a
// visually-hidden "website" input that humans never fill in, plus the
// millisecond timestamp at which it was opened. Submissions that fill the
// honeypot, or that arrive implausibly fast, are rejected. Both are optional so
// older clients and the CLI test scripts keep working.
export const HONEYPOT_FIELD = "website";
export const MIN_FILL_TIME_MS = 2000;

export function looksAutomated(body: Record<string, unknown>): string | null {
  const honeypot = body[HONEYPOT_FIELD];
  if (typeof honeypot === "string" && honeypot.trim() !== "") {
    return "Automated submission rejected";
  }

  const openedAt = body.formOpenedAt;
  if (typeof openedAt === "number" && Number.isFinite(openedAt)) {
    const elapsed = Date.now() - openedAt;
    // Reject sub-second submissions and absurd/back-dated timestamps.
    if (elapsed < MIN_FILL_TIME_MS || elapsed > 24 * 60 * 60 * 1000) {
      return "Automated submission rejected";
    }
  }

  return null;
}
