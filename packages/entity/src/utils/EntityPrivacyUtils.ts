import { Result, asyncResult } from '@expo/results';

import Entity, { IEntityClass } from '../Entity';
import {
  EntityEdgeDeletionBehavior,
  EntityEdgeDeletionAuthorizationInferenceBehavior,
} from '../EntityFieldDefinition';
import { EntityCascadingDeletionInfo } from '../EntityMutationInfo';
import EntityPrivacyPolicy from '../EntityPrivacyPolicy';
import { EntityQueryContext } from '../EntityQueryContext';
import ViewerContext from '../ViewerContext';
import { failedResults } from '../entityUtils';
import EntityNotAuthorizedError from '../errors/EntityNotAuthorizedError';

/**
 * Check whether an entity loaded by a viewer can be updated by that same viewer.
 *
 * @remarks
 *
 * This may be useful in situations relying upon the thrown privacy policy thrown authorization error
 * is insufficient for the task at hand. When dealing with purely a sequence of mutations it is easy
 * to roll back all mutations given a single authorization error by wrapping them in a single transaction.
 * When certain portions of a mutation cannot be rolled back transactionally (third pary calls,
 * legacy code, etc), using this method can help decide whether the sequence of mutations will fail before
 * attempting them. Note that if any privacy policy rules use a piece of data being updated in the mutations
 * the result of this method and the update mutation itself may differ.
 *
 * @param entityClass - class of entity
 * @param sourceEntity - entity loaded by viewer
 * @param queryContext - query context in which to perform the check
 */
export async function canViewerUpdateAsync<
  TMFields extends object,
  TMID extends NonNullable<TMFields[TMSelectedFields]>,
  TMViewerContext extends ViewerContext,
  TMEntity extends Entity<TMFields, TMID, TMViewerContext, TMSelectedFields>,
  TMPrivacyPolicy extends EntityPrivacyPolicy<
    TMFields,
    TMID,
    TMViewerContext,
    TMEntity,
    TMSelectedFields
  >,
  TMSelectedFields extends keyof TMFields = keyof TMFields,
>(
  entityClass: IEntityClass<
    TMFields,
    TMID,
    TMViewerContext,
    TMEntity,
    TMPrivacyPolicy,
    TMSelectedFields
  >,
  sourceEntity: TMEntity,
  queryContext: EntityQueryContext = sourceEntity
    .getViewerContext()
    .getViewerScopedEntityCompanionForClass(entityClass)
    .getQueryContextProvider()
    .getQueryContext(),
): Promise<boolean> {
  return await canViewerUpdateInternalAsync(
    entityClass,
    sourceEntity,
    /* cascadingDeleteCause */ null,
    queryContext,
  );
}

async function canViewerUpdateInternalAsync<
  TMFields extends object,
  TMID extends NonNullable<TMFields[TMSelectedFields]>,
  TMViewerContext extends ViewerContext,
  TMEntity extends Entity<TMFields, TMID, TMViewerContext, TMSelectedFields>,
  TMPrivacyPolicy extends EntityPrivacyPolicy<
    TMFields,
    TMID,
    TMViewerContext,
    TMEntity,
    TMSelectedFields
  >,
  TMSelectedFields extends keyof TMFields = keyof TMFields,
>(
  entityClass: IEntityClass<
    TMFields,
    TMID,
    TMViewerContext,
    TMEntity,
    TMPrivacyPolicy,
    TMSelectedFields
  >,
  sourceEntity: TMEntity,
  cascadingDeleteCause: EntityCascadingDeletionInfo | null,
  queryContext: EntityQueryContext,
): Promise<boolean> {
  const companion = sourceEntity
    .getViewerContext()
    .getViewerScopedEntityCompanionForClass(entityClass);
  const privacyPolicy = companion.entityCompanion.privacyPolicy;
  const evaluationResult = await asyncResult(
    privacyPolicy.authorizeUpdateAsync(
      sourceEntity.getViewerContext(),
      queryContext,
      { previousValue: null, cascadingDeleteCause },
      sourceEntity,
      companion.getMetricsAdapter(),
    ),
  );
  if (!evaluationResult.ok) {
    if (evaluationResult.reason instanceof EntityNotAuthorizedError) {
      return false;
    } else {
      throw evaluationResult.reason;
    }
  }
  return evaluationResult.ok;
}

