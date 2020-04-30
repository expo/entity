import { IEntityClass } from './Entity';
import EntityCompanionProvider, { EntityCompanionDefinition } from './EntityCompanionProvider';
import EntityPrivacyPolicy from './EntityPrivacyPolicy';
import ReadonlyEntity from './ReadonlyEntity';
import ViewerContext from './ViewerContext';
import ViewerScopedEntityCompanion from './ViewerScopedEntityCompanion';

/**
 * Provides viewer-scoped entity companions providers for a simpler API.
 */
export default class ViewerScopedEntityCompanionProvider {
  constructor(
    private readonly entityCompanionProvider: EntityCompanionProvider,
    private readonly viewerContext: ViewerContext
  ) {}

  /**
   * Vend a new viewer-scoped entity companion. If not already computed and cached, the entity
   * companion is constructed using the configuration provided by the factory.
   *
   * @param entityClass entity class to load
   * @param factory entity companion factory
   */
  getViewerScopedCompanionForEntity<
    TFields,
    TID,
    TViewerContext extends ViewerContext,
    TEntity extends ReadonlyEntity<TFields, TID, TViewerContext>,
    TPrivacyPolicy extends EntityPrivacyPolicy<TFields, TID, TViewerContext, TEntity>
  >(
    entityClass: IEntityClass<TFields, TID, TViewerContext, TEntity, TPrivacyPolicy>,
    entityCompanionDefinition: EntityCompanionDefinition<
      TFields,
      TID,
      TViewerContext,
      TEntity,
      TPrivacyPolicy
    >
  ): ViewerScopedEntityCompanion<TFields, TID, TViewerContext, TEntity, TPrivacyPolicy> {
    return new ViewerScopedEntityCompanion(
      this.entityCompanionProvider.getCompanionForEntity(entityClass, entityCompanionDefinition),
      this.viewerContext as TViewerContext
    );
  }
}
