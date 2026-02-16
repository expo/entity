import { Result, asyncResult, enforceAsyncResult, result } from '@expo/results';
import invariant from 'invariant';

import { Entity, IEntityClass } from './Entity';
import { EntityCompanionProvider } from './EntityCompanionProvider';
import { EntityConfiguration } from './EntityConfiguration';
import { EntityDatabaseAdapter } from './EntityDatabaseAdapter';
import { EntityEdgeDeletionBehavior } from './EntityFieldDefinition';
import { EntityLoaderFactory } from './EntityLoaderFactory';
import {
  EntityCascadingDeletionInfo,
  EntityMutationType,
  EntityTriggerMutationInfo,
  EntityValidatorMutationInfo,
} from './EntityMutationInfo';
import {
  EntityMutationTrigger,
  EntityMutationTriggerConfiguration,
  EntityNonTransactionalMutationTrigger,
} from './EntityMutationTriggerConfiguration';
import {
  EntityMutationValidator,
  EntityMutationValidatorConfiguration,
} from './EntityMutationValidatorConfiguration';
import { EntityPrivacyPolicy } from './EntityPrivacyPolicy';
import { EntityQueryContext, EntityTransactionalQueryContext } from './EntityQueryContext';
import { ViewerContext } from './ViewerContext';
import { enforceResultsAsync } from './entityUtils';
import { EntityInvalidFieldValueError } from './errors/EntityInvalidFieldValueError';
import { timeAndLogMutationEventAsync } from './metrics/EntityMetricsUtils';
import { EntityMetricsMutationType, IEntityMetricsAdapter } from './metrics/IEntityMetricsAdapter';
import { mapMapAsync } from './utils/collections/maps';

/**
 * Base class for entity mutators. Mutators are builder-like class instances that are
 * responsible for creating, updating, and deleting entities, and for calling out to
 * the loader at appropriate times to invalidate the cache(s). The loader is responsible
 * for deciding which cache entries to invalidate for the entity being mutated.
 *
 * ## Notes on invalidation
 *
 * The primary goal of invalidation is to ensure that at any point in time, a load
 * for an entity through a cache or layers of caches will return the most up-to-date
 * value for that entity according to the source of truth stored in the database, and thus
 * the read-through cache must be kept consistent (only current values are stored, others are invalidated).
 *
 * This is done by invalidating the cache for the entity being mutated at the end of the transaction
 * in which the mutation is performed. This ensures that the cache is invalidated as close as possible
 * to when the source-of-truth is updated in the database, as to reduce the likelihood of
 * collisions with loads done at the same time on other machines.
 *
 * <blockquote>
 *    The easiest way to demonstrate this reasoning is via some counter-examples.
 *    For sake of demonstration, let's say we did invalidation immediately after the mutation instead of
 *    at the end of the transaction.
 *
 *    Example 1:
 *    - t=0. A transaction is started on machine A and within this transaction a new entity is created.
 *           The cache for the entity is invalidated.
 *    - t=1. Machine B tries to load the same entity outside of a transaction. It does not yet exist
 *           so it negatively caches the entity.
 *    - t=2. Machine A commits the transaction.
 *    - t=3. Machine C tries to load the same entity outside of a transaction. It is negatively cached
 *           so it returns null, even though it exists in the database.
 *
 *    One can see that it's strictly better to invalidate the transaction at t=2 as it would remove the
 *    negative cache entry for the entity, thus leaving the cache consistent with the database.
 *
 *    Example 2:
 *    - t=0. Entity A is created and read into the cache (everthing is consistent at this point in time).
 *    - t=1. Machine A starts a transaction, reads entity A, updates it, and invalidates the cache.
 *    - t=2. Machine B reads entity A outside of a transaction. Since the transaction from the step above
 *           has not yet been committed, the changes within that transaction are not yet visible. It stores
 *           the entity in the cache.
 *    - t=3. Machine A commits the transaction.
 *    - t=4. Machine C reads entity A outside of a transaction. It returns the entity from the cache which
 *           is now inconsistent with the database.
 *
 *    Again, one can see that it's strictly better to invalidate the transaction at t=3 as it would remove the
 *    stale cache entry for the entity, thus leaving the cache consistent with the database.
 *
 *    For deletions, one can imagine a similar series of events occurring.
 * </blockquote>
 *
 * #### Invalidation as it pertains to transactions and nested transactions
 *
 * Invalidation becomes slightly more complex when nested transactions are considered. The general
 * guiding principle here is that over-invalidation is strictly better than under-invalidation
 * as far as consistency goes. This is because the database is the source of truth.
 *
 * For the visible-to-the-outside-world caches (cache adapters), the invalidations are done at the
 * end of the outermost transaction (as discussed above), plus at the end of each nested transaction.
 * While only the outermost transaction is strictly necessary for these cache adapter invalidations,
 * the mental model of doing it at the end of each transaction, nested or otherwise, is easier to reason about.
 *
 * For the dataloader caches (per-transaction local caches), the invalidation is done multiple times
 * (over-invalidation) to better ensure that the caches are always consistent with the database as read within
 * the transaction or nested transaction.
 * 1. Immediately after the mutation is performed (but before the transaction or nested transaction is committed).
 * 2. At the end of the transaction (or nested transaction) itself.
 * 3. At the end of the outermost transaction (if this is a nested transaction) and all of that transactions's nested transactions recursively.
 *
 * This over-invalidation is done because transaction isolation semantics are not consistent across all
 * databases (some databases don't even have true nested transactions at all), meaning that whether
 * a change made in a nested transaction is visible to the parent transaction(s) is not necessarily known.
 * This means that the only way to ensure that the dataloader caches are consistent
 * with the database is to invalidate them often, thus delegating consistency to the database. Invalidation
 * of local caches is synchronous and immediate, so the performance impact of over-invalidation is negligible.
 *
 * #### Invalidation pitfalls
 *
 * One may have noticed that the above invalidation strategy still isn't perfect. Cache invalidation is hard.
 * There still exists a very short moment in time between when invalidation occurs and when the transaction is committed,
 * so dirty cache writes are still possible, especially in systems reading an object frequently and writing to the same object.
 * For now, the entity framework does not attempt to provide a further solution to this problem since it is likely
 * solutions will be case-specific. Some fun reads on the topic:
 * - https://engineering.fb.com/2013/06/25/core-infra/tao-the-power-of-the-graph/
 * - https://hazelcast.com/blog/a-hitchhikers-guide-to-caching-patterns/
 */
