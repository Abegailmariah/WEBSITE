import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { submitConcern, type SubmitConcernPayload } from "@/lib/submit-concern-api";

export const Route = createFileRoute("/submit-concern")({
  head: () => ({
    meta: [
      { title: "Submit a Concern — CdM Student Portal" },
      {
        name: "description",
        content: "Submit a complaint, question, or suggestion to Colegio de Montalban.",
      },
      { property: "og:title", content: "Submit a Concern — CdM" },
      {
        property: "og:description",
        content: "Send complaints, questions, or suggestions directly to your institute.",
      },
    ],
  }),
  component: SubmitConcernPage,
});

const institutes = [
  "ICS — Institute of Computer Studies",
  "IBE — Institute of Business and Entrepreneurship",
  "ITE — Institute of Teacher Education",
];

const programs = [
  "BSIT",
  "BSCPE",
  "BSBA HRM",
  "BS ENTREP",
  "BSEd SCIENCE",
  "BECEd",
  "BEEd",
  "BTLEd ICT",
];

function SubmitConcernPage() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [messageLength, setMessageLength] = useState(0);
  const [consent, setConsent] = useState(false);
  const MAX_MESSAGE_LENGTH = 2000;

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;

    if (!consent) {
      setErrorMessage("Please consent to the data privacy policy to continue.");
      return;
    }

    setErrorMessage(null);
    setSubmitting(true);

    const form = e.target as HTMLFormElement;
    const fd = new FormData(form);

    const payloadDraft = {
      last: String(fd.get("last") ?? "").trim(),
      first: String(fd.get("first") ?? "").trim(),
      middle: String(fd.get("middle") ?? "").trim() || undefined,
      studentNumber: String(fd.get("studentNumber") ?? "").trim(),
      section: String(fd.get("section") ?? "").trim(),
      institute: String(fd.get("institute") ?? "").trim(),
      program: String(fd.get("program") ?? "").trim(),
      type: String(fd.get("type") ?? "").trim() as SubmitConcernPayload["type"],
      message: String(fd.get("message") ?? "").trim(),
      consent,
    };

    const missing = Object.entries(payloadDraft)
      .filter(([_, v]) => (typeof v === "string" ? v.length === 0 : false))
      .map(([k]) => k);

    if (missing.length) {
      setErrorMessage(`Please fill out: ${missing.join(", ")}.`);
      setSubmitting(false);
      return;
    }

    // Validate student number format (YY-NNNNN, e.g. 24-00123)
    if (!/^\d{2}-\d{5}$/.test(payloadDraft.studentNumber)) {
      setErrorMessage("Student number must match format YY-NNNNN (e.g., 24-00123).");
      setSubmitting(false);
      return;
    }

    const payload: SubmitConcernPayload = payloadDraft;

    try {
      const result = await submitConcern(payload);
      setSubmitted(true);
      toast.success("Concern submitted!", {
        description: "Thank you! Your concern has been recorded.",
      });
      form.reset();
      setMessageLength(0);
      setConsent(false);
      setTimeout(() => setSubmitted(false), 15000);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Submission failed";
      setErrorMessage(message);
      toast.error("Submission failed", {
        description: message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const label = "block text-sm font-medium text-foreground mb-1";
  const input =
    "w-full rounded-md border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40";

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-primary">Submit a Concern</h1>
        <p className="text-muted-foreground mt-1">
          Complaints, questions, or suggestions — we'll route it to the right office.
        </p>
      </header>

      {submitted && (
        <div className="mb-6 rounded-md border border-secondary bg-secondary/30 px-4 py-3 text-sm text-secondary-foreground">
          <p className="font-semibold">Thank you! Your concern has been recorded.</p>
        </div>
      )}

      {errorMessage && (
        <div className="mb-6 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {errorMessage}
        </div>
      )}

      <form onSubmit={onSubmit} className="bg-card border rounded-lg shadow-sm p-6 grid gap-5">
        <fieldset className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className={label}>
              Last name <span className="text-destructive">*</span>
            </label>
            <input required name="last" className={input} maxLength={120} />
          </div>
          <div>
            <label className={label}>
              First name <span className="text-destructive">*</span>
            </label>
            <input required name="first" className={input} maxLength={120} />
          </div>
          <div>
            <label className={label}>Middle name</label>
            <input name="middle" className={input} maxLength={120} />
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label}>
              Student Number <span className="text-destructive">*</span>
            </label>
            <input required name="studentNumber" className={input} placeholder="e.g. 24-00000" maxLength={8} />
          </div>
          <div>
            <label className={label}>Year & Section</label>
            <input required name="section" className={input} placeholder="e.g. 4-A" maxLength={120} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label}>
              Institute <span className="text-destructive">*</span>
            </label>
            <select required name="institute" className={input} defaultValue="">
              <option value="" disabled>
                Select institute
              </option>
              {institutes.map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>Program</label>
            <select required name="program" className={input} defaultValue="">
              <option value="" disabled>
                Select program
              </option>
              {programs.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <span className={label}>
            Type of Concern <span className="text-destructive">*</span>
          </span>
          <div className="flex flex-wrap gap-x-4 gap-y-2 mt-1">
            {["Complaint", "Question", "Suggestion"].map((t) => (
              <label key={t} className="inline-flex items-center gap-2 text-sm py-1.5">
                <input type="radio" required name="type" value={t} className="accent-primary w-4 h-4" />
                {t}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className={label}>Message</label>
          <textarea
            required
            name="message"
            rows={5}
            className={input}
            placeholder="Describe your concern in detail..."
            maxLength={MAX_MESSAGE_LENGTH}
            onChange={(e) => setMessageLength(e.target.value.length)}
          />
          <div className="flex justify-between items-center mt-1">
            {messageLength > 0 && (
              <span
                className={`text-xs ${
                  messageLength >= MAX_MESSAGE_LENGTH
                    ? "text-destructive font-medium"
                    : "text-muted-foreground"
                }`}
              >
                {messageLength}/{MAX_MESSAGE_LENGTH}
              </span>
            )}
            {messageLength === 0 && <span />}
          </div>
        </div>

        {/* Data Privacy Act (RA 10173) consent */}
        <div className="rounded-md border border-border bg-muted/40 p-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-1 w-4 h-4 accent-primary shrink-0"
            />
            <span className="text-sm text-muted-foreground leading-relaxed">
              I consent to the collection and processing of my personal information (name, student
              number, section, program, and concern details) by Colegio de Montalban for the sole
              purpose of addressing my concern, in accordance with the Data Privacy Act of 2012
              (RA 10173). <span className="text-destructive">*</span>
            </span>
          </label>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="bg-primary text-primary-foreground px-6 py-2.5 rounded-md font-semibold hover:brightness-110 transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? "Submitting..." : "Submit Concern"}
          </button>
        </div>
      </form>
    </div>
  );
}
