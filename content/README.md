# Content

All learning content lives here. Towns are JSON, with the schema in `src/content/schema.ts`. Weekend tasks are Markdown.

| File | What it holds |
| --- | --- |
| `towns/t01.json` | One town: its creatures, their moves, 10 placement questions, the confusable pairs and the battle scenarios |
| `glossary.json` | Hard words with a simple English definition |
| `ledger.json` | Every id that ever shipped. Never edit it by hand |
| `weekends/month-01/` | Markdown tasks for the month 1 weekends, used until the weekend editor exists (Sprint 4) |

## Rules

- An id is a short slug and never changes: `cache`, `cache.ttl`, `t01`. A move id starts with its creature id.
- A display name (`name`) can change. It does not change the content hash.
- Never delete an item. Set `"retired": true` and leave it in the file.
- Every card has one real example and one `https` primary source.
- A card is at most 150 words, with its example. A sentence is at most 20 words.
- All text is plain text: no backticks and no line breaks. The app shows a backtick as a backtick, and a line break collapses.
- The choices of a catch question are all different, also when you ignore capital letters and spaces.

## Battle scenarios

A scenario is one battle (design 7). Its id is `<town>-<name>`, for example `t01-black-friday`.

- `opponentType` is one of `traffic`, `speed`, `security`, `data`, `outage`.
- It has exactly 3 turns. Each turn has a `threat`, a move table of 3 or 4 rows, a `modelAnswer` and 3 `keyPoints`.
- The `modelAnswer` is what a senior engineer says to this threat. It explains the best move and its cost. The app shows it after the turn's result, next to the learner's why.
- `keyPoints` is a list of exactly 3 short points of the model answer. The learner ticks the ones they said. A point not ticked brings the turn's best move back in tomorrow's reviews.
- Each sentence of the model answer and of each key point is at most 20 words, in plain text.
- A row has a `moveId`, a `damage` of 0, 1 or 2, and a `counterattack`.
- The counterattack is one sentence with the consequence only. The app adds "You chose <move>." in front.
- Each turn has exactly one best move: one row with the top damage.
- The best moves of the 3 turns must do at least 4 damage together, so a perfect battle wins.
- Every move in a table is a real move of any town, and it is not retired. Replace it in the table before you retire it.
- The app offers a scenario once the learner caught the creature of each best move.

## Town twist

A town can turn on one small battle twist (design 4). Town 1 has none. `npm run content:check` checks every rule below.

- The twist is a town field: `"twist": { "kind": "two-types" }`. Leave it out for no twist.
- `two-types` is the only kind so far. The app shows its name and rule; the content does not write them.
- In a `two-types` town, every scenario has a `secondType`, one of the 5 opponent types. It differs from `opponentType`.
- Each of its 3 turns has a `threatType`: the type that attacks on that turn, `opponentType` or `secondType`.
- Both types attack in at least one turn.
- Damage does not change: it still comes from the move table, with the same rules as above.
- A town with no twist has no `secondType` and no `threatType`.

Example scenario of a `two-types` town, with the other fields as above:

| Field | Value |
| --- | --- |
| `opponentType` | `traffic` |
| `secondType` | `security` |
| `turns[0].threatType` | `traffic` |
| `turns[1].threatType` | `security` |
| `turns[2].threatType` | `traffic` |

## Commands

| Command | What it does |
| --- | --- |
| `npm run content:build` | Checks the content, adds new ids to the ledger, and writes `src/content/bundle.generated.json` |
| `npm run content:check` | Fails on any broken rule, or when the bundle is out of date. CI and `npm run build` run it |

Commit the ledger and the bundle together with the content change.
