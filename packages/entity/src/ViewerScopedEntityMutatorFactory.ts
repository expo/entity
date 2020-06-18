import { CreateMutator, UpdateMutator, DeleteMutator } from './EntityMutator';
import EntityMutatorFactory from './EntityMutatorFactory';
import EntityPrivacyPolicy from './EntityPrivacyPolicy';
import { EntityQueryContext } from './EntityQueryContext';
import ReadonlyEntity from './ReadonlyEntity';
import ViewerContext from './ViewerContext';

/**
 * Provides a cleaner API for mutating entities by passing through the {@link ViewerContext}.
 */
export default class ViewerScopedEntityMutatorFactory<
  TFields,
  TID,
  TViewerContext extends ViewerContext,
  TEntity extends ReadonlyEntity<TFields, TID, TViewerContext>,
  TPrivacyPolicy extends EntityPrivacyPolicy<TFields, TID, TViewerContext, TEntity>
> {
  constructor(
    private readonly entityMutatorFactory: EntityMutatorFactory<
      TFields,
      TID,
      TViewerContext,
      TEntity,
      TPrivacyPolicy
    >,
    private readonly viewerContext: TViewerContext
  ) {}

  forCreate(
    queryContext: EntityQueryContext
  ): CreateMutator<TFields, TID, TViewerContext, TEntity, TPrivacyPolicy> {
    return this.entityMutatorFactory.forCreate(this.viewerContext, queryContext);
  }

  forUpdate(
    existingEntity: TEntity,
    queryContext: EntityQueryContext
  ): UpdateMutator<TFields, TID, TViewerContext, TEntity, TPrivacyPolicy> {
    return this.entityMutatorFactory.forUpdate(existingEntity, queryContext);
  }

  forDelete(
    existingEntity: TEntity,
    queryContext: EntityQueryContext
  ): DeleteMutator<TFields, TID, TViewerContext, TEntity, TPrivacyPolicy> {
    return this.entityMutatorFactory.forDelete(existingEntity, queryContext);
  }
}