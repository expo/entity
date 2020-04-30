import { Result } from '@expo/results';

import { EntityCompanionDefinition } from './EntityCompanionProvider';
import { CreateMutator, UpdateMutator } from './EntityMutator';
import EntityPrivacyPolicy from './EntityPrivacyPolicy';
import { EntityQueryContext } from './EntityQueryContext';
import ReadonlyEntity from './ReadonlyEntity';
import ViewerContext from './ViewerContext';

/**
 * Entity is a privacy-first data model.
 *
 * A instance of an entity represents a single "row" of persisted data in a database that a
 * viewer, represented by the corresponding {@link ViewerContext}, has permission to read.
 *
 * Create, read, update, and delete permissions for an entity are declaratively defined using an
 * {@link EntityPrivacyPolicy}.
 *
 * Entites are loaded through an {@link EntityLoader}, which is responsible for
 * orchestrating fetching, caching, and authorization of reading "rows".
 *
 * Entities are mutated and deleted through an {@link EntityMutator}, which is responsible for
 * orchestrating database writes, cache invalidation, and authorization of writing "rows".
 *
 * All concrete entity implementations should extend this class and provide their
 * own {@link EntityCompanionDefinition}.
 */
export default abstract class Entity<
  TFields,
  TID,
  TViewerContext extends ViewerContext
> extends ReadonlyEntity<TFields, TID, TViewerContext> {
  /**
   * Vend mutator for creating a new entity in given query context.
   * @param viewerContext viewer context of creating user
   * @param queryContext query context in which to perform the create
   * @return mutator for creating an entity
   */
  static creator<
    TMFields,
    TMID,
    TMViewerContext extends ViewerContext,
    TMViewerContext2 extends TMViewerContext,
    TMEntity extends Entity<TMFields, TMID, TMViewerContext>,
    TMPrivacyPolicy extends EntityPrivacyPolicy<TMFields, TMID, TMViewerContext, TMEntity>
  >(
    this: IEntityClass<TMFields, TMID, TMViewerContext, TMEntity, TMPrivacyPolicy>,
    viewerContext: TMViewerContext2,
    queryContext: EntityQueryContext = viewerContext
      .getViewerScopedEntityCompanionForClass(this)
      .getQueryContextProvider()
      .getRegularEntityQueryContext()
  ): CreateMutator<TMFields, TMID, TMViewerContext, TMEntity, TMPrivacyPolicy> {
    return viewerContext
      .getViewerScopedEntityCompanionForClass(this)
      .getMutatorFactory()
      .forCreate(queryContext);
  }

  /**
   * Vend mutator for updating an existing entity in given query context.
   * @param existingEntity entity to update
   * @param queryContext query context in which to perform the update
   * @returns mutator for updating existingEntity
   */
  static updater<
    TMFields,
    TMID,
    TMViewerContext extends ViewerContext,
    TMEntity extends Entity<TMFields, TMID, TMViewerContext>,
    TMPrivacyPolicy extends EntityPrivacyPolicy<TMFields, TMID, TMViewerContext, TMEntity>
  >(
    this: IEntityClass<TMFields, TMID, TMViewerContext, TMEntity, TMPrivacyPolicy>,
    existingEntity: TMEntity,
    queryContext: EntityQueryContext = existingEntity
      .getViewerContext()
      .getViewerScopedEntityCompanionForClass(this)
      .getQueryContextProvider()
      .getRegularEntityQueryContext()
  ): UpdateMutator<TMFields, TMID, TMViewerContext, TMEntity, TMPrivacyPolicy> {
    return existingEntity
      .getViewerContext()
      .getViewerScopedEntityCompanionForClass(this)
      .getMutatorFactory()
      .forUpdate(existingEntity, queryContext);
  }

  /**
   * Delete an existing entity in given query context.
   * @param existingEntity entity to delete
   * @param queryContext query context in which to perform the delete
   */
  static deleteAsync<
    TMFields,
    TMID,
    TMViewerContext extends ViewerContext,
    TMEntity extends Entity<TMFields, TMID, TMViewerContext>,
    TMPrivacyPolicy extends EntityPrivacyPolicy<TMFields, TMID, TMViewerContext, TMEntity>
  >(
    this: IEntityClass<TMFields, TMID, TMViewerContext, TMEntity, TMPrivacyPolicy>,
    existingEntity: TMEntity,
    queryContext: EntityQueryContext = existingEntity
      .getViewerContext()
      .getViewerScopedEntityCompanionForClass(this)
      .getQueryContextProvider()
      .getRegularEntityQueryContext()
  ): Promise<Result<void>> {
    return existingEntity
      .getViewerContext()
      .getViewerScopedEntityCompanionForClass(this)
      .getMutatorFactory()
      .forDelete(existingEntity, queryContext)
      .deleteAsync();
  }
}

/**
 * An interface to pass in constructor (class) of an Entity as a function argument.
 */
export interface IEntityClass<
  TFields,
  TID,
  TViewerContext extends ViewerContext,
  TEntity extends ReadonlyEntity<TFields, TID, TViewerContext>,
  TPrivacyPolicy extends EntityPrivacyPolicy<TFields, TID, TViewerContext, TEntity>
> {
  new (viewerContext: TViewerContext, obj: Readonly<TFields>): TEntity;
  getCompanionDefinition(): EntityCompanionDefinition<
    TFields,
    TID,
    TViewerContext,
    TEntity,
    TPrivacyPolicy
  >;
}
