# Tech lead skills: what they are and how the game can train them

Research date: 2026-10-21. Target role (owner, 2026-10-21): tech lead of one team, plus some staff-engineer scope (technical lead across teams).
The owner writes little code by hand, because AI agents write most code. The owner must still understand the stack deeply.
Link to the earlier topic research: `research/roadmap-sources.md` (concepts per town). This file does not repeat it.

How to read this file:

- `[n]` points to the numbered list in "Sources" at the end.
- A quote in "quotes" is copied from the page I read. A claim without a quote is my short summary of that page.
- `Opinion` means the idea is mine. No source owns it.
- `(not verified)` means I could not open the primary page.
- Scope: `team` = tech lead of one team. `staff` = technical lead across teams.
- Kind: `technical`, `technical-with-people`, or `people-only`.

## Tóm tắt

- Có 26 kỹ năng: 22 cho `team` và 4 cho `staff`. 15 kỹ năng là `technical`, 11 là `technical-with-people`.
- Hầu hết `technical` đã có trong 12 thành phố: system design, design doc, ADR, testing, reliability, security, quality.
- 12 kỹ năng roadmap chưa dạy (`no`): vision của team, debug hệ thống, giao việc/gỡ vướng, khớp với product, nói với non-engineer, nói với khách, nói với sếp, mentoring, chiến lược/chuẩn chung, hướng kỹ thuật nhiều team, chọn việc đáng làm, trình bày với CTO.
- Khoảng trống lớn nhất: giao tiếp kỹ thuật với khách, sếp, CTO. Các bảng cấp bậc (Dropbox, GitLab, Medium) đều đòi hỏi kỹ năng này ở mức senior trở lên.
- Chủ app đã chọn **Meeting Battle** (xem GLOSSARY.md). Nó dạy được cấu trúc câu trả lời và việc chọn nội dung. Nó không dạy được giọng nói, phản ứng thật, và niềm tin theo thời gian.
- Với AI agent: roadmap có Thành phố 12, nhưng chỉ dạy một phần cách viết yêu cầu và cách review code do AI viết.
- Thiết kế v1.4 mục 2 ghi "không học kỹ năng con người". Phạm vi mới của chủ app cần sửa dòng đó.
- Quản lý người thuần (1:1, tuyển dụng, đánh giá hiệu suất) nằm ngoài phạm vi.

## Skill list

Short names in the "Source" column point to the numbered list at the end. "Quote" cells use words from the page.

