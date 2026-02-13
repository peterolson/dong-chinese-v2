# Dong Chinese v2 — Project Tracker

## Done

- [x] Project scaffolded with `sv create` (SvelteKit, TypeScript, Drizzle, Better Auth, Storybook 10, Playwright, Vitest, ESLint, Prettier, MCP)
- [x] Dev environment running (Docker Postgres, Better Auth schema, demo works at `/demo/better-auth`)
- [x] Evaluated Better Auth anonymous plugin — **decided against it**. Plugin creates fake user records, has no transactional merge, requires explicit client call (not auto on first visit). Using custom cookie + DB row approach instead. Better Auth is used only for real authentication.
- [x] Implemented anonymous session creation — `anonymous_session` table (Drizzle), SvelteKit server hook auto-creates cookie + DB row on first visit, validates on return visits, replaces invalid/expired sessions. Service module at `src/lib/server/services/anonymous-session.ts`. Docker Postgres on port 5434 (local Postgres occupies 5432/5433).
- [x] Tests for anonymous session system — Playwright E2E tests (8 tests: cookie setting, reuse, invalid replacement, cross-page persistence in both JS-enabled and JS-disabled modes) + Vitest integration tests (10 tests: create, validate, delete, expire, constants)
- [x] GitHub Actions CI workflow — runs lint, type-check, unit tests, and Playwright E2E against Postgres service container on every push/PR to master. Created `dev` branch for ongoing work.

## In Progress

(nothing currently in progress)

## Up Next

### Phase 1: Foundation

- [ ] Implement progress merge on account creation (additive merge in a single transaction)
- [x] Build login page with SvelteKit form actions (must work without JS) — email/password login at `/login`, social provider buttons (GitHub/Google/Facebook/Twitter, conditionally rendered), auth-status header component, sign-out via form POST, open redirect prevention
- [ ] Build signup page with SvelteKit form actions (must work without JS)
- [x] Add social OAuth provider support (GitHub, Google, Facebook, Twitter — conditionally configured via env vars)
- [x] Add username login support — Better Auth `username` plugin, unified "Email or username" field on `/login`, detects email vs username by `@`, `AuthUser` type for plugin-augmented user, updated stories with username error case
- [ ] Write Playwright tests for auth flows (with and without JS)

### Phase 2: Meteor Migration

- [ ] Write Meteor user export script (MongoDB → JSON)
- [ ] Write Postgres import script preserving bcrypt hashes
- [ ] Verify existing Meteor passwords work with Better Auth
- [ ] Write progress data migration script

### Phase 3: Core Learning Features

- [ ] Dictionary page with character breakdowns
- [ ] Lesson system (reading, writing, both)
- [ ] Interactive subtitles for media content
- [ ] Progress tracking and spaced repetition
- [ ] Edge caching strategy for dictionary pages (Cache-Control + stale-while-revalidate)

### Phase 4: Polish & Infrastructure

- [ ] SST (Ion) deployment setup
- [x] GitHub Actions CI pipeline (lint, check, Vitest, Playwright with Postgres service container)
- [ ] Branch protection on master (requires GitHub Pro or public repo)
- [ ] Service worker for offline caching (JS enhancement)
- [ ] Capacitor setup for Android
- [ ] Stripe subscription integration
