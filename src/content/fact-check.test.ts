import { describe, expect, it } from "vitest";
import { claimsDiffer, factCheckList, factReportProblem, formatFactCheckReport, quoteOnPage, type Finding } from "./fact-check.ts";
import { fixtureTown, fixtureTownV2 } from "./fixture-town.ts";
import { townSchema } from "./schema.ts";

const v1 = () => townSchema.parse(fixtureTown());
const v2 = () => fixtureTownV2();
const MDN = "https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching";

describe("factCheckList", () => {
  it("groups every claim of a town by the page that must support it", () => {
    const groups = factCheckList(v1());
    expect(groups.map((g) => g.url)).toEqual([MDN]);
    const where = groups[0].claims.map((c) => c.where);
    expect(where).toContain("t99.cache.card.text");
    expect(where).toContain("t99.cache.card.example");
    expect(where).toContain("t99.cache.catch");
    expect(where).toContain("t99.cache.review");
    expect(where).toContain("t99.cache.workedExample");
    expect(where).toContain("t99.cache.ttl.card.text");
  });

  it("writes a catch question with its right answer, and a review question with its answer", () => {
    const claims = factCheckList(v1())[0].claims;
    expect(claims.find((c) => c.where === "t99.cache.catch")?.text).toBe(
      "Q: Why does a browser keep a copy of a page? Right answer: To load it faster next time. Why: A saved copy can be shown without a new download.",
    );
    expect(claims.find((c) => c.where === "t99.cache.review")?.text).toBe(
      "Q: What does a cache keep? A: A copy of a response, so the next request can skip the download.",
    );
  });

  it("checks each battle turn against the page of its best move: model answer, key points and the best move's cost", () => {
    const claims = factCheckList(v1())[0].claims;
    const turn = claims.find((c) => c.where === "t99.t99-sale-day.turns.0");
    expect(turn?.text).toContain("Best move: TTL (cache.ttl)");
    expect(turn?.text).toContain("Model answer: Give the logo and styles a long TTL.");
    expect(turn?.text).toContain("Key points: The logo and styles rarely change. | A TTL lets browsers reuse their copy.");
  });

  it("adds the v1.5 texts: Lesson screens, the Constraint and the right Reason, and a scenario's own source", () => {
    const groups = factCheckList(v2());
    const all = groups.flatMap((g) => g.claims.map((c) => ({ ...c, url: g.url })));
    expect(all.find((c) => c.where === "t99.cache.lesson.screens.2")?.text).toBe("A cache keeps a copy of a response, so the next visit loads faster.");
    const situation = all.find((c) => c.where === "t99.t99-sale-day.turns.0.situation");
    expect(situation?.text).toContain("Constraint: The logo changes once a year.");
    const turn = all.find((c) => c.where === "t99.t99-sale-day.turns.0");
    expect(turn?.text).toContain("Constraint: The logo changes once a year.");
    expect(turn?.text).toContain("Right Reason: A rarely changed file is safe to keep for long.");
    expect(all.find((c) => c.where === "t99.cache.trade-off.fresh-prices")?.text).toContain("Right option: Cache the page but not the price");
  });

  it("checks the Town Intro, the placement answers and a v1.5 scenario's story against their pages", () => {
    const all = factCheckList(v2()).flatMap((g) => g.claims.map((c) => ({ ...c, url: g.url })));
    expect(all.find((c) => c.where === "t99.intro.screens.0")?.url).toBe(MDN);
    expect(all.find((c) => c.where === "t99.placement.0")?.text).toBe("Q: What does a cache keep? A: A copy of a response.");
    expect(all.find((c) => c.where === "t99.t99-sale-day.problem")?.url).toBe("https://www.cloudflare.com/learning/cdn/what-is-a-cdn/");
    expect(all.find((c) => c.where === "t99.t99-cache-diff.diff")?.text).toContain('res.set("Cache-Control", "max-age=3600")');
  });

  it("checks a v1.5 turn's situation against the incident, and its best move against the move's own page", () => {
    const all = factCheckList(v2()).flatMap((g) => g.claims.map((c) => ({ ...c, url: g.url })));
    expect(all.find((c) => c.where === "t99.t99-sale-day.turns.0.situation")?.url).toBe("https://www.cloudflare.com/learning/cdn/what-is-a-cdn/");
    expect(all.find((c) => c.where === "t99.t99-sale-day.turns.0")?.url).toBe(MDN);
  });

  it("still lists a turn that has no page to check it against, so the report shows it", () => {
    const town = v1();
    // A best move of another town, and no scenario source: there is no page for this turn.
    town.scenarios[0].turns[0].moves[0].moveId = "rate-limit.quota";
    const noSource = factCheckList(town).find((g) => g.url === "");
    expect(noSource?.claims.map((c) => c.where)).toContain("t99.t99-sale-day.turns.0");
  });

  it("leaves out retired items and retired scenarios", () => {
    const town = v1();
    town.creatures[0].retired = true;
    for (const scenario of town.scenarios) scenario.retired = true;
    const where = factCheckList(town).flatMap((g) => g.claims.map((c) => c.where));
    expect(where.some((w) => w.startsWith("t99.cache.") || w.includes("t99-"))).toBe(false);
  });
});

