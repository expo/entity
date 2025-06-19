import { AuthorizationResultBasedEntityLoader } from './AuthorizationResultBasedEntityLoader';
import { EnforcingEntityLoader } from './EnforcingEntityLoader';
import { IEntityClass } from './Entity';
import { EntityLoaderUtils } from './EntityLoaderUtils';
import { EntityPrivacyPolicy } from './EntityPrivacyPolicy';
import { EntityQueryContext } from './EntityQueryContext';
import { ReadonlyEntity } from './ReadonlyEntity';
import { ViewerContext } from './ViewerContext';

/**
 * The primary interface for loading entities. All normal loads are batched,
 * cached, and authorized against the entity's EntityPrivacyPolicy.
 */
export class EntityLoader<
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
   * Enforcing entity loader. All loads through this loader are
   * guaranteed to be the values of successful results (or null for some loader methods),
   * and will throw otherwise.
   */
  enforcing(): EnforcingEntityLoader<
    TFields,
    TIDField,
    TViewerContext,
    TEntity,
    TPrivacyPolicy,
    TSelectedFields
  > {
    return new EnforcingEntityLoader(this.withAuthorizationResults());
  }

  /**
   * Authorization-result-based entity loader. All loads through this
   * loader are results (or null for some loader methods), where an unsuccessful result
   * means an authorization error or entity construction error occurred. Other errors are thrown.
   */
  withAuthorizationResults(): AuthorizationResultBasedEntityLoader<
    TFields,
    TIDField,
    TViewerContext,
    TEntity,
    TPrivacyPolicy,
    TSelectedFields
  > {
    return this.viewerContext
      .getViewerScopedEntityCompanionForClass(this.entityClass)
      .getLoaderFactory()
      .forLoad(this.queryContext, { previousValue: null, cascadingDeleteCause: null });
  }

  /**
   * Entity loader utilities for things like cache invalidation, entity construction, and authorization.
   * Calling into these should only be necessary in rare cases.
   */
  public utils(): EntityLoaderUtils<
    TFields,
    TIDField,
    TViewerContext,
    TEntity,
    TPrivacyPolicy,
    TSelectedFields
  > {
    return this.withAuthorizationResults().utils;
  }
}
