# Roadmap sources for the tech lead learning game

Research date: 2026-10-19. Every URL below was fetched, unless marked `(not verified)`.

## Tóm tắt

- roadmap.sh không có roadmap "Tech Lead". Nó có Backend, System Design, Software Architect, API Design, Engineering Manager, Code Review, Claude Code và AI Agents. Dùng chúng để tìm chủ đề, không dùng làm nguồn học chính.
- Nguồn gốc tốt nhất đều miễn phí: sách SRE của Google, AWS Builders' Library, martinfowler.com, tài liệu PostgreSQL, MDN, OWASP, staffeng.com và tài liệu của Anthropic.
- Tôi đề nghị đổi thứ tự: đưa Testing lên tháng 4, tách "code architecture" sang tháng 10, và thêm 1 ý về idempotency vào tháng 2.
- AI agents nên học theo cả hai cách: một bài tập nhỏ mỗi tháng, và một tháng tập trung ở cuối. Lý do: bạn chỉ review được code agent viết khi bạn đã hiểu chủ đề đó.
- Tech lead khác senior ở chỗ: phải giữ chất lượng kỹ thuật của cả team, viết design doc và ADR, chọn việc đáng làm, và chịu trách nhiệm khi có sự cố.

## How I checked

- I fetched each page and read it. I did not copy facts from memory.
- Some sites blocked me. I list them in "Not verified" near the end.
- I wrote the month order and the "why" as my own reasoning. I mark it as `Opinion`.
- Facts from sources have a URL next to them.

---

## 1. Best primary sources for each scope group

How to read the "Fit" column:

- **Phone** = short article, about 10 to 15 minutes.
- **Weekend** = long chapter, lab, or hands-on practice, about 45 minutes or more.

### 1a. Pure tech