| # | Skill | Plain definition | What good looks like (observable, from ladders) | Kind | Scope | Source |
|---|---|---|---|---|---|---|
| 1 | Technical vision for the team | You say where the team's system should go. You and the team update it. | Pat Kua: a tech lead sets "a technical vision", resolves "technical disagreements", and manages "technical quality". Dropbox: the tech lead drives "the roadmap and prioritization for the team". | technical-with-people | team | [21], [3] |
| 2 | System and architecture design | You design parts that work together across API and system boundaries. | Dropbox IC4: "bugs do not creep in at the boundaries between components". The design includes rollout with "monitoring, paging" and known "failure domains". | technical | team | [1] |
| 3 | Technical decisions and trade-offs | You choose between options with facts, and you say what each option costs. | Dropbox IC4: "I understand the implications of my decisions and adjust my approach based on the impact and risk". Medium level 4: "Communicates project risk and tradeoffs skillfully and with nuance". | technical | team | [1], [8] |
| 4 | Design docs and ADRs | You write the plan and the decision down, so others can review and later understand. | Ubl: the doc is "the place to write down the trade-offs". "Alternatives considered" is "one of the most important" sections. Nygard: the hardest thing to track is "the motivation behind certain decisions". Medium level 1: "Writes effective technical specs outlining approach". | technical | team | [34], [35], [8] |
| 5 | Breaking down work, estimating, cutting scope | You split a goal into tasks, give a realistic time, and remove what is not needed. | Medium level 3: "Delegates tasks to others appropriately". Level 4: "Finds ways to deliver requested scope faster, and prioritizes backlog". Shape Up: "Appetites start with a number and end with a design". Staff stories: "six months" planned, "eighteen months" taken. | technical | team | [8], [36], [37], [18] |
| 6 | Code review and code standards | You review changes against a clear standard, and you write comments that help the author. | Google: approve when a change "definitely improves the overall code health", even if not perfect. Reply within one business day. Comments are about the code, not the developer. GitLab Senior: "Maintain and advocate for these standards through code review." | technical-with-people | team | [29], [31], [32], [5] |
| 7 | Technical quality and tech debt | You find where quality hurts the team, and you fix those places first. | Staffeng: fix "hot spots" first. The highest-leverage points are "interfaces, stateful systems, and data models". Fowler: debt "interest" is the extra days each feature costs. GitLab Staff: "Actively seek out difficult impediments to our efficiency as a team". | technical | team | [15], [40], [5] |
| 8 | Testing strategy and safe delivery | You make sure tests, CI, and rollouts catch problems before users do. | Medium Craft level 1: "Writes tests for every new feature and bug fix". Google: "Will the tests actually fail when the code is broken?" Dropbox IC4: rollout with monitoring in place. Staffeng lists "CI/CD" and "small, atomic changes" among practices to adopt. | technical | team | [8], [30], [1], [15] |
| 9 | Observability | You can see what the system does in production, and you page only on useful signals. | SRE: the "four golden signals" are "latency, traffic, errors, and saturation". Catch symptoms first; "only worry about very definite, very imminent causes". | technical | team | [27] |
| 10 | Production ownership and incident handling | You own the service after release. In an incident you lead the call and learn afterwards. | Dropbox IC4: "I am unafraid of declaring a SEV when needed". Also "I proactively create and/or update playbooks for components I own". SRE: one incident commander, an ops lead who "should be the only group modifying the system", and a living incident document. Postmortems are blameless. Medium: "Writes thorough postmortems for service outages". | technical-with-people | team | [1], [25], [26], [8] |
| 11 | Debugging hard problems across systems | You find root causes in several layers, with tests and not with guesses. | Dropbox IC4: "I effectively and quickly debug cross-module issues". SRE: use the hypothetico-deductive method, and work through the layers of a stack by "Dividing and conquering". Avoid "wildly improbable theories". | technical | team | [1], [28] |
| 12 | Security and risk thinking | You see risks early and make them part of the design. | Dropbox IC4: "I preemptively identify and resolve technical risks before they jeopardize the project". Ubl: reviews make sure designs cover "observability, security and privacy". GitLab Senior: "Advocate for improvements to product quality, security, and performance". | technical | team | [1], [34], [5] |
| 13 | Specifying work for AI agents | You give an agent a clear task, the context it needs, and a check it can run. | Claude Code docs: give the agent "verification criteria". Scope the task: which file, which case, test preferences. Explore, plan, then code. Keep CLAUDE.md short, with rules the agent cannot guess. Osmani: the human sets the "constraints" first. | technical | team | [38], [39] |
| 14 | Reading and reviewing AI-written code | You read agent output as you read a colleague's change, and you look for design and risk. | Google "what to look for": design, functionality, complexity, tests. Claude Code docs: ask for "evidence rather than asserting success", and use a fresh model as a second opinion. Staffeng: even when you write little, "you’ll be reading a ton of your coworkers’ code". | technical | team | [30], [38], [14] |
| 15 | Judging AI output and owning the verdict | You decide to ship, block, or narrow. You can explain why it is safe. | Osmani: a Verdict is "ship, block, redirect, narrow the response, add a guardrail, or reject outright". Humans own four loops: constraints, sampling, audit, ownership. Beware "cognitive surrender" and "cognitive debt". | technical | team | [39] |
| 16 | Deep stack knowledge without daily hand-coding | You keep your technical judgment current when agents write most code. | Kua: a tech lead must "keep involved with code to make informed decisions, identify technical risks and to maintain trust with developers", with a suggested minimum of 30% time with code. Staffeng: "your intuition is going stale every week you’re away from building product features". Osmani: the longer the agent runs, the bigger the gap between its code and your understanding. | technical | team | [21], [15], [14], [39] |
| 17 | Unblocking the team and delegating | You remove blockers. You give hard work to others, and you do the missing glue work. | Staffeng: tech leads are "unblocking them along the way" and "default to delegating such projects". Dropbox IC4: "I unblock myself and my team by proactively assessing and eliminating the root cause". Reilly: glue work "demonstrates and builds strong technical leadership skills". | technical-with-people | team | [13], [1], [24] |
| 18 | Aligning technical work with product goals | You turn product needs into technical choices, and you say what the tech can and cannot do. | Kua: the Product Manager owns the "What", the tech lead owns the "How". Dropbox IC4 lever: keep "customer needs in mind" and "leverage input from product stakeholders". Staffeng: a "close partner to the team’s product manager". Medium level 3: "Integrates business needs into project planning". | technical-with-people | team | [21], [1], [13], [8] |
| 19 | Explaining technical decisions to non-engineers | You explain a technical choice to a PM or designer so they can decide. | Dropbox IC4: "tailor my message to my audience presenting it at the right altitude". Also "identify technical blindspots and clarify ambiguity in their ideas". | technical-with-people | team | [1] |
| 20 | Technical communication with clients | You explain a risk or an estimate, push back on scope with reasons, and answer "why is it late" with facts. | GitLab Staff: "Interact with customers and other external stakeholders as a consultant and spokesperson for the work of your team." Medium level 3: "Manages project stakeholder expectations effectively" and "Anticipates and shares schedule deviations in plenty of time". Shape Up: cut scope by comparing to the customer's "baseline". | technical-with-people | team | [5], [8], [37] |
| 21 | Technical communication with your manager | You bring options and a recommendation, give honest status, and avoid surprises. | Staffeng: "Never surprise your manager." "Don’t present a question without an answer." Reports are "planning, reporting on status, or resolving misalignment". Dropbox IC4: "I proactively share information so the relevant stakeholders are informed and aligned". | technical-with-people | team | [20], [19], [1] |
| 22 | Mentoring through technical work | You grow others through review comments, design feedback, and shared knowledge. | Dropbox IC4: "quality feedback on designs ... asking probing, insightful questions". GitLab Senior: mentor others and "remove blockers to their autonomy". Medium level 2: "guides people to realizations rather than providing the answer". Google: "Explain why" in comments. | technical-with-people | team | [1], [5], [8], [32] |
| 23 | Engineering strategy and standards across teams | You write down guiding rules so many teams decide the same way. | Staffeng: "write five design documents, and pull the similarities out". Write a strategy when you "rehashed the same discussion three or four times". Dropbox IC5: "I set the multi-year, multi-team technical strategy". GitLab Staff: "Shepherd the definition and improvement of our internal standards". | technical | staff | [16], [2], [5] |
| 24 | Cross-team technical direction and architecture review | You align many teams' technical choices, and you review designs outside your team. | Staffeng: align "technical vectors" with feedback, strategy, tooling, onboarding, and architecture reviews. Dropbox IC5: "making build vs buy choices" and review "cross-team cross-module design/API issues". Dropbox Technical Lead: "identify and remediate conflicting designs from different parts of the organization". | technical-with-people | staff | [15], [2], [3] |
| 25 | Choosing what matters | You pick the work with the most impact and finish it. | Staffeng: avoid "snacking" (easy, low-impact work). Look first for "existential" risks. "Finish things": the project "goes from risk to leverage". | technical | staff | [17] |
| 26 | Presenting to executives and the CTO | You present plans, status, or a disagreement so executives can decide. | Staffeng: start with the summarizing idea; use SCQA (Situation, Complication, Question, Answer). "Never fight feedback." Dropbox IC5: "presenting it clearly and concisely at the right altitude". | technical-with-people | staff | [19], [2] |

