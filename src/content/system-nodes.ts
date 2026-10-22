// The System Map node ids (design 6.2, ticket #112). Content puts each creature on one node.
// An id never changes its meaning. The display names and the drawing live in src/core/system-map.ts.
// A node id is display only: it is not in the content hash and not in any learner's data.

/** The 6 places of the system, from top to bottom: the path of one request (design 6.2). */
export const SYSTEM_PLACE_IDS = ["browser", "cdn", "api", "cache", "database", "queue"] as const;

/** The links between two places next to each other, named "<upper place>-<lower place>". */
export const SYSTEM_EDGE_IDS = ["browser-cdn", "cdn-api", "api-cache", "cache-database", "database-queue"] as const;

/** The outer ring: for towns that are not one part of the system, such as Testing or Security. */
export const SYSTEM_RING_ID = "ring" as const;

export const SYSTEM_NODE_IDS = [...SYSTEM_PLACE_IDS, ...SYSTEM_EDGE_IDS, SYSTEM_RING_ID] as const;

export type SystemPlaceId = (typeof SYSTEM_PLACE_IDS)[number];
export type SystemEdgeId = (typeof SYSTEM_EDGE_IDS)[number];
export type SystemNodeId = (typeof SYSTEM_NODE_IDS)[number];
