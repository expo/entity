import EntityCompanion from './EntityCompanion';
import EntityPrivacyPolicy from './EntityPrivacyPolicy';
import IEntityQueryContextProvider from './IEntityQueryContextProvider';
import ReadonlyEntity from './ReadonlyEntity';
import ViewerContext from './ViewerContext';
import ViewerScopedEntityLoaderFactory from './ViewerScopedEntityLoaderFactory';
import ViewerScopedEntityMutatorFactory from './ViewerScopedEntityMutatorFactory';

/**
 * Provides a simpler API for loading and mutating entities by injecting the {@link ViewerContext}
 * from the viewer-scoped entity companion provider.
 */
export default class ViewerScopedEntityCompanion<
  TFields,
  TID,
  TViewerContext extends ViewerContext,
  TEntity extends ReadonlyEntity<TFields, TID, TViewerContext, TDatabaseFields>,
  TPrivacyPolicy extends EntityPrivacyPolicy<
    TFields,
    TID,
    TViewerContext,
    TEntity,
    TDatabaseFields
  >,
  TDatabaseFields extends TFields = TFields
> {
  constructor(
    private readonly entityCompanion: EntityCompanion<
      TFields,
      TID,
      TViewerContext,
      TEntity,
      TPrivacyPolicy,
      TDatabaseFields
    >,
    private readonly viewerContext: TViewerContext
  ) {}

  /**
   * Vend a viewer-scoped entity loader.
   */
  getLoaderFactory(): ViewerScopedEntityLoaderFactory<
    TFields,
    TID,
    TViewerContext,
    TEntity,
    TPrivacyPolicy,
    TDatabaseFields
  > {
    return new ViewerScopedEntityLoaderFactory(
      this.entityCompanion.getLoaderFactory(),
      this.viewerContext
    );
  }

  /**
   * Vend a viewer-scoped entity mutator factory.
   */
  getMutatorFactory(): ViewerScopedEntityMutatorFactory<
    TFields,
    TID,
    TViewerContext,
    TEntity,
    TPrivacyPolicy,
    TDatabaseFields
  > {
    return new ViewerScopedEntityMutatorFactory(
      this.entityCompanion.getMutatorFactory(),
      this.viewerContext
    );
  }

  /**
   * Get the query context provider for this entity.
   */
  getQueryContextProvider(): IEntityQueryContextProvider {
    return this.entityCompanion.getQueryContextProvider();
  }
}
