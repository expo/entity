import EntityCompanion from './EntityCompanion';
import EntityPrivacyPolicy from './EntityPrivacyPolicy';
import EntityQueryContextProvider from './EntityQueryContextProvider';
import ReadonlyEntity from './ReadonlyEntity';
import ViewerContext from './ViewerContext';
import ViewerScopedEntityLoaderFactory from './ViewerScopedEntityLoaderFactory';
import ViewerScopedEntityMutatorFactory from './ViewerScopedEntityMutatorFactory';
import IEntityMetricsAdapter from './metrics/IEntityMetricsAdapter';

/**
 * Provides a simpler API for loading and mutating entities by injecting the ViewerContext
 * from the viewer-scoped entity companion provider.
 */
export default class ViewerScopedEntityCompanion<
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
    public readonly entityCompanion: EntityCompanion<
      TFields,
      TIDField,
      TViewerContext,
      TEntity,
      TPrivacyPolicy,
      TSelectedFields
    >,
    private readonly viewerContext: TViewerContext,
  ) {}

  /**
   * Vend a viewer-scoped entity loader.
   */
  getLoaderFactory(): ViewerScopedEntityLoaderFactory<
    TFields,
    TIDField,
    TViewerContext,
    TEntity,
    TPrivacyPolicy,
    TSelectedFields
  > {
    return new ViewerScopedEntityLoaderFactory(
      this.entityCompanion.getLoaderFactory(),
      this.viewerContext,
    );
  }

  /**
   * Vend a viewer-scoped entity mutator factory.
   */
  getMutatorFactory(): ViewerScopedEntityMutatorFactory<
    TFields,
    TIDField,
    TViewerContext,
    TEntity,
    TPrivacyPolicy,
    TSelectedFields
  > {
    return new ViewerScopedEntityMutatorFactory(
      this.entityCompanion.getMutatorFactory(),
      this.viewerContext,
    );
  }

  /**
   * Get the query context provider for this entity.
   */
  getQueryContextProvider(): EntityQueryContextProvider {
    return this.entityCompanion.getQueryContextProvider();
  }

  /**
   * Get the IEntityMetricsAdapter for this companion.
   */
  getMetricsAdapter(): IEntityMetricsAdapter {
    return this.entityCompanion.getMetricsAdapter();
  }
}
