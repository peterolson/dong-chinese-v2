# Dong Chinese — Project Guide

## What This Project Is

Dong Chinese is a Chinese language learning app (dong-chinese.com). This is a ground-up rebuild of the existing Meteor.js application. The goal is a faster, more modern architecture that supports web, Android, and iOS from a single codebase.

The existing production app uses Meteor with MongoDB. We are migrating to SvelteKit with Postgres. Existing users must be able to log in with their current credentials — their accounts and progress data must be preserved through the migration.

## Architecture Principles (Non-Negotiable)

### Progressive Enhancement / No-JS Baseline

Every feature MUST work without JavaScript enabled. This is the single most important architectural constraint.

- All forms use SvelteKit form actions (`+page.server.ts` / `+server.ts`) as the primary interaction method
- Client-side JS is layered on top via `use:enhance` and Svelte reactivity for a smoother experience
- Never build a feature that only works with JS — always start with the server-rendered, no-JS version first
- Navigation uses real `<a>` tags and full page loads as the baseline; client-side routing is an enhancement
- Modals and overlays are progressive enhancements — they must have a full-page fallback (see dictionary explain modal pattern)

### Local-First (JS Enhancement Layer)

When JavaScript IS available, the app should feel instant:

- Offline support via service worker for caching and IndexedDB/local DB for data
- Progress syncs to the server when connectivity is available
- Users can download lesson content and media for offline use (trains, airplanes)
- The local-first sync layer is purely a JS enhancement — without JS, the app is a normal server-rendered app hitting Postgres directly

### Performance

- Target sub-100ms server response times for page loads
- Use SvelteKit streaming where appropriate — render the shell immediately, stream data
- Aggressively cache static/rarely-changing content (dictionary data, character breakdowns) using Cache-Control headers and CDN edge caching with stale-while-revalidate, NOT prerendering (too many pages, content is editable)
- Minimal client-side JS bundle — Svelte's compiler output is already small, keep it that way

### Anonymous-First Authentication

- Users can use the app without creating an account
- An anonymous session (cookie-based) is created on first visit via server hook
- Progress is tracked against the session ID
- When the user creates an account or logs in, all progress from the current anonymous session is merged into their user account
- Progress merge is additive: all rows from the anonymous session are re-assigned to the user account
- After merge, anonymous progress rows are deleted in the same transaction
- If they never create an account, anonymous session data expires after a configurable period (default: 30 days)
- Better Auth's anonymous plugin was evaluated and **rejected** — it creates fake user records, has no transactional merge, and requires explicit client calls. Custom cookie + DB row approach is used instead.

## Tech Stack

| Layer                | Technology                         | Notes                                                                                                |
| -------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Framework            | SvelteKit (Svelte 5)               | TypeScript throughout, adapter-node for deployment                                                   |
| Database             | PostgreSQL                         | Docker Compose for local dev (port 5434), Supabase for prod                                          |
| ORM                  | Drizzle ORM                        | postgres.js client. 3 schemas: `public`, `stage`, `dictionary`. `drizzle-kit push` for dev.          |
| Auth                 | Better Auth                        | bcrypt-compatible with Meteor hashes. Email/password + GitHub/Google/Facebook OAuth + magic links.   |
| Styling              | Vanilla CSS with custom properties | No Tailwind. Dark mode via `data-theme` attribute on `<html>`. CSS custom properties for all tokens. |
| Testing - Unit       | Vitest                             | 3 projects: client (browser), server (node), storybook (browser)                                     |
| Testing - E2E        | Playwright                         | Test both with-JS and without-JS scenarios                                                           |
| Testing - Components | Storybook 10                       | Svelte CSF with `defineMeta` + `<Story>` pattern. Play functions auto-run as Vitest tests.           |
| Mobile               | Capacitor                          | For Android initially. iOS as PWA first, native later.                                               |
| CI/CD                | GitHub Actions                     | Lint, type-check, unit tests, Playwright with Postgres service container. Dictionary sync crons.     |
| Linting/Formatting   | ESLint + Prettier                  | Flat config with Svelte and Storybook plugins                                                        |
| TTS                  | Azure Speech Services              | Token endpoint at `/api/tts/token`, browser SpeechSynthesis as fallback                              |

## Project Structure

