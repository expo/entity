import { enforceAsyncResult } from '@expo/results';

import { AuthorizationResultBasedBatchUpdateMutator } from './AuthorizationResultBasedEntityMutator';
import { EntityPrivacyPolicy } from './EntityPrivacyPolicy';
import { ReadonlyEntity } from './ReadonlyEntity';
import { ViewerContext } from './ViewerContext';

/**
 * Enforcing entity batch updater. All updates
 * through this updater will throw if authorization is not successful.
 */
export class EnforcingEntityBatchUpdater<
  TFields extends Record<string, any>,
  TIDField extends keyof NonNullable<Pick<TFields, TSelectedFields>>,
  TViewerContext extends ViewerContext,
  TEntity extends ReadonlyEntity<TFields, TIDField, TViewerContext, TSelectedFields>,
  TPrivacyPolicy extends EntityPrivacyPolicy<
    TFields,
    TIDField,
    TViewerContext,
    TEntity,
    TSelectedFields
  >,
  TSelectedFields extends keyof TFields,
> {
  constructor(
    private readonly batchUpdater: AuthorizationResultBasedBatchUpdateMutator<
      TFields,
      TIDField,
      TViewerContext,
      TEntity,
      TPrivacyPolicy,
      TSelectedFields
    >,
  ) {}

  /**
   * Set the value for entity field. Same value is applied to all entities in the batch.
   * @param fieldName - entity field being updated
   * @param value - value for entity field
   */
  setField<K extends keyof Pick<TFields, TSelectedFields>>(fieldName: K, value: TFields[K]): this {
    this.batchUpdater.setField(fieldName, value);
    return this;
  }

  /**
   * Commit the changes to all entities after authorizing each against update privacy rules.
   * @returns authorized updated entities, throws upon update failure
   */
  async updateAsync(): Promise<readonly TEntity[]> {
    return await enforceAsyncResult(this.batchUpdater.updateAsync());
  }
}
