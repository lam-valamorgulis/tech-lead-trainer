# Game UI and UX patterns for a phone game: copy, adapt, avoid

Research date: 2026-10-19. Every URL below was fetched, unless marked `(not verified)`.

## Tóm tắt

- `navigator.vibrate` KHÔNG chạy trên iOS Safari (MDN browser-compat-data và caniuse đều ghi "không hỗ trợ"). Vì vậy mọi phản hồi phải có hình và chữ, không được chỉ dựa vào rung.
- Nút bấm nên cao ít nhất 44–48 px, đặt ở nửa dưới màn hình, và chừa `env(safe-area-inset-bottom)`. Dùng `100dvh` thay cho `100vh`.
- Màu của "type" (Traffic, Security…) không được là tín hiệu duy nhất. Mỗi type cần màu + icon + chữ.
- Pixel font chỉ nên dùng cho tiêu đề và nhãn ngắn. Đoạn văn dùng font sans-serif rõ ràng (đây là `Opinion` dựa trên Game Accessibility Guidelines, Xbox XAG và Apple HIG, không có nguồn nào nói thẳng về pixel font).
- Bằng chứng từ chính nhà làm game còn mỏng: nhiều GDC talk chỉ đọc được phần mô tả. Tôi ghi rõ chỗ nào là `(not verified)`.

## How I checked

- I fetched each page. Quotes are short, because the fetch tool returns summaries made by a small model.
- Apple HIG web pages returned only a title. I read the same pages from Apple's JSON feed at `developer.apple.com/tutorials/data/design/human-interface-guidelines/<page>.json`. I cite the normal HIG URL.
- Browser support comes from MDN browser-compat-data and caniuse data files on GitHub. These are the data sources behind the MDN and caniuse tables.
- GDC Vault and YouTube pages gave me only the title and the abstract. I could not read the talks. I mark any claim about talk content `(not verified)`.
- Reasoning that is mine is marked `Opinion`.
- Pokémon names, art and phrases are not suggested for our assets. I describe patterns only.

---

## Quick answers

