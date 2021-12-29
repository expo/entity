import Entity from './Entity';
import ViewerContext from './ViewerContext';

export enum EntityMutationType {
  CREATE,
  UPDATE,
  DELETE,
}

export type EntityValidatorMutationInfo<
  TFields,
  TID extends NonNullable<TFields[TSelectedFields]>,
  TViewerContext extends ViewerContext,
  TEntity extends Entity<TFields, TID, TViewerContext, TSelectedFields>,
  TSelectedFields extends keyof TFields = keyof TFields
> =
  | {
      type: EntityMutationType.CREATE;
    }
  | {
      type: EntityMutationType.UPDATE;
      previousValue: TEntity;
    };

export type EntityMutationTriggerDeleteCascadeInfo<> = {
  entity: Entity<any, any, any, any>;
  cascadingDeleteCause: EntityMutationTriggerDeleteCascadeInfo | null;
};

export type EntityTriggerMutationInfo<
  TFields,
  TID extends NonNullable<TFields[TSelectedFields]>,
  TViewerContext extends ViewerContext,
  TEntity extends Entity<TFields, TID, TViewerContext, TSelectedFields>,
  TSelectedFields extends keyof TFields = keyof TFields
> =
  | {
      type: EntityMutationType.CREATE;
    }
  | {
      type: EntityMutationType.UPDATE;
      previousValue: TEntity;
    }
  | {
      type: EntityMutationType.DELETE;
      cascadingDeleteCause: EntityMutationTriggerDeleteCascadeInfo | null;
    };
