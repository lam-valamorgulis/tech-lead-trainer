import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// A merge once dropped one closing brace in globals.css (#110). The browser then read every rule
// after it as nested inside one selector, so none of them applied, and nothing else failed.

describe("globals.css", () => {
  it("closes every brace it opens, in order", () => {
    const css = readFileSync("src/app/globals.css", "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    let depth = 0;
    let lowest = 0;
    for (const char of css) {
      if (char === "{") depth += 1;
      if (char === "}") depth -= 1;
      lowest = Math.min(lowest, depth);
    }
    expect({ depth, lowest }).toEqual({ depth: 0, lowest: 0 });
  });
});
