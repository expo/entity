import type { IEntityClass } from '../Entity.ts';
import { EntityEdgeDeletionBehavior } from '../EntityFieldDefinition.ts';
import type { EntityCascadingDeletionInfo } from '../EntityMutationInfo.ts';
import type { ReadonlyEntity } from '../ReadonlyEntity.ts';
import type { ViewerContext } from '../ViewerContext.ts';

/**
 * Options for {@link EntityCascadeDeletionUtils.deleteInboundReferencesInBatchesAsync}.
 */
export interface DeleteInboundReferencesOptions {
  /**
   * Number of inbound reference entities to load and delete per batch.
   * Each batch is processed in its own transaction.
   * @default 100
   */
  batchSize?: number;

  /**
   * Called when a single entity deletion fails. By default, errors are silently
   * swallowed since this is a best-effort pre-deletion pass — the subsequent root
   * entity deletion will cascade-delete any stragglers.
   *
   * Throw from this callback to abort the entire operation.
   */
  onEntityDeletionError?: (error: unknown, entityId: unknown) => void;
}

/**
 * Utility for pre-emptively deleting inbound references to an entity in batches,
 * outside of the root entity's transaction. This is useful when an entity has a
 * very large number of inbound references that would cause memory or transaction
 * duration issues if processed in a single cascade deletion.
 *
 * Usage pattern:
 * ```typescript
 * // 1. Best-effort batch delete of inbound references
 * await EntityCascadeDeletionUtils.deleteInboundReferencesInBatchesAsync(
 *   viewerContext,
 *   rootEntity,
 *   { batchSize: 100 },
 * );
 *
 * // 2. Normal delete of root entity (handles any stragglers via regular cascade)
 * await enforceAsyncResult(rootEntity.deleteAsync());
 * ```
 */
export class EntityCascadeDeletionUtils {
  /**
   * Delete all inbound references to `rootEntity` in batches. Each batch of
   * inbound entities is loaded, then deleted individually (each delete in its
   * own transaction, triggering any sub-cascades normally). This is best-effort:
   * individual entity deletion failures are passed to `onEntityDeletionError`
   * (or silently swallowed by default).
   *
   * After this completes, the caller should delete the root entity normally.
   * Any references that were created concurrently or failed to delete will be
   * handled by the root entity's normal cascade deletion.
   */
  static async deleteInboundReferencesInBatchesAsync(
    viewerContext: ViewerContext,
    rootEntity: ReadonlyEntity<any, any, any, any>,
    options: DeleteInboundReferencesOptions = {},
  ): Promise<void> {
    const { batchSize = 100, onEntityDeletionError } = options;

    const companionProvider = viewerContext.entityCompanionProvider;

    const rootEntityClass = rootEntity.constructor as IEntityClass<any, any, any, any, any, any>;
    const entityConfiguration =
      companionProvider.getCompanionForEntity(rootEntityClass).entityCompanionDefinition
        .entityConfiguration;
    const inboundEdges = entityConfiguration.inboundEdges;

    const cascadingDeleteCause: EntityCascadingDeletionInfo = {
      entity: rootEntity,
      cascadingDeleteCause: null,
    };

    for (const inboundEntityClass of inboundEdges) {
      const inboundConfiguration =
        companionProvider.getCompanionForEntity(inboundEntityClass).entityCompanionDefinition
          .entityConfiguration;

      for (const [fieldName, fieldDefinition] of inboundConfiguration.schema) {
        const association = fieldDefinition.association;
        if (!association) {
          continue;
        }

        const associatedConfiguration =
          companionProvider.getCompanionForEntity(association.associatedEntityClass)
            .entityCompanionDefinition.entityConfiguration;
        if (associatedConfiguration !== entityConfiguration) {
          continue;
        }

        const fieldValue = association.associatedEntityLookupByField
          ? rootEntity.getField(association.associatedEntityLookupByField)
          : rootEntity.getID();

        switch (association.edgeDeletionBehavior) {
          case EntityEdgeDeletionBehavior.CASCADE_DELETE:
          case EntityEdgeDeletionBehavior.CASCADE_DELETE_INVALIDATE_CACHE_ONLY: {
            await this.deleteBatchedAsync(
              viewerContext,
              inboundEntityClass,
              fieldName as string,
              fieldValue,
              batchSize,
              cascadingDeleteCause,
              onEntityDeletionError,
            );
            break;
          }
          case EntityEdgeDeletionBehavior.SET_NULL:
          case EntityEdgeDeletionBehavior.SET_NULL_INVALIDATE_CACHE_ONLY: {
            await this.setNullBatchedAsync(
              viewerContext,
              inboundEntityClass,
              fieldName as string,
              fieldValue,
              batchSize,
              cascadingDeleteCause,
              onEntityDeletionError,
            );
            break;
          }
        }
      }
    }
  }

