import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseBoss } from "./weekend.ts";

const sample = [
  "# Weekend 1 boss: the new checkout page",
  "",
  "Time: 45 minutes.",
  "",
  "## The situation (example made up)",
  "",
  "A shop moves its checkout page to `checkout.shop.example`.",
  "The shop API stays at `api.shop.example`.",
  "On the first test day, three things go wrong:",
  "",
  "1. The browser blocks every call.",
  "2. The login cookie does not reach the API.",
  "",
  "You are the tech lead.",
  "",
  "## Facts you may use",
  "",
  "Not part of the situation.",
  "",
  "## Mermaid diagram starter",
  "",
  "```mermaid",
  "sequenceDiagram",
  "  Browser->>API: OPTIONS",
  "```",
  "",
  "## Coach prompt",
  "",
  "Paste this into a new chat.",
  "",
  "```text",
  "You are my tech lead coach.",
  "Ask me ONE question at a time.",
  "```",
].join("\n");

describe("parseBoss", () => {
  it("reads the title, the situation as paragraphs and lists, and the Mermaid starter", () => {
    expect(parseBoss(sample)).toEqual({
      title: "Weekend 1 boss: the new checkout page",
      situation: [
        {
          kind: "paragraph",
          text: "A shop moves its checkout page to `checkout.shop.example`. The shop API stays at `api.shop.example`. On the first test day, three things go wrong:",
        },
        { kind: "list", items: ["The browser blocks every call.", "The login cookie does not reach the API."] },
        { kind: "paragraph", text: "You are the tech lead." },
      ],
      mermaidStarter: "sequenceDiagram\n  Browser->>API: OPTIONS",
      coachPrompt: "You are my tech lead coach. Ask me ONE question at a time.",
    });
  });

  it("refuses a file without a title or a situation, so a broken boss fails the content build", () => {
    expect(() => parseBoss("## The situation\n\nText.")).toThrow("The boss file needs a # title.");
    expect(() => parseBoss("# Boss\n\nNo situation here.")).toThrow('The boss file needs a "## The situation" section.');
  });

  it("reads the real month 1 boss", () => {
    const boss = parseBoss(readFileSync("content/weekends/month-01/week-1-boss.md", "utf8"));
    expect(boss.title).toBe("Weekend 1 boss: the new checkout page");
    expect(boss.situation.length).toBeGreaterThan(0);
    expect(boss.mermaidStarter.startsWith("sequenceDiagram")).toBe(true);
    expect(boss.coachPrompt).toMatch(/^You are my tech lead coach\. Below is my design doc/);
  });

  it("has no coach prompt when the file has none, so the app uses its default", () => {
    expect(parseBoss("# Boss\n\n## The situation\n\nText.").coachPrompt).toBeNull();
  });
});
