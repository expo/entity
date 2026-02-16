import { enforceAsyncResult } from '@expo/results';

import { AuthorizationResultBasedBatchCreateMutator } from './AuthorizationResultBasedEntityMutator';
import { EntityPrivacyPolicy } from './EntityPrivacyPolicy';
import { ReadonlyEntity } from './ReadonlyEntity';
import { ViewerContext } from './ViewerContext';

/**
 * Enforcing entity batch creator. All creates
 * through this creator will throw if authorization is not successful.
 */
export class EnforcingEntityBatchCreator<
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
    private readonly batchCreator: AuthorizationResultBasedBatchCreateMutator<
      TFields,
      TIDField,
      TViewerContext,
      TEntity,
      TPrivacyPolicy,
      TSelectedFields
    >,
  ) {}

  /**
   * Commit the batch of new entities after authorizing each against creation privacy rules.
   * @returns authorized, cached, newly-created entities, throwing if unsuccessful
   */
  async createAsync(): Promise<readonly TEntity[]> {
    return await enforceAsyncResult(this.batchCreator.createAsync());
  }
}
