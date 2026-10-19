/** The ledger only grows: new ids go at the end, and no id is ever removed (design 12.3). */
export function addNewIds(ledger: string[], contentIds: string[]): string[] {
  const known = new Set(ledger);
  const added = contentIds.filter((id) => !known.has(id) && known.add(id));
  return [...ledger, ...added];
}
