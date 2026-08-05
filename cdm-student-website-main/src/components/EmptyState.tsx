interface EmptyStateProps {
  icon?: "announcement" | "concern" | "search";
  title: string;
  description: string;
}

const icons = {
  announcement: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-16 w-16 mx-auto text-primary/40"
      aria-hidden="true"
    >
      <path d="M3 11v3a1 1 0 0 0 1 1h2l3 4V6L6 10H4a1 1 0 0 0-1 1Z" />
      <path d="M13 8.5a4 4 0 0 1 0 7" />
      <path d="M16 5.5a8 8 0 0 1 0 13" />
    </svg>
  ),
  concern: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-16 w-16 mx-auto text-primary/40"
      aria-hidden="true"
    >
      <rect width="18" height="14" x="3" y="5" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </svg>
  ),
  search: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-16 w-16 mx-auto text-primary/40"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  ),
};

/**
 * Reusable empty-state block with an inline SVG illustration.
 */
export function EmptyState({ icon = "announcement", title, description }: EmptyStateProps) {
  return (
    <div className="rounded-lg border bg-card p-10 text-center">
      <div className="mb-3">{icons[icon]}</div>
      <p className="text-lg font-medium text-foreground">{title}</p>
      <p className="text-sm text-muted-foreground mt-1">{description}</p>
    </div>
  );
}
