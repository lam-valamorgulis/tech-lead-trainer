# Content authoring

How an agent writes and checks a content ticket: town content, battle scenarios, weekend packs. Town 1 (#10, PR #54) had to find these rules. The file format and the card rules (ids, word limits, one source per card) are in `content/README.md`.

## How the app uses content

- The app shows every text as plain text. A backtick shows as a backtick, and a line break disappears. So write no backticks, no Markdown and no line breaks. `npm run content:check` checks this for every town. Each town also has its own guard file, like `src/content/town-2.test.ts`.
- Catch order is file order: each creature, then its moves, from the top of the file down. Put the basics first.
- The learner gets 1 catch per day, and none on a 3-minute day. Town 1 has 55 items, more than a month of days.
- Placement is self-graded. The learner types an answer, sees the model answer, and marks it "Yes, I knew it" or "Not yet". A "Yes" catches that creature without using the day's catch. So give each placement question a short model answer that is easy to compare.

## The writer brief

Give the writer agent these rules:

- Cite only pages the agent fetched in this run, from the sources in `research/roadmap-sources.md`. Never cite a page from memory.
- Write in B1 English.
- Make every wrong choice believable: a mistake a real learner makes, not a joke.
- Spread the right choice over all positions. The catch screen shuffles the choices, but the readable PR comments show them in file order.
- Give every battle turn a `modelAnswer` and exactly 3 `keyPoints` (`content/README.md`). The model answer explains the best move and its cost. Each key point is one short idea a learner can say in their "why". The learner ticks the points they said, so each point must be easy to recognise.

For v1.5 content (design v1.5, `content/README.md` "v1.5 fields"), add these rules:

- **Lesson:** 3 screens, one idea each, at most 50 words. Put one real example in one screen. Use one primary source for the whole Lesson. Add a diagram only when the idea needs one: boxes and arrows, readable on an iPhone. Set `answerScreen` to the screen that holds the catch answer.
- **Constraint:** one short line that changes which move is best. Two scenarios with the same threat and a different Constraint must have a different best move. A Constraint names a fact (budget, team, deadline, data), never the answer.
- **Reasons:** 3 per turn and per card, exactly 1 right. Make the 2 wrong Reasons believable: a wrong belief a real engineer has. Spread the right Reason over positions 0, 1 and 2. The app logs a Reason by its position, so after a merge only change the order together with the content.
- **Decision Card and trade-off question:** a short situation, then 2 options (Decision Card) or 3 options (trade-off question). Spread the right option too. An id never changes: to replace a card, retire it and add a new id.
- **Skills:** tag each turn and card with the Skill numbers of `research/tech-lead-skills.md`. A number never changes its meaning.
- **Meeting Battle:** each answer is `answer.<name>` with a `label`. The best answer follows "what good looks like in a meeting" in `research/tech-lead-skills.md`.
- **Scenario source:** link the real incident or situation (design 7.6). It is fine to make the story shorter, but the link points to the real one.

## The fact check

Run the independent fact check with the `fact-check` skill (`/fact-check <town file> <PR>`). The steps are in `docs/agents/fact-check.md`: fresh reviewer agents, a few pages each, and a report in the PR. A content PR does not merge without the report: the "Content PR" CI check fails until the PR body has a "## Fact check report" section with the link to the report comment. `/pr` writes the rest of the body; copy that section's shape from `.github/PULL_REQUEST_TEMPLATE/content.md`.

Checklist:

- [ ] `npm run fact-check -- list` covers the town file of this PR.
- [ ] One fresh reviewer per part, with the prompt from `docs/agents/fact-check.md`. The writer agent checks nothing.
- [ ] Every claim is checked against its page: card, catch question, review answer, worked example, Lesson screen, Decision Card, trade-off question, and each battle turn with its Constraint, right Reason, model answer and key points.
- [ ] Every finding quotes the page. A finding without a quote is "check by hand": open the page yourself before you change content. In Town 1, one finding said "503 is for temporary conditions" was not on the page, and it was.
- [ ] Every "Wrong" claim is fixed or removed before the merge, every "Check by hand" claim is opened by hand, and the changed claims are checked again.
- [ ] The report is a PR comment, and its summary table is in the PR body.

## The readable PR view

- Post the full content in PR comments, so the owner can read it on a phone. Use one folded section per creature, and mark the right choice with ✓.
- A GitHub comment holds at most 65,536 characters. Town 1 needed 2 comments of about 37,000 characters each. Split by creature.