describe("formatFactCheckReport", () => {
  const groups = [
    {
      url: MDN,
      title: "MDN: HTTP caching",
      claims: [
        { where: "t99.cache.card.text", text: "A cache keeps a copy." },
        { where: "t99.cache.review", text: "Q: What does a cache keep? A: A copy." },
        { where: "t99.cache.catch", text: "Q: Why? Right answer: Speed." },
      ],
    },
  ];

  it("marks a finding without a quote, and a claim with no finding, as check by hand", () => {
    const findings: Finding[] = [
      { where: "t99.cache.card.text", verdict: "supported", quote: "A cache stores a copy of a response." },
      { where: "t99.cache.review", verdict: "supported" },
    ];
    const report = formatFactCheckReport("t99", groups, findings);
    expect(report).toContain("| Supported, with a quote | 1 |");
    expect(report).toContain("| Check by hand | 2 |");
    expect(report).toContain("- `t99.cache.review`: check by hand. The reviewer gave no quote.");
    expect(report).toContain("- `t99.cache.catch`: check by hand. No reviewer checked it.");
  });

  it("lists wrong claims first, with the page's words, and folds the supported ones", () => {
    const findings: Finding[] = [
      { where: "t99.cache.card.text", verdict: "supported", quote: "A cache stores a copy." },
      { where: "t99.cache.review", verdict: "wrong", quote: "Caches store responses, not requests.", note: "The answer says request." },
      { where: "t99.cache.catch", verdict: "supported", quote: "faster" },
    ];
    const report = formatFactCheckReport("t99", groups, findings);
    expect(report.indexOf("## Wrong or not on the page")).toBeLessThan(report.indexOf("<details>"));
    expect(report).toContain('- `t99.cache.review`: The answer says request. Page: "Caches store responses, not requests." (MDN: HTTP caching)');
    expect(report).toContain('- `t99.cache.card.text`: "A cache stores a copy."');
  });

  it("says plainly when every claim is supported with a quote", () => {
    const findings: Finding[] = groups[0].claims.map((c) => ({ where: c.where, verdict: "supported", quote: `Words for ${c.where}.` }));
    expect(formatFactCheckReport("t99", groups, findings)).toContain("Every claim is supported by a quote from its page.");
  });
});