```
src/
├── lib/
│   ├── assets/                    # Binary assets (fonts, images)
│   ├── components/
│   │   ├── auth/                  # Auth UI (auth-card, social-icon, password-input, magic-link-form)
│   │   ├── dictionary/            # Dictionary UI (character-view, breakdown, glyph, stroke-animation, etc.)
│   │   ├── layout/                # App shell (site-header, sidebar, auth-status)
│   │   ├── ui/                    # Reusable primitives (alert, button, modal, segmented-control, speak-button, tab-bar)
│   │   └── wiki/                  # Wiki editing UI (char-edit-form, component-editor, field-diff, wiki-sidebar, etc.)
│   ├── data/                      # Static data modules (component-type-info.ts, common-sources.ts)
│   ├── server/
│   │   ├── db/
│   │   │   ├── schema.ts          # Main Drizzle schema (public schema — users, sessions, settings, permissions)
│   │   │   ├── stage.schema.ts    # Stage schema (unihan_raw, cedict_raw, sync_metadata)
│   │   │   ├── dictionary.schema.ts # Dictionary schema (char_base, char_manual)
│   │   │   ├── dictionary.views.ts # Drizzle view declarations (charView — .as() managed by drizzle-kit)
│   │   │   ├── char-view-sql.ts   # Shared char view SQL (single source of truth for views.ts + scripts)
│   │   │   ├── auth.schema.ts     # Auto-generated Better Auth schema
│   │   │   └── index.ts           # DB connection + exports
│   │   ├── services/
│   │   │   ├── anonymous-session.ts # Cookie + DB row anonymous sessions
│   │   │   ├── char-edit.ts       # Submit/approve/reject/rollback character edits, recent edits, pending counts
│   │   │   ├── dictionary.ts      # Dictionary queries (character lookup, search, character lists)
│   │   │   ├── email.ts           # Nodemailer email service
│   │   │   ├── magic-link.ts      # Magic link generation + verification
│   │   │   ├── permissions.ts     # User permission queries (hasPermission, getUserPermissions)
│   │   │   ├── sanitize-redirect.ts # Open redirect prevention
│   │   │   ├── settings.ts        # User settings persistence (JSON cookie + DB)
│   │   │   └── user.ts            # User name resolution (batch lookup)
│   │   └── auth.ts                # Better Auth config (bcrypt override, OAuth providers, plugins)
│   ├── orthography/               # Phonetic script converters (pinyin → zhuyin, wade-giles, gwoyeu, cyrillic)
│   ├── types/
│   │   └── dictionary.ts          # CharacterData, ComponentData, WordData, etc.
│   ├── pinyin.ts                  # Pinyin parsing/formatting utilities
│   ├── settings.ts                # Shared settings types + defaults (theme, characterSet, phoneticScript)
│   ├── settings-client.svelte.ts  # Client-side settings (reactive Svelte state)
│   └── speech.ts                  # TTS with Azure Speech + browser fallback
├── routes/
│   ├── (app)/
│   │   ├── dictionary/            # Dictionary pages
│   │   │   ├── [entry]/           # Character/word detail view
│   │   │   └── explain/[type]/    # Component type explanation pages
│   │   ├── settings/              # User settings page
│   │   ├── +layout.svelte         # App shell (header, sidebar)
│   │   └── +page.svelte           # Home/dashboard
│   ├── (auth)/
│   │   ├── login/                 # Login (email/password + OAuth + magic link)
│   │   ├── register/              # Sign up
│   │   ├── forgot-password/       # Password reset request
│   │   └── reset-password/        # Password reset with token
│   ├── (wiki)/
│   │   └── wiki/                  # Character wiki (home, search, lists, [character], edit, history, pending, recent-changes)
│   ├── api/
│   │   ├── dictionary/explain/[type]/ # JSON API for component explanations
│   │   └── tts/token/             # Azure TTS auth token
├── hooks.server.ts                # Server hooks: Better Auth → anonymous session → settings
└── app.html                       # HTML template with data-theme injection
scripts/
├── import-meteor-users.ts         # Migrate users from MongoDB
├── import-permissions.ts          # Import wikiEdit permissions from MongoDB
└── dictionary/
    ├── import-unihan.ts           # Unicode Unihan (1.56M rows)
    ├── import-cedict.ts           # CC-CEDICT (124k entries)
    ├── import-dong-dictionary.ts  # Dong Chinese MongoDB wiki
    ├── import-animcjk.ts          # Stroke order SVGs
    ├── import-makemeahanzi.ts     # Character decomposition
    ├── import-shuowen.ts          # Etymology data
    ├── import-baxter-sagart.ts    # Old Chinese reconstructions
    ├── import-zhengzhang.ts       # Zhengzhang historical phonology
    ├── import-jun-da-char-freq.ts # Character frequency corpus
    ├── import-subtlex-ch.ts       # Subtitle frequency corpus
    ├── rebuild-dict-char.ts       # Rebuild denormalized char cache (re-creates char view)
    └── create-char-view.ts        # Create/replace dictionary.char view
.storybook/
├── main.ts                        # Config with viteFinal aliases for $app/paths and $env/dynamic/public
├── preview.ts                     # Preview config
├── vitest.setup.ts                # Storybook vitest integration
└── mocks/
    ├── app-paths.ts               # Mock $app/paths (resolve strips route groups)
    └── env-dynamic-public.ts      # Mock $env/dynamic/public
```

