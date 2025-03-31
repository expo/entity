import { enforceAsyncResult } from '@expo/results';

import { AuthorizationResultBasedUpdateMutator } from './AuthorizationResultBasedEntityMutator';
import EntityPrivacyPolicy from './EntityPrivacyPolicy';
import ReadonlyEntity from './ReadonlyEntity';
import ViewerContext from './ViewerContext';

/**
 * Enforcing entity updater. All updates
 * through this updater will throw if authorization is not successful.
 */
export default class EnforcingEntityUpdater<
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
}
