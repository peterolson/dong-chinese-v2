# Dong Chinese v2 — Project Tracker

## Done

- [x] Project scaffolded with `sv create` (SvelteKit, TypeScript, Drizzle, Better Auth, Storybook 10, Playwright, Vitest, ESLint, Prettier, MCP)
- [x] Dev environment running (Docker Postgres, Better Auth schema)
- [x] Evaluated Better Auth anonymous plugin — **decided against it**. Plugin creates fake user records, has no transactional merge, requires explicit client call (not auto on first visit). Using custom cookie + DB row approach instead. Better Auth is used only for real authentication.
- [x] Implemented anonymous session creation — `anonymous_session` table (Drizzle), SvelteKit server hook auto-creates cookie + DB row on first visit, validates on return visits, replaces invalid/expired sessions. Service module at `src/lib/server/services/anonymous-session.ts`. Docker Postgres on port 5434 (local Postgres occupies 5432/5433).
- [x] Tests for anonymous session system — Playwright E2E tests (8 tests: cookie setting, reuse, invalid replacement, cross-page persistence in both JS-enabled and JS-disabled modes) + Vitest integration tests (10 tests: create, validate, delete, expire, constants)
- [x] GitHub Actions CI workflow — runs lint, type-check, unit tests, and Playwright E2E against Postgres service container on every push/PR to master. Created `dev` branch for ongoing work.

- [x] Backwards-compatible login for Meteor users — bcrypt password hash/verify override in Better Auth, `user_email` table for multi-email login, secondary email → primary email resolution in sign-in action, import script (`scripts/import-meteor-users.ts`) for migrating 24k users from MongoDB preserving bcrypt hashes and OAuth provider IDs, bcrypt compatibility tests

- [x] Reusable UI components — `Alert` (error/success/warning/info variants with lucide icons), `Button` (primary/secondary/tertiary/outline variants), `ProgressButton` (Button wrapper with loading spinner). Global CSS alert color variables. Storybook stories for all.
- [x] Magic link sign-in — `sendMagicLink` form action with secondary→primary email resolution, email service (`src/lib/server/services/email.ts`), new/existing user detection for contextual email copy, loading state on submit button. 8 new unit tests covering all code paths.
- [x] Login page uses new components — replaced inline `.error`/`.success` styles and raw `<button>` elements with `Alert`, `Button`, and `ProgressButton` components
- [x] Auth pages redesign — Login page with two-column responsive layout (credentials left, social right on desktop, stacked on mobile), branded social buttons (Google white/colorful, Facebook blue, GitHub dark) ordered Google > Facebook > GitHub, magic link at bottom. Register page with full sign-up form (name, email, username, password, confirm) + social sign-up. Forgot-password page with email form and password reset email flow. Reset-password page with token-based new password form. All pages use consistent card styling with `SocialIcon` component. Stories for all pages.

