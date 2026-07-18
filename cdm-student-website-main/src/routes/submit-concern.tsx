import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";

import { submitConcern, type SubmitConcernPayload } from "@/lib/submit-concern-api";



export const Route = createFileRoute("/submit-concern")({
  head: () => ({
    meta: [
      { title: "Submit a Concern — CdM Student Portal" },
      { name: "description", content: "Submit a complaint, question, or suggestion to Colegio de Montalban." },
      { property: "og:title", content: "Submit a Concern — CdM" },
      { property: "og:description", content: "Send complaints, questions, or suggestions directly to your institute." },
    ],
  }),
  component: SubmitConcernPage,
});

const institutes = ["IC", "IE", "IT", "IBEM", "IAS"];
const programs = ["BSIT", "BSCS", "BSCpE"];

function SubmitConcernPage() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;

    setErrorMessage(null);
    setSubmitting(true);

    const form = e.target as HTMLFormElement;
    const fd = new FormData(form);

    const payload: SubmitConcernPayload = {
      last: String(fd.get("last") ?? ""),
      first: String(fd.get("first") ?? ""),
      middle: String(fd.get("middle") ?? "") || undefined,
      studentNumber: String(fd.get("studentNumber") ?? ""),
      section: String(fd.get("section") ?? ""),
      institute: String(fd.get("institute") ?? ""),
      program: String(fd.get("program") ?? ""),
      type: String(fd.get("type") ?? "") as SubmitConcernPayload["type"],
      message: String(fd.get("message") ?? ""),
    };

    try {
      await submitConcern(payload);
      setSubmitted(true);
      form.reset();
      setTimeout(() => setSubmitted(false), 4000);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  const label = "block text-sm font-medium text-foreground mb-1";
  const input =
    "w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40";

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
          Thank you! Your concern has been recorded.
        </div>
      )}

      {errorMessage && (
        <div className="mb-6 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {errorMessage}
        </div>
      )}


      <form
        onSubmit={onSubmit}
        className="bg-card border rounded-lg shadow-sm p-6 grid gap-5"
      >
        <fieldset className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className={label}>Last name</label>
            <input required name="last" className={input} />
          </div>
          <div>
            <label className={label}>First name</label>
            <input required name="first" className={input} />
          </div>
          <div>
            <label className={label}>Middle name</label>
            <input name="middle" className={input} />
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label}>Student Number</label>
            <input required name="studentNumber" className={input} placeholder="20xx-xxxxx" />
          </div>
          <div>
            <label className={label}>Year & Section</label>
            <input required name="section" className={input} placeholder="e.g. 4-A" />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label}>Institute</label>
            <select required name="institute" className={input} defaultValue="">
              <option value="" disabled>Select institute</option>
              {institutes.map((i) => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>
          <div>
            <label className={label}>Program</label>
            <select required name="program" className={input} defaultValue="">
              <option value="" disabled>Select program</option>
              {programs.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>

        <div>
          <span className={label}>Type of Concern</span>
          <div className="flex flex-wrap gap-4 mt-1">
            {["Complaint", "Question", "Suggestion"].map((t) => (
              <label key={t} className="inline-flex items-center gap-2 text-sm">
                <input type="radio" required name="type" value={t} className="accent-[oklch(0.38_0.14_25)]" />
                {t}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className={label}>Message</label>
          <textarea required name="message" rows={5} className={input} placeholder="Describe your concern in detail..." />
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