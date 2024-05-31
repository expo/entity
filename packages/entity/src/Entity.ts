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
 * viewer, represented by the corresponding ViewerContext, has permission to read.
 *
 * Create, read, update, and delete permissions for an entity are declaratively defined using an
 * EntityPrivacyPolicy.
 *
 * Entites are loaded through an EntityLoader, which is responsible for
 * orchestrating fetching, caching, and authorization of reading "rows".
 *
 * Entities are mutated and deleted through an EntityMutator, which is responsible for
 * orchestrating database writes, cache invalidation, and authorization of writing "rows".
 *
 * All concrete entity implementations should extend this class and provide their
 * own EntityCompanionDefinition.
 */
export default abstract class Entity<
  TFields extends object,
  TID extends NonNullable<TFields[TSelectedFields]>,
  TViewerContext extends ViewerContext,
  TSelectedFields extends keyof TFields = keyof TFields
> extends ReadonlyEntity<TFields, TID, TViewerContext, TSelectedFields> {
  /**
   * Vend mutator for creating a new entity in given query context.
   * @param viewerContext - viewer context of creating user
   * @param queryContext - query context in which to perform the create
   * @returns mutator for creating an entity
   */
  static creator<
    TMFields extends object,
    TMID extends NonNullable<TMFields[TMSelectedFields]>,
    TMViewerContext extends ViewerContext,
    TMViewerContext2 extends TMViewerContext,
    TMEntity extends Entity<TMFields, TMID, TMViewerContext, TMSelectedFields>,
    TMPrivacyPolicy extends EntityPrivacyPolicy<
      TMFields,
      TMID,
      TMViewerContext,
      TMEntity,
      TMSelectedFields
    >,
    TMSelectedFields extends keyof TMFields = keyof TMFields
  >(
    this: IEntityClass<
      TMFields,
      TMID,
      TMViewerContext,
      TMEntity,
      TMPrivacyPolicy,
      TMSelectedFields
    >,
    viewerContext: TMViewerContext2,
    queryContext: EntityQueryContext = viewerContext
      .getViewerScopedEntityCompanionForClass(this)
      .getQueryContextProvider()
      .getQueryContext()
  ): CreateMutator<TMFields, TMID, TMViewerContext, TMEntity, TMPrivacyPolicy, TMSelectedFields> {
    return viewerContext
      .getViewerScopedEntityCompanionForClass(this)
      .getMutatorFactory()
      .forCreate(queryContext);
  }

  /**
   * Vend mutator for updating an existing entity in given query context.
   * @param existingEntity - entity to update
   * @param queryContext - query context in which to perform the update
   * @returns mutator for updating existingEntity
   */
  static updater<
    TMFields extends object,
    TMID extends NonNullable<TMFields[TMSelectedFields]>,
    TMViewerContext extends ViewerContext,
    TMEntity extends Entity<TMFields, TMID, TMViewerContext, TMSelectedFields>,
    TMPrivacyPolicy extends EntityPrivacyPolicy<
      TMFields,
      TMID,
      TMViewerContext,
      TMEntity,
      TMSelectedFields
    >,
    TMSelectedFields extends keyof TMFields = keyof TMFields
  >(
    this: IEntityClass<
      TMFields,
      TMID,
      TMViewerContext,
      TMEntity,
      TMPrivacyPolicy,
      TMSelectedFields
    >,
    existingEntity: TMEntity,
    queryContext: EntityQueryContext = existingEntity
      .getViewerContext()
      .getViewerScopedEntityCompanionForClass(this)
      .getQueryContextProvider()
      .getQueryContext()
  ): UpdateMutator<TMFields, TMID, TMViewerContext, TMEntity, TMPrivacyPolicy, TMSelectedFields> {
    return existingEntity
      .getViewerContext()
      .getViewerScopedEntityCompanionForClass(this)
      .getMutatorFactory()
      .forUpdate(existingEntity, queryContext);
  }

  /**
   * Delete an existing entity in given query context.
   * @param existingEntity - entity to delete
   * @param queryContext - query context in which to perform the delete
   */
  static deleteAsync<
    TMFields extends object,
    TMID extends NonNullable<TMFields[TMSelectedFields]>,
    TMViewerContext extends ViewerContext,
    TMEntity extends Entity<TMFields, TMID, TMViewerContext, TMSelectedFields>,
    TMPrivacyPolicy extends EntityPrivacyPolicy<
      TMFields,
      TMID,
      TMViewerContext,
      TMEntity,
      TMSelectedFields
    >,
    TMSelectedFields extends keyof TMFields = keyof TMFields
  >(
    this: IEntityClass<
      TMFields,
      TMID,
      TMViewerContext,
      TMEntity,
      TMPrivacyPolicy,
      TMSelectedFields
    >,
    existingEntity: TMEntity,
    queryContext: EntityQueryContext = existingEntity
      .getViewerContext()
      .getViewerScopedEntityCompanionForClass(this)
      .getQueryContextProvider()
      .getQueryContext()
  ): Promise<Result<void>> {
    return existingEntity
      .getViewerContext()
      .getViewerScopedEntityCompanionForClass(this)
      .getMutatorFactory()
      .forDelete(existingEntity, queryContext)
      .deleteAsync();
  }

  /**
   * Delete an existing entity in given query context, throwing if deletion is unsuccessful.
   * @param existingEntity - entity to delete
   * @param queryContext - query context in which to perform the delete
   */
  static enforceDeleteAsync<
    TMFields extends object,
    TMID extends NonNullable<TMFields[TMSelectedFields]>,
    TMViewerContext extends ViewerContext,
    TMEntity extends Entity<TMFields, TMID, TMViewerContext, TMSelectedFields>,
    TMPrivacyPolicy extends EntityPrivacyPolicy<
      TMFields,
      TMID,
      TMViewerContext,
      TMEntity,
      TMSelectedFields
    >,
    TMSelectedFields extends keyof TMFields = keyof TMFields
  >(
    this: IEntityClass<
      TMFields,
      TMID,
      TMViewerContext,
      TMEntity,
      TMPrivacyPolicy,
      TMSelectedFields
    >,
    existingEntity: TMEntity,
    queryContext: EntityQueryContext = existingEntity
      .getViewerContext()
      .getViewerScopedEntityCompanionForClass(this)
      .getQueryContextProvider()
      .getQueryContext()
  ): Promise<void> {
    return existingEntity
      .getViewerContext()
      .getViewerScopedEntityCompanionForClass(this)
      .getMutatorFactory()
      .forDelete(existingEntity, queryContext)
      .enforceDeleteAsync();
  }
}

/**
 * An interface to pass in constructor (class) of an Entity as a function argument.
 */
export interface IEntityClass<
  TFields extends object,
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
  TSelectedFields extends keyof TFields = keyof TFields
> {
  new (constructorParam: {
    viewerContext: TViewerContext;
    id: TID;
    databaseFields: Readonly<TFields>;
    selectedFields: Readonly<Pick<TFields, TSelectedFields>>;
  }): TEntity;

  /**
   * Returns a EntityCompanionDefinition for this entity.
   *
   * Memoized by the entity framework.
   */
  defineCompanionDefinition(): EntityCompanionDefinition<
    TFields,
    TID,
    TViewerContext,
    TEntity,
    TPrivacyPolicy,
    TSelectedFields
  >;
}
