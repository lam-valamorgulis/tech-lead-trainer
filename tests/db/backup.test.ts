import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { BACKUP_TABLES, readBackup, type Backup } from "@/lib/backup/backup";
import { restoreBackup } from "@/lib/backup/restore";
import { openBackup, parseBackupKey, sealBackup } from "@/lib/backup/seal";
import { writeEvents, type LearningEvent } from "@/lib/events/write-events";
import { addLaterGoal, removeLaterGoal } from "@/lib/later-list";
import { ensureProfile } from "@/lib/profile";
import { rebuildReviewState } from "@/lib/review-state";
import { saveYearGoal } from "@/lib/year-goals";
import { createEmptyDatabase, dropDatabase } from "../../scripts/empty-database.mjs";
import { adminClient, forgetEmail, signedInUser, sql } from "./helpers";

// Seam B for ticket #22: back up a learner, restore the file into a new empty database on the
// local server, and get the same rows and the same review state. The shared `postgres`
// database is only read; the restore goes into its own database, dropped at the end.

const KEY = parseBackupKey("q2V5LWZvci10ZXN0cy1vbmx5LTMyLWJ5dGVzLWxvbmc=");
const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
const sessionId = crypto.randomUUID();
const battleId = crypto.randomUUID();
const base = (at: string) => ({ clientEventId: crypto.randomUUID(), sessionId, occurredAt: at });

const events: LearningEvent[] = [
  { type: "session", ...base(daysAgo(10)), committedMinutes: 15, activeSeconds: 600, device: "iPhone" },
  {
    type: "placement",
    ...base(daysAgo(10)),
    townId: "t01",
    itemId: "dns",
    contentHash: "0123456789abcdef",
    answerText: "It turns a name into an address",
    correct: true,
    confidence: 3,
  },
  {
    type: "catch",
    ...base(daysAgo(9)),
    itemId: "cache",
    itemKind: "creature",
    contentHash: "0123456789abcdef",
    answerText: "To load it faster",
    correct: true,
    confidence: 2,
    phase: "before-card",
  },
  {
    type: "battle-turn",
    ...base(daysAgo(3)),
    battleId,
    scenarioId: "t01-black-friday",
    contentHash: "0123456789abcdef",
    turnNumber: 1,
    moveId: "cache",
    damage: 2,
    bestMove: true,
    whyText: "Because the cache serves repeat reads, the database load drops.",
  },
  {
    type: "battle",
    ...base(daysAgo(3)),
    battleId,
    scenarioId: "t01-black-friday",
    contentHash: "0123456789abcdef",
    team: ["cache", "dns"],
    result: "won",
    turnsUsed: 1,
  },
  {
    // One key point not said, so cache comes back the next day: the restore must rebuild that too.
    type: "battle-check",
    ...base(daysAgo(3)),
    battleId,
    scenarioId: "t01-black-friday",
    contentHash: "0123456789abcdef",
    turnNumber: 1,
    bestMoveId: "cache",
    tickedPoints: [1, 3],
  },
  {
    type: "battle-discuss",
    ...base(daysAgo(3)),
    battleId,
    scenarioId: "t01-black-friday",
    contentHash: "0123456789abcdef",
    copied: true,
  },
  {
    type: "battle-teach-back",
    ...base(daysAgo(3)),
    battleId,
    scenarioId: "t01-black-friday",
    contentHash: "0123456789abcdef",
    itemIds: ["cache"],
    firstSentence: "A cache keeps a copy close.",
    secondSentence: "An old copy can show an old price.",
  },
  ...(["good", "good", "hard"] as const).map((grade, i): LearningEvent => {
    const at = daysAgo(8 - i * 2);
    return {
      type: "review",
      ...base(at),
      itemId: "cache",
      itemKind: "creature",
      contentHash: "0123456789abcdef",
      stepBefore: ([1, 3, 7] as const)[i],
      stepAfter: ([3, 7, 7] as const)[i],
      grade,
      plannedDueDay: at.slice(0, 10),
      shownAt: at,
      revealedAt: at,
      gradedAt: at,
      typedAnswer: i === 0 ? "kept close, so it is fast" : null,
      confidence: null,
    };
  }),
  // A wrong Decision Card (#109) brings cache back tomorrow: the restore must replay it too.
  {
    type: "review-card",
    ...base(daysAgo(1)),
    itemId: "cache.decision.logo",
    itemKind: "decision",
    contentHash: "0123456789abcdef",
    choiceIndex: 1,
    choiceCorrect: false,
    reasonIndex: 0,
    reasonCorrect: true,
    skillIds: [3],
    shownAt: daysAgo(1),
    gradedAt: daysAgo(1),
    rulesVersion: "v1.5",
  },
];

