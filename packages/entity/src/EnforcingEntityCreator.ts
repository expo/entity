import { enforceAsyncResult } from '@expo/results';

import { AuthorizationResultBasedCreateMutator } from './AuthorizationResultBasedEntityMutator';
import EntityPrivacyPolicy from './EntityPrivacyPolicy';
import ReadonlyEntity from './ReadonlyEntity';
import ViewerContext from './ViewerContext';

/**
 * Enforcing entity creator. All updates
 * through this creator will throw if authorization is not successful.
 */
export default class EnforcingEntityCreator<
  TFields extends Record<string, any>,
  TID extends NonNullable<TFields[TSelectedFields]>,
  TViewerContext extends ViewerContext,
  TEntity extends ReadonlyEntity<TFields, TID, TViewerContext, TSelectedFields>,
  TPrivacyPolicy extends EntityPrivacyPolicy<
    TFields,
    TID,
    TViewerContext,
    TEntity,
    TSelectedFields
  >,
  TSelectedFields extends keyof TFields,
> {
  constructor(
    private readonly entityCreator: AuthorizationResultBasedCreateMutator<
      TFields,
      TID,
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
    this.entityCreator.setField(fieldName, value);
    return this;
  }

  /**
   * Commit the new entity after authorizing against creation privacy rules. Invalidates all caches for
   * queries that would return new entity.
   * @returns authorized, cached, newly-created entity, throwing if unsuccessful
   */
  async createAsync(): Promise<TEntity> {
    return await enforceAsyncResult(this.entityCreator.createAsync());
  }
}
