import invariant from 'invariant';

/**
 * If the specified key is not already associated with a value in this map, attempts to compute
 * its value using the given mapping function and enters it into this map unless null.
 *
 * @param map - map from which to get the key's value or compute and associate
 * @param key - key for which to get the value or with which the computed value is to be associated
 * @param mappingFunction - function to compute a value for key
 */
export const computeIfAbsent = <K, V>(
  map: Map<K, V>,
  key: K,
  mappingFunction: (key: K) => V,
): V => {
  if (!map.has(key)) {
    const value = mappingFunction(key);
    map.set(key, value);
  }
  return map.get(key)!;
};

/**
 * Create a new Map by associating the value of mapper executed for each key in the source map.
 *
 * @param map - source map
 * @param mapper - function to compute a value in the resulting map for the source key and value
 */
export const mapMap = <K, V, M>(
  map: ReadonlyMap<K, V>,
  mapper: (value: V, key: K) => M,
): Map<K, M> => {
  const resultingMap = new Map<K, M>();
  for (const [k, v] of map) {
    resultingMap.set(k, mapper(v, k));
  }
  return resultingMap;
};

/**
 * Create a new Map by associating the value of mapper executed for each key in the source map.
 *
 * @param map - source map
 * @param mapper - asynchronous function to compute a value in the resulting map for the source key and value
 */
export const mapMapAsync = async function <K, V, M>(
  map: ReadonlyMap<K, V>,
  mapper: (value: V, key: K) => Promise<M>,
): Promise<Map<K, M>> {
  const resultingMap = new Map<K, M>();
  await Promise.all(
    Array.from(map.keys()).map(async (k) => {
      const initialValue = map.get(k) as V;
      const result = await mapper(initialValue, k);
      resultingMap.set(k, result);
    }),
  );
  return resultingMap;
};

/**
 * Create a new Map by associating the value of each key with mapper executed for each key in the source map.
 * The opposite of mapMap. In the event two source keys map to the same result key, the second source key's
 * value will overwrite the first, in which case the cardinality of the returned map may be smaller than the
 * source map's.
 *
 * @param map - source map
 * @param mapper - function to compute a key in the resulting map for the source key and value
 */
export const mapKeys = <K, V, K2>(
  map: ReadonlyMap<K, V>,
  mapper: (key: K, value: V) => K2,
): Map<K2, V> => {
  const resultingMap = new Map<K2, V>();
  for (const [k, v] of map) {
    resultingMap.set(mapper(k, v), v);
  }
  return resultingMap;
};

/**
 * Create a new Map from each member of keys to the corresponding member of values.
 *
 * @example
 * ```
 * zipToMap([1, 2], ['a', 'b']) => Map({1: 'a', 2: 'b'})
 * ```
 *
 * @param keys - keys
 * @param values - corresponding ordered values for keys
 */
export const zipToMap = <K, V>(keys: readonly K[], values: readonly V[]): Map<K, V> => {
  invariant(
    keys.length === values.length,
    `zipToMap input length mismatch: keys[${keys.length}], values[${values.length}]`,
  );
  const resultingMap = new Map<K, V>();
  for (let i = 0; i < keys.length; i++) {
    resultingMap.set(keys[i]!, values[i]!);
  }
  return resultingMap;
};

/**
 * Create a new Map by inverting keys and values of specified map.
 *
 * @param map - map to invert
 */
export const invertMap = <K, V>(map: ReadonlyMap<K, V>): Map<V, K> => {
  const resultingMap = new Map<V, K>();
  for (const [k, v] of map) {
    resultingMap.set(v, k);
  }
  return resultingMap;
};

/**
 * Execute a reducer function on each element of the source map, resulting in a single output value.
 *
 * @param map - source map
 * @param reducer - reducer function that takes an accumulated value, current iteration value, and current
 *                  iteration key and returns a new accumulated value
 * @param initialValue - initial accumulated value
 */
export const reduceMap = <K, V, A>(
  map: ReadonlyMap<K, V>,
  reducer: (accumulator: A, value: V, key: K) => A,
  initialValue: A,
): A => {
  let newAccumulator = initialValue;
  for (const [k, v] of map) {
    newAccumulator = reducer(newAccumulator, v, k);
  }
  return newAccumulator;
};

/**
 * Execute an asynchronous reducer function on each element of the source map, resulting in a single output value.
 * Note that this does not parallelize asynchronous reduce steps so it should be used with caution.
 *
 * @param map - source map
 * @param reducer - asynchronous reducer function that takes an accumulated value, current iteration value, and
 *                  current iteration key and returns a new accumulated value
 * @param initialValue - initial accumulated value
 */
export const reduceMapAsync = async <K, V, A>(
  map: ReadonlyMap<K, V>,
  reducer: (accumulator: A, value: V, key: K) => Promise<A>,
  initialValue: A,
): Promise<A> => {
  let newAccumulator = initialValue;
  for (const [k, v] of map) {
    newAccumulator = await reducer(newAccumulator, v, k);
  }
  return newAccumulator;
};

/**
 * Create a new Map containing all elements from the source map that pass the provided test predicate.
 * @param map - source map
 * @param predicate - function to test each element of source map
 */
export function filterMap<K, V, S extends V>(
  map: ReadonlyMap<K, V>,
  predicate: (value: V, key: K) => value is S,
): Map<K, S>;

/**
 * Create a new Map containing all elements from the source map that pass the provided test predicate.
 * @param map - source map
 * @param predicate - function to test each element of source map
 */
export function filterMap<K, V>(
  map: ReadonlyMap<K, V>,
  predicate: (value: V, key: K) => boolean,
): Map<K, V>;

/**
 * Create a new Map containing all elements from the source map that pass the provided test predicate.
 * @param map - source map
 * @param predicate - function to test each element of source map
 */
export function filterMap<K, V>(
  map: ReadonlyMap<K, V>,
  predicate: (value: V, key: K) => unknown,
): Map<K, V> {
  const resultingMap = new Map<K, V>();
  map.forEach((v, k) => {
    if (predicate(v, k)) {
      resultingMap.set(k, v);
    }
  });
  return resultingMap;
}
