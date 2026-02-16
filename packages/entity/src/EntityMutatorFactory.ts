import {
  AuthorizationResultBasedBatchCreateMutator,
  AuthorizationResultBasedBatchDeleteMutator,
  AuthorizationResultBasedBatchUpdateMutator,
  AuthorizationResultBasedCreateMutator,
  AuthorizationResultBasedDeleteMutator,
  AuthorizationResultBasedUpdateMutator,
} from './AuthorizationResultBasedEntityMutator';
import { Entity, IEntityClass } from './Entity';
import { EntityCompanionProvider } from './EntityCompanionProvider';
import { EntityConfiguration } from './EntityConfiguration';
import { EntityDatabaseAdapter } from './EntityDatabaseAdapter';
import { EntityLoaderFactory } from './EntityLoaderFactory';
import { EntityCascadingDeletionInfo } from './EntityMutationInfo';
import { EntityMutationTriggerConfiguration } from './EntityMutationTriggerConfiguration';
import { EntityMutationValidatorConfiguration } from './EntityMutationValidatorConfiguration';
import { EntityPrivacyPolicy } from './EntityPrivacyPolicy';
import { EntityQueryContext } from './EntityQueryContext';
import { ViewerContext } from './ViewerContext';
import { IEntityMetricsAdapter } from './metrics/IEntityMetricsAdapter';

/**
 * The primary interface for creating, mutating, and deleting entities.
 */
export class EntityMutatorFactory<
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
  TSelectedFields extends keyof TFields = keyof TFields,
