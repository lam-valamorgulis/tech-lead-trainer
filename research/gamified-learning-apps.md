# Gamified learning apps: what they do, and what the evidence says

Research date: 2026-10-19. Every URL below was fetched, unless marked `(not verified)`.

## Tóm tắt

- Tôi không tìm thấy app nào có nhiều người dùng, nhắm vào mức tech lead hoặc staff, và dùng cơ chế game. Gần nhất là Codemia và Educative, nhưng cả hai chỉ luyện phỏng vấn system design.
- Các app game hóa lớn (Duolingo, Boot.dev, Codédex, Brilliant) đều dành cho người mới. Với Duolingo, chỉ học cơ chế, không học nội dung.
- Bằng chứng mạnh nhất cho việc quay lại mỗi ngày là streak. Nhưng phần lớn là số liệu của chính công ty hoặc chỉ là tương quan. Có một thử nghiệm ngẫu nhiên ở Peru (NBER) cho thấy hiển thị streak làm học sinh dùng nhiều hơn.
- Bằng chứng không bác bỏ quyết định "không streak" của bạn. Nhưng nó gợi ý: hãy cho bạn thấy sự đều đặn (30-day learning rate) mỗi ngày, và giữ đường quay lại (comeback).
- Hai điều cần cẩn thận: hiệu ứng game giảm sau khoảng 4 tuần, và phần thưởng hoặc thi đua có thể làm giảm động lực.

## How I checked

- I fetched each page and read it. I did not copy facts from memory.
- Some sites blocked me (LeetCode, parts of Sololearn, some journals). I list them in "Not verified".
- User numbers come only from the company's own page, filing, or letter. All other numbers are marked `(not verified)`.
- Company numbers are not independent proof. The company chose what to publish.
- Reasoning that is mine is marked `Opinion`.

---

## 1. Is there any app for tech lead level with game mechanics?

**Answer: I found none with many users.** (My search is not complete. It is the best result of the searches I ran.)

| App | What it does | Level it targets | Game mechanics | Size |
|---|---|---|---|---|
| Codemia | System design practice, AI feedback | Interview prep, "beginner to advanced" | Leaderboard, 15+ badges, streak, spaced repetition | "Thousands of engineers" (no exact number) |
| Educative | Courses, AI mock interviews, system design | Working developers, interview prep (page names no level) | Daily coding challenge with leaderboard | 3.1 million developers (own page) |
| ByteByteGo | System design courses, newsletter | Interview prep | None found on the page | 5 million people (own page) |
| Technical Lead Simulator | Branching story: a 2 AM production outage | Tech leads and PMs | Choices change uptime, CEO trust, team morale | 7 upvotes, 14 followers (Product Hunt) |
| Dev Team Simulator | Run a software project month by month | Project managers, lead developers | Final score out of 1,000 | No user number |
| Decision Pathways | One-hour board game about architecture trade-offs | Systems engineers | Cards, trade-offs, time pressure | Studied with 54 engineers |
| ArchSim (iOS) | AI asks questions about your system design | Interview prep | Daily drills | 1.0 stars from 2 ratings |

