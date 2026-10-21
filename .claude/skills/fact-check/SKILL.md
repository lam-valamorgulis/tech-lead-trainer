---
name: fact-check
description: Independent fact check of a Tech Lead Trainer town file before its content PR merges (design 8, ticket #96). Starts fresh reviewer agents that open every cited page, then posts the report to the PR. Use for "/fact-check content/towns/t01.json 123", "fact check the town", or any content PR.
---

# Fact check a town file

Arguments: the town file, and the PR number when there is one. Example: `/fact-check content/towns/t02.json 140`.

The full rules are in `docs/agents/fact-check.md`. Follow them; this is the short run order.

1. **List the claims** into the scratchpad:

   ```sh
   npm run fact-check -- list <town file> --out <scratchpad>/fc-<town>
   ```

2. **Start one fresh reviewer per part, all in one message**, with the Agent tool: `subagent_type: general-purpose`, `model: sonnet`. Use the "Reviewer prompt" from `docs/agents/fact-check.md` word for word, with `<part>` set to `part-N.json` and `<findings>` to `findings-N.json` in the same folder. Give a reviewer nothing else: no writer notes, no context from this conversation. The agent that wrote the content is never a reviewer.

3. **Wait** for every reviewer. Do not read their transcripts. Then build the report:

   ```sh
   npm run -s fact-check -- report <town file> <scratchpad>/fc-<town>/findings-*.json --verify > <scratchpad>/fc-<town>/report.md
   ```

4. **With a PR number:** post the report and note the comment link.

   ```sh
   gh pr comment <PR> --body-file <scratchpad>/fc-<town>/report.md
   ```

   Then add a `## Fact check report` section to the PR body: the summary table from the report and the comment link (`…#issuecomment-<id>`). The "Content PR" CI check needs both.

5. **Tell the user** the summary table, and list each "Wrong or not on the page" claim in one line. Fix or remove those claims, open the page yourself for each "check by hand" claim, and run the check again on the changed claims.
