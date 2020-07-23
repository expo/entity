import { Result, asyncResult, result, enforceAsyncResult } from '@expo/results';

import Entity, { IEntityClass } from './Entity';
import { EntityCompanionDefinition } from './EntityCompanionProvider';
import EntityConfiguration from './EntityConfiguration';
import EntityDatabaseAdapter from './EntityDatabaseAdapter';
import { EntityEdgeDeletionBehavior } from './EntityFields';
import EntityLoaderFactory from './EntityLoaderFactory';
import {
  EntityMutationTrigger,
  EntityMutationTriggerConfiguration,
  EntityMutationValidatorConfiguration,
} from './EntityMutationTrigger';
import EntityPrivacyPolicy from './EntityPrivacyPolicy';
import { EntityQueryContext, EntityTransactionalQueryContext } from './EntityQueryContext';
import ReadonlyEntity from './ReadonlyEntity';
import ViewerContext from './ViewerContext';
import { timeAndLogMutationEventAsync } from './metrics/EntityMetricsUtils';
import IEntityMetricsAdapter, { EntityMetricsMutationType } from './metrics/IEntityMetricsAdapter';
import { mapMapAsync } from './utils/collections/maps';

abstract class BaseMutator<
  TFields,
  TID,
  TViewerContext extends ViewerContext,
  TEntity extends Entity<TFields, TID, TViewerContext, TSelectedFields>,
  TPrivacyPolicy extends EntityPrivacyPolicy<
    TFields,
    TID,
    TViewerContext,
    TEntity,
    TSelectedFields
  >,
  TSelectedFields extends keyof TFields
> {
  constructor(
    protected readonly viewerContext: TViewerContext,
    protected readonly queryContext: EntityQueryContext,
    protected readonly entityConfiguration: EntityConfiguration<TFields>,
    protected readonly entityClass: IEntityClass<
      TFields,
      TID,
      TViewerContext,
      TEntity,
      TPrivacyPolicy,
      TSelectedFields
    >,
    protected readonly privacyPolicy: TPrivacyPolicy,
    protected readonly mutationValidators: EntityMutationValidatorConfiguration<
      TFields,
      TID,
      TViewerContext,
      TEntity,
      TSelectedFields
    >,
    protected readonly mutationTriggers: EntityMutationTriggerConfiguration<
      TFields,
      TID,
      TViewerContext,
      TEntity,
      TSelectedFields
    >,
    protected readonly entityLoaderFactory: EntityLoaderFactory<
      TFields,
      TID,
      TViewerContext,
      TEntity,
      TPrivacyPolicy,
      TSelectedFields
    >,
    protected readonly databaseAdapter: EntityDatabaseAdapter<TFields>,
    protected readonly metricsAdapter: IEntityMetricsAdapter
  ) {}

  protected async executeTriggers(
    triggers:
      | EntityMutationTrigger<TFields, TID, TViewerContext, TEntity, TSelectedFields>[]
      | undefined,
    queryContext: EntityQueryContext,
    entity: TEntity
  ): Promise<void> {
    if (!triggers) {
      return;
    }
    await Promise.all(
      triggers.map((trigger) => trigger.executeAsync(this.viewerContext, queryContext, entity))
    );
  }
}

/**
 * Mutator for creating a new entity.
 */
export class CreateMutator<
  TFields,
  TID,
  TViewerContext extends ViewerContext,
  TEntity extends Entity<TFields, TID, TViewerContext, TSelectedFields>,
  TPrivacyPolicy extends EntityPrivacyPolicy<
    TFields,
    TID,
    TViewerContext,
    TEntity,
    TSelectedFields
  >,
  TSelectedFields extends keyof TFields
