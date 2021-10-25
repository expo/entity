import { Result, asyncResult } from '@expo/results';

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
    TMFields,
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
    TMFields,
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
    TMFields,
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
    TMFields,
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

  /**
   * Check whether an entity loaded by a viewer can be updated by that same viewer.
   *
   * @remarks
   *
   * This may be useful in situations relying upon the thrown privacy policy thrown authorization error
   * is insufficient for the task at hand. When dealing with purely a sequence of mutations it is easy
   * to roll back all mutations given a single authorization error by wrapping them in a single transaction.
   * When certain portions of a mutation cannot be rolled back transactionally (third pary calls,
   * legacy code, etc), using this method can help decide whether the sequence of mutations will fail before
   * attempting them. Note that if any privacy policy rules use a piece of data being updated in the mutations
   * the result of this method and the update mutation itself may differ.
   *
   * @param existingEntity - entity loaded by viewer
   * @param queryContext - query context in which to perform the check
   */
  static async canViewerUpdateAsync<
    TMFields,
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
  ): Promise<boolean> {
    const companion = existingEntity
      .getViewerContext()
      .getViewerScopedEntityCompanionForClass(this);
    const privacyPolicy = new (this.getCompanionDefinition().privacyPolicyClass)();
    const evaluationResult = await asyncResult(
      privacyPolicy.authorizeUpdateAsync(
        existingEntity.getViewerContext(),
        queryContext,
        existingEntity,
        companion.getMetricsAdapter()
      )
    );
    return evaluationResult.ok;
  }

  /**
   * Check whether an entity loaded by a viewer can be deleted by that same viewer.
   *
   * @remarks
   * See remarks for canViewerUpdate.
   *
   * @param existingEntity - entity loaded by viewer
   * @param queryContext - query context in which to perform the check
   */
  static async canViewerDeleteAsync<
    TMFields,
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
  ): Promise<boolean> {
    const companion = existingEntity
      .getViewerContext()
      .getViewerScopedEntityCompanionForClass(this);
    const privacyPolicy = new (this.getCompanionDefinition().privacyPolicyClass)();
    const evaluationResult = await asyncResult(
      privacyPolicy.authorizeDeleteAsync(
        existingEntity.getViewerContext(),
        queryContext,
        existingEntity,
        companion.getMetricsAdapter()
      )
    );
    return evaluationResult.ok;
  }
}

/**
 * An interface to pass in constructor (class) of an Entity as a function argument.
 */
export interface IEntityClass<
  TFields,
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
  new (viewerContext: TViewerContext, obj: Readonly<TFields>): TEntity;
  getCompanionDefinition(): EntityCompanionDefinition<
    TFields,
    TID,
    TViewerContext,
    TEntity,
    TPrivacyPolicy,
    TSelectedFields
  >;
}