/**
 * Check whether a single entity loaded by a viewer can be deleted by that same viewer.
 * This recursively checks edge cascade permissions (EntityEdgeDeletionBehavior) as well.
 *
 * @remarks
 * See remarks for canViewerUpdate.
 *
 * @param entityClass - class of entity
 * @param sourceEntity - entity loaded by viewer
 * @param queryContext - query context in which to perform the check
 */
export async function canViewerDeleteAsync<
  TFields extends object,
  TID extends NonNullable<TFields[TSelectedFields]>,
  TMViewerContext extends ViewerContext,
  TEntity extends Entity<TFields, TID, TMViewerContext, TSelectedFields>,
  TPrivacyPolicy extends EntityPrivacyPolicy<
    TFields,
    TID,
    TMViewerContext,
    TEntity,
    TSelectedFields
  >,
  TSelectedFields extends keyof TFields = keyof TFields,
>(
  entityClass: IEntityClass<
    TFields,
    TID,
    TMViewerContext,
    TEntity,
    TPrivacyPolicy,
    TSelectedFields
  >,
  sourceEntity: TEntity,
  queryContext: EntityQueryContext = sourceEntity
    .getViewerContext()
    .getViewerScopedEntityCompanionForClass(entityClass)
    .getQueryContextProvider()
    .getQueryContext(),
): Promise<boolean> {
  return await canViewerDeleteInternalAsync(
    entityClass,
    sourceEntity,
    /* cascadingDeleteCause */ null,
    queryContext,
  );
}

async function canViewerDeleteInternalAsync<
  TFields extends object,
  TID extends NonNullable<TFields[TSelectedFields]>,
  TMViewerContext extends ViewerContext,
  TEntity extends Entity<TFields, TID, TMViewerContext, TSelectedFields>,
  TPrivacyPolicy extends EntityPrivacyPolicy<
    TFields,
    TID,
    TMViewerContext,
    TEntity,
    TSelectedFields
  >,
  TSelectedFields extends keyof TFields = keyof TFields,
