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

## The fact check

- Run one reviewer agent per about 5 creatures. Each reviewer fetches every cited page and checks each card, catch question and review answer against it.
- Check each battle turn the same way: its move table, its model answer and its 3 key points, against the cited pages of the moves it names.
- A finding must quote the page. In town 1, one finding said "503 is for temporary conditions" was not on the page, and it was. Before you change content for a finding with no quote, check the page yourself.
- Fix every finding before the merge.

## The readable PR view

- Post the full content in PR comments, so the owner can read it on a phone. Use one folded section per creature, and mark the right choice with ✓.
- A GitHub comment holds at most 65,536 characters. Town 1 needed 2 comments of about 37,000 characters each. Split by creature.
