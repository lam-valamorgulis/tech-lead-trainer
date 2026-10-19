# Learning science for Tech Lead Trainer: what the evidence says

Research date: 2026-10-19. I read each source at the level shown in the Sources list. I did not cite anything I could not open.

## Tóm tắt

- Hai kỹ thuật mạnh nhất là tự nhớ lại (retrieval practice) và ôn cách quãng (spacing). Thiết kế của bạn đã có cả hai.
- Lịch cố định 1→3→7→14→30→90 ngày là hợp lý cho năm đầu. Chưa cần FSRS, nhưng hãy ghi lại từng lần ôn với 4 mức (Again/Hard/Good/Easy) để đổi được sau 3 tháng.
- Có hai điểm cần sửa. Ôn bằng trắc nghiệm yếu hơn tự nhớ lại. Trận đấu HP 3 thắng được 63% khi đoán mò (tôi tự tính).
- Nút "Discuss in Claude" nên bắt Claude hỏi lại, không đưa đáp án. Nghiên cứu của Anthropic (n=52) cho thấy làm hộ bằng AI giảm điểm hiểu bài: 50% so với 67%.
- Không có bằng chứng trực tiếp rằng app kiểu này giúp bạn thành tech lead. Nó dạy kiến thức và cách lập luận. Dự án thật mới dạy phần còn lại.

## How I checked

- I read the full text of these: Dunlosky 2013, Wilson 2019, Bastani 2025, the Anthropic study page, the HLR paper, the FSRS wiki and the Anki manual.
- For most journal papers, I read the abstract only. The Sources list marks each one: `full`, `abstract only`, or `record only`.
- `record only` means I confirmed the paper exists (title, journal, DOI) but did not read its abstract. I use these only for the existence of a paper, never for a number.
- I read abstracts through Europe PMC, OpenAlex and Crossref. I did not open every publisher page.
- Reasoning that is mine is marked `Opinion`. Calculations that I ran myself are marked `My calculation`.
- Effect sizes: `g` and `d` are standard units. About 0.2 is small, 0.5 is medium, 0.8 is large. Lab results are often larger than real-life results.

---

## 1. Learning techniques and how strong the evidence is

Column "In design?" compares each technique with `design-v1.1.md`.

