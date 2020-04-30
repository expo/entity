import Entity, { IEntityClass } from './Entity';
import EntityConfiguration from './EntityConfiguration';
import EntityDatabaseAdapter from './EntityDatabaseAdapter';
import EntityLoaderFactory from './EntityLoaderFactory';
import { CreateMutator, UpdateMutator, DeleteMutator } from './EntityMutator';
import EntityPrivacyPolicy from './EntityPrivacyPolicy';
import { EntityQueryContext } from './EntityQueryContext';
import ViewerContext from './ViewerContext';
import IEntityMetricsAdapter from './metrics/IEntityMetricsAdapter';

/**
 * The primary interface for creating, mutating, and deleting entities.
 */
export default class EntityMutatorFactory<
  TFields,
  TID,
  TViewerContext extends ViewerContext,
  TEntity extends Entity<TFields, TID, TViewerContext>,
  TPrivacyPolicy extends EntityPrivacyPolicy<TFields, TID, TViewerContext, TEntity>
> {
  constructor(
    private readonly entityConfiguration: EntityConfiguration<TFields>,
    private readonly entityClass: IEntityClass<
      TFields,
      TID,
      TViewerContext,
      TEntity,
      TPrivacyPolicy
    >,
    private readonly privacyPolicy: TPrivacyPolicy,
    private readonly entityLoaderFactory: EntityLoaderFactory<
      TFields,
      TID,
      TViewerContext,
      TEntity,
      TPrivacyPolicy
    >,
    private readonly databaseAdapter: EntityDatabaseAdapter<TFields>,
    private readonly metricsAdapter: IEntityMetricsAdapter
  ) {}

  /**
   * Vend mutator for creating a new entity in given query context.
   * @param viewerContext viewer context of creating user
   * @param queryContext query context in which to perform the create
   * @return mutator for creating an entity
   */
  forCreate(
    viewerContext: TViewerContext,
    queryContext: EntityQueryContext
  ): CreateMutator<TFields, TID, TViewerContext, TEntity, TPrivacyPolicy> {
    return new CreateMutator(
      viewerContext,
      queryContext,
      this.entityConfiguration,
      this.entityClass,
      this.privacyPolicy,
      this.entityLoaderFactory,
      this.databaseAdapter,
      this.metricsAdapter
    );
  }

  /**
   * Vend mutator for updating an existing entity in given query context.
   * @param existingEntity entity to update
   * @param queryContext query context in which to perform the update
   * @returns mutator for updating existingEntity
   */
  forUpdate(
    existingEntity: TEntity,
    queryContext: EntityQueryContext
  ): UpdateMutator<TFields, TID, TViewerContext, TEntity, TPrivacyPolicy> {
    return new UpdateMutator(
      existingEntity.getViewerContext(),
      queryContext,
      this.entityConfiguration,
      this.entityClass,
      this.privacyPolicy,
      this.entityLoaderFactory,
      this.databaseAdapter,
      this.metricsAdapter,
      existingEntity.getAllFields()
    );
  }

  /**
   * Delete an existing entity in given query context.
   * @param existingEntity entity to delete
   * @param queryContext query context in which to perform the delete
   */
  forDelete(
    existingEntity: TEntity,
    queryContext: EntityQueryContext
  ): DeleteMutator<TFields, TID, TViewerContext, TEntity, TPrivacyPolicy> {
    return new DeleteMutator(
      existingEntity.getViewerContext(),
      queryContext,
      this.entityConfiguration,
      this.entityClass,
      this.privacyPolicy,
      this.entityLoaderFactory,
      this.databaseAdapter,
      this.metricsAdapter,
      existingEntity
    );
  }
}
