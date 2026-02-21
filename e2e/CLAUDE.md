# E2E Tests — Playwright

All tests are **parameterized for JS-enabled and JS-disabled modes**, enforcing the progressive enhancement contract.

## Test Files

| File                        | What It Tests                                                                                                                                                   |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `anonymous-session.test.ts` | Cookie creation, reuse, invalidation, persistence across pages. Validates httpOnly, SameSite, UUID format, ~30-day expiry.                                      |
| `auth-pages.test.ts`        | All 4 auth pages (login, register, forgot-password, reset-password). Form fields, POST submission, navigation links, magic link expansion, hidden token fields. |
| `sidebar.test.ts`           | Responsive sidebar behavior. Desktop: always visible + hamburger toggle. Mobile: hidden by default, hamburger opens, backdrop closes.                           |
| `demo.test.ts`              | Smoke test — home page has h1.                                                                                                                                  |

## Patterns

- Tests run against a **production build** (`npm run build && npm run preview` on port 4173).
- Use `test.describe` with a `javaScriptEnabled` parameter to run each suite twice.
- Auth tests verify forms work via native POST (no JS) — checks `method="post"` and `action` attributes.
- Sidebar tests use two viewports: desktop (1280x720) and mobile (375x667).

## Running

```bash
npx playwright test              # Run all E2E tests
npx playwright test --ui         # Interactive UI mode
npx playwright install chromium  # Install browser (first time)
```
