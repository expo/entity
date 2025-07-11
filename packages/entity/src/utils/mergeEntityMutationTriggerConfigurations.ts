import { EntityMutationTriggerConfiguration } from '../EntityMutationTriggerConfiguration';
import { ReadonlyEntity } from '../ReadonlyEntity';
import { ViewerContext } from '../ViewerContext';

function nonNullish<TValue>(value: TValue | null | undefined): value is NonNullable<TValue> {
  return value !== null && value !== undefined;
}

export function mergeEntityMutationTriggerConfigurations<
  TFields extends Record<string, any>,
  TIDField extends keyof NonNullable<Pick<TFields, TSelectedFields>>,
  TViewerContext extends ViewerContext,
  TEntity extends ReadonlyEntity<TFields, TIDField, TViewerContext, TSelectedFields>,
  TSelectedFields extends keyof TFields,
>(
  ...mutationTriggerConfigurations: EntityMutationTriggerConfiguration<
    TFields,
    TIDField,
    TViewerContext,
    TEntity,
    TSelectedFields
  >[]
): EntityMutationTriggerConfiguration<TFields, TIDField, TViewerContext, TEntity, TSelectedFields> {
  const merged = {
    beforeCreate: mutationTriggerConfigurations.flatMap((c) => c.beforeCreate).filter(nonNullish),
    afterCreate: mutationTriggerConfigurations.flatMap((c) => c.afterCreate).filter(nonNullish),
    beforeUpdate: mutationTriggerConfigurations.flatMap((c) => c.beforeUpdate).filter(nonNullish),
    afterUpdate: mutationTriggerConfigurations.flatMap((c) => c.afterUpdate).filter(nonNullish),
    beforeDelete: mutationTriggerConfigurations.flatMap((c) => c.beforeDelete).filter(nonNullish),
    afterDelete: mutationTriggerConfigurations.flatMap((c) => c.afterDelete).filter(nonNullish),
    beforeAll: mutationTriggerConfigurations.flatMap((c) => c.beforeAll).filter(nonNullish),
    afterAll: mutationTriggerConfigurations.flatMap((c) => c.afterAll).filter(nonNullish),
    afterCommit: mutationTriggerConfigurations.flatMap((c) => c.afterCommit).filter(nonNullish),
  };

  /** Remove any trigger that is an empty array */
  for (const key of Object.keys(merged) as (keyof typeof merged)[]) {
    if (merged[key].length === 0) {
      delete merged[key];
    }
  }

  return merged;
}
