import { enforceAsyncResult } from '@expo/results';

import { AuthorizationResultBasedBatchDeleteMutator } from './AuthorizationResultBasedEntityMutator';
import { EntityPrivacyPolicy } from './EntityPrivacyPolicy';
import { ReadonlyEntity } from './ReadonlyEntity';
import { ViewerContext } from './ViewerContext';

/**
 * Enforcing entity batch deleter. All deletes
 * through this deleter will throw if authorization is not successful.
 */
export class EnforcingEntityBatchDeleter<
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
    private readonly batchDeleter: AuthorizationResultBasedBatchDeleteMutator<
      TFields,
      TIDField,
      TViewerContext,
      TEntity,
      TPrivacyPolicy,
      TSelectedFields
    >,
  ) {}

  /**
   * Delete all entities after authorizing each against delete privacy rules.
   * @returns void, throws upon delete failure
   */
  async deleteAsync(): Promise<void> {
    await enforceAsyncResult(this.batchDeleter.deleteAsync());
  }
}
