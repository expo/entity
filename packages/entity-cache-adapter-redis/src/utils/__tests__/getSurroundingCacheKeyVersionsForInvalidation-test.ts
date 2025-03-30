import { getSurroundingCacheKeyVersionsForInvalidation } from '../getSurroundingCacheKeyVersionsForInvalidation';

describe(getSurroundingCacheKeyVersionsForInvalidation, () => {
  it('returns the correct cache key versions to invalidate', () => {
    expect(getSurroundingCacheKeyVersionsForInvalidation(0)).toEqual([0, 1]);
    expect(getSurroundingCacheKeyVersionsForInvalidation(1)).toEqual([0, 1, 2]);
    expect(getSurroundingCacheKeyVersionsForInvalidation(2)).toEqual([1, 2, 3]);
  });
});
