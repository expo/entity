import DataLoader from 'dataloader';

import EntityDatabaseAdapter, {
  FieldEqualityCondition,
  QuerySelectionModifiers,
} from '../EntityDatabaseAdapter';
import { EntityQueryContext, EntityTransactionalQueryContext } from '../EntityQueryContext';
import EntityQueryContextProvider from '../EntityQueryContextProvider';
import { partitionErrors } from '../entityUtils';
import {
  timeAndLogLoadEventAsync,
  timeAndLogLoadMapEventAsync,
} from '../metrics/EntityMetricsUtils';
import IEntityMetricsAdapter, { EntityMetricsLoadType } from '../metrics/IEntityMetricsAdapter';
import { computeIfAbsent, zipToMap } from '../utils/collections/maps';
import ReadThroughEntityCache from './ReadThroughEntityCache';

type FieldDataLoader<TFields> = DataLoader<
  NonNullable<TFields[keyof TFields]>,
  readonly Readonly<TFields>[]
>;

type FieldDataLoadersMap<TFields> = Map<keyof TFields, FieldDataLoader<TFields>>;

/**
 * A data manager is responsible for orchestrating multiple sources of entity
 * data including local caches, {@link EntityCacheAdapter}, and {@link EntityDatabaseAdapter}.
 *
 * It is also responsible for invalidating all sources of data when mutated using {@link EntityMutator}.
 */
export default class EntityDataManager<TFields> {
  private readonly regularFieldDataLoaders: FieldDataLoadersMap<TFields> = new Map();

  private readonly transactionalFieldDataLoaders: Map<
    string,
    FieldDataLoadersMap<TFields>
  > = new Map();

  constructor(
    private readonly databaseAdapter: EntityDatabaseAdapter<TFields>,
    private readonly entityCache: ReadThroughEntityCache<TFields>,
    private readonly queryContextProvider: EntityQueryContextProvider,
    private readonly metricsAdapter: IEntityMetricsAdapter,
    private readonly entityClassName: string
  ) {}

  private getRegularFieldDataLoderForFieldName<N extends keyof TFields>(
    fieldName: N
  ): FieldDataLoader<TFields> {
    return computeIfAbsent(this.regularFieldDataLoaders, fieldName, () => {
      return new DataLoader(
        async (
          fieldValues: readonly NonNullable<TFields[N]>[]
        ): Promise<readonly (readonly TFields[])[]> => {
          const objectMap = await this.loadManyForDataLoaderByFieldEqualingAsync(
            fieldName,
            fieldValues
          );
          return fieldValues.map((fv) => objectMap.get(fv) ?? []);
        }
      );
    });
  }

  private getTransactionalFieldDataLoaderForFieldName<N extends keyof TFields>(
    queryContext: EntityTransactionalQueryContext,
    fieldName: N
  ): FieldDataLoader<TFields> {
    const fieldDataLoaderMap = computeIfAbsent(
      this.transactionalFieldDataLoaders,
      queryContext.transactionID,
      () => new Map<keyof TFields, FieldDataLoader<TFields>>()
    );
    return computeIfAbsent(fieldDataLoaderMap, fieldName, () => {
      return new DataLoader(
        async (
          fieldValues: readonly NonNullable<TFields[N]>[]
        ): Promise<readonly (readonly TFields[])[]> => {
          const objectMap = await this.loadManyForTransactionalDataLoaderByFieldEqualingAsync(
            fieldName,
            fieldValues,
            queryContext
          );
          return fieldValues.map((fv) => objectMap.get(fv) ?? []);
        }
      );
    });
  }

  private async loadManyForTransactionalDataLoaderByFieldEqualingAsync<N extends keyof TFields>(
    fieldName: N,
    fieldValues: readonly NonNullable<TFields[N]>[],
    queryContext: EntityTransactionalQueryContext
  ): Promise<ReadonlyMap<NonNullable<TFields[N]>, readonly Readonly<TFields>[]>> {
    this.metricsAdapter.incrementDataManagerDatabaseLoadCount({
      fieldValueCount: fieldValues.length,
      entityClassName: this.entityClassName,
    });
    return await this.databaseAdapter.fetchManyWhereAsync(queryContext, fieldName, fieldValues);
  }

  private async loadManyForDataLoaderByFieldEqualingAsync<N extends keyof TFields>(
    fieldName: N,
    fieldValues: readonly NonNullable<TFields[N]>[]
  ): Promise<ReadonlyMap<NonNullable<TFields[N]>, readonly Readonly<TFields>[]>> {
    this.metricsAdapter.incrementDataManagerCacheLoadCount({
      fieldValueCount: fieldValues.length,
      entityClassName: this.entityClassName,
    });

    return await this.entityCache.readManyThroughAsync(
      fieldName,
      fieldValues,
      async (fetcherValues: readonly NonNullable<TFields[N]>[]) => {
        this.metricsAdapter.incrementDataManagerDatabaseLoadCount({
          fieldValueCount: fieldValues.length,
          entityClassName: this.entityClassName,
        });
        return await this.databaseAdapter.fetchManyWhereAsync(
          this.queryContextProvider.getQueryContext(),
          fieldName,
          fetcherValues
        );
      }
    );
  }

