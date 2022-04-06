import { Result, asyncResult, result, enforceAsyncResult } from '@expo/results';
import invariant from 'invariant';

import Entity, { IEntityClass } from './Entity';
import { EntityCompanionDefinition } from './EntityCompanionProvider';
import EntityConfiguration from './EntityConfiguration';
import EntityDatabaseAdapter from './EntityDatabaseAdapter';
import { EntityEdgeDeletionBehavior } from './EntityFieldDefinition';
import EntityLoaderFactory from './EntityLoaderFactory';
import {
  EntityValidatorMutationInfo,
  EntityMutationType,
  EntityTriggerMutationInfo,
  EntityCascadingDeletionInfo,
} from './EntityMutationInfo';
import EntityMutationTriggerConfiguration, {
  EntityMutationTrigger,
  EntityNonTransactionalMutationTrigger,
} from './EntityMutationTriggerConfiguration';
import EntityMutationValidator from './EntityMutationValidator';
import EntityPrivacyPolicy, { EntityPrivacyPolicyEvaluationContext } from './EntityPrivacyPolicy';
import { EntityQueryContext, EntityTransactionalQueryContext } from './EntityQueryContext';
import ReadonlyEntity from './ReadonlyEntity';
import ViewerContext from './ViewerContext';
import EntityInvalidFieldValueError from './errors/EntityInvalidFieldValueError';
import { timeAndLogMutationEventAsync } from './metrics/EntityMetricsUtils';
import IEntityMetricsAdapter, { EntityMetricsMutationType } from './metrics/IEntityMetricsAdapter';
import { mapMapAsync } from './utils/collections/maps';

abstract class BaseMutator<
  TFields,
  TID extends NonNullable<TFields[TSelectedFields]>,
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
    protected readonly privacyPolicyEvaluationContext: EntityPrivacyPolicyEvaluationContext,
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
    protected readonly mutationValidators: EntityMutationValidator<
      TFields,
      TID,
      TViewerContext,
      TEntity,
      TSelectedFields
    >[],
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

  protected validateFields(fields: Partial<TFields>): void {
    for (const fieldName in fields) {
      const fieldValue = fields[fieldName];
      const fieldDefinition = this.entityConfiguration.schema.get(fieldName);
      invariant(fieldDefinition, `must have field definition for field = ${fieldName}`);
      const isInputValid = fieldDefinition.validateInputValue(fieldValue);
      if (!isInputValid) {
        throw new EntityInvalidFieldValueError(this.entityClass, fieldName, fieldValue);
      }
    }
  }

  protected async executeMutationValidatorsAsync(
    validators: EntityMutationValidator<TFields, TID, TViewerContext, TEntity, TSelectedFields>[],
    queryContext: EntityTransactionalQueryContext,
    entity: TEntity,
    mutationInfo: EntityValidatorMutationInfo<
      TFields,
      TID,
      TViewerContext,
      TEntity,
      TSelectedFields
    >
  ): Promise<void> {
    await Promise.all(
      validators.map((validator) =>
        validator.executeAsync(this.viewerContext, queryContext, entity, mutationInfo)
      )
    );
  }

  protected async executeMutationTriggersAsync(
    triggers:
      | EntityMutationTrigger<TFields, TID, TViewerContext, TEntity, TSelectedFields>[]
      | undefined,
    queryContext: EntityTransactionalQueryContext,
    entity: TEntity,
    mutationInfo: EntityTriggerMutationInfo<TFields, TID, TViewerContext, TEntity, TSelectedFields>
  ): Promise<void> {
    if (!triggers) {
      return;
    }
    await Promise.all(
      triggers.map((trigger) =>
        trigger.executeAsync(this.viewerContext, queryContext, entity, mutationInfo)
      )
    );
  }

  protected async executeNonTransactionalMutationTriggersAsync(
    triggers:
      | EntityNonTransactionalMutationTrigger<
          TFields,
          TID,
          TViewerContext,
          TEntity,
          TSelectedFields
        >[]
      | undefined,
    entity: TEntity,
    mutationInfo: EntityTriggerMutationInfo<TFields, TID, TViewerContext, TEntity, TSelectedFields>
  ): Promise<void> {
    if (!triggers) {
      return;
    }
    await Promise.all(
      triggers.map((trigger) => trigger.executeAsync(this.viewerContext, entity, mutationInfo))
    );
  }
}

