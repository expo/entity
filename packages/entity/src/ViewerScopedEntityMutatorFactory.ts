import {
  AuthorizationResultBasedCreateMutator,
  AuthorizationResultBasedUpdateMutator,
  AuthorizationResultBasedDeleteMutator,
} from './AuthorizationResultBasedEntityMutator';
import EntityMutatorFactory from './EntityMutatorFactory';
import EntityPrivacyPolicy from './EntityPrivacyPolicy';
import { EntityQueryContext } from './EntityQueryContext';
import ReadonlyEntity from './ReadonlyEntity';
import ViewerContext from './ViewerContext';

/**
 * Provides a cleaner API for mutating entities by passing through the ViewerContext.
 */
export default class ViewerScopedEntityMutatorFactory<
  TFields extends Record<string, any>,
  TID extends NonNullable<TFields[TSelectedFields]>,
  TViewerContext extends ViewerContext,
  TEntity extends ReadonlyEntity<TFields, TID, TViewerContext, TSelectedFields>,
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
    private readonly entityMutatorFactory: EntityMutatorFactory<
      TFields,
      TID,
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
    TID,
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
  ): AuthorizationResultBasedUpdateMutator<
    TFields,
    TID,
    TViewerContext,
    TEntity,
    TPrivacyPolicy,
    TSelectedFields
  > {
    return this.entityMutatorFactory.forUpdate(existingEntity, queryContext);
  }

  forDelete(
    existingEntity: TEntity,
    queryContext: EntityQueryContext,
  ): AuthorizationResultBasedDeleteMutator<
    TFields,
    TID,
    TViewerContext,
    TEntity,
    TPrivacyPolicy,
    TSelectedFields
  > {
    return this.entityMutatorFactory.forDelete(existingEntity, queryContext);
  }
}
