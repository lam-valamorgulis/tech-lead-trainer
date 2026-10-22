// The System Map (design 6.2, ticket #112): one real web system, with each caught creature at its
// place. Pure functions: no clock, no database.
import type { BundledCreature, BundledTown } from "@/content/bundle";
import {
  SYSTEM_EDGE_IDS,
  SYSTEM_PLACE_IDS,
  SYSTEM_RING_ID,
  type SystemEdgeId,
  type SystemNodeId,
  type SystemPlaceId,
} from "@/content/system-nodes";
import { caughtIds, type CatchRecord } from "./catch.ts";
import { reviewStates, type ReviewRecord, type Stage } from "./review.ts";

/** The name and a one-line meaning of each place, shown once the learner caught a creature there. */
export const PLACE_LOOK: Record<SystemPlaceId, { name: string; hint: string }> = {
  browser: { name: "Browser", hint: "Where the user's request starts." },
  cdn: { name: "CDN", hint: "Servers near the user that keep copies." },
  api: { name: "API", hint: "Your code that answers each request." },
  cache: { name: "Cache", hint: "Fast memory for answers you reuse." },
  database: { name: "Database", hint: "Where the data is kept for good." },
  queue: { name: "Queue", hint: "Work saved to do later." },
};

/** The outer ring's name and meaning, shown once the learner caught a creature there. */
export const RING_LOOK = { name: "Around the system", hint: "Ideas that cover every place, such as tests and security." };

/** What a place shows before the learner caught a creature there, as in the Field Guide. */
export const HIDDEN_NAME = "???";

export type SystemMapCreature = {
  id: string;
  name: string;
  /** The species of its art (#99), when the content has one. */
  sprite?: number;
  /** 1 when caught, then 2 and 3 as reviews pass (design 5). Stages 2 and 3 use the second palette. */
  stage: Stage;
};

export type SystemMapPlace = {
  id: SystemPlaceId;
  /** Null while no creature is caught at this place: the screen shows "???". */
  name: string | null;
  hint: string | null;
  creatures: SystemMapCreature[];
};

export type SystemMapEdge = {
  id: SystemEdgeId;
  from: SystemPlaceId;
  to: SystemPlaceId;
  /** "Between Browser and CDN", with "???" for a place not named yet. */
  label: string;
  creatures: SystemMapCreature[];
};

export type SystemMapView = {
  /** The 6 places, from the browser down to the queue. */
  places: SystemMapPlace[];
  /** edges[i] links places[i] and places[i + 1]. */
  edges: SystemMapEdge[];
  /** The outer ring, for creatures of towns that are not one part of the system. */
  ring: { id: typeof SYSTEM_RING_ID; name: string | null; hint: string | null; creatures: SystemMapCreature[] };
  caughtCount: number;
};

/**
 * The placement rule: the creature's own node, else its town's node, else the outer ring. The
 * ring is the last step, so a caught creature always shows somewhere, also in a town whose
 * content names no node yet.
 */
export function systemNodeOf(creature: Pick<BundledCreature, "systemNode">, town: Pick<BundledTown, "systemNode">): SystemNodeId {
  return creature.systemNode ?? town.systemNode ?? SYSTEM_RING_ID;
}

/**
 * The System Map of one learner: each creature they caught, in any town, at its node. Moves are
 * not drawn: the map shows concepts. A retired creature stays on the map of someone who caught it.
 */
export function systemMap(towns: BundledTown[], records: CatchRecord[], reviews: ReviewRecord[]): SystemMapView {
  const caught = caughtIds(records);
  const states = reviewStates(records, reviews);
  const atNode = new Map<SystemNodeId, SystemMapCreature[]>();
  for (const town of [...towns].sort((a, b) => a.number - b.number)) {
    for (const creature of town.creatures) {
      if (!caught.has(creature.id)) continue;
      const node = systemNodeOf(creature, town);
      const list = atNode.get(node) ?? [];
      list.push({
        id: creature.id,
        name: creature.name,
        sprite: creature.sprite,
        stage: states.get(creature.id)?.stage ?? 1,
      });
      atNode.set(node, list);
    }
  }
  const creaturesAt = (node: SystemNodeId) => atNode.get(node) ?? [];

  const places: SystemMapPlace[] = SYSTEM_PLACE_IDS.map((id) => {
    const creatures = creaturesAt(id);
    const known = creatures.length > 0;
    return { id, name: known ? PLACE_LOOK[id].name : null, hint: known ? PLACE_LOOK[id].hint : null, creatures };
  });
  const nameOrHidden = (i: number) => places[i].name ?? HIDDEN_NAME;
  const edges: SystemMapEdge[] = SYSTEM_EDGE_IDS.map((id, i) => {
    const [from, to] = [SYSTEM_PLACE_IDS[i], SYSTEM_PLACE_IDS[i + 1]];
    return { id, from, to, label: `Between ${nameOrHidden(i)} and ${nameOrHidden(i + 1)}`, creatures: creaturesAt(id) };
  });
  const ringCreatures = creaturesAt(SYSTEM_RING_ID);
  const ringKnown = ringCreatures.length > 0;
  const ring = {
    id: SYSTEM_RING_ID,
    name: ringKnown ? RING_LOOK.name : null,
    hint: ringKnown ? RING_LOOK.hint : null,
    creatures: ringCreatures,
  };
  const caughtCount = [...atNode.values()].reduce((sum, list) => sum + list.length, 0);
  return { places, edges, ring, caughtCount };
}
