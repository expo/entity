import { enforceAsyncResult } from '@expo/results';

import type { AuthorizationResultBasedUpdateMutator } from './AuthorizationResultBasedEntityMutator.ts';
import type { EntityPrivacyPolicy } from './EntityPrivacyPolicy.ts';
import type { ReadonlyEntity } from './ReadonlyEntity.ts';
import type { ViewerContext } from './ViewerContext.ts';

/**
 * Enforcing entity updater. All updates
 * through this updater will throw if authorization is not successful.
 */
export class EnforcingEntityUpdater<
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
    private readonly entityUpdater: AuthorizationResultBasedUpdateMutator<
      TFields,
      TIDField,
      TViewerContext,
      TEntity,
      TPrivacyPolicy,
      TSelectedFields
    >,
  ) {}

  /**
   * Set the value for entity field.
   * @param fieldName - entity field being updated
   * @param value - value for entity field
   */
  setField<K extends keyof Pick<TFields, TSelectedFields>>(fieldName: K, value: TFields[K]): this {
    this.entityUpdater.setField(fieldName, value);
    return this;
  }

  /**
   * Commit the changes to the entity after authorizing against update privacy rules.
   * Invalidates all caches for pre-update entity.
   * @returns authorized updated entity, throws upon update failure
   */
  async updateAsync(): Promise<TEntity> {
    return await enforceAsyncResult(this.entityUpdater.updateAsync());
  }

  /**
   * Commit the changes to the entity after authorizing against update privacy rules.
   * Unlike {@link updateAsync}, this method does not reload the entity from the database
   * after the update. This is useful for fire-and-forget writes where the caller
   * discards the result.
   *
   * Authorization, validators, before-triggers, and cache invalidation still run.
   *
   * @throws if the entity has `afterUpdate`, `afterAll`, or `afterCommit` triggers,
   * since those triggers would be silently skipped without a reload
   * @throws upon authorization failure
   */
  async updateWithoutReloadingAsync(): Promise<void> {
    await enforceAsyncResult(this.entityUpdater.updateWithoutReloadingAsync());
  }
}
