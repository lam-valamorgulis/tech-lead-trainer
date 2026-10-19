# Weekend 3: AI-agent drill

Time: 45 minutes. Do it on a computer with Claude Code.

> **Privacy first.** Use the made-up task below, or a small project of your own. Do not give the agent client code. If you paste anything from work into Claude, remove client names, code and internal numbers first.

## The idea

First you do the task yourself. Then an agent does the same task. Then you review the agent's work with a checklist.
Doing it yourself first means you can judge the agent's answer.

## The task (example made up)

Write a small function `describeStatus(code)` in any language.
It takes an HTTP status code and returns its class, for example `"client error"` for `404`.
Status codes run from 100 to 599 in five classes. Source: [RFC 9110, section 15](https://www.rfc-editor.org/rfc/rfc9110.html#name-status-codes).
Also return whether a client may safely send the same request again after this answer.

## Steps

| Minutes | Step |
|---|---|
| 15 | Do the task yourself, without AI. Write 5 tests. |
| 10 | Give the same task to Claude Code in a new folder. Ask it to write tests too. |
| 15 | Review the agent's code with the checklist below. Mark each line pass or fail. |
| 5 | Paste your notes into Claude with the coach prompt at the end. |

Tips from [Best practices for Claude Code](https://code.claude.com/docs/en/best-practices):

- Give the agent a way to check its work, for example tests it can run.
- Review in a fresh session. A fresh session is not biased toward code it just wrote.

## Review checklist (month 1)

| Check | Pass? |
|---|---|
| All five classes are right: 1xx, 2xx, 3xx, 4xx, 5xx. | |
| A code outside 100 to 599 gives a clear error. | |
| "Safe to send again" is right for a `POST` that failed with `503`. Explain why. | |
| The tests cover at least one code at each edge, for example `199` and `200`. | |
| You understand every line. If not, ask the agent to explain, then decide. | |
| The agent's tests really ran. You saw the output yourself. | |

Why the human reviews: when agents write the code, the human still owns the checks and the result. Source: [Own the Outer Loop](https://addyosmani.com/blog/own-the-outer-loop/).

## Coach prompt

Paste this, then your code, the agent's code and your checklist, into a new chat at https://claude.ai/new.

```text
You are my tech lead coach. Below is a small task, my own solution, an AI agent's solution, and my review checklist. Do not judge the code for me yet. Ask me ONE question at a time about what I found in the agent's code and what I missed. Wait for my reply. Give hints, not solutions. After three rounds, tell me one problem my checklist did not catch. Then ask me to explain, in my own words, how I would review agent code next time. Show me two English mistakes and ask me to fix them.
```
