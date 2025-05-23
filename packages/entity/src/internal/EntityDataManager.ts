import DataLoader from 'dataloader';
import invariant from 'invariant';

import ReadThroughEntityCache from './ReadThroughEntityCache';
import EntityDatabaseAdapter, {
  FieldEqualityCondition,
  QuerySelectionModifiers,
  QuerySelectionModifiersWithOrderByRaw,
} from '../EntityDatabaseAdapter';
import { EntityQueryContext, EntityTransactionalQueryContext } from '../EntityQueryContext';
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

type DataLoaderMap<TFields extends Record<string, any>> = Map<
  string,
  DataLoader<unknown, readonly Readonly<TFields>[]>
>;

/**
 * A data manager is responsible for orchestrating multiple sources of entity
 * data including local caches, EntityCacheAdapter, and EntityDatabaseAdapter.
 *
 * It is also responsible for invalidating all sources of data when mutated using EntityMutator.
 *
 * @internal
 */
export default class EntityDataManager<
  TFields extends Record<string, any>,
  TIDField extends keyof TFields,
> {
  // map from (load method type + data manager data loader key) to dataloader
  private readonly dataLoaders: DataLoaderMap<TFields> = new Map();

  // map from transaction id to dataloader map
  private readonly transactionalDataLoaders: Map<string, DataLoaderMap<TFields>> = new Map();

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
      this.dataLoaders,
      key.getLoadMethodType() + key.getDataManagerDataLoaderKey(),
      () => {
        return new DataLoader(
          async (
            serializedLoadValues: readonly TSerializedLoadValue[],
          ): Promise<readonly (readonly TFields[])[]> => {
            const values = serializedLoadValues.map((serializedLoadValue) =>
              key.deserializeLoadValue(serializedLoadValue),
            );
            const objectMap = await this.loadManyForNonTransactionalDataLoaderAsync(key, values);
            return values.map((value) => objectMap.get(value) ?? []);
          },
        );
      },
    );
  }

  private async loadManyForNonTransactionalDataLoaderAsync<
    TLoadKey extends IEntityLoadKey<TFields, TIDField, TSerializedLoadValue, TLoadValue>,
    TSerializedLoadValue,
    TLoadValue extends IEntityLoadValue<TSerializedLoadValue>,
  >(
    key: TLoadKey,
    values: readonly TLoadValue[],
  ): Promise<ReadonlyMap<TLoadValue, readonly Readonly<TFields>[]>> {
    this.metricsAdapter.incrementDataManagerLoadCount({
      type: IncrementLoadCountEventType.CACHE,
      isInTransaction: false,
      fieldValueCount: values.length,
      entityClassName: this.entityClassName,
      loadType: key.getLoadMethodType(),
    });

    return await this.entityCache.readManyThroughAsync(key, values, async (fetcherValues) => {
      this.metricsAdapter.incrementDataManagerLoadCount({
        type: IncrementLoadCountEventType.DATABASE,
        isInTransaction: false,
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

  private getTransactionalDataLoaderForLoadKey<
    TLoadKey extends IEntityLoadKey<TFields, TIDField, TSerializedLoadValue, TLoadValue>,
    TSerializedLoadValue,
    TLoadValue extends IEntityLoadValue<TSerializedLoadValue>,
  >(
    queryContext: EntityTransactionalQueryContext,
    key: TLoadKey,
  ): DataLoader<TSerializedLoadValue, readonly Readonly<TFields>[]> {
    const dataLoaderMapForTransaction = computeIfAbsent(
      this.transactionalDataLoaders,
      queryContext.transactionId,
      () => new Map(),
    );
    return computeIfAbsent(
      dataLoaderMapForTransaction,
      key.getLoadMethodType() + key.getDataManagerDataLoaderKey(),
      () => {
        return new DataLoader(
          async (
            serializedLoadValues: readonly TSerializedLoadValue[],
          ): Promise<readonly (readonly TFields[])[]> => {
            const values = serializedLoadValues.map((serializedLoadValue) =>
              key.deserializeLoadValue(serializedLoadValue),
            );
            if (queryContext.isCompleted()) {
              // return empty array if the transaction is completed
              return values.map(() => []);
            }

            const objectMap = await this.loadManyForTransactionalDataLoaderAsync(
              queryContext,
              key,
              values,
            );
            return values.map((value) => objectMap.get(value) ?? []);
          },
        );
      },
    );
  }

  private async loadManyForTransactionalDataLoaderAsync<
    TLoadKey extends IEntityLoadKey<TFields, TIDField, TSerializedLoadValue, TLoadValue>,
    TSerializedLoadValue,
    TLoadValue extends IEntityLoadValue<TSerializedLoadValue>,
  >(
    queryContext: EntityTransactionalQueryContext,
    key: TLoadKey,
    values: readonly TLoadValue[],
  ): Promise<ReadonlyMap<TLoadValue, readonly Readonly<TFields>[]>> {
    this.metricsAdapter.incrementDataManagerLoadCount({
      type: IncrementLoadCountEventType.DATABASE,
      isInTransaction: true,
      fieldValueCount: values.length,
      entityClassName: this.entityClassName,
      loadType: key.getLoadMethodType(),
    });
    return await this.databaseAdapter.fetchManyWhereAsync(queryContext, key, values);
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
      queryContext,
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
    if (queryContext.isInTransaction() && queryContext.shouldDisableTransactionalDataloader) {
      this.metricsAdapter.incrementDataManagerLoadCount({
        type: IncrementLoadCountEventType.DATABASE,
        isInTransaction: true,
        fieldValueCount: values.length,
        entityClassName: this.entityClassName,
        loadType: key.getLoadMethodType(),
      });
      return await this.databaseAdapter.fetchManyWhereAsync(queryContext, key, values);
    }

    this.metricsAdapter.incrementDataManagerLoadCount({
      type: IncrementLoadCountEventType.DATALOADER,
      isInTransaction: queryContext.isInTransaction(),
      fieldValueCount: values.length,
      entityClassName: this.entityClassName,
      loadType: key.getLoadMethodType(),
    });
    const dataLoader = queryContext.isInTransaction()
      ? this.getTransactionalDataLoaderForLoadKey(queryContext, key)
      : this.getDataLoaderForLoadKey(key);
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
      queryContext,
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
      queryContext,
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

  private invalidateOneForTransaction<
    TLoadKey extends IEntityLoadKey<TFields, TIDField, TSerializedLoadValue, TLoadValue>,
    TSerializedLoadValue,
    TLoadValue extends IEntityLoadValue<TSerializedLoadValue>,
  >(queryContext: EntityTransactionalQueryContext, key: TLoadKey, value: TLoadValue): void {
    this.getTransactionalDataLoaderForLoadKey(queryContext, key).clear(
      key.serializeLoadValue(value),
    );
  }

  /**
   * Invalidate all caches, in-memory or otherwise, for sets of key-value pairs.
   * @param pairs - key-value pairs to invalidate
   */
  public async invalidateKeyValuePairsAsync(
    pairs: readonly LoadPair<TFields, TIDField, any, any, any>[],
  ): Promise<void> {
    await Promise.all(pairs.map(([key, value]) => this.invalidateOneAsync(key, value)));
  }

  /**
   * Invalidate all in-memory caches for sets of key-value pairs for all transactions and parent transactions.
   * @param pairs - key-value pairs to invalidate
   */
  public invalidateKeyValuePairsForTransaction(
    queryContext: EntityTransactionalQueryContext,
    pairs: readonly LoadPair<TFields, TIDField, any, any, any>[],
  ): void {
    if (queryContext.shouldDisableTransactionalDataloader) {
      return;
    }

    // invalidate all query contexts in transaction tree
    const outermostTransactionalQueryContext =
      EntityDataManager.getOutermostTransactionalQueryContextIfInNestedTransaction(queryContext);
    const allQueryContextsToInvalidate = [
      outermostTransactionalQueryContext,
      ...EntityDataManager.getAllDescendantTransactionalQueryContexts(
        outermostTransactionalQueryContext,
      ),
    ];
    for (const currentQueryContext of allQueryContextsToInvalidate) {
      for (const [key, value] of pairs) {
        this.invalidateOneForTransaction(currentQueryContext, key, value);
      }
    }
  }

  /**
   * Traverse to root of transactional query context tree.
   */
  private static getOutermostTransactionalQueryContextIfInNestedTransaction(
    queryContext: EntityTransactionalQueryContext,
  ): EntityTransactionalQueryContext {
    if (queryContext.isInNestedTransaction()) {
      return EntityDataManager.getOutermostTransactionalQueryContextIfInNestedTransaction(
        queryContext.parentQueryContext,
      );
    } else {
      return queryContext;
    }
  }

  /**
   * Get a list of all child query contexts recursively for a given query context.
   */
  private static getAllDescendantTransactionalQueryContexts(
    queryContext: EntityTransactionalQueryContext,
  ): readonly EntityTransactionalQueryContext[] {
    if (queryContext.childQueryContexts.length === 0) {
      return [];
    }

    return queryContext.childQueryContexts.flatMap((childQueryContext) => {
      return [
        childQueryContext,
        ...EntityDataManager.getAllDescendantTransactionalQueryContexts(childQueryContext),
      ];
    });
  }
}
