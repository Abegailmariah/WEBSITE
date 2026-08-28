import { createFileRoute } from "@tanstack/react-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { submitConcern, type SubmitConcernPayload } from "@/lib/submit-concern-api";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

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

const concernTypes = ["Complaint", "Question", "Suggestion"] as const;

const MAX_MESSAGE_LENGTH = 2000;

const formSchema = z.object({
  last: z.string().trim().min(1, "Last name is required").max(120, "Maximum 120 characters"),
  first: z.string().trim().min(1, "First name is required").max(120, "Maximum 120 characters"),
  middle: z.string().trim().max(120, "Maximum 120 characters").optional(),
  studentNumber: z
    .string()
    .trim()
    .min(1, "Student number is required")
    .regex(/^\d{2}-\d{5}$/, "Must match format YY-NNNNN (e.g., 24-00123)"),
  section: z
    .string()
    .trim()
    .min(1, "Year & Section is required")
    .max(120, "Maximum 120 characters"),
  institute: z.string().trim().min(1, "Please select an institute"),
  program: z.string().trim().min(1, "Please select a program"),
  type: z.enum(concernTypes, {
    errorMap: () => ({ message: "Please select a type of concern" }),
  }),
  message: z
    .string()
    .trim()
    .min(1, "Message is required")
    .max(MAX_MESSAGE_LENGTH, `Maximum ${MAX_MESSAGE_LENGTH} characters`),
  consent: z.boolean().refine((val) => val === true, {
    message: "Please consent to the data privacy policy to continue.",
  }),
});

type FormValues = z.infer<typeof formSchema>;

const defaultValues: FormValues = {
  last: "",
  first: "",
  middle: "",
  studentNumber: "",
  section: "",
  institute: "",
  program: "",
  type: undefined as unknown as FormValues["type"],
  message: "",
  consent: false,
};

function SubmitConcernPage() {
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const messageLength = form.watch("message")?.length ?? 0;

  const onSubmit = async (values: FormValues) => {
    setErrorMessage(null);

    const payload: SubmitConcernPayload = {
      ...values,
      middle: values.middle?.trim() ? values.middle.trim() : undefined,
    };

    try {
      await submitConcern(payload);
      setSubmitted(true);
      toast.success("Concern submitted!", {
        description: "Thank you! Your concern has been recorded.",
      });
      form.reset(defaultValues);
      setTimeout(() => setSubmitted(false), 15000);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Submission failed";
      setErrorMessage(message);
      toast.error("Submission failed", {
        description: message,
      });
    }
  };

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

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="bg-card border rounded-lg shadow-sm p-6 grid gap-5"
        >
          <fieldset className="grid gap-4 sm:grid-cols-3">
            <FormField
              control={form.control}
              name="last"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Last name <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input maxLength={120} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="first"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    First name <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input maxLength={120} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="middle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Middle name</FormLabel>
                  <FormControl>
                    <Input maxLength={120} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="studentNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Student Number <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. 24-00000" maxLength={8} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="section"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Year & Section <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. 4-A" maxLength={120} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="institute"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Institute <span className="text-destructive">*</span>
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select institute" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {institutes.map((i) => (
                        <SelectItem key={i} value={i}>
                          {i}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="program"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Program <span className="text-destructive">*</span>
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select program" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {programs.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Type of Concern <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    value={field.value}
                    className="flex flex-wrap gap-x-4 gap-y-2 mt-1"
                  >
                    {concernTypes.map((t) => (
                      <label
                        key={t}
                        className="inline-flex items-center gap-2 text-sm py-1.5 cursor-pointer"
                      >
                        <RadioGroupItem value={t} />
                        {t}
                      </label>
                    ))}
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="message"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Message</FormLabel>
                <FormControl>
                  <Textarea
                    rows={5}
                    placeholder="Describe your concern in detail..."
                    maxLength={MAX_MESSAGE_LENGTH}
                    {...field}
                  />
                </FormControl>
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
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Data Privacy Act (RA 10173) consent */}
          <FormField
            control={form.control}
            name="consent"
            render={({ field }) => (
              <FormItem className="rounded-md border border-border bg-muted/40 p-4 space-y-0">
                <label className="flex items-start gap-3 cursor-pointer">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="mt-1 shrink-0"
                    />
                  </FormControl>
                  <span className="text-sm text-muted-foreground leading-relaxed">
                    I consent to the collection and processing of my personal information (name,
                    student number, section, program, and concern details) by Colegio de Montalban
                    for the sole purpose of addressing my concern, in accordance with the Data
                    Privacy Act of 2012 (RA 10173). <span className="text-destructive">*</span>
                  </span>
                </label>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={form.formState.isSubmitting}
              className="px-6 py-2.5 h-auto"
            >
              {form.formState.isSubmitting ? "Submitting..." : "Submit Concern"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