Notes on the table:

- Dropbox "Technical Lead" is an archetype of one team, taken from Larson's Tech Lead [3], [13]. This matches the owner's team-level target.
- Camille Fournier, *The Manager's Path*, chapter 3 "Tech Lead": I could not read the chapter. A search summary says it covers roles like systems architect and team leader (not verified) [41].
- Tanya Reilly, *The Staff Engineer's Path*: I read only the author's page. It names three parts: big picture, project execution, levelling up [23]. Book text not verified.
- Skills 1, 6, 10, 17-22, 24, 26 have a people part. The people part is always about a technical topic.

## How each skill is practised

Game parts used: Lesson, Battle (with Constraint and Reason), Decision Card, Boss design doc, ADR, AI agent drill, Gym.
Checks use only what the app has: a fixed move table (damage 0, 1, 2), three Reason options, the self-mark of key points after a Battle, a checklist, or "Discuss in Claude".
All scenario numbers below are `(example made up)`.

| Skill | Practice drill for the phone (3-15 min) | Weekend desktop drill (45 min) | How the game can check it automatically or by self-check | Source for the practice idea |
|---|---|---|---|---|
| 1 Technical vision | Decision Card: two options for a team with a stated direction. Pick the one that fits the direction. | Boss: write one page "where our system should be in 12 months". Give 3 pains, 3 non-goals, 3 first steps. | Checklist: has a direction, non-goals, a first step. Open gaps go to "Discuss in Claude". | Opinion. Content from [21] |
| 2 System design | Battle in Town 10. Opponent: "orders double every month". Moves: add queue, add replica, rewrite. | Boss: design one feature with two services and one API boundary. Add a rollout plan. | Fixed move table. Self-mark of 3 key points. Boss compared to a model answer. | [1] for what good looks like. Drill is Opinion |
| 3 Decisions and trade-offs | Battle with Constraint (budget, team size, deadline) and one Reason out of three. | ADR for a real decision at work. Write your prediction. The app asks for the outcome after 4-8 weeks. | Best-move rate per town. A wrong Reason weakens the hit. ADR outcome reminder. | Game design (design-v1.4, sections 3 and 7) |
| 4 Design docs and ADRs | Decision Card: "Is a design doc needed?" Two situations: one with trade-offs, one that is an "implementation manual". | Boss: write the doc with Goals, Non-goals, Alternatives. Rewrite one section after a colleague reads it. | Checklist from Ubl: non-goals are real goals you skip; alternatives show trade-offs. | [34], [35] |
| 5 Breaking down, estimating, cutting scope | Battle. Opponent: "scope grew 40% in week 2". Moves: add people, hammer scope, extend date. Constraint: fixed 6-week date. | Boss: split a feature into tickets with an appetite. Mark must-have, nice-to-have, cut. After the work, compare plan and result. | Move table based on "fixed time, variable scope". Self-check: each ticket has a done-test. Staffeng: study where the plan deviated. | [36], [37], [16] for the review step |
| 6 Code review and standards | Decision Card: a diff with one design problem and one style nit. Pick the comment that fits the standard. Reason: why. | Write 5 review comments on a real pull request. Mark each as blocking or not. Rewrite one comment so it speaks about the code. | Self-check list from Google: design first, tests, explain why, kind tone. Compare with a model comment. | [29], [30], [32] |
| 7 Quality and tech debt | Battle. Opponent: "the team's builds take 25 minutes". Moves: process rule, fix hot spot, new tool. | Boss: rank 5 quality problems of your team by hot spot, leverage point, and cost. Pick one to fix first. | Move table: "fix the hot spot" scores highest. Self-check against the staffeng order. | [15] for order of tools. Scenario is Opinion |
| 8 Testing and safe delivery | Gym question set mixing test types and rollout. Battle: opponent "flaky end-to-end test blocks release". | AI agent drill: let an agent add tests. Review whether the tests "will actually fail when the code is broken". | Tests run in the app's own CI sandbox: a mutation shown as a pass or fail card. Self-mark. | [30] |
| 9 Observability | Decision Card: pick which alert should page a human (symptom vs cause). | Write a dashboard plan with the four golden signals for one real service. | Checklist: each page is actionable, each signal named. | [27] |
| 10 Production and incidents | Battle in Town 8. Opponent: "errors up 5x, 10 minutes ago". Moves: roll back, debug live, open incident roles. | Incident game: read a made-up timeline. Write the first status message and the postmortem outline (blameless). | Move table. Postmortem checklist: causes in systems, action items with owners. | [25], [26] |
| 11 Debugging across systems | Battle with three clues per turn. Moves: test hypothesis A, B, or "change many things". Best move rules out the most causes. | Debug drill: a small repo with a seeded bug across 3 layers. Write a hypothesis log. | Automatic: the hidden bug is fixed or not, with a test. Self-check: each step ruled something out. | [28]. Game form is Opinion |
| 12 Security and risk | Battle with a threat shown first. Moves: validate input, add auth, ignore for now. Constraint decides. | Boss: add a "Risks" section with 3 threats to a doc from Town 11. | Fixed move table. Checklist: each risk has an owner and a mitigation. | [34] for cross-cutting concerns. Drill is Opinion |
| 13 Specifying for AI agents | Decision Card: two task prompts. One has a verification criterion; pick it. | AI agent drill: write a spec with scope, constraints, and a pass/fail check. Run the agent. Count the fixes needed. | Checklist: file named, edge case named, test command named. Count of rework rounds is self-logged. | [38] |
| 14 Reviewing AI-written code | Battle. Opponent: an agent diff (shown as short code). Moves: approve, ask for test, reject, narrow. Constraint: "release tonight". | AI agent drill: review the agent's work with the month checklist (design, tests, risk). Log what you caught. | Hidden defects list. Self-mark which ones you found. Seeded bugs make this automatic. | [30], [38]. Seeded-bug idea is Opinion |
| 15 Judging AI output | Decision Card: "Evidence shows tests pass but nothing checks the new path." Ship or block. | Write one short "accountability note": checklist used, evidence, accountable person, rollback. | Checklist from the outer-loop idea. Compare with a model note. | [39] |
| 16 Deep stack knowledge | Review (spaced) of all creatures. 3-minute days keep this alive. | "Read the diff" drill: read a 100-line unfamiliar change. Write 3 sentences from memory with the page closed. | Review ratings (Again, Hard, Good, Easy). Self-mark on the 3 sentences. | Game design (design-v1.4, section 3, 45-minute day). Link to [21] |
| 17 Unblocking and delegating | Battle. Opponent: "a junior is stuck for 2 days". Moves: take the task, ask a probing question, pair 20 minutes. | Write a delegation brief for a hard task: goal, constraints, check-in point. | Move table. Checklist: owner, done-test, when you will check. | Opinion. Content from [13], [8] |
| 18 Aligning with product goals | Decision Card: PM wants feature X. Pick the technical question that most reduces risk. | Boss: turn one product goal into a technical plan with an appetite. | Checklist: what, how, cost, risk. "Discuss in Claude" for the plan. | Opinion. Roles from [21] |
| 19 Explaining to non-engineers | Battle (not a Meeting Battle: a PM is not a client or senior manager). Opponent: PM asks "can we add this in a day?" Moves: three answers at different altitudes. | Rewrite one ADR as a 5-line note for a PM. | Fixed move table. Checklist: no jargon, one risk, one choice. | [1] for "right altitude". Drill is Opinion |
| 20 Communication with clients | **Meeting Battle**. Opponent: a client question, e.g. "Why is it late?" Moves: possible answers. Constraint: the meeting situation. See the example below the table. | Boss: write the client email for a late project or a scope pushback. Use SCQA. Give options. | Move table with Reasons. Checklist: answer first, cause in one sentence, new date, options. | [19] for answer structure. Game form: Meeting Battle (decided, `GLOSSARY.md`) |
| 21 Communication with your manager | **Meeting Battle**. Opponent: "Why did you not tell me earlier?" Moves: honest status, excuse, silence. Constraint: "the manager reports to the CTO tomorrow". | Write a 6-line status update: risk, what changed, options, your recommendation. | Checklist: no surprise, option plus recommendation, data. | [20], [19]. Game form: Meeting Battle (decided) |
| 22 Mentoring through technical work | Decision Card: pick the review comment that guides, not tells. | Rewrite 3 harsh review comments as comments about code. Add why. | Self-check list. Compare with model comments. | [32]. Drill is Opinion |
| 23 Strategy and standards | Decision Card: "We debated this for the 4th time." Pick: write a strategy, or decide again. | Boss: from 3 past ADRs, write one strategy with a diagnosis and 3 guiding rules. | Checklist: specific, opinionated, shows its work. | [16] |
| 24 Cross-team direction | Battle. Opponent: two teams with different API styles. Moves: mandate, tool in workflow, feedback. | Review a design from another team. Write 3 questions that surface "erroneous assumptions". | Move table based on staffeng's tool order. Checklist on questions. | [15], [1] |
| 25 Choosing what matters | Decision Card: three tasks. Pick the one with high impact; avoid "snacking". | Make a one-page list of your tasks. Mark impact and finish date. | Self-check against the staffeng categories. | [17] |
| 26 Presenting to executives | **Meeting Battle**. Opponent: a CTO question "What do you need from me?" Moves: three openings. Constraint: "you have 5 minutes in the CTO's weekly meeting". | Write a one-paragraph SCQA for one real decision. | Checklist: answer first, one proposal, one ask. | [19]. Game form: Meeting Battle (decided) |

