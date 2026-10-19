# Weekend 1 boss: the new checkout page

Time: 45 minutes. Do it on a computer.

> **Privacy first.** This task is made up, so it is safe to paste. If you add details from work, remove client names, code and internal numbers before you paste anything into Claude.

## The situation (example made up)

A shop moves its checkout page to a new address, `checkout.shop.example`.
The shop API stays at `api.shop.example`.
On the first test day, three things go wrong:

1. The browser blocks every call from the checkout page to the API.
2. The login cookie does not reach the API.
3. A slow phone network makes some customers tap "Pay" twice. Two orders are created.

You are the tech lead. Write a short design doc that fixes all three.

## Facts you may use

Each fact has its primary source. Read the source if a fact is new to you.

| Fact | Source |
|---|---|
| A page can read a response from another origin only when the server opts in with CORS headers. | [MDN: CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS) |
| For some requests, the browser first sends an `OPTIONS` request. This is the preflight. | [MDN: CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS) |
| HTTP is stateless. Cookies add state on top of it. | [MDN: Overview of HTTP](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Overview) |
| `POST` is not idempotent. Sending it twice can have two effects. | [RFC 9110, section 9.2.2](https://www.rfc-editor.org/rfc/rfc9110.html#name-idempotent-methods) |
| A design doc shows the options you did not choose, and why. | [Design Docs at Google](https://www.industrialempathy.com/posts/design-docs-at-google/) |

## Steps

| Minutes | Step |
|---|---|
| 5 | Read the situation twice. Write down what you do not know yet. |
| 20 | Fill in the design doc below. Write at least 2 options for each problem. |
| 10 | Draw one Mermaid diagram of the request flow. A photo of a hand drawing is fine too. |
| 10 | Paste your doc into Claude with the coach prompt at the end. |

## Design doc template

```markdown
# Design doc: checkout on a new address

## Problem
<!-- What breaks, for whom, and how you will know it is fixed. 3 to 5 sentences. -->

## Options
<!-- For each of the 3 problems: at least 2 options. One line each. -->

## Decision
<!-- Which option for each problem, in one sentence each. -->

## Trade-offs
<!-- What each decision costs you. Example: more work, more risk, slower page. -->

## Risks
<!-- What can still go wrong, and how you will notice it. -->
```

## Mermaid diagram starter

```mermaid
sequenceDiagram
    participant Browser
    participant API as api.shop.example
    Browser->>API: OPTIONS /orders (preflight)
    API-->>Browser: ??? (which headers?)
    Browser->>API: POST /orders
    API-->>Browser: ???
```

Paste it into https://mermaid.live to see it. Change it until it shows your decision.

## Coach prompt

Paste this, then your design doc and your diagram, into a new chat at https://claude.ai/new.

```text
You are my tech lead coach. Below is my design doc for a made-up checkout problem. Do not give me a model answer yet. Ask me ONE question at a time about my options and my decision. Wait for my reply. Give hints, not solutions. After three rounds, tell me which trade-off I missed. Then ask me to explain the trade-off again in my own words. Show me two English mistakes and ask me to fix them.
```
