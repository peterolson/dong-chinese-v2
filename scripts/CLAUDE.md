# Scripts — Data Import Pipeline

All scripts use `postgres.js` directly (not Drizzle) for bulk operations. Run via `npm run dictionary:<name>` or `npm run import:users`.

## Conventions

Every import script follows the same pattern:

- **Idempotent**: Uses checksums via `sync_metadata` table. Skips if data hasn't changed.
- **Upserts**: `ON CONFLICT DO UPDATE` for safe re-runs.
- **Audit columns**: `sync_version`, `is_current`, `created_at`, `updated_at` on every row.
- **Batch processing**: Inserts in batches (typically 1000 rows) to avoid memory issues.
- **Download caching**: Fetched files are checksummed; only re-imported when source changes.

## Import Scripts

| Script                       | Target Table             | Rows   | Source                                      |
| ---------------------------- | ------------------------ | ------ | ------------------------------------------- |
| `import-unihan.ts`           | `stage.unihan_raw`       | 1.56M  | Unicode Unihan (EAV format)                 |
| `import-cedict.ts`           | `stage.cedict_raw`       | 124k   | CC-CEDICT (gzipped)                         |
| `import-dong-dictionary.ts`  | `stage.dong_*_raw`       | varies | Dong Chinese MongoDB (requires MONGODB_URI) |
| `import-animcjk.ts`          | `stage.animcjk_raw`      | ~8.7k  | AnimCJK GitHub (NDJSON)                     |
| `import-makemeahanzi.ts`     | `stage.makemeahanzi_raw` | ~9.6k  | MakeMeAHanzi GitHub                         |
| `import-shuowen.ts`          | `stage.shuowen_raw`      | varies | Shuowen Jiezi etymology                     |
| `import-baxter-sagart.ts`    | `stage.baxter_sagart`    | varies | Wiktionary Lua modules (rate-limited)       |
| `import-zhengzhang.ts`       | `stage.zhengzhang`       | varies | Wiktionary Lua modules (rate-limited)       |
| `import-jun-da-char-freq.ts` | `stage.jun_da`           | varies | Jun Da corpus (193M chars)                  |
| `import-subtlex-ch.ts`       | `stage.subtlex_ch`       | varies | SUBTLEX-CH (GBK zip archives)               |

## Materialization

| Script                 | Purpose                                                                                                                                                                                       |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rebuild-dict-char.ts` | Builds `dictionary.char_base` from all stage tables. Loads everything into memory maps, merges with priority chains, batch upserts. Atomically re-creates the `dictionary.char` view on swap. |
| `create-char-view.ts`  | Creates/replaces the `dictionary.char` view (overlays approved `char_manual` edits on `char_base`). Idempotent via `CREATE OR REPLACE`. Run after initial schema push.                        |

## Shared Utilities

| File                                   | Purpose                                                                                              |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `dictionary/wiktionary-lua-modules.ts` | Fetches + parses Wiktionary Lua tables. Handles pagination and 429 rate-limit backoff (500ms delay). |
| `dictionary/char-view-sql.ts`          | Shared `CHAR_VIEW_SQL` constant used by both `rebuild-dict-char.ts` and `create-char-view.ts`.       |

## User Migration

| Script                   | Purpose                                                                                                                        |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `import-meteor-users.ts` | Migrates ~24k users from Meteor MongoDB. Preserves bcrypt hashes + OAuth provider IDs. Batch of 100, `ON CONFLICT DO NOTHING`. |

## Permissions Import

| Script                  | Purpose                                                                                                                                 |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `import-permissions.ts` | Imports `wikiEdit` permissions from MongoDB `dong-chinese.permissions` collection. Matches by Meteor user ID. `ON CONFLICT DO NOTHING`. |

## Running

```bash
npm run dictionary:sync             # Run all dictionary imports
npm run dictionary:rebuild-char     # Rebuild dict_char from stage tables (re-creates char view)
npm run dictionary:create-char-view # Create/replace the dictionary.char view
npm run import:users                # Migrate Meteor users (requires MONGODB_URI)
npm run import:permissions          # Import wikiEdit permissions (requires MONGODB_URI)
```

Individual imports: `npm run dictionary:import-unihan`, `npm run dictionary:import-cedict`, etc.