/**
 * Mutator for creating a new entity.
 */
export class CreateMutator<
  TFields,
  TID extends NonNullable<TFields[TSelectedFields]>,
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
      EntityMetricsMutationType.CREATE,
      this.entityClass.name
    )(this.createInTransactionAsync());
  }

  /**
   * Convenience method that returns the new entity or throws upon create failure.
   */
  async enforceCreateAsync(): Promise<TEntity> {
    return await enforceAsyncResult(this.createAsync());
  }

  private async createInTransactionAsync(): Promise<Result<TEntity>> {
    return await this.queryContext.runInTransactionIfNotInTransactionAsync((innerQueryContext) =>
      this.createInternalAsync(innerQueryContext)
    );
  }

  private async createInternalAsync(
    queryContext: EntityTransactionalQueryContext
  ): Promise<Result<TEntity>> {
    this.validateFields(this.fieldsForEntity);

    const temporaryEntityForPrivacyCheck = new this.entityClass(this.viewerContext, {
      [this.entityConfiguration.idField]: '00000000-0000-0000-0000-000000000000', // zero UUID
      ...this.fieldsForEntity,
    } as unknown as TFields);

    const authorizeCreateResult = await asyncResult(
      this.privacyPolicy.authorizeCreateAsync(
        this.viewerContext,
        queryContext,
        this.privacyPolicyEvaluationContext,
        temporaryEntityForPrivacyCheck,
        this.metricsAdapter
      )
    );
    if (!authorizeCreateResult.ok) {
      return authorizeCreateResult;
    }

    await this.executeMutationValidatorsAsync(
      this.mutationValidators,
      queryContext,
      temporaryEntityForPrivacyCheck,
      { type: EntityMutationType.CREATE }
    );
    await this.executeMutationTriggersAsync(
      this.mutationTriggers.beforeAll,
      queryContext,
      temporaryEntityForPrivacyCheck,
      { type: EntityMutationType.CREATE }
    );
    await this.executeMutationTriggersAsync(
      this.mutationTriggers.beforeCreate,
      queryContext,
      temporaryEntityForPrivacyCheck,
      { type: EntityMutationType.CREATE }
    );

    const insertResult = await this.databaseAdapter.insertAsync(queryContext, this.fieldsForEntity);

    const entityLoader = this.entityLoaderFactory.forLoad(
      this.viewerContext,
      queryContext,
      this.privacyPolicyEvaluationContext
    );
    queryContext.appendPostCommitInvalidationCallback(
      entityLoader.invalidateFieldsAsync.bind(entityLoader, insertResult)
    );

    const unauthorizedEntityAfterInsert = new this.entityClass(this.viewerContext, insertResult);
    const newEntity = await entityLoader.loadByIDAsync(unauthorizedEntityAfterInsert.getID());

    await this.executeMutationTriggersAsync(
      this.mutationTriggers.afterCreate,
      queryContext,
      newEntity,
      { type: EntityMutationType.CREATE }
    );
    await this.executeMutationTriggersAsync(
      this.mutationTriggers.afterAll,
      queryContext,
      newEntity,
      { type: EntityMutationType.CREATE }
    );

    queryContext.appendPostCommitCallback(
      this.executeNonTransactionalMutationTriggersAsync.bind(
        this,
        this.mutationTriggers.afterCommit,
        newEntity,
        { type: EntityMutationType.CREATE }
      )
    );

    return result(newEntity);
  }
}

/**
 * Mutator for updating an existing entity.
 */
