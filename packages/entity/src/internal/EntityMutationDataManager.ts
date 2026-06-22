import { Batcher } from '@expo/batcher';

import type { EntityDatabaseAdapter } from '../EntityDatabaseAdapter.ts';
import type { EntityTransactionalQueryContext } from '../EntityQueryContext.ts';
import type { IEntityMetricsAdapter } from '../metrics/IEntityMetricsAdapter.ts';
import {
  EntityMetricsMutationType,
  IncrementMutationCountEventType,
} from '../metrics/IEntityMetricsAdapter.ts';
import { computeIfAbsent } from '../utils/collections/maps.ts';

/**
 * A mutation data manager is responsible for batching mutation operations
 * (inserts, updates, deletes) within a transaction using \@expo/batcher.
 *
 * This is the mutation counterpart of {@link EntityDataManager}, which batches
 * read operations using dataloader. All mutations run within a transaction,
 * so batchers are always per-transaction.
 *
 * @internal
 */
export class EntityMutationDataManager<
  TFields extends Record<string, any>,
  TIDField extends keyof TFields,
> {
  // Map<transactionId, Batcher>
  private readonly insertBatchers: Map<
    string,
    Batcher<Readonly<Partial<TFields>>, Readonly<TFields>>
  > = new Map();

  // Map<transactionId + ':' + columnSetKey, Batcher>
  private readonly updateBatchers: Map<
    string,
    Batcher<{ id: any; object: Readonly<Partial<TFields>> }, void>
  > = new Map();

  // Map<transactionId, Batcher>
  private readonly deleteBatchers: Map<string, Batcher<{ idField: keyof TFields; id: any }, void>> =
    new Map();

  constructor(
    private readonly databaseAdapter: EntityDatabaseAdapter<TFields, TIDField>,
    private readonly metricsAdapter: IEntityMetricsAdapter,
    private readonly entityClassName: string,
  ) {}

  /**
   * Insert an object, batching with other concurrent inserts in the same transaction.
   *
   * @param queryContext - transactional query context in which to perform the insert
   * @param object - the object to insert
   * @returns the inserted object
   */
  async insertAsync(
    queryContext: EntityTransactionalQueryContext,
    object: Readonly<Partial<TFields>>,
  ): Promise<Readonly<TFields>> {
    this.metricsAdapter.incrementDataManagerMutationCount({
      type: IncrementMutationCountEventType.BATCHER,
      mutationType: EntityMetricsMutationType.CREATE,
      entityClassName: this.entityClassName,
      itemCount: 1,
    });

    const batcher = this.getOrCreateInsertBatcher(queryContext);
    return await batcher.batchAsync(object);
  }

  /**
   * Update an object, batching with other concurrent updates in the same transaction
   * that update the same set of fields.
   *
   * @param queryContext - transactional query context in which to perform the update
   * @param idField - the field in the object that is the ID
   * @param id - the value of the ID field
   * @param object - the fields to update
   */
  async updateAsync<K extends keyof TFields, TUpdate extends Readonly<Partial<TFields>>>(
    queryContext: EntityTransactionalQueryContext,
    idField: K,
    id: any,
    object: TUpdate,
  ): Promise<void> {
    this.metricsAdapter.incrementDataManagerMutationCount({
      type: IncrementMutationCountEventType.BATCHER,
      mutationType: EntityMetricsMutationType.UPDATE,
      entityClassName: this.entityClassName,
      itemCount: 1,
    });

    const batcher = this.getOrCreateUpdateBatcher(queryContext, idField, object);
    await batcher.batchAsync({ id, object });
  }

  /**
   * Delete an object by ID, batching with other concurrent deletes in the same transaction.
   *
   * @param queryContext - transactional query context in which to perform the deletion
   * @param idField - the field in the object that is the ID
   * @param id - the value of the ID field
   */
  async deleteAsync<K extends keyof TFields>(
    queryContext: EntityTransactionalQueryContext,
    idField: K,
    id: any,
  ): Promise<void> {
    this.metricsAdapter.incrementDataManagerMutationCount({
      type: IncrementMutationCountEventType.BATCHER,
      mutationType: EntityMetricsMutationType.DELETE,
      entityClassName: this.entityClassName,
      itemCount: 1,
    });

    const batcher = this.getOrCreateDeleteBatcher(queryContext, idField);
    await batcher.batchAsync({ idField, id });
  }

  private getOrCreateInsertBatcher(
    queryContext: EntityTransactionalQueryContext,
  ): Batcher<Readonly<Partial<TFields>>, Readonly<TFields>> {
    return computeIfAbsent(this.insertBatchers, queryContext.transactionId, () => {
      const batchOperation = async (
        objects: Readonly<Partial<TFields>>[],
      ): Promise<Readonly<TFields>[]> => {
        this.metricsAdapter.incrementDataManagerMutationCount({
          type: IncrementMutationCountEventType.DATABASE,
          mutationType: EntityMetricsMutationType.CREATE,
          entityClassName: this.entityClassName,
          itemCount: objects.length,
        });
        const results = await this.databaseAdapter.insertManyAsync(queryContext, objects);
        return [...results];
      };
      // Cast needed because Batcher's conditional type `TResult extends void ? void : TResult[]`
      // cannot be resolved by TypeScript when TResult is a generic type parameter.

      return new Batcher(batchOperation as any, {
        maxBatchInterval: 0,
      });
    });
  }

  private getOrCreateUpdateBatcher<K extends keyof TFields>(
    queryContext: EntityTransactionalQueryContext,
    idField: K,
    object: Readonly<Partial<TFields>>,
  ): Batcher<{ id: any; object: Readonly<Partial<TFields>> }, void> {
    const columnSetKey = Object.keys(object).sort().join(',');
    const batcherKey = `${queryContext.transactionId}:${columnSetKey}`;
    return computeIfAbsent(this.updateBatchers, batcherKey, () => {
      return new Batcher(
        async (items: { id: any; object: Readonly<Partial<TFields>> }[]) => {
          this.metricsAdapter.incrementDataManagerMutationCount({
            type: IncrementMutationCountEventType.DATABASE,
            mutationType: EntityMetricsMutationType.UPDATE,
            entityClassName: this.entityClassName,
            itemCount: items.length,
          });
          await this.databaseAdapter.updateManyAsync(queryContext, idField, items);
        },
        { maxBatchInterval: 0 },
      );
    });
  }

  private getOrCreateDeleteBatcher<K extends keyof TFields>(
    queryContext: EntityTransactionalQueryContext,
    idField: K,
  ): Batcher<{ idField: keyof TFields; id: any }, void> {
    return computeIfAbsent(this.deleteBatchers, queryContext.transactionId, () => {
      return new Batcher(
        async (items: { idField: keyof TFields; id: any }[]) => {
          this.metricsAdapter.incrementDataManagerMutationCount({
            type: IncrementMutationCountEventType.DATABASE,
            mutationType: EntityMetricsMutationType.DELETE,
            entityClassName: this.entityClassName,
            itemCount: items.length,
          });
          const ids = items.map((item) => item.id);
          await this.databaseAdapter.deleteManyAsync(queryContext, idField, ids);
        },
        { maxBatchInterval: 0 },
      );
    });
  }
}
