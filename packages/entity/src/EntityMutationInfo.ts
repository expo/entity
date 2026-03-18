import type { Entity } from './Entity.ts';
import type { ViewerContext } from './ViewerContext.ts';

/**
 * The type of mutation that is occurring to an entity.
 */
export enum EntityMutationType {
  /**
   * Create mutation.
   */
  CREATE,
  /**
   * Update mutation.
   */
  UPDATE,
  /**
   * Delete mutation.
   */
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
      /**
       * The type of mutation that invoked this trigger or validator.
       */
      type: EntityMutationType.CREATE;
    }
  | {
      /**
       * The type of mutation that invoked this trigger or validator.
       */
      type: EntityMutationType.UPDATE;
      /**
       * The previous value of the entity before the update.
       */
      previousValue: TEntity;
      /**
       * If this update is part of a cascading deletion (cascade set null), this field will contain information about the cascade
       * that caused this update. Otherwise, it will be null.
       */
      cascadingDeleteCause: EntityCascadingDeletionInfo | null;
    }
  | {
      /**
       * The type of mutation that invoked this trigger or validator.
       */
      type: EntityMutationType.DELETE;
      /**
       * If this delete is part of a cascading deletion, this field will contain information about the cascade that caused this cascading delete.
       */
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
