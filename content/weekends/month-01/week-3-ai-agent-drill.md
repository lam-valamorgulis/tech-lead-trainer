# Weekend 3: AI-agent drill

Time: 45 minutes. Do it on a computer with Claude Code.
Before the weekend, install Claude Code and check that it starts.

> **Privacy first.** Use the made-up task below, or a small project of your own. Do not give the agent client code. If you paste anything from work into Claude, remove client names, code and internal numbers first.

## The idea

First you do the task yourself. Then an agent does the same task. Then you review the agent's work with a checklist.
Doing it yourself first means you can judge the agent's answer.

## The task (example made up)

Write two small functions in any language:

1. `statusClass(code)` takes an HTTP status code and returns its class, for example `"client error"` for `404`.
   Status codes run from 100 to 599 in five classes. Source: [RFC 9110, section 15](https://www.rfc-editor.org/rfc/rfc9110.html#name-status-codes).
2. `isIdempotent(method)` says if sending the request twice has the same effect as once.
   Only `PUT`, `DELETE` and the safe methods (`GET`, `HEAD`, `OPTIONS`, `TRACE`) are idempotent. Source: [RFC 9110, section 9.2.2](https://www.rfc-editor.org/rfc/rfc9110.html#name-idempotent-methods).

## Steps

| Minutes | Step |
|---|---|
| 15 | Do the task yourself, without AI. Write 5 tests. |
| 10 | Give the same task to Claude Code in a new folder. Ask it to write tests too. |
| 12 | Review the agent's code with the checklist below. Mark each line pass or fail. |
| 6 | Paste your notes into Claude with the coach prompt at the end. |
| 2 | Write 2 sentences from memory about what you learned. |

Tips from [Best practices for Claude Code](https://code.claude.com/docs/en/best-practices):

- Give the agent a way to check its work, for example tests it can run.
- Review in a fresh session. A fresh session is not biased toward code it just wrote.

## Review checklist (month 1)

| Check | Pass? |
| --- | --- |
| All five classes are right: 1xx, 2xx, 3xx, 4xx, 5xx. | |
| A code outside 100 to 599 gives a clear error. | |
| `isIdempotent` is true for `GET`, `PUT` and `DELETE`, and false for `POST`. | |
| The tests check the boundaries, for example `199` and `200`. | |
| You understand every line. If not, ask the agent to explain, then decide. | |
| The agent's tests really ran. You saw the output yourself. | |

Why the human reviews: when agents write the code, the human still gives the verdict and owns what happens next. Source: [Own the Outer Loop](https://addyosmani.com/blog/own-the-outer-loop/).

## Coach prompt

Paste this, then your code, the agent's code and your checklist, into a new chat at https://claude.ai/new.

```text
You are my tech lead coach.
Below is a small task, my own solution, an AI agent's solution, and my review checklist.
Do not judge the code for me yet.
Ask me ONE question at a time about what I found in the agent's code and what I missed.
Wait for my reply.
Give hints, not solutions.
After three rounds, tell me one problem my checklist did not catch.
Then ask me to explain, in my own words, how I would review agent code next time.
Show me two English mistakes and ask me to fix them.
```