> {
  constructor(
    private readonly entityCompanionProvider: EntityCompanionProvider,
    private readonly entityConfiguration: EntityConfiguration<TFields, TIDField>,
    private readonly entityClass: IEntityClass<
      TFields,
      TIDField,
      TViewerContext,
      TEntity,
      TPrivacyPolicy,
      TSelectedFields
    >,
    private readonly privacyPolicy: TPrivacyPolicy,
    private readonly mutationValidators: EntityMutationValidatorConfiguration<
      TFields,
      TIDField,
      TViewerContext,
      TEntity,
      TSelectedFields
    >,
    private readonly mutationTriggers: EntityMutationTriggerConfiguration<
      TFields,
      TIDField,
      TViewerContext,
      TEntity,
      TSelectedFields
    >,
    private readonly entityLoaderFactory: EntityLoaderFactory<
      TFields,
      TIDField,
      TViewerContext,
      TEntity,
      TPrivacyPolicy,
      TSelectedFields
    >,
    private readonly databaseAdapter: EntityDatabaseAdapter<TFields, TIDField>,
    private readonly metricsAdapter: IEntityMetricsAdapter,
  ) {}

  /**
   * Vend mutator for creating a new entity in given query context.
   * @param viewerContext - viewer context of creating user
   * @param queryContext - query context in which to perform the create
   * @returns mutator for creating an entity
   */
  forCreate(
    viewerContext: TViewerContext,
    queryContext: EntityQueryContext,
  ): AuthorizationResultBasedCreateMutator<
    TFields,
    TIDField,
    TViewerContext,
    TEntity,
    TPrivacyPolicy,
    TSelectedFields
  > {
    return new AuthorizationResultBasedCreateMutator(
      this.entityCompanionProvider,
      viewerContext,
      queryContext,
      this.entityConfiguration,
      this.entityClass,
      this.privacyPolicy,
      this.mutationValidators,
      this.mutationTriggers,
      this.entityLoaderFactory,
      this.databaseAdapter,
      this.metricsAdapter,
    );
  }

  /**
   * Vend mutator for updating an existing entity in given query context.
   * @param existingEntity - entity to update
   * @param queryContext - query context in which to perform the update
   * @returns mutator for updating existingEntity
   */
  forUpdate(
    existingEntity: TEntity,
    queryContext: EntityQueryContext,
    cascadingDeleteCause: EntityCascadingDeletionInfo | null,
  ): AuthorizationResultBasedUpdateMutator<
    TFields,
    TIDField,
    TViewerContext,
    TEntity,
    TPrivacyPolicy,
    TSelectedFields
  > {
    return new AuthorizationResultBasedUpdateMutator(
      this.entityCompanionProvider,
      existingEntity.getViewerContext(),
      queryContext,
      this.entityConfiguration,
      this.entityClass,
      this.privacyPolicy,
      this.mutationValidators,
      this.mutationTriggers,
      this.entityLoaderFactory,
      this.databaseAdapter,
      this.metricsAdapter,
      existingEntity,
      cascadingDeleteCause,
    );
  }

  /**
   * Delete an existing entity in given query context.
   * @param existingEntity - entity to delete
   * @param queryContext - query context in which to perform the delete
   */
  forDelete(
    existingEntity: TEntity,
    queryContext: EntityQueryContext,
    cascadingDeleteCause: EntityCascadingDeletionInfo | null,
  ): AuthorizationResultBasedDeleteMutator<
    TFields,
    TIDField,
    TViewerContext,
    TEntity,
    TPrivacyPolicy,
    TSelectedFields
  > {
    return new AuthorizationResultBasedDeleteMutator(
      this.entityCompanionProvider,
      existingEntity.getViewerContext(),
      queryContext,
      this.entityConfiguration,
      this.entityClass,
      this.privacyPolicy,
      this.mutationValidators,
      this.mutationTriggers,
      this.entityLoaderFactory,
      this.databaseAdapter,
      this.metricsAdapter,
      existingEntity,
      cascadingDeleteCause,
    );
  }

  /**
   * Vend mutator for batch creating multiple new entities in given query context.
   * @param viewerContext - viewer context of creating user
   * @param queryContext - query context in which to perform the batch create
   * @param fieldObjects - field values for each entity to create
   * @returns mutator for batch creating entities
   */
  forBatchCreate(
    viewerContext: TViewerContext,
    queryContext: EntityQueryContext,
    fieldObjects: readonly Readonly<Partial<TFields>>[],
  ): AuthorizationResultBasedBatchCreateMutator<
    TFields,
    TIDField,
    TViewerContext,
    TEntity,
    TPrivacyPolicy,
    TSelectedFields
  > {
    return new AuthorizationResultBasedBatchCreateMutator(
      this.entityCompanionProvider,
      viewerContext,
      queryContext,
      this.entityConfiguration,
      this.entityClass,
      this.privacyPolicy,
      this.mutationValidators,
      this.mutationTriggers,
      this.entityLoaderFactory,
      this.databaseAdapter,
      this.metricsAdapter,
      fieldObjects,
    );
  }

  /**
   * Vend mutator for batch deleting multiple existing entities in given query context.
   * @param existingEntities - entities to delete
   * @param queryContext - query context in which to perform the batch delete
   * @returns mutator for batch deleting entities
   */
  forBatchDelete(
    existingEntities: readonly TEntity[],
    queryContext: EntityQueryContext,
  ): AuthorizationResultBasedBatchDeleteMutator<
    TFields,
    TIDField,
    TViewerContext,
    TEntity,
    TPrivacyPolicy,
    TSelectedFields
  > {
    const viewerContext =
      existingEntities.length > 0
        ? existingEntities[0]!.getViewerContext()
        : (undefined as unknown as TViewerContext);
    return new AuthorizationResultBasedBatchDeleteMutator(
      this.entityCompanionProvider,
      viewerContext,
      queryContext,
      this.entityConfiguration,
      this.entityClass,
      this.privacyPolicy,
      this.mutationValidators,
      this.mutationTriggers,
      this.entityLoaderFactory,
      this.databaseAdapter,
      this.metricsAdapter,
      existingEntities,
    );
  }

  /**
   * Vend mutator for batch updating multiple existing entities in given query context.
   * @param existingEntities - entities to update
   * @param queryContext - query context in which to perform the batch update
   * @returns mutator for batch updating entities
   */
  forBatchUpdate(
    existingEntities: readonly TEntity[],
    queryContext: EntityQueryContext,
  ): AuthorizationResultBasedBatchUpdateMutator<
    TFields,
    TIDField,
    TViewerContext,
    TEntity,
    TPrivacyPolicy,
    TSelectedFields
  > {
    const viewerContext =
      existingEntities.length > 0
        ? existingEntities[0]!.getViewerContext()
        : (undefined as unknown as TViewerContext);
    return new AuthorizationResultBasedBatchUpdateMutator(
      this.entityCompanionProvider,
      viewerContext,
      queryContext,
      this.entityConfiguration,
      this.entityClass,
      this.privacyPolicy,
      this.mutationValidators,
      this.mutationTriggers,
      this.entityLoaderFactory,
      this.databaseAdapter,
      this.metricsAdapter,
      existingEntities,
    );
  }
}