Example of a Meeting Battle `(example made up)`, using the game terms from `GLOSSARY.md`:

| Part | Content |
|---|---|
| Opponent | Client: "Your team said Friday. It is Tuesday. Why is this late?" |
| Constraint (the meeting situation) | The client launches on Friday. The meeting is 10 minutes. The client is not technical. Fact: the partner's API changed on Monday, and you lost 3 days. |
| Move A: "The developers underestimated the work." | Damage 0. Counter: "The client now doubts every estimate." |
| Move B: "The partner's API changed Monday. We lost 3 days. New date: next Wednesday. Option: ship without feature X on Friday." | Damage 2. Best move. |
| Move C: "We will work the weekend to keep Friday." | Damage 1. Counter: "Quality falls. The client expects this next time." |
| Reasons (pick one) | "States the cause and gives options." / "Protects the team from blame." / "Keeps the old date." |
| Self-check after the Battle | Did you give the new date? Did you name one cause? Did you offer a choice? |

### What good looks like in a meeting (for the Meeting Battle move tables)

These points come from the sources. The game turns each point into a best move or a weak move.

| Point | What the source says | Source |
|---|---|---|
| Answer first | "The clearest sequence is always to give the summarizing idea before you give the individual ideas being summarized." Use SCQA. | [19] |
| Bring an answer, not only a problem | "Don’t present a question without an answer." | [19] |
| Do not hide problems | "Don’t evade responsibility or problems." Informing is "absolution": then you can solve it. | [19] |
| Take feedback | "Never fight feedback." | [19] |
| No surprise for your manager | "Never surprise your manager." Treat each surprise as an incident to learn from. | [20] |
| Share delay early | Medium level 3: "Anticipates and shares schedule deviations in plenty of time". | [8] |
| Keep expectations real | Medium level 3: "Manages project stakeholder expectations effectively". | [8] |
| Say risk and trade-off with nuance | Medium level 4: "Communicates project risk and tradeoffs skillfully and with nuance". | [8] |
| Right altitude for the audience | Dropbox IC4: "tailor my message to my audience presenting it at the right altitude". | [1] |
| Speak for the team to outsiders | GitLab Staff: "consultant and spokesperson for the work of your team". | [5] |
| Cut scope with a reason the customer feels | Shape Up: compare to the "baseline", the customer's life today without the feature. | [37] |
| Keep status short for senior readers | SRE example: an email thread "keeps VPs abreast of the high-level status without bogging them down in minutiae". | [25] |

