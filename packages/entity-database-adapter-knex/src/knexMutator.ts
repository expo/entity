import type {
  EntityPrivacyPolicy,
  EntityQueryContext,
  IEntityClass,
  ReadonlyEntity,
  ViewerContext,
} from '@expo/entity';

import type { AuthorizationResultBasedBaseKnexMutator } from './AuthorizationResultBasedBaseKnexMutator.ts';
import type { EnforcingBaseKnexMutator } from './EnforcingBaseKnexMutator.ts';
import { getKnexEntityMutatorFactory } from './internal/getKnexEntityMutatorFactory.ts';

/**
 * Vend knex mutator for mutating entities via non-data-loader methods in a given query context.
 * @param entityClass - entity class to mutate
 * @param viewerContext - viewer context of mutating user
 * @param queryContext - query context in which to perform the mutation
 */
export function knexMutator<
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
  entityClass: IEntityClass<
    TMFields,
    TMIDField,
    TMViewerContext,
    TMEntity,
    TMPrivacyPolicy,
    TMSelectedFields
  >,
  viewerContext: TMViewerContext2,
  queryContext: EntityQueryContext = viewerContext
    .getViewerScopedEntityCompanionForClass(entityClass)
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
  return getKnexEntityMutatorFactory(entityClass, viewerContext).forMutationEnforcing(
    viewerContext,
    queryContext,
    { previousValue: null, cascadingDeleteCause: null },
  );
}

/**
 * Vend knex mutator for mutating entities via non-data-loader methods in a given query context.
 * Returns authorization results instead of throwing on authorization errors.
 * @param entityClass - entity class to mutate
 * @param viewerContext - viewer context of mutating user
 * @param queryContext - query context in which to perform the mutation
 */
export function knexMutatorWithAuthorizationResults<
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
  entityClass: IEntityClass<
    TMFields,
    TMIDField,
    TMViewerContext,
    TMEntity,
    TMPrivacyPolicy,
    TMSelectedFields
  >,
  viewerContext: TMViewerContext2,
  queryContext: EntityQueryContext = viewerContext
    .getViewerScopedEntityCompanionForClass(entityClass)
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
  return getKnexEntityMutatorFactory(entityClass, viewerContext).forMutation(
    viewerContext,
    queryContext,
    { previousValue: null, cascadingDeleteCause: null },
  );
}
