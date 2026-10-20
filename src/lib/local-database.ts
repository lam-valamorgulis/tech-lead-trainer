const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]"]);

/**
 * Stops tests and scripts from touching the live database.
 * Development and tests use only the Supabase started by `supabase start`.
 */
export function assertLocalDatabase(url: string | undefined): void {
  if (!url) {
    throw new Error("Refusing to run: no database URL was given.");
  }
  if (!URL.canParse(url)) {
    throw new Error(`Refusing to run: ${url} is not a valid URL.`);
  }
  const host = new URL(url).hostname;
  if (!LOCAL_HOSTS.has(host)) {
    throw new Error(`Refusing to run: ${host} is not a local database.`);
  }
}
