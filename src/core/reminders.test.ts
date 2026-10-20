import { describe, expect, it } from "vitest";
import { reminderDue, reminderToSend, type ReminderSettings } from "./reminders";

const home = { homeTimeZone: "Asia/Ho_Chi_Minh", dayCutoffHour: 4, morningReminderTime: "07:30", eveningReminderTime: "20:00" };
const morningReminderDue = (now: Date, settings: ReminderSettings) => reminderDue(now, settings, "morning");

// Ho Chi Minh City is UTC+7 all year, so 07:30 there is 00:30 UTC.
describe("reminderDue for the morning", () => {
  it("is due at 07:30 home time, for that learning day", () => {
    expect(morningReminderDue(new Date("2026-10-21T00:30:00Z"), home)).toEqual({ due: true, learningDay: "2026-10-21" });
  });

  it("is not due before the reminder time", () => {
    expect(morningReminderDue(new Date("2026-10-21T00:29:00Z"), home)).toEqual({ due: false });
  });

  it("is still due a few minutes late, because the timer runs every 5 minutes", () => {
    expect(morningReminderDue(new Date("2026-10-21T00:34:59Z"), home)).toEqual({ due: true, learningDay: "2026-10-21" });
  });

  it("is no longer due one hour after the reminder time", () => {
    expect(morningReminderDue(new Date("2026-10-21T01:29:00Z"), home)).toEqual({ due: true, learningDay: "2026-10-21" });
    expect(morningReminderDue(new Date("2026-10-21T01:30:00Z"), home)).toEqual({ due: false });
  });

  it("uses the home time zone, not UTC", () => {
    const berlin = { ...home, homeTimeZone: "Europe/Berlin" };
    // 07:30 in Berlin on a summer-time day is 05:30 UTC.
    expect(morningReminderDue(new Date("2026-07-01T05:30:00Z"), berlin)).toEqual({ due: true, learningDay: "2026-07-01" });
    // 07:30 in Berlin on a winter-time day is 06:30 UTC.
    expect(morningReminderDue(new Date("2026-12-01T05:30:00Z"), berlin)).toEqual({ due: false });
    expect(morningReminderDue(new Date("2026-12-01T06:30:00Z"), berlin)).toEqual({ due: true, learningDay: "2026-12-01" });
  });

  it("follows the time chosen in Settings", () => {
    const late = { ...home, morningReminderTime: "09:15" };
    expect(morningReminderDue(new Date("2026-10-21T00:30:00Z"), late)).toEqual({ due: false });
    expect(morningReminderDue(new Date("2026-10-21T02:15:00Z"), late)).toEqual({ due: true, learningDay: "2026-10-21" });
  });

  it("gives the learning day before the cutoff when the reminder time is earlier than the cutoff", () => {
    // 02:00 home time is still the day before, because the day starts at 04:00.
    const night = { ...home, morningReminderTime: "02:00" };
    expect(morningReminderDue(new Date("2026-10-20T19:00:00Z"), night)).toEqual({ due: true, learningDay: "2026-10-20" });
  });

  it("is due near midnight without moving to the wrong date", () => {
    const midnight = { ...home, morningReminderTime: "23:45" };
    // 23:45 home time on 21 Oct is 16:45 UTC; 00:30 the next morning is still inside the hour.
    expect(morningReminderDue(new Date("2026-10-21T16:45:00Z"), midnight)).toEqual({ due: true, learningDay: "2026-10-21" });
    expect(morningReminderDue(new Date("2026-10-21T17:30:00Z"), midnight)).toEqual({ due: true, learningDay: "2026-10-21" });
    expect(morningReminderDue(new Date("2026-10-21T17:45:00Z"), midnight)).toEqual({ due: false });
  });

  it("keeps a late reminder on the day it was planned for, even after the day changes", () => {
    // With the day starting at 00:00, 00:30 is a new learning day, but this reminder was planned
    // for 23:45 the evening before. A second reminder for the new day would come 45 minutes later.
    const midnight = { ...home, dayCutoffHour: 0, morningReminderTime: "23:45" };
    expect(morningReminderDue(new Date("2026-10-21T17:30:00Z"), midnight)).toEqual({ due: true, learningDay: "2026-10-21" });
  });
});

