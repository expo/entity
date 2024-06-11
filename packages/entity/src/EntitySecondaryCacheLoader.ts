import { Result } from '@expo/results';

import EntityLoader from './EntityLoader';
import EntityPrivacyPolicy from './EntityPrivacyPolicy';
import ReadonlyEntity from './ReadonlyEntity';
import ViewerContext from './ViewerContext';
import { mapMap } from './utils/collections/maps';

/**
 * An interface that knows how to load many objects from a cache by load params and invalidate
 * those same load params.
 */
export interface ISecondaryEntityCache<TFields, TLoadParams> {
  /**
   * Read-through cache function.
   * @param loadParamsArray - array of loadParams to load from the cache
   * @param fetcher - closure used to provide underlying data source objects for loadParams
   * @returns map from loadParams to the entity field object
   */
  loadManyThroughAsync(
    loadParamsArray: readonly Readonly<TLoadParams>[],
    fetcher: (
      fetcherLoadParamsArray: readonly Readonly<TLoadParams>[],
    ) => Promise<ReadonlyMap<Readonly<TLoadParams>, Readonly<TFields> | null>>,
  ): Promise<ReadonlyMap<Readonly<TLoadParams>, Readonly<TFields> | null>>;

  /**
   * Invalidate the cache for objects cached by loadParams.
   *
   * @param loadParamsArray - array of load params objects to invalidate
   */
  invalidateManyAsync(loadParamsArray: readonly Readonly<TLoadParams>[]): Promise<void>;
}

/**
 * A secondary cache loader allows for arbitrary cache keying for load params, which are a set of params used to load
 * a single entity field object.
 *
 * Note that this cache cannot be automatically invalidated like other entity caches so it must be manually invalidated
 * when the underlying data of a cache key could be stale.
 *
 * This is most commonly used to further optimize hot paths that cannot make use of normal entity cache loading
 * due to use of a non-unique-field-based EntityLoader method like `loadManyByFieldEqualityConjunctionAsync` or
 * `loadManyByRawWhereClauseAsync`.
 */
export default abstract class EntitySecondaryCacheLoader<
  TLoadParams,
  TFields extends object,
  TID extends NonNullable<TFields[TSelectedFields]>,
  TViewerContext extends ViewerContext,
  TEntity extends ReadonlyEntity<TFields, TID, TViewerContext, TSelectedFields>,
  TPrivacyPolicy extends EntityPrivacyPolicy<
    TFields,
    TID,
    TViewerContext,
    TEntity,
    TSelectedFields
  >,
  TSelectedFields extends keyof TFields = keyof TFields,
> {
  constructor(
    private readonly secondaryEntityCache: ISecondaryEntityCache<TFields, TLoadParams>,
    protected readonly entityLoader: EntityLoader<
      TFields,
      TID,
      TViewerContext,
      TEntity,
      TPrivacyPolicy,
      TSelectedFields
    >,
  ) {}

  /**
   * Load many by load params objects
   *
   * @param loadParamsArray - array of loadParams to load through the cache
   */
  public async loadManyAsync(
    loadParamsArray: readonly Readonly<TLoadParams>[],
  ): Promise<ReadonlyMap<Readonly<TLoadParams>, Result<TEntity> | null>> {
    const loadParamsToFieldObjects = await this.secondaryEntityCache.loadManyThroughAsync(
      loadParamsArray,
      this.fetchObjectsFromDatabaseAsync.bind(this),
    );

    // convert value to and from array to reuse complex code
    const entitiesMap = await this.entityLoader
      .withAuthorizationResults()
      .constructAndAuthorizeEntitiesAsync(
        mapMap(loadParamsToFieldObjects, (fieldObject) => (fieldObject ? [fieldObject] : [])),
      );
    return mapMap(entitiesMap, (fieldObjects) => fieldObjects[0] ?? null);
  }

  /**
   * Invalidate the cache for objects cached by loadParams.
   *
   * @param loadParamsArray - array of load params objects to invalidate
   */
  public async invalidateManyAsync(
    loadParamsArray: readonly Readonly<TLoadParams>[],
  ): Promise<void> {
    await this.secondaryEntityCache.invalidateManyAsync(loadParamsArray);
  }

  /**
   * Load through method called to fetch objects when load params objects are not in the cache
   *
   * @param loadParamsArray - array of load params objects to load
   */
  protected abstract fetchObjectsFromDatabaseAsync(
    loadParamsArray: readonly Readonly<TLoadParams>[],
  ): Promise<ReadonlyMap<Readonly<Readonly<TLoadParams>>, Readonly<TFields> | null>>;
}
