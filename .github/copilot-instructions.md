# Copilot Instructions for AI Hero App

## Architecture Overview

- **Frontend**: Next.js with React, using Vercel AI SDK's `@ai-sdk/react` for LLM chat (`src/app/chat.tsx`). Pre-built components live in `src/components` (dash-case naming).
- **Backend**: Next.js API routes, main LLM endpoint at `src/app/api/chat/route.ts` using Vercel AI SDK's `ai` package. Model config in `src/models.ts`.
- **Database**: Postgres via Drizzle ORM (`src/server/db/schema.ts`, `src/server/db/queries.ts`). Redis for caching (`src/server/redis/redis.ts`).
- **Auth**: NextAuth, configured in `src/server/auth/index.ts` and `src/server/auth/config.ts`.
- **Env Vars**: Declared in `.env`, validated in `src/env.js` using `@t3-oss/env-nextjs`.

## Important Files

- `src/app/chat.tsx`: Client chat page, main `useChat` logic.
- `src/app/api/chat/route.ts`: API route for LLM streaming.
- `src/models.ts`: LLM model declarations (default: Google Gemini).
- `src/components/`: Dash-case React components (e.g., `auth-button.tsx`).
- `src/server/db/schema.ts`: Drizzle ORM schema.
- `src/server/db/queries.ts`: DB helper functions.
- `src/server/auth/index.ts`: NextAuth config and helpers.
- `.env` and `src/env.js`: Environment variables and validation.

## Key Patterns & Conventions

- Prefer dash-case for file names (e.g., `auth-button.tsx`).
- Prefer TypeScript. Use `import type { ... }` for type-only imports.
- Use `lucide-react` for icons, with `size-*` utility classes (not `h-*`/`w-*`).
- Use `sonner` for toasts.
- Prefer non-optional props in components.
- Use `pnpm` for package management.

## Developer Workflows

- Install: `pnpm install`
- Start DB: `./start-database.sh`
- Start Redis: `./start-redis.sh`
- Dev Server: `pnpm dev`
- Migrate DB: `pnpm run db:push` (after schema changes)
- Lint/Typecheck: `pnpm check`, `pnpm lint`, `pnpm typecheck`

## Integration Points

- LLM Model: Update/add in `src/models.ts` (install relevant `@ai-sdk/*` package).
- Chat API: POST `/api/chat` streams LLM responses; frontend uses `useChat`.
- Environment: All secrets/keys in `.env`, validated in `src/env.js`.

## Examples

- Add new LLM provider: install `@ai-sdk/*`, update `src/models.ts`.
- Add new component: place in `src/components` (dash-case, TypeScript).
- Update env vars: edit `.env`, update schema in `src/env.js`.

## AI Agent Guidance

- After code changes, prompt for followup questions (see `.cursor/rules/behavior.mdc`).
- Reference `src/app/chat.tsx` and `src/app/api/chat/route.ts` for chat logic.
- Use the scripts and conventions above for all build, test, and dev tasks.

---

For more details, see `README.md` and `.cursor/rules/important-files.mdc`.
