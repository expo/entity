import EntityMutationExecutable from './EntityMutationExecutable';
import ReadonlyEntity from './ReadonlyEntity';
import ViewerContext from './ViewerContext';

/**
 * Interface to define trigger behavior for entities.
 */
export default interface EntityMutationTriggerConfiguration<
  TFields,
  TID,
  TViewerContext extends ViewerContext,
  TEntity extends ReadonlyEntity<TFields, TID, TViewerContext, TSelectedFields>,
  TSelectedFields extends keyof TFields = keyof TFields
> {
  /**
   * Trigger set that runs within the transaction but before the entity is created in the database.
   */
  beforeCreate?: EntityMutationExecutable<TFields, TID, TViewerContext, TEntity, TSelectedFields>[];
  /**
   * Trigger set that runs within the transaction but after the entity is created in the database and cache is invalidated.
   */
  afterCreate?: EntityMutationExecutable<TFields, TID, TViewerContext, TEntity, TSelectedFields>[];

  /**
   * Trigger set that runs within the transaction but before the entity is updated in the database.
   */
  beforeUpdate?: EntityMutationExecutable<TFields, TID, TViewerContext, TEntity, TSelectedFields>[];
  /**
   * Trigger set that runs within the transaction but after the entity is updated in the database and cache is invalidated.
   */
  afterUpdate?: EntityMutationExecutable<TFields, TID, TViewerContext, TEntity, TSelectedFields>[];

  /**
   * Trigger set that runs within the transaction but before the entity is deleted from the database.
   */
  beforeDelete?: EntityMutationExecutable<TFields, TID, TViewerContext, TEntity, TSelectedFields>[];
  /**
   * Trigger set that runs within the transaction but after the entity is deleted from the database and cache is invalidated.
   */
  afterDelete?: EntityMutationExecutable<TFields, TID, TViewerContext, TEntity, TSelectedFields>[];

  /**
   * Trigger set that runs within the transaction but before the entity is created, updated, or deleted.
   */
  beforeAll?: EntityMutationExecutable<TFields, TID, TViewerContext, TEntity, TSelectedFields>[];
  /**
   * Trigger set that runs within the transaction but before the entity is created in, updated in, or deleted from
   * the database and the cache is invalidated.
   */
  afterAll?: EntityMutationExecutable<TFields, TID, TViewerContext, TEntity, TSelectedFields>[];

  /**
   * Trigger set that runs after committing the transaction unless one is supplied
   * after any mutation (create, update, delete). If the call to the mutation is wrapped in a transaction,
   * this too will be within the transaction.
   */
  afterCommit?: EntityMutationExecutable<TFields, TID, TViewerContext, TEntity, TSelectedFields>[];
}
