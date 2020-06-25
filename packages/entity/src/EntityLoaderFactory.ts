import { IEntityClass } from './Entity';
import EntityLoader from './EntityLoader';
import EntityPrivacyPolicy from './EntityPrivacyPolicy';
import { EntityQueryContext } from './EntityQueryContext';
import ReadonlyEntity from './ReadonlyEntity';
import ViewerContext from './ViewerContext';
import EntityDataManager from './internal/EntityDataManager';

/**
 * The primary entry point for loading entities.
 */
export default class EntityLoaderFactory<
  TFields,
  TID,
  TViewerContext extends ViewerContext,
  TEntity extends ReadonlyEntity<TFields, TID, TViewerContext, TSelectedFields>,
  TPrivacyPolicy extends EntityPrivacyPolicy<
    TFields,
    TID,
    TViewerContext,
    TEntity,
    TSelectedFields
  >,
  TSelectedFields extends keyof TFields = keyof TFields
> {
  constructor(
    private readonly idField: keyof TFields,
    private readonly entityClass: IEntityClass<
      TFields,
      TID,
      TViewerContext,
      TEntity,
      TPrivacyPolicy,
      TSelectedFields
    >,
    private readonly privacyPolicyClass: TPrivacyPolicy,
    private readonly dataManager: EntityDataManager<TFields>
  ) {}

  /**
   * Vend loader for loading an entity in a given query context.
   * @param viewerContext - viewer context of loading user
   * @param queryContext - query context in which to perform the load
   */
  forLoad(
    viewerContext: TViewerContext,
    queryContext: EntityQueryContext
  ): EntityLoader<TFields, TID, TViewerContext, TEntity, TPrivacyPolicy, TSelectedFields> {
    return new EntityLoader(
      viewerContext,
      queryContext,
      this.idField,
      this.entityClass,
      this.privacyPolicyClass,
      this.dataManager
    );
  }
}
