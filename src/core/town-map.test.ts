import { describe, expect, it } from "vitest";
import { currentTownNumber, ROADMAP } from "./roadmap.ts";
import { MAP_SPOTS, MAP_TILES, parseTownNumber, roadPieces, townLinks, townState } from "./town-map.ts";

// Ticket #111: the pixel map of the 12 towns (design 5).

describe("townState", () => {
  it("keeps the town state rule: towns before the learner's town are past, later ones are locked", () => {
    expect(ROADMAP.map(({ number }) => townState(number, 3))).toEqual([
      "past",
      "past",
      "current",
      "locked",
      "locked",
      "locked",
      "locked",
      "locked",
      "locked",
      "locked",
      "locked",
      "locked",
    ]);
  });

  it("marks exactly one current town on every day of the year, the town of currentTownNumber", () => {
    for (const today of ["2026-10-20", "2026-12-01", "2027-05-19", "2027-09-20", "2028-01-01"]) {
      const current = currentTownNumber("2026-10-20", today);
      const states = ROADMAP.map(({ number }) => townState(number, current));
      expect(states.filter((state) => state === "current")).toHaveLength(1);
      expect(states.indexOf("current") + 1).toBe(current);
    }
  });

  it("has no past town on day 1, and no locked town in town 12", () => {
    expect(ROADMAP.map(({ number }) => townState(number, 1))).not.toContain("past");
    expect(ROADMAP.map(({ number }) => townState(number, 12))).not.toContain("locked");
  });
});

describe("MAP_SPOTS", () => {
  it("places all 12 towns, in order, each on its own spot inside the map", () => {
    expect(MAP_SPOTS.map((spot) => spot.number)).toEqual(ROADMAP.map((town) => town.number));
    expect(new Set(MAP_SPOTS.map((spot) => `${spot.x},${spot.y}`)).size).toBe(12);
    for (const spot of MAP_SPOTS) {
      expect(spot.x).toBeGreaterThan(0);
      expect(spot.x).toBeLessThan(MAP_TILES.width);
      expect(spot.y).toBeGreaterThan(0);
      expect(spot.y).toBeLessThan(MAP_TILES.height);
    }
  });

  it("winds like a road: each town sits next to the one before it, never across the map", () => {
    for (let i = 1; i < MAP_SPOTS.length; i++) {
      const before = MAP_SPOTS[i - 1];
      const spot = MAP_SPOTS[i];
      expect(Math.abs(spot.column - before.column) + Math.abs(spot.row - before.row)).toBe(1);
    }
  });

  it("starts at the top left, so town 1 is the first thing a learner sees", () => {
    expect(MAP_SPOTS[0]).toMatchObject({ column: 0, row: 0 });
  });
});

describe("roadPieces", () => {
  const pieces = roadPieces();

  it("has one straight piece from each town to the next: 11 pieces for 12 towns", () => {
    expect(pieces).toHaveLength(11);
    for (const piece of pieces) expect(piece.width === 2 || piece.height === 2).toBe(true);
  });

  it("covers the centre of both towns it joins, and stays inside the map", () => {
    const covers = (piece: (typeof pieces)[number], x: number, y: number) =>
      x >= piece.x && x <= piece.x + piece.width && y >= piece.y && y <= piece.y + piece.height;
    pieces.forEach((piece, i) => {
      expect(covers(piece, MAP_SPOTS[i].x, MAP_SPOTS[i].y)).toBe(true);
      expect(covers(piece, MAP_SPOTS[i + 1].x, MAP_SPOTS[i + 1].y)).toBe(true);
      expect(piece.x).toBeGreaterThanOrEqual(0);
      expect(piece.y).toBeGreaterThanOrEqual(0);
      expect(piece.x + piece.width).toBeLessThanOrEqual(MAP_TILES.width);
      expect(piece.y + piece.height).toBeLessThanOrEqual(MAP_TILES.height);
    });
  });
});

describe("parseTownNumber", () => {
  it("reads a town number from the page address", () => {
    expect(parseTownNumber("1")).toBe(1);
    expect(parseTownNumber("12")).toBe(12);
  });

  it("refuses anything that is not one of the 12 towns", () => {
    for (const text of ["0", "13", "01", "1.5", "-1", "t01", "", " 1"]) expect(parseTownNumber(text)).toBeNull();
  });
});

describe("townLinks", () => {
  const content = { id: "t01", hasIntro: true, hasBoss: true };

  it("opens the Town Intro, Field Guide, weekend boss and Gym of the learner's town", () => {
    expect(townLinks({ state: "current", town: content, played: true, gymOpen: true })).toEqual([
      { label: "Town Intro", href: "/town-intro/t01" },
      { label: "Field Guide", href: "/field-guide" },
      { label: "Weekend boss", href: "/weekend/t01" },
      { label: "Enter the Gym", href: "/gym/t01" },
    ]);
  });

  it("links only to what exists: no Town Intro or boss when the town has none, no Gym before it opens", () => {
    expect(townLinks({ state: "current", town: { id: "t01", hasIntro: false, hasBoss: false }, played: true, gymOpen: false })).toEqual([
      { label: "Field Guide", href: "/field-guide" },
    ]);
  });

  it("keeps a past town's Town Intro, boss and Gym; its Field Guide is the played town's only", () => {
    expect(townLinks({ state: "past", town: content, played: false, gymOpen: true }).map((link) => link.label)).toEqual([
      "Town Intro",
      "Weekend boss",
      "Enter the Gym",
    ]);
  });

  it("opens nothing in a locked town, or in a town with no content yet", () => {
    expect(townLinks({ state: "locked", town: content, played: false, gymOpen: false })).toEqual([]);
    expect(townLinks({ state: "current", town: undefined, played: false, gymOpen: false })).toEqual([]);
  });
});