| Question | Answer | Source |
|---|---|---|
| Does `navigator.vibrate` work in iOS Safari? | **No.** Safari and iOS Safari have no support. | [MDN data](https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/Navigator.json), [caniuse data](https://raw.githubusercontent.com/Fyrd/caniuse/main/features-json/vibration.json) |
| Pixel font for body text? | **No.** Use a pixel font for headings and short labels only. `Opinion`. | [Game Accessibility Guidelines](https://gameaccessibilityguidelines.com/use-simple-clear-text-formatting/), [Xbox XAG 101](https://devdocs.xbox.com/build/game-principles/accessibility/xag-deep-dives/xag-101-text-display.md), [Apple HIG Typography](https://developer.apple.com/design/human-interface-guidelines/typography) |

---

## Section B: Patterns per screen

Effort: S = under half a day, M = 1–2 days, L = more than 2 days.
Evidence says what the page proves. It does not always prove our exact use. I say so in the row.

### B1. Home / town map

| Pattern | Example game | Evidence (URL) | Suggestion for our screen | Effort | Fits week 1? |
|---|---|---|---|---|---|
| One clear next step on the map | Duolingo path | [Duolingo blog](https://blog.duolingo.com/new-duolingo-home-screen-design/): the path gives "a clear path to follow" and stops "jumping around". | Show one big "Next" button above the map. The map sits below it. | S | yes |
| Plain-word labels for groups | Duolingo units | Same post: labels became "get directions" instead of "City 3". | Show "Town 3: Caching", not only "Town 3". | S | yes |
| Locked state is not only grey | Sea of Thieves, Forza (examples in Xbox docs) | [Xbox XAG 103](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/103): locked items get a lock symbol, and a "Not available" label. | Locked town: grey + lock icon + text "Opens in week 5". | S | yes |
| Few incentives on screen | Brilliant | [Brilliant About](https://brilliant.org/about/): "We avoid packing too many game incentives into the product". | Home shows only: 30-day rate, Next button, map. Nothing else. | S | yes |
| Content stays inside safe areas | iOS web apps | [WebKit blog](https://webkit.org/blog/7929/designing-websites-for-iphone-x/): "Respect safe area insets so that important content is visible." | Use `viewport-fit=cover` and `env(safe-area-inset-*)` on the shell. | S | yes |
| A small new rule in each town | Boot.dev changes its game layer over time | [Boot.dev Beat 2026-08](https://www.boot.dev/blog/news/bootdev-beat-2026-08): boss fights were reworked. The page does not say why. | Show a small "New rule" tag on the town card. `Opinion`: this helps fight the novelty drop. | M | later |

### B2. Daily commit

| Pattern | Example game | Evidence (URL) | Suggestion for our screen | Effort | Fits week 1? |
|---|---|---|---|---|---|
| Bite-sized sessions, shown up front | Duolingo | [Duolingo teaching method](https://blog.duolingo.com/duolingo-teaching-method/): "bite-sized lessons that take just a few minutes". | Each choice shows time and content: "3 min: reviews only". | S | yes |
| Three big buttons in the lower half | Phone apps in general | [web.dev](https://web.dev/articles/accessible-tap-targets): about 48 px size and about 8 px spacing. [Apple HIG](https://developer.apple.com/design/human-interface-guidelines/accessibility): default iOS control 44x44 pt. | Stack 3 full-width buttons, 56 px high, 12 px gap. | S | yes |
| Do not trust old thumb-zone maps | (research article) | [UXmatters, Steven Hoober](https://www.uxmatters.com/mt/archives/2013/02/how-do-users-really-hold-mobile-devices.php): in 2013, 49% held the phone one-handed. His 2017 note says "People touch the center of the screen." He asks readers to ignore his old drawings. | Put the main choice in the middle and lower half. Do not hide key actions only in the top corners. | S | yes |
| Reminders only if the learner asks | Duolingo | [Duolingo habit post](https://blog.duolingo.com/putting-in-work-the-habit-of-language-learning/): "Duo reminds you to practice—but only if you ask him to." | No push in week 1. Later, make it opt-in. Push on iPhone is for Home Screen apps, and the permission request needs a tap ([WebKit blog](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)). | L | later |

### B3. Review

| Pattern | Example game | Evidence (URL) | Suggestion for our screen | Effort | Fits week 1? |
|---|---|---|---|---|---|
| Fast feedback that depends on your answer | Brilliant | [Brilliant About](https://brilliant.org/about/): "instant, custom feedback based on your answer". | After each answer, show right or wrong, plus one key sentence. | S | yes |
| No hints in practice, low stakes | Brilliant | Same page: "no more visual aids or hints"; practice "designed to feel like low-stakes quizzes". | Reviews show no hints. A wrong answer costs nothing. | S | yes |
| Small reaction on each correct answer | Duolingo | [Duolingo characters post](https://blog.duolingo.com/building-character/): each character has an animation for a correct answer. The post does not mention wrong answers. | A 0.3–0.5 s creature reaction on a correct answer. No confetti. Timing is `Opinion`. | S | yes |
| Do not let easy actions give rewards | Boot.dev | [Boot.dev Beat 2026-08](https://www.boot.dev/blog/news/bootdev-beat-2026-08): "Nerfed quiz XP in the Training Grounds (it was too easy to XP farm)". | Keep your rule: easy reviews give no points. Reviews only move the evolve timer. | S | yes |
| Respect Reduce Motion | iOS apps | [Apple HIG](https://developer.apple.com/design/human-interface-guidelines/accessibility): when Reduce Motion is on, reduce zooming and scaling. Use fades. | Replace zoom and shake with a fade. See Section E. | S | yes |

### B4. Catch

| Pattern | Example game | Evidence (URL) | Suggestion for our screen | Effort | Fits week 1? |
|---|---|---|---|---|---|
| One concept per screen | Brilliant | [Brilliant About](https://brilliant.org/about/): "Each lesson focuses on a single concept." It starts with the simplest version to minimise cognitive load. | One creature, one concept, 3 short sentences. Then 2–4 move cards. | S | yes |
| Teach one thing at a time by unlock order | Marvel Snap | [Mobilegamer.biz](https://mobilegamer.biz/second-dinner-reveals-the-secrets-of-marvel-snaps-onboarding-and-card-design/): unlock paths teach how cards work together "without being too hand-holdy". | Unlock creatures in a chain. Creature B builds on creature A. | M | later |
| Catch moment has "juice" | Many games | [Game Developer, GDC Europe talk summary](https://www.gamedeveloper.com/design/video-is-your-game-juicy-enough-): juice is "maximum output for minimum input". They use tweening, stretching and squeezing. | Sprite pops (scale 1 to 1.2 to 1), short sound, Pokédex entry slides in. | M | later |

### B5. Battle

#### B5a. Team pick

| Pattern | Example game | Evidence (URL) | Suggestion for our screen | Effort | Fits week 1? |
|---|---|---|---|---|---|
| Type matchup is part of team choice | Pokémon Showdown | [Showdown intro](https://pokemonshowdown.com/intro): "Water is super-effective against Fire and not very effective against Grass". | Show the opponent type (icon + word). Show each creature's type. Do not show damage values. | S | yes |
| Clear card states | Hearthstone | [GDC Vault abstract](https://gdcvault.com/play/1022036/Hearthstone-How-to-Create-an) says the talk covers an "immersive user interface". It gives no detail on card states `(not verified)`. | Three states: normal, selected, tired. Selected has a check icon and a thick border, not only colour. | S | yes |
| Mark creatures that need review | (none) | No source. `Opinion`. | Small tag "Review due" on weak creatures. It helps spaced review. | S | yes |

#### B5b. Turn (pick a move, write "why")

| Pattern | Example game | Evidence (URL) | Suggestion for our screen | Effort | Fits week 1? |
|---|---|---|---|---|---|
| Show the threat before the choice | Into the Breach, Slay the Spire | Into the Breach: [Game Developer interview](https://gamedeveloper.com/game-platforms/road-to-the-igf-subset-games-i-into-the-breach-i-): "telegraphed enemy attacks as a core mechanic". Slay the Spire intent icons: no primary source loaded `(not verified)`. | Show the scenario and its pressure at the top: "Black Friday: 10x traffic". Do not show the answer or the damage. | S | yes |
| Move buttons with type icon, name, short text | Pokémon Showdown | [Showdown intro](https://pokemonshowdown.com/intro): icons show if a move is Physical or Special. | Each move: type icon, name, 6-word plain summary. 2–4 stacked buttons, 56 px high. | S | yes |
| Writing on a phone keyboard | (web platform) | [MDN VisualViewport](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport): the on-screen keyboard "can shrink the visual viewport without affecting the layout viewport". | Keep the "Lock in" button visible above the keyboard. Test on a real iPhone. Use input font of 16 px or more `(not verified: only blogs found)`. | M | yes |
| Always give an exit | (none) | No source. `Opinion`. | Add an "I don't know" button next to "Lock in". It records a miss. It does not block the user. | S | yes |
| Opponent HP as pips | Reigns uses visible meters | [Wikipedia, Reigns](https://en.wikipedia.org/wiki/Reigns_(video_game)): four meters fill and empty with decisions. Whether the game previews the change is not stated here `(not verified)`. | Show opponent HP as 3 pips, and "Turn 1 of 3". No other meters. | S | yes |

#### B5c. Result (damage 0 / 1 / 2)

| Pattern | Example game | Evidence (URL) | Suggestion for our screen | Effort | Fits week 1? |
|---|---|---|---|---|---|
| Result in words, not only numbers | Pokémon Showdown | [Showdown source text](https://raw.githubusercontent.com/smogon/pokemon-showdown/master/data/text/default.ts): separate messages for super effective, resisted and immune. | Map 2 / 1 / 0 to "Strong hit" / "Weak hit" / "No effect" with the number and pips. Use our own words. | S | yes |
| Hit flash, number pop, small shake | Vlambeer, Jonasson and Purho talks | Talk pages: [Juice it or lose it (YouTube title)](https://www.youtube.com/watch?v=Fy0aCDmgnxg), [The art of screenshake (YouTube title)](https://www.youtube.com/watch?v=AJdEqssNZ-U). I could not read the talk content `(not verified)`. | Sequence under 0.9 s: one flash, number pop, pips shrink. Tap to skip. Exact timings are `Opinion`. | M | yes (basic) |
| Limit the juice | Folmer Kelly talk | [Game Developer](https://gamedeveloper.com/design/video-indies-resist-the-urge-to-juice-it-or-lose-it-): extra polish can cost immersion. | Keep effects short. Never block the text. | S | yes |
| Skip and speed | Game Accessibility Guidelines | [GAG full list](https://gameaccessibilityguidelines.com/full-list/): "Include an option to adjust the game speed" (Basic). | "Tap to skip" and a "Fast effects" setting. | S | yes |
| Sound has a visual twin | Xbox, Apple | [Apple HIG](https://developer.apple.com/design/human-interface-guidelines/accessibility): "Augment audio cues with visual cues." | Every sound has a flash, text or icon. Sound is a bonus. | S | yes |

#### B5d. Counterattack (consequence)

| Pattern | Example game | Evidence (URL) | Suggestion for our screen | Effort | Fits week 1? |
|---|---|---|---|---|---|
| Failure is clear and fair | Into the Breach | [Game Developer interview](https://gamedeveloper.com/game-platforms/road-to-the-igf-subset-games-i-into-the-breach-i-): "it's very clear how or why you failed". | One sentence: "You chose cache. Customers see old prices." An icon shows the affected thing. | S | yes |
| Show the cause in the same card | Into the Breach | Same source: the team wanted the player to feel in control. | Put "Because you chose: Cache" as a small line above the consequence. | S | yes |
| Do not add new meters | Reigns | [Wikipedia, Reigns](https://en.wikipedia.org/wiki/Reigns_(video_game)): meters are the core of Reigns. | We already have HP pips. Do not add a player meter. `Opinion`: it adds reading load. | S | yes |

#### B5e. Model answer and self-check

| Pattern | Example game | Evidence (URL) | Suggestion for our screen | Effort | Fits week 1? |
|---|---|---|---|---|---|
| Feedback that uses your own answer | Brilliant | [Brilliant About](https://brilliant.org/about/): feedback is "based on your answer". | Show your 1–2 sentences on top. Show the model answer and 3 points below. | S | yes |
| Big tick rows | Apple, WCAG | [WCAG 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html): at least 24x24 CSS px. [GAG](https://gameaccessibilityguidelines.com/full-list/): controls "large and well spaced" on touch screens. | Each point is a full-width row, 56 px high. The whole row is the tap target. | S | yes |
| Honest self-check | (none) | No source. `Opinion`. | Copy: "Tick what you really said." Ticks change only the review dates. | S | yes |

### B6. After-session summary and "Discuss in Claude"

| Pattern | Example game | Evidence (URL) | Suggestion for our screen | Effort | Fits week 1? |
|---|---|---|---|---|---|
| Copy on the end screen changes return rate | Duolingo | [Duolingo habit post](https://blog.duolingo.com/putting-in-work-the-habit-of-language-learning/): new post-lesson copy brought learners back more than the old copy. Their copy is about streaks. Ours is not. | Show: "30-day learning rate: 63%". Then one line about tomorrow. No guilt words. | S | yes |
| Short celebration | Duolingo | [Duolingo characters post](https://blog.duolingo.com/building-character/): animations reward a run of correct answers. | One short creature animation, under 1.5 s. Skip it under Reduce Motion. | S | yes |
| Copy to clipboard from a tap | (web platform) | [MDN writeText](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText): needs a secure context (HTTPS). Its example runs inside a click handler. Transient activation is not stated there `(not verified)`. | Call `navigator.clipboard.writeText` only inside the button tap. Show "Copied" text for 2 s. Add a fallback text box. | S | yes |

### B7. Pokédex

| Pattern | Example game | Evidence (URL) | Suggestion for our screen | Effort | Fits week 1? |
|---|---|---|---|---|---|
| Silhouette until caught | Creature-collecting games | No primary page loaded `(not verified)`. | 15 slots per town. Unknown = silhouette and "?". Caught = sprite. | S | yes |
| Progress state not by colour alone | Xbox games | [Xbox XAG 103](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/103): use shape, icon or text with colour. | Evolution stage = pips (0 to 6) and a word. Six pips match 1, 3, 7, 14, 30, 90 days. | S | yes |
| Detail card in plain words | Brilliant | [Brilliant About](https://brilliant.org/about/): simplest version first. | Show concept, 2–4 moves, "Next review: in 3 days". | S | yes |
| Filter: weakest first | (none) | `Opinion`. | A "Weak" filter. | M | later |

### B8. Tracking (30-day rate, calendar, weakest creatures)

| Pattern | Example game | Evidence (URL) | Suggestion for our screen | Effort | Fits week 1? |
|---|---|---|---|---|---|
| One big number, one small calendar | (none) | No primary source. `Opinion`. | 30-day rate as the big number. Calendar below. | S | yes |
| Calendar cells need more than colour | Xbox, WCAG | [WCAG 1.4.1](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html): colour is "not used as the only visual means of conveying information". | Done day = filled cell. 3-minute day = ring. Add a number. | S | yes |
| Weakest creatures with a reason | (none) | `Opinion`. | "Missed 2 of the last 3 reviews". Tap to open the creature. | S | yes |
| Few metrics | Brilliant | [Brilliant About](https://brilliant.org/about/): avoid too many incentives. | Show 3 numbers only. | S | yes |

### B9. Gym (monthly, 5 battles, win 4 of 5)

| Pattern | Example game | Evidence (URL) | Suggestion for our screen | Effort | Fits week 1? |
|---|---|---|---|---|---|
| Boss events give each person a fair outcome | Boot.dev | [Boot.dev Beat 2026-08](https://www.boot.dev/blog/news/bootdev-beat-2026-08): "Now your XP counts toward your own personal reward thresholds". | Show 5 slots with win or loss icons and a "4 needed" label. | M | later |
| Reuse the battle screen | (none) | `Opinion`. | No new screen type. Only a header and the 5 slots. | S | later |
| Fail with no blame | (none) | `Opinion`. | "3 of 5. Try again in 2 days." Do not use red-only. | S | later |

### B10. Comeback screen

| Pattern | Example game | Evidence (URL) | Suggestion for our screen | Effort | Fits week 1? |
|---|---|---|---|---|---|
| Low-stakes return | Brilliant | [Brilliant About](https://brilliant.org/about/): practice "designed to feel like low-stakes quizzes". | Offer one 3-minute reviews-only session. Cap the queue at 6 items. | S | yes |
| No blame words | (none) | No source. `Opinion`. | Copy: "Your creatures rested. Start with 3 minutes." No numbers about missed days. | S | yes |
| Calm animation, respects Reduce Motion | iOS apps | [MDN prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion). | Sleeping creature, 2-frame loop. Stop it under `reduce`. | S | yes |

### B11. Weekend editor (desktop)

| Pattern | Example game | Evidence (URL) | Suggestion for our screen | Effort | Fits week 1? |
|---|---|---|---|---|---|
| Doc on the left, diagram preview on the right | (tools) | [Mermaid usage](https://mermaid.js.org/config/usage.html): `mermaid.parse` throws on invalid syntax, or returns `false` with `suppressErrors`. | Parse on pause (debounce). On error, keep the last good diagram and show the error line. | M | no |
| Desktop only | (none) | `Opinion`. | On a phone, show "Open this on desktop." Do not build a phone editor. | S | later |
| Never lose the draft | iOS storage rules | [WebKit storage post](https://webkit.org/blog/14403/updates-to-storage-policy/): eviction can happen "when the system is under storage pressure". | Add "Export Markdown" and "Export backup (JSON)". | S | later |

---

## Section C: Top 10 upgrades

All ranks are `Opinion`. I ranked by effect on a 3–15 minute phone session and by effort.

| Rank | Upgrade | Why (Opinion) | Evidence |
|---|---|---|---|
| 1 | Show the threat before the choice | The player knows the stakes. The decision feels fair. | [Game Developer, Into the Breach](https://gamedeveloper.com/game-platforms/road-to-the-igf-subset-games-i-into-the-breach-i-) |
| 2 | One-sentence cause and effect after each turn | This is your core teaching moment. It must be easy to read. | Same source: "very clear how or why you failed" |
| 3 | Damage in words + number + pips | Do not use colour or numbers alone. | [Showdown text source](https://raw.githubusercontent.com/smogon/pokemon-showdown/master/data/text/default.ts) |
| 4 | Daily commit as three big buttons | One tap starts the day. | [web.dev](https://web.dev/articles/accessible-tap-targets) |
| 5 | Thumb layout and safe areas | Main buttons in the lower half, with bottom padding. | [WebKit blog](https://webkit.org/blog/7929/designing-websites-for-iphone-x/) |
| 6 | A writing step made for the phone keyboard | The "why" text is the hardest part on a phone. | [MDN VisualViewport](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport) |
| 7 | Type = colour + icon + word | Many people confuse some colours. | [Xbox XAG 103](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/103) |
| 8 | Short, skippable juice with a Reduce Motion path | Feels good on day 1, and stays fast on day 30. | [Game Developer, juice talk](https://www.gamedeveloper.com/design/video-is-your-game-juicy-enough-), [MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) |
| 9 | Short end screen: 30-day rate, one line, one next step | It replaces the streak. It must feel finished. | [Duolingo habit post](https://blog.duolingo.com/putting-in-work-the-habit-of-language-learning/) |
| 10 | Pixel font for headings only, integer pixel scaling | Keeps the style and keeps text readable. | [GAG](https://gameaccessibilityguidelines.com/use-simple-clear-text-formatting/), [MDN image-rendering](https://developer.mozilla.org/en-US/docs/Web/CSS/image-rendering) |

---

## Section D: Traps

| # | Trap | Why it hurts | Source |
|---|---|---|---|
| 1 | Using `navigator.vibrate` as feedback | It does nothing on iPhone. It also needs a user tap. | [MDN data](https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/Navigator.json), [MDN page](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/vibrate) |
| 2 | Type shown by colour only | Some players cannot tell the colours apart. | [WCAG 1.4.1](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html), [Xbox XAG 103](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/103) |
| 3 | Too much juice | Costs immersion and can block the text. | [Game Developer, Folmer Kelly](https://gamedeveloper.com/design/video-indies-resist-the-urge-to-juice-it-or-lose-it-) |
| 4 | Fast repeated flashes | WCAG says nothing should flash more than three times in one second. | [WCAG 2.3.1](https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html) |
| 5 | Rewards for easy actions | Boot.dev cut quiz XP because it "was too easy to XP farm". | [Boot.dev Beat 2026-08](https://www.boot.dev/blog/news/bootdev-beat-2026-08) |
| 6 | Too many game incentives | Brilliant says it avoids this to keep focus on learning. | [Brilliant About](https://brilliant.org/about/) |
| 7 | Sound as the only signal | Players may mute the phone. Others cannot hear. | [Apple HIG](https://developer.apple.com/design/human-interface-guidelines/accessibility), [GAG](https://gameaccessibilityguidelines.com/provide-captions-or-visuals-for-significant-background-sounds/) |
| 8 | Small tap targets, tight gaps | Missed taps. WCAG AA is 24 px. Apple default is 44 pt. web.dev says about 48 px. | [WCAG 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html), [Apple HIG](https://developer.apple.com/design/human-interface-guidelines/accessibility), [web.dev](https://web.dev/articles/accessible-tap-targets) |
| 9 | Trusting old thumb-zone maps | The author says to ignore his old drawings. People touch the centre most. | [UXmatters](https://www.uxmatters.com/mt/archives/2013/02/how-do-users-really-hold-mobile-devices.php) |
| 10 | App shell sized with `100vh` | MDN says `vh` equals `lvh`, the large viewport. Bottom buttons can hide when the toolbar shows. Use `dvh`. | [MDN length](https://developer.mozilla.org/en-US/docs/Web/CSS/length), [WebKit 15.4](https://webkit.org/blog/12445/new-webkit-features-in-safari-15-4/) |
| 11 | Sound that plays on load | Safari blocks it. Audio needs a user action. | [WebKit video policy](https://webkit.org/blog/6784/new-video-policies-for-ios/), [MDN Autoplay](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay) |
| 12 | Trusting local storage with no backup | Data can be removed under storage pressure. | [WebKit storage post](https://webkit.org/blog/14403/updates-to-storage-policy/) |
| 13 | Pixel font for paragraphs | No source says it is always unreadable. Guides ask for clear letters and a plain-font option. `Opinion`. | [GAG](https://gameaccessibilityguidelines.com/use-simple-clear-text-formatting/), [Xbox XAG 101](https://devdocs.xbox.com/build/game-principles/accessibility/xag-deep-dives/xag-101-text-display.md) |
| 14 | Thin or light font weights at small size | Apple says they are hard to see when small. | [Apple HIG Typography](https://developer.apple.com/design/human-interface-guidelines/typography) |
| 15 | Hearing "no streak" as "no habit tool" | Duolingo calls its streak a "cornerstone" and reports 2.4x next-day use at 7 days. This is company data, not proof. Your 30-day rate must work as the replacement. | [Duolingo habit post](https://blog.duolingo.com/putting-in-work-the-habit-of-language-learning/) |

---

## Section E: PWA and iOS technical facts

| Fact | Source | What it means for us |
|---|---|---|
| `navigator.vibrate` is **not supported** in Safari or iOS Safari. Chrome supports it since version 32. MDN marks it "limited availability". | [MDN data (Navigator.json)](https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/Navigator.json), [caniuse data](https://raw.githubusercontent.com/Fyrd/caniuse/main/features-json/vibration.json), [MDN page](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/vibrate) | No haptics on iPhone. Use `'vibrate' in navigator` only as a bonus on Android. Never rely on it. |
| MDN says `vibrate()` needs sticky user activation. It has no effect if the device has no vibration hardware. | [MDN vibrate](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/vibrate) | If you add it for Android, call it after a tap. |
| `<input type=checkbox switch>` shipped in Safari 17.4. The post does not mention haptics. | [WebKit 17.4](https://webkit.org/blog/15054/webkit-features-in-safari-17-4/) | Do not plan on a haptic trick. `(not verified)` |
| Apple default iOS control size is 44x44 pt. Minimum is 28x28 pt. About 12 pt padding around controls with a bezel. | [Apple HIG Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility) | Use 44 or more for all taps. Main buttons 56. |
| WCAG 2.2 target size: 24x24 CSS px (AA, 2.5.8). 44x44 CSS px (AAA, 2.5.5). | [2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html), [2.5.5](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html) | 24 is the legal floor. Aim for 44 and above. |
| web.dev advice: about 48 CSS px targets, about 8 px apart. | [web.dev](https://web.dev/articles/accessible-tap-targets) | Use 48 px for secondary buttons. |
| `viewport-fit=cover` lays the page out to the full screen. `env(safe-area-inset-*)` gives the safe distances. "Safe area insets are not a replacement for margins." | [WebKit blog](https://webkit.org/blog/7929/designing-websites-for-iphone-x/), [MDN env()](https://developer.mozilla.org/en-US/docs/Web/CSS/env) | Add the meta tag. Use `padding-bottom: max(16px, env(safe-area-inset-bottom))` on the bottom bar. |
| `svh`, `lvh`, `dvh` exist. `vh` equals `lvh`. `dvh` changes as the toolbar moves. | [WebKit 15.4](https://webkit.org/blog/12445/new-webkit-features-in-safari-15-4/), [MDN length](https://developer.mozilla.org/en-US/docs/Web/CSS/length) | Use `100dvh` for the shell. Do not animate layout with it. Whether a Home Screen app shows a toolbar: `(not verified)`. |
| Soft keyboard shrinks the visual viewport, not the layout viewport. | [MDN VisualViewport](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport) | The "why" box needs a test on a real iPhone. |
| Media with sound needs a user action to play. Video can autoplay only if muted or with no audio track. | [WebKit video policy](https://webkit.org/blog/6784/new-video-policies-for-ios/), [MDN Autoplay](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay) | Start audio on the first tap (Daily commit). |
| An `AudioContext` made outside a user gesture starts `suspended`. Call `resume()` inside a click. | [MDN Web Audio best practices](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices) | Create or resume the context in the Daily commit tap handler. |
| `navigator.audioSession` is in Safari 16.4 and later, but is marked experimental. MDN does not say it overrides the silent switch. | [MDN AudioSession](https://developer.mozilla.org/en-US/docs/Web/API/AudioSession), [MDN data](https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/AudioSession.json) | Silent-switch behaviour is `(not verified)`. Test on a real iPhone. Add a visible sound toggle. |
| `prefers-reduced-motion: reduce` is widely available. Scaling and panning can trigger vestibular problems. | [MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) | Wrap shake, zoom and slides in `@media (prefers-reduced-motion: no-preference)`. Use fades otherwise. |
| Apple: with Reduce Motion on, reduce zoom and scale. Replace slides with fades. WCAG 2.3.3 (AAA): motion from interaction can be turned off. | [Apple HIG](https://developer.apple.com/design/human-interface-guidelines/accessibility), [WCAG 2.3.3](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html) | Also add an in-app "Reduce effects" switch. GAG asks for an option to hide background movement. |
| `image-rendering: pixelated` scales to "the nearest integer multiple", then smooths to the final size. | [MDN image-rendering](https://developer.mozilla.org/en-US/docs/Web/CSS/image-rendering) | Pick a whole scale (x3 or x4 CSS px per art pixel). Check sprites on an iPhone. Behaviour at DPR 3 is `(not verified)`. |
| `steps()` easing makes stair-shaped frame jumps. | [MDN easing-function](https://developer.mozilla.org/en-US/docs/Web/CSS/easing-function) | Use it for sprite-sheet frames. The MDN page has no sprite example. |
| `touch-action: manipulation` turns off double-tap zoom. This removes the delay before `click`. | [MDN touch-action](https://developer.mozilla.org/en-US/docs/Web/CSS/touch-action) | Set it on buttons. Taps feel faster. |
| iOS and iPadOS 16.4: a site opens as a web app when its manifest sets `display` to `standalone` or `fullscreen`. Web Push is added for Home Screen web apps. The permission request must come from a direct user action. | [WebKit blog](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/) | Install to Home Screen is the right base. Push is optional and later. |
| Home Screen apps "have their own counter of days of use". WebKit did "not expect" their data to be deleted (2020). In 2023, WebKit said data can be evicted under storage pressure. | [WebKit 2020](https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/), [WebKit 2023](https://webkit.org/blog/14403/updates-to-storage-policy/) | Data is probably safe, but not guaranteed. Add "Export backup". |
| `navigator.clipboard.writeText` needs a secure context. | [MDN writeText](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText) | Run it in the tap handler. Offer a fallback text box. |
| Apple iOS text: default 17 pt, minimum 11 pt. Avoid ultralight, thin and light weights. | [Apple HIG Typography](https://developer.apple.com/design/human-interface-guidelines/typography) | Body text 16–17 px. Labels never below 12 px. `Opinion` on the exact CSS numbers. |
| Contrast: 4.5:1 for normal text, 3:1 for large text (WCAG 1.4.3). 3:1 for UI components and needed graphics (1.4.11). Apple uses the same numbers. | [WCAG 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), [WCAG 1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html), [Apple HIG](https://developer.apple.com/design/human-interface-guidelines/accessibility) | Check every type colour against its card with a contrast tool. Pixel palettes often fail 4.5:1. `Opinion` on the last point. |
| Flashing: nothing flashes more than three times in one second. | [WCAG 2.3.1](https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html) | One hit flash per hit. No strobe. |
| Colour must not be the only signal. Use shape, icon, pattern or text too. | [WCAG 1.4.1](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html), [Xbox XAG 103](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/103), [GAG](https://gameaccessibilityguidelines.com/ensure-no-essential-information-is-conveyed-by-a-fixed-colour-alone/) | Each type: colour, icon, word. |
| Captions: if a sound matters, add a caption or visual. | [GAG](https://gameaccessibilityguidelines.com/provide-captions-or-visuals-for-significant-background-sounds/), [Apple HIG](https://developer.apple.com/design/human-interface-guidelines/accessibility) | Every sound has a visual twin. A toast like "Strong hit" is enough. |
| Reading level: WCAG 3.1.5 (AAA) asks for text at lower secondary level, or a simpler version. | [WCAG 3.1.5](https://www.w3.org/WAI/WCAG22/Understanding/reading-level.html) | Your B1 rule matches this goal. |

### Pixel font: answer and reasons

- **Answer:** pixel font for headings and short labels (under about 4 words). Plain sans-serif for all sentences. `Opinion`.
- GAG: "ideally a clean sans serif font with distinct letter shapes". Stylised fonts should be an alternative ([GAG](https://gameaccessibilityguidelines.com/use-simple-clear-text-formatting/)).
- Xbox: "Include at least one sans-serif typeface option." Provide a non-stylised alternative to any stylistic font ([Xbox XAG 101](https://devdocs.xbox.com/build/game-principles/accessibility/xag-deep-dives/xag-101-text-display.md)).
- Apple: test game text for legibility on each platform. Larger size and visible background shapes help ([Apple HIG Typography](https://developer.apple.com/design/human-interface-guidelines/typography)).
- No primary source says pixel fonts are always hard to read. The risk is size, spacing and contrast.
- Add a "Plain font" setting. It switches all text, including headings.

---

## Not verified

- Slay the Spire intent icons: no primary page explains the design reason. The official Mega Crit page loaded, but it has no text on intent. The PC Gamer page had no readable article text.
- Reigns: Wikipedia confirms meters. I did not confirm that the game previews which meter a swipe will change. No primary page loaded (the Devolver page returned HTTP 403, the App Store URL returned 404).
- Into the Breach: I cited the Game Developer interview with Justin Ma. The GDC Vault page loaded only the abstract. I did not read the talk by Matthew Davis.
- Hearthstone UI: only the GDC Vault abstract was read. Marvel Snap UI: only the abstract and one trade article.
- Juice talks: the YouTube pages gave titles only. Game Developer gave a summary of "Is your game 'juicy' enough?" (GDC Europe, article dated 2013). I did not read the talk. I did not verify the shake numbers for Nuclear Throne.
- Coromon and Cassette Beasts battle UI: official pages and the Steam page did not give UI details. The Cassette Beasts page mentions alchemy and fusion only. I make no UI claim from them.
- Pokémon official battle UI: the official Scarlet and Violet page did not describe the battle screen. I used the Showdown source text and intro page only.
- Codédex: only the site description loaded ("fantasy land", XP, regions, badges). I did not verify that its look is pixel art. The About page returned no body text.
- Duolingo feedback timing for wrong answers: no primary page loaded. I only verified correct-answer animations and the habit post.
- Boot.dev lesson feedback: the home page and two blog posts did not describe lesson feedback. I cite only reward and boss changes. I did not read the 2024 note about removing the damage mechanic.
- Steam store pages could not be loaded by my tools.
- iOS input auto-zoom below 16px: only developer blogs found. No primary source.
- Whether a Home Screen web app shows a toolbar, and so how `dvh` behaves there: not checked.
- Whether `audioSession.type = "playback"` plays sound with the silent switch on: MDN does not say.
- Whether `image-rendering: pixelated` looks sharp at device pixel ratio 3: not checked. Test on a device.
- Thumb-zone: I found no Apple or W3C text about thumb zones.
- Whether `writeText` needs a tap on iOS: MDN page did not state it.
- All "Opinion" suggestions (timings, sizes, copy) are untested ideas, not facts.

## Sources

Fetched and used:

**Standards and platform docs**
- https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
- https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html
- https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html
- https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
- https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html
- https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html
- https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html
- https://www.w3.org/WAI/WCAG22/Understanding/reading-level.html
- https://developer.apple.com/design/human-interface-guidelines/accessibility (read via Apple's JSON feed)
- https://developer.apple.com/design/human-interface-guidelines/typography (read via Apple's JSON feed)
- https://developer.apple.com/design/human-interface-guidelines/layout (read via Apple's JSON feed; no claim used)
- https://developer.mozilla.org/en-US/docs/Web/API/Navigator/vibrate
- https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/Navigator.json
- https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/AudioSession.json
- https://raw.githubusercontent.com/Fyrd/caniuse/main/features-json/vibration.json
- https://developer.mozilla.org/en-US/docs/Web/CSS/env
- https://developer.mozilla.org/en-US/docs/Web/CSS/length
- https://developer.mozilla.org/en-US/docs/Web/CSS/image-rendering
- https://developer.mozilla.org/en-US/docs/Web/CSS/touch-action
- https://developer.mozilla.org/en-US/docs/Web/CSS/easing-function
- https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion
- https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay
- https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices
- https://developer.mozilla.org/en-US/docs/Web/API/AudioSession
- https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport
- https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText
- https://web.dev/articles/accessible-tap-targets
- https://webkit.org/blog/6784/new-video-policies-for-ios/
- https://webkit.org/blog/7929/designing-websites-for-iphone-x/
- https://webkit.org/blog/12445/new-webkit-features-in-safari-15-4/
- https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/
- https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/
- https://webkit.org/blog/14403/updates-to-storage-policy/
- https://webkit.org/blog/15054/webkit-features-in-safari-17-4/
- https://mermaid.js.org/config/usage.html

**Accessibility for games**
- https://gameaccessibilityguidelines.com/full-list/
- https://gameaccessibilityguidelines.com/use-simple-clear-text-formatting/
- https://gameaccessibilityguidelines.com/use-an-easily-readable-default-font-size/
- https://gameaccessibilityguidelines.com/ensure-no-essential-information-is-conveyed-by-a-fixed-colour-alone/
- https://gameaccessibilityguidelines.com/provide-captions-or-visuals-for-significant-background-sounds/
- https://devdocs.xbox.com/build/game-principles/accessibility/xag-deep-dives/xag-101-text-display.md
- https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/102
- https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/103

**Games and developers**
- https://gamedeveloper.com/game-platforms/road-to-the-igf-subset-games-i-into-the-breach-i-
- https://www.gdcvault.com/play/1025772/Into-the-Breach-Design-Postmortem
- https://www.gdcvault.com/play/1025731/Slay-the-Spire-Metrics-Driven
- https://www.gamedeveloper.com/game-platforms/road-to-the-igf-mega-crit-games-i-slay-the-spire-i-
- https://www.megacrit.com/
- https://en.wikipedia.org/wiki/Reigns_(video_game) (secondary)
- https://gdcvault.com/play/1022036/Hearthstone-How-to-Create-an
- https://gdcvault.com/play/1029024/Designing-MARVEL-SNAP
- https://mobilegamer.biz/second-dinner-reveals-the-secrets-of-marvel-snaps-onboarding-and-card-design/
- https://www.gamedeveloper.com/design/video-is-your-game-juicy-enough-
- https://gamedeveloper.com/design/video-indies-resist-the-urge-to-juice-it-or-lose-it-
- https://www.youtube.com/watch?v=Fy0aCDmgnxg (title only)
- https://www.youtube.com/watch?v=AJdEqssNZ-U (title only)
- https://pokemonshowdown.com/intro
- https://raw.githubusercontent.com/smogon/pokemon-showdown/master/data/text/default.ts
- https://www.pokemon.com/us/pokemon-video-games/pokemon-scarlet-and-pokemon-violet/ (no claim used)
- https://www.cassettebeasts.com/?p=620 (no claim used)

**Learning apps**
- https://blog.duolingo.com/new-duolingo-home-screen-design/
- https://blog.duolingo.com/building-character/
- https://blog.duolingo.com/duolingo-teaching-method/
- https://blog.duolingo.com/putting-in-work-the-habit-of-language-learning/
- https://brilliant.org/about/
- https://www.boot.dev/
- https://www.boot.dev/blog/news/bootdev-beat-2024-05/
- https://www.boot.dev/blog/news/bootdev-beat-2026-08
- https://www.codedex.io/ (meta description only)

**Research article**
- https://www.uxmatters.com/mt/archives/2013/02/how-do-users-really-hold-mobile-devices.php

Failed to load or gave no usable text: Apple HIG HTML pages (title only), Steam store pages, the Devolver Digital Reigns page (HTTP 403), the App Store Reigns page (HTTP 404), PC Gamer Slay the Spire page (no article text), the Codédex About page (title only).
