import { describe, expect, it } from "vitest";
import { assertLocalDatabase } from "./local-database";

describe("assertLocalDatabase", () => {
  it("accepts the local Supabase started by `supabase start`", () => {
    expect(() => assertLocalDatabase("http://127.0.0.1:54321")).not.toThrow();
    expect(() => assertLocalDatabase("http://localhost:54321")).not.toThrow();
    expect(() => assertLocalDatabase("http://[::1]:54321")).not.toThrow();
  });

  it("refuses a URL it cannot read", () => {
    expect(() => assertLocalDatabase("127.0.0.1:54321/no-scheme")).toThrow(/not a valid URL/);
  });

  it("refuses the live Supabase project", () => {
    expect(() =>
      assertLocalDatabase("https://abcdefghijklmnop.supabase.co"),
    ).toThrow(/not a local database/);
  });

  it("refuses a host that only starts with localhost", () => {
    expect(() =>
      assertLocalDatabase("https://localhost.attacker.example"),
    ).toThrow(/not a local database/);
  });

  it("refuses a missing URL", () => {
    expect(() => assertLocalDatabase(undefined)).toThrow(/no database URL/);
  });
});
