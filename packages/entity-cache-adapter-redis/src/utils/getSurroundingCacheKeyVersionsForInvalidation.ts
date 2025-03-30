export function getSurroundingCacheKeyVersionsForInvalidation(
  cacheKeyVersion: number,
): readonly number[] {
  return [
    ...(cacheKeyVersion === 0 ? [] : [cacheKeyVersion - 1]),
    cacheKeyVersion,
    cacheKeyVersion + 1,
  ];
}
