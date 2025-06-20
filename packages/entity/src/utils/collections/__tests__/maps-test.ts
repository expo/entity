import { describe, expect, it } from '@jest/globals';

import {
  computeIfAbsent,
  mapMap,
  mapMapAsync,
  zipToMap,
  invertMap,
  reduceMap,
  filterMap,
  reduceMapAsync,
  mapKeys,
} from '../maps';

describe(computeIfAbsent, () => {
  it('computes a value when absent', () => {
    const map = new Map<string, string>();
    const blah = computeIfAbsent(map, 'hello', () => 'world');
    expect(blah).toEqual(map.get('hello'));
  });

  it('does not compute a value when already present', () => {
    const map = new Map<string, string>([['hello', 'world']]);
    let didCompute = false;
    const blah = computeIfAbsent(map, 'hello', () => {
      didCompute = true;
      return 'world2';
    });
    expect(blah).toEqual(map.get('hello'));
    expect(didCompute).toBe(false);
  });
});

describe(mapMap, () => {
  it('maps a map', () => {
    const map = new Map<string, string>([['hello', 'world']]);
    const map2 = mapMap(map, () => 2);
    expect(map2.get('hello')).toEqual(2);
  });
});

describe(mapMapAsync, () => {
  it('maps a map with async mapper', async () => {
    const map = new Map<string, string>([['hello', 'world']]);
    const map2 = await mapMapAsync(map, async () => await Promise.resolve(2));
    expect(map2.get('hello')).toEqual(2);
  });
});

describe(mapKeys, () => {
  it('maps keys', async () => {
    const map = new Map<string, string>([
      ['hello', 'world'],
      ['amphibian', 'creature'],
    ]);
    const map2 = mapKeys(map, (k) => k.length);
    expect(map2.size).toEqual(2);
    expect(map2.get(5)).toEqual('world');
    expect(map2.get(9)).toEqual('creature');
  });
});

describe(zipToMap, () => {
  it('zips keys to values', () => {
    const keys = [1, 2, 3];
    const values = ['a', 'b', 'c'];
    const map = zipToMap(keys, values);
    expect(map.get(2)).toEqual('b');
  });

  it('throws when input lengths mismatch', () => {
    const keys = [1, 2];
    const values = [1];
    expect(() => zipToMap(keys, values)).toThrow(
      'zipToMap input length mismatch: keys[2], values[1]',
    );
  });
});

describe(invertMap, () => {
  it('inverts a map', () => {
    const map = new Map([
      [1, 'world'],
      [2, 'what'],
    ]);
    const inverted = invertMap(map);
    expect(inverted.get('world')).toEqual(1);
  });

  it('keeps last inverted key instance', () => {
    const map = new Map([
      [1, 'world'],
      [2, 'world'],
    ]);
    const inverted = invertMap(map);
    expect(inverted.get('world')).toEqual(2);
  });
});

describe(reduceMap, () => {
  it('reduces a map', () => {
    const map = new Map([
      ['a', 'a'],
      ['b', 'b'],
    ]);
    const reduction = reduceMap(map, (acc, v, k) => acc.concat(v).concat(k), 'initial-');
    expect(reduction).toEqual('initial-aabb');
  });
});

describe(reduceMapAsync, () => {
  it('reduces a map (async)', async () => {
    const map = new Map([
      ['a', 'a'],
      ['b', 'b'],
    ]);
    const reduction = await reduceMapAsync(
      map,
      async (acc, v, k) => acc.concat(v).concat(k),
      'initial-',
    );
    expect(reduction).toEqual('initial-aabb');
  });
});

describe(filterMap, () => {
  it('filters a map', () => {
    const map = new Map([
      ['a', false],
      ['b', true],
    ]);
    const filteredMap = filterMap(map, (v) => v);
    expect(filteredMap.get('a')).toBeUndefined();
    expect(filteredMap.get('b')).toBe(true);
  });

  it('can use predicates', () => {
    function truthy<TValue>(value: TValue | null | undefined): value is TValue {
      return !!value;
    }

    const map = new Map<string, string | null>([
      ['a', 'yes'],
      ['b', null],
    ]);

    const filteredMap: Map<string, string> = filterMap(map, truthy);
    expect(filteredMap.size).toBe(1);
  });
});
