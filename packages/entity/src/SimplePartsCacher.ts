import IEntityGenericCacher from '@expo/entity/src/IEntityGenericCacher';
import { CacheLoadResult } from '@expo/entity/src/internal/ReadThroughEntityCache';
import { mapKeys } from '@expo/entity/src/utils/collections/maps';
import invariant from 'invariant';

import PartsCacher, { Parts, PartsKey } from './PartsCacher';

export default class SimplePartsCacher<TFields> extends PartsCacher<TFields> {
  constructor(
    private readonly cacher: IEntityGenericCacher<TFields>,
    private readonly makeCacheSpecificKey: (...parts: Parts) => string = PartsCacher.getPartsKey
  ) {
    super();
  }

  public async loadManyAsync(
    partsList: readonly Parts[]
  ): Promise<ReadonlyMap<PartsKey, CacheLoadResult<TFields>>> {
    const cacheSpecificKeyToPartKeyMapping = new Map(
      partsList.map((parts) => [
        this.makeCacheSpecificKey(...parts),
        PartsCacher.getPartsKey(...parts),
      ])
    );
    const cacheResults = await this.cacher.loadManyAsync(
      Array.from(cacheSpecificKeyToPartKeyMapping.keys())
    );

    return mapKeys(cacheResults, (cacheKey) => {
      const partKey = cacheSpecificKeyToPartKeyMapping.get(cacheKey);
      invariant(
        partKey !== undefined,
        'Unspecified cache key %s returned from generic local memory cacher',
        cacheKey
      );
      return partKey;
    });
  }

  public async cacheManyAsync(objectMap: ReadonlyMap<PartsKey, Readonly<TFields>>): Promise<void> {
    await this.cacher.cacheManyAsync(
      mapKeys(objectMap, (partKey) =>
        this.makeCacheSpecificKey(...PartsCacher.getPartsFromKey(partKey))
      )
    );
  }

  public async cacheDBMissesAsync(partsList: readonly Parts[]): Promise<void> {
    await this.cacher.cacheDBMissesAsync(
      partsList.map((parts) => this.makeCacheSpecificKey(...parts))
    );
  }

  public async invalidateManyAsync(partsList: readonly Parts[]): Promise<void> {
    await this.cacher.invalidateManyAsync(
      partsList.map((parts) => this.makeCacheSpecificKey(...parts))
    );
  }
}
