import DataLoader from 'dataloader';
import invariant from 'invariant';

import ReadThroughEntityCache from './ReadThroughEntityCache';
import EntityDatabaseAdapter, {
  FieldEqualityCondition,
  QuerySelectionModifiers,
  QuerySelectionModifiersWithOrderByRaw,
} from '../EntityDatabaseAdapter';
import { EntityQueryContext } from '../EntityQueryContext';
import EntityQueryContextProvider from '../EntityQueryContextProvider';
import { partitionErrors } from '../entityUtils';
import { IEntityLoadKey, IEntityLoadValue, LoadPair } from './EntityLoadInterfaces';
import {
  timeAndLogLoadEventAsync,
  timeAndLogLoadMapEventAsync,
} from '../metrics/EntityMetricsUtils';
import IEntityMetricsAdapter, {
  EntityMetricsLoadType,
  IncrementLoadCountEventType,
} from '../metrics/IEntityMetricsAdapter';
import { computeIfAbsent } from '../utils/collections/maps';

/**
 * A data manager is responsible for orchestrating multiple sources of entity
 * data including local caches, EntityCacheAdapter, and EntityDatabaseAdapter.
 *
 * It is also responsible for invalidating all sources of data when mutated using EntityMutator.
 */
export default class EntityDataManager<
  TFields extends Record<string, any>,
  TIDField extends keyof TFields,
