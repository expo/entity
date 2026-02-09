import { EntityCompanion, EntityPrivacyPolicy, ReadonlyEntity, ViewerContext } from '@expo/entity';

import { KnexEntityLoaderFactory } from '../KnexEntityLoaderFactory';

const KNEX_LOADER_FACTORY = Symbol('knexLoaderFactory');

declare module '@expo/entity' {
  interface EntityCompanion<
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
    [KNEX_LOADER_FACTORY]:
      | KnexEntityLoaderFactory<
          TFields,
          TIDField,
          TViewerContext,
          TEntity,
          TPrivacyPolicy,
          TSelectedFields
        >
      | undefined;

    getKnexLoaderFactory(): KnexEntityLoaderFactory<
      TFields,
      TIDField,
      TViewerContext,
      TEntity,
      TPrivacyPolicy,
      TSelectedFields
    >;
  }
}

export function installEntityCompanionExtensions(): void {
  EntityCompanion.prototype.getKnexLoaderFactory = function <
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
    this: EntityCompanion<
      TFields,
      TIDField,
      TViewerContext,
      TEntity,
      TPrivacyPolicy,
      TSelectedFields
    >,
  ): KnexEntityLoaderFactory<
    TFields,
    TIDField,
    TViewerContext,
    TEntity,
    TPrivacyPolicy,
    TSelectedFields
  > {
    return (this[KNEX_LOADER_FACTORY] ??= new KnexEntityLoaderFactory(
      this,
      this.tableDataCoordinator.getKnexDataManager(),
      this.metricsAdapter,
    ));
  };
}
