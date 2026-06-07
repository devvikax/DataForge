---
phase: 1
plan: 4
wave: 3
depends_on: [1.1]
---

# Plan 1.4: Next.js Scaffold & Neo-Brutalist Design System

## Objective
Bootstrap the Next.js 14 App Router project with TypeScript, Tailwind CSS, and ShadCN UI. Then implement the Neo-Brutalist global design system — CSS variables, typography (Google Fonts), component overrides, and utility classes. After this plan, the frontend dev server runs at `localhost:3000`, displays a styled placeholder page, and all design tokens are defined and usable.

## Context
- .gsd/SPEC.md
- .gsd/phases/1/RESEARCH.md

## Tasks

<task type="auto">
  <name>Scaffold Next.js 14 app with TypeScript, Tailwind CSS, and ShadCN UI</name>
  <files>
    /frontend/  (entire directory created by npx)
    /frontend/components.json
    /frontend/tailwind.config.ts
    /frontend/next.config.ts
  </files>
  <action>
    Run from the PROJECT ROOT (not inside frontend/):

    ```bash
    npx create-next-app@latest frontend --typescript --tailwind --app --no-git --import-alias "@/*" --yes
    ```

    If prompted, accept defaults. This creates the frontend/ directory.

    Then navigate into frontend/ and initialize ShadCN:
    ```bash
    cd frontend
    npx shadcn@latest init --defaults
    ```

    When prompted (if not using --defaults):
    - Style: New York
    - Base color: Zinc
    - CSS variables: Yes

    Add core ShadCN components needed for Phase 1:
    ```bash
    npx shadcn@latest add button card input label form badge separator avatar dropdown-menu sheet sidebar skeleton toast
    ```

    Update `frontend/next.config.ts` to allow cross-origin API images from Cloudinary:
    ```typescript
    import type { NextConfig } from "next";

    const nextConfig: NextConfig = {
      images: {
        remotePatterns: [
          {
            protocol: "https",
            hostname: "res.cloudinary.com",
          },
        ],
      },
    };

    export default nextConfig;
    ```

    Create `frontend/.env.local` (copy from .env.example values):
    ```
    NEXT_PUBLIC_API_URL=http://localhost:8000
    ```
  </action>
  <verify>
    PowerShell:
    ```powershell
    Test-Path "frontend/package.json" -and
    Test-Path "frontend/components.json" -and
    Test-Path "frontend/components/ui/button.tsx" -and
    Test-Path "frontend/app/layout.tsx" -and
    (Select-String -Path "frontend/components.json" -Pattern "new-york" -Quiet)
    ```
    Expected: True
  </verify>
  <done>
    - frontend/ directory created by create-next-app
    - TypeScript and Tailwind CSS configured
    - components.json exists with style: new-york
    - components/ui/ directory exists with ShadCN components
    - next.config.ts allows Cloudinary image hostname
  </done>
</task>