> extends BaseMutator<TFields, TID, TViewerContext, TEntity, TPrivacyPolicy, TSelectedFields> {
  private readonly fieldsForEntity: Partial<TFields> = {};

  /**
   * Set the value for entity field.
   * @param fieldName - entity field being updated
   * @param value - value for entity field
   */
  setField<K extends keyof Pick<TFields, TSelectedFields>>(fieldName: K, value: TFields[K]): this {
    this.fieldsForEntity[fieldName] = value;
    return this;
  }

  /**
   * Commit the new entity after authorizing against creation privacy rules. Invalidates all caches for
   * queries that would return new entity and caches the new entity if not in a transactional query context.
   * @returns authorized, cached, newly-created entity result, where result error can be UnauthorizedError
   */
  async createAsync(): Promise<Result<TEntity>> {
    return await timeAndLogMutationEventAsync(
      this.metricsAdapter,
      EntityMetricsMutationType.CREATE
    )(this.createInTransactionAsync());
  }

  /**
   * Convenience method that returns the new entity or throws upon create failure.
   */
  async enforceCreateAsync(): Promise<TEntity> {
    return await enforceAsyncResult(this.createAsync());
  }

  private async createInTransactionAsync(): Promise<Result<TEntity>> {
    const internalResult = await this.queryContext.runInTransactionIfNotInTransactionAsync(
      (innerQueryContext) => this.createInternalAsync(innerQueryContext)
    );
    if (internalResult.ok) {
      await this.executeTriggers(
        this.mutationTriggers.afterCommit,
        this.queryContext,
        internalResult.value
      );
    }
    return internalResult;
  }

  private async createInternalAsync(
    queryContext: EntityTransactionalQueryContext
  ): Promise<Result<TEntity>> {
    const temporaryEntityForPrivacyCheck = new this.entityClass(this.viewerContext, ({
      [this.entityConfiguration.idField]: '00000000-0000-0000-0000-000000000000', // zero UUID
      ...this.fieldsForEntity,
    } as unknown) as TFields);

    const authorizeCreateResult = await asyncResult(
      this.privacyPolicy.authorizeCreateAsync(
        this.viewerContext,
        queryContext,
        temporaryEntityForPrivacyCheck
      )
    );
    if (!authorizeCreateResult.ok) {
      return authorizeCreateResult;
    }

    await this.executeTriggers(
      this.mutationValidators.beforeAll,
      queryContext,
      temporaryEntityForPrivacyCheck
    );
    await this.executeTriggers(
      this.mutationValidators.beforeCreate,
      queryContext,
      temporaryEntityForPrivacyCheck
    );
    await this.executeTriggers(
      this.mutationTriggers.beforeAll,
      queryContext,
      temporaryEntityForPrivacyCheck
    );
    await this.executeTriggers(
      this.mutationTriggers.beforeCreate,
      queryContext,
      temporaryEntityForPrivacyCheck
    );

    const insertResult = await this.databaseAdapter.insertAsync(queryContext, this.fieldsForEntity);

    const entityLoader = this.entityLoaderFactory.forLoad(this.viewerContext, queryContext);
    await entityLoader.invalidateFieldsAsync(insertResult);

    const unauthorizedEntityAfterInsert = new this.entityClass(this.viewerContext, insertResult);
    const newEntity = await entityLoader
      .enforcing()
      .loadByIDAsync(unauthorizedEntityAfterInsert.getID());

    await this.executeTriggers(this.mutationTriggers.afterCreate, queryContext, newEntity);
    await this.executeTriggers(this.mutationTriggers.afterAll, queryContext, newEntity);

    return result(newEntity);
  }
}

/**
 * Mutator for updating an existing entity.
 */
export class UpdateMutator<
  TFields,
  TID,
  TViewerContext extends ViewerContext,
  TEntity extends Entity<TFields, TID, TViewerContext, TSelectedFields>,
  TPrivacyPolicy extends EntityPrivacyPolicy<
    TFields,
    TID,
    TViewerContext,
    TEntity,
    TSelectedFields
  >,
  TSelectedFields extends keyof TFields