## Getting Started

1. `npm install` — install dependencies
2. `npm run db:start` — start the Postgres Docker containers (dev on port 5434, test on port 5435)
3. `npm run db:push` — push Drizzle schema to the dev database (use `--force` if schema is out of sync)
4. `npm run db:test:push` — push Drizzle schema to the test database (used by `vitest` integration tests)
5. Copy `.env.example` to `.env` and fill in secrets (DATABASE_URL must use port 5434)
6. `npm run dev` — start the dev server

For dictionary data: `npm run dictionary:sync` runs all import scripts. Individual scripts: `npm run dictionary:import-unihan`, etc.

For Storybook: `npm run storybook` (port 6006). If Playwright browsers are missing: `npx playwright install chromium`.

## Database Schemas

The project uses 3 Postgres schemas:

- **`public`** — Auth tables (Better Auth managed), `anonymous_session`, `user_settings`, `user_permission`, progress tables
- **`stage`** — Raw imported data: `unihan_raw` (EAV, 1.56M rows), `cedict_raw` (124k entries), `sync_metadata`. Used for data exploration and materialized view generation.
- **`dictionary`** — `char_base` (materialized from stage sources), `char_manual` (append-only edit log with approval workflow), `char` (view overlaying approved edits on base). Serves the actual app queries.

Drizzle config (`drizzle.config.ts`) has `schemaFilter: ['public', 'stage', 'dictionary']`.

## Auth Implementation

### Architecture

Auth is configured in `src/lib/server/auth.ts`. Server hooks in `hooks.server.ts` run in sequence:

1. **Better Auth handler** — sessions, OAuth callbacks
2. **Anonymous session** — creates/validates cookie + DB row for unauthenticated visitors
3. **Settings injection** — loads user settings from DB (authenticated) or cookie (anonymous)

### Key Decisions

- **No anonymous plugin** — custom `anonymous_session` table with cookie-based tracking
- **Meteor bcrypt compatibility** — custom password hash/verify override in Better Auth config. Meteor's `$2a$`/`$2b$` bcrypt hashes work as-is.
- **Multi-email login** — `user_email` table maps secondary emails to primary. Login resolves secondary → primary before auth check.
- **Magic links** — form action sends magic link email, works without JS
- **OAuth** — GitHub, Google, Facebook conditionally configured via env vars. Server-side redirects work without JS.
- **Username support** — Better Auth `username` plugin. Login field detects email vs username by presence of `@`.

### Meteor User Migration

Import script at `scripts/import-meteor-users.ts` (`npm run import:users`). Migrates ~24k users from MongoDB preserving bcrypt hashes and OAuth provider IDs.

## Storybook Conventions

- **Svelte CSF** with `@storybook/addon-svelte-csf` — use `defineMeta` + `<Story>` pattern, NOT CSF3 JS format
- Story files: `*.stories.svelte` alongside their components
- **Cannot use `+` prefix** in story filenames (reserved by SvelteKit) — route page stories go in `src/lib/components/` instead
- Play functions auto-run as Vitest tests via `@storybook/addon-vitest`
- `use:enhance` and SvelteKit actions are auto-mocked by `@storybook/sveltekit`
- Custom Vite aliases in `.storybook/main.ts` mock `$app/paths` and `$env/dynamic/public`

## Code Style & Conventions