<task type="auto">
  <name>Implement Neo-Brutalist global design system — CSS tokens, typography, and Tailwind config</name>
  <files>
    /frontend/app/globals.css
    /frontend/tailwind.config.ts
    /frontend/app/layout.tsx
    /frontend/lib/fonts.ts
    /frontend/components/ui/neo-card.tsx
    /frontend/components/ui/neo-button.tsx
    /frontend/components/ui/status-badge.tsx
  </files>
  <action>
    REPLACE `frontend/app/globals.css` entirely:
    ```css
    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

    @tailwind base;
    @tailwind components;
    @tailwind utilities;

    @layer base {
      :root {
        /* Neo-Brutalist Color Palette */
        --color-bg: 250 250 250;          /* #FAFAFA */
        --color-surface: 255 255 255;     /* #FFFFFF */
        --color-border: 0 0 0;            /* #000000 */
        --color-accent: 245 177 0;        /* #F5B100 - Yellow */
        --color-accent-hover: 214 155 0;  /* #D69B00 */
        --color-accent-2: 43 91 255;      /* #2B5BFF - Blue */
        --color-danger: 220 38 38;        /* #DC2626 */
        --color-success: 22 163 74;       /* #16A34A */
        --color-warning: 245 158 11;      /* #F59E0B */
        --color-text: 10 10 10;           /* #0A0A0A */
        --color-text-muted: 100 100 100;  /* #646464 */
        --color-text-inverted: 255 255 255;

        /* ShadCN compatibility */
        --background: 250 250 250;
        --foreground: 10 10 10;
        --card: 255 255 255;
        --card-foreground: 10 10 10;
        --popover: 255 255 255;
        --popover-foreground: 10 10 10;
        --primary: 0 0 0;
        --primary-foreground: 255 255 255;
        --secondary: 245 245 245;
        --secondary-foreground: 10 10 10;
        --muted: 245 245 245;
        --muted-foreground: 100 100 100;
        --accent: 245 177 0;
        --accent-foreground: 10 10 10;
        --destructive: 220 38 38;
        --destructive-foreground: 255 255 255;
        --border: 0 0 0;
        --input: 0 0 0;
        --ring: 245 177 0;
        --radius: 0rem;

        /* Typography */
        --font-primary: 'Space Grotesk', system-ui, sans-serif;
        --font-mono: 'JetBrains Mono', 'Courier New', monospace;

        /* Neo-Brutalist Shadows */
        --shadow-sm: 2px 2px 0px rgb(var(--color-border));
        --shadow-md: 4px 4px 0px rgb(var(--color-border));
        --shadow-lg: 6px 6px 0px rgb(var(--color-border));
        --shadow-xl: 8px 8px 0px rgb(var(--color-border));

        /* Borders */
        --border-width: 2px;
        --border-style: solid;
        --border-color: rgb(var(--color-border));
      }
    }

    @layer base {
      * {
        @apply border-border;
      }

      body {
        font-family: var(--font-primary);
        background-color: rgb(var(--color-bg));
        color: rgb(var(--color-text));
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }

      h1, h2, h3, h4, h5, h6 {
        font-family: var(--font-primary);
        font-weight: 700;
        letter-spacing: -0.02em;
      }

      code, kbd, pre, samp {
        font-family: var(--font-mono);
      }

      /* Scrollbar styling */
      ::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }
      ::-webkit-scrollbar-track {
        background: rgb(var(--color-bg));
        border-left: 1px solid rgb(var(--color-border));
      }
      ::-webkit-scrollbar-thumb {
        background: rgb(var(--color-border));
      }
    }

    @layer components {
      /* Neo-Brutalist Card */
      .neo-card {
        background: rgb(var(--color-surface));
        border: var(--border-width) var(--border-style) var(--border-color);
        box-shadow: var(--shadow-md);
        border-radius: 0;
        padding: 1.5rem;
      }

      .neo-card-hover {
        transition: box-shadow 0.1s ease, transform 0.1s ease;
      }
      .neo-card-hover:hover {
        box-shadow: var(--shadow-lg);
        transform: translate(-1px, -1px);
      }

      /* Neo-Brutalist Button */
      .neo-btn {
        border: var(--border-width) var(--border-style) var(--border-color);
        box-shadow: var(--shadow-sm);
        font-weight: 600;
        border-radius: 0;
        transition: box-shadow 0.1s ease, transform 0.1s ease;
        cursor: pointer;
      }
      .neo-btn:hover {
        box-shadow: var(--shadow-md);
        transform: translate(-1px, -1px);
      }
      .neo-btn:active {
        box-shadow: none;
        transform: translate(2px, 2px);
      }

      /* Neo-Brutalist Input */
      .neo-input {
        border: var(--border-width) var(--border-style) var(--border-color);
        border-radius: 0;
        background: rgb(var(--color-surface));
        font-family: var(--font-primary);
        transition: box-shadow 0.1s ease;
      }
      .neo-input:focus {
        outline: none;
        box-shadow: var(--shadow-sm);
      }

      /* Section divider */
      .neo-divider {
        height: 2px;
        background: rgb(var(--color-border));
        border: none;
        margin: 0;
      }

      /* Status pill */
      .neo-pill {
        border: 1.5px solid rgb(var(--color-border));
        font-size: 0.75rem;
        font-weight: 600;
        padding: 0.125rem 0.5rem;
        border-radius: 0;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        font-family: var(--font-mono);
      }
    }

    @layer utilities {
      .font-primary { font-family: var(--font-primary); }
      .font-mono { font-family: var(--font-mono); }
      .neo-shadow-sm { box-shadow: var(--shadow-sm); }
      .neo-shadow-md { box-shadow: var(--shadow-md); }
      .neo-shadow-lg { box-shadow: var(--shadow-lg); }
      .neo-border { border: var(--border-width) var(--border-style) var(--border-color); }
    }
    ```

    REPLACE `frontend/tailwind.config.ts`:
    ```typescript
    import type { Config } from "tailwindcss";

    const config: Config = {
      darkMode: ["class"],
      content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "./lib/**/*.{js,ts,jsx,tsx,mdx}",
      ],
      theme: {
        extend: {
          fontFamily: {
            primary: ["var(--font-primary)", "system-ui", "sans-serif"],
            mono: ["var(--font-mono)", "monospace"],
          },
          colors: {
            border: "rgb(var(--color-border))",
            background: "rgb(var(--color-bg))",
            foreground: "rgb(var(--color-text))",
            surface: "rgb(var(--color-surface))",
            accent: {
              DEFAULT: "rgb(var(--color-accent))",
              hover: "rgb(var(--color-accent-hover))",
            },
            "accent-2": "rgb(var(--color-accent-2))",
            danger: "rgb(var(--color-danger))",
            success: "rgb(var(--color-success))",
            warning: "rgb(var(--color-warning))",
            muted: "rgb(var(--color-text-muted))",
          },
          borderRadius: {
            lg: "0",
            md: "0",
            sm: "0",
            DEFAULT: "0",
          },
          boxShadow: {
            "neo-sm": "2px 2px 0px #000000",
            "neo-md": "4px 4px 0px #000000",
            "neo-lg": "6px 6px 0px #000000",
            "neo-xl": "8px 8px 0px #000000",
          },
          keyframes: {
            "slide-in-from-right": {
              "0%": { transform: "translateX(100%)" },
              "100%": { transform: "translateX(0)" },
            },
            "fade-in": {
              "0%": { opacity: "0" },
              "100%": { opacity: "1" },
            },
            "shake": {
              "0%, 100%": { transform: "translateX(0)" },
              "25%": { transform: "translateX(-4px)" },
              "75%": { transform: "translateX(4px)" },
            },
          },
          animation: {
            "slide-in-right": "slide-in-from-right 0.2s ease-out",
            "fade-in": "fade-in 0.15s ease-out",
            "shake": "shake 0.3s ease-in-out",
          },
        },
      },
      plugins: [require("tailwindcss-animate")],
    };

    export default config;
    ```

    REPLACE `frontend/app/layout.tsx`:
    ```tsx
    import type { Metadata } from "next";
    import "./globals.css";
    import { Toaster } from "@/components/ui/toaster";

    export const metadata: Metadata = {
      title: {
        default: "DataForge",
        template: "%s | DataForge",
      },
      description: "Personal form creation, data collection, and spreadsheet automation platform.",
    };

    export default function RootLayout({
      children,
    }: {
      children: React.ReactNode;
    }) {
      return (
        <html lang="en" suppressHydrationWarning>
          <head>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          </head>
          <body className="min-h-screen bg-background text-foreground font-primary antialiased">
            {children}
            <Toaster />
          </body>
        </html>
      );
    }
    ```

    Create `frontend/components/ui/neo-card.tsx`:
    ```tsx
    import { cn } from "@/lib/utils";

    interface NeoCardProps extends React.HTMLAttributes<HTMLDivElement> {
      hover?: boolean;
    }

    export function NeoCard({ className, hover = false, children, ...props }: NeoCardProps) {
      return (
        <div
          className={cn(
            "neo-card",
            hover && "neo-card-hover cursor-pointer",
            className
          )}
          {...props}
        >
          {children}
        </div>
      );
    }
    ```

    Create `frontend/components/ui/status-badge.tsx`:
    ```tsx
    import { cn } from "@/lib/utils";

    type Status = "pending" | "verified" | "approved" | "rejected" | "completed" | "cancelled" | "archived";

    const statusConfig: Record<Status, { label: string; className: string }> = {
      pending:   { label: "Pending",   className: "bg-yellow-100 text-yellow-900 border-yellow-900" },
      verified:  { label: "Verified",  className: "bg-blue-100 text-blue-900 border-blue-900" },
      approved:  { label: "Approved",  className: "bg-green-100 text-green-900 border-green-900" },
      rejected:  { label: "Rejected",  className: "bg-red-100 text-red-900 border-red-900" },
      completed: { label: "Completed", className: "bg-purple-100 text-purple-900 border-purple-900" },
      cancelled: { label: "Cancelled", className: "bg-gray-100 text-gray-700 border-gray-700" },
      archived:  { label: "Archived",  className: "bg-zinc-100 text-zinc-600 border-zinc-600" },
    };

    interface StatusBadgeProps {
      status: Status;
      className?: string;
    }

    export function StatusBadge({ status, className }: StatusBadgeProps) {
      const config = statusConfig[status] ?? statusConfig.pending;
      return (
        <span className={cn("neo-pill", config.className, className)}>
          {config.label}
        </span>
      );
    }
    ```

    Replace `frontend/app/page.tsx` with a placeholder home page:
    ```tsx
    import Link from "next/link";
    import { NeoCard } from "@/components/ui/neo-card";

    export default function HomePage() {
      return (
        <main className="min-h-screen bg-background flex items-center justify-center p-8">
          <div className="max-w-2xl w-full">
            <div className="mb-8">
              <div className="inline-block bg-accent neo-border neo-shadow-md px-4 py-1 mb-4">
                <span className="font-mono text-sm font-bold uppercase tracking-widest">v1.0</span>
              </div>
              <h1 className="text-6xl font-black tracking-tight mb-2">DataForge</h1>
              <p className="text-lg text-muted font-medium">
                Personal form creation, data collection &amp; spreadsheet automation.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <NeoCard hover className="group">
                <Link href="/admin" className="block">
                  <p className="font-mono text-xs text-muted uppercase tracking-widest mb-2">Admin</p>
                  <h2 className="text-xl font-bold mb-1">Dashboard →</h2>
                  <p className="text-sm text-muted">Manage forms, submissions, and analytics.</p>
                </Link>
              </NeoCard>

              <NeoCard className="opacity-60">
                <p className="font-mono text-xs text-muted uppercase tracking-widest mb-2">Public</p>
                <h2 className="text-xl font-bold mb-1">Submit a Form</h2>
                <p className="text-sm text-muted">Use a form link to submit your response.</p>
              </NeoCard>
            </div>
          </div>
        </main>
      );
    }
    ```
  </action>
  <verify>
    PowerShell:
    ```powershell
    Test-Path "frontend/app/globals.css" -and
    Test-Path "frontend/components/ui/neo-card.tsx" -and
    Test-Path "frontend/components/ui/status-badge.tsx" -and
    (Select-String -Path "frontend/app/globals.css" -Pattern "neo-card" -Quiet) -and
    (Select-String -Path "frontend/tailwind.config.ts" -Pattern "neo-md" -Quiet) -and
    (Select-String -Path "frontend/app/globals.css" -Pattern "Space Grotesk" -Quiet)
    ```
    Expected: True
  </verify>
  <done>
    - globals.css defines all Neo-Brutalist CSS variables and component classes
    - Space Grotesk imported from Google Fonts
    - tailwind.config.ts extends theme with neo-shadow-*, no border-radius
    - layout.tsx uses correct metadata and Toaster
    - NeoCard and StatusBadge custom components exist in components/ui/
    - app/page.tsx shows a styled Neo-Brutalist homepage
    - `npm run dev` in frontend/ starts without errors
  </done>
</task>

## Success Criteria
- [ ] `frontend/` directory exists as a valid Next.js 14 App Router project
- [ ] ShadCN UI initialized with New York style (components.json present)
- [ ] `frontend/components/ui/` contains ShadCN components + NeoCard + StatusBadge
- [ ] `globals.css` defines Neo-Brutalist CSS variables, `.neo-card`, `.neo-btn`, `.neo-input` classes
- [ ] `tailwind.config.ts` has neo-shadow-* utilities and zero border-radius by default
- [ ] Space Grotesk font loaded from Google Fonts in layout.tsx
- [ ] `app/page.tsx` renders a styled homepage that WOWs the user
- [ ] `npm run dev` starts without TypeScript errors
