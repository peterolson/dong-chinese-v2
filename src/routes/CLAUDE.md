# Routes

SvelteKit file-based routing with two route groups and an API layer.

## Route Groups

### (app)/ — Main Application

Protected by the app shell layout (`+layout.svelte` with header + sidebar).

| Route                        | Status      | Notes                                                                                                   |
| ---------------------------- | ----------- | ------------------------------------------------------------------------------------------------------- |
| `/dictionary`                | Placeholder | Landing page stub.                                                                                      |
| `/dictionary/[entry]`        | Working     | Character detail view. Single-char → `CharacterView`. Multi-char → 404 (word view not yet implemented). |
| `/dictionary/explain/[type]` | Working     | Component type explanation page. Validates against `validTypes`, loads example characters.              |
| `/settings`                  | Working     | Theme + character set toggles. Form action + `use:enhance`. No-JS `<noscript>` submit button.           |
| `/lessons`                   | Placeholder | Stub for future lessons feature.                                                                        |
| `/media`                     | Placeholder | Stub for future media feature.                                                                          |

### (auth)/ — Authentication Pages

Public pages with no app shell (no sidebar/header).

| Route              | Status  | Notes                                                                     |
| ------------------ | ------- | ------------------------------------------------------------------------- |
| `/login`           | Working | Email/username + password, OAuth, magic link. Resolves secondary emails.  |
| `/register`        | Working | Sign-up with optional name/username. Password match validation.           |
| `/forgot-password` | Working | Sends reset email. Never reveals whether email exists (anti-enumeration). |
| `/reset-password`  | Working | Token-based password reset. Validates token, password match.              |

All auth pages use `auth-card.svelte` layout and work without JavaScript.

### /api — JSON Endpoints

| Route                            | Method | Notes                                                               |
| -------------------------------- | ------ | ------------------------------------------------------------------- |
| `/api/dictionary/explain/[type]` | GET    | Component type examples. Cache: 1h + 24h stale-while-revalidate.    |
| `/api/tts/token`                 | GET    | Azure Speech token. In-memory cache (9 min). 503 if not configured. |

## Root Layout

`+layout.svelte` implements the app shell:

- CSS-only sidebar toggle (works without JS)
- `lang` attribute derived from character set setting (zh-Hans vs zh-Hant)
- Theme sync on client-side navigation

`+layout.server.ts` passes `user` and `settings` from `event.locals` to all pages.

## Patterns

- **Progressive enhancement**: All forms use SvelteKit actions as baseline, `use:enhance` layered on top.
- **Auth redirect**: Auth pages redirect already-authenticated users to `/`. Login/register accept `?redirectTo=` (sanitized).
- **Settings sync**: `syncSettingsOnLogin()` / `syncSettingsOnSignup()` merge anonymous session data on auth.
- **Server specs**: Auth pages have co-located `page.server.spec.ts` files with comprehensive tests.