Sources: [Codemia](https://codemia.io), [Educative](https://www.educative.io/), [ByteByteGo](https://bytebytego.com/), [Technical Lead Simulator](https://www.producthunt.com/products/technical-lead-simulator), [Dev Team Simulator article](https://www.kern-it.be/en/blog/managing-dev-teams-a-free-serious-game-to-train-project-leads/), [Decision Pathways paper](https://papers.academic-conferences.org/index.php/ecgbl/article/view/4041), [ArchSim](https://apps.apple.com/us/app/id6756310915).

What this means:

- Codemia and Educative are the nearest. They train system design for interviews, not tech lead work.
- Tech lead work includes design docs, ADRs, trade-offs with people, and incidents. No large app games this.
- The small tools (Technical Lead Simulator, Dev Team Simulator) are close to your "battle" idea. They are tiny.
- `Opinion`: This is a real gap. It also means there is little proof that a "tech lead game" works. You are the test.

---

## 2. The apps

How to read the columns: "Daily return" means what pulls the user back each day. "Not stated" means the page I fetched did not say.

### 2a. Developer learning apps

| App | For whom, level | Game mechanics | Daily return | Price model | Users (primary source) |
|---|---|---|---|---|---|
| [Boot.dev](https://www.boot.dev/) | Beginner to "job-ready". Careers: Backend, DevOps, Data Analyst. Most students need about 12 months for a path. | XP, leaderboard, guilds, lore, AI mentor "Boots", community boss battles, shop, chests | Weekly streak, "Frozen Flame" item to save a streak, boss events every 4 to 8 weeks | Free first chapters, then paid membership. Page shows VND with a 73% PPP discount. USD price not seen. | 1,408,125 students (home page) |
| [Codédex](https://www.codedex.io/) | Beginners, "kids and adults". Python, HTML, CSS, JavaScript. | Fantasy land, XP to unlock regions, badges (own meta description) | Not stated on its own pages | Not stated. A paid "Club" is named by a review site `(not verified)` | `(not verified)`. A 1 million claim appears on Product Hunt, which I did not fetch. |
| [Exercism](https://exercism.org/about) | Any level, 85 languages. Beginners are sent to a separate app, Jiki. | Not stated. Focus is mentoring and automated analysis. | Not stated | Free ("100% free, forever") | No total. Per track: Python 843,432 students ([home](https://exercism.org/)). |
| [Codewars](https://www.codewars.com/about) | Developers who like puzzles. Challenges ("kata") rank from beginner to expert. | Kyu and dan ranks, honor, global leaderboards, clans, kumite (remix others' code) | Not stated | Not stated | 75K+ new members a month, 1M+ kata a month ([home](https://www.codewars.com/)). No total. |
| LeetCode | Interview prep | Daily challenge, streaks, badges `(not verified)` | `(not verified)` | `(not verified)` | `(not verified)`. The site blocked my fetch (HTTP 403). |
| [CodinGame](https://www.codingame.com/start) | Developers. The page now says "the arena for engineering agents". | Bot battles, leagues (Bronze, Silver), leaderboards, code golf | "There is always another strategy to try" | Not stated | Not stated |
| [CodeCombat](https://codecombat.com/about) | Students and teachers | You type real code to play the game | Not stated | Not stated | 20,000,000+ total players |
| [Sololearn](https://apps.apple.com/us/app/sololearn-learn-to-code/id1210079064) | Learn to code on a phone, 4 career tracks | Listing names "interactive coding games" and an AI tutor. It does not name XP or streaks. | Not stated | Free plus Pro. Monthly $6.99 or $12.99. Prices on the listing do not match each other. | 35 million learners (App Store listing) |
| [Mimo](https://mimo.org/) | "Beginner friendly" career paths | Reviews call it "a fully gamified experience". The page does not name streak or XP. | Not stated | Free start. Paid tiers named by a reviewer. No prices. | 35M+ learners (own page) |
| [TryHackMe](https://tryhackme.com/about) | Security, "complete beginner to seasoned hacker" | "Gamified, hands-on" labs, King of the Hill | Not stated | Hundreds of labs free. Paid plans exist. No prices on the page. | 8,000,000 total users |
| [Hack The Box](https://www.hackthebox.com/about-us) | Individuals, companies, governments. Security. | "Gamified security competitions", CTFs | Not stated | Not stated | "5m" platform members. The same page also says "over 4 million", so it is inconsistent. |
| [Educative](https://www.educative.io/) | Working developers. No formal levels on the page. | Daily coding challenge with leaderboard. No streaks named. | Daily challenge | Free trial, then paid. No prices on the page. | 3.1 million developers |
| [ByteByteGo](https://bytebytego.com/) | Interview prep, system design | None named | Newsletter | Paid courses, bundle. No prices on the page. | 5 million people |
| [Codemia](https://codemia.io) | System design practice | Leaderboard, 15+ badges, streak, spaced repetition, flashcards | Dashboard shows streak and reviews due | Some free, "Premium" paid. No prices on the page. | No exact number |

### 2b. Not developer-only, but the mechanics matter

| App | For whom, level | Game mechanics | Daily return | Price model | Users (primary source) |
|---|---|---|---|---|---|
| Duolingo (mechanics only; see [S-1](https://www.sec.gov/Archives/edgar/data/1562088/000162828021013065/duolingos-1.htm)) | Language learners, all levels | XP, streaks, streak freeze, gems, weekly leagues (cohorts of 30, top 10 move up), hearts, stories | Streak, leagues, reminders (push and email) | Free plus paid subscription. Current plan name and price not checked. | Q2 2026: 58.7M DAU, 140.6M MAU, 12.7M paid subscribers ([SEC letter](https://www.sec.gov/Archives/edgar/data/0001562088/000162828026053299/q2fy26duolingo6-30x26share.htm)) |
| [Brilliant](https://brilliant.org/about/) | Grade 5 to college and beyond, STEM | Its own page names "Streaks and Leagues". It says it avoids "packing too many game incentives". | Streaks and leagues as "habit loops" | Individual plan, no price on the page. Free for individual classrooms. | "10 million+" learners ([home](https://brilliant.org/)) |
| [Anki](https://apps.ankiweb.net/) | Anyone who memorizes | None. The study page names no streaks or points. | Cards due each day, shown by the scheduler | Free on desktop and Android. Paid on iOS. | Not stated |
| [Habitica](https://github.com/HabitRPG/habitica) | Anyone who wants habits | Life as a game. Completing tasks gives rewards. Failing costs health points. | Daily tasks | Free ([home](https://habitica.com/)) | `(not verified)`. GitHub shows 14.2k stars, which are not users. |

Notes:

- Anki: its [study page](https://docs.ankiweb.net/studying.html) says Anki adds a little "fuzz" so cards do not all fall due on one day. It also shows the oldest due cards first when you are behind.
- Habitica: the repo says public code contributions are paused as of 4 August 2026. The app still runs. `(Status of the live app: I only saw the home page title and meta description.)`

---

## 3. Evidence: what increases daily learning

I rate each piece of evidence:

- **Experiment** = the group was split by chance, or A/B tested.
- **Company claim** = the company reports it. No sample size or method is shown.
- **Correlation** = two things go together. It does not prove one causes the other.

### 3a. For mechanics

| Claim | Type | Source |
|---|---|---|
| Duolingo's spaced repetition model (half-life regression) cut prediction error by 45%+ compared with baselines | Peer-reviewed paper | [Settles & Meeder 2016](https://aclanthology.org/P16-1174.pdf) |
| Same paper: a better version (HLR-lex) raised next-day return by 12.0% (any activity) in an A/B test of 3.3 million students. The paper says p < 0.001. | Experiment | [Settles & Meeder 2016](https://aclanthology.org/P16-1174.pdf), Table 4 |
| Spacing: the best gap between reviews grows as the time you need to remember grows | Meta-analysis (839 assessments) | [Cepeda et al. 2006](https://doi.org/10.1037/0033-2909.132.3.354) (abstract read through [OpenAlex](https://api.openalex.org/works/doi:10.1037/0033-2909.132.3.354)) |
| Testing beats re-reading after a delay of 2 days or 1 week, even though re-reading feels easier | Experiment | [Roediger & Karpicke 2006](https://doi.org/10.1111/j.1467-9280.2006.01693.x) (abstract read through [OpenAlex](https://api.openalex.org/works/doi:10.1111/j.1467-9280.2006.01693.x)) |
| Gamification gives small positive effects: cognitive g = .49, motivational g = .36, behavioral g = .25 | Meta-analysis | [Sailer & Homner 2020](https://doi.org/10.1007/s10648-019-09498-w) (abstract read through [OpenAlex](https://api.openalex.org/works/doi:10.1007/s10648-019-09498-w)) |
| Game fiction (a story) and competition mixed with collaboration helped behavior most | Meta-analysis | Same paper |
| Gamification works, but it depends on context and on the user | Literature review | [Hamari et al. 2014](https://doi.org/10.1109/hicss.2014.377) (abstract read through [OpenAlex](https://api.openalex.org/works/doi:10.1109/hicss.2014.377)) |
| Reminders chosen by a bandit algorithm raised daily active users by 0.5% and new-user retention by 2% | Experiment (company paper) | [Yancey & Settles 2020](https://research.duolingo.com/papers/yancey.kdd20.pdf) |
| Fresh reminder text works better than repeated text | Experiment (company paper) | Same paper |
| Weekly leaderboards raised average time spent learning by almost 20% | Company claim (SEC filing) | [Duolingo S-1, 2021](https://www.sec.gov/Archives/edgar/data/1562088/000162828021013065/duolingos-1.htm) |
| Leaderboards raised learning time by 17% and tripled highly engaged learners | Company claim (former CPO, guest post) | [Mazal 2023](https://lennysnewsletter.com/p/how-duolingo-reignited-user-growth) |
| Next-day return of current users is 84%, "an all-time high" | Company claim | [Duolingo Q2 2026 letter](https://www.sec.gov/Archives/edgar/data/0001562088/000162828026053299/q2fy26duolingo6-30x26share.htm) |
| Duolingo says it "tests hundreds of changes" and keeps what works | Company claim | Same letter |

### 3b. Against mechanics, or showing limits

| Claim | Type | Source |
|---|---|---|
| In the first Duolingo test, the better spaced-repetition model cut practice sessions by 7.3% (significant). Users had practised "just to keep the tree gold". | Experiment | [Settles & Meeder 2016](https://aclanthology.org/P16-1174.pdf), Section 4.3 |
| Gamification effect fell after about 4 weeks, for 2 to 6 weeks, in a 14-week study of 756 programming students. The pattern was U-shaped. | Quasi-experiment | [Rodrigues et al. 2022](https://doi.org/10.1186/s41239-021-00314-6) (abstract read through [OpenAlex](https://api.openalex.org/works/doi:10.1186/s41239-021-00314-6)) |
| Motivational and behavioral effects were "less stable" in the high-quality studies. Only the cognitive effect stayed stable. | Meta-analysis | [Sailer & Homner 2020](https://doi.org/10.1007/s10648-019-09498-w) |
| In a 4-week field test, gamification did not change intrinsic motivation. It did raise step counts. | Experiment | [Grech et al. 2023](https://doi.org/10.1016/j.ijhcs.2023.103205) (abstract read through [OpenAlex](https://api.openalex.org/works/doi:10.1016/j.ijhcs.2023.103205)) |
| Expected tangible rewards reduced intrinsic motivation (d = -0.28 to -0.40) in 128 studies. Positive feedback raised it (d = 0.31 to 0.33). | Meta-analysis | [Deci, Koestner & Ryan 1999](https://pubmed.ncbi.nlm.nih.gov/10589297/) (abstract read through [Europe PMC](https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=EXT_ID:10589297%20AND%20SRC:MED&format=json&resultType=core)) |
| A classroom with badges and leaderboards had less motivation, satisfaction, and empowerment over time | Study `(not verified)`: the publisher blocked me. I only saw a machine summary. | [Hanus & Fox 2015](https://doi.org/10.1016/j.compedu.2014.08.019) |
| Boot.dev made boss battles "less competition and more collaboration" | Company choice | [Boot.dev Beat, March 2024](https://www.boot.dev/blog/news/bootdev-beat-2024-03) |
| Duolingo says its own link between a 10-day streak and less drop-off is "partly correlation and selection bias" | Company statement | [Mazal 2023](https://lennysnewsletter.com/p/how-duolingo-reignited-user-growth) |

Notes on 3b:

- The Deci study is about rewards such as money or prizes. It is not about badges or XP. `Opinion`: the link is unclear, but it is a warning.
- Hanus & Fox: the title is confirmed. The result line comes from an automatic summary on Semantic Scholar, so treat it as `(not verified)`.

---

## 4. Streaks: fair summary

You chose no streaks. This section only reports.

### 4a. Evidence for streaks

| Claim | Type | Source |
|---|---|---|
| Learners who reach a 7-day streak are 3.6 times more likely to finish the course | Correlation (company blog) | [Duolingo blog, 2022](https://blog.duolingo.com/how-duolingo-streak-builds-habit) |
| Letting learners hold up to 2 Streak Freezes raised daily active learners by +0.38% | Experiment (company blog, no sample size) | Same post |
| A new animation after a streak raised the chance a new learner is still active 7 days later by +1.7% | Experiment (company blog, no sample size) | Same post |
| More than 50% of daily users have a streak longer than 7 days. About 1 million have one longer than 365 days. | Company claim (SEC filing, 2021) | [Duolingo S-1](https://www.sec.gov/Archives/edgar/data/1562088/000162828021013065/duolingos-1.htm) |
| In June 2026 a one-time event let learners restore their longest streak. 15.4 million did. Nearly 8 million had no active streak before. | Company claim. Not a controlled test. | [Q2 2026 letter](https://www.sec.gov/Archives/edgar/data/0001562088/000162828026053299/q2fy26duolingo6-30x26share.htm) |
| Highlighting streaks in messages to 60,000 Peruvian students raised use of an online math platform. Math scores rose versus the control group, among the 1,500 students who took the end test. Differences from the other message types were not significant. | Randomized experiment (working paper) | [Aulagnon et al., NBER w34173, 2025](https://www.nber.org/papers/w34173) |
| Duolingo's team ran "over 600 streak-related experiments". Letting users pick their streak goal "significantly increased retention". | Company staff, in a podcast | [Lenny's Podcast, Dec 2024](https://www.lennysnewsletter.com/p/behind-the-product-duolingo-streaks) |

### 4b. Evidence that softens or questions streaks

| Claim | Type | Source |
|---|---|---|
| In a 12-week habit study of 96 volunteers, missing one opportunity "did not materially affect the habit formation process" | Peer-reviewed study | [Lally et al. 2010](https://doi.org/10.1002/ejsp.674) (abstract read through [Crossref](https://api.crossref.org/works/10.1002/ejsp.674)) |
| Same study: it took 18 to 254 days to reach 95% of the habit's final strength. "It can take a very long time." | Same study | Same paper |
| Boot.dev uses weekly streaks. They reset if you miss a week, so it sells a "Frozen Flame" item that saves one. | Company design choice | [Boot.dev Beat, March 2024](https://www.boot.dev/blog/news/bootdev-beat-2024-03) |
| Duolingo first tied streaks to XP. This "confused users". It simplified to one lesson a day. | Company staff, in a podcast | [Lenny's Podcast](https://www.lennysnewsletter.com/p/behind-the-product-duolingo-streaks) |
| Streak data is mostly correlation. Strong users keep streaks, so streaks may not cause the habit. | Company statement | [Mazal 2023](https://lennysnewsletter.com/p/how-duolingo-reignited-user-growth) |

### 4c. What I did not find

- I found no peer-reviewed experiment on "streak anxiety" or on losing a streak. `(not verified)`
- Only small student theses and surveys came up in search. I did not read them, so I do not cite them.
- All streak tests I found measure use of the app. Only the Peru study also measures learning, and only for a subset.
- No streak study I found is about adults learning professional skills.

### 4d. Short reading

- `Opinion`: Streaks reliably raise how often people open the app. The proof is strongest in company data and in one Peru experiment.
- `Opinion`: Your 30-day learning rate, "never miss twice", and comeback screen keep the same information. They remove the "chain breaks" frame.
- `Opinion`: The Peru result is about highlighting past effort. Showing the 30-day rate each day does the same job without a chain.
- `Opinion`: Lally supports your rule. One missed day does not harm the habit.

---

## 5. Map to our design

Legend for "Already in our design?": yes, no, or "we chose the opposite".

| Mechanic | Who uses it | Evidence (URL) | Already in our design? | Suggestion |
|---|---|---|---|---|
| Daily streak counter | Duolingo, Brilliant, Codemia, Boot.dev (weekly) | [Duolingo blog](https://blog.duolingo.com/how-duolingo-streak-builds-habit), [NBER w34173](https://www.nber.org/papers/w34173) | We chose the opposite | Skip. Test later: show "days learned this week" without a chain. |
| Show consistency every session | Duolingo | [NBER w34173](https://www.nber.org/papers/w34173) | Partly (30-day learning rate) | Add: show the 30-day rate on the home screen and after each session. |
| Safety net for a missed day (freeze, revive) | Duolingo, Boot.dev | [Duolingo blog](https://blog.duolingo.com/how-duolingo-streak-builds-habit), [Beat 2024-03](https://www.boot.dev/blog/news/bootdev-beat-2024-03) | Yes (never miss twice, comeback) | Keep. |
| One-click comeback event | Duolingo (June 2026) | [Q2 2026 letter](https://www.sec.gov/Archives/edgar/data/0001562088/000162828026053299/q2fy26duolingo6-30x26share.htm) | Yes (no-blame comeback screen) | Keep. Make it one tap, and small (for example 3 minutes). |
| Spaced repetition 1, 3, 7, 14, 30, 90 days | Duolingo, Anki, Codemia | [Settles & Meeder](https://aclanthology.org/P16-1174.pdf), [Cepeda](https://doi.org/10.1037/0033-2909.132.3.354) | Yes | Keep. Test: log each recall grade so intervals can be tuned after 3 months. |
| Max 8 reviews a day | Anki queues new cards and reviews separately. It gave no daily number on the page I read. | [Anki docs](https://docs.ankiweb.net/studying.html) | Yes | Keep. Anki shows the cards that waited longest first when you are behind. Copy that order. |
| Write from memory (battle) | Educative, Codemia (AI feedback) | [Roediger & Karpicke](https://doi.org/10.1111/j.1467-9280.2006.01693.x) | Yes | Keep. Test: AI asks one follow-up question, like Boot.dev "Boots". |
| Story and game world | Codédex, Boot.dev, CodeCombat | [Sailer & Homner](https://doi.org/10.1007/s10648-019-09498-w) | Yes (Pokémon world) | Keep. |
| XP and levels | Duolingo, Codédex, Boot.dev | [Duolingo S-1](https://www.sec.gov/Archives/edgar/data/1562088/000162828021013065/duolingos-1.htm) | No (badges, Pokédex, win rate) | Test: only if XP shows progress. Do not use XP as a shop currency. |
| Weekly leaderboard or league | Duolingo, Brilliant, Codewars, CodinGame | [Duolingo S-1](https://www.sec.gov/Archives/edgar/data/1562088/000162828021013065/duolingos-1.htm), [Duolingo leagues](https://blog.duolingo.com/duolingo-leagues-leaderboards/) | No | Skip. You are one user. Compare with your own last 4 weeks instead. |
| Community boss event | Boot.dev | [Beat 2024-04](https://www.boot.dev/blog/news/bootdev-beat-2024-04) | Partly (solo boss on weekends) | Keep solo. Boot.dev dropped competition and kept the shared goal. |
| Smart reminders, varied text | Duolingo | [Yancey & Settles](https://research.duolingo.com/papers/yancey.kdd20.pdf) | Not listed | Test: 2 or 3 message styles, rotate them. Few reminders. Check iPhone web push support first. |
| "Commit to my goal" wording, user picks the goal | Duolingo | [Lenny's Podcast](https://www.lennysnewsletter.com/p/behind-the-product-duolingo-streaks) | Partly (3 / 15 / 45 minute days) | Test: ask "Today I commit to: 3, 15, or 45 minutes" at the start. |
| Heatmap calendar | Boot.dev | [Beat 2024-04](https://www.boot.dev/blog/news/bootdev-beat-2024-04) | Yes (calendar) | Keep. |
| Loss mechanic (HP loss when you miss) | Habitica | [Habitica repo](https://github.com/HabitRPG/habitica) | No | Skip. `Opinion`: your plans stopped when work got busy. Penalties add pressure at the worst time. |
| Loot, chests, currency | Boot.dev (chests), Duolingo (gems) | [Beat 2024-04](https://www.boot.dev/blog/news/bootdev-beat-2024-04), [Deci et al.](https://pubmed.ncbi.nlm.nih.gov/10589297/) | No | Skip or test late. Expected rewards can reduce interest. |
| Placement test | Not found in the apps I fetched | none | Yes | Keep. No external evidence found either way. |
| New mechanic each month | Boot.dev adds items and events over time | [Rodrigues et al.](https://doi.org/10.1186/s41239-021-00314-6), [Beat 2024-04](https://www.boot.dev/blog/news/bootdev-beat-2024-04) | Partly (new town each month) | Test: one small new twist per town, to fight the 4-week dip. |

---

## 6. Top 5 ideas to copy, top 3 traps

### Top 5 ideas to copy

1. **Real spaced repetition, plus writing from memory.** Duolingo's tuned model raised next-day return by 12.0%. Testing beat re-reading after a week. Source: [Settles & Meeder](https://aclanthology.org/P16-1174.pdf), [Roediger & Karpicke](https://doi.org/10.1111/j.1467-9280.2006.01693.x).
2. **A cheap way back.** Duolingo's one-time revival got 15.4 million learners to restore a streak. Your comeback screen is the same idea. Make it one tap. Source: [Q2 2026 letter](https://www.sec.gov/Archives/edgar/data/0001562088/000162828026053299/q2fy26duolingo6-30x26share.htm).
3. **Show effort back to the learner.** The Peru experiment used messages about streaks. You can send the 30-day rate in the same way. Source: [NBER w34173](https://www.nber.org/papers/w34173).
4. **Story plus shared goals, not rivalry.** Game fiction helped most. Boot.dev moved bosses to teamwork. Source: [Sailer & Homner](https://doi.org/10.1007/s10648-019-09498-w), [Beat 2024-03](https://www.boot.dev/blog/news/bootdev-beat-2024-03).
5. **Few reminders, with changing text, and a "commit" step.** Fresh text beat repeated text. Duolingo says "protect the channel". Letting users pick a goal raised retention. Source: [Yancey & Settles](https://research.duolingo.com/papers/yancey.kdd20.pdf), [Mazal 2023](https://lennysnewsletter.com/p/how-duolingo-reignited-user-growth), [Lenny's Podcast](https://www.lennysnewsletter.com/p/behind-the-product-duolingo-streaks).

### Top 3 traps

1. **A mechanic that rewards the wrong action.** Duolingo users practised "just to keep the tree gold". Real practice dropped 7.3%. For you: do not give points for opening the app or for easy reviews. Source: [Settles & Meeder](https://aclanthology.org/P16-1174.pdf), Section 4.3.
2. **The new-game effect fades.** In a 14-week study, the gamification effect fell after about 4 weeks. Plan a small change each month. Source: [Rodrigues et al.](https://doi.org/10.1186/s41239-021-00314-6).
3. **Prizes and competition can lower interest.** Expected tangible rewards reduced intrinsic motivation across 128 studies. Source: [Deci et al.](https://pubmed.ncbi.nlm.nih.gov/10589297/). A classroom study also found lower motivation with badges and a leaderboard `(not verified)`: [Hanus & Fox](https://doi.org/10.1016/j.compedu.2014.08.019).

---

## 7. Opinion: what challenges the "no streak" decision

- `Opinion`: The best evidence says visible consistency helps. It does not say a chain with a loss threat is the cause.
- `Opinion`: The risk of "no streak" is not zero. You may lose the daily pull. Your 30-day rate must be visible every day to replace it.
- `Opinion`: Your 13 stopped plans fit the data. Lally shows habits take 18 to 254 days. Your first 8 weeks are the risk zone.
- `Opinion`: A fair test: run 4 weeks with the 30-day rate only. If you open the app fewer than 5 days a week, try "days learned this week" next.

---

## Not verified

- **LeetCode:** The site blocked my fetch (HTTP 403). Mechanics, price, and user numbers are not checked. A search summary mentioned a monthly consistency badge and "Time Travel Tickets". I could not open that page.
- **Codédex:** Only the page title and meta description loaded. Streaks, price, and user numbers are not checked. A 1 million learner claim appears on Product Hunt (not fetched).
- **Habitica:** Live user numbers are not checked. Pages did not load fully.
- **Hanus & Fox 2015:** The publisher blocked me. I could not read the abstract. The result line comes from an automatic summary.
- **Peru streak study (IDB version):** The IDB PDF was blocked. I used the NBER page, which I fetched.
- **Brilliant, Sololearn, Mimo in-app streaks:** Their public pages do not describe the full in-app rules. Only what their pages state is listed.
- **Exact current Duolingo price and plan names:** Not checked. The 2021 filing says "Duolingo Plus".
- **Duolingo streak anxiety:** I found no peer-reviewed experiment. Search results showed small theses and surveys. I did not open them.
- **Duolingo experiments with no sample size:** The streak freeze (+0.38%) and animation (+1.7%) results come from a blog post without sample sizes or methods.
- **"Making streaks easier did not raise DAU":** A search summary claimed this. The podcast page I fetched does not say it. Do not rely on it.
- **Evidence for session sizes (3 / 15 / 45 minutes) and for a 90-day review step:** I found no primary source that tests these. Not checked.
- **Papers read through aggregator abstracts:** Cepeda, Roediger, Sailer, Hamari, Rodrigues, Grech, Deci, and Lally. I read abstracts through OpenAlex, Crossref, or Europe PMC. I did not read the full papers.
- **Duolingo Q2 2026 letter:** Read through a page summarizer. Numbers are as it returned them.

## Sources

Apps and company pages

- Boot.dev: [home](https://www.boot.dev/), [pricing](https://www.boot.dev/pricing), [Beat March 2024](https://www.boot.dev/blog/news/bootdev-beat-2024-03), [Beat April 2024](https://www.boot.dev/blog/news/bootdev-beat-2024-04)
- Codédex: [home](https://www.codedex.io/)
- Brilliant: [home](https://brilliant.org/), [about](https://brilliant.org/about/)
- Exercism: [about](https://exercism.org/about), [home](https://exercism.org/)
- Codewars: [about](https://www.codewars.com/about), [home](https://www.codewars.com/)
- CodinGame: [start](https://www.codingame.com/start)
- CodeCombat: [about](https://codecombat.com/about)
- Sololearn: [App Store listing](https://apps.apple.com/us/app/sololearn-learn-to-code/id1210079064)
- Mimo: [home](https://mimo.org/)
- TryHackMe: [about](https://tryhackme.com/about)
- Hack The Box: [about](https://www.hackthebox.com/about-us)
- Anki: [home](https://apps.ankiweb.net/), [study docs](https://docs.ankiweb.net/studying.html)
- Habitica: [home](https://habitica.com/), [GitHub](https://github.com/HabitRPG/habitica)
- ByteByteGo: [home](https://bytebytego.com/)
- Educative: [home](https://www.educative.io/)
- Codemia: [home](https://codemia.io)
- Technical Lead Simulator: [Product Hunt](https://www.producthunt.com/products/technical-lead-simulator)
- Dev Team Simulator: [article](https://www.kern-it.be/en/blog/managing-dev-teams-a-free-serious-game-to-train-project-leads/)
- ArchSim: [App Store](https://apps.apple.com/us/app/id6756310915)

Duolingo

- [Blog: how Duolingo streak builds habit (2022-01-31)](https://blog.duolingo.com/how-duolingo-streak-builds-habit)
- [Blog: leagues and leaderboards](https://blog.duolingo.com/duolingo-leagues-leaderboards/)
- [Q2 2026 shareholder letter (SEC)](https://www.sec.gov/Archives/edgar/data/0001562088/000162828026053299/q2fy26duolingo6-30x26share.htm)
- [Form S-1, 2021 (SEC)](https://www.sec.gov/Archives/edgar/data/1562088/000162828021013065/duolingos-1.htm)
- [Duolingo Research page](https://research.duolingo.com/)
- [Settles & Meeder 2016, ACL (PDF)](https://aclanthology.org/P16-1174.pdf)
- [Yancey & Settles 2020, KDD (PDF)](https://research.duolingo.com/papers/yancey.kdd20.pdf)
- [Mazal 2023, Lenny's Newsletter (company guest post)](https://lennysnewsletter.com/p/how-duolingo-reignited-user-growth)
- [Lenny's Podcast: Behind the product, Duolingo streaks (Dec 2024)](https://www.lennysnewsletter.com/p/behind-the-product-duolingo-streaks)

Papers

- [Aulagnon, Cristia, Cueto, Malamud 2025, NBER w34173](https://www.nber.org/papers/w34173)
- [Sailer & Homner 2020, Educational Psychology Review](https://doi.org/10.1007/s10648-019-09498-w)
- [Hamari, Koivisto, Sarsa 2014, HICSS](https://doi.org/10.1109/hicss.2014.377)
- [Rodrigues, Pereira, Toda 2022](https://doi.org/10.1186/s41239-021-00314-6)
- [Grech, Briguglio, Said 2023](https://doi.org/10.1016/j.ijhcs.2023.103205)
- [Deci, Koestner, Ryan 1999](https://pubmed.ncbi.nlm.nih.gov/10589297/)
- [Hanus & Fox 2015](https://doi.org/10.1016/j.compedu.2014.08.019) (abstract not read)
- [Lally et al. 2010](https://doi.org/10.1002/ejsp.674)
- [Cepeda et al. 2006](https://doi.org/10.1037/0033-2909.132.3.354)
- [Roediger & Karpicke 2006](https://doi.org/10.1111/j.1467-9280.2006.01693.x)
- [Decision Pathways, ECGBL 2025](https://papers.academic-conferences.org/index.php/ecgbl/article/view/4041)

Abstract readers used (metadata services)

- [OpenAlex API](https://api.openalex.org/), [Crossref API](https://api.crossref.org/works/10.1002/ejsp.674), [Europe PMC API](https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=EXT_ID:10589297%20AND%20SRC:MED&format=json&resultType=core)