### What the Meeting Battle can and cannot train

Decided by the owner: the Meeting Battle is part of the design. The opponent is a question or a push from a client or a senior manager.
Each move is a possible answer. The Constraint is the situation of the meeting. The Reason is one of three, as in any Battle.

| Skill | What a Meeting Battle can train | What it cannot train |
|---|---|---|
| 20 Clients | Answer structure (cause, new date, options). Scope pushback with a reason. Choosing facts over excuses. Reading the Constraint (launch date, client is not technical). | Tone of voice. Live follow-up questions. Client emotion. Timing inside a real meeting. |
| 21 Your manager | "No surprise" habit. Option plus recommendation. How much detail to give. Choosing honest status over silence. | Trust built over months. The real manager's style. Saying it face to face. |
| 26 Executives and the CTO | Answer first. One proposal and one ask. Taking feedback without a fight. | Live pushback and interruptions. Each executive's way to take information (staffeng calls it "preprocessing reality"). |
| 10 Incidents (status part) | The first status message: short, facts, next update time. | Running the call under stress. Role handoff. |
| 24 Cross-team direction (staff) | Answers to "why should my team follow this rule?" | Real authority and politics. |
| 19 Explaining to non-engineers | Not in scope: a PM is not a client or senior manager. Use a normal Battle or a Decision Card. | Same limits as above. |

