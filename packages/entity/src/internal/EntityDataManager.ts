import DataLoader from 'dataloader';

import EntityDatabaseAdapter, {
  FieldEqualityCondition,
  QuerySelectionModifiers,
} from '../EntityDatabaseAdapter';
import { EntityQueryContext } from '../EntityQueryContext';
import IEntityQueryContextProvider from '../IEntityQueryContextProvider';
import { partitionErrors } from '../entityUtils';
import {
  timeAndLogLoadEventAsync,
  timeAndLogLoadMapEventAsync,
} from '../metrics/EntityMetricsUtils';
import IEntityMetricsAdapter, { EntityMetricsLoadType } from '../metrics/IEntityMetricsAdapter';
import { computeIfAbsent, zipToMap } from '../utils/collections/maps';
import ReadThroughEntityCache from './ReadThroughEntityCache';

/**
 * A data manager is responsible for orchestrating multiple sources of entity
 * data including local caches, {@link EntityCacheAdapter}, and {@link EntityDatabaseAdapter}.
 *
 * It is also responsible for invalidating all sources of data when mutated using {@link EntityMutator}.
 */
export default class EntityDataManager<TFields> {
  private readonly fieldDataLoaders: Map<
    keyof TFields,
    DataLoader<NonNullable<TFields[keyof TFields]>, readonly Readonly<TFields>[]>
  > = new Map();

  constructor(
    private readonly databaseAdapter: EntityDatabaseAdapter<TFields>,
    private readonly entityCache: ReadThroughEntityCache<TFields>,
    private readonly queryContextProvider: IEntityQueryContextProvider,
    private readonly metricsAdapter: IEntityMetricsAdapter
  ) {}

  private getFieldDataLoaderForFieldName<N extends keyof TFields>(
    fieldName: N
  ): DataLoader<NonNullable<TFields[N]>, readonly Readonly<TFields>[]> {
    return computeIfAbsent(this.fieldDataLoaders, fieldName, () => {
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

  private async loadManyForDataLoaderByFieldEqualingAsync<N extends keyof TFields>(
    fieldName: N,
    fieldValues: readonly NonNullable<TFields[N]>[]
  ): Promise<ReadonlyMap<NonNullable<TFields[N]>, readonly Readonly<TFields>[]>> {
    this.metricsAdapter.incrementDataManagerCacheLoadCount(fieldValues.length);
    return await this.entityCache.readManyThroughAsync(
      fieldName,
      fieldValues,
      async (fetcherValues) => {
        this.metricsAdapter.incrementDataManagerDatabaseLoadCount(fieldValues.length);
        return await this.databaseAdapter.fetchManyWhereAsync(
          this.queryContextProvider.getRegularEntityQueryContext(),
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
      EntityMetricsLoadType.LOAD_MANY
    )(this.loadManyByFieldEqualingInternalAsync(queryContext, fieldName, fieldValues));
  }

  private async loadManyByFieldEqualingInternalAsync<N extends keyof TFields>(
    queryContext: EntityQueryContext,
    fieldName: N,
    fieldValues: readonly NonNullable<TFields[N]>[]
  ): Promise<ReadonlyMap<NonNullable<TFields[N]>, readonly Readonly<TFields>[]>> {
    // don't cache when in transaction, as rollbacks complicate things significantly
    if (queryContext.isInTransaction()) {
      return await this.databaseAdapter.fetchManyWhereAsync(queryContext, fieldName, fieldValues);
    }

    this.metricsAdapter.incrementDataManagerDataloaderLoadCount(fieldValues.length);
    const dataLoader = this.getFieldDataLoaderForFieldName(fieldName);
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
      EntityMetricsLoadType.LOAD_MANY_EQUALITY_CONJUNCTION
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
      EntityMetricsLoadType.LOAD_MANY_RAW
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
    const dataLoader = this.getFieldDataLoaderForFieldName(fieldName);
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
}