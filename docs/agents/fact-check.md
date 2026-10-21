# Content fact check

Every content PR gets an independent fact check before it merges (design 8, ticket #96). The agent that wrote the content never checks it. Fresh reviewer agents open every cited page and check each claim against it. A content PR does not merge without the report.

## Steps

1. Write the claims of the town into parts, a few pages per part:

   ```sh
   npm run fact-check -- list content/towns/t01.json --out <scratchpad>/fc-t01
   ```

   Each `part-N.json` is a list of pages. Each page lists the claims it must support: card text and example, catch question with its right answer, review answer, worked example, Lesson screens, Decision Cards and trade-off questions, and each battle turn (threat, Constraint, best move and its cost, right Reason, model answer, key points). A v1.5 battle turn is checked against its scenario's source; an older one against its best move's page.

2. Start one fresh reviewer agent per part, all at once, with the prompt below. Use the `sonnet` model. Never give a reviewer the writer's notes or this conversation.

3. When every reviewer is done, print the report:

   ```sh
   npm run fact-check -- report content/towns/t01.json <scratchpad>/fc-t01/findings-*.json
   ```

   A claim without a quote, or with no finding at all, is listed as **check by hand**.

4. Post the report as a PR comment, and paste its summary table into the PR body under "Fact check report". A GitHub comment holds at most 65,536 characters; split the supported list if it is longer.

5. Fix every claim under "Wrong or not on the page" and "Check by hand" before the merge. For a finding with no quote, open the page yourself first: in Town 1, one finding said a sentence was missing, and it was there. After the fixes, check the changed claims again.

## Reviewer prompt

Replace `<part>` and `<findings>` with the two file paths.

```text
You are a fact checker for a learning app. Answer in simple English (B1, short sentences).
Read <part>. It is a JSON list of pages: { url, title, claims: [{ where, text }] }.

For each page:
1. Open the url with WebFetch. Open each page once. If it does not load, try once more.
2. For each claim of that page, decide:
   - "supported": the page says the same thing. Small simplifications for a beginner are fine.
   - "wrong": the page says something different.
   - "not-on-page": the page does not say it.
3. Copy a quote from the page: the exact words, at most 40 words, that support the claim or show it is wrong.
   Never write a quote from memory. If you cannot find words on the page, leave the quote out.
4. For "wrong" and "not-on-page", add a note: one sentence on what is wrong and what the page says.

A claim marked "Q: … Right answer: …" is right when the page supports the right answer to the question.
A battle turn is right when the page supports the best move for that threat (and Constraint), its cost,
the right Reason, the model answer and the key points.

Write the result to <findings> as a JSON array, one object per claim, and nothing else:
[{ "where": "...", "verdict": "supported" | "wrong" | "not-on-page", "quote": "...", "note": "..." }]
Every claim in the file must have one object. Do not edit any other file.
```

## Rules

- The reviewers only read pages and write their findings file. They never edit content.
- A finding needs a quote from the page. The report treats a finding with no quote as "check by hand".
- Run the check again on a town after a big content change, not only on new content.
