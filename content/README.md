# Content

All learning content lives here. Towns are JSON, with the schema in `src/content/schema.ts`. Weekend tasks are Markdown.

| File | What it holds |
| --- | --- |
| `towns/t01.json`, `towns/t02.json` | One town per file: its creatures, their moves, 10 placement questions, the confusable pairs and the battle scenarios, plus the v1.5 fields below |
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

## v1.5 fields

Design v1.5 adds the fields below. All of them are optional, so Town 1 and Town 2 as they are today still pass. `npm run content:check` checks each rule. The test fixture `fixtureTownV2()` in `src/content/fixture-town.ts` has every field.

All text is plain text, as above. Only a `diagram` and a `diff` may have line breaks.

### Town

| Field | What it holds | Rules |
| --- | --- | --- |
| `intro` | The Town Intro, shown on the town's first day (design 6.1) | `title`, `screens` (1 or more texts), one `diagram`, one `source` |
| `skills` | The tech lead Skills the town adds | 1 or 2 Skill ids |

### Creature and move

| Field | On | What it holds | Rules |
| --- | --- | --- | --- |
| `lesson` | creature and move | What the learner reads before the catch question (design 6.3) | Exactly 3 `screens`. Each screen has a `text` of at most 50 words and an optional `diagram`. `answerScreen` (0, 1 or 2) is the screen that holds the catch answer. One `source` for the whole Lesson |
| `sprite` | creature | The species number in the creature art pack | A whole number from 1. No two creatures share one, in any town. Display only: changing it does not change the content hash |
| `tradeOff` | creature | The hard trade-off question for Stage 3 (design 6.5) | 3 `options`, see "Scored cards" below |
| `decisionCards` | creature | Decision Cards for review (design 6.4) | Each has 2 `options`, see "Scored cards" below |

The old `card` stays. Review and "Discuss in Claude" still use it. A Lesson is added next to it.

### Scored cards: Decision Cards and trade-off questions

The app scores these by itself: the learner picks one option, then one Reason.

| Field | Rules |
| --- | --- |
| `id` | Never changes, because review stores it. A Decision Card is `<creature>.decision.<name>`, for example `cache.decision.logo`. A trade-off question is `<creature>.trade-off.<name>`, for example `cache.trade-off.fresh-prices`. To replace one, retire it and add one with a new name |
| `situation` | A short situation |
| `options`, `rightOption` | 2 options for a Decision Card, 3 for a trade-off question. `rightOption` is the index of the right one |
| `reasons` | Exactly 3 Reasons, each `{ "text": "…", "right": true or false }`. Exactly 1 is right |
| `explanation` | Shown after the answer |
| `skills` | 1 or more Skill ids |

### Skills

A Skill id is a fixed number from 1 to 26. The numbers match the list in `research/tech-lead-skills.md`, and the names live in `src/content/skills.ts`. A number never changes its meaning.

### Battle scenarios

A scenario becomes a **v1.5 scenario** when one of its turns has a `constraint`, `reasons` or `skills`, or when it has a `kind` other than `battle`. A v1.5 scenario must follow every rule here.

| Field | On | What it holds | Rules |
| --- | --- | --- | --- |
| `kind` | scenario | `battle` (the default when left out), `meeting` or `agent-diff` (design 7.1) | The app offers a `meeting` on 1 or 2 Battle days a week (#105). Until the Agent Diff Battle screen ships, it never offers `agent-diff` |
| `source` | scenario | The real incident or situation the battle comes from (design 7.6) | Required in a v1.5 scenario |
| `person` | scenario | Who asks in a Meeting Battle | Only in `meeting`, and required there: `client`, `manager` or `cto` |
| `diff` | scenario | The short diff an AI agent wrote, with one planted problem | Only in `agent-diff`, and required there. May have line breaks |
| `twinOf` | scenario | The id of the scenario this one is the Gym twin of (design 7.5) | See "Gym twins" below |
| `constraint` | turn | The one-line situation that decides the best move (design 7.2) | Required on every turn. One short line: each sentence at most 20 words |
| `reasons` | turn | The 3 Reasons the learner picks from before the result | Exactly 3, exactly 1 `right` |
| `skills` | turn | The Skills the turn trains | 1 or more Skill ids |
| `label` | move row | The words on the button of a Meeting answer | Only in `meeting`, and required there |

Moves in each kind:

- `battle`: a `moveId` is a real creature move, as before.
- `meeting`: a `moveId` is `answer.<name>`, for example `answer.give-new-date`. The `label` holds the answer.
- `agent-diff`: a `moveId` is a review verdict: `verdict.approve`, `verdict.ask-for-test`, `verdict.block` or `verdict.narrow`.

So no creature may have the id `answer` or `verdict`.

From Town 2 on, every v1.5 `battle` has at least one turn whose best move is a move of a creature from an earlier town (design 7.5).

#### Gym twins

The Gym meets an old situation again with the Constraint reversed (design 7.5). For example, `CDN cache` won last time, but now prices change every minute, so it loses. A twin is a full scenario with its own id and `"twinOf": "<scenario id>"`.

- `twinOf` names another scenario of the same town, not the twin itself.
- That scenario is a normal scenario: not another twin, and not retired. A chain or a cycle of twins would hide every battle in it.
- The twin has the same `opponentType` and the same `kind` as that scenario.
- At least one turn of the twin has the same `threat` as a turn of that scenario, word for word.
- On at least one of those turns, the best move is a different move. The reversed Constraint is the reason.
- A twin is a v1.5 scenario, so every turn has a Constraint, 3 Reasons and Skills, and the twin has a `source`.
- The other turns may be copies of the old turns.
- `twinOf` is not in the content hash, like `name`.
- The Battle screen shows the Constraint (#103). Until the Gym uses twins, the app does not offer a twin.

A Reason is logged by its index in the file's `reasons` list (0, 1 or 2), next to the scenario's content hash. Moving a Reason changes the hash, so an old log still says which list its index points into. The app may show the Reasons in another order, but it logs the file index.

Example v1.5 turn, with the other fields as above:

| Field | Value |
| --- | --- |
| `constraint` | `"The price changes every minute during the sale."` |
| `reasons[0]` | `{ "text": "A price must never come from an old copy.", "right": true }` |
| `reasons[1]` | `{ "text": "No store makes every page faster.", "right": false }` |
| `reasons[2]` | `{ "text": "A CDN always has the newest price.", "right": false }` |
| `skills` | `[3, 10]` |

## Commands

| Command | What it does |
| --- | --- |
| `npm run content:build` | Checks the content, adds new ids to the ledger, and writes `src/content/bundle.generated.json` |
| `npm run content:check` | Fails on any broken rule, or when the bundle is out of date. CI and `npm run build` run it |

Commit the ledger and the bundle together with the content change.
