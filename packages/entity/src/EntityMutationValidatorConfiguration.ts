import type { EntityValidatorMutationInfo } from './EntityMutationInfo.ts';
import type { EntityTransactionalQueryContext } from './EntityQueryContext.ts';
import type { ReadonlyEntity } from './ReadonlyEntity.ts';
import type { ViewerContext } from './ViewerContext.ts';

/**
 * Interface to define validator behavior for entities.
 */
export interface EntityMutationValidatorConfiguration<
  TFields extends Record<string, any>,
  TIDField extends keyof NonNullable<Pick<TFields, TSelectedFields>>,
  TViewerContext extends ViewerContext,
  TEntity extends ReadonlyEntity<TFields, TIDField, TViewerContext, TSelectedFields>,
  TSelectedFields extends keyof TFields = keyof TFields,
> {
  /**
   * Validator set that runs within the transaction but before the entity is created.
   */
  beforeCreateAndUpdate?: EntityMutationValidator<
    TFields,
    TIDField,
    TViewerContext,
    TEntity,
    TSelectedFields
  >[];

  /**
   * Validator set that runs within the transaction but before the entity is deleted. This can be used
   * to maintain constraints not expressable via other means, like checking that this entity is not referenced
   * by other entities (in a non-foreign-key-manner) before proceeding with deletion.
   */
  beforeDelete?: EntityMutationValidator<
    TFields,
    TIDField,
    TViewerContext,
    TEntity,
    TSelectedFields
  >[];
}

/**
 * A validator is a way to specify side-effect-free entity mutation validation that runs within the
 * same transaction as the mutation itself.
 */
export abstract class EntityMutationValidator<
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
    mutationInfo: EntityValidatorMutationInfo<
      TFields,
      TIDField,
      TViewerContext,
      TEntity,
      TSelectedFields
    >,
  ): Promise<void>;
}
