import type {
  AuthorizationResultBasedCreateMutator,
  AuthorizationResultBasedDeleteMutator,
  AuthorizationResultBasedUpdateMutator,
} from './AuthorizationResultBasedEntityMutator.ts';
import type { EntityCascadingDeletionInfo } from './EntityMutationInfo.ts';
import type { EntityMutatorFactory } from './EntityMutatorFactory.ts';
import type { EntityPrivacyPolicy } from './EntityPrivacyPolicy.ts';
import type { EntityQueryContext } from './EntityQueryContext.ts';
import type { ReadonlyEntity } from './ReadonlyEntity.ts';
import type { ViewerContext } from './ViewerContext.ts';

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
}
