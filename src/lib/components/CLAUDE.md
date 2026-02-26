# Components

Four subdirectories of Svelte 5 components. All use runes (`$state`, `$derived`, `$effect`), vanilla CSS with custom properties, and have co-located Storybook stories (`*.stories.svelte`).

## ui/ — Reusable Primitives

| Component                  | Notes                                                                                                                                |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `button.svelte`            | Polymorphic (renders `<a>` or `<button>`). Variants: primary, secondary, tertiary, outline, dashed, ghost. Sizes: default, sm, icon. |
| `modal.svelte`             | Native `<dialog>`, backdrop click-to-close, CSS animations. Controlled via `open` prop.                                              |
| `alert.svelte`             | Variants: error, success, warning, info. Renders Lucide icons.                                                                       |
| `segmented-control.svelte` | Accessible radio group styled as toggle buttons.                                                                                     |
| `speak-button.svelte`      | Plays TTS via `speech.ts`. Shows loading state while synthesizing.                                                                   |
| `tab-bar.svelte`           | Accessible tab bar for switching between views. Renders as `<nav>` with `aria-current`.                                              |
| `progress-button.svelte`   | Button with a loading spinner.                                                                                                       |

## auth/ — Authentication Forms

Built for **progressive enhancement** — all forms work without JS via SvelteKit form actions.

| Component                | Notes                                                                                   |
| ------------------------ | --------------------------------------------------------------------------------------- |
| `auth-card.svelte`       | Two-column layout: credentials (left) + social providers (right). Wraps all auth pages. |
| `magic-link-form.svelte` | Email-only passwordless sign-in. Uses form action, not client API.                      |
| `password-input.svelte`  | Password field with show/hide toggle.                                                   |
| `social-icon.svelte`     | SVG icons for GitHub, Google, Facebook.                                                 |

Stories simulate full auth page layouts (login, register, forgot-password, reset-password).

## layout/ — App Shell

| Component            | Notes                                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------------------------ |
| `site-header.svelte` | Sticky header with logo and hamburger toggle.                                                          |
| `sidebar.svelte`     | Nav links with `aria-current` active state. CSS-only responsive (overlay on mobile, fixed on desktop). |
| `auth-status.svelte` | Shows user name or login link. Server-rendered.                                                        |

## dictionary/ — Character & Word Views

The largest and most complex component area. Renders the dictionary detail page for a single character.

### Core Components

| Component                    | Notes                                                                                 |
| ---------------------------- | ------------------------------------------------------------------------------------- |
| `character-view.svelte`      | Main orchestrator — composes all sub-components for a character page.                 |
| `character-breakdown.svelte` | Decomposition tree showing semantic/phonetic components. Links to explanation modals. |
| `character-glyph.svelte`     | Renders the character with color-coded component stroke highlights.                   |
| `stroke-animation.svelte`    | Animated stroke-by-stroke SVG drawing using CSS keyframes + SVG masking.              |
| `character-frequency.svelte` | Jun Da & SUBTLEX-CH frequency comparison bars.                                        |
| `cjk-linked-text.svelte`     | Auto-links CJK characters to their dictionary pages.                                  |
| `source-list.svelte`         | Groups and displays data source attribution.                                          |

### Historical/Linguistic

| Component                          | Notes                                                                |
| ---------------------------------- | -------------------------------------------------------------------- |
| `historical-images.svelte`         | Oracle bone, bronze, seal, clerical script image gallery with modal. |
| `historical-pronunciations.svelte` | Baxter-Sagart, Zhengzhang, Tang reconstructions.                     |
| `old-pronunciation-alert.svelte`   | Alert when a component's pronunciation has shifted historically.     |

### Component Type Explanation

| Component                           | Notes                                                                                                                                         |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `component-type-explanation.svelte` | Modal/page explaining the 8 component types (meaning, sound, iconic, etc.). Fetches example characters from `/api/dictionary/explain/[type]`. |

### Supporting Modules

| File                                         | Notes                                                                           |
| -------------------------------------------- | ------------------------------------------------------------------------------- |
| `char-link-context.ts`                       | Svelte context for character link base URL (`/dictionary` vs `/wiki`).          |
| `component-colors.ts`                        | Maps component types → CSS custom properties. OKLCH color space for duplicates. |
| `stories.data.ts`                            | Shared fixture data for Storybook stories.                                      |
| `component-type-explanation.stories.data.ts` | Large (206K) fixture with full CharacterData for all 8 types.                   |

## wiki/ — Character Wiki Editing

Components for the `/wiki` route group's editing and review UI.

| Component                                | Notes                                                                                                           |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `char-edit-form.svelte`                  | Structured edit form for character data (components, strokes, pronunciation, sources).                          |
| `component-editor.svelte`                | Sub-editor for character component tree (add/remove/reorder components with type and stroke data).              |
| `edit-list.svelte`                       | Shared compact edit list used by recent-changes and history pages. Supports diffs, pagination, actions snippet. |
| `edit-status-badge.svelte`               | Colored badge showing pending/approved/rejected status.                                                         |
| `field-diff.svelte`                      | Side-by-side diff viewer for edit history, handles all field types including JSON arrays.                       |
| `historical-image-editor.svelte`         | Editor for oracle bone, bronze, seal script images.                                                             |
| `historical-pronunciation-editor.svelte` | Editor for Baxter-Sagart, Zhengzhang, Tang reconstructions.                                                     |
| `key-value-editor.svelte`                | Generic key-value pair editor for structured source fields.                                                     |
| `list-editor.svelte`                     | Ordered list editor with add/remove/reorder.                                                                    |
| `tag-input.svelte`                       | Tag input with comma/enter to add, backspace to remove.                                                         |
| `wiki-header.svelte`                     | Wiki-specific header with logo and auth status.                                                                 |
| `wiki-sidebar.svelte`                    | Wiki navigation sidebar with search, character nav, and review links.                                           |

### Supporting Modules

| File                | Notes                                                                       |
| ------------------- | --------------------------------------------------------------------------- |
| `fragment-range.ts` | Converts between 0-indexed stroke index arrays and 1-indexed range strings. |

## Conventions

- **Reuse existing components** — always use `ui/` primitives (`Button`, `Alert`, `Modal`, etc.) instead of writing bespoke HTML+CSS for the same purpose. If a needed variant or size doesn't exist, add it to the shared component rather than creating one-off styles. This applies to all buttons, modals, alerts, and other common UI patterns.
- **Storybook stories** use Svelte CSF (`defineMeta` + `<Story>`) with auto-running play functions (tested via Vitest).
- **No Tailwind** — vanilla CSS with `--foreground`, `--background`, `--surface`, `--border`, `--muted-foreground` etc.
- **Dark mode** via `data-theme="dark"` on `<html>`, using CSS custom properties.
- **Icons** from `lucide-svelte`.
