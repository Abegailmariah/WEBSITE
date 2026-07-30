# CdM Announcement System — Student Portal

Colegio de Montalban student portal built with TanStack React Start, featuring:

- **Announcements** — Real-time official updates from institutes
- **Submit Concern** — Complaints, questions, and suggestions form
- **Responsive Design** — Tailwind CSS v4 with dark mode support

## Tech Stack

- **Framework**: TanStack React Start (React 19, TypeScript)
- **Routing**: TanStack Router (file-based)
- **Styling**: Tailwind CSS v4 + tw-animate-css
- **State**: TanStack React Query
- **UI**: Radix UI Primitives + shadcn/ui components
- **Build**: Vite 8

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Project Structure

```
Website/
├── src/
│   ├── routes/          # File-based route definitions
│   │   ├── __root.tsx   # Root layout + error boundary
│   │   ├── index.tsx    # Homepage
│   │   ├── announcements.tsx
│   │   └── submit-concern.tsx
│   ├── components/      # Reusable React components
│   │   ├── Navbar.tsx
│   │   └── ui/          # shadcn/ui primitives
│   ├── lib/             # Utilities & API helpers
│   │   ├── submit-concern-api.ts
│   │   ├── error-capture.ts
│   │   ├── error-page.ts
│   │   ├── lovable-error-reporting.ts
│   │   └── utils.ts
│   ├── hooks/
│   ├── router.tsx
│   ├── routeTree.gen.ts
│   ├── server.ts
│   ├── start.ts
│   └── styles.css       # Tailwind + design tokens
├── public/
│   └── favicon.ico
├── package.json
├── tsconfig.json
├── vite.config.ts
└── ...
```
