# Dictionary Definitions & NLP Pipeline — Design

## Goals

1. **Frequency-sorted definitions**: Each word/character has definitions ranked by real-world usage, so learners see the most important meaning first.
2. **Example sentences**: Every definition is backed by real text examples, drawn from a corpus of processed Chinese texts.
3. **LLM-powered NLP pipeline**: Chinese texts are segmented into words, each word linked to a specific definition. When no existing definition fits, the LLM proposes a new one.
4. **Human curation**: Editors can modify, merge, split, and delete definitions through a dictionary editing interface. All text references are preserved or repointed.
5. **Concurrency-safe**: Multiple LLM workers can process texts in parallel while humans edit definitions, without data corruption or duplicates.

## Data Model

### Core Tables

```
dict_word
├── id (PK)
├── simplified (text, not null)
├── traditional (text)
├── pinyin (text, not null)       -- space-separated tonal syllables, e.g. "dǎ"
├── created_at
└── UNIQUE(simplified, pinyin)    -- same hanzi + different pinyin = different word

dict_definition
├── id (PK)
├── word_id (FK → dict_word)
├── pos (text)                    -- part of speech: n, v, adj, adv, mw, conj, etc.
├── gloss (text, not null)        -- English definition text
├── source (text, default 'cedict')  -- 'cedict', 'llm', 'human'
├── is_active (bool, default true)
├── superseded_by (FK → dict_definition, nullable)
├── created_at
├── updated_at
└── version (int, default 1)      -- optimistic concurrency for human edits
```

### Text & Segment Tables

```
text
├── id (PK)
├── content (text, not null)      -- the raw Chinese text
├── source (text)                 -- provenance: 'hsk', 'textbook', 'news', 'subtitles', etc.
├── difficulty (int)              -- estimated HSK level or similar
├── processing_status (text)      -- 'pending', 'claimed', 'done', 'failed'
├── processing_by (text)          -- worker ID (null when unclaimed)
├── processing_since (timestamptz)
└── created_at

text_segment
├── text_id (FK → text, ON DELETE CASCADE)
├── position (int)                -- character offset in text
├── length (int)                  -- number of characters
├── word_id (FK → dict_word)
├── definition_id (FK → dict_definition)
├── confidence (real)             -- LLM confidence, 0.0–1.0
└── PRIMARY KEY (text_id, position)

reanalysis_queue
├── id (PK)
├── text_id (FK → text)
├── reason (text)                 -- 'definition_split', 'definition_deleted', 'word_merged'
├── created_at
└── processed_at (nullable)
```

### Relationships

```
dict_word  1──N  dict_definition
dict_word  1──N  text_segment
dict_definition  1──N  text_segment
text  1──N  text_segment
```

## CEDICT Seeding

CEDICT format: `simplified traditional [pinyin] /gloss1/gloss2/.../`

**Strategy**: Split each CEDICT entry by `/` separator. Each gloss becomes its own `dict_definition` row.

Rationale: The frequency/example-sentence system needs to link text segments to _specific_ senses. Keeping "to hit / to play / to make" as one mega-definition defeats the purpose. Splitting upfront means the LLM can point to exactly the right sense from day one.

Some CEDICT glosses are near-synonyms ("beautiful" / "pretty"). These will naturally sort by frequency — the one the LLM picks more often rises to the top. Low-frequency near-duplicates can be merged during human curation later.

**Seeding steps:**

1. Parse CEDICT → create `dict_word` rows (simplified, traditional, pinyin)
2. Split glosses by `/` → create `dict_definition` rows (source = 'cedict')
3. Attempt basic POS tagging heuristically from CEDICT gloss patterns:
   - Starts with "to " → verb
   - Starts with "a " / "the " → noun
   - Contains "(classifier" → measure word
   - Otherwise → null (to be filled by pipeline)

## NLP Pipeline

### Processing a Single Text

```
Input: "我在银行工作了三年。"

Step 1 — Pre-segmentation (cheap, fast)
  jieba/pkuseg → ["我", "在", "银行", "工作", "了", "三", "年"]

Step 2 — Candidate lookup
  For each segment, fetch active definitions from dict_definition
  银行 → [{id: 1001, gloss: "bank (financial)"}, ...]
  工作 → [{id: 2001, gloss: "to work"}, {id: 2002, gloss: "job"}, ...]

Step 3 — LLM analysis
  Prompt includes: full text, pre-segmentation, candidate definitions
  LLM returns: corrected segmentation + definition selections + proposals

Step 4 — Post-processing
  - For selected existing definitions: write text_segment rows
  - For proposed new definitions: create via serialized coordinator
  - For corrected segmentation: use LLM boundaries, not jieba's
```

### LLM Output Format

```json
{
	"segments": [
		{ "text": "我", "position": 0, "word_id": 1, "definition_id": 101, "confidence": 0.99 },
		{ "text": "在", "position": 1, "word_id": 2, "definition_id": 201, "confidence": 0.95 },
		{ "text": "银行", "position": 2, "word_id": 50, "definition_id": 1001, "confidence": 0.98 },
		{ "text": "工作", "position": 4, "word_id": 75, "definition_id": 2001, "confidence": 0.9 },
		{ "text": "了", "position": 6, "word_id": 3, "definition_id": 301, "confidence": 0.85 },
		{ "text": "三", "position": 7, "word_id": 100, "definition_id": 3001, "confidence": 0.99 },
		{ "text": "年", "position": 8, "word_id": 110, "definition_id": 4001, "confidence": 0.97 }
	]
}
```