> extends BaseMutator<TFields, TID, TViewerContext, TEntity, TPrivacyPolicy, TSelectedFields> {
  private readonly originalFieldsForEntity: Readonly<TFields>;
  private readonly fieldsForEntity: TFields;
  private readonly updatedFields: Partial<TFields> = {};

  constructor(
    viewerContext: TViewerContext,
    queryContext: EntityQueryContext,
    entityConfiguration: EntityConfiguration<TFields>,
    entityClass: IEntityClass<
      TFields,
      TID,
      TViewerContext,
      TEntity,
      TPrivacyPolicy,
      TSelectedFields
    >,
    privacyPolicy: TPrivacyPolicy,
    mutationValidators: EntityMutationValidatorConfiguration<
      TFields,
      TID,
      TViewerContext,
      TEntity,
      TSelectedFields
    >,
    mutationTriggers: EntityMutationTriggerConfiguration<
      TFields,
      TID,
      TViewerContext,
      TEntity,
      TSelectedFields
    >,
    entityLoaderFactory: EntityLoaderFactory<
      TFields,
      TID,
      TViewerContext,
      TEntity,
      TPrivacyPolicy,
      TSelectedFields
    >,
    databaseAdapter: EntityDatabaseAdapter<TFields>,
    metricsAdapter: IEntityMetricsAdapter,
    fieldsForEntity: Readonly<TFields>
  ) {
    super(
      viewerContext,
      queryContext,
      entityConfiguration,
      entityClass,
      privacyPolicy,
      mutationValidators,
      mutationTriggers,
      entityLoaderFactory,
      databaseAdapter,
      metricsAdapter
    );
    this.originalFieldsForEntity = { ...fieldsForEntity };
    this.fieldsForEntity = { ...fieldsForEntity };
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
   * Invalidates all caches for pre-update entity and caches the updated entity if not in a
   * transactional query context.
   * @returns authorized updated entity result, where result error can be UnauthorizedError
   */
  async updateAsync(): Promise<Result<TEntity>> {
    return await timeAndLogMutationEventAsync(
      this.metricsAdapter,
      EntityMetricsMutationType.UPDATE
    )(this.updateInTransactionAsync());
  }

  /**
   * Convenience method that returns the updated entity or throws upon update failure.
   */
  async enforceUpdateAsync(): Promise<TEntity> {
    return await enforceAsyncResult(this.updateAsync());
  }

  private async updateInTransactionAsync(): Promise<Result<TEntity>> {
    const internalResult = await this.queryContext.runInTransactionIfNotInTransactionAsync(
      (innerQueryContext) => this.updateInternalAsync(innerQueryContext)
    );
    if (internalResult.ok) {
      await this.executeTriggers(
        this.mutationTriggers.afterCommit,
        this.queryContext,
        internalResult.value
      );
    }
    return internalResult;
  }

  private async updateInternalAsync(
    queryContext: EntityTransactionalQueryContext
  ): Promise<Result<TEntity>> {
    const entityAboutToBeUpdated = new this.entityClass(this.viewerContext, this.fieldsForEntity);
    const authorizeUpdateResult = await asyncResult(
      this.privacyPolicy.authorizeUpdateAsync(
        this.viewerContext,
        queryContext,
        entityAboutToBeUpdated
      )
    );
    if (!authorizeUpdateResult.ok) {
      return authorizeUpdateResult;
    }

    await this.executeTriggers(
      this.mutationValidators.beforeAll,
      queryContext,
      entityAboutToBeUpdated
    );
    await this.executeTriggers(
      this.mutationValidators.beforeUpdate,
      queryContext,
      entityAboutToBeUpdated
    );
    await this.executeTriggers(
      this.mutationTriggers.beforeAll,
      queryContext,
      entityAboutToBeUpdated
    );
    await this.executeTriggers(
      this.mutationTriggers.beforeUpdate,
      queryContext,
      entityAboutToBeUpdated
    );

    const updateResult = await this.databaseAdapter.updateAsync(
      queryContext,
      this.entityConfiguration.idField,
      entityAboutToBeUpdated.getID(),
      this.updatedFields
    );

    const entityLoader = this.entityLoaderFactory.forLoad(this.viewerContext, queryContext);

    await entityLoader.invalidateFieldsAsync(this.originalFieldsForEntity);
    await entityLoader.invalidateFieldsAsync(this.fieldsForEntity);

    const unauthorizedEntityAfterUpdate = new this.entityClass(this.viewerContext, updateResult);
    const updatedEntity = await entityLoader
      .enforcing()
      .loadByIDAsync(unauthorizedEntityAfterUpdate.getID());

    await this.executeTriggers(this.mutationTriggers.afterUpdate, queryContext, updatedEntity);
    await this.executeTriggers(this.mutationTriggers.afterAll, queryContext, updatedEntity);

    return result(updatedEntity);
  }
}

/**
 * Mutator for deleting an existing entity.
 */
export class DeleteMutator<
  TFields,
  TID,
  TViewerContext extends ViewerContext,
  TEntity extends Entity<TFields, TID, TViewerContext, TSelectedFields>,
  TPrivacyPolicy extends EntityPrivacyPolicy<
    TFields,
    TID,
    TViewerContext,
    TEntity,
    TSelectedFields
  >,
  TSelectedFields extends keyof TFields
> extends BaseMutator<TFields, TID, TViewerContext, TEntity, TPrivacyPolicy, TSelectedFields> {
  constructor(
    viewerContext: TViewerContext,
    queryContext: EntityQueryContext,
    entityConfiguration: EntityConfiguration<TFields>,
    entityClass: IEntityClass<
      TFields,
      TID,
      TViewerContext,
      TEntity,
      TPrivacyPolicy,
      TSelectedFields
    >,
    privacyPolicy: TPrivacyPolicy,
    mutationValidators: EntityMutationValidatorConfiguration<
      TFields,
      TID,
      TViewerContext,
      TEntity,
      TSelectedFields
    >,
    mutationTriggers: EntityMutationTriggerConfiguration<
      TFields,
      TID,
      TViewerContext,
      TEntity,
      TSelectedFields
    >,
    entityLoaderFactory: EntityLoaderFactory<
      TFields,
      TID,
      TViewerContext,
      TEntity,
      TPrivacyPolicy,
      TSelectedFields
    >,
    databaseAdapter: EntityDatabaseAdapter<TFields>,
    metricsAdapter: IEntityMetricsAdapter,
    private readonly entity: TEntity
  ) {
    super(
      viewerContext,
      queryContext,
      entityConfiguration,
      entityClass,
      privacyPolicy,
      mutationValidators,
      mutationTriggers,
      entityLoaderFactory,
      databaseAdapter,
      metricsAdapter
    );
  }

  /**
   * Delete the entity after authorizing against delete privacy rules. The entity is invalidated in all caches.
   * @returns void result, where result error can be UnauthorizedError
   */
  async deleteAsync(): Promise<Result<void>> {
    return await timeAndLogMutationEventAsync(
      this.metricsAdapter,
      EntityMetricsMutationType.DELETE
    )(this.deleteInTransactionAsync());
  }

  /**
   * Convenience method that throws upon delete failure.
   */
  async enforceDeleteAsync(): Promise<void> {
    return await enforceAsyncResult(this.deleteAsync());
  }

  private async deleteInTransactionAsync(): Promise<Result<void>> {
    const internalResult = await this.queryContext.runInTransactionIfNotInTransactionAsync(
      (innerQueryContext) => this.deleteInternalAsync(innerQueryContext)
    );
    if (internalResult.ok) {
      await this.executeTriggers(
        this.mutationTriggers.afterCommit,
        this.queryContext,
        internalResult.value
      );
    }
    return internalResult.ok ? result() : result(internalResult.reason);
  }

  private async deleteInternalAsync(
    queryContext: EntityTransactionalQueryContext,
    processedEntityIdentifiersFromTransitiveDeletions: Set<string> = new Set()
  ): Promise<Result<TEntity>> {
    const authorizeDeleteResult = await asyncResult(
      this.privacyPolicy.authorizeDeleteAsync(this.viewerContext, queryContext, this.entity)
    );
    if (!authorizeDeleteResult.ok) {
      return authorizeDeleteResult;
    }

    await DeleteMutator.processEntityDeletionForInboundEdgesAsync(
      this.entity,
      queryContext,
      processedEntityIdentifiersFromTransitiveDeletions
    );

    await this.executeTriggers(this.mutationValidators.beforeAll, queryContext, this.entity);
    await this.executeTriggers(this.mutationValidators.beforeDelete, queryContext, this.entity);

    await this.executeTriggers(this.mutationTriggers.beforeAll, queryContext, this.entity);
    await this.executeTriggers(this.mutationTriggers.beforeDelete, queryContext, this.entity);

    await this.databaseAdapter.deleteAsync(
      queryContext,
      this.entityConfiguration.idField,
      this.entity.getID()
    );

    const entityLoader = this.entityLoaderFactory.forLoad(this.viewerContext, queryContext);
    await entityLoader.invalidateFieldsAsync(this.entity.getAllDatabaseFields());

    await this.executeTriggers(this.mutationTriggers.afterDelete, queryContext, this.entity);
    await this.executeTriggers(this.mutationTriggers.afterAll, queryContext, this.entity);

    return result(this.entity);
  }

  /**
   * Finds all entities referencing the specified entity and either deletes them, nullifies
   * their references to the specified entity, or invalidates the cache depending on the
   * {@link OnDeleteBehavior} of the field referencing the specified entity.
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
  private static async processEntityDeletionForInboundEdgesAsync<
    TMFields,
    TMID,
    TMViewerContext extends ViewerContext,
    TMEntity extends Entity<TMFields, TMID, TMViewerContext, TMSelectedFields>,
    TMSelectedFields extends keyof TMFields
  >(
    entity: TMEntity,
    queryContext: EntityTransactionalQueryContext,
    processedEntityIdentifiers: Set<string>
  ): Promise<void> {
    // prevent infinite reference cycles by keeping track of entities already processed
    if (processedEntityIdentifiers.has(entity.getUniqueIdentifier())) {
      return;
    }
    processedEntityIdentifiers.add(entity.getUniqueIdentifier());

    const companionDefinition = (entity.constructor as any).getCompanionDefinition() as EntityCompanionDefinition<
      TMFields,
      TMID,
      TMViewerContext,
      TMEntity,
      EntityPrivacyPolicy<TMFields, TMID, TMViewerContext, TMEntity, TMSelectedFields>,
      TMSelectedFields
    >;
    const entityConfiguration = companionDefinition.entityConfiguration;
    const inboundEdges = entityConfiguration.inboundEdges;
    await Promise.all(
      inboundEdges.map(async (entityClass) => {
        return await mapMapAsync(
          entityClass.getCompanionDefinition().entityConfiguration.schema,
          async (fieldDefinition, fieldName) => {
            const association = fieldDefinition.association;
            if (!association) {
              return;
            }

            const associatedConfiguration = association.associatedEntityClass.getCompanionDefinition()
              .entityConfiguration;
            if (associatedConfiguration !== entityConfiguration) {
              return;
            }

            const associatedEntityLookupByField = association.associatedEntityLookupByField;

            const loaderFactory = entity
              .getViewerContext()
              .getViewerScopedEntityCompanionForClass(entityClass)
              .getLoaderFactory();
            const mutatorFactory = entity
              .getViewerContext()
              .getViewerScopedEntityCompanionForClass(entityClass)
              .getMutatorFactory();

            let inboundReferenceEntities: readonly ReadonlyEntity<any, any, any, any>[];
            if (associatedEntityLookupByField) {
              inboundReferenceEntities = await loaderFactory
                .forLoad(queryContext)
                .enforcing()
                .loadManyByFieldEqualingAsync(
                  fieldName,
                  entity.getField(associatedEntityLookupByField as any)
                );
            } else {
              inboundReferenceEntities = await loaderFactory
                .forLoad(queryContext)
                .enforcing()
                .loadManyByFieldEqualingAsync(fieldName, entity.getID());
            }

            switch (association.edgeDeletionBehavior) {
              case undefined:
              case EntityEdgeDeletionBehavior.CASCADE_DELETE_INVALIDATE_CACHE: {
                await Promise.all(
                  inboundReferenceEntities.map((inboundReferenceEntity) =>
                    this.processEntityDeletionForInboundEdgesAsync(
                      inboundReferenceEntity,
                      queryContext,
                      processedEntityIdentifiers
                    )
                  )
                );
                await Promise.all(
                  inboundReferenceEntities.map((inboundReferenceEntity) =>
                    loaderFactory
                      .forLoad(queryContext)
                      .invalidateFieldsAsync(inboundReferenceEntity.getAllDatabaseFields())
                  )
                );
                break;
              }
              case EntityEdgeDeletionBehavior.SET_NULL: {
                await Promise.all(
                  inboundReferenceEntities.map((inboundReferenceEntity) =>
                    mutatorFactory
                      .forUpdate(inboundReferenceEntity, queryContext)
                      .setField(fieldName, null)
                      .enforceUpdateAsync()
                  )
                );
                break;
              }
              case EntityEdgeDeletionBehavior.CASCADE_DELETE: {
                await Promise.all(
                  inboundReferenceEntities.map((inboundReferenceEntity) =>
                    mutatorFactory
                      .forDelete(inboundReferenceEntity, queryContext)
                      .deleteInternalAsync(queryContext, processedEntityIdentifiers)
                  )
                );
              }
            }
          }
        );
      })
    );
  }
}
