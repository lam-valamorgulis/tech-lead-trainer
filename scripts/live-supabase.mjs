import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

// Shared by the scripts that read the live project. They read only public values from
// .env.wizard, and get the secret key through the Supabase CLI login. They never print the key.

export function readEnvFile(path) {
  const values = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) values[match[1]] = match[2];
  }
  return values;
}

export function secretKeyFor(projectRef) {
  const output = execFileSync(
    "npx",
    ["supabase", "projects", "api-keys", "--project-ref", projectRef, "--reveal", "-o", "json"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] },
  );
  const secret = JSON.parse(output).find((key) => key.type === "secret");
  if (!secret?.api_key || secret.api_key.includes("·")) {
    throw new Error("The Supabase CLI did not return a full secret key. Run `npx supabase login` and try again.");
  }
  return secret.api_key;
}

/** The live project's URL and secret key, from .env.wizard and the Supabase CLI. */
export function readLiveSupabase() {
  const env = readEnvFile(".env.wizard");
  for (const key of ["SUPABASE_PROJECT_REF", "NEXT_PUBLIC_SUPABASE_URL"]) {
    if (!env[key]) throw new Error(`${key} is missing from .env.wizard. Run scripts/setup-production.sh first.`);
  }
  return { env, url: env.NEXT_PUBLIC_SUPABASE_URL, secretKey: secretKeyFor(env.SUPABASE_PROJECT_REF) };
}
