import {
  EntityPrivacyPolicy,
  EntityQueryContext,
  IEntityClass,
  ReadonlyEntity,
  ViewerContext,
} from '@expo/entity';

import { AuthorizationResultBasedKnexEntityLoader } from '../AuthorizationResultBasedKnexEntityLoader';
import { EnforcingKnexEntityLoader } from '../EnforcingKnexEntityLoader';
import { KnexEntityLoader } from '../KnexEntityLoader';

declare module '@expo/entity' {
  namespace ReadonlyEntity {
    export function knexLoader<
      TMFields extends object,
      TMIDField extends keyof NonNullable<Pick<TMFields, TMSelectedFields>>,
      TMViewerContext extends ViewerContext,
      TMViewerContext2 extends TMViewerContext,
      TMEntity extends ReadonlyEntity<TMFields, TMIDField, TMViewerContext, TMSelectedFields>,
      TMPrivacyPolicy extends EntityPrivacyPolicy<
        TMFields,
        TMIDField,
        TMViewerContext,
        TMEntity,
        TMSelectedFields
      >,
      TMSelectedFields extends keyof TMFields = keyof TMFields,
    >(
      this: IEntityClass<
        TMFields,
        TMIDField,
        TMViewerContext,
        TMEntity,
        TMPrivacyPolicy,
        TMSelectedFields
      >,
      viewerContext: TMViewerContext2,
      queryContext?: EntityQueryContext,
    ): EnforcingKnexEntityLoader<
      TMFields,
      TMIDField,
      TMViewerContext,
      TMEntity,
      TMPrivacyPolicy,
      TMSelectedFields
    >;

    export function knexLoaderWithAuthorizationResults<
      TMFields extends object,
      TMIDField extends keyof NonNullable<Pick<TMFields, TMSelectedFields>>,
      TMViewerContext extends ViewerContext,
      TMViewerContext2 extends TMViewerContext,
      TMEntity extends ReadonlyEntity<TMFields, TMIDField, TMViewerContext, TMSelectedFields>,
      TMPrivacyPolicy extends EntityPrivacyPolicy<
        TMFields,
        TMIDField,
        TMViewerContext,
        TMEntity,
        TMSelectedFields
      >,
      TMSelectedFields extends keyof TMFields = keyof TMFields,
    >(
      this: IEntityClass<
        TMFields,
        TMIDField,
        TMViewerContext,
        TMEntity,
        TMPrivacyPolicy,
        TMSelectedFields
      >,
      viewerContext: TMViewerContext2,
      queryContext?: EntityQueryContext,
    ): AuthorizationResultBasedKnexEntityLoader<
      TMFields,
      TMIDField,
      TMViewerContext,
      TMEntity,
      TMPrivacyPolicy,
      TMSelectedFields
    >;
  }
}

class ReadonlyEntityExtensions {
  /**
   * Vend knex loader for loading entities via non-data-loader methods in a given query context.
   * @param viewerContext - viewer context of loading user
   * @param queryContext - query context in which to perform the load
   */
  static knexLoader<
    TMFields extends object,
    TMIDField extends keyof NonNullable<Pick<TMFields, TMSelectedFields>>,
    TMViewerContext extends ViewerContext,
    TMViewerContext2 extends TMViewerContext,
    TMEntity extends ReadonlyEntity<TMFields, TMIDField, TMViewerContext, TMSelectedFields>,
    TMPrivacyPolicy extends EntityPrivacyPolicy<
      TMFields,
      TMIDField,
      TMViewerContext,
      TMEntity,
      TMSelectedFields
    >,
    TMSelectedFields extends keyof TMFields = keyof TMFields,
  >(
    this: IEntityClass<
      TMFields,
      TMIDField,
      TMViewerContext,
      TMEntity,
      TMPrivacyPolicy,
      TMSelectedFields
    >,
    viewerContext: TMViewerContext2,
    queryContext: EntityQueryContext = viewerContext
      .getViewerScopedEntityCompanionForClass(this)
      .getQueryContextProvider()
      .getQueryContext(),
  ): EnforcingKnexEntityLoader<
    TMFields,
    TMIDField,
    TMViewerContext,
    TMEntity,
    TMPrivacyPolicy,
    TMSelectedFields
  > {
    return new KnexEntityLoader(viewerContext, queryContext, this).enforcing();
  }

  /**
   * Vend knex loader for loading entities via non-data-loader methods in a given query context.
   * @param viewerContext - viewer context of loading user
   * @param queryContext - query context in which to perform the load
   */
  static knexLoaderWithAuthorizationResults<
    TMFields extends object,
    TMIDField extends keyof NonNullable<Pick<TMFields, TMSelectedFields>>,
    TMViewerContext extends ViewerContext,
    TMViewerContext2 extends TMViewerContext,
    TMEntity extends ReadonlyEntity<TMFields, TMIDField, TMViewerContext, TMSelectedFields>,
    TMPrivacyPolicy extends EntityPrivacyPolicy<
      TMFields,
      TMIDField,
      TMViewerContext,
      TMEntity,
      TMSelectedFields
    >,
    TMSelectedFields extends keyof TMFields = keyof TMFields,
  >(
    this: IEntityClass<
      TMFields,
      TMIDField,
      TMViewerContext,
      TMEntity,
      TMPrivacyPolicy,
      TMSelectedFields
    >,
    viewerContext: TMViewerContext2,
    queryContext: EntityQueryContext = viewerContext
      .getViewerScopedEntityCompanionForClass(this)
      .getQueryContextProvider()
      .getQueryContext(),
  ): AuthorizationResultBasedKnexEntityLoader<
    TMFields,
    TMIDField,
    TMViewerContext,
    TMEntity,
    TMPrivacyPolicy,
    TMSelectedFields
  > {
    return new KnexEntityLoader(viewerContext, queryContext, this).withAuthorizationResults();
  }
}

export function installReadonlyEntityExtensions(): void {
  ReadonlyEntity.knexLoader = ReadonlyEntityExtensions.knexLoader;
  ReadonlyEntity.knexLoaderWithAuthorizationResults =
    ReadonlyEntityExtensions.knexLoaderWithAuthorizationResults;
}
