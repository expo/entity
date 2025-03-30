import { getCacheKeyVersionsToInvalidate } from '../getCacheKeyVersionsToInvalidate';

describe(getCacheKeyVersionsToInvalidate, () => {
  it('returns the correct cache key versions to invalidate', () => {
    expect(getCacheKeyVersionsToInvalidate(0)).toEqual([0, 1]);
    expect(getCacheKeyVersionsToInvalidate(1)).toEqual([0, 1, 2]);
    expect(getCacheKeyVersionsToInvalidate(2)).toEqual([1, 2, 3]);
  });
});
