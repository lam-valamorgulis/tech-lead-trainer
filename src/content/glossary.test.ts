import { describe, expect, it } from "vitest";
import { glossarySegments, type GlossaryWord } from "./glossary.ts";

const glossary: GlossaryWord[] = [
  { word: "handshake", definition: "The first messages two computers send to agree how to talk." },
  { word: "TCP handshake", definition: "Three messages that open a TCP connection." },
  { word: "origin", definition: "The scheme, host and port of a page." },
  { word: "manipulator in the middle (MITM)", definition: "An attacker who reads or changes traffic between two sides." },
];

describe("glossarySegments", () => {
  it("marks a glossary word, keeps the text's own spelling, and leaves the rest plain", () => {
    expect(glossarySegments("The Origin of a page decides access.", glossary)).toEqual([
      { text: "The " },
      { text: "Origin", word: "origin", definition: "The scheme, host and port of a page." },
      { text: " of a page decides access." },
    ]);
  });

  it("matches whole words only", () => {
    expect(glossarySegments("The original origins.", glossary)).toEqual([{ text: "The original origins." }]);
  });

  it("prefers the longest term", () => {
    expect(glossarySegments("First the TCP handshake.", glossary)).toEqual([
      { text: "First the " },
      { text: "TCP handshake", word: "TCP handshake", definition: "Three messages that open a TCP connection." },
      { text: "." },
    ]);
  });

  it("matches the full term and its short form in brackets", () => {
    const long = glossarySegments("A manipulator in the middle reads it.", glossary);
    const short = glossarySegments("A MITM reads it.", glossary);
    expect(long[1]).toMatchObject({ text: "manipulator in the middle", word: "manipulator in the middle (MITM)" });
    expect(short[1]).toMatchObject({ text: "MITM", word: "manipulator in the middle (MITM)" });
  });

  it("handles terms with dots, plus signs and brackets, and a word at the very start", () => {
    const special: GlossaryWord[] = [
      { word: "top-level domain (TLD)", definition: "The last part of a domain name, like com." },
      { word: "C++", definition: "A programming language." },
    ];
    expect(glossarySegments("TLD and C++ code.", special).filter((s) => "word" in s).map((s) => s.text)).toEqual(["TLD", "C++"]);
    expect(glossarySegments("A top-level domain.", special)[1]).toMatchObject({ text: "top-level domain" });
  });

  it("marks only the first use of a word in one text, so a card does not fill with links", () => {
    const segments = glossarySegments("A handshake, then another handshake.", glossary);
    expect(segments.filter((segment) => "word" in segment)).toHaveLength(1);
    expect(segments.map((segment) => segment.text).join("")).toBe("A handshake, then another handshake.");
  });
});
