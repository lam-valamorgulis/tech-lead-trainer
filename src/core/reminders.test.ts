import { describe, expect, it } from "vitest";
import { morningReminder, morningReminderDue } from "./reminders";

const home = { homeTimeZone: "Asia/Ho_Chi_Minh", dayCutoffHour: 4, morningReminderTime: "07:30" };

// Ho Chi Minh City is UTC+7 all year, so 07:30 there is 00:30 UTC.
describe("morningReminderDue", () => {
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

describe("morningReminder", () => {
  it("opens the home screen and names no lesson content", () => {
    const message = morningReminder();
    expect(message.url).toBe("/");
    expect(message.title).toBe("Tech Lead Trainer");
    expect(message.body).toBe("Good morning. Your daily practice is ready. 3 minutes is enough.");
  });
});