type User = { id: string; email: string; client: SupabaseClient };

const STATE_COLUMNS = "item_id, step, due_day::text, caught_day::text, stage, event_count";

describe("weekly backup and restore", () => {
  const target = `restore_seam_b_${crypto.randomUUID().slice(0, 8)}`;
  let learner: User;
  let backup: Backup;
  let restored: pg.Client;

  beforeAll(async () => {
    learner = await signedInUser("backup");
    await ensureProfile(learner.client);
    await writeEvents(learner.client, events);
    await rebuildReviewState(adminClient(), learner.id);
    const report = await learner.client
      .from("content_reports")
      .insert({ item_id: "cache", content_hash: "0123456789abcdef", screen: "review", message: "Typo" });
    if (report.error) throw report.error;
    const reminder = await adminClient()
      .from("reminders")
      .insert({ user_id: learner.id, learning_day: daysAgo(1).slice(0, 10), kind: "morning", delivered: 1 });
    if (reminder.error) throw reminder.error;
    const summary = await adminClient().from("weekly_summaries").insert({
      user_id: learner.id,
      week_start: "2026-10-12",
      summary_at: "2026-10-18T13:00:00Z",
      days_learned: 3,
      minutes: 50,
      goal_minutes: 315,
      best_moves: 2,
      best_move_turns: 3,
      weakest_creatures: [{ id: "cache", name: "Cache" }],
    });
    if (summary.error) throw summary.error;
    await saveYearGoal(learner.client, "interview-tower", true);
    await addLaterGoal(learner.client, "Learn Rust");
    await removeLaterGoal(learner.client, (await addLaterGoal(learner.client, "Learn Go")).id);
    // The learner moves home after the events. A restore must keep each event's own learning day.
    await sql("update public.profiles set home_time_zone = 'America/Los_Angeles' where user_id = $1", [learner.id]);

    backup = await readBackup(adminClient(), { userIds: [learner.id] });
    const url = createEmptyDatabase(target);
    restored = new pg.Client({ connectionString: url });
    await restored.connect();
  });

  afterAll(async () => {
    await restored?.end();
    dropDatabase(target);
    await forgetEmail(learner.email);
  });

  it("reads the learner's account, allow-list entry and rows of every table", () => {
    expect(backup).toMatchObject({ kind: "tech-lead-trainer-backup", schemaVersion: 1 });
    expect(backup.users).toEqual([expect.objectContaining({ id: learner.id, email: learner.email })]);
    expect(Object.keys(backup.tables)).toEqual([...BACKUP_TABLES]);
    expect(backup.tables.allowed_emails).toEqual([expect.objectContaining({ email: learner.email })]);
    expect(backup.tables.review_events).toHaveLength(4);
    expect(backup.tables.battle_turn_events).toEqual([expect.objectContaining({ best_move: true, damage: 2 })]);
    expect(backup.tables.battle_events).toEqual([expect.objectContaining({ result: "won", team: ["cache", "dns"] })]);
    expect(backup.tables.battle_check_events).toEqual([expect.objectContaining({ best_move_id: "cache", ticked_points: [1, 3] })]);
    expect(backup.tables.battle_discuss_events).toEqual([expect.objectContaining({ copied: true })]);
    expect(backup.tables.battle_teach_back_events).toEqual([
      expect.objectContaining({ item_ids: ["cache"], first_sentence: "A cache keeps a copy close." }),
    ]);
    expect(backup.tables.review_state.length).toBeGreaterThan(0);
    expect(backup.tables.content_reports).toEqual([expect.objectContaining({ message: "Typo" })]);
    expect(backup.tables.weekly_summaries).toEqual([
      expect.objectContaining({ week_start: "2026-10-12", minutes: 50, weakest_creatures: [{ id: "cache", name: "Cache" }] }),
    ]);
    expect(backup.tables.year_goals).toEqual([expect.objectContaining({ goal: "interview-tower", checked: true })]);
    // A removed Later goal is in the backup too, with its removal time.
    expect(backup.tables.later_goals).toEqual([
      expect.objectContaining({ text: "Learn Rust", removed_at: null }),
      expect.objectContaining({ text: "Learn Go", removed_at: expect.any(String) }),
    ]);
  });

  it("restores the sealed file into an empty database with the same rows and review state", async () => {
    const file = openBackup(sealBackup(backup, KEY), KEY) as Backup;

    const report = await restoreBackup(restored, file);

    expect(report.reviewStateDifferences).toEqual([]);
    expect(report.users).toBe(1);
    for (const table of BACKUP_TABLES) {
      expect(report.rows[table], table).toBe(backup.tables[table].length);
    }
    const before = await sql(`select ${STATE_COLUMNS} from public.review_state where user_id = $1 order by item_id`, [
      learner.id,
    ]);
    const after = await restored.query(
      `select ${STATE_COLUMNS} from public.review_state where user_id = $1 order by item_id`,
      [learner.id],
    );
    expect(after.rows).toEqual(before);
    expect(before.length).toBe(2);
  });

  it("keeps each event as it was: its id, learning day and recorded time", async () => {
    const columns = "id, client_event_id, learning_day::text, recorded_at, occurred_at";
    const query = `select ${columns} from public.review_events where user_id = $1 order by id`;
    const before = await sql(query, [learner.id]);
    expect((await restored.query(query, [learner.id])).rows).toEqual(before);
    const account = await restored.query("select email from auth.users where id = $1", [learner.id]);
    expect(account.rows).toEqual([{ email: learner.email }]);
  });

  it("continues ids after the restored rows, so the next event does not clash", async () => {
    const next = await restored.query(
      "insert into public.content_reports (user_id, item_id, content_hash, screen) values ($1, 'dns', '0123456789abcdef', 'review') returning id",
      [learner.id],
    );
    expect(Number(next.rows[0].id)).toBeGreaterThan(Number(backup.tables.content_reports[0].id));
  });

  it("restores an older file that has no table added after it was written", async () => {
    const older = `restore_seam_b_old_${crypto.randomUUID().slice(0, 8)}`;
    const db = new pg.Client({ connectionString: createEmptyDatabase(older) });
    await db.connect();
    try {
      // A file from before ticket #23 has no weekly_summaries key.
      const tables: Partial<Backup["tables"]> = { ...backup.tables };
      delete tables.weekly_summaries;
      const report = await restoreBackup(db, { ...backup, tables } as Backup);
      expect(report.rows.weekly_summaries).toBe(0);
      expect(report.rows.review_events).toBe(backup.tables.review_events.length);
    } finally {
      await db.end();
      dropDatabase(older);
    }
  });

  it("refuses a database that already has data, and changes nothing", async () => {
    const count = async () => (await restored.query("select count(*)::int as n from public.review_events")).rows[0].n;
    const rowsBefore = await count();

    await expect(restoreBackup(restored, backup)).rejects.toThrow(
      "The target database is not empty: auth.users has 1 row(s). A restore only goes into an empty database.",
    );
    expect(await count()).toBe(rowsBefore);
  });
});
