# Weekend 2: one ADR for a real decision at work

Time: 45 minutes. Do it on a computer.

> **Privacy first.** This ADR is about your real job. Before you paste it into Claude, remove client names, code and internal numbers. Your Claude Pro account is a personal account.

## What an ADR is

An ADR (architecture decision record) is a short note about one decision.
It says what you decided, why, and what happens because of it.
This template uses the parts from Michael Nygard's 2011 post: Title, Context, Decision, Status and Consequences.
Source: [Nygard: Documenting Architecture Decisions](https://www.cognitect.com/blog/2011/11/15/documenting-architecture-decisions).
The status can be proposed, accepted, deprecated (no longer used) or superseded (replaced by a newer ADR). Source: the same post.
More templates: [the ADR site](https://adr.github.io/).

## Pick the decision

Choose one decision from your work in the last month. A small one is best. Examples (made up):

- "We load product prices in the browser, not in the server template."
- "We keep one theme for all three markets."

## Steps

| Minutes | Step |
|---|---|
| 5 | Pick the decision. Write it in one sentence. |
| 20 | Fill in the ADR below. |
| 5 | Write what you predict will happen. Set the check date 4 to 8 weeks from today. |
| 5 | Remove client names, code and internal numbers. |
| 8 | Paste the ADR into Claude with the coach prompt at the end. |
| 2 | Write 2 sentences from memory about what you learned. |

## ADR template

```markdown
# ADR: <short title>

- Status: <proposed / accepted / deprecated / superseded>
- Date: <today>

## Context
<!-- What was true when you decided: the needs and the limits. 3 to 6 sentences. -->

## Decision
<!-- "We will ..." in one or two sentences. -->

## Consequences
<!-- What becomes easier, and what becomes harder. Both. -->

## My prediction
<!-- What you expect to see in 4 to 8 weeks. Make it something you can check. -->

## Check the real outcome on
<!-- A date 4 to 8 weeks from today. Put it in your calendar now. -->
```

On the check date, open this ADR again. Write what really happened under the prediction.

## Coach prompt

Paste this, then your ADR, into a new chat at https://claude.ai/new.

```text
You are my tech lead coach.
Below is an ADR I wrote for a real decision at work.
Do not rewrite it for me.
Ask me ONE question at a time about the context, the options I did not take, and the consequences.
Wait for my reply.
Give hints, not solutions.
After three rounds, tell me which consequence I missed.
Then ask me to explain the decision again in my own words.
Show me two English mistakes and ask me to fix them.
```