export abstract class AuthorizationResultBasedBaseMutator<
  TFields extends Record<string, any>,
  TIDField extends keyof NonNullable<Pick<TFields, TSelectedFields>>,
  TViewerContext extends ViewerContext,
  TEntity extends Entity<TFields, TIDField, TViewerContext, TSelectedFields>,
  TPrivacyPolicy extends EntityPrivacyPolicy<
    TFields,
    TIDField,
    TViewerContext,
    TEntity,
    TSelectedFields
  >,
  TSelectedFields extends keyof TFields,
> {
  constructor(
    protected readonly companionProvider: EntityCompanionProvider,
    protected readonly viewerContext: TViewerContext,
    protected readonly queryContext: EntityQueryContext,
    protected readonly entityConfiguration: EntityConfiguration<TFields, TIDField>,
    protected readonly entityClass: IEntityClass<
      TFields,
      TIDField,
      TViewerContext,
      TEntity,
      TPrivacyPolicy,
      TSelectedFields
    >,
    protected readonly privacyPolicy: TPrivacyPolicy,
    protected readonly mutationValidators: EntityMutationValidatorConfiguration<
      TFields,
      TIDField,
      TViewerContext,
      TEntity,
      TSelectedFields
    >,
    protected readonly mutationTriggers: EntityMutationTriggerConfiguration<
      TFields,
      TIDField,
      TViewerContext,
      TEntity,
      TSelectedFields
    >,
    protected readonly entityLoaderFactory: EntityLoaderFactory<
      TFields,
      TIDField,
      TViewerContext,
      TEntity,
      TPrivacyPolicy,
      TSelectedFields
    >,
    protected readonly databaseAdapter: EntityDatabaseAdapter<TFields, TIDField>,
    protected readonly metricsAdapter: IEntityMetricsAdapter,
  ) {}

  protected validateFields(fields: Partial<TFields>): void {
    for (const fieldName in fields) {
      const fieldValue = fields[fieldName];
      const fieldDefinition = this.entityConfiguration.schema.get(fieldName);
      invariant(fieldDefinition, `must have field definition for field = ${fieldName}`);
      const isInputValid = fieldDefinition.validateInputValue(fieldValue);
      if (!isInputValid) {
        throw new EntityInvalidFieldValueError<
          TFields,
          TIDField,
          TViewerContext,
          TEntity,
          TPrivacyPolicy,
          keyof TFields,
          TSelectedFields
        >(this.entityClass, fieldName, fieldValue);
      }
    }
  }

  protected async executeMutationValidatorsAsync(
    validators:
      | EntityMutationValidator<TFields, TIDField, TViewerContext, TEntity, TSelectedFields>[]
      | undefined,
    queryContext: EntityTransactionalQueryContext,
    entity: TEntity,
    mutationInfo: EntityValidatorMutationInfo<
      TFields,
      TIDField,
      TViewerContext,
      TEntity,
      TSelectedFields
    >,
  ): Promise<void> {
    if (!validators) {
      return;
    }

    await Promise.all(
      validators.map((validator) =>
        validator.executeAsync(this.viewerContext, queryContext, entity, mutationInfo),
      ),
    );
  }

  protected async executeMutationTriggersAsync(
    triggers:
      | EntityMutationTrigger<TFields, TIDField, TViewerContext, TEntity, TSelectedFields>[]
      | undefined,
    queryContext: EntityTransactionalQueryContext,
    entity: TEntity,
    mutationInfo: EntityTriggerMutationInfo<
      TFields,
      TIDField,
      TViewerContext,
      TEntity,
      TSelectedFields
    >,
  ): Promise<void> {
    if (!triggers) {
      return;
    }
    await Promise.all(
      triggers.map((trigger) =>
        trigger.executeAsync(this.viewerContext, queryContext, entity, mutationInfo),
      ),
    );
  }

  protected async executeNonTransactionalMutationTriggersAsync(
    triggers:
      | EntityNonTransactionalMutationTrigger<
          TFields,
          TIDField,
          TViewerContext,
          TEntity,
          TSelectedFields
        >[]
      | undefined,
    entity: TEntity,
    mutationInfo: EntityTriggerMutationInfo<
      TFields,
      TIDField,
      TViewerContext,
      TEntity,
      TSelectedFields
    >,
  ): Promise<void> {
    if (!triggers) {
      return;
    }
    await Promise.all(
      triggers.map((trigger) => trigger.executeAsync(this.viewerContext, entity, mutationInfo)),
    );
  }
}

