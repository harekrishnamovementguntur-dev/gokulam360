function sameKey(left, right) {
  const leftEntries = Object.entries(left || {});
  const rightEntries = Object.entries(right || {});
  return leftEntries.length === rightEntries.length && leftEntries.every(([field, direction], index) => {
    const [otherField, otherDirection] = rightEntries[index] || [];
    return field === otherField && direction === otherDirection;
  });
}

/**
 * Ensure an index exists without treating a different name for the same key
 * pattern as a conflict. Existing indexes are never dropped or renamed.
 */
export async function ensureIndexByKey(collection, key, options = {}) {
  const existingIndexes = await collection.listIndexes().toArray();
  const existing = existingIndexes.find((index) => sameKey(index.key, key));
  if (existing) return existing.name;
  return collection.createIndex(key, options);
}
