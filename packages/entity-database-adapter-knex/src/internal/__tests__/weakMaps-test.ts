import { describe, expect, it } from '@jest/globals';

import { computeIfAbsentInWeakMap } from '../weakMaps';

describe(computeIfAbsentInWeakMap, () => {
  it('computes a value when absent', () => {
    const map = new WeakMap<object, string>();
    const key = {};
    const blah = computeIfAbsentInWeakMap(map, key, () => 'world');
    expect(blah).toEqual(map.get(key));
  });

  it('does not compute a value when already present', () => {
    const map = new WeakMap<object, string>();
    const key = {};
    map.set(key, 'world');
    let didCompute = false;
    const blah = computeIfAbsentInWeakMap(map, key, () => {
      didCompute = true;
      return 'world2';
    });
    expect(blah).toEqual(map.get(key));
    expect(didCompute).toBe(false);
  });
});
