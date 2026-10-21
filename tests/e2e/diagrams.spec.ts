import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

// Every diagram of the shipped content (Town Intros and Lesson screens) must draw. The content
// check sees only its first word; Mermaid itself needs a browser, so this runs in seam C.

type Town = {
  id: string;
  intro?: { diagram: string };
  creatures: { id: string; lesson?: { screens: { diagram?: string }[] }; moves: { id: string; lesson?: { screens: { diagram?: string }[] } }[] }[];
};

function diagramsOf(bundleFile: string): [string, string][] {
  const { towns } = JSON.parse(readFileSync(bundleFile, "utf8")) as { towns: Town[] };
  return towns.flatMap((town) => [
    ...(town.intro ? [[`${town.id}.intro`, town.intro.diagram] as [string, string]] : []),
    ...town.creatures
      .flatMap((creature) => [creature, ...creature.moves])
      .flatMap((item) =>
        (item.lesson?.screens ?? []).flatMap((screen, i): [string, string][] => (screen.diagram ? [[`${item.id}.lesson.screens.${i}`, screen.diagram]] : [])),
      ),
  ]);
}

test("every diagram of the real and the fixture content is valid Mermaid", async ({ page }) => {
  const diagrams = [...diagramsOf("src/content/bundle.generated.json"), ...diagramsOf("src/content/fixture.generated.json")];
  await page.addScriptTag({ content: readFileSync("node_modules/mermaid/dist/mermaid.min.js", "utf8") });
  const broken = await page.evaluate(async (all) => {
    const mermaid = (window as unknown as { mermaid: { initialize: (o: object) => void; parse: (s: string) => Promise<unknown> } }).mermaid;
    mermaid.initialize({ startOnLoad: false });
    const problems: string[] = [];
    for (const [where, source] of all) {
      try {
        await mermaid.parse(source);
      } catch (error) {
        problems.push(`${where}: ${String((error as Error).message).split("\n")[0]}`);
      }
    }
    return problems;
  }, diagrams);
  expect(broken).toEqual([]);
});
