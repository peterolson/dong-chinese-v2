[![CI](https://github.com/peterolson/dong-chinese-v2/actions/workflows/ci.yml/badge.svg)](https://github.com/peterolson/dong-chinese-v2/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/peterolson/dong-chinese-v2/branch/main/graph/badge.svg?token=2U4UWZS7N2)](https://codecov.io/gh/peterolson/dong-chinese-v2)

# Dong Chinese

A Chinese language learning app at [dong-chinese.com](https://dong-chinese.com). This is a ground-up rebuild of the existing Meteor.js application using SvelteKit and PostgreSQL.

## Tech Stack

- **Framework**: SvelteKit (Svelte 5) with TypeScript
- **Database**: PostgreSQL (Drizzle ORM)
- **Auth**: Better Auth (bcrypt-compatible with Meteor password hashes)
- **Styling**: Vanilla CSS with custom properties (no Tailwind)
- **Testing**: Vitest + Storybook 10 + Playwright
- **Mobile**: Capacitor (planned)

## Getting Started

### Prerequisites

- Node.js v25+
- Docker (for local Postgres)

### Setup

```sh
npm install
npm run db:start          # Start Postgres on port 5434 + test DB on 5435
npm run db:push           # Push Drizzle schema to dev DB
npm run db:test:push      # Push Drizzle schema to test DB (for vitest)
cp .env.example .env      # Configure environment variables
npm run dev               # Start dev server at localhost:5173
```

### Dictionary Data

The dictionary is built from 10+ external sources (Unicode Unihan, CC-CEDICT, AnimCJK stroke data, historical pronunciations, frequency corpora, etc.). Import scripts live in `scripts/dictionary/`.

```sh
npm run dictionary:sync     # Run all imports
npm run dictionary:rebuild-char  # Materialize dictionary tables from staged data
```

### Storybook

```sh
npm run storybook           # Start at localhost:6006
```

### Testing

```sh
npm run test                # Vitest (unit + component + storybook)
npx playwright test         # E2E (requires build first)
```

## Architecture

See [CLAUDE.md](CLAUDE.md) for the full project guide, including architecture principles, database schema design, auth implementation details, and code conventions.

Key design principles:

- **Progressive enhancement**: Every feature works without JavaScript. Forms use SvelteKit actions as the baseline; client-side JS is layered on top.
- **Anonymous-first auth**: Users can use the app without an account. Progress merges when they sign up.
- **3-schema database**: `public` (app/auth), `stage` (raw imports), `dictionary` (denormalized queries).

## Project Status

This is an active rebuild. Auth, settings, and the dictionary data pipeline are complete. See [TODO.md](TODO.md) for current progress and next steps.