export class UpdateMutator<
  TFields,
  TID extends NonNullable<TFields[TSelectedFields]>,
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
  private readonly originalEntity: TEntity;
  private readonly fieldsForEntity: TFields;
  private readonly updatedFields: Partial<TFields> = {};

  constructor(
    viewerContext: TViewerContext,
    queryContext: EntityQueryContext,
    privacyPolicyEvaluationContext: EntityPrivacyPolicyEvaluationContext,
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
    mutationValidators: EntityMutationValidator<
      TFields,
      TID,
      TViewerContext,
      TEntity,
      TSelectedFields
    >[],
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
    originalEntity: TEntity
  ) {
    super(
      viewerContext,
      queryContext,
      privacyPolicyEvaluationContext,
      entityConfiguration,
      entityClass,
      privacyPolicy,
      mutationValidators,
      mutationTriggers,
      entityLoaderFactory,
      databaseAdapter,
      metricsAdapter
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
   * Invalidates all caches for pre-update entity and caches the updated entity if not in a
   * transactional query context.
   * @returns authorized updated entity result, where result error can be UnauthorizedError
   */
  async updateAsync(): Promise<Result<TEntity>> {
    return await timeAndLogMutationEventAsync(
      this.metricsAdapter,
      EntityMetricsMutationType.UPDATE,
      this.entityClass.name
    )(this.updateInTransactionAsync());
  }

  /**
   * Convenience method that returns the updated entity or throws upon update failure.
   */
  async enforceUpdateAsync(): Promise<TEntity> {
    return await enforceAsyncResult(this.updateAsync());
  }

  private async updateInTransactionAsync(): Promise<Result<TEntity>> {
    return await this.queryContext.runInTransactionIfNotInTransactionAsync((innerQueryContext) =>
      this.updateInternalAsync(innerQueryContext)
    );
  }

  private async updateInternalAsync(
    queryContext: EntityTransactionalQueryContext
  ): Promise<Result<TEntity>> {
    this.validateFields(this.updatedFields);

    const entityAboutToBeUpdated = new this.entityClass(this.viewerContext, this.fieldsForEntity);
    const authorizeUpdateResult = await asyncResult(
      this.privacyPolicy.authorizeUpdateAsync(
        this.viewerContext,
        queryContext,
        this.privacyPolicyEvaluationContext,
        entityAboutToBeUpdated,
        this.metricsAdapter
      )
    );
    if (!authorizeUpdateResult.ok) {
      return authorizeUpdateResult;
    }

    await this.executeMutationValidatorsAsync(
      this.mutationValidators,
      queryContext,
      entityAboutToBeUpdated,
      { type: EntityMutationType.UPDATE, previousValue: this.originalEntity }
    );
    await this.executeMutationTriggersAsync(
      this.mutationTriggers.beforeAll,
      queryContext,
      entityAboutToBeUpdated,
      { type: EntityMutationType.UPDATE, previousValue: this.originalEntity }
    );
    await this.executeMutationTriggersAsync(
      this.mutationTriggers.beforeUpdate,
      queryContext,
      entityAboutToBeUpdated,
      { type: EntityMutationType.UPDATE, previousValue: this.originalEntity }
    );

    const updateResult = await this.databaseAdapter.updateAsync(
      queryContext,
      this.entityConfiguration.idField,
      entityAboutToBeUpdated.getID(),
      this.updatedFields
    );

    const entityLoader = this.entityLoaderFactory.forLoad(
      this.viewerContext,
      queryContext,
      this.privacyPolicyEvaluationContext
    );

    queryContext.appendPostCommitInvalidationCallback(
      entityLoader.invalidateFieldsAsync.bind(
        entityLoader,
        this.originalEntity.getAllDatabaseFields()
      )
    );
    queryContext.appendPostCommitInvalidationCallback(
      entityLoader.invalidateFieldsAsync.bind(entityLoader, this.fieldsForEntity)
    );

    const unauthorizedEntityAfterUpdate = new this.entityClass(this.viewerContext, updateResult);
    const updatedEntity = await entityLoader.loadByIDAsync(unauthorizedEntityAfterUpdate.getID());

    await this.executeMutationTriggersAsync(
      this.mutationTriggers.afterUpdate,
      queryContext,
      updatedEntity,
      { type: EntityMutationType.UPDATE, previousValue: this.originalEntity }
    );
    await this.executeMutationTriggersAsync(
      this.mutationTriggers.afterAll,
      queryContext,
      updatedEntity,
      { type: EntityMutationType.UPDATE, previousValue: this.originalEntity }
    );

    queryContext.appendPostCommitCallback(
      this.executeNonTransactionalMutationTriggersAsync.bind(
        this,
        this.mutationTriggers.afterCommit,
        updatedEntity,
        { type: EntityMutationType.UPDATE, previousValue: this.originalEntity }
      )
    );

    return result(updatedEntity);
  }
}

/**
 * Mutator for deleting an existing entity.
 */
export class DeleteMutator<
  TFields,
  TID extends NonNullable<TFields[TSelectedFields]>,
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
    privacyPolicyEvaluationContext: EntityPrivacyPolicyEvaluationContext,
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
    mutationValidators: EntityMutationValidator<
      TFields,
      TID,
      TViewerContext,
      TEntity,
      TSelectedFields
    >[],
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
      privacyPolicyEvaluationContext,
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
      EntityMetricsMutationType.DELETE,
      this.entityClass.name
    )(this.deleteInTransactionAsync(new Set(), false, null));
  }

  /**
   * Convenience method that throws upon delete failure.
   */
  async enforceDeleteAsync(): Promise<void> {
    return await enforceAsyncResult(this.deleteAsync());
  }

  private async deleteInTransactionAsync(
    processedEntityIdentifiersFromTransitiveDeletions: Set<string>,
    skipDatabaseDeletion: boolean,
    cascadingDeleteCause: EntityCascadingDeletionInfo | null
  ): Promise<Result<void>> {
    return await this.queryContext.runInTransactionIfNotInTransactionAsync((innerQueryContext) =>
      this.deleteInternalAsync(
        innerQueryContext,
        processedEntityIdentifiersFromTransitiveDeletions,
        skipDatabaseDeletion,
        cascadingDeleteCause
      )
    );
  }

  private async deleteInternalAsync(
    queryContext: EntityTransactionalQueryContext,
    processedEntityIdentifiersFromTransitiveDeletions: Set<string>,
    skipDatabaseDeletion: boolean,
    cascadingDeleteCause: EntityCascadingDeletionInfo | null
  ): Promise<Result<void>> {
    const authorizeDeleteResult = await asyncResult(
      this.privacyPolicy.authorizeDeleteAsync(
        this.viewerContext,
        queryContext,
        { cascadingDeleteCause },
        this.entity,
        this.metricsAdapter
      )
    );
    if (!authorizeDeleteResult.ok) {
      return authorizeDeleteResult;
    }

    await this.processEntityDeletionForInboundEdgesAsync(
      this.entity,
      queryContext,
      processedEntityIdentifiersFromTransitiveDeletions,
      cascadingDeleteCause
    );

    await this.executeMutationTriggersAsync(
      this.mutationTriggers.beforeAll,
      queryContext,
      this.entity,
      { type: EntityMutationType.DELETE, cascadingDeleteCause }
    );
    await this.executeMutationTriggersAsync(
      this.mutationTriggers.beforeDelete,
      queryContext,
      this.entity,
      { type: EntityMutationType.DELETE, cascadingDeleteCause }
    );

    if (!skipDatabaseDeletion) {
      await this.databaseAdapter.deleteAsync(
        queryContext,
        this.entityConfiguration.idField,
        this.entity.getID()
      );
    }

    const entityLoader = this.entityLoaderFactory.forLoad(this.viewerContext, queryContext, {
      cascadingDeleteCause,
    });
    queryContext.appendPostCommitInvalidationCallback(
      entityLoader.invalidateFieldsAsync.bind(entityLoader, this.entity.getAllDatabaseFields())
    );

    await this.executeMutationTriggersAsync(
      this.mutationTriggers.afterDelete,
      queryContext,
      this.entity,
      { type: EntityMutationType.DELETE, cascadingDeleteCause }
    );
    await this.executeMutationTriggersAsync(
      this.mutationTriggers.afterAll,
      queryContext,
      this.entity,
      { type: EntityMutationType.DELETE, cascadingDeleteCause }
    );

    queryContext.appendPostCommitCallback(
      this.executeNonTransactionalMutationTriggersAsync.bind(
        this,
        this.mutationTriggers.afterCommit,
        this.entity,
        { type: EntityMutationType.DELETE, cascadingDeleteCause }
      )
    );

    return result();
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
  private async processEntityDeletionForInboundEdgesAsync(
    entity: TEntity,
    queryContext: EntityTransactionalQueryContext,
    processedEntityIdentifiers: Set<string>,
    cascadingDeleteCause: EntityCascadingDeletionInfo | null
  ): Promise<void> {
    // prevent infinite reference cycles by keeping track of entities already processed
    if (processedEntityIdentifiers.has(entity.getUniqueIdentifier())) {
      return;
    }
    processedEntityIdentifiers.add(entity.getUniqueIdentifier());

    const companionDefinition = (
      entity.constructor as any
    ).getCompanionDefinition() as EntityCompanionDefinition<
      TFields,
      TID,
      TViewerContext,
      TEntity,
      TPrivacyPolicy,
      TSelectedFields
    >;
    const entityConfiguration = companionDefinition.entityConfiguration;
    const inboundEdges = entityConfiguration.getInboundEdges();
    await Promise.all(
      inboundEdges.map(async (entityClass) => {
        return await mapMapAsync(
          entityClass.getCompanionDefinition().entityConfiguration.schema,
          async (fieldDefinition, fieldName) => {
            const association = fieldDefinition.association;
            if (!association) {
              return;
            }

            const associatedConfiguration = association
              .getAssociatedEntityClass()
              .getCompanionDefinition().entityConfiguration;
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

            const newCascadingDeleteCause = {
              entity,
              cascadingDeleteCause,
            };

            let inboundReferenceEntities: readonly ReadonlyEntity<any, any, any, any>[];
            if (associatedEntityLookupByField) {
              inboundReferenceEntities = await loaderFactory
                .forLoad(queryContext, { cascadingDeleteCause: newCascadingDeleteCause })

                .loadManyByFieldEqualingAsync(
                  fieldName,
                  entity.getField(associatedEntityLookupByField as any)
                );
            } else {
              inboundReferenceEntities = await loaderFactory
                .forLoad(queryContext, { cascadingDeleteCause: newCascadingDeleteCause })

                .loadManyByFieldEqualingAsync(fieldName, entity.getID());
            }

            switch (association.edgeDeletionBehavior) {
              case undefined:
              case EntityEdgeDeletionBehavior.CASCADE_DELETE_INVALIDATE_CACHE: {
                await Promise.all(
                  inboundReferenceEntities.map((inboundReferenceEntity) =>
                    mutatorFactory
                      .forDelete(inboundReferenceEntity, queryContext, {
                        cascadingDeleteCause: newCascadingDeleteCause,
                      })
                      .deleteInTransactionAsync(
                        processedEntityIdentifiers,
                        /* skipDatabaseDeletion */ true, // deletion is handled by DB
                        newCascadingDeleteCause
                      )
                  )
                );
                break;
              }
              case EntityEdgeDeletionBehavior.SET_NULL: {
                await Promise.all(
                  inboundReferenceEntities.map((inboundReferenceEntity) =>
                    mutatorFactory
                      .forUpdate(inboundReferenceEntity, queryContext, {
                        cascadingDeleteCause: newCascadingDeleteCause,
                      })
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
                      .forDelete(inboundReferenceEntity, queryContext, {
                        cascadingDeleteCause: newCascadingDeleteCause,
                      })
                      .deleteInTransactionAsync(
                        processedEntityIdentifiers,
                        /* skipDatabaseDeletion */ false,
                        newCascadingDeleteCause
                      )
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
