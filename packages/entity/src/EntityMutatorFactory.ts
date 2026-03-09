import {
  AuthorizationResultBasedCreateMutator,
  AuthorizationResultBasedDeleteMutator,
  AuthorizationResultBasedUpdateMutator,
} from './AuthorizationResultBasedEntityMutator';
import type { Entity, IEntityClass } from './Entity';
import type { EntityCompanionProvider } from './EntityCompanionProvider';
import type { EntityConfiguration } from './EntityConfiguration';
import type { EntityDatabaseAdapter } from './EntityDatabaseAdapter';
import type { EntityLoaderFactory } from './EntityLoaderFactory';
import type { EntityCascadingDeletionInfo } from './EntityMutationInfo';
import type { EntityMutationTriggerConfiguration } from './EntityMutationTriggerConfiguration';
import type { EntityMutationValidatorConfiguration } from './EntityMutationValidatorConfiguration';
import type { EntityPrivacyPolicy } from './EntityPrivacyPolicy';
import type { EntityQueryContext } from './EntityQueryContext';
import type { ViewerContext } from './ViewerContext';
import type { IEntityMetricsAdapter } from './metrics/IEntityMetricsAdapter';

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
}
