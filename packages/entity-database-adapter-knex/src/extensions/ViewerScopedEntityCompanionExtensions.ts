import {
  EntityPrivacyPolicy,
  ReadonlyEntity,
  ViewerContext,
  ViewerScopedEntityCompanion,
} from '@expo/entity';

import { ViewerScopedKnexEntityLoaderFactory } from '../ViewerScopedKnexEntityLoaderFactory';

declare module '@expo/entity' {
  interface ViewerScopedEntityCompanion<
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
    getKnexLoaderFactory(): ViewerScopedKnexEntityLoaderFactory<
      TFields,
      TIDField,
      TViewerContext,
      TEntity,
      TPrivacyPolicy,
      TSelectedFields
    >;
  }
}

export function installViewerScopedEntityCompanionExtensions({
  ViewerScopedEntityCompanionClass,
}: {
  ViewerScopedEntityCompanionClass: typeof ViewerScopedEntityCompanion;
}): void {
  ViewerScopedEntityCompanionClass.prototype.getKnexLoaderFactory = function <
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
    this: ViewerScopedEntityCompanion<
      TFields,
      TIDField,
      TViewerContext,
      TEntity,
      TPrivacyPolicy,
      TSelectedFields
    >,
  ): ViewerScopedKnexEntityLoaderFactory<
    TFields,
    TIDField,
    TViewerContext,
    TEntity,
    TPrivacyPolicy,
    TSelectedFields
  > {
    return new ViewerScopedKnexEntityLoaderFactory(
      this.entityCompanion.getKnexLoaderFactory(),
      this.viewerContext,
    );
  };
}
