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
- An anonymous session (cookie-based) is created on first visit
- Progress is tracked against the session ID
- When the user creates an account or logs in, all progress from the current anonymous session is merged into their user account
- Progress merge is additive: all rows from the anonymous session are re-assigned to the user account. Progress data is structured so that combining rows from multiple sessions is always safe (no conflicts, no "best wins" logic needed — just include everything).
- After merge, anonymous progress rows are deleted in the same transaction
- If a user logs in on a second device that has its own anonymous session, that session's progress is also merged additively into their account at login time
- If they never create an account, anonymous session data expires after a configurable period (default: 30 days)
- The prompt to create an account should appear when the user has meaningful progress worth saving, not on first visit
- Better Auth's anonymous plugin should be evaluated for this purpose. If it doesn't fit, implement anonymous sessions manually (cookie + DB row) and use Better Auth only for real authentication.

## Tech Stack

This project was scaffolded with `npx sv create` using the following configuration:

```
npx sv create --template minimal --types ts --add prettier eslint vitest="usages:component,unit" playwright sveltekit-adapter="adapter:node" devtools-json drizzle="database:postgresql+postgresql:postgres.js+docker:yes" better-auth="demo:password,github" storybook mcp="ide:claude-code,vscode+setup:remote" --install npm .
```

| Layer                | Technology                         | Notes                                                                                                                 |
| -------------------- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Framework            | SvelteKit                          | TypeScript throughout, adapter-node for deployment                                                                    |
| Database             | PostgreSQL                         | Docker Compose for local dev, Neon or RDS for prod                                                                    |
| ORM                  | Drizzle ORM                        | postgres.js client. Use drizzle-kit for migrations. Schema defined in TypeScript.                                     |
| Auth                 | Better Auth                        | With anonymous plugin. Must be bcrypt-compatible with existing Meteor password hashes. Email/password + GitHub OAuth. |
| Styling              | Vanilla CSS with custom properties | No Tailwind. Keep CSS minimal and fast. No runtime CSS-in-JS.                                                         |
| Testing - Unit       | Vitest                             |                                                                                                                       |
| Testing - E2E        | Playwright                         | Test both with-JS and without-JS scenarios                                                                            |
| Testing - Components | Storybook 10                       | Every component needs stories for both JS-enabled and JS-disabled states                                              |
| Mobile               | Capacitor                          | For Android initially. iOS as PWA first, native later.                                                                |
| IaC                  | SST (Ion)                          | AWS deployment                                                                                                        |
| CI/CD                | GitHub Actions                     | All tests must pass before merging to main                                                                            |
| Linting/Formatting   | ESLint + Prettier                  | Already configured via sv create                                                                                      |

## Getting Started (Post-Scaffold)

The project is already scaffolded. To get the dev environment running:

1. `npm run db:start` — start the Postgres Docker container
2. `npm run auth:schema` — generate the Better Auth schema
3. `npm run db:push` — push the schema to the database
4. Set up `.env` — check ORIGIN, BETTER_AUTH_SECRET, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET
5. `npm run dev` — start the dev server
6. Visit `/demo/better-auth` to verify auth is working

Organize application code as follows:

- `src/lib/server/db/` — Drizzle schema, connection, migration runner
- `src/lib/server/auth/` — Auth customizations (Meteor bcrypt compatibility, anonymous session merge logic)
- `src/lib/server/services/` — Business logic
- `src/lib/components/` — Svelte UI components
- `src/routes/(app)/` — Main app routes (lesson content, progress, dictionary, etc.)
- `src/routes/(auth)/` — Login, signup routes
- `src/routes/(marketing)/` — Public pages (landing, about, pricing)
- `scripts/` — One-off scripts (e.g., Meteor user migration)

## Database Schema Guidelines

- All tables use `snake_case` naming
- Primary keys are UUIDs (use `gen_random_uuid()`)
- All tables include `created_at` and `updated_at` timestamps
- Better Auth manages its own tables (user, session, account, verification). Extend these as needed but don't fight the library's conventions.
- The `progress` table has a `session_id` (always set) and a nullable `user_id` (set when authenticated)
- Foreign keys and indexes should be explicit — don't rely on ORM magic

## Auth Implementation Details

### Better Auth Configuration

Better Auth is the auth library. It handles sessions, email/password, and OAuth (GitHub). Key customization points:

- **Anonymous plugin**: Use Better Auth's anonymous plugin for unauthenticated sessions. The `onLinkAccount` callback handles merging progress when an anonymous user signs up or links an account.
- **OAuth**: Google/Facebook/GitHub OAuth flows are server-side redirects — they work without JS by default.
- **Form actions**: Email/password login and signup must work via SvelteKit form actions (no-JS baseline). Use Better Auth's server-side API (`auth.api`) in form actions rather than relying on the client SDK.

### Meteor Compatibility

The existing Meteor app stores passwords using bcrypt. The migration script must:

1. Export users from Meteor's MongoDB `users` collection
2. Preserve the bcrypt hash exactly as-is (Meteor uses `$2a$` or `$2b$` prefix bcrypt hashes)
3. Insert into the new Postgres users table
4. Verify that Better Auth's password checking is compatible with these hashes, or add a custom verification hook

## Code Style & Conventions

- TypeScript strict mode, no `any` types
- Prefer `const` over `let`
- Use named exports, not default exports (except where SvelteKit requires default exports like `+page.svelte`)
- Error handling: use explicit error types, not thrown strings. Prefer Result pattern where practical.
- SQL: Drizzle's query builder for simple queries, `sql` template tag for complex ones. No raw string concatenation.
- Components: one component per file, props typed with TypeScript interfaces
- File naming: `kebab-case` for files, `PascalCase` for components

## Testing Requirements

- Every new feature needs tests before it's considered done
- E2E tests (Playwright): test the critical user flows in BOTH JS-enabled and JS-disabled modes
- Unit tests (Vitest): test business logic, auth, data transformations
- Storybook: every UI component must have stories showing all states
- CI must run all tests. PRs cannot merge with failing tests.

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
