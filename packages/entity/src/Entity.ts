import {
  AuthorizationResultBasedCreateMutator,
  AuthorizationResultBasedDeleteMutator,
  AuthorizationResultBasedUpdateMutator,
} from './AuthorizationResultBasedEntityMutator';
import EnforcingEntityCreator from './EnforcingEntityCreator';
import EnforcingEntityDeleter from './EnforcingEntityDeleter';
import EnforcingEntityUpdater from './EnforcingEntityUpdater';
import { EntityCompanionDefinition } from './EntityCompanionProvider';
import EntityCreator from './EntityCreator';
import EntityDeleter from './EntityDeleter';
import EntityPrivacyPolicy from './EntityPrivacyPolicy';
import { EntityQueryContext } from './EntityQueryContext';
import EntityUpdater from './EntityUpdater';
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
  TSelectedFields extends keyof TFields = keyof TFields,
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
    TMSelectedFields extends keyof TMFields = keyof TMFields,
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
      .getQueryContext(),
  ): EnforcingEntityCreator<
    TMFields,
    TMID,
    TMViewerContext,
    TMEntity,
    TMPrivacyPolicy,
    TMSelectedFields
  > {
    return new EntityCreator(viewerContext, queryContext, this).enforcing();
  }

  /**
   * Vend mutator for creating a new entity in given query context.
   * @param viewerContext - viewer context of creating user
   * @param queryContext - query context in which to perform the create
   * @returns mutator for creating an entity
   */
  static creatorWithAuthorizationResults<
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
    TMSelectedFields extends keyof TMFields = keyof TMFields,
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
      .getQueryContext(),
  ): AuthorizationResultBasedCreateMutator<
    TMFields,
    TMID,
    TMViewerContext,
    TMEntity,
    TMPrivacyPolicy,
    TMSelectedFields
  > {
    return new EntityCreator(viewerContext, queryContext, this).withAuthorizationResults();
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
    TMSelectedFields extends keyof TMFields = keyof TMFields,
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
      .getQueryContext(),
  ): EnforcingEntityUpdater<
    TMFields,
    TMID,
    TMViewerContext,
    TMEntity,
    TMPrivacyPolicy,
    TMSelectedFields
  > {
    return new EntityUpdater(existingEntity, queryContext, this).enforcing();
  }

  /**
   * Vend mutator for updating an existing entity in given query context.
   * @param existingEntity - entity to update
   * @param queryContext - query context in which to perform the update
   * @returns mutator for updating existingEntity
   */
  static updaterWithAuthorizationResults<
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
    TMSelectedFields extends keyof TMFields = keyof TMFields,
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
      .getQueryContext(),
  ): AuthorizationResultBasedUpdateMutator<
    TMFields,
    TMID,
    TMViewerContext,
    TMEntity,
    TMPrivacyPolicy,
    TMSelectedFields
  > {
    return new EntityUpdater(existingEntity, queryContext, this).withAuthorizationResults();
  }

  /**
   * Vend mutator for deleting an existing entity in given query context.
   * @param existingEntity - entity to delete
   * @param queryContext - query context in which to perform the delete
   * @returns mutator for deleting existingEntity
   */
  static deleter<
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
    TMSelectedFields extends keyof TMFields = keyof TMFields,
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
      .getQueryContext(),
  ): EnforcingEntityDeleter<
    TMFields,
    TMID,
    TMViewerContext,
    TMEntity,
    TMPrivacyPolicy,
    TMSelectedFields
  > {
    return new EntityDeleter(existingEntity, queryContext, this).enforcing();
  }

  /**
   * Vend mutator for deleting an existing entity in given query context.
   * @param existingEntity - entity to delete
   * @param queryContext - query context in which to perform the delete
   * @returns mutator for deleting existingEntity
   */
  static deleterWithAuthorizationResults<
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
    TMSelectedFields extends keyof TMFields = keyof TMFields,
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
      .getQueryContext(),
  ): AuthorizationResultBasedDeleteMutator<
    TMFields,
    TMID,
    TMViewerContext,
    TMEntity,
    TMPrivacyPolicy,
    TMSelectedFields
  > {
    return new EntityDeleter(existingEntity, queryContext, this).withAuthorizationResults();
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
  TSelectedFields extends keyof TFields = keyof TFields,
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
