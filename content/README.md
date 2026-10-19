# Content

All learning content lives here. Towns are JSON, with the schema in `src/content/schema.ts`. Weekend tasks are Markdown.

| File | What it holds |
| --- | --- |
| `towns/t01.json` | One town: its creatures, their moves, 10 placement questions and the confusable pairs |
| `glossary.json` | Hard words with a simple English definition |
| `ledger.json` | Every id that ever shipped. Never edit it by hand |
| `weekends/month-01/` | Markdown tasks for the month 1 weekends, used until the weekend editor exists (Sprint 4) |

## Rules

- An id is a short slug and never changes: `cache`, `cache.ttl`, `t01`. A move id starts with its creature id.
- A display name (`name`) can change. It does not change the content hash.
- Never delete an item. Set `"retired": true` and leave it in the file.
- Every card has one real example and one `https` primary source.
- A card is at most 150 words, with its example. A sentence is at most 20 words.

## Commands

| Command | What it does |
| --- | --- |
| `npm run content:build` | Checks the content, adds new ids to the ledger, and writes `src/content/bundle.generated.json` |
| `npm run content:check` | Fails on any broken rule, or when the bundle is out of date. CI and `npm run build` run it |

Commit the ledger and the bundle together with the content change.
