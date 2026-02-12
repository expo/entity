import {
  IEntityClass,
  EntityPrivacyPolicy,
  EntityQueryContext,
  ReadonlyEntity,
  ViewerContext,
} from '@expo/entity';

import { AuthorizationResultBasedKnexEntityLoader } from './AuthorizationResultBasedKnexEntityLoader';
import { EnforcingKnexEntityLoader } from './EnforcingKnexEntityLoader';

/**
 * The primary interface for loading entities via non-data-loader-based methods
 * (knex queries). These methods are not batched or cached through dataloader.
 */
export class KnexEntityLoader<
  TFields extends Record<string, any>,
  TIDField extends keyof NonNullable<Pick<TFields, TSelectedFields>>,
  TViewerContext extends ViewerContext,
  TViewerContext2 extends TViewerContext,
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
    private readonly viewerContext: TViewerContext2,
    private readonly queryContext: EntityQueryContext,
    private readonly entityClass: IEntityClass<
      TFields,
      TIDField,
      TViewerContext,
      TEntity,
      TPrivacyPolicy,
      TSelectedFields
    >,
  ) {}

  /**
   * Enforcing knex entity loader. All loads through this loader are
   * guaranteed to be the values of successful results (or null for some loader methods),
   * and will throw otherwise.
   */
  enforcing(): EnforcingKnexEntityLoader<
    TFields,
    TIDField,
    TViewerContext,
    TEntity,
    TPrivacyPolicy,
    TSelectedFields
  > {
    return this.viewerContext
      .getViewerScopedEntityCompanionForClass(this.entityClass)
      .getKnexLoaderFactory()
      .forLoadEnforcing(this.queryContext, { previousValue: null, cascadingDeleteCause: null });
  }

  /**
   * Authorization-result-based knex entity loader. All loads through this
   * loader are results (or null for some loader methods), where an unsuccessful result
   * means an authorization error or entity construction error occurred. Other errors are thrown.
   */
  withAuthorizationResults(): AuthorizationResultBasedKnexEntityLoader<
    TFields,
    TIDField,
    TViewerContext,
    TEntity,
    TPrivacyPolicy,
    TSelectedFields
  > {
    return this.viewerContext
      .getViewerScopedEntityCompanionForClass(this.entityClass)
      .getKnexLoaderFactory()
      .forLoad(this.queryContext, { previousValue: null, cascadingDeleteCause: null });
  }
}
