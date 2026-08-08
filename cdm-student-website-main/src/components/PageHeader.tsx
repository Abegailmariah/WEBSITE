import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: ReactNode;
  badge?: string;
}

/**
 * Consistent page header used across all pages.
 * Renders an optional badge pill, a title, and a subtitle.
 */
export function PageHeader({ title, subtitle, badge }: PageHeaderProps) {
  return (
    <header className="mb-8">
      {badge && (
        <span className="inline-block bg-secondary text-secondary-foreground px-3 py-1 rounded-full text-xs font-semibold mb-4">
          {badge}
        </span>
      )}
      <h1 className="text-3xl sm:text-4xl font-extrabold text-primary tracking-tight">{title}</h1>
      {subtitle && <p className="text-muted-foreground mt-1 max-w-2xl">{subtitle}</p>}
    </header>
  );
}
