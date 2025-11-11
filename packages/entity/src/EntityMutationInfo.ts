import { Entity } from './Entity';
import { ViewerContext } from './ViewerContext';

export enum EntityMutationType {
  CREATE,
  UPDATE,
  DELETE,
}

/**
 * Information about a cascading deletion.
 */
export type EntityCascadingDeletionInfo = {
  /**
   * The entity that is being mutated at this step in the cascaded deletion.
   */
  entity: Entity<any, any, any, any>;

  /**
   * The cascade deletion that caused this mutation.
   */
  cascadingDeleteCause: EntityCascadingDeletionInfo | null;
};

type EntityTriggerOrValidatorMutationInfo<
  TFields extends Record<string, any>,
  TIDField extends keyof NonNullable<Pick<TFields, TSelectedFields>>,
  TViewerContext extends ViewerContext,
  TEntity extends Entity<TFields, TIDField, TViewerContext, TSelectedFields>,
  TSelectedFields extends keyof TFields = keyof TFields,
> =
  | {
      type: EntityMutationType.CREATE;
    }
  | {
      type: EntityMutationType.UPDATE;
      previousValue: TEntity;
      cascadingDeleteCause: EntityCascadingDeletionInfo | null;
    }
  | {
      type: EntityMutationType.DELETE;
      cascadingDeleteCause: EntityCascadingDeletionInfo | null;
    };

export type EntityValidatorMutationInfo<
  TFields extends Record<string, any>,
  TIDField extends keyof NonNullable<Pick<TFields, TSelectedFields>>,
  TViewerContext extends ViewerContext,
  TEntity extends Entity<TFields, TIDField, TViewerContext, TSelectedFields>,
  TSelectedFields extends keyof TFields = keyof TFields,
> = EntityTriggerOrValidatorMutationInfo<
  TFields,
  TIDField,
  TViewerContext,
  TEntity,
  TSelectedFields
>;

export type EntityTriggerMutationInfo<
  TFields extends Record<string, any>,
  TIDField extends keyof NonNullable<Pick<TFields, TSelectedFields>>,
  TViewerContext extends ViewerContext,
  TEntity extends Entity<TFields, TIDField, TViewerContext, TSelectedFields>,
  TSelectedFields extends keyof TFields = keyof TFields,
> = EntityTriggerOrValidatorMutationInfo<
  TFields,
  TIDField,
  TViewerContext,
  TEntity,
  TSelectedFields
>;
