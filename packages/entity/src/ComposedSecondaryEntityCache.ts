import nullthrows from 'nullthrows';

import { ISecondaryEntityCache } from './EntitySecondaryCacheLoader';

/**
 * A ISecondaryEntityCache that composes other ISecondaryEntityCache instances.
 */
export default class ComposedSecondaryEntityCache<TLoadParams, TFields>
  implements ISecondaryEntityCache<TFields, TLoadParams>
{
  /**
   * @param secondaryEntityCaches - list of caches to compose in order of precedence.
   *                                Earlier caches are read from first and written to (including invalidations) last.
   *                                Typically, caches closer to the application should be ordered before caches closer to the database.
   */
  constructor(
    private readonly secondaryEntityCaches: ISecondaryEntityCache<TFields, TLoadParams>[],
  ) {}

  async loadManyThroughAsync(
    loadParamsArray: readonly Readonly<TLoadParams>[],
    fetcher: (
      fetcherLoadParamsArray: readonly Readonly<TLoadParams>[],
    ) => Promise<ReadonlyMap<Readonly<TLoadParams>, Readonly<TFields> | null>>,
  ): Promise<ReadonlyMap<Readonly<TLoadParams>, Readonly<TFields> | null>> {
    return await ComposedSecondaryEntityCache.loadManyThroughRecursivelyAsync(
      this.secondaryEntityCaches,
      loadParamsArray,
      fetcher,
    );
  }

  private static async loadManyThroughRecursivelyAsync<TLoadParams, TFields>(
    secondaryEntityCaches: ISecondaryEntityCache<TFields, TLoadParams>[],
    loadParamsArray: readonly Readonly<TLoadParams>[],
    fetcher: (
      fetcherLoadParamsArray: readonly Readonly<TLoadParams>[],
    ) => Promise<ReadonlyMap<Readonly<TLoadParams>, Readonly<TFields> | null>>,
  ): Promise<ReadonlyMap<Readonly<TLoadParams>, Readonly<TFields> | null>> {
    if (secondaryEntityCaches.length === 0) {
      return await fetcher(loadParamsArray);
    }

    const [firstCache, ...restCaches] = secondaryEntityCaches;

    return await nullthrows(firstCache).loadManyThroughAsync(
      loadParamsArray,
      (fetcherLoadParamsArray) =>
        ComposedSecondaryEntityCache.loadManyThroughRecursivelyAsync(
          restCaches,
          fetcherLoadParamsArray,
          fetcher,
        ),
    );
  }

  async invalidateManyAsync(loadParamsArray: readonly Readonly<TLoadParams>[]): Promise<void> {
    // invalidate lower layers first
    for (let i = this.secondaryEntityCaches.length - 1; i >= 0; i--) {
      const secondaryEntityCache = nullthrows(this.secondaryEntityCaches[i]);
      await secondaryEntityCache.invalidateManyAsync(loadParamsArray);
    }
  }
}