>(
  entityClass: IEntityClass<
    TFields,
    TID,
    TMViewerContext,
    TEntity,
    TPrivacyPolicy,
    TSelectedFields
  >,
  sourceEntity: TEntity,
  cascadingDeleteCause: EntityCascadingDeletionInfo | null,
  queryContext: EntityQueryContext,
): Promise<boolean> {
  const viewerContext = sourceEntity.getViewerContext();
  const entityCompanionProvider = viewerContext.entityCompanionProvider;
  const viewerScopedCompanion = sourceEntity
    .getViewerContext()
    .getViewerScopedEntityCompanionForClass(entityClass);

  const privacyPolicy = viewerScopedCompanion.entityCompanion.privacyPolicy;
  const evaluationResult = await asyncResult(
    privacyPolicy.authorizeDeleteAsync(
      sourceEntity.getViewerContext(),
      queryContext,
      { previousValue: null, cascadingDeleteCause },
      sourceEntity,
      viewerScopedCompanion.getMetricsAdapter(),
    ),
  );
  if (!evaluationResult.ok) {
    if (evaluationResult.reason instanceof EntityNotAuthorizedError) {
      return false;
    } else {
      throw evaluationResult.reason;
    }
  }

  const newCascadingDeleteCause = {
    entity: sourceEntity,
    cascadingDeleteCause,
  };

  // Take entity X which is proposed to be deleted, look at inbound edges (entities that reference X).
  // These inbound edges are the entities that will either get deleted or have their references
  // to X nullified based on the EntityEdgeDeletionBehavior when entity X is deleted.
  // For each of these inboundEdge entities Y, look at the field(s) on Y that reference X.
  // For each of the field(s) on Y that reference X,
  // - if EntityEdgeDeletionBehavior is cascade set null, check if user can update Y
  // - if EntityEdgeDeletionBehavior is cascade delete, recursively run canViewerDeleteAsync on Y
  // Return the conjunction (returning eagerly when false) of all checks recursively.

  const entityConfiguration =
    viewerScopedCompanion.entityCompanion.entityCompanionDefinition.entityConfiguration;
  const inboundEdges = entityConfiguration.inboundEdges;

  for (const inboundEdge of inboundEdges) {
    const configurationForInboundEdge =
      entityCompanionProvider.getCompanionForEntity(inboundEdge).entityCompanionDefinition
        .entityConfiguration;

    const loader = viewerContext
      .getViewerScopedEntityCompanionForClass(inboundEdge)
      .getLoaderFactory()
      .forLoad(queryContext, {
        previousValue: null,
        cascadingDeleteCause: newCascadingDeleteCause,
      });

    for (const [fieldName, fieldDefinition] of configurationForInboundEdge.schema) {
      const association = fieldDefinition.association;
      if (!association) {
        continue;
      }

      const associatedConfiguration = entityCompanionProvider.getCompanionForEntity(
        association.associatedEntityClass,
      ).entityCompanionDefinition.entityConfiguration;
      if (associatedConfiguration !== entityConfiguration) {
        continue;
      }

      const edgeDeletionPermissionInferenceBehavior =
        association.edgeDeletionAuthorizationInferenceBehavior;

      let entityResultsToCheckForInboundEdge: readonly Result<any>[];

      if (
        edgeDeletionPermissionInferenceBehavior ===
        EntityEdgeDeletionAuthorizationInferenceBehavior.ONE_IMPLIES_ALL
      ) {
        const singleEntityToTestForInboundEdge = await loader
          .withAuthorizationResults()
          .loadFirstByFieldEqualityConjunctionAsync(
            [
              {
                fieldName,
                fieldValue: association.associatedEntityLookupByField
                  ? sourceEntity.getField(association.associatedEntityLookupByField as any)
                  : sourceEntity.getID(),
              },
            ],
            { orderBy: [] },
          );
        entityResultsToCheckForInboundEdge = singleEntityToTestForInboundEdge
          ? [singleEntityToTestForInboundEdge]
          : [];
      } else {
        const entityResultsForInboundEdge = await loader
          .withAuthorizationResults()
          .loadManyByFieldEqualingAsync(
            fieldName,
            association.associatedEntityLookupByField
              ? sourceEntity.getField(association.associatedEntityLookupByField as any)
              : sourceEntity.getID(),
          );
        entityResultsToCheckForInboundEdge = entityResultsForInboundEdge;
      }

      const failedEntityLoadResults = failedResults(entityResultsToCheckForInboundEdge);
      for (const failedResult of failedEntityLoadResults) {
        if (failedResult.reason instanceof EntityNotAuthorizedError) {
          return false;
        } else {
          throw failedResult.reason;
        }
      }

      // all results should be success at this point due to check above
      const entitiesForInboundEdge = entityResultsToCheckForInboundEdge.map((r) =>
        r.enforceValue(),
      );

      switch (association.edgeDeletionBehavior) {
        case EntityEdgeDeletionBehavior.CASCADE_DELETE:
        case EntityEdgeDeletionBehavior.CASCADE_DELETE_INVALIDATE_CACHE_ONLY: {
          const canDeleteAll = (
            await Promise.all(
              entitiesForInboundEdge.map((entity) =>
                canViewerDeleteInternalAsync(
                  inboundEdge,
                  entity,
                  newCascadingDeleteCause,
                  queryContext,
                ),
              ),
            )
          ).every((b) => b);

          if (!canDeleteAll) {
            return false;
          }
          break;
        }

        case EntityEdgeDeletionBehavior.SET_NULL:
        case EntityEdgeDeletionBehavior.SET_NULL_INVALIDATE_CACHE_ONLY: {
          const canUpdateAll = (
            await Promise.all(
              entitiesForInboundEdge.map((entity) =>
                canViewerUpdateInternalAsync(
                  inboundEdge,
                  entity,
                  newCascadingDeleteCause,
                  queryContext,
                ),
              ),
            )
          ).every((b) => b);

          if (!canUpdateAll) {
            return false;
          }
          break;
        }
      }
    }
  }

  return true;
}
