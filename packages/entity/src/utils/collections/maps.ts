import invariant from 'invariant';

export const computeIfAbsent = <K, V>(
  map: Map<K, V>,
  key: K,
  mappingFunction: (key: K) => V
): V => {
  if (!map.has(key)) {
    const value = mappingFunction(key);
    map.set(key, value);
  }
  return map.get(key)!;
};

export const mapMap = <K, V, M>(
  map: ReadonlyMap<K, V>,
  mapper: (value: V, key: K) => M
): Map<K, M> => {
  const resultingMap = new Map();
  for (const [k, v] of map) {
    resultingMap.set(k, mapper(v, k));
  }
  return resultingMap;
};

export const mapMapAsync = async function <K, V, M>(
  map: ReadonlyMap<K, V>,
  mapper: (value: V, key: K) => Promise<M>
): Promise<Map<K, M>> {
  const resultingMap: Map<K, M> = new Map();
  await Promise.all(
    Array.from(map.keys()).map(async (k) => {
      const initialValue = map.get(k) as V;
      const result = await mapper(initialValue, k);
      resultingMap.set(k, result);
    })
  );
  return resultingMap;
};

export const zipToMap = <K, V>(keys: readonly K[], values: readonly V[]): Map<K, V> => {
  invariant(
    keys.length === values.length,
    `zipToMap input length mismatch: keys[${keys.length}], values[${values.length}]`
  );
  const resultingMap = new Map();
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    resultingMap.set(key, values[i]);
  }
  return resultingMap;
};

export const invertMap = <K, V>(map: ReadonlyMap<K, V>): Map<V, K> => {
  const resultingMap = new Map();
  for (const [k, v] of map) {
    resultingMap.set(v, k);
  }
  return resultingMap;
};

export const reduceMap = <K, V, A>(
  map: ReadonlyMap<K, V>,
  reducer: (accumulator: A, value: V, key: K) => A,
  initialValue: A
): A => {
  let newAccumulator = initialValue;
  for (const [k, v] of map) {
    newAccumulator = reducer(newAccumulator, v, k);
  }
  return newAccumulator;
};

export const reduceMapAsync = async <K, V, A>(
  map: ReadonlyMap<K, V>,
  reducer: (accumulator: A, value: V, key: K) => Promise<A>,
  initialValue: A
): Promise<A> => {
  let newAccumulator = initialValue;
  for (const [k, v] of map) {
    newAccumulator = await reducer(newAccumulator, v, k);
  }
  return newAccumulator;
};

export const filterMap = <K, V>(
  map: ReadonlyMap<K, V>,
  predicate: (value: V, key: K) => boolean
): Map<K, V> => {
  const resultingMap = new Map();
  map.forEach((v, k) => {
    if (predicate(v, k)) {
      resultingMap.set(k, v);
    }
  });
  return resultingMap;
};
