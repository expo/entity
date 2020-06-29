import { IEntityClass } from './Entity';
import EntityCompanionProvider from './EntityCompanionProvider';
import EntityPrivacyPolicy from './EntityPrivacyPolicy';
import ReadonlyEntity from './ReadonlyEntity';
import ViewerScopedEntityCompanion from './ViewerScopedEntityCompanion';
import ViewerScopedEntityCompanionProvider from './ViewerScopedEntityCompanionProvider';

/**
 * A viewer context encapsulates all information necessary to evaluate an {@link EntityPrivacyPolicy}.
 *
 * In combination with an {@link EntityCompanionProvider}, a viewer context is the
 * entry point into the Entity framework.
 */
export default class ViewerContext {
  private readonly viewerScopedEntityCompanionProvider: ViewerScopedEntityCompanionProvider;

  constructor(public readonly entityCompanionProvider: EntityCompanionProvider) {
    this.viewerScopedEntityCompanionProvider = new ViewerScopedEntityCompanionProvider(
      entityCompanionProvider,
      this
    );
  }

  get [Symbol.toStringTag](): string {
    return this.constructor.name;
  }

  getViewerScopedEntityCompanionForClass<
    TMFields,
    TMID,
    TMViewerContext extends ViewerContext,
    TMEntity extends ReadonlyEntity<TMFields, TMID, TMViewerContext, TMDatabaseFields>,
    TMPrivacyPolicy extends EntityPrivacyPolicy<
      TMFields,
      TMID,
      TMViewerContext,
      TMEntity,
      TMDatabaseFields
    >,
    TMDatabaseFields extends TMFields = TMFields
  >(
    entityClass: IEntityClass<
      TMFields,
      TMID,
      TMViewerContext,
      TMEntity,
      TMPrivacyPolicy,
      TMDatabaseFields
    >
  ): ViewerScopedEntityCompanion<
    TMFields,
    TMID,
    TMViewerContext,
    TMEntity,
    TMPrivacyPolicy,
    TMDatabaseFields
  > {
    return this.viewerScopedEntityCompanionProvider.getViewerScopedCompanionForEntity(
      entityClass,
      entityClass.getCompanionDefinition()
    );
  }
}
