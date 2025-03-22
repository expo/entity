import { Result, asyncResult, result, enforceAsyncResult } from '@expo/results';
import invariant from 'invariant';

import Entity, { IEntityClass } from './Entity';
import EntityCompanionProvider from './EntityCompanionProvider';
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
import EntityPrivacyPolicy from './EntityPrivacyPolicy';
import { EntityQueryContext, EntityTransactionalQueryContext } from './EntityQueryContext';
import ViewerContext from './ViewerContext';
import { enforceResultsAsync } from './entityUtils';
import EntityInvalidFieldValueError from './errors/EntityInvalidFieldValueError';
import { timeAndLogMutationEventAsync } from './metrics/EntityMetricsUtils';
import IEntityMetricsAdapter, { EntityMetricsMutationType } from './metrics/IEntityMetricsAdapter';
import { mapMapAsync } from './utils/collections/maps';

abstract class AuthorizationResultBasedBaseMutator<
  TFields extends Record<string, any>,
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
  TSelectedFields extends keyof TFields,
> {
  constructor(
    protected readonly companionProvider: EntityCompanionProvider,
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
    protected readonly metricsAdapter: IEntityMetricsAdapter,
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
    >,
  ): Promise<void> {
    await Promise.all(
      validators.map((validator) =>
        validator.executeAsync(this.viewerContext, queryContext, entity, mutationInfo),
      ),
    );
  }

  protected async executeMutationTriggersAsync(
    triggers:
      | EntityMutationTrigger<TFields, TID, TViewerContext, TEntity, TSelectedFields>[]
      | undefined,
    queryContext: EntityTransactionalQueryContext,
    entity: TEntity,
    mutationInfo: EntityTriggerMutationInfo<TFields, TID, TViewerContext, TEntity, TSelectedFields>,
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
          TID,
          TViewerContext,
          TEntity,
          TSelectedFields
        >[]
      | undefined,
    entity: TEntity,
    mutationInfo: EntityTriggerMutationInfo<TFields, TID, TViewerContext, TEntity, TSelectedFields>,
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
  TSelectedFields extends keyof TFields,
> extends AuthorizationResultBasedBaseMutator<
  TFields,
  TID,
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

    const temporaryEntityForPrivacyCheck = entityLoader.utils.constructEntity({
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
      this.mutationValidators,
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

    queryContext.appendPostCommitInvalidationCallback(
      entityLoader.utils.invalidateFieldsAsync.bind(entityLoader, insertResult),
    );

    const unauthorizedEntityAfterInsert = entityLoader.utils.constructEntity(insertResult);
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
  TSelectedFields extends keyof TFields,
> extends AuthorizationResultBasedBaseMutator<
  TFields,
  TID,
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
    originalEntity: TEntity,
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
    )(this.updateInTransactionAsync(false, null));
  }

  private async updateInTransactionAsync(
    skipDatabaseUpdate: true,
    cascadingDeleteCause: EntityCascadingDeletionInfo,
  ): Promise<Result<TEntity>>;
  private async updateInTransactionAsync(
    skipDatabaseUpdate: false,
    cascadingDeleteCause: EntityCascadingDeletionInfo | null,
  ): Promise<Result<TEntity>>;
  private async updateInTransactionAsync(
    skipDatabaseUpdate: boolean,
    cascadingDeleteCause: EntityCascadingDeletionInfo | null,
  ): Promise<Result<TEntity>> {
    return await this.queryContext.runInTransactionIfNotInTransactionAsync((innerQueryContext) =>
      this.updateInternalAsync(innerQueryContext, skipDatabaseUpdate, cascadingDeleteCause),
    );
  }

  private async updateInternalAsync(
    queryContext: EntityTransactionalQueryContext,
    skipDatabaseUpdate: boolean,
    cascadingDeleteCause: EntityCascadingDeletionInfo | null,
  ): Promise<Result<TEntity>> {
    this.validateFields(this.updatedFields);
    this.ensureStableIDField(this.updatedFields);

    const entityLoader = this.entityLoaderFactory.forLoad(this.viewerContext, queryContext, {
      previousValue: this.originalEntity,
      cascadingDeleteCause,
    });

    const entityAboutToBeUpdated = entityLoader.utils.constructEntity(this.fieldsForEntity);
    const authorizeUpdateResult = await asyncResult(
      this.privacyPolicy.authorizeUpdateAsync(
        this.viewerContext,
        queryContext,
        { previousValue: this.originalEntity, cascadingDeleteCause },
        entityAboutToBeUpdated,
        this.metricsAdapter,
      ),
    );
    if (!authorizeUpdateResult.ok) {
      return authorizeUpdateResult;
    }

    await this.executeMutationValidatorsAsync(
      this.mutationValidators,
      queryContext,
      entityAboutToBeUpdated,
      { type: EntityMutationType.UPDATE, previousValue: this.originalEntity, cascadingDeleteCause },
    );
    await this.executeMutationTriggersAsync(
      this.mutationTriggers.beforeAll,
      queryContext,
      entityAboutToBeUpdated,
      { type: EntityMutationType.UPDATE, previousValue: this.originalEntity, cascadingDeleteCause },
    );
    await this.executeMutationTriggersAsync(
      this.mutationTriggers.beforeUpdate,
      queryContext,
      entityAboutToBeUpdated,
      { type: EntityMutationType.UPDATE, previousValue: this.originalEntity, cascadingDeleteCause },
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

    queryContext.appendPostCommitInvalidationCallback(
      entityLoader.utils.invalidateFieldsAsync.bind(
        entityLoader,
        this.originalEntity.getAllDatabaseFields(),
      ),
    );
    queryContext.appendPostCommitInvalidationCallback(
      entityLoader.utils.invalidateFieldsAsync.bind(entityLoader, this.fieldsForEntity),
    );

    const updatedEntity = await enforceAsyncResult(
      entityLoader.loadByIDAsync(entityAboutToBeUpdated.getID()),
    ); // ID is guaranteed to be stable by ensureStableIDField

    await this.executeMutationTriggersAsync(
      this.mutationTriggers.afterUpdate,
      queryContext,
      updatedEntity,
      { type: EntityMutationType.UPDATE, previousValue: this.originalEntity, cascadingDeleteCause },
    );
    await this.executeMutationTriggersAsync(
      this.mutationTriggers.afterAll,
      queryContext,
      updatedEntity,
      { type: EntityMutationType.UPDATE, previousValue: this.originalEntity, cascadingDeleteCause },
    );

    queryContext.appendPostCommitCallback(
      this.executeNonTransactionalMutationTriggersAsync.bind(
        this,
        this.mutationTriggers.afterCommit,
        updatedEntity,
        {
          type: EntityMutationType.UPDATE,
          previousValue: this.originalEntity,
          cascadingDeleteCause,
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
  TSelectedFields extends keyof TFields,
> extends AuthorizationResultBasedBaseMutator<
  TFields,
  TID,
  TViewerContext,
  TEntity,
  TPrivacyPolicy,
  TSelectedFields
> {
  constructor(
    companionProvider: EntityCompanionProvider,
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
    private readonly entity: TEntity,
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
    )(this.deleteInTransactionAsync(new Set(), false, null));
  }

  private async deleteInTransactionAsync(
    processedEntityIdentifiersFromTransitiveDeletions: Set<string>,
    skipDatabaseDeletion: boolean,
    cascadingDeleteCause: EntityCascadingDeletionInfo | null,
  ): Promise<Result<void>> {
    return await this.queryContext.runInTransactionIfNotInTransactionAsync((innerQueryContext) =>
      this.deleteInternalAsync(
        innerQueryContext,
        processedEntityIdentifiersFromTransitiveDeletions,
        skipDatabaseDeletion,
        cascadingDeleteCause,
      ),
    );
  }

  private async deleteInternalAsync(
    queryContext: EntityTransactionalQueryContext,
    processedEntityIdentifiersFromTransitiveDeletions: Set<string>,
    skipDatabaseDeletion: boolean,
    cascadingDeleteCause: EntityCascadingDeletionInfo | null,
  ): Promise<Result<void>> {
    const authorizeDeleteResult = await asyncResult(
      this.privacyPolicy.authorizeDeleteAsync(
        this.viewerContext,
        queryContext,
        { previousValue: null, cascadingDeleteCause },
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
      cascadingDeleteCause,
    );

    await this.executeMutationTriggersAsync(
      this.mutationTriggers.beforeAll,
      queryContext,
      this.entity,
      { type: EntityMutationType.DELETE, cascadingDeleteCause },
    );
    await this.executeMutationTriggersAsync(
      this.mutationTriggers.beforeDelete,
      queryContext,
      this.entity,
      { type: EntityMutationType.DELETE, cascadingDeleteCause },
    );

    if (!skipDatabaseDeletion) {
      await this.databaseAdapter.deleteAsync(
        queryContext,
        this.entityConfiguration.idField,
        this.entity.getID(),
      );
    }

    const entityLoader = this.entityLoaderFactory.forLoad(this.viewerContext, queryContext, {
      previousValue: null,
      cascadingDeleteCause,
    });
    queryContext.appendPostCommitInvalidationCallback(
      entityLoader.utils.invalidateFieldsAsync.bind(
        entityLoader,
        this.entity.getAllDatabaseFields(),
      ),
    );

    await this.executeMutationTriggersAsync(
      this.mutationTriggers.afterDelete,
      queryContext,
      this.entity,
      { type: EntityMutationType.DELETE, cascadingDeleteCause },
    );
    await this.executeMutationTriggersAsync(
      this.mutationTriggers.afterAll,
      queryContext,
      this.entity,
      { type: EntityMutationType.DELETE, cascadingDeleteCause },
    );

    queryContext.appendPostCommitCallback(
      this.executeNonTransactionalMutationTriggersAsync.bind(
        this,
        this.mutationTriggers.afterCommit,
        this.entity,
        { type: EntityMutationType.DELETE, cascadingDeleteCause },
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
    cascadingDeleteCause: EntityCascadingDeletionInfo | null,
  ): Promise<void> {
    // prevent infinite reference cycles by keeping track of entities already processed
    if (processedEntityIdentifiers.has(entity.getUniqueIdentifier())) {
      return;
    }
    processedEntityIdentifiers.add(entity.getUniqueIdentifier());

    const companionDefinition = this.companionProvider.getCompanionForEntity(
      entity.constructor as IEntityClass<
        TFields,
        TID,
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
      cascadingDeleteCause,
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
                    ? entity.getField(association.associatedEntityLookupByField as any)
                    : entity.getID(),
                ),
            );

            switch (association.edgeDeletionBehavior) {
              case EntityEdgeDeletionBehavior.CASCADE_DELETE_INVALIDATE_CACHE_ONLY: {
                await Promise.all(
                  inboundReferenceEntities.map((inboundReferenceEntity) =>
                    enforceAsyncResult(
                      mutatorFactory
                        .forDelete(inboundReferenceEntity, queryContext)
                        .deleteInTransactionAsync(
                          processedEntityIdentifiers,
                          /* skipDatabaseDeletion */ true, // deletion is handled by DB
                          newCascadingDeleteCause,
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
                        .forUpdate(inboundReferenceEntity, queryContext)
                        .setField(fieldName, null)
                        [
                          'updateInTransactionAsync'
                        ](/* skipDatabaseUpdate */ true, newCascadingDeleteCause),
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
                        .forUpdate(inboundReferenceEntity, queryContext)
                        .setField(fieldName, null)
                        [
                          'updateInTransactionAsync'
                        ](/* skipDatabaseUpdate */ false, newCascadingDeleteCause),
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
                        .forDelete(inboundReferenceEntity, queryContext)
                        .deleteInTransactionAsync(
                          processedEntityIdentifiers,
                          /* skipDatabaseDeletion */ false,
                          newCascadingDeleteCause,
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
