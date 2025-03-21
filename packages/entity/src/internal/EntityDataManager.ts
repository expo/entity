import DataLoader from 'dataloader';
import invariant from 'invariant';

import ReadThroughEntityCache from './ReadThroughEntityCache';
import EntityConfiguration from '../EntityConfiguration';
import EntityDatabaseAdapter, {
  FieldEqualityCondition,
  QuerySelectionModifiers,
  QuerySelectionModifiersWithOrderByRaw,
} from '../EntityDatabaseAdapter';
import { EntityQueryContext } from '../EntityQueryContext';
import EntityQueryContextProvider from '../EntityQueryContextProvider';
import { partitionErrors } from '../entityUtils';
import { IEntityLoadKey, IEntityLoadValue } from './EntityAdapterLoadInterfaces';
import { SingleFieldHolder, SingleFieldValueHolder } from './SingleFieldHolder';
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
export default class EntityDataManager<TFields extends Record<string, any>> {
  private readonly dataloaders: Map<string, DataLoader<unknown, readonly Readonly<TFields>[]>> =
    new Map();

  constructor(
    private readonly entityConfiguration: EntityConfiguration<TFields>,
    private readonly databaseAdapter: EntityDatabaseAdapter<TFields>,
    private readonly entityCache: ReadThroughEntityCache<TFields>,
    private readonly queryContextProvider: EntityQueryContextProvider,
    private readonly metricsAdapter: IEntityMetricsAdapter,
    private readonly entityClassName: string,
  ) {}

  private getDataLoaderForLoadKey<
    TLoadKey extends IEntityLoadKey<TFields, TSerializedLoadValue, TLoadValue>,
    TSerializedLoadValue,
    TLoadValue extends IEntityLoadValue<TSerializedLoadValue>,
  >(key: TLoadKey): DataLoader<unknown, readonly Readonly<TFields>[]> {
    return computeIfAbsent(
      this.dataloaders,
      key.getDataManagerLoadMethodType() + key.getDataManagerDataLoaderKey(),
      () => {
        return new DataLoader(
          async (
            serializedLoadValues: readonly string[],
          ): Promise<readonly (readonly TFields[])[]> => {
            const values = serializedLoadValues.map((serializedLoadValue) =>
              key.deserializeLoadValueForDataManagerDataLoader(serializedLoadValue),
            );
            const objectMap = await this.loadManyForDataLoaderAsync(key, values);
            return values.map((value) => objectMap.get(value) ?? []);
          },
        );
      },
    );
  }

  private async loadManyForDataLoaderAsync<
    TLoadKey extends IEntityLoadKey<TFields, TSerializedLoadValue, TLoadValue>,
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
      loadType: key.getDataManagerLoadMethodType(),
    });

    return await this.entityCache.readManyThroughAsync(key, values, async (fetcherValues) => {
      this.metricsAdapter.incrementDataManagerLoadCount({
        type: IncrementLoadCountEventType.DATABASE,
        fieldValueCount: fetcherValues.length,
        entityClassName: this.entityClassName,
        loadType: key.getDataManagerLoadMethodType(),
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
   * @param fieldName - object field being queried
   * @param fieldValues - fieldName field values being queried
   * @returns map from fieldValue to objects that match the query for that fieldValue
   */
  async loadManyEqualingAsync<
    TLoadKey extends IEntityLoadKey<TFields, TSerializedLoadValue, TLoadValue>,
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
    TLoadKey extends IEntityLoadKey<TFields, TSerializedLoadValue, TLoadValue>,
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
      loadType: key.getDataManagerLoadMethodType(),
    });
    const dataLoader = this.getDataLoaderForLoadKey(key);
    const results = await dataLoader.loadMany(
      values.map((v) => key.serializeLoadValueForDataManagerDataLoader(v)),
    );
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

  private async invalidateManyAsync<
    TLoadKey extends IEntityLoadKey<TFields, TSerializedLoadValue, TLoadValue>,
    TSerializedLoadValue,
    TLoadValue extends IEntityLoadValue<TSerializedLoadValue>,
  >(key: TLoadKey, values: readonly TLoadValue[]): Promise<void> {
    await this.entityCache.invalidateManyAsync(key, values);
    const dataLoader = this.getDataLoaderForLoadKey(key);
    values.forEach((value) =>
      dataLoader.clear(key.serializeLoadValueForDataManagerDataLoader(value)),
    );
  }

  /**
   * Invalidate all caches, in-memory or otherwise, for an object.
   *
   * @param objectFields - object to invalidate from all applicable caches
   */
  async invalidateObjectFieldsAsync(objectFields: Readonly<TFields>): Promise<void> {
    // TODO(wschurman): check for races with load
    const keys = Object.keys(objectFields) as (keyof TFields)[];
    await Promise.all([
      ...keys.map(async (fieldName: keyof TFields) => {
        const value = objectFields[fieldName];
        if (value !== undefined && value !== null) {
          await this.invalidateManyAsync(
            new SingleFieldHolder<TFields, typeof fieldName>(fieldName),
            [new SingleFieldValueHolder(value)],
          );
        }
      }),
      ...this.entityConfiguration.compositeFieldInfo
        .getAllCompositeFieldHolders()
        .map(async (compositeFieldHolder) => {
          const compositeFieldValueHolder =
            compositeFieldHolder.extractCompositeFieldValueHolderFromObjectFields(objectFields);
          if (compositeFieldValueHolder) {
            await this.invalidateManyAsync(compositeFieldHolder, [compositeFieldValueHolder]);
          }
        }),
    ]);
  }
}