describe("the report never hides a problem", () => {
  const claims = ["a", "b", "c", "d"].map((x) => ({ where: `t99.${x}`, text: x }));
  const groups = [{ url: MDN, title: "MDN: HTTP caching", claims }, { url: "", title: "No source", claims: [{ where: "t99.turn", text: "t" }] }];

  it("lists a claim with no page as check by hand", () => {
    const report = formatFactCheckReport("t99", groups, [{ where: "t99.turn", verdict: "supported", quote: "x" }]);
    expect(report).toContain("- `t99.turn`: check by hand. It has no page to check it against.");
  });

  it("lists two findings for one claim as check by hand, so a later 'supported' cannot hide a 'wrong'", () => {
    const report = formatFactCheckReport("t99", groups, [
      { where: "t99.a", verdict: "wrong", quote: "No.", note: "Wrong." },
      { where: "t99.a", verdict: "supported", quote: "Yes." },
    ]);
    expect(report).toContain("- `t99.a`: check by hand. It has 2 findings that may disagree.");
  });

  it("lists a quote that backs 3 or more items as check by hand: one sentence cannot prove them all", () => {
    const findings: Finding[] = ["a", "b", "c"].map((x) => ({ where: `t99.${x}`, verdict: "supported", quote: "HTTP is a protocol." }));
    findings.push({ where: "t99.d", verdict: "supported", quote: "A different sentence." });
    const report = formatFactCheckReport("t99", groups, findings);
    expect(report).toContain("- `t99.a`: check by hand. The same quote backs claims of 3 different items.");
    expect(report).toContain('- `t99.d`: "A different sentence."');
  });

  it("lets the card, catch question and review of one item share a quote: they say the same fact", () => {
    const item = ["card.text", "catch", "review"].map((field) => ({ where: `t99.dns.${field}`, text: field }));
    const one = [{ url: MDN, title: "MDN", claims: item }];
    const findings: Finding[] = item.map((c) => ({ where: c.where, verdict: "supported", quote: "DNS turns names into addresses." }));
    expect(formatFactCheckReport("t99", one, findings)).toContain("| Supported, with a quote | 3 |");
  });

  it("lists a quote that is not on the page as check by hand, when the pages were read", () => {
    const report = formatFactCheckReport("t99", groups, [{ where: "t99.a", verdict: "supported", quote: "Made up." }], {
      quoteFound: () => false,
    });
    expect(report).toContain("- `t99.a`: check by hand. The quote is not on the page.");
  });

  it("names findings for a claim that does not exist, for example a typo in the id", () => {
    const report = formatFactCheckReport("t99", groups, [{ where: "t99.zzz", verdict: "supported", quote: "x" }]);
    expect(report).toContain("## Findings for no claim");
    expect(report).toContain("- `t99.zzz`");
  });
});

describe("quoteOnPage", () => {
  const page = "<main><p>The <code>max-age</code> directive   says how long a response stays <em>fresh</em>.</p></main>";

  it("finds a quote in the page text, whatever the tags, spaces, quote marks and capitals", () => {
    expect(quoteOnPage(page, "The max-age directive says how long a response stays fresh.")).toBe(true);
    expect(quoteOnPage(page, "the MAX-AGE directive says how long")).toBe(true);
  });

  it("finds a list that the reviewer copied as one line", () => {
    const list = "<ol><li>Informational responses (<code>100</code> – <code>199</code>)</li><li>Successful responses</li></ol>";
    expect(quoteOnPage(list, "Informational responses (100 - 199), Successful responses")).toBe(true);
  });

  it("finds parts joined by an ellipsis, in page order only", () => {
    expect(quoteOnPage(page, "The max-age directive … stays fresh.")).toBe(true);
    expect(quoteOnPage(page, "stays fresh ... The max-age directive")).toBe(false);
  });

  it("does not find words that are not on the page", () => {
    expect(quoteOnPage(page, "The max-age directive says how long a request stays fresh.")).toBe(false);
  });
});

describe("factReportProblem", () => {
  const report = "## Fact check report\n\nFull report: https://github.com/o/r/pull/1#issuecomment-123";

  it("needs nothing from a PR that does not change a town file", () => {
    expect(factReportProblem(["src/app/page.tsx", "content/README.md"], "")).toBeNull();
  });

  it("needs the report section and a link to the report comment when a town file changes", () => {
    expect(factReportProblem(["content/towns/t01.json"], report)).toBeNull();
    expect(factReportProblem(["content/towns/t02.json"], "## Summary")).toBe(
      'This PR changes the claims of content/towns/t02.json. Its body needs a "## Fact check report" section with a link to the report comment (docs/agents/fact-check.md).',
    );
    expect(factReportProblem(["content/towns/t02.json"], "## Fact check report\n\nLater.")).not.toBeNull();
  });
});

describe("claimsDiffer", () => {
  it("is false for a display-only change, such as a sprite number", () => {
    const before = v1();
    const after = v1();
    after.creatures[0].sprite = 40;
    expect(claimsDiffer(before, after)).toBe(false);
  });

  it("is true when a text the fact check reads changes, and for a new town file", () => {
    const after = v1();
    after.creatures[0].card.text = "A cache keeps every copy forever.";
    expect(claimsDiffer(v1(), after)).toBe(true);
    expect(claimsDiffer(null, v1())).toBe(true);
  });
});