- [x] Dark mode + generalized user settings architecture (PR #11) — Single JSON `settings` cookie + `user_settings` DB table. Server hook injects `data-theme` on `<html>` via `transformPageChunk` (no flash). Works across anonymous/authenticated, JS/no-JS, online/offline. Settings page with `SegmentedControl` component. Login syncs DB→cookie, signup syncs cookie→DB. Dark mode CSS variables for all semantic tokens. Adapted header, sidebar, auth card for dark mode. Meteor import script imports `profile.darkMode`. 37 unit/integration tests.

- [x] Dictionary data ingestion pipeline (Phase A) — `stage` Postgres schema with `unihan_raw` (EAV, 1.56M rows across 103k codepoints × 99 fields), `cedict_raw` (124k entries), and `sync_metadata`. Import scripts with checksum-based idempotency and audit columns (`sync_version`, `is_current`, `created_at`, `updated_at`). After each import, scripts report new/changed/removed/unchanged counts. Rows absent from the latest source file get `is_current = false`; `updated_at` only changes when the actual value changes or `is_current` flips. Drizzle config updated with `schemaFilter: ['public', 'stage']`.
  - **Files**: `src/lib/server/db/stage.schema.ts`, `scripts/dictionary/import-unihan.ts`, `scripts/dictionary/import-cedict.ts`
  - **npm scripts**: `dictionary:import-unihan`, `dictionary:import-cedict`, `dictionary:sync`
  - **Query patterns after import at version N** (use `last_download` from `stage.sync_metadata`):
    - New: `is_current = true AND created_at >= last_download`
    - Changed: `is_current = true AND updated_at >= last_download AND created_at < last_download`
    - Removed: `is_current = false AND updated_at >= last_download`
    - All active: `is_current = true`

- [x] Production database sync workflows (PR #12) — 3 GitHub Actions workflows for automated imports against Supabase. Monthly cron for Unihan/CEDICT/AnimCJK, weekly cron for Meteor user import, manual dispatch with dropdown for one-time sources (Shuowen, MakeMeAHanzi, Baxter-Sagart, Zhengzhang) or full sync. All workflows create `stage` schema, run `drizzle-kit push --force`, then execute import scripts. Requires `SUPABASE_DATABASE_URL` and `MONGODB_URI` GitHub secrets.

- [x] Editable character dictionary — `char_manual` table (append-only edit log with pending/approved/rejected status), `user_permission` table, `dictionary.char` Postgres view overlaying approved edits on `char_base`. Suggestion/approval workflow: anyone can suggest edits, `wikiEdit` users auto-approve and can review others. Backend services for permissions and char editing. Import script for legacy MongoDB permissions. Rebuild script atomically re-creates view during table swap.

- [x] Wiki section with character editing UI (PR) — `/wiki` route group with home, search, lists, character entry, edit form, edit history, pending edits, recent changes. Approval-based review workflow, `reviewComment` column, managed char view via drizzle-kit, new services (getRecentEdits, countPendingEdits, searchCharacters, getCharacterList), new UI components (TabBar, TagInput, ListEditor, ComponentEditor, FieldDiff, EditStatusBadge, WikiSidebar), phonetic script settings (zhuyin, wade-giles, gwoyeu, cyrillic). Unit tests for orthography, fragment-range, char-edit, settings, common-sources. E2E tests for all wiki pages (JS enabled/disabled).

- [x] **Import legacy wiki history** — `import-legacy-history.ts` reads char edits from `stage.dong_dict_history_raw`, maps MongoDB fields → `char_manual` columns, computes `changedFields` diffs, handles status mapping (approved/rejected/pre-approval-system). Incremental idempotency via `[mongo:<id>]` tag in `edit_comment` (stripped from UI display). Added to weekly GitHub Action. Also fixed double-encoding bug in `import-dong-dictionary.ts` (JSONB columns were storing JSON strings instead of objects).

- [x] **Wiki editing UX improvements** — No duplicate pending edits (update-in-place with `updateCharEdit`), draft/published toggle on character view, scoped pending page (any user sees own edits, reviewers see all), full entry view for historical snapshots (`/wiki/[char]/history/[editId]`), pending edits excluded from Recent Changes, approve/reject moved to history page. Sidebar always shows pending link (labeled "My Edits" or "Review Queue"). Badge count for reviewers only.

- [x] **Replace Codecov with self-hosted coverage checks** — Removed `codecov.yml` and codecov upload step. Added `scripts/check-patch-coverage.mjs` (LCOV + git diff cross-reference), `vitest-coverage-report-action` for PR comments, `schneegans/dynamic-badges-action` for shields.io badge via Gist, project regression check against Gist baseline. `json-summary` reporter added to Vitest config.

## In Progress

- [ ] **Production deployment** — Hetzner VPS (5.78.183.33), Caddy reverse proxy, systemd template units, zero-downtime port-swap deploys via GitHub Actions `workflow_dispatch`. Health check endpoint at `/api/health`. Auto-release tagging with PR-based notes. Files: `deploy/Caddyfile`, `deploy/dong-chinese@.service`, `scripts/server-setup.sh`, `.github/workflows/deploy.yml`, `src/routes/api/health/+server.ts`.

## Up Next

### Phase 1: Foundation

- [ ] Implement progress merge on account creation (additive merge in a single transaction)
- [x] Build login page with SvelteKit form actions (must work without JS) — email/password login at `/login`, social provider buttons (GitHub/Google/Facebook/Twitter, conditionally rendered), auth-status header component, sign-out via form POST, open redirect prevention
- [x] Build signup page with SvelteKit form actions (must work without JS)
- [x] Add social OAuth provider support (GitHub, Google, Facebook, Twitter — conditionally configured via env vars)
- [x] Add username login support — Better Auth `username` plugin, unified "Email or username" field on `/login`, detects email vs username by `@`, `AuthUser` type for plugin-augmented user, updated stories with username error case
- [x] Magic link sign-in with email service, reusable Alert/Button/ProgressButton components (PR #9)
- [ ] Write Playwright tests for auth flows (with and without JS)

### Phase 2: Meteor Migration

- [x] Write Postgres import script preserving bcrypt hashes — `scripts/import-meteor-users.ts`, run with `npm run import:users`
- [x] Verify existing Meteor passwords work with Better Auth — bcrypt `$2b$10$` hashes verified compatible
- [ ] Write progress data migration script

### Phase 3: Core Learning Features

- [ ] **Dictionary system** (see Dictionary Deep Dive below)
- [ ] Lesson system (reading, writing, both)
- [ ] Interactive subtitles for media content
- [ ] Progress tracking and spaced repetition
- [ ] Edge caching strategy for dictionary pages (Cache-Control + stale-while-revalidate)

### Phase 4: Polish & Infrastructure

- [x] Deployment setup (Hetzner VPS + Caddy + systemd + GitHub Actions zero-downtime deploy)
- [x] GitHub Actions CI pipeline (lint, check, Vitest, Playwright with Postgres service container)
- [ ] Branch protection on master (requires GitHub Pro or public repo)
- [ ] Service worker for offline caching (JS enhancement)
- [ ] Capacitor setup for Android
- [ ] Stripe subscription integration

---

## Dictionary Deep Dive

The largest feature in the project. Spans data ingestion, schema design, search, offline support, stroke animation, and UI. Broken into milestones that ship incrementally.

### Data Sources

#### 1. Unicode Unihan Database

- **What**: Character-level data for every CJK codepoint — radical/stroke counts, readings (Mandarin, Cantonese, etc.), semantic variants, source references
- **Where**: https://www.unicode.org/reports/tr38/ — download `Unihan.zip` from the UCD
- **Format**: Tab-delimited text files (`U+XXXX<tab>field<tab>value`), split across files like `Unihan_Readings.txt`, `Unihan_RadicalStrokeCounts.txt`, etc.
- **Size**: ~98k codepoints across CJK Unified Ideographs + Extensions A–I
- **License**: Unicode License (very permissive)
- **Update cadence**: Annually with each Unicode version (16.0 = Sept 2024, 17.0 = Sept 2025)
- **Key fields**: `kMandarin`, `kDefinition`, `kTotalStrokes`, `kRSUnicode` (radical-stroke), `kSimplifiedVariant`, `kTraditionalVariant`, `kFrequency`, `kGradeLevel`

#### 2. CC-CEDICT

- **What**: Community-maintained Chinese-English dictionary focused on word/phrase definitions
- **Where**: https://www.mdbg.net/chinese/dictionary?page=cedict (recommended stable download)
- **Format**: One entry per line: `Traditional Simplified [pin1 yin1] /English def 1/English def 2/`
- **Size**: ~124k entries, UTF-8 text (~4 MB uncompressed)
- **License**: CC BY-SA 4.0 (requires attribution, share-alike)
- **Update cadence**: Continuous community edits; we download monthly
- **Example**: `你好 你好 [ni3 hao3] /Hello!/Hi!/How are you?/`

#### 3. Dong Chinese Character Wiki (MongoDB)

- **What**: Curated character breakdowns, glosses, component trees — the "editorial" layer that makes Dong Chinese unique
- **Collections**:
  - `dictionary.char` — one doc per Unicode codepoint. Breakdown (component tree), gloss, pinyin, radical, frequency, etc.
  - `dictionary.word` — one doc per word/phrase. Simplified, traditional, pinyin, definitions, example sentences, notes
  - `dictionary.char.history` / `dictionary.word.history` — full edit history
- **Connection**: Already configured via `MONGODB_URI` in `.env`
- **Migration plan**: Initially import as a data feed (read from MongoDB, write to Postgres). Eventually the wiki editor itself migrates to this project and writes directly to Postgres.

#### 4. AnimCJK (Stroke Order Data)

- **What**: Stroke order SVG paths for animating character writing. Provides **separate stroke data for simplified vs traditional** — the same codepoint can have different stroke orders depending on the script variant. This is critical for the character writing feature.
- **Where**: https://github.com/parsimonhi/animCJK
- **Coverage**:
  - `svgsZhHans/` — **7,692** simplified Chinese characters (HSK set + 7k commonly used)
  - `svgsZhHant/` — **1,014** traditional Chinese characters (HSK v3 levels 1-3 only — significant coverage gap)
- **Format**: One SVG file per character, named by decimal Unicode codepoint (e.g., `20320.svg` = 你). Contains stroke paths + median paths for animation.
- **License**: Arphic Public License (SVGs), LGPL (other files)
- **Why AnimCJK over MakeMeAHanzi**: MMAH has broader coverage (~9k chars) but treats simplified/traditional as having the same stroke order. AnimCJK correctly handles cases where they differ (e.g., 骨 has different stroke order in simplified vs traditional contexts).
- **Size concern**: SVG path data is bulky. Each character ~1-5 KB of path strings. For ~8.7k characters → ~10-40 MB raw, ~3-8 MB compressed. **This will dominate the offline download size.** Needs special handling (see Offline Architecture).

### Conceptual Data Model

The schema must reconcile four data sources. Core principle: **Unicode and CC-CEDICT provide the baseline; the Character Wiki overrides/enriches; AnimCJK provides stroke animation data.**

The exact column definitions will be designed after Milestone 1 (data exploration), since we need to inspect the actual source data first. High-level shape:

**Character table** — One row per Unicode codepoint. Readings, radical, stroke count, frequency, definition (gloss), breakdown/component tree, simplified↔traditional variant links. Fields sourced from Unihan can be overridden by wiki data.

**Word table** — One row per (simplified, traditional, pinyin) tuple. Definitions, frequency, HSK level, example sentences, notes. Natural key is the tuple since CC-CEDICT treats the same characters with different pinyin as separate entries.

**Stroke data table** — Separate from the character table because: (a) much larger per-row, (b) a single codepoint may have both simplified and traditional stroke orders, (c) not every character has data, (d) we want to exclude it from lightweight offline downloads. Keyed on (codepoint, variant).

**Edit history table** — Tracks changes to characters and words with old/new values, source attribution, timestamps. Preserves existing MongoDB history and records ongoing changes from syncs.

**Sync metadata table** — Last download date, source version, checksum, row counts per data source. Used to skip redundant downloads and detect upstream changes.

### Data Ingestion

All scripts in `scripts/dictionary/`, following the pattern from `import-meteor-users.ts`:

1. **import-unihan** — Download Unihan.zip, parse tab-delimited files, UPSERT characters, diff → history, update sync metadata
2. **import-cedict** — Download from MDBG, parse `Traditional Simplified [pinyin] /defs/`, UPSERT words, diff → history
3. **import-wiki** — Connect to MongoDB, merge `dictionary.char` → characters (wiki overrides Unihan), merge `dictionary.word` → words (wiki overrides CC-CEDICT), import existing edit history
4. **import-animcjk** — Clone/pull AnimCJK repo, parse SVGs to extract stroke paths and medians, UPSERT into stroke data table with (codepoint, variant) key
5. **sync-all** — Orchestrator running all four in sequence. Monthly cron. Skips no-ops via checksum comparison.

### Search

**Server-side (online)**: Postgres with `pg_trgm` for trigram indexes. Detect input type:

- Chinese characters → exact/prefix match on simplified/traditional, ordered by frequency
- Pinyin → trigram match with normalization (see Open Questions), ordered by frequency
- English → full-text search via `tsvector`, ranked by relevance × frequency boost
- Mixed → run all in parallel, merge and deduplicate

**Client-side (offline)**: See below.

### Offline Architecture

**Decision: Custom IndexedDB + Dexie.js — NOT Zero, NOT PowerSync**

Rationale:

- **Zero** (Rocicorp): No offline writes, still alpha, requires self-hosted Docker, no SSR support, pushes all data to every client (we need selective/opt-in download). Not a fit.
- **PowerSync**: WASM-SQLite adds read latency vs native IndexedDB. Overkill for read-only data. Restrictive licensing.
- **Dexie.js**: Mature, lightweight IndexedDB wrapper. Excellent read performance, native browser storage, no WASM overhead. We only need one-way server→client sync. MIT licensed.

#### Online vs Offline Modes

**Online (default)**: Server-rendered SvelteKit pages querying Postgres. Search hits server endpoint. Works without JS. Cache-Control with `stale-while-revalidate`.

**Offline (opt-in)**: User downloads dictionary in settings. Data streams into IndexedDB via Dexie.js. Service worker intercepts dictionary requests when offline.

#### Incremental Sync

Every row has a monotonically-increasing `version` bigint. Client stores `lastSyncedVersion`. On app open, client requests only rows with `version > lastSyncedVersion`. Typical monthly diff: a few hundred entries. Deletions communicated via tombstone rows (soft delete with `deleted_at`, assigned a new version so clients pick it up).

#### Stroke Data and Download Size

Stroke data dominates the offline footprint. Options:

1. **Separate download tiers**: "Dictionary only" (~15-20 MB compressed) vs "Dictionary + Strokes" (~25-40 MB). User chooses.
2. **Lazy stroke loading**: Don't include strokes in bulk download. Cache per-character as encountered.
3. **Hybrid**: Download strokes for top ~3k chars (HSK + high frequency) upfront, lazy-load the rest.
4. **Compact stroke format**: Strip SVG boilerplate, store just coordinate arrays. Could cut size by 50%+.

**Starting approach: Option 1 (separate tiers), investigate Option 4 (compact format) during implementation.** Users who want writing practice will accept the larger download.

#### Offline Search

- **Chinese/pinyin**: Dexie.js compound indexes for exact and prefix matches. Covers the most common use case.
- **English**: Pre-build a compact search index server-side (FlexSearch, MiniSearch, or custom), ship with download, load into memory. ~2-5 MB extra.
- **Hybrid**: Dexie indexes for Chinese/pinyin, pre-built index for English.

### Implementation Milestones

#### Milestone 1: Data Exploration + Schema Design

- [ ] Connect to MongoDB and explore `dictionary.char` and `dictionary.word` — document actual field names, types, value shapes, cardinality
- [x] Download and parse a CC-CEDICT snapshot — 124,260 entries loaded into `stage.cedict_raw`
- [x] Download and parse Unihan.zip — 1,555,629 rows (103k codepoints × 99 fields) loaded into `stage.unihan_raw`
- [ ] Clone AnimCJK and examine SVG structure — measure raw vs compressed sizes, understand path format
- [x] Create stage schema (`stage.unihan_raw`, `stage.cedict_raw`, `stage.sync_metadata`) + push with drizzle-kit
- [ ] Design materialized views (`source_character`, `source_word`) based on actual data — Phase B

#### Milestone 2: Data Ingestion Scripts

- [x] Write `import-unihan.ts` — parse Unihan.zip, upsert ~1.56M rows with checksum idempotency
- [x] Write `import-cedict.ts` — parse CC-CEDICT, upsert ~124k entries with checksum idempotency
- [ ] Write `import-wiki.ts` — read MongoDB collections, merge into Postgres
- [ ] Write `import-animcjk.ts` — parse SVGs, insert stroke data
- [ ] Write `sync-all.ts` orchestrator with checksum-based skip logic
- [x] Verify data integrity: spot-checked entries (`你好`, kMandarin, kDefinition), verified row counts and sync metadata

#### Milestone 3: Server-Side Search + API

- [ ] Enable `pg_trgm` extension
- [ ] Implement search service with input type detection and frequency weighting
- [ ] Create search API endpoint
- [ ] Pinyin normalization (accept all common input formats)
- [ ] Unit tests for search across query types

#### Milestone 4: Dictionary Pages (Server-Rendered)

- [ ] Character detail page — breakdown, stroke animation, readings, related words
- [ ] Word detail page — definitions, examples, component characters
- [ ] Search results page with form action for no-JS baseline
- [ ] Edge caching headers
- [ ] Storybook stories for dictionary components

#### Milestone 5: Offline Download + Sync

- [ ] Download endpoint (streaming compressed JSON/NDJSON)
- [ ] Incremental sync endpoint (version-based)
- [ ] Client-side Dexie.js schema + setup
- [ ] Download flow UI in settings (progress bar, storage used, last synced, tier selection)
- [ ] Service worker integration
- [ ] Stroke data: separate download tier or lazy loading

#### Milestone 6: Offline Search

- [ ] Pre-built English search index generation
- [ ] Client-side search: Dexie indexes (Chinese/pinyin) + pre-built index (English)
- [ ] Seamless online↔offline fallback
- [ ] Search UI identical in both modes

#### Milestone 7: Sync Automation

- [x] GitHub Actions cron for monthly dictionary sync + weekly Meteor user import + manual dispatch for one-time imports (PR #12)
- [ ] Monitoring for upstream format changes or download failures
- [ ] Admin page showing sync status, entry counts, last update times

### Open Questions

1. **Wiki migration timeline** — When does the wiki editor move to this project? Until then, import on a schedule or use MongoDB Change Streams for near-real-time?
2. **Download format** — NDJSON (streaming-friendly) vs single JSON blob vs SQLite file? Leaning NDJSON.
3. **Offline search index library** — FlexSearch, MiniSearch, or custom? Need to evaluate bundle size vs search quality.
4. **AnimCJK traditional coverage gap** — Only 1,014 traditional characters have stroke data. For the rest, fall back to MakeMeAHanzi? Accept the gap? Contribute upstream?
5. **Compact stroke format** — Can we strip SVG boilerplate and store just coordinate arrays? What's the actual compression ratio? Need to measure.
6. **Mobile storage budget** — Capacitor/WebView may have tighter IndexedDB limits. Need to test on actual Android devices.
7. **Pinyin normalization** — How aggressively? Just tone number ↔ diacritic, or also handle missing spaces, missing tones, partial matches?
8. **Soft deletes** — If a CC-CEDICT entry is removed in an update, how do we communicate that to offline clients? Tombstone rows with version numbers?