  private static async deleteBatchedAsync(
    viewerContext: ViewerContext,
    entityClass: IEntityClass<any, any, any, any, any, any>,
    fieldName: string,
    fieldValue: unknown,
    batchSize: number,
    cascadingDeleteCause: EntityCascadingDeletionInfo,
    onEntityDeletionError: DeleteInboundReferencesOptions['onEntityDeletionError'],
  ): Promise<void> {
    const companion = viewerContext.getViewerScopedEntityCompanionForClass(entityClass);

    while (true) {
      const queryContext = this.getQueryContextForEntityClass(viewerContext, entityClass);
      // Load one page. Always offset 0 since we delete each page's rows before loading the next.
      const pageIterator = companion
        .getLoaderFactory()
        .forLoad(queryContext, {
          previousValue: null,
          cascadingDeleteCause,
        })
        .loadManyByFieldEqualingInPagesAsync(fieldName, fieldValue, batchSize, false);

      const iteratorResult = await pageIterator[Symbol.asyncIterator]().next();
      if (iteratorResult.done || !iteratorResult.value || iteratorResult.value.length === 0) {
        break;
      }

      const entityResults = iteratorResult.value;

      for (const entityResult of entityResults) {
        if (!entityResult.ok) {
          if (onEntityDeletionError) {
            onEntityDeletionError(entityResult.reason, undefined);
          }
          continue;
        }
        const entity = entityResult.enforceValue();
        try {
          const deleteQueryContext = this.getQueryContextForEntityClass(viewerContext, entityClass);
          const deleteResult = await companion
            .getMutatorFactory()
            .forDelete(entity, deleteQueryContext, cascadingDeleteCause)
            .deleteAsync();
          if (!deleteResult.ok) {
            if (onEntityDeletionError) {
              onEntityDeletionError(deleteResult.reason, entity.getID());
            }
          }
        } catch (error) {
          if (onEntityDeletionError) {
            onEntityDeletionError(error, entity.getID());
          }
        }
      }
    }
  }

  private static async setNullBatchedAsync(
    viewerContext: ViewerContext,
    entityClass: IEntityClass<any, any, any, any, any, any>,
    fieldName: string,
    fieldValue: unknown,
    batchSize: number,
    cascadingDeleteCause: EntityCascadingDeletionInfo,
    onEntityDeletionError: DeleteInboundReferencesOptions['onEntityDeletionError'],
  ): Promise<void> {
    const companion = viewerContext.getViewerScopedEntityCompanionForClass(entityClass);

    while (true) {
      const queryContext = this.getQueryContextForEntityClass(viewerContext, entityClass);
      // Load one page. Always offset 0 since SET NULL modifies the matched column,
      // causing rows to no longer match the query.
      const pageIterator = companion
        .getLoaderFactory()
        .forLoad(queryContext, {
          previousValue: null,
          cascadingDeleteCause,
        })
        .loadManyByFieldEqualingInPagesAsync(fieldName, fieldValue, batchSize, false);

      const iteratorResult = await pageIterator[Symbol.asyncIterator]().next();
      if (iteratorResult.done || !iteratorResult.value || iteratorResult.value.length === 0) {
        break;
      }

      const entityResults = iteratorResult.value;

      for (const entityResult of entityResults) {
        if (!entityResult.ok) {
          if (onEntityDeletionError) {
            onEntityDeletionError(entityResult.reason, undefined);
          }
          continue;
        }
        const entity = entityResult.enforceValue();
        try {
          const updateQueryContext = this.getQueryContextForEntityClass(viewerContext, entityClass);
          const updateResult = await companion
            .getMutatorFactory()
            .forUpdate(entity, updateQueryContext, cascadingDeleteCause)
            .setField(fieldName as any, null)
            .updateAsync();
          if (!updateResult.ok) {
            if (onEntityDeletionError) {
              onEntityDeletionError(updateResult.reason, entity.getID());
            }
          }
        } catch (error) {
          if (onEntityDeletionError) {
            onEntityDeletionError(error, entity.getID());
          }
        }
      }
    }
  }

  private static getQueryContextForEntityClass(
    viewerContext: ViewerContext,
    entityClass: IEntityClass<any, any, any, any, any, any>,
  ): ReturnType<ViewerContext['getQueryContextForDatabaseAdapterFlavor']> {
    const entityConfiguration =
      viewerContext.entityCompanionProvider.getCompanionForEntity(entityClass)
        .entityCompanionDefinition.entityConfiguration;
    return viewerContext.getQueryContextForDatabaseAdapterFlavor(
      entityConfiguration.databaseAdapterFlavor,
    );
  }
}