| Technique | What it is | Evidence type | Effect size (if the source gives one) | Source | In design? |
|---|---|---|---|---|---|
| Retrieval practice (testing effect) | Recall from memory instead of re-reading | Meta-analyses, lab, classroom | g = 0.50 vs restudy (CI 0.42 to 0.58). Published studies g = 0.58, unpublished g = 0.25. Dunlosky: high utility. Adesope 2017 gives no number in its abstract | [Rowland 2014](https://doi.org/10.1037/a0037559), [Adesope 2017](https://doi.org/10.3102/0034654316689306), [Dunlosky 2013](https://doi.org/10.1177/1529100612453266) | Yes for battles. Partly for reviews: "multiple choice or self-check" is weaker than recall |
| Recall beats recognition | Writing or saying the answer works better than picking from a list | Meta-analysis | Rowland: initial recall tests gave larger benefits than recognition tests | [Rowland 2014](https://doi.org/10.1037/a0037559) | Partly. Reviews may be multiple choice |
| Testing with feedback | Show the correct answer after the test | Review of many studies | Dunlosky: testing with feedback beats restudy "extremely robustly". Testing alone sometimes fails when accuracy is low | [Dunlosky 2013](https://doi.org/10.1177/1529100612453266) | Yes. Model answer always shows |
| Spacing (distributed practice) | Spread study over time | Meta-analysis of 839 assessments in 317 experiments | Best gap grows with the time you must remember. Dunlosky: high utility | [Cepeda 2006](https://doi.org/10.1037/0033-2909.132.3.354) | Yes |
| Best gap size | How long to wait between reviews | Large web experiment (1,350+ people) | Best gap was 20 to 40% of a 1-week delay, and 5 to 10% of a 1-year delay | [Cepeda 2008](https://doi.org/10.1111/j.1467-9280.2008.02209.x) | Yes. Steps grow over time |
| Successive relearning | Recall to a goal, then recall again in several spaced sessions | 3 lab experiments, 533 students | No number in abstract. Advice: 3 correct recalls first, then relearn 3 times, widely spaced | [Rawson & Dunlosky 2011](https://doi.org/10.1037/a0023956) | Yes. Fixed steps work like this. Catch uses a goal of 1 correct recall |
| Expanding vs equal gaps | Do gaps need to grow? | 3 lab experiments | Expanding gaps helped after 10 minutes. Equal gaps were better after 2 days. Delaying the first test is what helped | [Karpicke & Roediger 2007](https://doi.org/10.1037/0278-7393.33.4.704) | Neutral. Our steps grow, and that is fine |
| Interleaving | Mix different problem types in one session | Meta-analysis of 59 studies. Also a cluster RCT | g = 0.42 overall. Words: g = -0.39 (blocking better). Math RCT: 61% vs 38%, d = 0.83 | [Brunmair & Richter 2019](https://doi.org/10.1037/bul0000209), [Rohrer et al. 2020](https://doi.org/10.1037/edu0000367) | Partly. Battles mix types. Reviews are not mixed on purpose |
| Elaborative interrogation | Ask yourself "why is this true?" | Lab studies. Dunlosky: moderate utility | None given. Weaker for people with low prior knowledge | [Dunlosky 2013](https://doi.org/10.1177/1529100612453266) | Partly. The "why" box is similar |
| Self-explanation | Explain the steps or the meaning to yourself | Meta-analysis, 69 effect sizes from 64 reports | g = 0.55 | [Bisra et al. 2018](https://doi.org/10.1007/s10648-018-9434-x) | Yes. Writing the "why" |
| Generation effect | Producing an answer beats reading it | Meta-analysis, 86 studies | g = 0.40 | [Bertsch et al. 2007](https://doi.org/10.3758/bf03193441) | Yes. Write before the result |
| Pretesting | Try to answer before you learn the topic | Lab experiments | No number in abstracts. Pretesting gave scores as high as, or higher than, posttesting after 48 hours | [Richland et al. 2009](https://doi.org/10.1037/a0016496), [Kornell et al. 2009](https://doi.org/10.1037/a0015729), [Pan & Sana 2021](https://doi.org/10.1037/xap0000345) | Partly. Only the placement test |
| Hypercorrection | Confident wrong answers are corrected best after feedback | Lab study | No number in abstract | [Butterfield & Metcalfe 2001](https://doi.org/10.1037/0278-7393.27.6.1491) | No. There is no confidence rating |
| Worked examples and cognitive load | Novices learn better by studying solved examples than by solving alone | Theory plus experiments | None in abstracts | [Sweller 1988](https://doi.org/10.1207/s15516709cog1202_4), [Atkinson et al. 2000](https://doi.org/10.2307/1170661) | Partly. The model answer comes after the battle, not before |
| Expertise reversal | Help that works for novices can hurt experts | Review of experiments | None in abstract | [Kalyuga et al. 2003](https://doi.org/10.1207/s15326985ep3801_4) | Yes. The placement test finds what you know |
| Concrete examples | Real examples help abstract ideas | Review of worked-example research | Advice: several examples, in different formats | [Atkinson et al. 2000](https://doi.org/10.2307/1170661) | Partly. One example per card. Battles add more |
| Dual coding (words plus pictures) | Pictures that carry the idea help learning from text | Dunlosky rates "imagery use for text" low. A pictures-and-text review exists, but I read only its record | Not available | [Dunlosky 2013](https://doi.org/10.1177/1529100612453266), [Carney & Levin 2002](https://doi.org/10.1023/a:1013176309260) (record only) | Partly. Pixel creatures decorate. Mermaid diagrams carry meaning |
| Feedback timing | Show feedback now or later | Meta-analysis of 53 studies | Mixed. Classroom quizzes: immediate was usually better. Lab studies: often delayed was better | [Kulik & Kulik 1988](https://doi.org/10.2307/1170349), [Butler & Roediger 2008](https://doi.org/10.3758/mc.36.3.604) | Yes. Both timings beat no feedback |
| Desirable difficulties | Some hard practice slows you down now and helps later | Theory and review | Not available | [Bjork & Bjork 2020](https://doi.org/10.1016/j.jarmac.2020.09.003) (record only) | Yes. Write before you see |
| Writing to learn | Write about the topic | Meta-analysis, 48 programs | Small positive effect. Metacognitive prompts and longer programs helped more | [Bangert-Drowns et al. 2004](https://doi.org/10.3102/00346543074001029) | Yes. "Why" box, weekend ADR |
| Re-reading | Read the same text again | Dunlosky: low utility | Not available | [Dunlosky 2013](https://doi.org/10.1177/1529100612453266) | We risk it: the 45-minute day has "read deeper into sources" |
| Highlighting | Mark text while reading | Dunlosky: low utility. May hurt inference tasks | Not available | [Dunlosky 2013](https://doi.org/10.1177/1529100612453266) | No. Good |
| Learning styles | Teach in your "preferred" style | Review of the evidence | Authors found virtually no evidence for the needed interaction | [Pashler et al. 2008](https://doi.org/10.1111/j.1539-6053.2009.01038.x) | No. Good |

Notes:

- Dunlosky 2013 rates practice testing and distributed practice as high utility. It rates elaborative interrogation, self-explanation and interleaving as moderate. It rates five techniques as low: summarization, highlighting, keyword mnemonic, imagery for text, and rereading.
- Evidence against retrieval practice: Rowland found published studies (g = 0.58) larger than unpublished ones (g = 0.25). Some publication bias is likely. Pan & Rickard found that transfer to new tasks can be near zero without helping conditions (see section 6).
- Roediger & Karpicke 2006: after 5 minutes, restudying gave better recall. After 2 days and 1 week, testing gave much better recall. Restudy also made students feel more sure. See [Roediger & Karpicke 2006](https://doi.org/10.1111/j.1467-9280.2006.01693.x) (abstract only).
- Dunlosky: practice tests take little time and little training.

---

## 2. Spaced repetition scheduling

### What each scheduler is

| | Fixed steps (ours) | FSRS | Half-life regression (HLR, Duolingo) |
|---|---|---|---|
| Idea | Pass a review, go to the next fixed gap. Wrong: back one step | A model tracks three values per card: difficulty, stability, retrievability. It picks the gap that gives a chosen recall chance | A model predicts the "half-life" of each word from its history. It sets review time from that |
| Needs data? | No | No for default settings. The optimizer needs review history | Yes, trained on many learners |
| Target retention | None set. My calculation below: about 94 to 96% | Default 90%. Reasonable range 70 to 97% | No target in the parts I read. Mean recall in its data was 0.859 |
| Evidence | Spacing and relearning studies (section 1) | Benchmark by its own team on about 10,000 Anki users (349.9 million reviews used for evaluation). Paper: [Ye et al. 2022](https://doi.org/10.1145/3534678.3539081) | [Settles & Meeder 2016](https://aclanthology.org/P16-1174/): error down 45%+ vs baselines at predicting recall |
| Main weakness | Same gaps for easy and hard cards | Built for flashcards with grades. Not tested on "concept plus scenario" cards | Overfitting problems appeared in Duolingo's own live test |

### Facts to know

- In the HLR paper, the Leitner method had the highest AUC on Duolingo data. Leitner is a fixed-box method like ours. The top HLR variants were "not far behind".
- Duolingo's live test, HLR vs Leitner: overall activity and new lessons rose slightly (+0.3%, not marked significant). Practice sessions fell significantly. The +12% daily engagement figure is for a later test (HLR-lex vs HLR). Source: [Settles & Meeder 2016 PDF](https://aclanthology.org/P16-1174.pdf).
- On the FSRS team's benchmark, lower log loss is better. FSRS-6 scores 0.3460. HLR scores 0.4694. The team ran this test itself. Source: [srs-benchmark](https://github.com/open-spaced-repetition/srs-benchmark).
- FSRS claims 20 to 30% fewer reviews than SM-2 at the same retention. The wiki says this comes from simulation. SM-2 is not a fixed-box method like ours. Source: [ABC of FSRS](https://github.com/open-spaced-repetition/awesome-fsrs/wiki/ABC-of-FSRS).
- Anki manual: workload grows very quickly above 90% retention. Above 97% it can be overwhelming. Source: [Anki deck options](https://docs.ankiweb.net/deck-options.html).
- Anki manual: FSRS may perform badly with "less than a few hundred" reviews. Same source.
- Personalized review had real classroom evidence: +16.5% course retention vs massed study, and +10.0% vs one-size-fits-all spaced study. One middle-school Spanish course, one semester. Source: [Lindsey et al. 2014](https://doi.org/10.1177/0956797613504302).
- A TypeScript FSRS library, `ts-fsrs`, is listed in the [FSRS README](https://github.com/open-spaced-repetition/free-spaced-repetition-scheduler). I did not open its repository.

### Is our fixed schedule reasonable for year one?

Yes. `Opinion`, based on these facts:

1. Cepeda 2008: for a 1-year goal, the best gap was 5 to 10% of a year (18 to 36 days). Your 30-day step is in that range.
2. Karpicke & Roediger 2007: growing gaps do not matter much for long-term memory. A delayed first retrieval matters more. Your first gap is 1 day.
3. Rawson & Dunlosky 2011: about 3 spaced relearnings were enough for tests 1 to 4 months later. You plan 6.
4. Rawson & Dunlosky also found that the first learning goal matters less as relearning grows. A catch goal of 1 correct recall is fine.

`My calculation` (FSRS-6 default numbers from the [wiki](https://github.com/open-spaced-repetition/awesome-fsrs/wiki/The-Algorithm); I coded the formulas myself; population defaults, not you):

| Check | Result |
|---|---|
| Predicted recall at each of your fixed gaps (1, 3, 7, 14, 30, 90 days between reviews) | 94% to 96% |
| Same, if your steps mean review days 1, 3, 7, 14, 30, 90 after the catch | 93% to 97% |
| FSRS gaps for a card answered Good every time, at 90% target | about 2, 11, 46, 163 days |
| Reviews in year one for such a card, at 90% target | 4 |

Meaning: your schedule is careful. It likely reviews more often than needed. Your time is the scarce thing, so this has a cost.

`My calculation` for load:

- If one review item is a creature (about 15 per month): about 3 reviews per day in steady state.
- If one review item is a move (about 45 per month): about 9 per day. Your cap is 8. A backlog will build, and wrong answers make it worse.
- The design does not say which one is a review item. Decide this before building.

### Recommendation for year one

1. Keep the fixed steps. This matches your own plan to check after 3 months.
2. Log every review now: time, item, step, and a 4-level grade (Again, Hard, Good, Easy). Cost is small. It makes a later switch cheap.
3. Add one cheap rule: if the user grades Easy, skip one step. `Opinion`. It cuts review time and uses the same table.
4. Add a late review near day 180 for items you need at the end of year (interview, final project). `Opinion`, based on Cepeda 2008.

### Trigger to switch to FSRS

Switch when any one is true. These numbers are `Opinion`.

| Trigger | Why |
|---|---|
| Review success at one step is below 80% or above 97%, with at least 100 reviews at that step | The step is too hard or too easy. Section 3 uses the same range |
| Review queue hits the cap of 8 on 10 or more days in 4 weeks | Fixed steps cost too much time. FSRS lets you choose a lower retention |
| You have at least 500 logged reviews | The Anki manual says "a few hundred" is the least. 500 gives margin |

When you switch, start with default parameters and a target retention of 0.85 to 0.90. Do not fit parameters until you have more data.

---

## 3. Difficulty and fun

### What the sources say

- Wilson et al. 2019 studied simple learning algorithms (binary classification, gradient descent). For these, the best training accuracy is about 85%. Source: [Wilson et al. 2019](https://doi.org/10.1038/s41467-019-12552-4) (full text).
- Limits the authors state: the result is for binary tasks and simple algorithms. It was shown with models, not with human experiments. The best accuracy changes with the noise type (82% for Laplacian noise, 75% for Cauchy noise). The authors list multi-category tasks as future work.
- The authors link the result to flow (challenge equals skill). They say it fits the "informal intuition" that tasks should be neither too easy nor too hard. This is a link, not a test.
- Self-determination theory: three needs, which are competence, autonomy and relatedness. When these are met, self-motivation grows. Source: [Ryan & Deci 2000](https://doi.org/10.1037/0003-066x.55.1.68).
- A meta-analysis of 128 studies found that rewards for doing an activity reduced intrinsic motivation (d = -0.40). Positive feedback raised it (d = 0.33). Source: [Deci, Koestner & Ryan 1999](https://doi.org/10.1037/0033-2909.125.6.627).
- Curiosity comes from a perceived gap in knowledge. Source: [Loewenstein 1994](https://doi.org/10.1037/0033-2909.116.1.75). In a brain-imaging study, memory was better for items people were curious about, also one day later. Source: [Gruber et al. 2014](https://doi.org/10.1016/j.neuron.2014.08.060).
- Gamification meta-analysis: small effects. Cognitive g = 0.49, motivational g = 0.36, behavioral g = 0.25. The motivational and behavioral effects were less stable in the strict studies. Source: [Sailer & Homner 2020](https://doi.org/10.1007/s10648-019-09498-w).
- Errors followed by feedback are not harmful. Unsuccessful attempts before feedback improved later learning. Sources: [Kornell et al. 2009](https://doi.org/10.1037/a0015729), [Richland et al. 2009](https://doi.org/10.1037/a0016496).

### Target success rates

| Activity | Target | Why | Label |
|---|---|---|---|
| Reviews (recall of caught items) | About 90% | FSRS and Anki default is 90%. Range 70 to 97% is "reasonable". Your fixed steps predict 94 to 96%, so reviews will feel easy | Sources: [ABC of FSRS](https://github.com/open-spaced-repetition/awesome-fsrs/wiki/ABC-of-FSRS), [Anki](https://docs.ankiweb.net/deck-options.html). Prediction is `My calculation` |
| Battle: best move per turn | 70 to 85% | Close to the 85% result, but humans in open tasks are not binary classifiers. Wrong moves with feedback still teach | `Opinion` using Wilson 2019 |
| Battle: win rate | 70 to 80% for a learner who knows the topic | See the calculation below | `My calculation` |
| Gym (win 4 of 5) | 80% pass line | Fits the range above. Keep "no lock when you lose" | `Opinion` |
| Placement test | No target. Low scores are normal | Pretesting helps even when answers are wrong, if feedback follows | Sources: Richland 2009, Kornell 2009 |

### A problem in the battle rules

`My calculation` with these assumptions: each turn offers 3 moves with damage 2, 1, 0. The learner picks the best move with chance `p`. Otherwise, the learner picks one of the other two at random. Each turn is independent. The fight lasts 3 turns.

| Chance of picking the best move | Win chance, HP 3 | Win chance, HP 4 | Win chance, HP 5 |
|---|---|---|---|
| 33% (pure guessing) | 63% | 37% | 15% |
| 50% | 80% | 59% | 31% |
| 70% | 93% | 83% | 56% |
| 90% | 99% | 98% | 85% |

Meaning:

- With HP 3, a player who guesses wins 63% of battles. A player who knows the best move half the time wins 80%.
- Win rate will say almost nothing about learning.
- With HP 4, guessing wins 37% and a good player (70%) wins 83%. This separates people better.
- Real battles have consequences that change later turns. The numbers are only a guide.
- Also log the "best move" rate for each concept. It is the real signal.

`Opinion`: use HP 4, or keep HP 3 and report the best-move rate, not wins.

### Make the fun last

- Show competence, not points. Examples: "3 weakest creatures got stronger", Pokédex, per-town best-move rate. Your design already avoids points for opening the app. This matches Deci 1999.
- Prediction before feedback already exists ("write why before the result"). Add a 1-tap confidence level (low, medium, high). `Opinion`: high-confidence errors are the easiest to fix (Butterfield & Metcalfe 2001), so they are worth marking.
- Choice (3 / 15 / 45) supports autonomy. A meta-analysis of 41 studies found choice raised intrinsic motivation and effort. The effect was weaker for adults and for choices between activities. Source: [Patall et al. 2008](https://doi.org/10.1037/0033-2909.134.2.270). Keep the choice. Do not expect a big effect.
- Relatedness is the missing need in a solo app. `Opinion`: use the real work team. Ask a colleague to read one design doc or ADR. This also gives real feedback (section 6).

---

## 4. Habits for a busy adult

### Evidence

| Technique | What the primary source says | Source |
|---|---|---|
| Implementation intentions ("If X, then I do Y") | 642 tests: effects for thinking, feeling and behavior outcomes were d = 0.27 to 0.66. Larger when plans were if-then, motivation was high, and plans were rehearsed. The older 2006 meta-analysis is widely quoted as d = 0.65, but I could not read it (record only) | [Sheeran, Listrom & Gollwitzer 2025](https://doi.org/10.1080/10463283.2024.2334563), [Gollwitzer & Sheeran 2006](https://doi.org/10.1016/s0065-2601(06)38002-1) (record only) |
| Habit formation time | 96 volunteers, 12 weeks. Time to reach 95% of the person's own top automaticity was 18 to 254 days. Missing one opportunity did not materially affect the process. More consistent practice fitted the model better | [Lally et al. 2010](https://doi.org/10.1002/ejsp.674) |
| Habit formation, newer review | 20 studies, 2,601 people. Median time 59 to 66 days in 4 studies. Means 106 to 154 days. Individual range 4 to 335 days. Morning practice and self-chosen habits had greater habit strength. Many studies had high risk of bias | [Singh et al. 2024](https://doi.org/10.3390/healthcare12232488) |
| Fresh start effect | Three archival studies: searches for "diet", gym visits and goal commitments rose after a new week, month, year or semester | [Dai, Milkman & Riis 2014](https://doi.org/10.1287/mnsc.2014.1901) |
| Goal gradient | People try harder as they get closer to a reward. A card with 2 free bonus stamps (12 stamps, 2 done) was finished faster than a plain 10-stamp card | [Kivetz, Urminsky & Zheng 2006](https://doi.org/10.1509/jmkr.43.1.39) |
| Endowed progress | Giving artificial progress at the start raised persistence | [Nunes & Drèze 2006](https://doi.org/10.1037/e621442012-134) (PsycEXTRA record of the paper; abstract only) |
| Temptation bundling | Audiobooks only at the gym: 51% more gym visits (full treatment) and 29% more (mild) at first. The effect shrank over time | [Milkman, Minson & Volpp 2014](https://doi.org/10.1287/mnsc.2013.1784) |
| Tiny habits and prompts | Behavior needs motivation, ability and a prompt at the same time (B=MAP). This is a model. The site gives no effect size | [BJ Fogg, behaviormodel.org](https://www.behaviormodel.org/), [tinyhabits.com](https://tinyhabits.com/) |
| Sleep and memory | Sleep helps to consolidate new memory. In one small study (40 people, vocabulary), learning in the evening, sleeping, and relearning next morning needed half the practice of learning and relearning within one day. It also gave better retention at 1 week and 6 months | [Diekelmann & Born 2010](https://doi.org/10.1038/nrn2762), [Mazza et al. 2016](https://doi.org/10.1177/0956797616659930) |

### What this means for the 3 / 15 / 45 design

| Idea | Fits 3 min? | Fits 15 min? | Fits 45 min? | Change to the design |
|---|---|---|---|---|
| Fogg: make the action easy | Yes. 3 minutes is the "tiny" version | Yes | Yes | Keep. Make the 3-minute day count fully. Show it as a normal day, not a weak one |
| If-then plan | Yes | Yes | Yes | One setup screen: "After I ___, I open the app and tap 3 / 15 / 45". Add a tired-day plan: "If I am tired, I tap 3" |
| Consistent cue (Lally) | Yes | Yes | Weekend only | One fixed cue for week 1 to week 12. Change the 07:30 reminder only on purpose |
| Longer support window | Yes | Yes | Yes | Lally and Singh show habits can take 2 to 5 months. Your design calls week 8 the risky time. `Opinion`: keep extra support (comeback screen, lighter days) to week 12 or more |
| Never miss twice | Yes | Yes | n/a | Lally: missing one opportunity did not materially change habit growth. Supports your rule. It does not test "twice" |
| Fresh start | Yes | Yes | Yes | Each new town is a monthly landmark. Make the first day of a town feel new. Make the comeback screen say "New week starts Monday" |
| Goal gradient and endowed progress | Yes | Yes | Yes | Show "7 of 15 caught" per town. The placement test already gives free starting progress. Say so on screen |
| Temptation bundling | Yes | Yes | Weekend | `Opinion`: link the review to something you like at a fixed time, like morning coffee. The effect faded in the study, so do not rely on it alone |
| Sleep and timing | Reviews in the morning | Review in the morning, catch in the evening if you have energy | Weekend | `Opinion`: low-cost and weak evidence. Keep 07:30 for reviews. Singh found morning habits were stronger |

---

## 5. Learning in the AI era

### Findings

| Study | Design | Result | Limits |
|---|---|---|---|
| [Shen & Tamkin 2026, Anthropic](https://www.anthropic.com/research/AI-assistance-coding-skills) (full page). Paper: [arXiv 2601.20245](https://arxiv.org/abs/2601.20245) (abstract only) | RCT. 52 mostly junior engineers learned a new Python library, Trio. One group had an AI assistant | Quiz: AI group 50%, hand-coding group 67% (d = 0.738, p = 0.01). Time saved about 2 minutes, not significant. Biggest gap: debugging questions | Small sample. Quiz right after the task. Authors do not claim cause for the interaction patterns |
| [Bastani et al. 2025, PNAS](https://pmc.ncbi.nlm.nih.gov/articles/PMC12232635/) (full text) | Field experiment, nearly 1,000 high school math students. "GPT Base" is like ChatGPT. "GPT Tutor" has safeguards | Practice: +48% (Base), +127% (Tutor). Exam without AI: Base 17% lower than control. Tutor: harm largely removed, but no gain | Short-term exam only. Older model (GPT-4) |
| [Kestin et al. 2025](https://doi.org/10.1038/s41598-025-97652-6) (abstract only) | RCT. AI tutor built on teaching best practice vs in-class active learning, college students | Students learned significantly more in less time with the AI tutor, and felt more engaged | Abstract only. Designed tutor, not a general chat |
| [Fan et al. 2024](https://doi.org/10.1111/bjet.13544) (abstract only) | Randomized, 117 university students, writing task | ChatGPT group improved essay scores more. Knowledge gain and transfer were not significantly different | Small study |

The primary source of the "50% vs 67%" number is the Anthropic page above. It is also in the arXiv paper. Addy Osmani's post repeats it as "seventeen percentage points lower". See [Osmani](https://addyosmani.com/blog/own-the-outer-loop/). I confirmed the post cites the number. I did not use it as evidence.

What the Anthropic page says that matters for us:

- Low-scoring patterns (average below 40%): hand all code to AI, slowly hand over more, or use AI to debug without understanding it.
- High-scoring patterns (65% or more): ask AI to explain, ask conceptual questions, or generate code and then ask follow-up questions.
- "17% lower" means 17 points (67 minus 50). It is a 25% relative fall. This is my arithmetic.
- The authors say cognitive effort, and even being stuck, is likely important for learning.

What Bastani adds: the safe tutor did three things. It gave hints, not answers. It had the correct solution in its prompt. It had common student mistakes and the matching hints in its prompt.

### Anthropic's own learning features

- Learning mode, from the Claude for Education launch post: it guides reasoning instead of giving answers. It uses Socratic questions. It stresses core concepts. It was introduced inside Projects. Source: [Introducing Claude for Education](https://www.anthropic.com/news/introducing-claude-for-education). I could not confirm how it works on a personal Pro account today.
- Claude Code has a Learning output style. Claude adds insight notes and asks you to write code at real design decisions. Source: [Claude Code output styles](https://code.claude.com/docs/en/output-styles).

### What this means for "Discuss in Claude"

`Opinion`, based on the sources above:

1. Your design already makes the user try first (write the "why"). Keep it. This matches the "try first" pattern.
2. Do not use "Rewrite my answers in better English" as the first step. Reading a rewrite is passive. Ask Claude to point out 2 mistakes, and ask you to fix them.
3. Send the model answer and 3 key points inside the package, but tell Claude to hold them back. This copies the safe tutor in Bastani.
4. Limit the chat to 3 rounds. This fits a 15-minute day.
5. After the chat, ask the user to write 2 sentences from memory. Store them. Ask again at the next review. (A teach-back.)

### Proposed prompt (75 words)

```
You are my tech lead coach. Below is my battle and the model answer. Do not show the model answer yet. Ask me ONE question at a time about my choice and my why. Wait for my reply. Give hints, not solutions. After three rounds, compare my thinking with the model answer. Then ask me to explain the trade-off again in my own words. Show me two English mistakes and ask me to fix them.
```

---

## 6. Transfer to real work

### What helps

- Retrieval practice transfers to new tasks on average: d = 0.40 (CI 0.31 to 0.50). The data are 192 effect sizes from 122 experiments. Transfer was greatest to application and inference questions, and to medical diagnosis problems. Source: [Pan & Rickard 2018](https://doi.org/10.1037/bul0000151).
- Same paper, limit: transfer was weakest to untested material and to problems with worked examples. After bias correction, many predictions showed no positive transfer when no helping condition was present. Helping conditions were elaborated retrieval, response match and good first-test scores.
- Simulation training for health professionals had large effects vs no training. Knowledge 1.20, process skills 1.09, other behaviors 0.81, patient outcomes 0.50. Results varied a lot. Most studies (405 of 609) had no control group. Source: [Cook et al. 2011](https://doi.org/10.1001/jama.2011.1234). This is a different field, so it is only an analogy for scenario practice.
- Writing-to-learn gave a small positive effect. Source: [Bangert-Drowns et al. 2004](https://doi.org/10.3102/00346543074001029).

### Honest limits

| Limit | Evidence |
|---|---|
| Deliberate practice explained 26% of the difference in performance for games, 21% for music, 18% for sports, 4% for education and less than 1% for professions | [Macnamara et al. 2014](https://doi.org/10.1177/0956797614535810) |
| The original 1993 deliberate practice study did not replicate its core finding in a 2019 replication. The effect was smaller | [Ericsson et al. 1993](https://doi.org/10.1037/0033-295x.100.3.363), [Macnamara & Maitra 2019](https://doi.org/10.1098/rsos.190327) |
| Far transfer rarely occurs. Effects of chess, music and working-memory training shrank when studies had better control groups | [Sala & Gobet 2017](https://doi.org/10.1177/0963721417712760) |
| Skill from intuition needs a predictable environment and a chance to learn its rules. Subjective feeling is not a reliable sign of accuracy | [Kahneman & Klein 2009](https://doi.org/10.1037/a0016755) |
| I found no study on whether design-doc, ADR or scenario-game practice improves tech lead performance | My search. Not proof that none exists |

`Opinion`, what this means:

- Your damage tables (0, 1, 2) hold the author's judgement. Real design choices have slow, noisy feedback. The game trains vocabulary and trade-off reasoning. It does not prove real skill.
- Practice should look like the real job. Do the weekend ADR on a real decision at work. Write what you expected. Check after 4 to 8 weeks what happened. This gives the real feedback the game cannot give.
- Ask a real colleague to review one design doc per month. This gives feedback and relatedness.
- Tech lead work also needs talking to people. Your design leaves this out on purpose. This research did not study it.

---

## 7. Top 10 changes to the design

Ranked by expected gain in real learning per minute. The ranking is `Opinion`. The facts behind each row have sources.

| # | Change | Why | Source | Effort | Week 1? |
|---|---|---|---|---|---|
| 1 | Reviews use free recall (type or say a short answer), then reveal and self-grade with 4 levels. No multiple choice by default | Recall tests gave larger benefits than recognition. The 4 grades also prepare a later FSRS switch | [Rowland 2014](https://doi.org/10.1037/a0037559), [Pan & Rickard 2018](https://doi.org/10.1037/bul0000151) | S | Yes |
| 2 | Catch asks the question first, then shows the card. Placement test uses short answers with a confidence tap | Pretesting matched or beat posttesting at 48 hours. Confident errors are fixed best | [Pan & Sana 2021](https://doi.org/10.1037/xap0000345), [Richland 2009](https://doi.org/10.1037/a0016496), [Butterfield & Metcalfe 2001](https://doi.org/10.1037/0278-7393.27.6.1491) | S | Yes |
| 3 | Replace the "Discuss in Claude" opener with the coach prompt in section 5. Add a 2-sentence teach-back after the chat | Delegating to AI lowered quiz scores. Hints and a hidden solution did not | [Shen & Tamkin 2026](https://www.anthropic.com/research/AI-assistance-coding-skills), [Bastani 2025](https://pmc.ncbi.nlm.nih.gov/articles/PMC12232635/) | S | No. Battles are week 2. Decide now |
| 4 | Tune battle rules: HP 4, or report the best-move rate. Do not use win rate as the learning signal | Guessing wins 63% of HP 3 battles | `My calculation`. Context: [Wilson 2019](https://doi.org/10.1038/s41467-019-12552-4) | S | No. Decide before building battles |
| 5 | Define the review item (creature or move). Add a backlog guard: if the queue is above 8 for 3 days, stop new catches | Possible 9 reviews per day against a cap of 8. A growing backlog is a likely reason to quit (`Opinion`) | `My calculation`. Context: [Anki manual](https://docs.ankiweb.net/deck-options.html) | S | Yes |
| 6 | Setup screen for an if-then plan and a tired-day plan. Keep one fixed cue for 12 weeks | If-then plans gave d = 0.27 to 0.66. Habits can take 2 to 5 months | [Sheeran et al. 2025](https://doi.org/10.1080/10463283.2024.2334563), [Lally 2010](https://doi.org/10.1002/ejsp.674), [Singh 2024](https://doi.org/10.3390/healthcare12232488) | S | Yes |
| 7 | Keep fixed steps. Log every review with time and grade. "Easy" skips one step. Add a late review near day 180. Check the switch triggers at month 3 | Fixed steps are well supported. Logging makes a later change cheap | [Cepeda 2008](https://doi.org/10.1111/j.1467-9280.2008.02209.x), [Settles & Meeder 2016](https://aclanthology.org/P16-1174.pdf) | S | Yes (logging) |
| 8 | Mix confusable concepts across towns in reviews and in Gym. Keep definition cards blocked | Interleaving helps when categories look alike. It hurt for word lists | [Brunmair & Richter 2019](https://doi.org/10.1037/bul0000209), [Rohrer 2020](https://doi.org/10.1037/edu0000367) | M | Later (Gym is week 3) |
| 9 | Weekend ADR on a real work decision. Check the outcome after 4 to 8 weeks. Ask a colleague to review one doc a month | Practice near the real task. Real feedback. Game feedback is the author's opinion | [Sala & Gobet 2017](https://doi.org/10.1177/0963721417712760), [Kahneman & Klein 2009](https://doi.org/10.1037/a0016755) | M | Later |
| 10 | In each new town, show the model answer before the first battle of a concept, then hide it. Skip it when the placement test says you know the topic | Worked examples help novices. The help fades or reverses for experts | [Sweller 1988](https://doi.org/10.1207/s15516709cog1202_4), [Kalyuga 2003](https://doi.org/10.1207/s15326985ep3801_4) | M | Later |

Also worth doing, but ranked lower:

- In the 45-minute day, replace "read deeper into sources" with "read, close the page, write 3 things from memory". Reading again has low utility (Dunlosky 2013). `Opinion`.
- When a review is wrong, show the answer and ask it once more at the end of the session. The Anki manual says many same-day repeats add little. Rawson & Dunlosky asked for one correct recall in each relearning session. Test which fits you. `Opinion`.

---

## 8. Myths and traps to avoid

| Myth or trap | What the evidence says | Source |
|---|---|---|
| "I learn best in my own style (visual, verbal)" | No adequate evidence base for style-based teaching | [Pashler et al. 2008](https://doi.org/10.1111/j.1539-6053.2009.01038.x) |
| "Re-reading and highlighting are good study" | Low utility. Restudy made students more confident but they remembered less after 2 days and 1 week | [Dunlosky 2013](https://doi.org/10.1177/1529100612453266), [Roediger & Karpicke 2006](https://doi.org/10.1111/j.1467-9280.2006.01693.x) |
| "Cramming works" | It helps for a few minutes, not for days or weeks | [Roediger & Karpicke 2006](https://doi.org/10.1111/j.1467-9280.2006.01693.x), [Cepeda 2006](https://doi.org/10.1037/0033-2909.132.3.354) |
| "A habit takes 66 days" | The range was 18 to 254 days in one study. 4 to 335 days in a review. 66 is a median from some people only | [Lally 2010](https://doi.org/10.1002/ejsp.674), [Singh 2024](https://doi.org/10.3390/healthcare12232488) |
| "The 85% rule proves 85% is right for people" | Proven for simple models. Humans are untested. The number moves with noise type | [Wilson 2019](https://doi.org/10.1038/s41467-019-12552-4) |
| "Gaps must always grow" | Equal gaps gave better memory after 2 days. Delaying the first retrieval was the key | [Karpicke & Roediger 2007](https://doi.org/10.1037/0278-7393.33.4.704) |
| "FSRS saves 20 to 30% of reviews" | The claim is versus SM-2 and comes from simulation. Not versus fixed steps like ours | [ABC of FSRS](https://github.com/open-spaced-repetition/awesome-fsrs/wiki/ABC-of-FSRS) |
| "FSRS is always better" | Benchmark is by the FSRS team, on Anki data. In Duolingo's own test, a fixed-box method had the highest AUC | [srs-benchmark](https://github.com/open-spaced-repetition/srs-benchmark), [Settles & Meeder 2016](https://aclanthology.org/P16-1174.pdf) |
| "AI help raises learning" | AI help raised practice scores. Learning fell when it replaced thinking | [Bastani 2025](https://pmc.ncbi.nlm.nih.gov/articles/PMC12232635/), [Shen & Tamkin 2026](https://www.anthropic.com/research/AI-assistance-coding-skills) |
| "17% lower is a small gap" | It is 17 points (50% vs 67%), d = 0.74. But n = 52 and the quiz was right after the task | [Anthropic page](https://www.anthropic.com/research/AI-assistance-coding-skills) |
| "Rewards and points raise motivation" | Rewards for doing an activity reduced intrinsic motivation (d = -0.40). Gamification effects on motivation and behavior were small and less stable | [Deci et al. 1999](https://doi.org/10.1037/0033-2909.125.6.627), [Sailer & Homner 2020](https://doi.org/10.1007/s10648-019-09498-w) |
| "A high win rate means I am learning" | With HP 3, a guesser wins 63% | `My calculation`, section 3 |
| "Hard practice is always good" | Only difficulty with success and feedback helps. Testing without feedback at low accuracy sometimes fails | [Dunlosky 2013](https://doi.org/10.1177/1529100612453266) |
| "Immediate feedback is always best" | Mixed results. Classroom quizzes favored immediate. Lab studies often favored delayed | [Kulik & Kulik 1988](https://doi.org/10.2307/1170349) |
| "10,000 hours of deliberate practice makes experts" | In professions it explained under 1% of performance differences | [Macnamara et al. 2014](https://doi.org/10.1177/0956797614535810) |
| "Game effects last all year" | See `research/gamified-learning-apps.md`. That file reports effects fade after about 4 weeks. I did not re-check that claim here | Local file |

---

## Not verified

- Gollwitzer & Sheeran 2006: I could not read this paper. The d = 0.65 figure came from secondary web pages. I used the 2025 update for numbers instead.
- Adesope 2017, Bjork & Bjork 2020, Carney & Levin 2002, Rawson et al. 2014 ("power of examples"), Dai et al. 2015 and Kang et al. 2009: I did not read these abstracts, or the abstract has no number. I made no number claims from them.
- Lally 2010: the "median 66 days" figure was not in the abstract. I did not use it as a fact.
- Most journal papers: abstract only. The numbers I quote come from abstracts. The exceptions are Dunlosky 2013, Rowland 2014 (full-text copy), Wilson 2019, Bastani 2025 and the HLR paper. Bisra 2018 is a 3-page preview with the abstract.
- FSRS simulation: I coded the FSRS-6 formulas from the wiki. The wiki page says "other formulas are the same as" older versions. I did not compare my code with the reference code. Treat 94 to 96% as an estimate. FSRS-7 exists in the benchmark. I did not read its defaults.
- Whether FSRS defaults fit concept-and-scenario cards is unknown. Its data is mostly Anki flashcards.
- Learning mode in Claude: I confirmed the launch post and the Claude Code style. I did not confirm how learning mode works on a personal Pro account today.
- The "Discuss in Claude" link with `claude.ai/new?q=`: not tested here. The design doc already marks it not verified.
- The sleep result (Mazza 2016) is one small study with vocabulary. The time-of-day idea is `Opinion`.
- Nothing here proves the app will help you become a tech lead. I found no study on that question.

## Sources

Read level: `full` = I read the full text or page. `abstract only` = I read the abstract. `record only` = title, journal and DOI only.

**Techniques**

1. Dunlosky et al. 2013, Psychological Science in the Public Interest. https://doi.org/10.1177/1529100612453266 (full, from a PDF copy at https://dl1.cuni.cz/mod/resource/view.php?id=230505)
2. Rowland 2014, testing effect meta-analysis. https://doi.org/10.1037/a0037559 (full results, from a PDF copy)
3. Adesope et al. 2017, practice testing meta-analysis. https://doi.org/10.3102/0034654316689306 (abstract only)
4. Roediger & Karpicke 2006. https://doi.org/10.1111/j.1467-9280.2006.01693.x (abstract only)
5. Cepeda et al. 2006, distributed practice meta-analysis. https://doi.org/10.1037/0033-2909.132.3.354 (abstract only)
6. Cepeda et al. 2008, spacing ridgeline. https://doi.org/10.1111/j.1467-9280.2008.02209.x (abstract only)
7. Karpicke & Roediger 2007, expanding retrieval. https://doi.org/10.1037/0278-7393.33.4.704 (abstract only)
8. Rawson & Dunlosky 2011, how much is enough. https://doi.org/10.1037/a0023956 (abstract only)
9. Brunmair & Richter 2019, interleaving meta-analysis. https://doi.org/10.1037/bul0000209 (abstract only)
10. Rohrer et al. 2020, interleaved math RCT. https://doi.org/10.1037/edu0000367 (abstract only)
11. Bisra et al. 2018, self-explanation meta-analysis. https://doi.org/10.1007/s10648-018-9434-x (abstract, from a 3-page preview)
12. Bertsch et al. 2007, generation effect. https://doi.org/10.3758/bf03193441 (abstract only)
13. Richland, Kornell & Kao 2009, pretesting. https://doi.org/10.1037/a0016496 (abstract only)
14. Kornell, Hays & Bjork 2009. https://doi.org/10.1037/a0015729 (abstract only)
15. Pan & Sana 2021, pretesting vs posttesting. https://doi.org/10.1037/xap0000345 (abstract only)
16. Butterfield & Metcalfe 2001, hypercorrection. https://doi.org/10.1037/0278-7393.27.6.1491 (abstract only)
17. Sweller 1988, cognitive load. https://doi.org/10.1207/s15516709cog1202_4 (abstract only)
18. Atkinson, Derry, Renkl & Wortham 2000, worked examples. https://doi.org/10.2307/1170661 (abstract only)
19. Kalyuga et al. 2003, expertise reversal. https://doi.org/10.1207/s15326985ep3801_4 (abstract only)
20. Carney & Levin 2002, pictorial illustrations. https://doi.org/10.1023/a:1013176309260 (record only)
21. Kulik & Kulik 1988, feedback timing. https://doi.org/10.2307/1170349 (abstract only)
22. Butler & Roediger 2008, feedback and multiple choice. https://doi.org/10.3758/mc.36.3.604 (abstract only)
23. Bjork & Bjork 2020, desirable difficulties. https://doi.org/10.1016/j.jarmac.2020.09.003 (record only)
24. Bangert-Drowns et al. 2004, writing to learn. https://doi.org/10.3102/00346543074001029 (abstract only)
25. Pashler et al. 2008, learning styles. https://doi.org/10.1111/j.1539-6053.2009.01038.x (abstract, full)

**Scheduling**

26. Settles & Meeder 2016, half-life regression. https://aclanthology.org/P16-1174/ and https://aclanthology.org/P16-1174.pdf (full)
27. FSRS README. https://github.com/open-spaced-repetition/free-spaced-repetition-scheduler (full)
28. ABC of FSRS. https://github.com/open-spaced-repetition/awesome-fsrs/wiki/ABC-of-FSRS (full)
29. The FSRS algorithm wiki. https://github.com/open-spaced-repetition/awesome-fsrs/wiki/The-Algorithm (full)
30. SRS benchmark. https://github.com/open-spaced-repetition/srs-benchmark (full README)
31. Anki manual, deck options. https://docs.ankiweb.net/deck-options.html (full)
32. Anki manual, which algorithm Anki uses. https://docs.ankiweb.net/faqs/what-spaced-repetition-algorithm (full)
33. Ye, Su & Cao 2022, KDD. https://doi.org/10.1145/3534678.3539081 (abstract only)
34. Lindsey et al. 2014, personalized review. https://doi.org/10.1177/0956797613504302 (abstract only)

**Difficulty and fun**

35. Wilson et al. 2019, Eighty Five Percent Rule. https://doi.org/10.1038/s41467-019-12552-4 (full, via https://pmc.ncbi.nlm.nih.gov/articles/PMC6831579/)
36. Ryan & Deci 2000. https://doi.org/10.1037/0003-066x.55.1.68 (abstract only)
37. Deci, Koestner & Ryan 1999. https://doi.org/10.1037/0033-2909.125.6.627 (abstract only)
38. Patall, Cooper & Robinson 2008, choice. https://doi.org/10.1037/0033-2909.134.2.270 (abstract only)
39. Loewenstein 1994, curiosity. https://doi.org/10.1037/0033-2909.116.1.75 (abstract only)
40. Gruber, Gelman & Ranganath 2014. https://doi.org/10.1016/j.neuron.2014.08.060 (abstract only)
41. Sailer & Homner 2020, gamification meta-analysis. https://doi.org/10.1007/s10648-019-09498-w (abstract only)

**Habits**

42. Sheeran, Listrom & Gollwitzer 2025, 642 tests. https://doi.org/10.1080/10463283.2024.2334563 (abstract only, read from the Konstanz repository record)
43. Gollwitzer & Sheeran 2006. https://doi.org/10.1016/s0065-2601(06)38002-1 (record only)
44. Lally et al. 2010. https://doi.org/10.1002/ejsp.674 (abstract only)
45. Singh et al. 2024, habit formation review. https://doi.org/10.3390/healthcare12232488 (abstract only)
46. Dai, Milkman & Riis 2014, fresh start. https://doi.org/10.1287/mnsc.2014.1901 (abstract only)
47. Kivetz, Urminsky & Zheng 2006, goal gradient. https://doi.org/10.1509/jmkr.43.1.39 (abstract only)
48. Nunes & Drèze 2006, endowed progress. https://doi.org/10.1037/e621442012-134 (abstract only, PsycEXTRA record)
49. Milkman, Minson & Volpp 2014, temptation bundling. https://doi.org/10.1287/mnsc.2013.1784 (abstract only)
50. BJ Fogg, Fogg Behavior Model. https://www.behaviormodel.org/ (full page)
51. BJ Fogg, Tiny Habits. https://tinyhabits.com/ (full page)
52. Diekelmann & Born 2010, memory function of sleep. https://doi.org/10.1038/nrn2762 (abstract only)
53. Mazza et al. 2016, relearn faster. https://doi.org/10.1177/0956797616659930 (abstract only)

**AI era**

54. Shen & Tamkin 2026, Anthropic research page. https://www.anthropic.com/research/AI-assistance-coding-skills (full)
55. Shen & Tamkin 2026, arXiv. https://arxiv.org/abs/2601.20245 (abstract only)
56. Bastani et al. 2025, PNAS. https://doi.org/10.1073/pnas.2422633122 (full, via https://pmc.ncbi.nlm.nih.gov/articles/PMC12232635/)
57. Kestin et al. 2025, Scientific Reports. https://doi.org/10.1038/s41598-025-97652-6 (abstract only)
58. Fan et al. 2024, British Journal of Educational Technology. https://doi.org/10.1111/bjet.13544 (abstract only)
59. Osmani, "Own the Outer Loop" (used only to find the number). https://addyosmani.com/blog/own-the-outer-loop/ (full)
60. Anthropic, Introducing Claude for Education. https://www.anthropic.com/news/introducing-claude-for-education (full)
61. Claude Code docs, output styles. https://code.claude.com/docs/en/output-styles (full)

**Transfer**

62. Pan & Rickard 2018, transfer of test-enhanced learning. https://doi.org/10.1037/bul0000151 (abstract only)
63. Cook et al. 2011, simulation meta-analysis, JAMA. https://doi.org/10.1001/jama.2011.1234 (abstract only)
64. Ericsson, Krampe & Tesch-Römer 1993. https://doi.org/10.1037/0033-295x.100.3.363 (abstract only)
65. Macnamara, Hambrick & Oswald 2014. https://doi.org/10.1177/0956797614535810 (abstract only)
66. Macnamara & Maitra 2019, replication. https://doi.org/10.1098/rsos.190327 (abstract only)
67. Sala & Gobet 2017, far transfer. https://doi.org/10.1177/0963721417712760 (abstract only)
68. Kahneman & Klein 2009. https://doi.org/10.1037/a0016755 (abstract only)
