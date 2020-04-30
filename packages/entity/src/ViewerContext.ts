import { IEntityClass } from './Entity';
import EntityCompanionProvider from './EntityCompanionProvider';
import EntityPrivacyPolicy from './EntityPrivacyPolicy';
import ReadonlyEntity from './ReadonlyEntity';
import ViewerScopedEntityCompanion from './ViewerScopedEntityCompanion';
import ViewerScopedEntityCompanionProvider from './ViewerScopedEntityCompanionProvider';

/**
 * A viewer context encapsulates all information necessary to evaluate an {@link EntityPrivacyPolicy}.
 */
export default abstract class ViewerContext {
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
    TMEntity extends ReadonlyEntity<TMFields, TMID, TMViewerContext>,
    TMPrivacyPolicy extends EntityPrivacyPolicy<TMFields, TMID, TMViewerContext, TMEntity>
  >(
    entityClass: IEntityClass<TMFields, TMID, TMViewerContext, TMEntity, TMPrivacyPolicy>
  ): ViewerScopedEntityCompanion<TMFields, TMID, TMViewerContext, TMEntity, TMPrivacyPolicy> {
    return this.viewerScopedEntityCompanionProvider.getViewerScopedCompanionForEntity(
      entityClass,
      entityClass.getCompanionDefinition()
    );
  }
}