> {
  private readonly dataloaders: Map<string, DataLoader<unknown, readonly Readonly<TFields>[]>> =
    new Map();

  constructor(
    private readonly databaseAdapter: EntityDatabaseAdapter<TFields, TIDField>,
    private readonly entityCache: ReadThroughEntityCache<TFields, TIDField>,
    private readonly queryContextProvider: EntityQueryContextProvider,
    private readonly metricsAdapter: IEntityMetricsAdapter,
    private readonly entityClassName: string,
  ) {}

  private getDataLoaderForLoadKey<
    TLoadKey extends IEntityLoadKey<TFields, TIDField, TSerializedLoadValue, TLoadValue>,
    TSerializedLoadValue,
    TLoadValue extends IEntityLoadValue<TSerializedLoadValue>,
  >(key: TLoadKey): DataLoader<TSerializedLoadValue, readonly Readonly<TFields>[]> {
    return computeIfAbsent(
      this.dataloaders,
      key.getLoadMethodType() + key.getDataManagerDataLoaderKey(),
      () => {
        return new DataLoader(
          async (
            serializedLoadValues: readonly TSerializedLoadValue[],
          ): Promise<readonly (readonly TFields[])[]> => {
            const values = serializedLoadValues.map((serializedLoadValue) =>
              key.deserializeLoadValue(serializedLoadValue),
            );
            const objectMap = await this.loadManyForDataLoaderAsync(key, values);
            return values.map((value) => objectMap.get(value) ?? []);
          },
        );
      },
    );
  }

  private async loadManyForDataLoaderAsync<
    TLoadKey extends IEntityLoadKey<TFields, TIDField, TSerializedLoadValue, TLoadValue>,
    TSerializedLoadValue,
    TLoadValue extends IEntityLoadValue<TSerializedLoadValue>,
  >(
    key: TLoadKey,
    values: readonly TLoadValue[],
  ): Promise<ReadonlyMap<TLoadValue, readonly Readonly<TFields>[]>> {
    this.metricsAdapter.incrementDataManagerLoadCount({
      type: IncrementLoadCountEventType.CACHE,
      fieldValueCount: values.length,
      entityClassName: this.entityClassName,
      loadType: key.getLoadMethodType(),
    });

    return await this.entityCache.readManyThroughAsync(key, values, async (fetcherValues) => {
      this.metricsAdapter.incrementDataManagerLoadCount({
        type: IncrementLoadCountEventType.DATABASE,
        fieldValueCount: fetcherValues.length,
        entityClassName: this.entityClassName,
        loadType: key.getLoadMethodType(),
      });
      return await this.databaseAdapter.fetchManyWhereAsync(
        this.queryContextProvider.getQueryContext(),
        key,
        fetcherValues,
      );
    });
  }

  /**
   * Load many objects through read-through dataloader (batcher) and cache (optional).
   *
   * @param queryContext - query context in which to perform the load
   * @param key - load key being queried
   * @param values - load values being queried for the key
   * @returns map from load value to objects that match the query for that load value
   */
  async loadManyEqualingAsync<
    TLoadKey extends IEntityLoadKey<TFields, TIDField, TSerializedLoadValue, TLoadValue>,
    TSerializedLoadValue,
    TLoadValue extends IEntityLoadValue<TSerializedLoadValue>,
  >(
    queryContext: EntityQueryContext,
    key: TLoadKey,
    values: readonly TLoadValue[],
  ): Promise<ReadonlyMap<TLoadValue, readonly Readonly<TFields>[]>> {
    return await timeAndLogLoadMapEventAsync(
      this.metricsAdapter,
      EntityMetricsLoadType.LOAD_MANY,
      this.entityClassName,
    )(this.loadManyEqualingInternalAsync(queryContext, key, values));
  }

  private async loadManyEqualingInternalAsync<
    TLoadKey extends IEntityLoadKey<TFields, TIDField, TSerializedLoadValue, TLoadValue>,
    TSerializedLoadValue,
    TLoadValue extends IEntityLoadValue<TSerializedLoadValue>,
  >(
    queryContext: EntityQueryContext,
    key: TLoadKey,
    values: readonly TLoadValue[],
  ): Promise<ReadonlyMap<TLoadValue, readonly Readonly<TFields>[]>> {
    key.validateRuntimeLoadValuesForDataManagerDataLoader(values, this.entityClassName);

    // don't cache when in transaction, as rollbacks complicate things significantly
    if (queryContext.isInTransaction()) {
      return await this.databaseAdapter.fetchManyWhereAsync(queryContext, key, values);
    }

    this.metricsAdapter.incrementDataManagerLoadCount({
      type: IncrementLoadCountEventType.DATALOADER,
      fieldValueCount: values.length,
      entityClassName: this.entityClassName,
      loadType: key.getLoadMethodType(),
    });
    const dataLoader = this.getDataLoaderForLoadKey(key);
    const results = await dataLoader.loadMany(values.map((v) => key.serializeLoadValue(v)));
    const [successfulValues, errors] = partitionErrors(results);
    if (errors.length > 0) {
      const error = errors[0]!;
      throw error;
    }

    invariant(
      values.length === successfulValues.length,
      `length mismatch between values (${values.length}) and successful values (${successfulValues.length})`,
    );
    const mapToReturn = key.vendNewLoadValueMap<readonly Readonly<TFields>[]>();
    for (let i = 0; i < successfulValues.length; i++) {
      mapToReturn.set(values[i]!, successfulValues[i]!);
    }
    return mapToReturn;
  }

  /**
   * Loads many objects matching the conjunction of where clauses constructed from
   * specified field equality operands.
   *
   * @param queryContext - query context in which to perform the load
   * @param fieldEqualityOperands - list of field equality where clause operand specifications
   * @param querySelectionModifiers - limit, offset, and orderBy for the query
   * @returns array of objects matching the query
   */
  async loadManyByFieldEqualityConjunctionAsync<N extends keyof TFields>(
    queryContext: EntityQueryContext,
    fieldEqualityOperands: FieldEqualityCondition<TFields, N>[],
    querySelectionModifiers: QuerySelectionModifiers<TFields>,
  ): Promise<readonly Readonly<TFields>[]> {
    return await timeAndLogLoadEventAsync(
      this.metricsAdapter,
      EntityMetricsLoadType.LOAD_MANY_EQUALITY_CONJUNCTION,
      this.entityClassName,
    )(
      this.databaseAdapter.fetchManyByFieldEqualityConjunctionAsync(
        queryContext,
        fieldEqualityOperands,
        querySelectionModifiers,
      ),
    );
  }

  /**
   * Loads many objects matching the raw WHERE clause.
   *
   * @param queryContext - query context in which to perform the load
   * @param rawWhereClause - parameterized SQL WHERE clause with positional binding placeholders or named binding placeholders
   * @param bindings - array of positional bindings or object of named bindings
   * @param querySelectionModifiers - limit, offset, orderBy, and orderByRaw for the query
   * @returns array of objects matching the query
   */
  async loadManyByRawWhereClauseAsync(
    queryContext: EntityQueryContext,
    rawWhereClause: string,
    bindings: any[] | object,
    querySelectionModifiers: QuerySelectionModifiersWithOrderByRaw<TFields>,
  ): Promise<readonly Readonly<TFields>[]> {
    return await timeAndLogLoadEventAsync(
      this.metricsAdapter,
      EntityMetricsLoadType.LOAD_MANY_RAW,
      this.entityClassName,
    )(
      this.databaseAdapter.fetchManyByRawWhereClauseAsync(
        queryContext,
        rawWhereClause,
        bindings,
        querySelectionModifiers,
      ),
    );
  }

  private async invalidateOneAsync<
    TLoadKey extends IEntityLoadKey<TFields, TIDField, TSerializedLoadValue, TLoadValue>,
    TSerializedLoadValue,
    TLoadValue extends IEntityLoadValue<TSerializedLoadValue>,
  >(key: TLoadKey, value: TLoadValue): Promise<void> {
    await this.entityCache.invalidateManyAsync(key, [value]);
    this.getDataLoaderForLoadKey(key).clear(key.serializeLoadValue(value));
  }

  /**
   * Invalidate all caches, in-memory or otherwise, for sets of key-value pairs.
   * @param pairs - key-value pairs to invalidate
   */
  public async invalidateKeyValuePairsAsync(
    pairs: readonly LoadPair<TFields, TIDField, any, any, any>[],
  ): Promise<void> {
    // TODO(wschurman): check for races with load
    await Promise.all(pairs.map(([key, value]) => this.invalidateOneAsync(key, value)));
  }
}
