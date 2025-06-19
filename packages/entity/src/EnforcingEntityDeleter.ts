import { enforceAsyncResult } from '@expo/results';

import { AuthorizationResultBasedDeleteMutator } from './AuthorizationResultBasedEntityMutator';
import { EntityPrivacyPolicy } from './EntityPrivacyPolicy';
import { ReadonlyEntity } from './ReadonlyEntity';
import { ViewerContext } from './ViewerContext';

/**
 * Enforcing entity deleter. All deletes
 * through this deleter will throw if authorization is not successful.
 */
export class EnforcingEntityDeleter<
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
    private readonly entityDeleter: AuthorizationResultBasedDeleteMutator<
      TFields,
      TIDField,
      TViewerContext,
      TEntity,
      TPrivacyPolicy,
      TSelectedFields
    >,
  ) {}

  /**
   * Delete the entity after authorizing against delete privacy rules. The entity is invalidated in all caches.
   * Throws when delete is not successful.
   */
  async deleteAsync(): Promise<void> {
    await enforceAsyncResult(this.entityDeleter.deleteAsync());
  }
}
