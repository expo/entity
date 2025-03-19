import DataLoader from 'dataloader';

import {
  CompositeFieldHolder,
  SerializedCompositeFieldHolder,
  CompositeFieldValueHolder,
  SerializedCompositeFieldValueHolder,
} from './CompositeFieldHolder';
import ReadThroughEntityCache from './ReadThroughEntityCache';
import EntityConfiguration, { EntityCompositeField } from '../EntityConfiguration';
import EntityDatabaseAdapter, {
  FieldEqualityCondition,
  QuerySelectionModifiers,
  QuerySelectionModifiersWithOrderByRaw,
} from '../EntityDatabaseAdapter';
import { EntityQueryContext } from '../EntityQueryContext';
import EntityQueryContextProvider from '../EntityQueryContextProvider';
import { partitionErrors } from '../entityUtils';
import {
  CompositeFieldValueHolderMap,
  CompositeFieldValueHolderReadonlyMap,
} from './CompositeFieldValueHolderMap';
import {
  timeAndLogLoadEventAsync,
  timeAndLogLoadMapEventAsync,
} from '../metrics/EntityMetricsUtils';
import IEntityMetricsAdapter, {
  EntityMetricsLoadType,
  IncrementLoadCountEventLoadMethodType,
  IncrementLoadCountEventType,
} from '../metrics/IEntityMetricsAdapter';
import { computeIfAbsent, zipToMap } from '../utils/collections/maps';

/**
 * A data manager is responsible for orchestrating multiple sources of entity
 * data including local caches, EntityCacheAdapter, and EntityDatabaseAdapter.
 *
 * It is also responsible for invalidating all sources of data when mutated using EntityMutator.
 */
export default class EntityDataManager<TFields extends Record<string, any>> {
  private readonly fieldDataLoaders: Map<
    keyof TFields,
    DataLoader<NonNullable<TFields[keyof TFields]>, readonly Readonly<TFields>[]>
  > = new Map();
  private readonly compositeFieldDataLoaders: Map<
    SerializedCompositeFieldHolder,
    DataLoader<string, readonly Readonly<TFields>[]>
  > = new Map();

  constructor(
    private readonly entityConfiguration: EntityConfiguration<TFields>,
    private readonly databaseAdapter: EntityDatabaseAdapter<TFields>,
    private readonly entityCache: ReadThroughEntityCache<TFields>,
    private readonly queryContextProvider: EntityQueryContextProvider,
    private readonly metricsAdapter: IEntityMetricsAdapter,
    private readonly entityClassName: string,
  ) {}

  private getFieldDataLoaderForFieldName<N extends keyof TFields>(
    fieldName: N,
  ): DataLoader<NonNullable<TFields[N]>, readonly Readonly<TFields>[]> {
    return computeIfAbsent(this.fieldDataLoaders, fieldName, () => {
      return new DataLoader(
        async (
          fieldValues: readonly NonNullable<TFields[N]>[],
        ): Promise<readonly (readonly TFields[])[]> => {
          const objectMap = await this.loadManyForDataLoaderByFieldEqualingAsync(
            fieldName,
            fieldValues,
          );
          return fieldValues.map((fv) => objectMap.get(fv) ?? []);
        },
      );
    });
  }

  private getCompositeFieldDataLoaderForCompositeField(
    compositeFieldHolder: CompositeFieldHolder<TFields>,
  ): DataLoader<SerializedCompositeFieldValueHolder, readonly Readonly<TFields>[]> {
    return computeIfAbsent(this.compositeFieldDataLoaders, compositeFieldHolder.serialize(), () => {
      return new DataLoader(
        async (
          serializedCompositeFieldValueHolders: readonly SerializedCompositeFieldValueHolder[],
        ): Promise<readonly (readonly TFields[])[]> => {
          const objectMap =
            await this.loadManyForDataLoaderBySerializedCompositeFieldValueHoldersAsync(
              compositeFieldHolder,
              serializedCompositeFieldValueHolders,
            );
          return serializedCompositeFieldValueHolders.map(
            (compositeFieldValueHolderSerialized) =>
              objectMap.get(
                CompositeFieldValueHolder.deserialize(compositeFieldValueHolderSerialized),
              ) ?? [],
          );
        },
      );
    });
  }