How the game checks it (no AI in the app): a fixed move table with damage 0, 1, or 2, a counter-hit line, and one Reason out of three.
The self-check after the Battle stays: the learner marks which of 3 key points they could say.
Free wording is not tested by moves. Test it with the weekend Boss email and "Discuss in Claude", or with a colleague.

Design note: `docs/design-v1.4.md` section 7 asks the learner to write 1-2 sentences of "why" before the result. `GLOSSARY.md` says a Reason is one of three options. This file follows the glossary.

## Map to the 12 towns

Town list is from `docs/design-v1.4.md`, section 4. Concepts per town are from `research/roadmap-sources.md`, section 3. A new mechanic per town is already a design rule (design-v1.4, section 4); several suggestions below use it.

| Skill | Town(s) where it fits today | Covered now? (yes / partly / no) | Suggestion |
|---|---|---|---|
| 1 Technical vision | None. Town 11 has "Decision log" only | **no** | Add to Town 11: one Lesson on "technical vision", and a Boss on a 12-month vision. |
| 2 System design | Town 10 | yes | Keep. |
| 3 Decisions and trade-offs | All towns (Battle), Town 11 | yes | Keep. |
| 4 Design docs and ADRs | Town 11, weekend Boss and ADR | yes | Keep. |
| 5 Breaking down, estimating, cutting scope | Town 11 (appetite, shaping, scope hammering, estimates go wrong) | partly | Add a creature "work breakdown" to Town 11. Today only the Champion checklist says "chia ticket". |
| 6 Code review and standards | Town 11 ("Code review standard"); Champion "review PR" | partly | Add comment-writing practice (Decision Card) to Town 11. Only one creature today. |
| 7 Quality and tech debt | Town 10, Town 11 | yes | Keep. |
| 8 Testing and safe delivery | Town 4, Town 8 (canary, toggles) | yes | Keep. |
| 9 Observability | Town 8 | yes | Keep. |
| 10 Production and incidents | Town 8 (command roles, postmortem) | yes | Add status-message practice (see skill 20-21). |
| 11 Debugging across systems | None. No debug or troubleshooting creature | **no** | Add a "Trace" mechanic in Town 4 or Town 8: Battle with clues and hypotheses. |
| 12 Security and risk | Town 9, plus seeds in Towns 1-3 | yes | Add a "Risks" section to the Town 11 Boss. |
| 13 Specifying for AI agents | Town 12 ("Explore, plan, code", "Verify first", "CLAUDE.md") | partly | Add a creature "task spec" to Town 12. |
| 14 Reviewing AI-written code | Town 12 ("Fresh-context reviewer"); weekend AI drill | partly | Add Battles with seeded bugs in agent diffs, starting in Town 4. |
| 15 Judging AI output | Town 12 ("The outer loop", "Evals", "Verify first") | yes | Keep. |
| 16 Deep stack knowledge | Towns 1-10, review schedule | yes | Add a monthly "read the diff" weekend drill. |
| 17 Unblocking and delegating | None for people. AI delegation only in Town 12 | **no** | Add Town 11 Battles on delegating and unblocking (technical content only). |
| 18 Aligning with product goals | None | **no** | Add to Town 11: Decision Cards on turning a product goal into a technical question. |
| 19 Explaining to non-engineers | None | **no** | Add Town 11 Battles with a PM as opponent. |
| 20 Communication with clients | None | **no** | Add a Meeting Battle set to Town 11 (decided form). Add one late-project Meeting Battle to Town 8. |
| 21 Communication with your manager | None | **no** | Same Meeting Battle set in Town 11, with a manager as opponent. |
| 22 Mentoring through technical work | None | **no** | Add comment-rewrite drills to Town 11 weekend 3. |
| 23 Strategy and standards across teams | None | **no** | Add a Town 11 or Town 12 creature "engineering strategy". Staff scope. |
| 24 Cross-team direction | None | **no** | Add a Town 10 Boss: review another team's design. Staff scope. |
| 25 Choosing what matters | None. "Appetite" in Town 11 is close but about scope | **no** | Add a Town 11 Decision Card set. Staff scope. |
| 26 Presenting to executives | None | **no** | Add a CTO Meeting Battle and an SCQA Boss to Town 11 or Town 12 (capstone). Staff scope. |

