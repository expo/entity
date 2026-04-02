import type {
  EntityPrivacyPolicy,
  EntityQueryContext,
  IEntityClass,
  ReadonlyEntity,
  ViewerContext,
} from '@expo/entity';
import { Entity } from '@expo/entity';

import type { AuthorizationResultBasedBaseKnexMutator } from './AuthorizationResultBasedBaseKnexMutator.ts';
import type { AuthorizationResultBasedKnexEntityLoader } from './AuthorizationResultBasedKnexEntityLoader.ts';
import type { EnforcingBaseKnexMutator } from './EnforcingBaseKnexMutator.ts';
import type { EnforcingKnexEntityLoader } from './EnforcingKnexEntityLoader.ts';
import {
  knexLoader as knexLoaderFn,
  knexLoaderWithAuthorizationResults as knexLoaderWithAuthorizationResultsFn,
} from './knexLoader.ts';
import {
  knexMutator as knexMutatorFn,
  knexMutatorWithAuthorizationResults as knexMutatorWithAuthorizationResultsFn,
} from './knexMutator.ts';

/**
 * Abstract base class for mutable entities backed by Postgres.
 * Provides `knexLoader` and `knexLoaderWithAuthorizationResults` as inherited static methods,
 * in addition to the mutation methods inherited from `Entity`.
 */
export abstract class PostgresEntity<
  TFields extends Record<string, any>,
  TIDField extends keyof NonNullable<Pick<TFields, TSelectedFields>>,
  TViewerContext extends ViewerContext,
  TSelectedFields extends keyof TFields = keyof TFields,
> extends Entity<TFields, TIDField, TViewerContext, TSelectedFields> {
  /**
   * Vend knex loader for loading entities via knex-specific methods in a given query context.
   *
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
    return knexLoaderFn(this, viewerContext, queryContext);
  }

  /**
   * Vend knex loader for loading entities via knex-specific methods in a given query context.
   * Returns authorization results instead of throwing on authorization errors.
   *
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
    return knexLoaderWithAuthorizationResultsFn(this, viewerContext, queryContext);
  }

  /**
   * Vend knex mutator for mutating entities via knex-specific methods in a given query context.
   *
   * @param viewerContext - viewer context of mutating user
   * @param queryContext - query context in which to perform the mutation
   */
  static knexMutator<
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
  ): EnforcingBaseKnexMutator<
    TMFields,
    TMIDField,
    TMViewerContext,
    TMEntity,
    TMPrivacyPolicy,
    TMSelectedFields
  > {
    return knexMutatorFn(this, viewerContext, queryContext);
  }

  /**
   * Vend knex mutator for mutating entities via knex-specific methods in a given query context.
   * Returns authorization results instead of throwing on authorization errors.
   *
   * @param viewerContext - viewer context of mutating user
   * @param queryContext - query context in which to perform the mutation
   */
  static knexMutatorWithAuthorizationResults<
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
  ): AuthorizationResultBasedBaseKnexMutator<
    TMFields,
    TMIDField,
    TMViewerContext,
    TMEntity,
    TMPrivacyPolicy,
    TMSelectedFields
  > {
    return knexMutatorWithAuthorizationResultsFn(this, viewerContext, queryContext);
  }
}
