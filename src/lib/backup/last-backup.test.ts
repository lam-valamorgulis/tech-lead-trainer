import { describe, expect, it } from "vitest";
import { lastBackupLine } from "./last-backup.ts";

const now = new Date("2026-11-02T05:00:00Z");

describe("lastBackupLine", () => {
  it("says none yet before the first backup", () => {
    expect(lastBackupLine(null, now, "Asia/Ho_Chi_Minh")).toEqual({ text: "Last backup: none yet", stale: false });
  });

  it("shows the date in the home time zone", () => {
    // Sunday 20:00 UTC is already Monday 03:00 in Ho Chi Minh City.
    expect(lastBackupLine(new Date("2026-11-01T20:00:00Z"), now, "Asia/Ho_Chi_Minh")).toEqual({
      text: "Last backup: 2 Nov 2026",
      stale: false,
    });
    expect(lastBackupLine(new Date("2026-11-01T20:00:00Z"), now, "America/Los_Angeles").text).toBe("Last backup: 1 Nov 2026");
  });

  it("warns when the newest backup is more than 8 days old, so a failing job is visible", () => {
    expect(lastBackupLine(new Date("2026-10-25T05:00:00Z"), now, "Asia/Ho_Chi_Minh").stale).toBe(false);
    expect(lastBackupLine(new Date("2026-10-25T04:59:00Z"), now, "Asia/Ho_Chi_Minh").stale).toBe(true);
  });
});