/**
 * Mutator for creating a new entity.
 */
export class AuthorizationResultBasedCreateMutator<
  TFields extends Record<string, any>,
  TIDField extends keyof NonNullable<Pick<TFields, TSelectedFields>>,
  TViewerContext extends ViewerContext,
  TEntity extends Entity<TFields, TIDField, TViewerContext, TSelectedFields>,
  TPrivacyPolicy extends EntityPrivacyPolicy<
    TFields,
    TIDField,
    TViewerContext,
    TEntity,
    TSelectedFields
  >,
  TSelectedFields extends keyof TFields,
> extends AuthorizationResultBasedBaseMutator<
  TFields,
  TIDField,
  TViewerContext,
  TEntity,
  TPrivacyPolicy,
  TSelectedFields
> {
  private readonly fieldsForEntity: Partial<TFields> = {};

  /**
   * Set the value for entity field.
   * @param fieldName - entity field being set
   * @param value - value for entity field
   */
  setField<K extends keyof Pick<TFields, TSelectedFields>>(fieldName: K, value: TFields[K]): this {
    this.fieldsForEntity[fieldName] = value;
    return this;
  }

  /**
   * Commit the new entity after authorizing against creation privacy rules. Invalidates all caches for
   * queries that would return new entity.
   * @returns authorized, cached, newly-created entity result, where result error can be UnauthorizedError
   */
  async createAsync(): Promise<Result<TEntity>> {
    return await timeAndLogMutationEventAsync(
      this.metricsAdapter,
      EntityMetricsMutationType.CREATE,
      this.entityClass.name,
      this.queryContext,
    )(this.createInTransactionAsync());
  }

  private async createInTransactionAsync(): Promise<Result<TEntity>> {
    return await this.queryContext.runInTransactionIfNotInTransactionAsync((innerQueryContext) =>
      this.createInternalAsync(innerQueryContext),
    );
  }

  private async createInternalAsync(
    queryContext: EntityTransactionalQueryContext,
  ): Promise<Result<TEntity>> {
    this.validateFields(this.fieldsForEntity);

    const entityLoader = this.entityLoaderFactory.forLoad(this.viewerContext, queryContext, {
      previousValue: null,
      cascadingDeleteCause: null,
    });
    const invalidationUtils = this.entityLoaderFactory.invalidationUtils();
    const constructionUtils = this.entityLoaderFactory.constructionUtils(
      this.viewerContext,
      queryContext,
      {
        previousValue: null,
        cascadingDeleteCause: null,
      },
    );

    const temporaryEntityForPrivacyCheck = constructionUtils.constructEntity({
      [this.entityConfiguration.idField]: '00000000-0000-0000-0000-000000000000', // zero UUID
      ...this.fieldsForEntity,
    } as unknown as TFields);

    const authorizeCreateResult = await asyncResult(
      this.privacyPolicy.authorizeCreateAsync(
        this.viewerContext,
        queryContext,
        { previousValue: null, cascadingDeleteCause: null },
        temporaryEntityForPrivacyCheck,
        this.metricsAdapter,
      ),
    );
    if (!authorizeCreateResult.ok) {
      return authorizeCreateResult;
    }

    await this.executeMutationValidatorsAsync(
      this.mutationValidators.beforeCreateAndUpdate,
      queryContext,
      temporaryEntityForPrivacyCheck,
      { type: EntityMutationType.CREATE },
    );
    await this.executeMutationTriggersAsync(
      this.mutationTriggers.beforeAll,
      queryContext,
      temporaryEntityForPrivacyCheck,
      { type: EntityMutationType.CREATE },
    );
    await this.executeMutationTriggersAsync(
      this.mutationTriggers.beforeCreate,
      queryContext,
      temporaryEntityForPrivacyCheck,
      { type: EntityMutationType.CREATE },
    );

    const insertResult = await this.databaseAdapter.insertAsync(queryContext, this.fieldsForEntity);

    // Invalidate all caches for the new entity so that any previously-negatively-cached loads
    // are removed from the caches.
    queryContext.appendPostCommitInvalidationCallback(async () => {
      invalidationUtils.invalidateFieldsForTransaction(queryContext, insertResult);
      await invalidationUtils.invalidateFieldsAsync(insertResult);
    });

    invalidationUtils.invalidateFieldsForTransaction(queryContext, insertResult);

    const unauthorizedEntityAfterInsert = constructionUtils.constructEntity(insertResult);
    const newEntity = await enforceAsyncResult(
      entityLoader.loadByIDAsync(unauthorizedEntityAfterInsert.getID()),
    );

    await this.executeMutationTriggersAsync(
      this.mutationTriggers.afterCreate,
      queryContext,
      newEntity,
      { type: EntityMutationType.CREATE },
    );
    await this.executeMutationTriggersAsync(
      this.mutationTriggers.afterAll,
      queryContext,
      newEntity,
      { type: EntityMutationType.CREATE },
    );

    queryContext.appendPostCommitCallback(
      this.executeNonTransactionalMutationTriggersAsync.bind(
        this,
        this.mutationTriggers.afterCommit,
        newEntity,
        { type: EntityMutationType.CREATE },
      ),
    );

    return result(newEntity);
  }
}

