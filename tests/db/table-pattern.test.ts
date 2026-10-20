import pg from "pg";
import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";

// The pattern every table follows (design section 12.5). A new table that breaks it fails here.
// The allow list is the one table with no owner: only the server reads it.
const NO_OWNER_TABLES = ["allowed_emails"];

describe("every table in the public schema", () => {
  const db = new pg.Client({ connectionString: inject("databaseUrl") });
  let tables: { name: string; rls: boolean }[];

  beforeAll(async () => {
    await db.connect();
    const result = await db.query<{ name: string; rls: boolean }>(
      `select c.relname as name, c.relrowsecurity as rls
         from pg_class c join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relkind = 'r'
        order by 1`,
    );
    tables = result.rows;
  });

  afterAll(async () => {
    await db.end();
  });

  it("includes the tables built so far", () => {
    expect(tables.map((t) => t.name)).toEqual(expect.arrayContaining(["allowed_emails", "profiles", "session_events", "catch_events", "review_events", "review_state", "placement_events"]));
  });

  it("has row-level security on", () => {
    expect(tables.filter((t) => !t.rls).map((t) => t.name)).toEqual([]);
  });

  it("has a user_id column that defaults to the signed-in user", async () => {
    const result = await db.query<{ table_name: string; column_default: string | null }>(
      `select table_name, column_default from information_schema.columns
        where table_schema = 'public' and column_name = 'user_id'`,
    );
    const defaults = new Map(result.rows.map((r) => [r.table_name, r.column_default]));
    for (const { name } of tables.filter((t) => !NO_OWNER_TABLES.includes(t.name))) {
      expect({ table: name, default: defaults.get(name) }).toEqual({ table: name, default: "auth.uid()" });
    }
  });

  it("has exactly four owner-only policies: select, insert, update and delete", async () => {
    const result = await db.query<{
      tablename: string;
      cmd: string;
      roles: string[];
      qual: string | null;
      with_check: string | null;
    }>(`select tablename, cmd, roles::text[] as roles, qual, with_check from pg_policies where schemaname = 'public'`);
    // Postgres prints the rule in its own words, so compare without spaces and brackets.
    const flat = (rule: string) => rule.replace(/[\s()]/g, "").toLowerCase();
    const owner = flat("( SELECT auth.uid() AS uid) = user_id");
    for (const { name } of tables.filter((t) => !NO_OWNER_TABLES.includes(t.name))) {
      const policies = result.rows.filter((p) => p.tablename === name);
      expect({ table: name, policies: policies.map((p) => p.cmd).sort() }).toEqual({
        table: name,
        policies: ["DELETE", "INSERT", "SELECT", "UPDATE"],
      });
      for (const policy of policies) {
        expect({ table: name, cmd: policy.cmd, roles: policy.roles }).toEqual({
          table: name,
          cmd: policy.cmd,
          roles: ["authenticated"],
        });
        for (const rule of [policy.qual, policy.with_check].filter((r): r is string => r !== null)) {
          expect({ table: name, cmd: policy.cmd, rule: flat(rule) }).toEqual({ table: name, cmd: policy.cmd, rule: owner });
        }
      }
    }
  });

  it("keeps the allow list closed to visitors and signed-in users", async () => {
    const result = await db.query<{ policies: string }>(
      `select count(*)::text as policies from pg_policies where schemaname = 'public' and tablename = 'allowed_emails'`,
    );
    expect(result.rows[0].policies).toBe("0");
  });

  // Event tables are the learning log (design 12.2). Their names end in "_events".
  const eventTables = () => tables.map((t) => t.name).filter((name) => name.endsWith("_events"));

  it("keeps every event table append-only for visitors and signed-in users", async () => {
    for (const name of eventTables()) {
      const result = await db.query<{ role: string; can_change: boolean }>(
        `select r as role,
                has_table_privilege(r, format('public.%I', $1::text), 'UPDATE')
             or has_table_privilege(r, format('public.%I', $1::text), 'DELETE') as can_change
           from unnest(array['anon', 'authenticated']) as r`,
        [name],
      );
      expect({ table: name, rows: result.rows }).toEqual({
        table: name,
        rows: [
          { role: "anon", can_change: false },
          { role: "authenticated", can_change: false },
        ],
      });
    }
  });

  it("gives every event table the shared event columns and one row per client event id", async () => {
    for (const name of eventTables()) {
      const columns = await db.query<{ column_name: string }>(
        `select column_name from information_schema.columns where table_schema = 'public' and table_name = $1`,
        [name],
      );
      expect({ table: name, columns: columns.rows.map((c) => c.column_name) }).toEqual({
        table: name,
        columns: expect.arrayContaining(["user_id", "client_event_id", "session_id", "occurred_at", "learning_day"]),
      });

      const unique = await db.query<{ columns: string[] }>(
        `select array_agg(a.attname order by a.attname)::text[] as columns
           from pg_constraint c
           join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
          where c.conrelid = format('public.%I', $1::text)::regclass and c.contype = 'u'
          group by c.oid`,
        [name],
      );
      expect({ table: name, unique: unique.rows.map((r) => r.columns) }).toEqual({
        table: name,
        unique: expect.arrayContaining([["client_event_id", "user_id"]]),
      });
    }
  });
});
