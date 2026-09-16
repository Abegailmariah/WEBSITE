type LogoProps = {
  /** Tailwind classes controlling size, e.g. "w-10 h-10". */
  className?: string;
  /** Accessible name. Omit when the badge sits next to text that already
   *  names the school, so screen readers don't announce it twice. */
  title?: string;
};

/**
 * CdM monogram badge — an original emblem for the system, drawn inline so it
 * needs no image asset and scales crisply at any size.
 *
 * Colours come from the design system via Tailwind's fill/stroke utilities
 * (`fill-secondary` gold disc, `fill-primary`/`stroke-primary` navy green
 * artwork), which resolve to the --color-* theme variables in styles.css — so
 * the mark follows any palette change automatically.
 *
 * Layout is centred on a 48x48 viewBox: gold disc, inset navy ring,
 * graduation cap, then the "CdM" monogram.
 */
export function Logo({ className, title }: LogoProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}

      {/* Gold disc */}
      <circle cx="24" cy="24" r="23.5" className="fill-secondary" />

      {/* Inset navy green ring */}
      <circle
        cx="24"
        cy="24"
        r="20"
        fill="none"
        className="stroke-primary"
        strokeWidth="1.5"
        opacity="0.85"
      />

      {/* Graduation cap */}
      <path d="M24 12.2 31.4 16.3 24 20.4 16.6 16.3Z" className="fill-primary" />
      <path d="M31.4 16.3v4.4" className="stroke-primary" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="31.4" cy="21.8" r="1.1" className="fill-primary" />

      {/* CdM monogram */}
      <text
        x="24"
        y="34.6"
        textAnchor="middle"
        className="fill-primary font-display"
        fontSize="12.4"
        fontWeight="800"
        letterSpacing="-0.2"
      >
        CdM
      </text>
    </svg>
  );
}
