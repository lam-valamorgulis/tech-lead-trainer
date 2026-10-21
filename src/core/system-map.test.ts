import { describe, expect, it } from "vitest";
import { buildBundle } from "@/content/bundle";
import { fixtureTownV2, fixtureTwistTown } from "@/content/fixture-town";
import { townSchema } from "@/content/schema";
import { SYSTEM_EDGE_IDS, SYSTEM_NODE_IDS, SYSTEM_PLACE_IDS } from "@/content/system-nodes";
import type { CatchRecord } from "./catch.ts";
import { reviewStates, type ReviewRecord } from "./review.ts";
import { systemMap, systemNodeOf, type SystemMapView } from "./system-map.ts";

// Ticket #112: the System Map. Seam A: the placement rule from the content node ids.

const caught = (itemId: string, learningDay = "2026-10-01"): CatchRecord => ({ itemId, correct: true, learningDay });
const missed = (itemId: string): CatchRecord => ({ itemId, correct: false, learningDay: "2026-10-01" });

/** Fixture Town (t99): Cache at cache, Cookie at browser, Proxy at cdn. Fixture Town Two (t98): every creature at api. */
function towns(edit?: (t99: ReturnType<typeof fixtureTownV2>, t98: ReturnType<typeof fixtureTwistTown>) => void) {
  const t99 = fixtureTownV2();
  const t98 = fixtureTwistTown();
  edit?.(t99, t98);
  return buildBundle([t99, townSchema.parse(t98)]).towns;
}

const ids = (view: SystemMapView, node: string) =>
  [...view.places, ...view.edges, view.ring].find((spot) => spot.id === node)!.creatures.map((creature) => creature.id);

describe("the System Map node ids", () => {
  it("are the 6 places of design 6.2 in request order, the links between them, and the outer ring", () => {
    expect(SYSTEM_PLACE_IDS).toEqual(["browser", "cdn", "api", "cache", "database", "queue"]);
    expect(SYSTEM_EDGE_IDS).toEqual(["browser-cdn", "cdn-api", "api-cache", "cache-database", "database-queue"]);
    expect(SYSTEM_NODE_IDS).toHaveLength(12);
  });

  it("are refused by the content schema when they are not on the list", () => {
    const town = fixtureTwistTown();
    expect(townSchema.safeParse({ ...town, systemNode: "server" }).success).toBe(false);
    expect(townSchema.safeParse({ ...town, systemNode: "api" }).success).toBe(true);
  });
});

describe("systemNodeOf: the placement rule", () => {
  const [t99, t98] = towns();

  it("uses the creature's own node first", () => {
    expect(systemNodeOf(t99.creatures[0], t99)).toBe("cache");
    expect(systemNodeOf(t99.creatures[1], t99)).toBe("browser");
  });

  it("uses the town's node for a creature that names none", () => {
    expect(t98.creatures[0].systemNode).toBeUndefined();
    expect(systemNodeOf(t98.creatures[0], t98)).toBe("api");
  });

  it("puts a creature with no node and no town node on the outer ring, so a caught creature never goes missing", () => {
    const [, noNode] = towns((_, two) => Object.assign(two, { systemNode: undefined }));
    expect(systemNodeOf(noNode.creatures[0], noNode)).toBe("ring");
  });
});

describe("systemMap", () => {
  it("draws the 6 places in request order, each with the link to the next one", () => {
    const view = systemMap(towns(), [], []);
    expect(view.places.map((place) => place.id)).toEqual([...SYSTEM_PLACE_IDS]);
    expect(view.edges.map((edge) => [edge.from, edge.to])).toEqual([
      ["browser", "cdn"],
      ["cdn", "api"],
      ["api", "cache"],
      ["cache", "database"],
      ["database", "queue"],
    ]);
    for (const edge of view.edges) expect(edge.id).toBe(`${edge.from}-${edge.to}`);
  });

  it("hides every place as ??? while nothing is caught", () => {
    const view = systemMap(towns(), [], []);
    expect(view.caughtCount).toBe(0);
    expect(view.places.map((place) => place.name)).toEqual([null, null, null, null, null, null]);
    expect(view.places.every((place) => place.creatures.length === 0)).toBe(true);
    expect(view.edges.map((edge) => edge.label)).toContain("Between ??? and ???");
  });

  it("puts each caught creature at its place and names that place", () => {
    const view = systemMap(towns(), [caught("cache"), caught("cookie")], []);
    expect(ids(view, "cache")).toEqual(["cache"]);
    expect(ids(view, "browser")).toEqual(["cookie"]);
    expect(view.places.find((place) => place.id === "browser")!.name).toBe("Browser");
    expect(view.places.find((place) => place.id === "cdn")!.name).toBeNull();
    expect(view.edges[0].label).toBe("Between Browser and ???");
    expect(view.caughtCount).toBe(2);
  });

  it("shows only caught creatures: not one met with a wrong answer, and not a caught move alone", () => {
    const view = systemMap(towns(), [missed("proxy"), caught("cache.ttl")], []);
    expect(view.caughtCount).toBe(0);
    expect(ids(view, "cdn")).toEqual([]);
    expect(ids(view, "cache")).toEqual([]);
  });

  it("gathers creatures of every town, in town order and then file order", () => {
    const view = systemMap(towns((one) => Object.assign(one.creatures[2], { systemNode: "api" })), [caught("rate-limit"), caught("proxy"), caught("api-key")], []);
    expect(ids(view, "api")).toEqual(["proxy", "rate-limit", "api-key"]);
    expect(view.places.find((place) => place.id === "api")!.creatures.map((creature) => creature.townNumber)).toEqual([1, 2, 2]);
  });

  it("puts creatures on a link and on the outer ring", () => {
    const view = systemMap(
      towns((one) => {
        Object.assign(one.creatures[0], { systemNode: "browser-cdn" });
        Object.assign(one.creatures[1], { systemNode: "ring" });
      }),
      [caught("cache"), caught("cookie")],
      [],
    );
    expect(ids(view, "browser-cdn")).toEqual(["cache"]);
    expect(ids(view, "ring")).toEqual(["cookie"]);
    // A creature on a link or on the ring does not name a place.
    expect(view.places.every((place) => place.name === null)).toBe(true);
  });

  it("keeps a retired creature that was caught, and leaves out one that was not", () => {
    const retired = towns((one) => {
      Object.assign(one.creatures[0], { retired: true });
      Object.assign(one.creatures[1], { retired: true });
    });
    const view = systemMap(retired, [caught("cache")], []);
    expect(ids(view, "cache")).toEqual(["cache"]);
    expect(ids(view, "browser")).toEqual([]);
  });

  it("gives each creature its sprite and its evolution stage, as the Field Guide does", () => {
    const records = [caught("cache")];
    const reviews: ReviewRecord[] = [];
    for (let i = 0; i < 3; i++) {
      const state = reviewStates(records, reviews).get("cache")!;
      reviews.push({ itemId: "cache", learningDay: state.dueDay!, grade: "good" });
    }
    const [creature] = systemMap(towns(), records, reviews).places.find((place) => place.id === "cache")!.creatures;
    expect(creature).toEqual({ id: "cache", name: "Cache", sprite: 12, stage: 2, townNumber: 1 });
  });
});
