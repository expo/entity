import { CacheLoadResult } from '@expo/entity/src/internal/ReadThroughEntityCache';

export type Parts = string[];
export type PartsKey = string;
export default abstract class PartsCacher<TFields> {
  public abstract loadManyAsync(
    partsList: readonly Parts[]
  ): Promise<ReadonlyMap<PartsKey, CacheLoadResult<TFields>>>;

  public abstract cacheManyAsync(
    objectMap: ReadonlyMap<PartsKey, Readonly<TFields>>
  ): Promise<void>;

  public abstract cacheDBMissesAsync(partsList: readonly Parts[]): Promise<void>;

  public abstract invalidateManyAsync(partsList: readonly Parts[]): Promise<void>;

  public static getPartsKey(...parts: Parts): PartsKey {
    return JSON.stringify(parts);
  }

  public static getPartsFromKey(partKey: PartsKey): Parts {
    return JSON.parse(partKey);
  }
}
