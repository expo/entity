/**
 * If the specified key is not already associated with a value in this weak map, computes
 * its value using the given mapping function and enters it into this map.
 *
 * @param map - map from which to get the key's value or compute and associate
 * @param key - key for which to get the value or with which the computed value is to be associated
 * @param mappingFunction - function to compute a value for key
 */
export const computeIfAbsentInWeakMap = <K extends WeakKey, V>(
  map: WeakMap<K, V>,
  key: K,
  mappingFunction: (key: K) => V,
): V => {
  if (!map.has(key)) {
    const value = mappingFunction(key);
    map.set(key, value);
  }
  return map.get(key)!;
};