/**
 * Mutator for updating an existing entity.
 */
export class AuthorizationResultBasedUpdateMutator<
  TFields extends Record<string, any>,
  TIDField extends keyof NonNullable<Pick<TFields, TSelectedFields>>,
  TViewerContext extends ViewerContext,
  TEntity extends Entity<TFields, TIDField, TViewerContext, TSelectedFields>,
  TPrivacyPolicy extends EntityPrivacyPolicy<
    TFields,
    TIDField,
    TViewerContext,
    TEntity,
    TSelectedFields
  >,
  TSelectedFields extends keyof TFields,
> extends AuthorizationResultBasedBaseMutator<
  TFields,
  TIDField,
  TViewerContext,
  TEntity,
  TPrivacyPolicy,
  TSelectedFields
> {
  private readonly originalEntity: TEntity;
  private readonly fieldsForEntity: TFields;
  private readonly updatedFields: Partial<TFields> = {};

  constructor(
    companionProvider: EntityCompanionProvider,
    viewerContext: TViewerContext,
    queryContext: EntityQueryContext,
    entityConfiguration: EntityConfiguration<TFields, TIDField>,
    entityClass: IEntityClass<
      TFields,
      TIDField,
      TViewerContext,
      TEntity,
      TPrivacyPolicy,
      TSelectedFields
    >,
    privacyPolicy: TPrivacyPolicy,
    mutationValidators: EntityMutationValidatorConfiguration<
      TFields,
      TIDField,
      TViewerContext,
      TEntity,
      TSelectedFields
    >,
    mutationTriggers: EntityMutationTriggerConfiguration<
      TFields,
      TIDField,
      TViewerContext,
      TEntity,
      TSelectedFields
    >,
    entityLoaderFactory: EntityLoaderFactory<
      TFields,
      TIDField,
      TViewerContext,
      TEntity,
      TPrivacyPolicy,
      TSelectedFields
    >,
    databaseAdapter: EntityDatabaseAdapter<TFields, TIDField>,
    metricsAdapter: IEntityMetricsAdapter,
    originalEntity: TEntity,
    private readonly cascadingDeleteCause: EntityCascadingDeletionInfo | null,
  ) {
    super(
      companionProvider,
      viewerContext,
      queryContext,
      entityConfiguration,
      entityClass,
      privacyPolicy,
      mutationValidators,
      mutationTriggers,
      entityLoaderFactory,
      databaseAdapter,
      metricsAdapter,
    );
    this.originalEntity = originalEntity;
    this.fieldsForEntity = { ...originalEntity.getAllDatabaseFields() };
  }

  /**
   * Set the value for entity field.
   * @param fieldName - entity field being updated
   * @param value - value for entity field
   */
  setField<K extends keyof Pick<TFields, TSelectedFields>>(fieldName: K, value: TFields[K]): this {
    this.fieldsForEntity[fieldName] = value;
    this.updatedFields[fieldName] = value;
    return this;
  }

  /**
   * Commit the changes to the entity after authorizing against update privacy rules.
   * Invalidates all caches for pre-update entity.
   * @returns authorized updated entity result, where result error can be UnauthorizedError
   */
  async updateAsync(): Promise<Result<TEntity>> {
    return await timeAndLogMutationEventAsync(
      this.metricsAdapter,
      EntityMetricsMutationType.UPDATE,
      this.entityClass.name,
      this.queryContext,
    )(this.updateInTransactionAsync(false));
  }

  private async updateInTransactionAsync(skipDatabaseUpdate: boolean): Promise<Result<TEntity>> {
    return await this.queryContext.runInTransactionIfNotInTransactionAsync((innerQueryContext) =>
      this.updateInternalAsync(innerQueryContext, skipDatabaseUpdate),
    );
  }

  private async updateInternalAsync(
    queryContext: EntityTransactionalQueryContext,
    skipDatabaseUpdate: boolean,
  ): Promise<Result<TEntity>> {
    this.validateFields(this.updatedFields);
    this.ensureStableIDField(this.updatedFields);

    const entityLoader = this.entityLoaderFactory.forLoad(this.viewerContext, queryContext, {
      previousValue: this.originalEntity,
      cascadingDeleteCause: this.cascadingDeleteCause,
    });
    const invalidationUtils = this.entityLoaderFactory.invalidationUtils();
    const constructionUtils = this.entityLoaderFactory.constructionUtils(
      this.viewerContext,
      queryContext,
      {
        previousValue: this.originalEntity,
        cascadingDeleteCause: this.cascadingDeleteCause,
      },
    );

    const entityAboutToBeUpdated = constructionUtils.constructEntity(this.fieldsForEntity);
    const authorizeUpdateResult = await asyncResult(
      this.privacyPolicy.authorizeUpdateAsync(
        this.viewerContext,
        queryContext,
        { previousValue: this.originalEntity, cascadingDeleteCause: this.cascadingDeleteCause },
        entityAboutToBeUpdated,
        this.metricsAdapter,
      ),
    );
    if (!authorizeUpdateResult.ok) {
      return authorizeUpdateResult;
    }

    await this.executeMutationValidatorsAsync(
      this.mutationValidators.beforeCreateAndUpdate,
      queryContext,
      entityAboutToBeUpdated,
      {
        type: EntityMutationType.UPDATE,
        previousValue: this.originalEntity,
        cascadingDeleteCause: this.cascadingDeleteCause,
      },
    );
    await this.executeMutationTriggersAsync(
      this.mutationTriggers.beforeAll,
      queryContext,
      entityAboutToBeUpdated,
      {
        type: EntityMutationType.UPDATE,
        previousValue: this.originalEntity,
        cascadingDeleteCause: this.cascadingDeleteCause,
      },
    );
    await this.executeMutationTriggersAsync(
      this.mutationTriggers.beforeUpdate,
      queryContext,
      entityAboutToBeUpdated,
      {
        type: EntityMutationType.UPDATE,
        previousValue: this.originalEntity,
        cascadingDeleteCause: this.cascadingDeleteCause,
      },
    );

    // skip the database update when specified
    if (!skipDatabaseUpdate) {
      await this.databaseAdapter.updateAsync(
        queryContext,
        this.entityConfiguration.idField,
        entityAboutToBeUpdated.getID(),
        this.updatedFields,
      );
    }

    // Invalidate all caches for the entity being updated so that any previously-cached loads
    // are consistent. This means:
    // - any query that returned this entity (pre-update) in the past should no longer have that entity in cache for that query.
    // - any query that will return this entity (post-update) that would not have returned the entity in the past should not
    //   be negatively cached for the entity.
    // To do this we simply invalidate all of the entity's caches for both the previous version of the entity and the upcoming
    // version of the entity.

    queryContext.appendPostCommitInvalidationCallback(async () => {
      invalidationUtils.invalidateFieldsForTransaction(
        queryContext,
        this.originalEntity.getAllDatabaseFields(),
      );
      invalidationUtils.invalidateFieldsForTransaction(queryContext, this.fieldsForEntity);
      await Promise.all([
        invalidationUtils.invalidateFieldsAsync(this.originalEntity.getAllDatabaseFields()),
        invalidationUtils.invalidateFieldsAsync(this.fieldsForEntity),
      ]);
    });

    invalidationUtils.invalidateFieldsForTransaction(
      queryContext,
      this.originalEntity.getAllDatabaseFields(),
    );
    invalidationUtils.invalidateFieldsForTransaction(queryContext, this.fieldsForEntity);

    const updatedEntity = await enforceAsyncResult(
      entityLoader.loadByIDAsync(entityAboutToBeUpdated.getID()),
    ); // ID is guaranteed to be stable by ensureStableIDField

    await this.executeMutationTriggersAsync(
      this.mutationTriggers.afterUpdate,
      queryContext,
      updatedEntity,
      {
        type: EntityMutationType.UPDATE,
        previousValue: this.originalEntity,
        cascadingDeleteCause: this.cascadingDeleteCause,
      },
    );
    await this.executeMutationTriggersAsync(
      this.mutationTriggers.afterAll,
      queryContext,
      updatedEntity,
      {
        type: EntityMutationType.UPDATE,
        previousValue: this.originalEntity,
        cascadingDeleteCause: this.cascadingDeleteCause,
      },
    );

    queryContext.appendPostCommitCallback(
      this.executeNonTransactionalMutationTriggersAsync.bind(
        this,
        this.mutationTriggers.afterCommit,
        updatedEntity,
        {
          type: EntityMutationType.UPDATE,
          previousValue: this.originalEntity,
          cascadingDeleteCause: this.cascadingDeleteCause,
        },
      ),
    );

    return result(updatedEntity);
  }

  private ensureStableIDField(updatedFields: Partial<TFields>): void {
    const originalId = this.originalEntity.getID();
    const idField = this.entityConfiguration.idField;
    if (updatedFields.hasOwnProperty(idField) && originalId !== updatedFields[idField]) {
      throw new Error(`id field updates not supported: (entityClass = ${this.entityClass.name})`);
    }
  }
}

