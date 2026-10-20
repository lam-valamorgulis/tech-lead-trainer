import { describe, expect, it } from "vitest";
import { currentTownNumber, ROADMAP, showsNewTown, townStartDay, townToPlay } from "./roadmap.ts";

describe("ROADMAP", () => {
  it("has 12 towns, one per month, starting with Web and HTTP", () => {
    expect(ROADMAP.map((town) => town.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(ROADMAP[0].name).toBe("Web and HTTP in depth");
    expect(ROADMAP[11].name).toBe("Leading AI agents and the final project");
  });
});

describe("currentTownNumber", () => {
  it("is town 1 on day 1, and on every day of the first month", () => {
    expect(currentTownNumber("2026-10-20", "2026-10-20")).toBe(1);
    expect(currentTownNumber("2026-10-20", "2026-11-19")).toBe(1);
  });

  it("moves to the next town on the same date of the next month", () => {
    expect(currentTownNumber("2026-10-20", "2026-11-20")).toBe(2);
    expect(currentTownNumber("2026-10-20", "2027-01-20")).toBe(4);
  });

  it("uses the last day of a short month when the start date does not exist in it", () => {
    expect(currentTownNumber("2027-01-31", "2027-02-27")).toBe(1);
    expect(currentTownNumber("2027-01-31", "2027-02-28")).toBe(2);
    expect(currentTownNumber("2027-01-31", "2027-03-30")).toBe(2);
    expect(currentTownNumber("2027-01-31", "2027-03-31")).toBe(3);
  });

  it("stays at town 12 after the year ends", () => {
    expect(currentTownNumber("2026-10-20", "2027-10-19")).toBe(12);
    expect(currentTownNumber("2026-10-20", "2028-06-01")).toBe(12);
  });

  it("starts a friend who joins later at town 1 on their own day 1", () => {
    expect(currentTownNumber("2027-03-05", "2027-03-05")).toBe(1);
  });

  it("is town 1 before day 1", () => {
    expect(currentTownNumber("2026-11-01", "2026-10-25")).toBe(1);
  });
});

describe("townStartDay", () => {
  it("is day 1 for town 1, and the same date N - 1 months later for town N", () => {
    expect(townStartDay("2026-10-20", 1)).toBe("2026-10-20");
    expect(townStartDay("2026-10-20", 2)).toBe("2026-11-20");
    expect(townStartDay("2026-10-20", 12)).toBe("2027-09-20");
    expect(townStartDay("2027-01-31", 2)).toBe("2027-02-28");
    expect(townStartDay("2028-01-31", 2)).toBe("2028-02-29");
  });
});

describe("townToPlay", () => {
  const towns = [{ number: 1 }, { number: 2 }, { number: 3, retired: true }];

  it("is the learner's town when its content exists", () => {
    expect(townToPlay(towns, 2)?.number).toBe(2);
  });

  it("stays in the last town with content when the next one is not ready, so a day is never empty", () => {
    expect(townToPlay([{ number: 1 }], 2)?.number).toBe(1);
    expect(townToPlay(towns, 3)?.number).toBe(2);
  });

  it("never jumps ahead to a later town", () => {
    expect(townToPlay([{ number: 2 }], 1)).toBeUndefined();
  });
});

// Ticket #36: the "new town" screen, a fresh start on the first learning day in a new town.
describe("showsNewTown", () => {
  // Day 1 is 2026-10-20, so town 2 starts on 2026-11-20.
  const start = "2026-10-20";

  it("shows on the first day of town 2, when the last session was in town 1", () => {
    expect(showsNewTown({ programStartDate: start, townNumber: 2, lastSessionDay: "2026-11-19" })).toBe(true);
  });

  it("shows on a later day too, when the learner has not learned since town 2 started", () => {
    expect(showsNewTown({ programStartDate: start, townNumber: 2, lastSessionDay: "2026-11-15" })).toBe(true);
  });

  it("hides for good once a session started in the new town, also on the same day", () => {
    expect(showsNewTown({ programStartDate: start, townNumber: 2, lastSessionDay: "2026-11-20" })).toBe(false);
    expect(showsNewTown({ programStartDate: start, townNumber: 2, lastSessionDay: "2026-11-21" })).toBe(false);
  });

  it("shows for a learner with no session yet whose town is already town 2", () => {
    expect(showsNewTown({ programStartDate: start, townNumber: 2, lastSessionDay: null })).toBe(true);
  });

  it("never shows in town 1, which is the start of the year, not a new town", () => {
    expect(showsNewTown({ programStartDate: start, townNumber: 1, lastSessionDay: null })).toBe(false);
  });
});
