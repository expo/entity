import {
  AuthorizationResultBasedBatchCreateMutator,
  AuthorizationResultBasedBatchDeleteMutator,
  AuthorizationResultBasedBatchUpdateMutator,
  AuthorizationResultBasedCreateMutator,
  AuthorizationResultBasedDeleteMutator,
  AuthorizationResultBasedUpdateMutator,
} from './AuthorizationResultBasedEntityMutator';
import { EntityCascadingDeletionInfo } from './EntityMutationInfo';
import { EntityMutatorFactory } from './EntityMutatorFactory';
import { EntityPrivacyPolicy } from './EntityPrivacyPolicy';
import { EntityQueryContext } from './EntityQueryContext';
import { ReadonlyEntity } from './ReadonlyEntity';
import { ViewerContext } from './ViewerContext';

/**
 * Provides a cleaner API for mutating entities by passing through the ViewerContext.
 */
export class ViewerScopedEntityMutatorFactory<
  TFields extends Record<string, any>,
  TIDField extends keyof NonNullable<Pick<TFields, TSelectedFields>>,
  TViewerContext extends ViewerContext,
  TEntity extends ReadonlyEntity<TFields, TIDField, TViewerContext, TSelectedFields>,
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
    private readonly entityMutatorFactory: EntityMutatorFactory<
      TFields,
      TIDField,
      TViewerContext,
      TEntity,
      TPrivacyPolicy,
      TSelectedFields
    >,
    private readonly viewerContext: TViewerContext,
  ) {}

  forCreate(
    queryContext: EntityQueryContext,
  ): AuthorizationResultBasedCreateMutator<
    TFields,
    TIDField,
    TViewerContext,
    TEntity,
    TPrivacyPolicy,
    TSelectedFields
  > {
    return this.entityMutatorFactory.forCreate(this.viewerContext, queryContext);
  }

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
    return this.entityMutatorFactory.forUpdate(existingEntity, queryContext, cascadingDeleteCause);
  }

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
    return this.entityMutatorFactory.forDelete(existingEntity, queryContext, cascadingDeleteCause);
  }

  forBatchCreate(
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
    return this.entityMutatorFactory.forBatchCreate(this.viewerContext, queryContext, fieldObjects);
  }

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
    return this.entityMutatorFactory.forBatchDelete(existingEntities, queryContext);
  }

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
    return this.entityMutatorFactory.forBatchUpdate(existingEntities, queryContext);
  }
}
