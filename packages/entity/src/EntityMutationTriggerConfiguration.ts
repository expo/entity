import { EntityTriggerMutationInfo } from './EntityMutationInfo';
import { EntityTransactionalQueryContext } from './EntityQueryContext';
import ReadonlyEntity from './ReadonlyEntity';
import ViewerContext from './ViewerContext';

/**
 * Interface to define trigger behavior for entities.
 */
export default interface EntityMutationTriggerConfiguration<
  TFields,
  TID extends NonNullable<TFields[TSelectedFields]>,
  TViewerContext extends ViewerContext,
  TEntity extends ReadonlyEntity<TFields, TID, TViewerContext, TSelectedFields>,
  TSelectedFields extends keyof TFields = keyof TFields
> {
  /**
   * Trigger set that runs within the transaction but before the entity is created in the database.
   */
  beforeCreate?: EntityMutationTrigger<TFields, TID, TViewerContext, TEntity, TSelectedFields>[];
  /**
   * Trigger set that runs within the transaction but after the entity is created in the database and cache is invalidated.
   */
  afterCreate?: EntityMutationTrigger<TFields, TID, TViewerContext, TEntity, TSelectedFields>[];

  /**
   * Trigger set that runs within the transaction but before the entity is updated in the database.
   */
  beforeUpdate?: EntityMutationTrigger<TFields, TID, TViewerContext, TEntity, TSelectedFields>[];
  /**
   * Trigger set that runs within the transaction but after the entity is updated in the database and cache is invalidated.
   */
  afterUpdate?: EntityMutationTrigger<TFields, TID, TViewerContext, TEntity, TSelectedFields>[];

  /**
   * Trigger set that runs within the transaction but before the entity is deleted from the database.
   */
  beforeDelete?: EntityMutationTrigger<TFields, TID, TViewerContext, TEntity, TSelectedFields>[];
  /**
   * Trigger set that runs within the transaction but after the entity is deleted from the database and cache is invalidated.
   */
  afterDelete?: EntityMutationTrigger<TFields, TID, TViewerContext, TEntity, TSelectedFields>[];

  /**
   * Trigger set that runs within the transaction but before the entity is created, updated, or deleted.
   */
  beforeAll?: EntityMutationTrigger<TFields, TID, TViewerContext, TEntity, TSelectedFields>[];
  /**
   * Trigger set that runs within the transaction but before the entity is created in, updated in, or deleted from
   * the database and the cache is invalidated.
   */
  afterAll?: EntityMutationTrigger<TFields, TID, TViewerContext, TEntity, TSelectedFields>[];

  /**
   * Trigger set that runs after committing the transaction unless one is supplied
   * after any mutation (create, update, delete). If the call to the mutation is wrapped in a transaction,
   * this too will be within the transaction.
   */
  afterCommit?: EntityNonTransactionalMutationTrigger<
    TFields,
    TID,
    TViewerContext,
    TEntity,
    TSelectedFields
  >[];
}

/**
 * A trigger is a way to specify entity mutation operation side-effects that run within the
 * same transaction as the mutation itself. The one exception is afterCommit, which will run within
 * the transaction if a transaction is supplied.
 */
export abstract class EntityMutationTrigger<
  TFields,
  TID extends NonNullable<TFields[TSelectedFields]>,
  TViewerContext extends ViewerContext,
  TEntity extends ReadonlyEntity<TFields, TID, TViewerContext, TSelectedFields>,
  TSelectedFields extends keyof TFields = keyof TFields
> {
  abstract executeAsync(
    viewerContext: TViewerContext,
    queryContext: EntityTransactionalQueryContext,
    entity: TEntity,
    mutationInfo: EntityTriggerMutationInfo<TFields, TID, TViewerContext, TEntity, TSelectedFields>
  ): Promise<void>;
}

/**
 * A non-transactional trigger is like a EntityMutationTrigger but used for afterCommit triggers
 * since they explicitly occur outside of the transaction.
 */
export abstract class EntityNonTransactionalMutationTrigger<
  TFields,
  TID extends NonNullable<TFields[TSelectedFields]>,
  TViewerContext extends ViewerContext,
  TEntity extends ReadonlyEntity<TFields, TID, TViewerContext, TSelectedFields>,
  TSelectedFields extends keyof TFields = keyof TFields
> {
  abstract executeAsync(
    viewerContext: TViewerContext,
    entity: TEntity,
    mutationInfo: EntityTriggerMutationInfo<TFields, TID, TViewerContext, TEntity, TSelectedFields>
  ): Promise<void>;
}