Summary of coverage (my count of the 26 rows): yes = 10, partly = 4, no = 12.
The Meeting Battle form is decided. Which town gets it, and all other suggestions here, are `Opinion`. A design change is needed. Design-v1.4 section 2 says "Không học kỹ năng con người".

## Scope decision for the owner

The owner decided on 2026-10-21: keep `technical` and `technical-with-people`. People management is out.
This table lists the `technical-with-people` skills, so the owner can see what the game can and cannot train.

| Skill | What the game can train | What the game cannot train |
|---|---|---|
| 1 Technical vision | Writing a vision, spotting weak ones, choosing between directions | Getting a real team to agree and follow |
| 6 Code review | Choosing and rewriting comments; spotting design problems | The author's real reaction; speed and habit |
| 10 Incidents | Roles, first message, postmortem structure, decision order | Stress, real chat noise, real team coordination |
| 17 Unblocking and delegating | Brief writing; choosing what to delegate | Noticing that someone is stuck; trust |
| 18 Aligning with product | Turning goals into technical questions | Real PM relationship and trade talks |
| 19 Explaining to non-engineers | Choosing wording and altitude; short rewrites | Reading faces and live questions |
| 20 Clients | Meeting Battle: answer structure, facts first, options, scope pushback wording | Tone of voice, timing, real client emotion |
| 21 Your manager | Meeting Battle: status structure, option plus recommendation, no surprises | Trust built over months; the manager's real style |
| 22 Mentoring | Guiding comments and questions; rewriting harsh comments | The long relationship |
| 24 Cross-team direction (staff) | Choosing tools to align teams; writing review questions | Authority, politics, real buy-in |
| 26 Executives (staff) | Meeting Battle and SCQA writing; choosing an opening | Live pushback; each executive's style |

Real feedback stays outside the app. The design already asks a colleague to read one design doc or ADR each month (design-v1.4, section 3). The owner could extend that to one real status email each month. `Opinion`.

Out of scope (pure people management, per owner): 1:1 meetings, hiring and interviewing, performance reviews, career conversations, team health programs.
These appear in ladders. Dropbox lists them under "Talent" and "Culture" [1]. Kua puts them under the Engineering Manager role [21].

## Sources

Label meaning: (full) = I read the whole page text. (partial) = I read the parts cited. (summary only) = I saw only a tool summary. Blocked pages are listed last.

