/** The API returns at most 1000 rows per request (`max_rows` in supabase/config.toml). */
export const PAGE_SIZE = 1000;

type Page<Row> = PromiseLike<{ data: Row[] | null; error: unknown }>;

/** Reads every row of a query, one page at a time. `page(from, to)` must order its rows. */
export async function selectAll<Row>(page: (from: number, to: number) => Page<Row>): Promise<Row[]> {
  const rows: Row[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if ((data ?? []).length < PAGE_SIZE) return rows;
  }
}