When no existing definition fits:

```json
{
	"text": "躺平",
	"position": 5,
	"word_id": null,
	"definition_id": null,
	"proposed": {
		"simplified": "躺平",
		"pinyin": "tǎng píng",
		"pos": "v",
		"gloss": "to lie flat (slang: to opt out of competitive society)"
	},
	"confidence": 0.8
}
```

Proposed entries go through a **definition coordinator** (see Concurrency section) and optionally a human review queue.

### Pre-segmentation vs. LLM-only

Pre-segmentation with jieba serves two purposes:

1. **Reduces LLM work**: The LLM corrects rather than segments from scratch
2. **Provides candidate definitions**: We can batch-fetch definitions for candidate words before the LLM call, putting them directly in the prompt

The LLM is free to disagree with jieba's boundaries — it might merge ("银" + "行" → "银行") or split differently.

## Concurrency Design

### Problem Scenarios

| Scenario                                     | Risk                              | Solution                                                    |
| -------------------------------------------- | --------------------------------- | ----------------------------------------------------------- |
| Two workers encounter same unknown word      | Duplicate definitions             | UNIQUE constraint + INSERT ON CONFLICT                      |
| Worker references a just-deleted definition  | Dangling FK                       | Soft deletes (never hard-delete)                            |
| Two workers process the same text            | Wasted work, conflicting segments | Claim-before-process                                        |
| Human splits definition during processing    | Worker writes to stale definition | Redirect + lazy reanalysis                                  |
| Human edits definition while worker reads it | Worker uses outdated gloss        | Acceptable — worker's definition _selection_ is still valid |

### Solution 1: Serialized Definition Creation

LLM workers never INSERT definitions directly. Instead:

1. Worker proposes: `{ simplified: "躺平", pinyin: "tǎng píng", gloss: "to lie flat..." }`
2. Coordinator function (Postgres function or app-level serialized queue):
   ```sql
   INSERT INTO dict_definition (word_id, pos, gloss, source)
   VALUES ($word_id, $pos, $gloss, 'llm')
   ON CONFLICT ON CONSTRAINT unique_active_definition DO NOTHING
   RETURNING id;
   ```
3. If ON CONFLICT fires, fetch the existing definition's ID instead
4. Worker gets back a definition_id either way

The unique constraint needs thought. Exact `(word_id, pos, gloss)` is too strict (minor wording differences). Options:

- Unique on `(word_id, pos, normalized_gloss)` where normalized strips articles/punctuation
- Advisory lock per word_id, then check for near-duplicates before inserting
- Accept some duplicates, merge during human curation

Recommendation: **Advisory lock per word_id** for the creation path. It's simple, correct, and the lock is held only briefly.

```sql
SELECT pg_advisory_xact_lock(hashtext('def_create:' || $word_id::text));
-- Check for near-duplicate
-- Insert if none found
```

### Solution 2: Claim-Before-Process

Prevents duplicate work on the same text:

```sql
UPDATE text
SET processing_by = $worker_id, processing_since = now(), processing_status = 'claimed'
WHERE id = $text_id
  AND (processing_status = 'pending'
       OR (processing_status = 'claimed' AND processing_since < now() - interval '5 minutes'))
RETURNING id;
```

- If RETURNING gives a row → you own it, proceed
- If no row → someone else is processing it, skip
- The 5-minute timeout handles crashed workers

When done:

```sql
UPDATE text SET processing_status = 'done', processing_by = NULL WHERE id = $text_id;
```

### Solution 3: Soft Deletes with Redirects

Definitions are never hard-deleted:

```sql
-- "Delete" a definition (actually deactivate + redirect)
UPDATE dict_definition
SET is_active = false, superseded_by = $replacement_id, updated_at = now()
WHERE id = $old_id;
```

Text segments referencing a superseded definition still have a valid FK. The redirect chain tells you where to look for the current active definition:

```sql
-- Resolve a potentially-redirected definition
WITH RECURSIVE chain AS (
  SELECT id, gloss, superseded_by, is_active FROM dict_definition WHERE id = $def_id
  UNION ALL
  SELECT d.id, d.gloss, d.superseded_by, d.is_active
  FROM dict_definition d JOIN chain c ON d.id = c.superseded_by
)
SELECT * FROM chain WHERE is_active = true LIMIT 1;
```

### Solution 4: Idempotent Segment Writes

Text segments use upsert semantics:

```sql
INSERT INTO text_segment (text_id, position, length, word_id, definition_id, confidence)
VALUES ($text_id, $pos, $len, $word_id, $def_id, $conf)
ON CONFLICT (text_id, position) DO UPDATE
SET length = EXCLUDED.length,
    word_id = EXCLUDED.word_id,
    definition_id = EXCLUDED.definition_id,
    confidence = EXCLUDED.confidence;
```

