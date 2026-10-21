import { describe, expect, it } from "vitest";
import { factCheckList, formatFactCheckReport, type Finding } from "./fact-check.ts";
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
    expect(all.find((c) => c.where === "t99.cache.lesson.screens.2")?.text).toBe("A cache keeps a copy, so the next visit loads faster.");
    const turn = all.find((c) => c.where === "t99.t99-sale-day.turns.0");
    expect(turn?.url).toBe("https://www.cloudflare.com/learning/cdn/what-is-a-cdn/");
    expect(turn?.text).toContain("Constraint: The logo changes once a year.");
    expect(turn?.text).toContain("Right Reason: A rarely changed file is safe to keep for long.");
    expect(all.find((c) => c.where === "t99.cache.trade-off.fresh-prices")?.text).toContain("Right option: Cache the page but not the price");
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
    const findings: Finding[] = groups[0].claims.map((c) => ({ where: c.where, verdict: "supported", quote: "yes" }));
    expect(formatFactCheckReport("t99", groups, findings)).toContain("Every claim is supported by a quote from its page.");
  });
});
