import { CacheLoadResult } from './internal/ReadThroughEntityCache';

/**
 * A cacher stores and loads key-value pairs. It also supports negative caching - it stores the absence
 * of keys that don't exist in the backing datastore.
 */
export default interface IEntityGenericCacher<TFields> {
  loadManyAsync(keys: readonly string[]): Promise<ReadonlyMap<string, CacheLoadResult<TFields>>>;

  cacheManyAsync(objectMap: ReadonlyMap<string, Readonly<TFields>>): Promise<void>;

  cacheDBMissesAsync(keys: readonly string[]): Promise<void>;

  invalidateManyAsync(keys: readonly string[]): Promise<void>;
}