/**
 * Mutator for deleting an existing entity.
 */
export class AuthorizationResultBasedDeleteMutator<
  TFields extends Record<string, any>,
  TIDField extends keyof NonNullable<Pick<TFields, TSelectedFields>>,
  TViewerContext extends ViewerContext,
  TEntity extends Entity<TFields, TIDField, TViewerContext, TSelectedFields>,
  TPrivacyPolicy extends EntityPrivacyPolicy<
    TFields,
    TIDField,
    TViewerContext,
    TEntity,
    TSelectedFields
  >,
  TSelectedFields extends keyof TFields,
> extends AuthorizationResultBasedBaseMutator<
  TFields,
  TIDField,
  TViewerContext,
  TEntity,
  TPrivacyPolicy,
  TSelectedFields
> {
  constructor(
    companionProvider: EntityCompanionProvider,
    viewerContext: TViewerContext,
    queryContext: EntityQueryContext,
    entityConfiguration: EntityConfiguration<TFields, TIDField>,
    entityClass: IEntityClass<
      TFields,
      TIDField,
      TViewerContext,
      TEntity,
      TPrivacyPolicy,
      TSelectedFields
    >,
    privacyPolicy: TPrivacyPolicy,
    mutationValidators: EntityMutationValidatorConfiguration<
      TFields,
      TIDField,
      TViewerContext,
      TEntity,
      TSelectedFields
    >,
    mutationTriggers: EntityMutationTriggerConfiguration<
      TFields,
      TIDField,
      TViewerContext,
      TEntity,
      TSelectedFields
    >,
    entityLoaderFactory: EntityLoaderFactory<
      TFields,
      TIDField,
      TViewerContext,
      TEntity,
      TPrivacyPolicy,
      TSelectedFields
    >,
    databaseAdapter: EntityDatabaseAdapter<TFields, TIDField>,
    metricsAdapter: IEntityMetricsAdapter,
    private readonly entity: TEntity,
    private readonly cascadingDeleteCause: EntityCascadingDeletionInfo | null,
  ) {
    super(
      companionProvider,
      viewerContext,
      queryContext,
      entityConfiguration,
      entityClass,
      privacyPolicy,
      mutationValidators,
      mutationTriggers,
      entityLoaderFactory,
      databaseAdapter,
      metricsAdapter,
    );
  }

  /**
   * Delete the entity after authorizing against delete privacy rules. The entity is invalidated in all caches.
   * @returns void result, where result error can be UnauthorizedError
   */
  async deleteAsync(): Promise<Result<void>> {
    return await timeAndLogMutationEventAsync(
      this.metricsAdapter,
      EntityMetricsMutationType.DELETE,
      this.entityClass.name,
      this.queryContext,
    )(this.deleteInTransactionAsync(new Set(), false));
  }

  private async deleteInTransactionAsync(
    processedEntityIdentifiersFromTransitiveDeletions: Set<string>,
    skipDatabaseDeletion: boolean,
  ): Promise<Result<void>> {
    return await this.queryContext.runInTransactionIfNotInTransactionAsync((innerQueryContext) =>
      this.deleteInternalAsync(
        innerQueryContext,
        processedEntityIdentifiersFromTransitiveDeletions,
        skipDatabaseDeletion,
      ),
    );
  }

  private async deleteInternalAsync(
    queryContext: EntityTransactionalQueryContext,
    processedEntityIdentifiersFromTransitiveDeletions: Set<string>,
    skipDatabaseDeletion: boolean,
  ): Promise<Result<void>> {
    const authorizeDeleteResult = await asyncResult(
      this.privacyPolicy.authorizeDeleteAsync(
        this.viewerContext,
        queryContext,
        { previousValue: null, cascadingDeleteCause: this.cascadingDeleteCause },
        this.entity,
        this.metricsAdapter,
      ),
    );
    if (!authorizeDeleteResult.ok) {
      return authorizeDeleteResult;
    }

    await this.processEntityDeletionForInboundEdgesAsync(
      this.entity,
      queryContext,
      processedEntityIdentifiersFromTransitiveDeletions,
    );

    await this.executeMutationValidatorsAsync(
      this.mutationValidators.beforeDelete,
      queryContext,
      this.entity,
      {
        type: EntityMutationType.DELETE,
        cascadingDeleteCause: this.cascadingDeleteCause,
      },
    );
    await this.executeMutationTriggersAsync(
      this.mutationTriggers.beforeAll,
      queryContext,
      this.entity,
      {
        type: EntityMutationType.DELETE,
        cascadingDeleteCause: this.cascadingDeleteCause,
      },
    );
    await this.executeMutationTriggersAsync(
      this.mutationTriggers.beforeDelete,
      queryContext,
      this.entity,
      {
        type: EntityMutationType.DELETE,
        cascadingDeleteCause: this.cascadingDeleteCause,
      },
    );

    if (!skipDatabaseDeletion) {
      await this.databaseAdapter.deleteAsync(
        queryContext,
        this.entityConfiguration.idField,
        this.entity.getID(),
      );
    }

    const invalidationUtils = this.entityLoaderFactory.invalidationUtils();

    // Invalidate all caches for the entity so that any previously-cached loads
    // are removed from the caches.
    queryContext.appendPostCommitInvalidationCallback(async () => {
      invalidationUtils.invalidateFieldsForTransaction(
        queryContext,
        this.entity.getAllDatabaseFields(),
      );
      await invalidationUtils.invalidateFieldsAsync(this.entity.getAllDatabaseFields());
    });
    invalidationUtils.invalidateFieldsForTransaction(
      queryContext,
      this.entity.getAllDatabaseFields(),
    );

    await this.executeMutationTriggersAsync(
      this.mutationTriggers.afterDelete,
      queryContext,
      this.entity,
      {
        type: EntityMutationType.DELETE,
        cascadingDeleteCause: this.cascadingDeleteCause,
      },
    );
    await this.executeMutationTriggersAsync(
      this.mutationTriggers.afterAll,
      queryContext,
      this.entity,
      {
        type: EntityMutationType.DELETE,
        cascadingDeleteCause: this.cascadingDeleteCause,
      },
    );

    queryContext.appendPostCommitCallback(
      this.executeNonTransactionalMutationTriggersAsync.bind(
        this,
        this.mutationTriggers.afterCommit,
        this.entity,
        {
          type: EntityMutationType.DELETE,
          cascadingDeleteCause: this.cascadingDeleteCause,
        },
      ),
    );

    return result();
  }

  /**
   * Finds all entities referencing the specified entity and either deletes them, nullifies
   * their references to the specified entity, or invalidates the cache depending on the
   * OnDeleteBehavior of the field referencing the specified entity.
   *
   * @remarks
   * This works by doing reverse fan-out queries:
   * 1. Load all entity configurations of entity types that reference this type of entity
   * 2. For each entity configuration, find all fields that contain edges to this type of entity
   * 3. For each edge field, load all entities with an edge from target entity to this entity via that field
   * 4. Perform desired OnDeleteBehavior for entities
   *
   * @param entity - entity to find all references to
   */
  private async processEntityDeletionForInboundEdgesAsync(
    entity: TEntity,
    queryContext: EntityTransactionalQueryContext,
    processedEntityIdentifiers: Set<string>,
  ): Promise<void> {
    // prevent infinite reference cycles by keeping track of entities already processed
    if (processedEntityIdentifiers.has(entity.getUniqueIdentifier())) {
      return;
    }
    processedEntityIdentifiers.add(entity.getUniqueIdentifier());

    const companionDefinition = this.companionProvider.getCompanionForEntity(
      entity.constructor as IEntityClass<
        TFields,
        TIDField,
        TViewerContext,
        TEntity,
        TPrivacyPolicy,
        TSelectedFields
      >,
    ).entityCompanionDefinition;
    const entityConfiguration = companionDefinition.entityConfiguration;
    const inboundEdges = entityConfiguration.inboundEdges;

    const newCascadingDeleteCause = {
      entity,
      cascadingDeleteCause: this.cascadingDeleteCause,
    };

    await Promise.all(
      inboundEdges.map(async (entityClass) => {
        const loaderFactory = entity
          .getViewerContext()
          .getViewerScopedEntityCompanionForClass(entityClass)
          .getLoaderFactory();
        const mutatorFactory = entity
          .getViewerContext()
          .getViewerScopedEntityCompanionForClass(entityClass)
          .getMutatorFactory();

        return await mapMapAsync(
          this.companionProvider.getCompanionForEntity(entityClass).entityCompanionDefinition
            .entityConfiguration.schema,
          async (fieldDefinition, fieldName) => {
            const association = fieldDefinition.association;
            if (!association) {
              return;
            }

            const associatedConfiguration = this.companionProvider.getCompanionForEntity(
              association.associatedEntityClass,
            ).entityCompanionDefinition.entityConfiguration;
            if (associatedConfiguration !== entityConfiguration) {
              return;
            }

            const inboundReferenceEntities = await enforceResultsAsync(
              loaderFactory
                .forLoad(queryContext, {
                  previousValue: null,
                  cascadingDeleteCause: newCascadingDeleteCause,
                })
                .loadManyByFieldEqualingAsync(
                  fieldName,
                  association.associatedEntityLookupByField
                    ? entity.getField(association.associatedEntityLookupByField)
                    : entity.getID(),
                ),
            );

            switch (association.edgeDeletionBehavior) {
              case EntityEdgeDeletionBehavior.CASCADE_DELETE_INVALIDATE_CACHE_ONLY: {
                await Promise.all(
                  inboundReferenceEntities.map((inboundReferenceEntity) =>
                    enforceAsyncResult(
                      mutatorFactory
                        .forDelete(inboundReferenceEntity, queryContext, newCascadingDeleteCause)
                        .deleteInTransactionAsync(
                          processedEntityIdentifiers,
                          /* skipDatabaseDeletion */ true, // deletion is handled by DB
                        ),
                    ),
                  ),
                );
                break;
              }
              case EntityEdgeDeletionBehavior.SET_NULL_INVALIDATE_CACHE_ONLY: {
                await Promise.all(
                  inboundReferenceEntities.map((inboundReferenceEntity) =>
                    enforceAsyncResult(
                      mutatorFactory
                        .forUpdate(inboundReferenceEntity, queryContext, newCascadingDeleteCause)
                        .setField(fieldName, null)
                        ['updateInTransactionAsync'](/* skipDatabaseUpdate */ true),
                    ),
                  ),
                );
                break;
              }
              case EntityEdgeDeletionBehavior.SET_NULL: {
                await Promise.all(
                  inboundReferenceEntities.map((inboundReferenceEntity) =>
                    enforceAsyncResult(
                      mutatorFactory
                        .forUpdate(inboundReferenceEntity, queryContext, newCascadingDeleteCause)
                        .setField(fieldName, null)
                        ['updateInTransactionAsync'](/* skipDatabaseUpdate */ false),
                    ),
                  ),
                );
                break;
              }
              case EntityEdgeDeletionBehavior.CASCADE_DELETE: {
                await Promise.all(
                  inboundReferenceEntities.map((inboundReferenceEntity) =>
                    enforceAsyncResult(
                      mutatorFactory
                        .forDelete(inboundReferenceEntity, queryContext, newCascadingDeleteCause)
                        .deleteInTransactionAsync(
                          processedEntityIdentifiers,
                          /* skipDatabaseDeletion */ false,
                        ),
                    ),
                  ),
                );
              }
            }
          },
        );
      }),
    );
  }
}