  /**
   * Load many objects where fieldName is one of fieldValues.
   *
   * @param queryContext - query context in which to perform the load
   * @param fieldName - object field being queried
   * @param fieldValues - fieldName field values being queried
   * @returns map from fieldValue to objects that match the query for that fieldValue
   */
  async loadManyByFieldEqualingAsync<N extends keyof TFields>(
    queryContext: EntityQueryContext,
    fieldName: N,
    fieldValues: readonly NonNullable<TFields[N]>[]
  ): Promise<ReadonlyMap<NonNullable<TFields[N]>, readonly Readonly<TFields>[]>> {
    return await timeAndLogLoadMapEventAsync(
      this.metricsAdapter,
      EntityMetricsLoadType.LOAD_MANY,
      this.entityClassName
    )(this.loadManyByFieldEqualingInternalAsync(queryContext, fieldName, fieldValues));
  }

  private async loadManyByFieldEqualingInternalAsync<N extends keyof TFields>(
    queryContext: EntityQueryContext,
    fieldName: N,
    fieldValues: readonly NonNullable<TFields[N]>[]
  ): Promise<ReadonlyMap<NonNullable<TFields[N]>, readonly Readonly<TFields>[]>> {
    const nullOrUndefinedValueIndex = fieldValues.findIndex(
      (value) => value === null || value === undefined
    );
    if (nullOrUndefinedValueIndex >= 0) {
      throw new Error(
        `Invalid load: ${this.entityClassName} (${fieldName} = ${fieldValues[nullOrUndefinedValueIndex]})`
      );
    }

    this.metricsAdapter.incrementDataManagerDataloaderLoadCount({
      fieldValueCount: fieldValues.length,
      entityClassName: this.entityClassName,
    });
    const dataLoader = queryContext.isInTransaction()
      ? this.getTransactionalFieldDataLoaderForFieldName(queryContext, fieldName)
      : this.getRegularFieldDataLoderForFieldName(fieldName);
    const results = await dataLoader.loadMany(fieldValues);
    const [values, errors] = partitionErrors(results);
    if (errors.length > 0) {
      throw errors[0];
    }

    return zipToMap(fieldValues, values);
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
    querySelectionModifiers: QuerySelectionModifiers<TFields>
  ): Promise<readonly Readonly<TFields>[]> {
    return await timeAndLogLoadEventAsync(
      this.metricsAdapter,
      EntityMetricsLoadType.LOAD_MANY_EQUALITY_CONJUNCTION,
      this.entityClassName
    )(
      this.databaseAdapter.fetchManyByFieldEqualityConjunctionAsync(
        queryContext,
        fieldEqualityOperands,
        querySelectionModifiers
      )
    );
  }

  /**
   * Loads many objects matching the raw WHERE clause.
   *
   * @param queryContext - query context in which to perform the load
   * @param rawWhereClause - parameterized SQL WHERE clause with positional binding placeholders or named binding placeholders
   * @param bindings - array of positional bindings or object of named bindings
   * @param querySelectionModifiers - limit, offset, and orderBy for the query
   * @returns array of objects matching the query
   */
  async loadManyByRawWhereClauseAsync(
    queryContext: EntityQueryContext,
    rawWhereClause: string,
    bindings: any[] | object,
    querySelectionModifiers: QuerySelectionModifiers<TFields>
  ): Promise<readonly Readonly<TFields>[]> {
    return await timeAndLogLoadEventAsync(
      this.metricsAdapter,
      EntityMetricsLoadType.LOAD_MANY_RAW,
      this.entityClassName
    )(
      this.databaseAdapter.fetchManyByRawWhereClauseAsync(
        queryContext,
        rawWhereClause,
        bindings,
        querySelectionModifiers
      )
    );
  }

  private async invalidateManyByFieldEqualingAsync<N extends keyof TFields>(
    fieldName: N,
    fieldValues: readonly NonNullable<TFields[N]>[]
  ): Promise<void> {
    await this.entityCache.invalidateManyAsync(fieldName, fieldValues);
    const dataLoader = this.getRegularFieldDataLoderForFieldName(fieldName);
    fieldValues.forEach((fieldValue) => dataLoader.clear(fieldValue));
  }

  private async invalidateManyByFieldEqualingTransactionalAsync<N extends keyof TFields>(
    queryContext: EntityQueryContext,
    fieldName: N,
    fieldValues: readonly NonNullable<TFields[N]>[]
  ): Promise<void> {
    if (!queryContext.isInTransaction()) {
      return;
    }

    const dataLoader = this.getTransactionalFieldDataLoaderForFieldName(queryContext, fieldName);
    fieldValues.forEach((fieldValue) => dataLoader.clear(fieldValue));
  }

  /**
   * Invalidate all caches, in-memory or otherwise, for an object.
   *
   * @param objectFields - object to invalidate from all applicable caches
   */
  async invalidateObjectFieldsAsync(objectFields: Readonly<TFields>): Promise<void> {
    // TODO(wschurman): check for races with load
    const keys = Object.keys(objectFields) as (keyof TFields)[];
    await Promise.all(
      keys.map(async (fieldName: keyof TFields) => {
        const value = objectFields[fieldName];
        if (value !== undefined) {
          await this.invalidateManyByFieldEqualingAsync(fieldName, [
            value as NonNullable<TFields[keyof TFields]>,
          ]);
        }
      })
    );
  }

  async invalidateObjectFieldsTransactionalAsync(
    queryContext: EntityQueryContext,
    objectFields: Readonly<TFields>
  ): Promise<void> {
    const keys = Object.keys(objectFields) as (keyof TFields)[];
    await Promise.all(
      keys.map(async (fieldName: keyof TFields) => {
        const value = objectFields[fieldName];
        if (value !== undefined) {
          await this.invalidateManyByFieldEqualingTransactionalAsync(queryContext, fieldName, [
            value as NonNullable<TFields[keyof TFields]>,
          ]);
        }
      })
    );
  }
}
