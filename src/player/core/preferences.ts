export function restoreSelectedStreamIds(
  availableIds: readonly string[],
  savedIds: readonly string[] | undefined,
): string[] {
  if (!savedIds) return [...availableIds];
  const available = new Set(availableIds);
  const restored = savedIds.filter((id, index) => available.has(id) && savedIds.indexOf(id) === index);
  return restored.length ? restored : [...availableIds];
}