  private async loadManyForDataLoaderByFieldEqualingAsync<N extends keyof TFields>(
    fieldName: N,
    fieldValues: readonly NonNullable<TFields[N]>[],
  ): Promise<ReadonlyMap<NonNullable<TFields[N]>, readonly Readonly<TFields>[]>> {
    this.metricsAdapter.incrementDataManagerLoadCount({
      type: IncrementLoadCountEventType.CACHE,
      fieldValueCount: fieldValues.length,
      entityClassName: this.entityClassName,
      loadType: IncrementLoadCountEventLoadMethodType.STANDARD,
    });
    return await this.entityCache.readManyThroughAsync(
      fieldName,
      fieldValues,
      async (fetcherValues) => {
        this.metricsAdapter.incrementDataManagerLoadCount({
          type: IncrementLoadCountEventType.DATABASE,
          fieldValueCount: fieldValues.length,
          entityClassName: this.entityClassName,
          loadType: IncrementLoadCountEventLoadMethodType.STANDARD,
        });
        return await this.databaseAdapter.fetchManyWhereAsync(
          this.queryContextProvider.getQueryContext(),
          fieldName,
          fetcherValues,
        );
      },
    );
  }

  private async loadManyForDataLoaderBySerializedCompositeFieldValueHoldersAsync<
    N extends EntityCompositeField<TFields>,
  >(
    compositeFieldHolder: CompositeFieldHolder<TFields>,
    serializedCompositeFieldValueHolders: readonly SerializedCompositeFieldValueHolder[],
  ): Promise<CompositeFieldValueHolderReadonlyMap<TFields, N, readonly Readonly<TFields>[]>> {
    const compositeFieldValueHolders = serializedCompositeFieldValueHolders.map((v) =>
      CompositeFieldValueHolder.deserialize(v),
    ) as readonly CompositeFieldValueHolder<TFields, N>[];
    this.metricsAdapter.incrementDataManagerLoadCount({
      type: IncrementLoadCountEventType.CACHE,
      fieldValueCount: compositeFieldValueHolders.length,
      entityClassName: this.entityClassName,
      loadType: IncrementLoadCountEventLoadMethodType.COMPOSITE,
    });
    return await this.entityCache.readManyCompositeFieldThroughAsync<N>(
      compositeFieldHolder,
      compositeFieldValueHolders,
      async (fetcherCompositeFieldValueHolders) => {
        this.metricsAdapter.incrementDataManagerLoadCount({
          type: IncrementLoadCountEventType.DATABASE,
          fieldValueCount: fetcherCompositeFieldValueHolders.length,
          entityClassName: this.entityClassName,
          loadType: IncrementLoadCountEventLoadMethodType.COMPOSITE,
        });
        return await this.databaseAdapter.fetchManyWhereCompositeFieldAsync(
          this.queryContextProvider.getQueryContext(),
          compositeFieldHolder,
          fetcherCompositeFieldValueHolders,
        );
      },
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
    fieldValues: readonly NonNullable<TFields[N]>[],
  ): Promise<ReadonlyMap<NonNullable<TFields[N]>, readonly Readonly<TFields>[]>> {
    return await timeAndLogLoadMapEventAsync(
      this.metricsAdapter,
      EntityMetricsLoadType.LOAD_MANY,
      this.entityClassName,
    )(this.loadManyByFieldEqualingInternalAsync(queryContext, fieldName, fieldValues));
  }

  private async loadManyByFieldEqualingInternalAsync<N extends keyof TFields>(
    queryContext: EntityQueryContext,
    fieldName: N,
    fieldValues: readonly NonNullable<TFields[N]>[],
  ): Promise<ReadonlyMap<NonNullable<TFields[N]>, readonly Readonly<TFields>[]>> {
    const nullOrUndefinedValueIndex = fieldValues.findIndex(
      (value) => value === null || value === undefined,
    );
    if (nullOrUndefinedValueIndex >= 0) {
      throw new Error(
        `Invalid load: ${this.entityClassName} (${String(fieldName)} = ${
          fieldValues[nullOrUndefinedValueIndex]
        })`,
      );
    }

    // don't cache when in transaction, as rollbacks complicate things significantly
    if (queryContext.isInTransaction()) {
      return await this.databaseAdapter.fetchManyWhereAsync(queryContext, fieldName, fieldValues);
    }

    this.metricsAdapter.incrementDataManagerLoadCount({
      type: IncrementLoadCountEventType.DATALOADER,
      fieldValueCount: fieldValues.length,
      entityClassName: this.entityClassName,
      loadType: IncrementLoadCountEventLoadMethodType.STANDARD,
    });
    const dataLoader = this.getFieldDataLoaderForFieldName(fieldName);
    const results = await dataLoader.loadMany(fieldValues);
    const [values, errors] = partitionErrors(results);
    if (errors.length > 0) {
      const error = errors[0]!;
      throw error;
    }

    return zipToMap(fieldValues, values);
  }

  async loadManyByCompositeFieldEqualingAsync<N extends EntityCompositeField<TFields>>(
    queryContext: EntityQueryContext,
    compositeFieldHolder: CompositeFieldHolder<TFields>,
    compositeFieldValueHolders: readonly CompositeFieldValueHolder<TFields, N>[],
  ): Promise<CompositeFieldValueHolderReadonlyMap<TFields, N, readonly Readonly<TFields>[]>> {
    return await timeAndLogLoadMapEventAsync(
      this.metricsAdapter,
      EntityMetricsLoadType.LOAD_MANY_COMPOSITE_KEY,
      this.entityClassName,
    )(
      this.loadManyByCompositeFieldEqualingInternalAsync(
        queryContext,
        compositeFieldHolder,
        compositeFieldValueHolders,
      ),
    );
  }

  private async loadManyByCompositeFieldEqualingInternalAsync<
    N extends EntityCompositeField<TFields>,
  >(
    queryContext: EntityQueryContext,
    compositeFieldHolder: CompositeFieldHolder<TFields>,
    compositeFieldValueHolders: readonly CompositeFieldValueHolder<TFields, N>[],
  ): Promise<CompositeFieldValueHolderReadonlyMap<TFields, N, readonly Readonly<TFields>[]>> {
    // const nullOrUndefinedValueIndex = fieldValues.findIndex(
    //   (value) => value === null || value === undefined,
    // );
    // if (nullOrUndefinedValueIndex >= 0) {
    //   throw new Error(
    //     `Invalid load: ${this.entityClassName} (${String(fieldName)} = ${
    //       fieldValues[nullOrUndefinedValueIndex]
    //     })`,
    //   );
    // }

    // don't cache when in transaction, as rollbacks complicate things significantly
    if (queryContext.isInTransaction()) {
      return await this.databaseAdapter.fetchManyWhereCompositeFieldAsync(
        queryContext,
        compositeFieldHolder,
        compositeFieldValueHolders,
      );
    }

    this.metricsAdapter.incrementDataManagerLoadCount({
      type: IncrementLoadCountEventType.DATALOADER,
      fieldValueCount: compositeFieldValueHolders.length,
      entityClassName: this.entityClassName,
      loadType: IncrementLoadCountEventLoadMethodType.COMPOSITE,
    });
    const dataLoader = this.getCompositeFieldDataLoaderForCompositeField(compositeFieldHolder);
    const results = await dataLoader.loadMany(compositeFieldValueHolders.map((v) => v.serialize()));
    const [values, errors] = partitionErrors(results);
    if (errors.length > 0) {
      const error = errors[0]!;
      throw error;
    }

    return CompositeFieldValueHolderMap.fromKeysAndValueZip(compositeFieldValueHolders, values);
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

  private async invalidateManyByFieldEqualingAsync<N extends keyof TFields>(
    fieldName: N,
    fieldValues: readonly NonNullable<TFields[N]>[],
  ): Promise<void> {
    await this.entityCache.invalidateManyAsync(fieldName, fieldValues);
    const dataLoader = this.getFieldDataLoaderForFieldName(fieldName);
    fieldValues.forEach((fieldValue) => dataLoader.clear(fieldValue));
  }

  private async invalidateManyByCompositeFieldEqualingAsync<
    N extends EntityCompositeField<TFields>,
  >(
    compositeFieldHolder: CompositeFieldHolder<TFields>,
    compositeFieldValueHolders: readonly CompositeFieldValueHolder<TFields, N>[],
  ): Promise<void> {
    await this.entityCache.invalidateManyCompositeFieldAsync(
      compositeFieldHolder,
      compositeFieldValueHolders,
    );
    const dataLoader = this.getCompositeFieldDataLoaderForCompositeField(compositeFieldHolder);
    compositeFieldValueHolders.forEach((compositeFieldValueHolder) =>
      dataLoader.clear(compositeFieldValueHolder.serialize()),
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
          await this.invalidateManyByFieldEqualingAsync(fieldName, [value]);
        }
      }),
      ...this.entityConfiguration.compositeFieldInfo
        .getAllCompositeFieldHolders()
        .map(async (compositeFieldHolder) => {
          const compositeFieldValueHolder =
            compositeFieldHolder.extractCompositeFieldValueHolderFromObjectFields(objectFields);
          if (compositeFieldValueHolder) {
            await this.invalidateManyByCompositeFieldEqualingAsync(compositeFieldHolder, [
              compositeFieldValueHolder,
            ]);
          }
        }),
    ]);
  }
}
