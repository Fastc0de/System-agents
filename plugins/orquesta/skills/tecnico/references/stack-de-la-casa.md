# House stack

The default technology for orquesta projects. Using one stack everywhere makes builds predictable, reviews faster and the person never has to choose technologies. The architect uses it unless the product needs something it cannot do (a native phone app, heavy real-time, an existing codebase in another stack). Any deviation is recorded in `docs/tecnico/arquitectura.md` with its reason, and in memory as a decision.

Use the latest stable version of each tool at project start, pinned in the lockfile. Check current versions and setup commands in the official docs (WebFetch) rather than from memory.

## Web app (default)

| Concern | Choice | Why |
| --- | --- | --- |
| Language | TypeScript | One language front and back; types catch mistakes early |
| App framework | Next.js (App Router) | Pages and server in one project; one command to run; easy hosting |
| Styles | Tailwind CSS v4, themed only by the project's `tokens.css` (`docs/diseno/`) | Every screen uses the same design tokens |
| Typefaces | `next/font/google`, the families of `tokens.json` | Self-hosted, no layout shift |
| Server logic | Next.js route handlers (`src/app/api/**`) calling plain modules in `src/server/**` | Thin HTTP layer, testable logic |
| Validation | Zod | One schema validates input and documents the contract |
| Database | Prisma ORM · SQLite in development, PostgreSQL in production | Zero-setup local work; the same schema in production |
| Sign-in | Auth.js, unless the product needs something else | Proven sessions and password handling |
| Email | A transactional email provider behind `src/server/email/**` | Swappable; fakeable in tests |
| Payments | Stripe behind `src/server/pagos/**` (only when the product needs payments) | Test mode for safe testing |
| Unit tests | Vitest with two projects: `backend` (node) and `frontend` (jsdom + Testing Library); files next to the code (`*.test.ts(x)`) | Fast quick tests (level 1); each builder runs only its side |
| Acceptance, journeys, regression | Playwright Test (browser and API requests) under `tests/` | One runner for the whole testing team |
| Hosting (when the person approves the cost) | Vercel + managed PostgreSQL | Free or low tiers for small apps; confirm current prices before quoting |

## Zones (`docs/tecnico/zonas.json`)

Which files each builder may write. Adjust to the real tree; keep frontend and backend disjoint.

A glob starting with `!` excludes: the frontend owns `src/app/` except the API routes.

```json
{
  "frontend": [
    "src/app/**", "!src/app/api/**", "src/components/**", "src/hooks/**", "public/**"
  ],
  "backend": [
    "src/app/api/**", "src/server/**", "prisma/**", "src/middleware.ts", "src/auth.ts"
  ],
  "compartido": [
    "package.json", "package-lock.json", "tsconfig.json", "next.config.*", "tailwind.config.*",
    "postcss.config.*", "eslint.config.*", "vitest.config.*", "vitest.setup.*", "src/lib/shared/**", "src/types/**",
    ".env.example", ".gitignore", "README.md"
  ]
}
```

Shared files may be changed by either builder, but never by two at the same time: the board must not run two WPs in parallel if both touch a shared file.

## Commands (`docs/tecnico/comandos.json`)

The quick-test hook runs `pruebas_rapidas.<frontend|backend>` when a builder finishes; the reviewer and the testing team read the rest.

```json
{
  "instalar": "npm install",
  "arrancar": "npm run dev",
  "url": "http://localhost:3000",
  "preparar_datos": "npx prisma migrate dev && npx prisma db seed",
  "pruebas_rapidas": {
    "frontend": "npx vitest run --project frontend --passWithNoTests",
    "backend": "npx vitest run --project backend --passWithNoTests",
    "todas": "npx vitest run --passWithNoTests"
  },
  "verificacion": "npm run lint && npx tsc --noEmit && npx vitest run --passWithNoTests",
  "pruebas_aceptacion": "npx playwright test -c tests/e2e/playwright.config.ts tests/aceptacion",
  "pruebas_e2e": "npx playwright test -c tests/e2e/playwright.config.ts tests/e2e",
  "pruebas_regresion": "npx playwright test -c tests/e2e/playwright.config.ts tests/regresion"
}
```

`--passWithNoTests` keeps an empty area from failing the quick tests. Commands run from the project root. The two Vitest projects keep each builder's quick tests on its own side, so a backend WP built in parallel never blocks the frontend builder (and the other way round).

## Walking skeleton (always WP-001 backend + WP-002 frontend)

The first two work packages make everything else possible.

**WP-001 · backend · Esqueleto y herramientas**
- Generate the Next.js app (TypeScript, Tailwind, ESLint, `src/` directory) with the official generator. The generator also creates starter frontend files; that is the one accepted exception to the zones, and WP-002 takes them over.
- Prisma with SQLite, an initial migration and a seed script.
- Vitest configured with two projects (check the current Vitest docs for the syntax):
  - `backend`: environment `node`, includes `src/server/**/*.test.ts` and `src/app/api/**/*.test.ts`.
  - `frontend`: environment `jsdom`, includes `src/components/**/*.test.{ts,tsx}`, `src/hooks/**/*.test.{ts,tsx}` and `src/app/**/*.test.tsx`, excludes `src/app/api/**`; a setup file with `@testing-library/jest-dom`; dev dependencies `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@vitejs/plugin-react`.
  - One trivial passing test under `src/server/`. `npx vitest run --project frontend --passWithNoTests` must pass too.
- `@playwright/test` as a dev dependency (the testing team writes `tests/e2e/playwright.config.ts` and every test under `tests/`).
- `.env.example` listing every variable; `.env` ignored by git.
- Every command in `comandos.json` works; the reviewer of WP-001 runs them all.

**WP-002 · frontend · Base visual** (from the design system in `docs/diseno/`)
- `docs/diseno/tokens.css` copied unchanged to `src/app/tokens.css` and imported after Tailwind in `src/app/globals.css`; the page base (background `fondo`, text `texto`, text face) set there.
- The typefaces of `tokens.json` loaded with `next/font/google`, `variable: "--fuente-titulos"` / `"--fuente-texto"` on `<body>`.
- The root layout and the base components of the gallery of `referencia.html` in `src/components/ui/` (button, field, card or list row, notice, empty state, skeleton, top bar…), each with all its states and a quick test.
- The home page. No hex values, font names or default Tailwind palette anywhere outside `src/app/tokens.css`.