| Source | Owner | Format | Cost | Covers | Fit |
|---|---|---|---|---|---|
| [Designing Data-Intensive Applications](https://dataintensive.net/) | Martin Kleppmann, O'Reilly | Book | Paid (price not on page) | Data storage, trade-offs in consistency, scale and failure | Weekend |
| [Site Reliability Engineering](https://sre.google/sre-book/table-of-contents/) | Google | Free online book, 34 chapters | Free | SLOs, monitoring, incidents, postmortems, overload, cascading failures | Phone (one chapter) |
| [Site Reliability Workbook](https://sre.google/workbook/table-of-contents/) | Google | Free online book, 21 chapters | Free | Implementing SLOs, alerting, incident response, canarying | Weekend |
| [Building Secure & Reliable Systems](https://sre.google/books/) | Google | Free online book | Free | Security and reliability design | Weekend |
| [Amazon Builders' Library](https://builder.aws.com/learn/topics/builders-library) | AWS | Articles | Free | How Amazon builds and runs systems. The index page did not load its list. I fetched six articles one by one. | Phone |
| [martinfowler.com](https://martinfowler.com/architecture/) | Martin Fowler and guest authors | Articles | Free | Architecture, patterns, testing, CI | Phone |
| [Software Engineering at Google](https://abseil.io/resources/swe-book) | Titus Winters, Tom Manshreck, Hyrum Wright (curators) | Free online book | Free (CC license) | Testing, code review, CI, dependency management | Weekend |
| [MDN HTTP docs](https://developer.mozilla.org/en-US/docs/Web/HTTP) | Mozilla | Docs | Free | HTTP, caching, CORS, cookies | Phone |
| [RFC 9110 HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html) | IETF | Standard | Free | Methods, status codes, idempotent methods | Weekend (reference) |
| [PostgreSQL docs](https://www.postgresql.org/docs/current/indexes.html) | PostgreSQL project | Docs | Free | Indexes, EXPLAIN, isolation, locks | Phone or weekend |
| [Use The Index, Luke](https://use-the-index-luke.com/) | Markus Winand | Free web book | Free | SQL indexing and tuning | Phone |
| [OWASP Top 10:2025](https://top10.owasp.org/2025/0x00_2025-Introduction) | OWASP | Standard list | Free | The 10 main web risks | Phone |
| [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/) | OWASP | Short guides | Free | Authentication, sessions, SQL injection, secrets, CSRF, XSS | Phone |
| [System Design Interview course](https://bytebytego.com/courses/system-design-interview/scale-from-zero-to-millions-of-users) | ByteByteGo | Course and book | Preview free, rest paid (no price on page) | 30 chapters of design cases | Weekend |
| [Enterprise Integration Patterns](https://www.enterpriseintegrationpatterns.com/patterns/messaging/) | Site copyright Bobby Woolf (book: Addison-Wesley) | Pattern catalog | Free online | 65 messaging patterns | Phone |
| [Apache Kafka intro](https://kafka.apache.org/intro) | Apache | Docs | Free | Events, topics, partitions, replication | Phone |
| [RabbitMQ tutorials](https://www.rabbitmq.com/tutorials) | RabbitMQ project | Tutorials | Free | Work queues, pub/sub, routing, confirms | Weekend |
| [Raft site](https://raft.github.io/) | Diego Ongaro and John Ousterhout | Paper and visualization | Free | Consensus | Weekend |
| [Google API Improvement Proposals](https://google.aip.dev/) | Google | Design rules | Free | API design rules | Phone |
| [Azure REST API Guidelines](https://github.com/microsoft/api-guidelines/blob/vNext/azure/Guidelines.md) | Microsoft | Guide | Free | URLs, errors, paging, versioning, repeatability | Weekend |
| [OpenTelemetry observability primer](https://opentelemetry.io/docs/concepts/observability-primer/) | OpenTelemetry project | Docs | Free | Logs, metrics, traces | Phone |

### 1b. Tech lead decisions

| Source | Owner | Format | Cost | Covers | Fit |
|---|---|---|---|---|---|
| [Design Docs at Google](https://www.industrialempathy.com/posts/design-docs-at-google/) | Malte Ubl, 2020 | Article | Free | Goals, non-goals, alternatives, review | Phone |
| [Documenting Architecture Decisions](https://www.cognitect.com/blog/2011/11/15/documenting-architecture-decisions) | Michael Nygard, 2011 | Article (the original ADR post) | Free | Title, Context, Decision, Status, Consequences | Phone |
| [ADR site](https://adr.github.io/) | ADR GitHub organization | Site | Free | Decision log, templates, tools | Phone |
| [Google Engineering Practices: code review](https://google.github.io/eng-practices/review/) | Google | Guide | Free | Reviewer guide and author guide | Phone |
| [Shape Up](https://basecamp.com/shapeup) | Ryan Singer, Basecamp | Free online book | Free | Appetite, shaping, betting | Weekend |
| [StaffEng.com guides](https://staffeng.com/guides/) | Will Larson | Free guides | Free | Quality, strategy, projects | Phone |
| [Staff Engineer book](https://staffeng.com/book) | Will Larson | Book | $25 (most content free on site) | Staff role and archetypes | Weekend |
| [The Staff Engineer's Path](https://noidea.dog/staff) | Tanya Reilly, O'Reilly | Book | Paid `(not verified)` | Technical leadership. O'Reilly page blocked me. | Weekend |
| [Technical Debt](https://martinfowler.com/bliki/TechnicalDebt.html) | Martin Fowler | Article | Free | Debt idea, "interest" | Phone |
| [Postmortem Culture](https://sre.google/sre-book/postmortem-culture/) | John Lunney, Sue Lueder (ed. Gary O'Connor) | Chapter | Free | Blameless postmortem | Phone |
| [PagerDuty Incident Response](https://response.pagerduty.com/) | PagerDuty | Docs | Free | Roles, severity, after-incident work | Phone |
| [Software Engineering at Google, chapter list](https://abseil.io/resources/swe-book/html/toc.html) | Google | Book | Free | Chapters 5, 6 (leading), 9 (code review) | Weekend |

### 1c. Leading AI coding agents

| Source | Owner | Format | Cost | Covers | Fit |
|---|---|---|---|---|---|
| [Building effective agents](https://www.anthropic.com/engineering/building-effective-agents) | Erik S. and Barry Zhang, Anthropic, Dec 2024 | Article | Free | Workflows vs agents, 5 patterns | Phone |
| [Best practices for Claude Code](https://code.claude.com/docs/en/best-practices) | Anthropic | Docs | Free | Verify, plan, CLAUDE.md, subagents, review | Weekend |
| [Effective context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) | Anthropic, Sep 2025 | Article | Free | Context as a limited resource | Phone |
| [Writing effective tools for agents](https://www.anthropic.com/engineering/writing-tools-for-agents) | Ken Aizawa and others, Anthropic, Sep 2025 | Article | Free | Tool design | Phone |
| [Multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system) | Anthropic, Jun 2025 | Article | Free | Orchestrator-worker, cost, limits | Phone |
| [Demystifying evals for AI agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) | Anthropic, Jan 2026 | Article | Free | Graders, task design | Phone |
| [Claude Code security](https://code.claude.com/docs/en/security) | Anthropic | Docs | Free | Permissions, prompt injection | Phone |
| [Own the Outer Loop](https://addyosmani.com/blog/own-the-outer-loop/) | Addy Osmani, 15 Jul 2026 | Article | Free | What humans own when agents code | Phone |
| [The lethal trifecta](https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/) | Simon Willison, 2025 | Article | Free | Data theft risk in agents | Phone |
| [OWASP Top 10 for LLM Applications](https://genai.owasp.org/llm-top-10/) | OWASP | List | Free | 2025 list of 10 LLM risks | Phone |

### 1d. What roadmap.sh has

- The repo is [kamranahmedse/developer-roadmap](https://github.com/kamranahmedse/developer-roadmap). The page shows about 370k stars. The license type is not named on the page.
- There is **no Tech Lead roadmap**. This is confirmed by the [roadmap list](https://roadmap.sh/roadmaps) and the repo README.
- Roadmaps that exist and matter here:
  - [Backend](https://roadmap.sh/backend), [System Design](https://roadmap.sh/system-design), [Software Architect](https://roadmap.sh/software-architect), [Software Design and Architecture](https://roadmap.sh/software-design-architecture), [API Design](https://roadmap.sh/api-design)
  - [Engineering Manager](https://roadmap.sh/engineering-manager) (it has one topic called "EM vs Tech Lead vs IC")
  - [Code Review best practices](https://roadmap.sh/best-practices/code-review)
  - AI Agents and Claude Code (both listed in the roadmap repo tree, which I read through the GitHub API)
- The web pages did not load the diagrams. So I read the topic names from the repo file names. The order inside each diagram is `(not verified)`.
- Topic names in the repo that match this plan: `cap-theorem`, `backpressure`, `circuit-breaker`, `failure-modes`, `graceful-degradation`, `n1-problem`, `idempotency`, `rate-limiting`, `decision-records`, `blameless-post-mortems`, `technical-debt-and-management`.
- The Engineering Manager roadmap defines the roles in one line each: a tech lead "guides technical direction while remaining hands-on". Source: [em-vs-tech-lead-vs-ic file](https://github.com/kamranahmedse/developer-roadmap) in `roadmaps/engineering-manager/content/`.
- Use roadmap.sh to find topics. Learn from the primary sources above.

---

## 2. Month order review

### 2a. Prerequisite checks on your draft

`Opinion` means this is my reasoning. The linked facts come from the sources.

| Draft month | Check | Result |
|---|---|---|
| 1 Web and HTTP | Needed by all later months. MDN covers HTTP, TLS, CORS and caching in one place ([MDN HTTP](https://developer.mozilla.org/en-US/docs/Web/HTTP)). | Keep |
| 2 API design | Needs HTTP. RFC 9110 defines idempotent methods, so idempotency starts here ([RFC 9110](https://www.rfc-editor.org/rfc/rfc9110.html)). | Keep. Add idempotency as a seed idea. |
| 3 Database | Needs only basic backend knowledge. Transactions here are the base for month 7. | Keep. Add transactions and isolation. |
| 4 Cache and CDN | HTTP caching comes from month 1. Cache bugs are easier to catch with tests. | Move to month 5 |
| 5 Queue and async | Needs idempotency from month 2 and transactions from month 3. | Move to month 6 |
| 6 Distributed systems | Needs DB transactions (3) and queues (5 or 6). | Move to month 7 |
| 7 Reliability | Retry storms, cache failure and queue backlog are all reliability topics. AWS wrote one article on each ([retries](https://builder.aws.com/content/3EumjoZascWd1oZiEgL8ORlv3qE/timeouts-retries-and-backoff-with-jitter), [caching](https://builder.aws.com/content/3K9TeXp6strMiJ4vhakpRD7BQWO/caching-challenges-and-strategies), [queue backlog](https://builder.aws.com/content/3EuRcgkTP1MI0c7zM8W6HL3WIqA/avoiding-insurmountable-queue-backlogs)). So it must come after them. | Keep after distributed systems (month 8) |
| 8 Security | Needs HTTP, API and DB (for injection). It does not need distributed systems. | Keep, now month 9 |
| 9 Testing and code architecture | Too late. Every later month needs tests. Also, [Claude Code best practices](https://code.claude.com/docs/en/best-practices) says to give the agent a check it can run. | Split. Testing goes to month 4. Architecture goes to month 10. |
| 10 System design (interview) | Needs all earlier months. But a tech lead does not need interview tricks. | Keep. Rename to "Architecture and system design". |
| 11 Tech lead decisions | Needs trade-off knowledge from months 1 to 10. | Keep |
| 12 AI agents + capstone | Needs to review work in every area, so it goes last. | Keep |

### 2b. Proposed order

| Month | Town | Change |
|---|---|---|
| 1 | Web and HTTP in depth | same |
| 2 | API design | add idempotency keys |
| 3 | Database, SQL, index, transactions | add transactions |
| 4 | **Testing and CI** | moved from month 9 |
| 5 | Cache and CDN | was month 4 |
| 6 | Queue and async | was month 5 |
| 7 | Distributed systems: consistency, idempotency, retry | was month 6 |
| 8 | Reliability: monitoring, incidents, safe releases | was month 7 |
| 9 | Security | was month 8 |
| 10 | **Code architecture and system design** | code architecture moved here |
| 11 | Tech lead decisions: design doc, ADR, estimate, trade-off | same |
| 12 | Leading AI agents + capstone | same |

Reasons:

1. `Opinion` Testing before Cache, Queue and Distributed. You will write tests while you practice each later month.
2. `Opinion` Code architecture next to system design. [Fowler's architecture guide](https://martinfowler.com/architecture/) says architecture is "the important stuff". You need many months of knowledge to see what is important.
3. `Opinion` Keep four months in one block: Cache, Queue, Distributed, Reliability. They share one story: things fail, then you protect against failure.
4. Gap to fill: **safe releases**. Put canary releases, feature toggles and CI in months 4 and 8. Sources: [SRE Workbook, Canarying Releases](https://sre.google/workbook/table-of-contents/), [Feature Toggles](https://martinfowler.com/articles/feature-toggles.html), [Continuous Integration](https://martinfowler.com/articles/continuousIntegration.html).
5. `Opinion` Spiral security. Put 1 or 2 security creatures in months 1 to 3 (TLS, CORS, SQL injection). Then month 9 joins them.
6. `Opinion` Write one small ADR each month at the weekend session. Month 11 then teaches the theory of something you already did.

### 2c. Leading AI agents: one month, or a little each month?

**Answer: do both.** Small part each month. One full month at the end.

Why:

- Reviewing agent work needs knowledge of the topic. [Claude Code best practices](https://code.claude.com/docs/en/best-practices) lists the "trust-then-verify gap". Its fix: "If you can't verify it, don't ship it."
- Doing it every month gives practice. Osmani cites a study: engineers who used AI scored 50% on a quiz about their change, against 67% for those who wrote it themselves ([Own the Outer Loop](https://addyosmani.com/blog/own-the-outer-loop/)). So write first, then compare with the agent.
- A full month at the end teaches the parts that need all earlier knowledge: guards, delegation, security of agents, and evals.
- `Opinion` A small monthly drill (15 minutes on the weekend): let an agent do the month's exercise, then review it with that month's checklist.

---

## 3. Concepts per month (candidate creatures)

Each row has one source URL. Rows with `(partly verified)` are explained in the "Not verified" section.

When a source gave only a title or a name, the one-line meaning is my plain-words gloss. Check it when you teach that creature. This applies to EIP pattern names, Patterns of Distributed Systems names, OWASP A04 to A07, and ByteByteGo chapters.

### Month 1. Web and HTTP in depth (12)

| # | Creature | One line | Source |
|---|---|---|---|
| 1 | Client-server model | The client always starts the request. | [MDN Overview of HTTP](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Overview) |
| 2 | Request and response | A message has a method, path, headers and body. | [MDN Overview of HTTP](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Overview) |
| 3 | Stateless HTTP | Each request stands alone. | [MDN Overview of HTTP](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Overview) |
| 4 | Cookies and sessions | Cookies add state on top of a stateless protocol. | [MDN Overview of HTTP](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Overview) |
| 5 | Safe and idempotent methods | Some methods can repeat with the same result. | [RFC 9110](https://www.rfc-editor.org/rfc/rfc9110.html) |
| 6 | Status codes | Defined codes run from 100 to 511. The allowed range is 100 to 599 ([RFC 9110, section 15](https://www.rfc-editor.org/rfc/rfc9110.html#name-status-codes)). | [MDN HTTP](https://developer.mozilla.org/en-US/docs/Web/HTTP) |
| 7 | Proxies | Middle servers cache, filter and balance load. | [MDN Overview of HTTP](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Overview) |
| 8 | Connections: HTTP/1.1 to HTTP/2 | Persistent connections, then multiplexing. | [MDN Overview of HTTP](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Overview) |
| 9 | TLS handshake and certificates | Encryption, integrity and server identity. | [MDN TLS](https://developer.mozilla.org/en-US/docs/Web/Security/Transport_Layer_Security) |
| 10 | HSTS and mixed content | Force HTTPS on later visits. | [MDN TLS](https://developer.mozilla.org/en-US/docs/Web/Security/Transport_Layer_Security) |
| 11 | DNS lookup | A name becomes an IP address. TTL is not on this page. | [MDN DNS](https://developer.mozilla.org/en-US/docs/Glossary/DNS) `(partly verified)` |
| 12 | Same-origin policy and CORS | The server must opt in before a page reads a response. | [MDN CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS) |
| 13 | Preflight request | The browser sends OPTIONS first for non-simple requests. | [MDN CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS) |

### Month 2. API design (15)

| # | Creature | One line | Source |
|---|---|---|---|
| 1 | Resource-oriented design | Design around things (nouns), not actions. | [Google AIP-121](https://google.aip.dev/121) |
| 2 | Methods and status codes in APIs | Pick the right code for each result. | [RFC 9110](https://www.rfc-editor.org/rfc/rfc9110.html) |
| 3 | Idempotency key | The client sends a unique key so a retry is safe. | [Stripe idempotent requests](https://docs.stripe.com/api/idempotent_requests) |
| 4 | Atomic token recording | Save the token and the change in one step. | [AWS: Making retries safe](https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/) |
| 5 | Error format: Problem Details | A standard JSON error with type, title, status, detail. | [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457.html) |
| 6 | API contract: OpenAPI | A description of the API that tools can read. | [OpenAPI spec](https://spec.openapis.org/oas/latest.html) |
| 7 | Collections and paging | Return lists in pages. | [Azure REST guidelines](https://github.com/microsoft/api-guidelines/blob/vNext/azure/Guidelines.md) |
| 8 | Versioning and deprecation | Change an API without breaking clients. | [Azure REST guidelines](https://github.com/microsoft/api-guidelines/blob/vNext/azure/Guidelines.md) |
| 9 | Long-running operations | Return fast, let the client check progress. | [Azure REST guidelines](https://github.com/microsoft/api-guidelines/blob/vNext/azure/Guidelines.md) |
| 10 | Conditional requests and ETags | Azure covers conditional requests with ETags. | [Azure REST guidelines](https://github.com/microsoft/api-guidelines/blob/vNext/azure/Guidelines.md) |
| 11 | Request repeatability | Azure's pattern for repeating a request safely. | [Azure REST guidelines](https://github.com/microsoft/api-guidelines/blob/vNext/azure/Guidelines.md) |
| 12 | Authentication basics for APIs | Who is calling, and how you check it. | [OWASP Authentication cheat sheet](https://cheatsheetseries.owasp.org/) |
| 13 | Rate limiting | 429 Too Many Requests, Retry-After, limits per key. Added for town 2. | [RFC 6585](https://www.rfc-editor.org/rfc/rfc6585.html#section-4) |
| 14 | Backwards compatibility | Changes that break clients. Added for town 2. | [Google AIP-180](https://google.aip.dev/180) |
| 15 | Calling an LLM API | Errors, retries, streaming, timeouts (design 4). Added for town 2. | [Claude API: Errors](https://platform.claude.com/docs/en/api/errors) |

#### Pages town 2 cites (#37)

Fetched again on 2026-10-20 for the town 2 content. Every town 2 card cites one of these pages. The Google AIP rule numbers below are now verified: each one is its own page.

| Page | Used for |
|---|---|
| [AIP-121 Resource-oriented design](https://google.aip.dev/121) | Resources, standard methods |
| [AIP-122 Resource names](https://google.aip.dev/122) | Resource names |
| [AIP-136 Custom methods](https://google.aip.dev/136) | Custom methods |
| [AIP-155 Request identification](https://google.aip.dev/155) | The request_id field |
| [AIP-158 Pagination](https://google.aip.dev/158) | Page tokens, page size |
| [AIP-180 Backwards compatibility](https://google.aip.dev/180) | Breaking changes |
| [AIP-185 API versioning](https://google.aip.dev/185) | Major version in the path |
| [RFC 9110 HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html) | 201, 202, 401, 403, 409, 422, If-Match, If-None-Match, Retry-After |
| [RFC 9457 Problem Details](https://www.rfc-editor.org/rfc/rfc9457.html) | Error format |
| [RFC 6585, section 4](https://www.rfc-editor.org/rfc/rfc6585.html#section-4) | 429 Too Many Requests |
| [Stripe: Idempotent requests](https://docs.stripe.com/api/idempotent_requests) | Idempotency keys |
| [AWS: Making retries safe with idempotent APIs](https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/) | Client request tokens. This URL loaded directly on 2026-10-20, with no redirect. |
| [Azure REST API Guidelines](https://github.com/microsoft/api-guidelines/blob/vNext/azure/Guidelines.md) | Status codes, paging, conditional requests, repeatability, long-running operations, versioning, deprecation. Read as the raw Markdown file of the same path. |
| [OpenAPI Specification, latest (3.2.1)](https://spec.openapis.org/oas/latest.html) | OpenAPI, operationId, components |
| [OWASP REST Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html) | Access control, HTTPS, keys in URLs, API keys |
| [Claude API: Errors](https://platform.claude.com/docs/en/api/errors) | The LLM API creature (design 4): errors, retries, long requests |
| [Claude API: Streaming messages](https://platform.claude.com/docs/en/build-with-claude/streaming) | Streaming |
| [Claude API: Rate limits](https://platform.claude.com/docs/en/api/rate-limits) | Token bucket rate limits |

The `docs.claude.com/en/...` URLs redirect to `platform.claude.com/docs/en/...`. The cards cite the final URLs.

### Month 3. Database, SQL, index, transactions (14)

| # | Creature | One line | Source |
|---|---|---|---|
| 1 | Joins | Combine rows from two tables. | [PostgreSQL tutorial](https://www.postgresql.org/docs/current/tutorial.html) |
| 2 | Foreign keys | The database keeps links between tables correct. | [PostgreSQL tutorial](https://www.postgresql.org/docs/current/tutorial.html) |
| 3 | Anatomy of an index | How a B-tree finds rows fast. | [Use The Index, Luke](https://use-the-index-luke.com/) |
| 4 | WHERE clause and indexes | How the WHERE clause uses an index. | [Use The Index, Luke](https://use-the-index-luke.com/) |
| 5 | Multicolumn indexes | One index over more than one column. | [PostgreSQL: Indexes](https://www.postgresql.org/docs/current/indexes.html) |
| 6 | Partial and expression indexes | Index only the rows or values you need. | [PostgreSQL: Indexes](https://www.postgresql.org/docs/current/indexes.html) |
| 7 | Index-only scans | A covering index can skip the table. | [PostgreSQL: Indexes](https://www.postgresql.org/docs/current/indexes.html) |
| 8 | EXPLAIN and EXPLAIN ANALYZE | Read the query plan. Compare estimated and real rows. | [PostgreSQL: Using EXPLAIN](https://www.postgresql.org/docs/current/using-explain.html) |
| 9 | Join algorithms | Nested loop, hash join, merge join. | [PostgreSQL: Using EXPLAIN](https://www.postgresql.org/docs/current/using-explain.html) |
| 10 | Paging queries | Fetch partial results. | [Use The Index, Luke](https://use-the-index-luke.com/) |
| 11 | Write cost of indexes | Indexes add overhead to the database. | [Use The Index, Luke](https://use-the-index-luke.com/) |
| 12 | Transactions and isolation levels | Read Committed, Repeatable Read, Serializable. | [PostgreSQL: Transaction Isolation](https://www.postgresql.org/docs/current/transaction-iso.html) |
| 13 | Anomalies | Dirty read, non-repeatable read, phantom, write skew. | [PostgreSQL: Transaction Isolation](https://www.postgresql.org/docs/current/transaction-iso.html) |
| 14 | Locks and deadlocks | Row locks, table locks, advisory locks. | [PostgreSQL: Concurrency Control](https://www.postgresql.org/docs/current/mvcc.html) |

### Month 4. Testing and CI (12)

| # | Creature | One line | Source |
|---|---|---|---|
| 1 | Test pyramid | More fast low-level tests, fewer slow high-level tests. | [The Practical Test Pyramid](https://martinfowler.com/articles/practical-test-pyramid.html) |
| 2 | Unit test | Test public behavior in isolation. | [The Practical Test Pyramid](https://martinfowler.com/articles/practical-test-pyramid.html) |
| 3 | Integration test | Test one real boundary, like a database. | [The Practical Test Pyramid](https://martinfowler.com/articles/practical-test-pyramid.html) |
| 4 | Contract test | Consumers state what they need. Providers prove it. | [The Practical Test Pyramid](https://martinfowler.com/articles/practical-test-pyramid.html) |
| 5 | End-to-end test | Keep few. They are slow and often flaky. | [The Practical Test Pyramid](https://martinfowler.com/articles/practical-test-pyramid.html) |
| 6 | Test doubles | Dummy, fake, stub, spy, mock. | [Mocks Aren't Stubs](https://martinfowler.com/articles/mocksArentStubs.html) |
| 7 | State vs behavior checks | Check the result, or check the calls. | [Mocks Aren't Stubs](https://martinfowler.com/articles/mocksArentStubs.html) |
| 8 | Classical vs mockist TDD | Two styles with different trade-offs. | [Mocks Aren't Stubs](https://martinfowler.com/articles/mocksArentStubs.html) |
| 9 | Self-testing build | A failing test fails the build. | [Continuous Integration](https://martinfowler.com/articles/continuousIntegration.html) |
| 10 | Fix a red build first | Revert the bad commit if needed. | [Continuous Integration](https://martinfowler.com/articles/continuousIntegration.html) |
| 11 | Release toggle | Ship unfinished code hidden. | [Feature Toggles](https://martinfowler.com/articles/feature-toggles.html) |
| 12 | Testing at scale | Test sizes, test doubles and larger tests in a big company. | [Software Engineering at Google, chapter list](https://abseil.io/resources/swe-book/html/toc.html) (chapters 11 to 14) |

### Month 5. Cache and CDN (15)

| # | Creature | One line | Source |
|---|---|---|---|
| 1 | Private vs shared cache | Browser cache is private. CDN and proxy are shared. | [MDN HTTP caching](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching) |
| 2 | Freshness | A response is fresh while its age is below max-age. | [RFC 9111](https://www.rfc-editor.org/rfc/rfc9111.html) |
| 3 | Validation with ETag | A 304 response saves the body download. | [MDN HTTP caching](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching) |
| 4 | no-cache vs no-store | no-cache still stores. no-store does not store. | [MDN HTTP caching](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching) |
| 5 | Versioned URLs and immutable | Change the URL when the file changes. | [MDN HTTP caching](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching) |
| 6 | Vary header | Store one copy per request header value. | [MDN HTTP caching](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching) |
| 7 | CDN as managed cache | A CDN is a shared cache you configure. | [MDN HTTP caching](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching) |
| 8 | Purge limits | You cannot delete from every intermediate cache. | [MDN HTTP caching](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching) |
| 9 | Request collapse | Many same requests may become one origin request. | [MDN HTTP caching](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching) |
| 10 | Local vs external cache | On-box cache is simple. Redis or Memcached is shared. | [AWS: Caching challenges](https://builder.aws.com/content/3K9TeXp6strMiJ4vhakpRD7BQWO/caching-challenges-and-strategies) |
| 11 | Soft and hard TTL | Refresh after soft TTL. Serve stale until hard TTL if the source is down. | [AWS: Caching challenges](https://builder.aws.com/content/3K9TeXp6strMiJ4vhakpRD7BQWO/caching-challenges-and-strategies) |
| 12 | Negative caching | Cache errors briefly to protect a failing source. | [AWS: Caching challenges](https://builder.aws.com/content/3K9TeXp6strMiJ4vhakpRD7BQWO/caching-challenges-and-strategies) |
| 13 | Thundering herd | Coalesce requests for one missing key. | [AWS: Caching challenges](https://builder.aws.com/content/3K9TeXp6strMiJ4vhakpRD7BQWO/caching-challenges-and-strategies) |
| 14 | Addicted to cache | A service must still work when the cache is cold or down. | [AWS: Caching challenges](https://builder.aws.com/content/3K9TeXp6strMiJ4vhakpRD7BQWO/caching-challenges-and-strategies) |
| 15 | Eviction and hit rate | LRU, LFU, and how to measure hits and misses. | [Redis: Key eviction](https://redis.io/docs/latest/develop/reference/eviction/) |

### Month 6. Queue and async (14)

| # | Creature | One line | Source |
|---|---|---|---|
| 1 | Point-to-point vs publish-subscribe | One receiver, or many receivers. | [Enterprise Integration Patterns](https://www.enterpriseintegrationpatterns.com/patterns/messaging/) |
| 2 | Competing consumers | Many workers share one queue. | [Enterprise Integration Patterns](https://www.enterpriseintegrationpatterns.com/patterns/messaging/) |
| 3 | Dead Letter Channel | Bad messages go to a side queue. | [Enterprise Integration Patterns](https://www.enterpriseintegrationpatterns.com/patterns/messaging/) |
| 4 | Idempotent Receiver | A consumer can safely get a message twice. | [Enterprise Integration Patterns](https://www.enterpriseintegrationpatterns.com/patterns/messaging/) |
| 5 | Guaranteed delivery | Store messages so they survive a crash. | [Enterprise Integration Patterns](https://www.enterpriseintegrationpatterns.com/patterns/messaging/) |
| 6 | Correlation identifier | Match a reply to its request. | [Enterprise Integration Patterns](https://www.enterpriseintegrationpatterns.com/patterns/messaging/) |
| 7 | Work queue | Share slow jobs between workers. | [RabbitMQ tutorials](https://www.rabbitmq.com/tutorials) |
| 8 | Publisher confirms | The broker tells the sender it has the message. | [RabbitMQ tutorials](https://www.rabbitmq.com/tutorials) |
| 9 | Kafka topic and partition | Events with the same key keep their order. | [Kafka intro](https://kafka.apache.org/intro) |
| 10 | Replication | Copies of each partition survive a broker failure. | [Kafka intro](https://kafka.apache.org/intro) |
| 11 | Queue backlog | A queue is fast when empty and slow when behind. | [AWS: Insurmountable queue backlogs](https://builder.aws.com/content/3EuRcgkTP1MI0c7zM8W6HL3WIqA/avoiding-insurmountable-queue-backlogs) |
| 12 | Message age metric | Watch how long messages wait. | [AWS: Insurmountable queue backlogs](https://builder.aws.com/content/3EuRcgkTP1MI0c7zM8W6HL3WIqA/avoiding-insurmountable-queue-backlogs) |
| 13 | Fairness between customers | Per-customer limits and separate queues. | [AWS: Insurmountable queue backlogs](https://builder.aws.com/content/3EuRcgkTP1MI0c7zM8W6HL3WIqA/avoiding-insurmountable-queue-backlogs) |
| 14 | Transactional outbox | Save the message in the same DB transaction as the data. | [microservices.io outbox](https://microservices.io/patterns/data/transactional-outbox.html) |

### Month 7. Distributed systems: consistency, idempotency, retry (14)

| # | Creature | One line | Source |
|---|---|---|---|
| 1 | Unknown outcome | After a timeout you do not know if the work happened. | [AWS: Challenges with distributed systems](https://builder.aws.com/content/3F08f7GPFiZMCgXD8gny6OjxR0Z/challenges-with-distributed-systems) |
| 2 | Partial failure | Client, network and server fail separately. | [AWS: Challenges with distributed systems](https://builder.aws.com/content/3F08f7GPFiZMCgXD8gny6OjxR0Z/challenges-with-distributed-systems) |
| 3 | Timeouts | Set one on every remote call. | [AWS: Timeouts, retries and backoff](https://builder.aws.com/content/3EumjoZascWd1oZiEgL8ORlv3qE/timeouts-retries-and-backoff-with-jitter) |
| 4 | Backoff and jitter | Wait longer each time, with some randomness. | [AWS: Timeouts, retries and backoff](https://builder.aws.com/content/3EumjoZascWd1oZiEgL8ORlv3qE/timeouts-retries-and-backoff-with-jitter) |
| 5 | Retry at one layer | Retries at many layers multiply the load. | [AWS: Timeouts, retries and backoff](https://builder.aws.com/content/3EumjoZascWd1oZiEgL8ORlv3qE/timeouts-retries-and-backoff-with-jitter) |
| 6 | Idempotency tokens in depth | Same token, same answer. Different parameters, error. | [AWS: Making retries safe](https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/) |
| 7 | Serializability | Results match some one-at-a-time order. | [Jepsen consistency](https://jepsen.io/consistency) `(partly verified)` |
| 8 | Consensus with Raft | Servers agree on one log. | [Raft](https://raft.github.io/) |
| 9 | Leader and followers | One leader takes the writes. | [Patterns of Distributed Systems](https://martinfowler.com/articles/patterns-of-distributed-systems/) |
| 10 | Majority quorum | A majority must agree. | [Patterns of Distributed Systems](https://martinfowler.com/articles/patterns-of-distributed-systems/) |
| 11 | Write-ahead log | Write to the log before you change data. | [Patterns of Distributed Systems](https://martinfowler.com/articles/patterns-of-distributed-systems/) |
| 12 | Logical clocks | Lamport clock, hybrid clock, version vector. | [Patterns of Distributed Systems](https://martinfowler.com/articles/patterns-of-distributed-systems/) |
| 13 | Saga | A chain of local transactions with undo steps. | [microservices.io saga](https://microservices.io/patterns/data/saga.html) |
| 14 | Eventual consistency in services | Each service owns its data, so consistency is often eventual. | [Microservices (Lewis and Fowler)](https://martinfowler.com/articles/microservices.html) |

For depth on replication, partitioning and consensus, read [Designing Data-Intensive Applications](https://dataintensive.net/). I could not read its chapter list `(not verified)`.

### Month 8. Reliability: monitoring, incidents, safe releases (15)

| # | Creature | One line | Source |
|---|---|---|---|
| 1 | SLI, SLO, SLA | Measure, target, contract. | [SRE book: SLOs](https://sre.google/sre-book/service-level-objectives/) |
| 2 | Error budget | A planned amount of failure that guides release speed. | [SRE book: SLOs](https://sre.google/sre-book/service-level-objectives/) |
| 3 | Four golden signals | Latency, traffic, errors, saturation. | [SRE book: Monitoring](https://sre.google/sre-book/monitoring-distributed-systems/) |
| 4 | Symptom vs cause alerts | Every page must be actionable. | [SRE book: Monitoring](https://sre.google/sre-book/monitoring-distributed-systems/) |
| 5 | Logs, metrics, traces | Three kinds of telemetry. | [OpenTelemetry primer](https://opentelemetry.io/docs/concepts/observability-primer/) |
| 6 | Cascading failure | One failure raises the chance of the next. | [SRE book: Cascading failures](https://sre.google/sre-book/addressing-cascading-failures/) |
| 7 | Retry budget | Cap retries per request and per server. | [SRE book: Cascading failures](https://sre.google/sre-book/addressing-cascading-failures/) |
| 8 | Load shedding and goodput | Reject early so accepted requests stay fast. | [AWS: Load shedding](https://builder.aws.com/content/3Eun1EEyX6p2e3VYNyRLSJzLuMV/using-load-shedding-to-avoid-overload) |
| 9 | Graceful degradation | Do less work per request when overloaded. | [SRE book: Cascading failures](https://sre.google/sre-book/addressing-cascading-failures/) |
| 10 | Circuit breaker | Stop calling a failing service for a while. | [Fowler: Circuit Breaker](https://martinfowler.com/bliki/CircuitBreaker.html) |
| 11 | Canary release | Roll out a change to a small part first (chapter title only). | [SRE Workbook chapter list](https://sre.google/workbook/table-of-contents/) (chapter 16) |
| 12 | Ops toggle (kill switch) | Turn off a feature fast during an outage. | [Feature Toggles](https://martinfowler.com/articles/feature-toggles.html) |
| 13 | Incident command roles | Commander, operations, communication, planning. | [SRE book: Managing incidents](https://sre.google/sre-book/managing-incidents/) |
| 14 | Severity and roles in practice | A real runbook from a company. | [PagerDuty Incident Response](https://response.pagerduty.com/) |
| 15 | Blameless postmortem | Find causes in systems, not in people. | [SRE book: Postmortem culture](https://sre.google/sre-book/postmortem-culture/) |

### Month 9. Security (14)

All ten OWASP rows use the same page: [OWASP Top 10:2025](https://top10.owasp.org/2025/0x00_2025-Introduction).

| # | Creature | One line | Source |
|---|---|---|---|
| 1 | A01 Broken Access Control | Still number 1. SSRF now sits here. | [OWASP Top 10:2025](https://top10.owasp.org/2025/0x00_2025-Introduction) |
| 2 | A02 Security Misconfiguration | Moved up from number 5 to number 2. | [OWASP Top 10:2025](https://top10.owasp.org/2025/0x00_2025-Introduction) |
| 3 | A03 Software Supply Chain Failures | New. Covers dependencies, build and distribution. | [OWASP Top 10:2025](https://top10.owasp.org/2025/0x00_2025-Introduction) |
| 4 | A04 Cryptographic Failures | Weak or missing encryption. | [OWASP Top 10:2025](https://top10.owasp.org/2025/0x00_2025-Introduction) |
| 5 | A05 Injection | Untrusted input becomes code. | [OWASP Top 10:2025](https://top10.owasp.org/2025/0x00_2025-Introduction) |
| 6 | A06 Insecure Design | A flaw in the plan, not in the code. | [OWASP Top 10:2025](https://top10.owasp.org/2025/0x00_2025-Introduction) |
| 7 | A07 Authentication Failures | Weak login and session handling. | [OWASP Top 10:2025](https://top10.owasp.org/2025/0x00_2025-Introduction) |
| 8 | A09 Logging and Alerting Failures | You must see an attack to stop it. | [OWASP Top 10:2025](https://top10.owasp.org/2025/0x00_2025-Introduction) |
| 9 | A10 Mishandling of Exceptional Conditions | New. Includes failing open. | [OWASP Top 10:2025](https://top10.owasp.org/2025/0x00_2025-Introduction) |
| 10 | SQL injection prevention | Use query parameters. | [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/) |
| 11 | Session management | Safe cookies and session lifetime. | [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/) |
| 12 | Secrets management | Keep secrets out of code. | [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/) |
| 13 | CSRF and XSS prevention | Two classic browser attacks. | [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/) |
| 14 | ASVS | A checklist of security requirements to verify. Version 5.0.0. | [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/) |

### Month 10. Code architecture and system design (15)

| # | Creature | One line | Source |
|---|---|---|---|
| 1 | What architecture is | The important parts, and the decisions that are hard to change. | [Fowler: Software architecture guide](https://martinfowler.com/architecture/) |
| 2 | Internal quality | High internal quality makes feature work cheaper. | [Is High Quality Software Worth the Cost?](https://martinfowler.com/articles/is-quality-worth-cost.html) |
| 3 | Hexagonal architecture | Business logic inside, ports and adapters outside. | [Cockburn: Hexagonal architecture](https://alistair.cockburn.us/hexagonal-architecture/) |
| 4 | Deep modules | Simple interface, hidden complexity `(idea not on the page, see note)`. | [Ousterhout: A Philosophy of Software Design](https://web.stanford.edu/~ouster/cgi-bin/book.php) `(partly verified)` |
| 5 | Monolith vs microservices | Trade-offs, not a default answer. | [Microservices (Lewis and Fowler)](https://martinfowler.com/articles/microservices.html) |
| 6 | Strangler fig | Replace a legacy system step by step. | [Fowler: Strangler Fig](https://martinfowler.com/bliki/StranglerFigApplication.html) |
| 7 | CQRS, with caution | Fowler warns most uses went badly. | [Fowler: CQRS](https://martinfowler.com/bliki/CQRS.html) |
| 8 | Twelve-factor app | Config, logs, processes, dev/prod parity. | [The Twelve-Factor App](https://12factor.net/) |
| 9 | Scale from zero to millions | Add load balancer, cache, replicas, CDN step by step. | [ByteByteGo ch. 2](https://bytebytego.com/courses/system-design-interview/scale-from-zero-to-millions-of-users) |
| 10 | Back-of-the-envelope estimation | Quick size and cost math. | [ByteByteGo ch. 3](https://bytebytego.com/courses/system-design-interview/scale-from-zero-to-millions-of-users) (chapter list) |
| 11 | A framework for a design talk | Steps to attack an open design question. | [ByteByteGo ch. 4](https://bytebytego.com/courses/system-design-interview/scale-from-zero-to-millions-of-users) (chapter list) |
| 12 | Rate limiter design | A common building block. | [ByteByteGo ch. 5](https://bytebytego.com/courses/system-design-interview/scale-from-zero-to-millions-of-users) (chapter list) |
| 13 | Consistent hashing | A design case (chapter title only). | [ByteByteGo ch. 6](https://bytebytego.com/courses/system-design-interview/scale-from-zero-to-millions-of-users) (chapter list) |
| 14 | Notification system | A design case (chapter title only). | [ByteByteGo ch. 11](https://bytebytego.com/courses/system-design-interview/scale-from-zero-to-millions-of-users) (chapter list) |
| 15 | Payment system | A design case with money (chapter title only). | [ByteByteGo ch. 27](https://bytebytego.com/courses/system-design-interview/scale-from-zero-to-millions-of-users) (chapter list) |

Note for ByteByteGo rows: I read the chapter titles in the sidebar and one full chapter (ch. 2). I did not read chapters 3 to 27. Use the titles only as topic names.

### Month 11. Tech lead decisions (15)

| # | Creature | One line | Source |
|---|---|---|---|
| 1 | Design doc | A short plan written before coding. Focus on trade-offs. | [Design Docs at Google](https://www.industrialempathy.com/posts/design-docs-at-google/) |
| 2 | Goals and non-goals | Non-goals are reasonable goals you chose to skip. | [Design Docs at Google](https://www.industrialempathy.com/posts/design-docs-at-google/) |
| 3 | Alternatives considered | Show the options you rejected, and why. | [Design Docs at Google](https://www.industrialempathy.com/posts/design-docs-at-google/) |
| 4 | Mini design doc | 1 to 3 pages for small changes. | [Design Docs at Google](https://www.industrialempathy.com/posts/design-docs-at-google/) |
| 5 | When to skip a design doc | If the answer is clear and has no trade-offs. | [Design Docs at Google](https://www.industrialempathy.com/posts/design-docs-at-google/) |
| 6 | ADR parts | Title, Context, Decision, Status, Consequences. | [Nygard: Documenting Architecture Decisions](https://www.cognitect.com/blog/2011/11/15/documenting-architecture-decisions) |
| 7 | ADR status | Proposed, accepted, deprecated, superseded. | [Nygard: Documenting Architecture Decisions](https://www.cognitect.com/blog/2011/11/15/documenting-architecture-decisions) |
| 8 | Decision log | The set of ADRs shows why the system looks like it does. | [ADR site](https://adr.github.io/) |
| 9 | Appetite | Decide how much time the work deserves, then fit the scope. | [Shape Up](https://basecamp.com/shapeup) |
| 10 | Shaping and rabbit holes | Find the risks before you commit. | [Shape Up](https://basecamp.com/shapeup) |
| 11 | Scope hammering | Cut scope to fit the time. | [Shape Up](https://basecamp.com/shapeup) |
| 12 | Estimates go wrong | A project planned for 6 months took 18. | [StaffEng: Staff projects](https://staffeng.com/guides/staff-projects/) |
| 13 | Code review standard | Approve when the change improves code health. | [Google: Reviewer standard](https://google.github.io/eng-practices/review/reviewer/standard.html) |
| 14 | Technical debt | Cruft is the "interest" you pay on each new feature. | [Fowler: Technical Debt](https://martinfowler.com/bliki/TechnicalDebt.html) |
| 15 | Manage technical quality | Fix hot spots first. Guard interfaces and data models. | [StaffEng: Manage technical quality](https://staffeng.com/guides/manage-technical-quality/) |

### Month 12. Leading AI agents and capstone (15)

| # | Creature | One line | Source |
|---|---|---|---|
| 1 | Workflows vs agents | Code decides the path, or the model decides. Start simple. | [Building effective agents](https://www.anthropic.com/engineering/building-effective-agents) |
| 2 | Chaining, routing, parallel | Three basic ways to split work. | [Building effective agents](https://www.anthropic.com/engineering/building-effective-agents) |
| 3 | Orchestrator-workers | A lead splits the task. It is a poor fit for most coding. | [Multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system) |
| 4 | Fresh-context reviewer | A fresh session is not biased toward code it just wrote. | [Claude Code best practices](https://code.claude.com/docs/en/best-practices) |
| 5 | Tool design | Few clear tools with helpful errors. | [Writing tools for agents](https://www.anthropic.com/engineering/writing-tools-for-agents) |
| 6 | Context rot | The more the context grows, the more mistakes. | [Effective context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) |
| 7 | Verify first | Give the agent a check it can run. Use `/goal` for a long run. | [Claude Code best practices](https://code.claude.com/docs/en/best-practices) and [/goal docs](https://code.claude.com/docs/en/goal) |
| 8 | Explore, plan, code | Skip the plan if you can describe the diff in one sentence. | [Claude Code best practices](https://code.claude.com/docs/en/best-practices) |
| 9 | CLAUDE.md | Short rules the agent cannot guess. Prune often. | [Claude Code best practices](https://code.claude.com/docs/en/best-practices) |
| 10 | Hooks | A hook always runs. CLAUDE.md is only advice. | [Hooks guide](https://code.claude.com/docs/en/hooks-guide) |
| 11 | Permissions and sandbox | Limit what the agent can touch. | [Claude Code security](https://code.claude.com/docs/en/security) |
| 12 | Subagents | Own context, own tool list, return a summary. | [Subagents docs](https://code.claude.com/docs/en/sub-agents) |
| 13 | Lethal trifecta | Private data, untrusted input, outside channel. Never all three. | [Simon Willison](https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/) and [OWASP LLM Top 10](https://genai.owasp.org/llm-top-10/) |
| 14 | The outer loop | Humans own constraints, sampling, audit and ownership. | [Own the Outer Loop](https://addyosmani.com/blog/own-the-outer-loop/) |
| 15 | Evals | Start with 20 to 50 tasks from real failures. | [Demystifying evals](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) |

Capstone idea (`Opinion`): build one small service from month 2 to month 9 topics. Let agents write parts of it. Then review it with your own checklist and guards.

---

## 4. What a tech lead needs that a senior developer does not (tech side only)

| Tech lead need | What the source says | Source |
|---|---|---|
| Guide one team's technical approach | The Tech Lead "guides the approach and execution of one team". They carry team context. As their coding drops, they delegate hard projects. The page says about one Tech Lead per 8 engineers. | [StaffEng: archetypes](https://staffeng.com/guides/staff-archetypes/) |
| Set technical direction | Staff engineers set direction and act as advocates for technology. | [StaffEng: what Staff engineers do](https://staffeng.com/guides/what-do-staff-engineers-actually-do) |
| Work on ambiguous, high-risk problems | A staff project starts vague, has split stakeholders, and failure is visible. | [StaffEng: Staff projects](https://staffeng.com/guides/staff-projects/) |
| Choose work that matters | Avoid "snacking" on easy tasks. Start with existential risks. Finish projects. | [StaffEng: Work on what matters](https://staffeng.com/guides/work-on-what-matters/) |
| Write down decisions | Design docs and ADRs record trade-offs and stop re-arguing. | [Design Docs at Google](https://www.industrialempathy.com/posts/design-docs-at-google/), [Nygard](https://www.cognitect.com/blog/2011/11/15/documenting-architecture-decisions) |
| Write engineering strategy | "Write five design documents, and pull the similarities out." | [StaffEng: engineering strategy](https://staffeng.com/guides/engineering-strategy/) |
| Own technical quality for the team | Tools run from hot spots to leverage points to metrics. | [StaffEng: Manage technical quality](https://staffeng.com/guides/manage-technical-quality/) |
| Protect internal quality | High internal quality keeps feature work cheap. | [Fowler: quality and cost](https://martinfowler.com/articles/is-quality-worth-cost.html) |
| Run code review as a standard, not a taste | Approve when the change improves code health. Data beats opinion. | [Google reviewer standard](https://google.github.io/eng-practices/review/reviewer/standard.html) |
| Lead during incidents and learn after | Incident commander role. Blameless postmortem. | [SRE: Managing incidents](https://sre.google/sre-book/managing-incidents/), [SRE: Postmortem culture](https://sre.google/sre-book/postmortem-culture/) |
| Keep the glue work from eating your technical growth | "If you only do glue, you will only get better at glue." | [Tanya Reilly: Being Glue](https://noidea.dog/glue) |
| Own agent output | Humans own the verdict and the production boundary. "Only people inherit consequence." | [Own the Outer Loop](https://addyosmani.com/blog/own-the-outer-loop/) |

Short summary:

- A senior developer delivers a good solution for a task.
- A tech lead also decides which task, writes the plan, sets the quality bar, and answers for the result.
- The roadmap.sh line agrees: a tech lead "guides technical direction while remaining hands-on" ([roadmap repo](https://github.com/kamranahmedse/developer-roadmap)).

I did not verify the book *The Staff Engineer's Path* `(not verified)`. Its O'Reilly page returned an access error. A search snippet said it has three parts: "The Big Picture", "Execution", "Leveling Up". Do not use that as a source until you open the book.

---

## Not verified

| Item | What happened |
|---|---|
| O'Reilly pages (DDIA contents, The Staff Engineer's Path) | Returned 403 (access denied). I did not read the chapter lists. |
| Alex Xu as author of System Design Interview | The ByteByteGo pages I read do not name him. Your brief names him. `(not verified)` |
| Fielding REST dissertation | The page failed with a certificate error. I did not use it. |
| Cloudflare Learning Center (CDN) | Returned 403. I used MDN instead. |
| Etsy Debriefing Facilitation Guide | Returned 403. I did not use it. |
| Jepsen consistency page | I could only read the part about serializability. Other models `(not verified)`. |
| Google Testing Blog "Test Sizes" | The post body did not load. I did not use it. |
| MDN DNS page | It does not cover TTL or record types. Do not cite it for those. |
| Google AIP | The home page has no list of rule numbers. I cite the site only. |
| Ousterhout book page | It does not explain "deep modules". The idea is well known but `(not verified)` here. |
| ByteByteGo chapters 3 to 27 | I read only the chapter titles. |
| roadmap.sh diagrams | They did not load. Topic names come from the GitHub file list. |
| AWS Builders' Library index | The article list did not load. I fetched six articles by URL. The older `aws.amazon.com/builders-library/...` URLs redirect (HTTP 301) to `builder.aws.com`. |
| OWASP Top 10 home | `owasp.org/Top10` redirects to `top10.owasp.org`. I read the 2025 introduction page. |
| Kafka docs home | Only a redirect page loaded. I used `kafka.apache.org/intro`. |

---

## Sources

- https://roadmap.sh/roadmaps
- https://roadmap.sh/backend
- https://roadmap.sh/system-design
- https://roadmap.sh/software-architect
- https://roadmap.sh/software-design-architecture
- https://roadmap.sh/api-design
- https://roadmap.sh/engineering-manager
- https://roadmap.sh/best-practices/code-review
- https://github.com/kamranahmedse/developer-roadmap
- https://sre.google/books/
- https://sre.google/sre-book/table-of-contents/
- https://sre.google/sre-book/service-level-objectives/
- https://sre.google/sre-book/monitoring-distributed-systems/
- https://sre.google/sre-book/addressing-cascading-failures/
- https://sre.google/sre-book/managing-incidents/
- https://sre.google/sre-book/postmortem-culture/
- https://sre.google/workbook/table-of-contents/
- https://builder.aws.com/learn/topics/builders-library
- https://builder.aws.com/content/3EumjoZascWd1oZiEgL8ORlv3qE/timeouts-retries-and-backoff-with-jitter
- https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/
- https://builder.aws.com/content/3Eun1EEyX6p2e3VYNyRLSJzLuMV/using-load-shedding-to-avoid-overload
- https://builder.aws.com/content/3K9TeXp6strMiJ4vhakpRD7BQWO/caching-challenges-and-strategies
- https://builder.aws.com/content/3EuRcgkTP1MI0c7zM8W6HL3WIqA/avoiding-insurmountable-queue-backlogs
- https://builder.aws.com/content/3F08f7GPFiZMCgXD8gny6OjxR0Z/challenges-with-distributed-systems
- https://dataintensive.net/
- https://bytebytego.com/courses/system-design-interview/scale-from-zero-to-millions-of-users
- https://staffeng.com/book
- https://staffeng.com/guides/
- https://staffeng.com/guides/what-do-staff-engineers-actually-do
- https://staffeng.com/guides/staff-archetypes/
- https://staffeng.com/guides/manage-technical-quality/
- https://staffeng.com/guides/engineering-strategy/
- https://staffeng.com/guides/staff-projects/
- https://staffeng.com/guides/work-on-what-matters/
- https://noidea.dog/glue
- https://noidea.dog/staff
- https://www.industrialempathy.com/posts/design-docs-at-google/
- https://www.cognitect.com/blog/2011/11/15/documenting-architecture-decisions
- https://adr.github.io/
- https://google.github.io/eng-practices/review/
- https://google.github.io/eng-practices/review/reviewer/standard.html
- https://top10.owasp.org/2025/0x00_2025-Introduction
- https://owasp.org/www-project-application-security-verification-standard/
- https://cheatsheetseries.owasp.org/
- https://genai.owasp.org/llm-top-10/
- https://www.anthropic.com/engineering/building-effective-agents
- https://code.claude.com/docs/en/best-practices
- https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents
- https://www.anthropic.com/engineering/writing-tools-for-agents
- https://www.anthropic.com/engineering/multi-agent-research-system
- https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents
- https://code.claude.com/docs/en/security
- https://code.claude.com/docs/en/sub-agents
- https://code.claude.com/docs/en/hooks-guide
- https://code.claude.com/docs/en/goal
- https://addyosmani.com/blog/own-the-outer-loop/
- https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/
- https://martinfowler.com/architecture/
- https://martinfowler.com/articles/practical-test-pyramid.html
- https://martinfowler.com/articles/mocksArentStubs.html
- https://martinfowler.com/articles/continuousIntegration.html
- https://martinfowler.com/articles/feature-toggles.html
- https://martinfowler.com/articles/microservices.html
- https://martinfowler.com/articles/patterns-of-distributed-systems/
- https://martinfowler.com/articles/is-quality-worth-cost.html
- https://martinfowler.com/bliki/StranglerFigApplication.html
- https://martinfowler.com/bliki/TechnicalDebt.html
- https://martinfowler.com/bliki/CircuitBreaker.html
- https://martinfowler.com/bliki/CQRS.html
- https://abseil.io/resources/swe-book
- https://abseil.io/resources/swe-book/html/toc.html
- https://alistair.cockburn.us/hexagonal-architecture/
- https://web.stanford.edu/~ouster/cgi-bin/book.php
- https://12factor.net/
- https://basecamp.com/shapeup
- https://developer.mozilla.org/en-US/docs/Web/HTTP
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Overview
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching
- https://developer.mozilla.org/en-US/docs/Glossary/DNS
- https://developer.mozilla.org/en-US/docs/Web/Security/Transport_Layer_Security
- https://www.rfc-editor.org/rfc/rfc9110.html
- https://www.rfc-editor.org/rfc/rfc9111.html
- https://www.rfc-editor.org/rfc/rfc9457.html
- https://spec.openapis.org/oas/latest.html
- https://google.aip.dev/
- https://google.aip.dev/121
- https://google.aip.dev/122
- https://google.aip.dev/136
- https://google.aip.dev/155
- https://google.aip.dev/158
- https://google.aip.dev/180
- https://google.aip.dev/185
- https://www.rfc-editor.org/rfc/rfc6585.html
- https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html
- https://platform.claude.com/docs/en/api/errors
- https://platform.claude.com/docs/en/build-with-claude/streaming
- https://platform.claude.com/docs/en/api/rate-limits
- https://docs.stripe.com/api/idempotent_requests
- https://github.com/microsoft/api-guidelines/blob/vNext/azure/Guidelines.md
- https://www.postgresql.org/docs/current/tutorial.html
- https://www.postgresql.org/docs/current/indexes.html
- https://www.postgresql.org/docs/current/using-explain.html
- https://www.postgresql.org/docs/current/transaction-iso.html
- https://www.postgresql.org/docs/current/mvcc.html
- https://use-the-index-luke.com/
- https://redis.io/docs/latest/develop/reference/eviction/
- https://www.enterpriseintegrationpatterns.com/patterns/messaging/
- https://www.rabbitmq.com/tutorials
- https://kafka.apache.org/intro
- https://microservices.io/patterns/data/transactional-outbox.html
- https://microservices.io/patterns/data/saga.html
- https://raft.github.io/
- https://jepsen.io/consistency
- https://opentelemetry.io/docs/concepts/observability-primer/
- https://response.pagerduty.com/
