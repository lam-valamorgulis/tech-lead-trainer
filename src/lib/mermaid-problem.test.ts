import { describe, expect, it } from "vitest";
import { mermaidProblem } from "./mermaid-problem.ts";

// Real messages from mermaid 12.1.0 `mermaid.parse`.
const ARROW_WITHOUT_TEXT =
  "Parse error on line 3:\n...GET  API--> Browser\n----------------------^\nExpecting 'TXT', got 'NEWLINE'";
const CUT_OFF = "Parse error on line 4:\ngraph TD  A-->\n--------------^\nExpecting 'AMP', 'COLON', got 'EOF'";
const NO_TYPE = "No diagram type detected matching given configuration for text: sequenceDiagrm\n A->>B: x";
const EMPTY = "No diagram type detected matching given configuration for text: ";

describe("mermaidProblem", () => {
  it("names the line of a mistake in plain words", () => {
    expect(mermaidProblem(ARROW_WITHOUT_TEXT)).toBe(
      "The diagram has a mistake on line 3. Check the arrows and the names on that line.",
    );
  });

  it("says when the diagram stops before it is finished", () => {
    expect(mermaidProblem(CUT_OFF)).toBe("The diagram ends before it is finished. Check the last line.");
  });

  it("asks for a diagram type on the first line, or for any text at all", () => {
    expect(mermaidProblem(NO_TYPE)).toBe(
      "The first line must name the diagram type, such as sequenceDiagram or flowchart TD.",
    );
    expect(mermaidProblem(EMPTY)).toBe("The diagram is empty. Start with a type, such as sequenceDiagram or flowchart TD.");
  });

  it("never shows Mermaid's own words for an error it does not know", () => {
    expect(mermaidProblem("Lexical error on line 2. Unrecognized text.")).toBe(
      "The diagram has a mistake on line 2. Check the arrows and the names on that line.",
    );
    expect(mermaidProblem("Something else broke")).toBe("The diagram could not be drawn. Check each line.");
  });
});
