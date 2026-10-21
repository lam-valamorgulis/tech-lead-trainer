// The Feedback button (ticket #95, design 9 rule 15). Pure functions: no browser, no database.

/** The longest note. A note is a few sentences about one screen, not a report. */
export const FEEDBACK_LIMIT = 1000;

/** The longest screen name the database takes. */
const SCREEN_LIMIT = 40;

/** Screens that have their own name although they share a page: the session runs on home. */
export type ScreenOverride = "session";

/**
 * The screen name saved with a note: the first part of the path, so "/gym/t01" is "gym".
 * Home is "home", and the ADR editor under a weekend is "weekend-adr".
 */
export function screenOf(pathname: string, override: ScreenOverride | null = null): string {
  if (override) return override;
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) return "home";
  if (parts[0] === "weekend" && parts[2] === "adr") return "weekend-adr";
  const name = parts[0].toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, SCREEN_LIMIT).replace(/-+$/, "");
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(name) ? name : "other";
}

export type FeedbackNote = { id: number; screen: string; message: string; createdAt: string };

/**
 * The open notes as Markdown, one section per screen, the screen with the most notes first.
 * The weekly agent run reads this list and opens one `needs-triage` issue per problem.
 */
export function formatOpenFeedback(notes: FeedbackNote[], command = "npm run feedback --"): string {
  if (notes.length === 0) return "# Open feedback: 0\n\nNothing to triage.\n";
  const screens = Map.groupBy(notes, (note) => note.screen);
  const order = [...screens.keys()].sort((a, b) => screens.get(b)!.length - screens.get(a)!.length || a.localeCompare(b));
  const lines = [`# Open feedback: ${notes.length}`, ""];
  const listed: number[] = [];
  for (const screen of order) {
    const group = screens.get(screen)!.toSorted((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id - b.id);
    listed.push(...group.map((note) => note.id));
    lines.push(`## ${screen}: ${group.length}`, "");
    for (const note of group) {
      // One line per note: a line break in the note would start a new Markdown block.
      lines.push(`- #${note.id}, ${note.createdAt.slice(0, 10)}: ${note.message.replace(/\s+/g, " ").trim()}`);
    }
    lines.push("");
  }
  lines.push(`After triage, mark the notes done: \`${command} --done ${listed.join(" ")}\``, "");
  return lines.join("\n");
}
