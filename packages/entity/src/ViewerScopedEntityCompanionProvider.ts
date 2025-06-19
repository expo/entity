import { IEntityClass } from './Entity';
import { EntityCompanionProvider } from './EntityCompanionProvider';
import { EntityPrivacyPolicy } from './EntityPrivacyPolicy';
import { ReadonlyEntity } from './ReadonlyEntity';
import { ViewerContext } from './ViewerContext';
import { ViewerScopedEntityCompanion } from './ViewerScopedEntityCompanion';

/**
 * Provides viewer-scoped entity companions providers for a simpler API.
 */
export class ViewerScopedEntityCompanionProvider {
  constructor(
    private readonly entityCompanionProvider: EntityCompanionProvider,
    private readonly viewerContext: ViewerContext,
  ) {}

  /**
   * Vend a new viewer-scoped entity companion. If not already computed and cached, the entity
   * companion is constructed using the configuration provided by the factory.
   *
   * @param entityClass - entity class to load
   */
  getViewerScopedCompanionForEntity<
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
  >(
    entityClass: IEntityClass<
      TFields,
      TIDField,
      TViewerContext,
      TEntity,
      TPrivacyPolicy,
      TSelectedFields
    >,
  ): ViewerScopedEntityCompanion<
    TFields,
    TIDField,
    TViewerContext,
    TEntity,
    TPrivacyPolicy,
    TSelectedFields
  > {
    return new ViewerScopedEntityCompanion(
      this.entityCompanionProvider.getCompanionForEntity(entityClass),
      this.viewerContext as TViewerContext,
    );
  }
}
