/** The ledger only grows: new ids go at the end, and no id is ever removed (design 12.3). */
export function addNewIds(ledger: string[], contentIds: string[]): string[] {
  const result = [...ledger];
  const known = new Set(ledger);
  for (const id of contentIds) {
    if (known.has(id)) continue;
    known.add(id);
    result.push(id);
  }
  return result;
}
