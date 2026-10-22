import { describe, expect, it } from "vitest";
import { contentHash } from "./bundle.ts";
import bundle from "./bundle.generated.json";

// Ticket #112: the shipped towns put every creature on the System Map by a content node id.
describe("System Map nodes in the shipped content (#112)", () => {
  // Every shipped town, so a new town file fails here until its creatures have a place.
  const shipped = bundle.towns;

  it("gives every creature of every shipped town a node, from the creature or from its town", () => {
    const withoutNode = shipped.flatMap((town) =>
      town.creatures.filter((creature) => !("systemNode" in creature) && !("systemNode" in town)).map((creature) => creature.id),
    );
    expect(withoutNode).toEqual([]);
  });

  it("keeps a node out of the content hash, so placing a creature changes no learner's data", () => {
    const [town] = shipped;
    const creature = town.creatures.find((item) => "systemNode" in item)!;
    const { lesson, catch: question, card, review, workedExample } = creature as typeof creature & { lesson?: unknown };
    expect(creature.hash).toBe(contentHash({ lesson, catch: question, card, review, workedExample }));
  });
});
