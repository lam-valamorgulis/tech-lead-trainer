/** "2026-11-20" as "20 Nov 2026". */
export function formatDay(isoDate: string): string {
  // Noon UTC keeps the date the same in every time zone.
  return new Date(`${isoDate}T12:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}