describe("reminderDue for the evening", () => {
  it("is due at 20:00 home time, for that learning day", () => {
    // 20:00 in Ho Chi Minh City is 13:00 UTC.
    expect(reminderDue(new Date("2026-10-21T12:59:00Z"), home, "evening")).toEqual({ due: false });
    expect(reminderDue(new Date("2026-10-21T13:00:00Z"), home, "evening")).toEqual({ due: true, learningDay: "2026-10-21" });
    expect(reminderDue(new Date("2026-10-21T14:00:00Z"), home, "evening")).toEqual({ due: false });
  });

  it("follows the evening time chosen in Settings, not the morning time", () => {
    const late = { ...home, eveningReminderTime: "21:30" };
    expect(reminderDue(new Date("2026-10-21T13:00:00Z"), late, "evening")).toEqual({ due: false });
    expect(reminderDue(new Date("2026-10-21T14:30:00Z"), late, "evening")).toEqual({ due: true, learningDay: "2026-10-21" });
    expect(reminderDue(new Date("2026-10-21T00:30:00Z"), late, "evening")).toEqual({ due: false });
  });
});

describe("reminderToSend for the evening", () => {
  const today = "2026-10-21";

  it("sends nothing when today already has 180 or more active seconds", () => {
    expect(reminderToSend("evening", today, new Map([[today, 180]]))).toBeNull();
    expect(reminderToSend("evening", today, new Map([[today, 2700]]))).toBeNull();
  });

  it("sends when today has less than 180 active seconds", () => {
    expect(reminderToSend("evening", today, new Map([[today, 179]]))).not.toBeNull();
    expect(reminderToSend("evening", today, new Map())).not.toBeNull();
  });

  it("looks only at today, not at the day before", () => {
    expect(reminderToSend("evening", today, new Map([["2026-10-20", 900]]))).not.toBeNull();
  });
});

describe("reminderToSend for the morning", () => {
  const today = "2026-10-21";
  const stronger = "Today matters most. Just 3 minutes keeps your practice going.";

  it("uses the stronger text after one missed day", () => {
    const message = reminderToSend("morning", today, new Map([["2026-10-19", 600]]));
    expect(message).toEqual({ title: "Tech Lead Trainer", body: stronger, url: "/" });
  });

  it("counts a day with less than 180 active seconds as missed", () => {
    const message = reminderToSend("morning", today, new Map([["2026-10-19", 180], ["2026-10-20", 179]]));
    expect(message?.body).toBe(stronger);
  });

  it("uses a normal text when yesterday was learned", () => {
    const message = reminderToSend("morning", today, new Map([["2026-10-20", 180]]));
    expect(message?.body).not.toBe(stronger);
  });

  it("uses a normal text after two or more missed days: the Rest Stop welcomes the learner back", () => {
    expect(reminderToSend("morning", today, new Map([["2026-10-18", 600]]))?.body).not.toBe(stronger);
  });

  it("uses a normal text for a new learner with no learned day yet", () => {
    expect(reminderToSend("morning", today, new Map())?.body).not.toBe(stronger);
  });

  it("always sends the morning reminder, also when today is already learned", () => {
    expect(reminderToSend("morning", today, new Map([[today, 900]]))).not.toBeNull();
  });
});

describe("reminder texts", () => {
  const days = ["2026-10-21", "2026-10-22", "2026-10-23", "2026-10-24"];
  const bodies = (kind: "morning" | "evening") => days.map((day) => reminderToSend(kind, day, new Map())?.body);

  it("rotate among 3 morning styles, one per learning day", () => {
    const [first, second, third, fourth] = bodies("morning");
    expect(new Set([first, second, third]).size).toBe(3);
    expect(fourth).toBe(first);
  });

  it("rotate among 3 evening styles, one per learning day", () => {
    const [first, second, third, fourth] = bodies("evening");
    expect(new Set([first, second, third]).size).toBe(3);
    expect(fourth).toBe(first);
  });

  it("all open the home screen, with the app name as the title", () => {
    const stronger = reminderToSend("morning", "2026-10-21", new Map([["2026-10-19", 600]]));
    for (const day of days) {
      for (const message of [reminderToSend("morning", day, new Map()), reminderToSend("evening", day, new Map()), stronger]) {
        expect(message).toMatchObject({ title: "Tech Lead Trainer", url: "/" });
      }
    }
  });

  it("never blame the learner, also the stronger text", () => {
    const stronger = reminderToSend("morning", "2026-10-21", new Map([["2026-10-19", 600]]))?.body;
    for (const body of [...bodies("morning"), ...bodies("evening"), stronger]) {
      expect(body).not.toMatch(/miss|fail|lazy|behind|broke|streak|should|again|forgot/i);
    }
  });
});