If two workers somehow process the same text (shouldn't happen with claims, but defensive), the last write wins. Both should produce similar results.

## Human Curation Workflows

### Edit Gloss Text

No reanalysis needed — the definition ID stays the same, text references are unaffected.

```sql
UPDATE dict_definition SET gloss = $new_gloss, version = version + 1, updated_at = now()
WHERE id = $id AND version = $expected_version;
```

### Merge Definitions

Two definitions are really the same sense. Pick a winner:

```sql
BEGIN;
  UPDATE dict_definition SET is_active = false, superseded_by = $winner_id WHERE id = $loser_id;
  UPDATE text_segment SET definition_id = $winner_id WHERE definition_id = $loser_id;
COMMIT;
```

No reanalysis needed — it's a simple repoint.

### Split Definition

One definition covers two distinct senses. Create the new definitions, then let the LLM reclassify:

```sql
BEGIN;
  -- Create new fine-grained definitions
  INSERT INTO dict_definition (word_id, pos, gloss, source) VALUES ($word_id, $pos, $gloss_a, 'human');
  INSERT INTO dict_definition (word_id, pos, gloss, source) VALUES ($word_id, $pos, $gloss_b, 'human');

  -- Deactivate the original
  UPDATE dict_definition SET is_active = false WHERE id = $original_id;

  -- Queue affected texts for LLM reanalysis
  INSERT INTO reanalysis_queue (text_id, reason)
  SELECT DISTINCT text_id, 'definition_split'
  FROM text_segment WHERE definition_id = $original_id;
COMMIT;
```

Background worker picks up queued texts, re-runs the LLM with the new definition options, updates segments.

### Delete Definition

Soft-delete + queue reanalysis (LLM picks from remaining definitions):

```sql
BEGIN;
  UPDATE dict_definition SET is_active = false WHERE id = $id;
  INSERT INTO reanalysis_queue (text_id, reason)
  SELECT DISTINCT text_id, 'definition_deleted'
  FROM text_segment WHERE definition_id = $id;
COMMIT;
```

## Derived Data

### Definition Frequencies

```sql
SELECT d.id, d.gloss, d.pos, COUNT(ts.text_id) AS usage_count
FROM dict_definition d
LEFT JOIN text_segment ts ON ts.definition_id = d.id
WHERE d.word_id = $word_id AND d.is_active = true
GROUP BY d.id, d.gloss, d.pos
ORDER BY usage_count DESC;
```

Can be materialized into a `definition_frequency` table and refreshed periodically if query performance demands it.

### Example Sentences

```sql
SELECT t.content, ts.position, ts.length
FROM text_segment ts
JOIN text t ON t.id = ts.text_id
WHERE ts.definition_id = $definition_id
ORDER BY ts.confidence DESC, length(t.content) ASC  -- high confidence, short texts
LIMIT 5;
```

Short, high-confidence examples make the best dictionary illustrations.

## Open Questions

1. **Characters vs. words**: Should single characters use this same definition system, or keep the existing `dict_char` structure separate? Characters have etymology/components data that words don't. Possible hybrid: character pages pull from both `dict_char` (for breakdown/etymology) and `dict_definition` (for frequency-ranked definitions and examples).

2. **Granularity of CEDICT splits**: Some CEDICT glosses like "beautiful/pretty" are near-synonyms. Split into two definitions, or keep as one? Leaning toward: split everything, merge later if needed. The LLM will naturally pick one over the other, and the less-used one can be merged in curation.

3. **What texts to seed first**: The corpus determines definition quality. Priorities:
   - HSK graded word lists with example sentences (high value, curated)
   - Textbook dialogues (graded, natural language)
   - Subtitle corpus (large volume, colloquial)
   - News articles (formal register)

4. **LLM cost at scale**: Processing 100k texts at ~$0.005/text = ~$500. Reanalysis from definition edits adds more. Worth batching texts that share the same words to amortize definition lookups.

5. **Review queue for LLM-proposed definitions**: Auto-accept, or require human approval? Could use confidence threshold: high confidence → auto-accept, low confidence → queue for review.

6. **Multi-character word boundaries**: 工作了 — is 了 part of the word or a separate particle? The LLM should handle this, but we need a convention. CEDICT treats 了 as separate, which is linguistically correct. The LLM should follow CEDICT's word boundaries as a baseline.

## Implementation Order

1. **Schema**: Add `dict_word`, `dict_definition`, `text`, `text_segment`, `reanalysis_queue` tables
2. **CEDICT import**: Parse and seed `dict_word` + `dict_definition` from the existing `cedict_raw` staging data
3. **Definition API**: CRUD endpoints for definitions, with optimistic concurrency and soft deletes
4. **Definition display**: Show frequency-sorted definitions on word/character pages
5. **Pipeline MVP**: Single-worker text processing with LLM (no parallelism yet)
6. **Example sentences**: Query and display on definition pages
7. **Curation UI**: Edit/merge/split definitions, with reanalysis queue
8. **Parallel workers**: Claim-based concurrency, advisory locks for definition creation
