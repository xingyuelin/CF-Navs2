type SortableItem = {
  id: string | number
}

export function reorderByIds<T extends SortableItem>(items: T[], orderedIds: Array<string | number>): T[] {
  const byId = new Map(items.map((item) => [String(item.id), item]))
  return orderedIds
    .map((id) => byId.get(String(id)))
    .filter((item): item is T => Boolean(item))
}
