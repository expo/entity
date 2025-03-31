import { EntityTriggerMutationInfo } from './EntityMutationInfo';
import { EntityTransactionalQueryContext } from './EntityQueryContext';
import ReadonlyEntity from './ReadonlyEntity';
import ViewerContext from './ViewerContext';

/**
 * Interface to define trigger behavior for entities.
 */
export default interface EntityMutationTriggerConfiguration<
  TFields extends Record<string, any>,
  TIDField extends keyof NonNullable<Pick<TFields, TSelectedFields>>,
  TViewerContext extends ViewerContext,
  TEntity extends ReadonlyEntity<TFields, TIDField, TViewerContext, TSelectedFields>,
  TSelectedFields extends keyof TFields = keyof TFields,
> {
  /**
   * Trigger set that runs within the transaction but before the entity is created in the database.
   */
  beforeCreate?: EntityMutationTrigger<
    TFields,
    TIDField,
    TViewerContext,
    TEntity,
    TSelectedFields
  >[];
  /**
   * Trigger set that runs within the transaction but after the entity is created in the database and cache is invalidated.
   */
  afterCreate?: EntityMutationTrigger<
    TFields,
    TIDField,
    TViewerContext,
    TEntity,
    TSelectedFields
  >[];

  /**
   * Trigger set that runs within the transaction but before the entity is updated in the database.
   */
  beforeUpdate?: EntityMutationTrigger<
    TFields,
    TIDField,
    TViewerContext,
    TEntity,
    TSelectedFields
  >[];
  /**
   * Trigger set that runs within the transaction but after the entity is updated in the database and cache is invalidated.
   */
  afterUpdate?: EntityMutationTrigger<
    TFields,
    TIDField,
    TViewerContext,
    TEntity,
    TSelectedFields
  >[];

  /**
   * Trigger set that runs within the transaction but before the entity is deleted from the database.
   */
  beforeDelete?: EntityMutationTrigger<
    TFields,
    TIDField,
    TViewerContext,
    TEntity,
    TSelectedFields
  >[];
  /**
   * Trigger set that runs within the transaction but after the entity is deleted from the database and cache is invalidated.
   */
  afterDelete?: EntityMutationTrigger<
    TFields,
    TIDField,
    TViewerContext,
    TEntity,
    TSelectedFields
  >[];

  /**
   * Trigger set that runs within the transaction but before the entity is created, updated, or deleted.
   */
  beforeAll?: EntityMutationTrigger<TFields, TIDField, TViewerContext, TEntity, TSelectedFields>[];
  /**
   * Trigger set that runs within the transaction but after the entity is created in, updated in, or deleted from
   * the database and the cache is invalidated.
   */
  afterAll?: EntityMutationTrigger<TFields, TIDField, TViewerContext, TEntity, TSelectedFields>[];

  /**
   * Trigger set that runs after committing the mutation transaction. If the call to the mutation is wrapped in a transaction, these
   * will be run after the wrapping transaction is completed.
   */
  afterCommit?: EntityNonTransactionalMutationTrigger<
    TFields,
    TIDField,
    TViewerContext,
    TEntity,
    TSelectedFields
  >[];
}

/**
 * A transactional trigger is a way to specify entity mutation operation side-effects that run within the
 * same transaction as the mutation itself.
 */
export abstract class EntityMutationTrigger<
  TFields extends Record<string, any>,
  TIDField extends keyof NonNullable<Pick<TFields, TSelectedFields>>,
  TViewerContext extends ViewerContext,
  TEntity extends ReadonlyEntity<TFields, TIDField, TViewerContext, TSelectedFields>,
  TSelectedFields extends keyof TFields = keyof TFields,
> {
  abstract executeAsync(
    viewerContext: TViewerContext,
    queryContext: EntityTransactionalQueryContext,
    entity: TEntity,
    mutationInfo: EntityTriggerMutationInfo<
      TFields,
      TIDField,
      TViewerContext,
      TEntity,
      TSelectedFields
    >,
  ): Promise<void>;
}

/**
 * A non-transactional trigger is like a EntityMutationTrigger but used for afterCommit triggers
 * since they run after the transaction is committed.
 */
export abstract class EntityNonTransactionalMutationTrigger<
  TFields extends Record<string, any>,
  TIDField extends keyof NonNullable<Pick<TFields, TSelectedFields>>,
  TViewerContext extends ViewerContext,
  TEntity extends ReadonlyEntity<TFields, TIDField, TViewerContext, TSelectedFields>,
  TSelectedFields extends keyof TFields = keyof TFields,
> {
  abstract executeAsync(
    viewerContext: TViewerContext,
    entity: TEntity,
    mutationInfo: EntityTriggerMutationInfo<
      TFields,
      TIDField,
      TViewerContext,
      TEntity,
      TSelectedFields
    >,
  ): Promise<void>;
}