- TypeScript strict mode, no `any` types
- Prefer `const` over `let`
- Use named exports, not default exports (except where SvelteKit requires default exports)
- Error handling: use explicit error types, not thrown strings. Prefer Result pattern where practical.
- SQL: Drizzle's query builder for simple queries, `sql` template tag for complex ones. No raw string concatenation.
- Components: one component per file, props typed with TypeScript interfaces. Always use existing `ui/` primitives (`Button`, `Alert`, `Modal`, etc.) instead of writing bespoke HTML+CSS. If a needed variant doesn't exist, extend the shared component.
- File naming: `kebab-case` for files, `PascalCase` for components
- CSS: vanilla CSS with custom properties, dark mode via CSS custom properties (`--foreground`, `--background`, `--surface`, `--border`, `--muted-foreground`, etc.)

## Testing

- **Vitest**: 3 test projects configured in `vite.config.ts`:
  - `client` (browser environment) — component and client-side logic tests
  - `server` (node environment) — service, auth, and server-side tests. Uses a **separate test database** (port 5435) to avoid wiping dev data. The `vitest.setup.ts` file mocks `$env/dynamic/private` to redirect `DATABASE_URL`. In CI, the override is skipped (CI uses its own ephemeral Postgres).
  - `storybook` (browser) — auto-runs all story play functions
- **Playwright**: E2E tests in `e2e/` directory, tests both JS-enabled and JS-disabled modes
- **CI**: GitHub Actions runs lint, type-check, Vitest, and Playwright on every push/PR to master

## What NOT to Do

- Do not use Tailwind or any utility-first CSS framework
- Do not use any ORM other than Drizzle
- Do not add client-side routing libraries — SvelteKit handles this
- Do not store sensitive data in localStorage or sessionStorage
- Do not build any feature that requires JavaScript to function at a basic level
- Do not add dependencies without justification — keep the dependency tree small
- Do not use `fetch` for form submissions that could be native form POSTs
- Do not implement IAP / Apple StoreKit — payments are Stripe-only for now

## Project Tracking

Maintain a `TODO.md` file in the project root. After completing any feature or task, update TODO.md to reflect what was done and what's next. The file should have three sections:

- **Done**: Completed features with a one-line description of what was implemented
- **In Progress**: What's currently being worked on
- **Up Next**: The prioritized backlog of features to implement

When starting a new session, read TODO.md first to understand the current state of the project. When finishing a task, update TODO.md before moving on.

## Keeping Documentation Up to Date

This project has documentation at multiple levels. When making changes, update the relevant docs as part of the same commit — don't leave them to go stale.

### What to update and when

- **This file (`CLAUDE.md`)**: Update when architecture decisions change, new technologies are added, conventions are established, or the project structure changes significantly (new top-level directories, new route groups, new DB schemas).
- **Subdirectory `CLAUDE.md` files**: Update when adding, removing, or significantly changing components/services/routes in that directory. These live in `src/lib/components/`, `src/lib/server/`, `src/routes/`, `scripts/`, and `e2e/`.
- **`TODO.md`**: Update after completing any feature or task (move to Done, update In Progress/Up Next).
- **`README.md`**: Update when setup steps change, new npm scripts are added, or the tech stack changes.
- **Project Structure tree** (above): Update when top-level files or directories are added/removed.

### Rules

- If you add a new route, component, service, or script, add it to the relevant `CLAUDE.md`.
- If you delete a file or directory, remove references to it from all docs.
- If you change a DB schema, update both this file and `src/lib/server/CLAUDE.md`.
- If you add a new npm script, make sure it's documented in `scripts/CLAUDE.md` or `README.md` as appropriate.
- Keep descriptions concise — a table row or one-liner is enough. Don't duplicate implementation details that are clear from reading the code.

## MCP

You are able to use the Svelte MCP server, where you have access to comprehensive Svelte 5 and SvelteKit documentation. Here's how to use the available tools effectively:

### Available MCP Tools:

#### 1. list-sections

Use this FIRST to discover all available documentation sections. Returns a structured list with titles, use_cases, and paths.
When asked about Svelte or SvelteKit topics, ALWAYS use this tool at the start of the chat to find relevant sections.

#### 2. get-documentation

Retrieves full documentation content for specific sections. Accepts single or multiple sections.
After calling the list-sections tool, you MUST analyze the returned documentation sections (especially the use_cases field) and then use the get-documentation tool to fetch ALL documentation sections that are relevant for the user's task.

#### 3. svelte-autofixer

Analyzes Svelte code and returns issues and suggestions.
You MUST use this tool whenever writing Svelte code before sending it to the user. Keep calling it until no issues or suggestions are returned.

#### 4. playground-link

Generates a Svelte Playground link with the provided code.
After completing the code, ask the user if they want a playground link. Only call this tool after user confirmation and NEVER if code was written to files in their project.