1. https://dropbox.github.io/dbx-career-framework/ic4_software_engineer.html (full)
2. https://dropbox.github.io/dbx-career-framework/ic5_staff_software_engineer.html (partial: Communication, Strategy, Architecture, Craft sections)
3. https://dropbox.github.io/dbx-career-framework/archetypes_behaviors.html (full)
4. https://dropbox.github.io/dbx-career-framework/ (summary only; used for the framework structure)
5. https://handbook.gitlab.com/job-description-library/engineering/backend-engineer/ (partial: Senior and Staff Backend Engineer sections). Original URL `handbook.gitlab.com/job-families/engineering/backend-engineer/` redirects here.
6. https://handbook.gitlab.com/handbook/engineering/careers/matrix/ (full, but it is only an index; the level pages redirect to a GitLab sign-in, so the matrix text is not verified)
7. https://github.com/Medium/snowflake (full; README says Medium no longer uses the tool)
8. https://raw.githubusercontent.com/Medium/snowflake/master/constants.js (partial: tracks Project management, Communication, Craft, Mentorship, Initiative, Foundations; "level" = milestone 1 to 5)
9. https://circleci.com/blog/why-we-re-designed-our-engineering-career-paths-at-circleci (summary only; the linked matrix is a Google spreadsheet I did not open; not used for any claim in the tables)
10. https://circleci.com/blog/7-steps-to-building-an-engineering-competency-matrix/ (summary only; not used for any claim in the tables)
11. https://jmason.ie/2015/10/22/235802a.html (full; a blog link post that says Rent the Runway open sourced its ladder in March 2015; the ladder itself was not opened)
12. https://staffeng.com/guides/ (full; index)
13. https://staffeng.com/guides/staff-archetypes/ (full)
14. https://staffeng.com/guides/what-do-staff-engineers-actually-do (full)
15. https://staffeng.com/guides/manage-technical-quality/ (partial: about 70%, up to the quality team section)
16. https://staffeng.com/guides/engineering-strategy/ (partial: first three sections)
17. https://staffeng.com/guides/work-on-what-matters/ (full)
18. https://staffeng.com/guides/staff-projects/ (partial)
19. https://staffeng.com/guides/present-to-executives/ (partial: most of the page)
20. https://staffeng.com/guides/staying-aligned-with-authority/ (partial)
21. https://www.patkua.com/blog/the-definition-of-a-tech-lead/ (full; the old URL `thekua.com/atwork/2014/11/the-definition-of-a-tech-lead/` redirects here)
22. https://leanpub.com/talking-with-tech-leads (full page; the book text was not read)
23. https://noidea.dog/staff (full; author page of *The Staff Engineer's Path*; book text not read)
24. https://noidea.dog/glue (partial: "Being Glue")
25. https://sre.google/sre-book/managing-incidents/ (partial)
26. https://sre.google/sre-book/postmortem-culture/ (partial)
27. https://sre.google/sre-book/monitoring-distributed-systems/ (partial)
28. https://sre.google/sre-book/effective-troubleshooting/ (partial)
29. https://google.github.io/eng-practices/review/reviewer/standard.html (full)
30. https://google.github.io/eng-practices/review/reviewer/looking-for.html (partial)
31. https://google.github.io/eng-practices/review/reviewer/speed.html (partial)
32. https://google.github.io/eng-practices/review/reviewer/comments.html (partial)
33. https://google.github.io/eng-practices/review/developer/small-cls.html (partial; not cited in a table cell)
34. https://www.industrialempathy.com/posts/design-docs-at-google/ (partial)
35. https://www.cognitect.com/blog/2011/11/15/documenting-architecture-decisions (partial)
36. https://basecamp.com/shapeup/1.2-chapter-03 (partial)
37. https://basecamp.com/shapeup/3.5-chapter-14 (partial)
38. https://code.claude.com/docs/en/best-practices (partial)
39. https://addyosmani.com/blog/own-the-outer-loop/ (full)
40. https://martinfowler.com/bliki/TechnicalDebt.html (partial)
41. https://www.oreilly.com/library/view/the-managers-path/9781491973882/ (blocked, 403; chapter list came from a web search summary, so summary only and not verified)

Not verified (could not open or only a summary):

- Camille Fournier, *The Manager's Path*, chapter 3: O'Reilly page returned 403. The chapter list and chapter description came from a web search summary only.
- Tanya Reilly, *The Staff Engineer's Path*: O'Reilly pages returned 403. Only the author's page was read.
- progression.fyi: redirects to `careerminds.com/job-architecture`, which returned 403. I could not use it as an index.
- Rent the Runway engineering ladder: no working original link found. The `oreil.ly` link returned 403. Not verified.
- Medium's engineering growth post (`medium.engineering` / `medium.com`): blocked by Cloudflare. I used the public Snowflake code instead.
- GitLab level pages (Senior, Staff competencies): sign-in wall. I used the job-family page.
- CircleCI matrix: the spreadsheet was not opened.
- Dropbox framework: I read IC4 (Senior) and IC5 (Staff) only, plus the archetypes page.
