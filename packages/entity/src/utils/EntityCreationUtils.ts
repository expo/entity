import type { IEntityClass } from '../Entity.ts';
import type { EntityPrivacyPolicy } from '../EntityPrivacyPolicy.ts';
import type { EntityQueryContext } from '../EntityQueryContext.ts';
import type { ReadonlyEntity } from '../ReadonlyEntity.ts';
import type { ViewerContext } from '../ViewerContext.ts';
import { EntityDatabaseAdapterUniqueConstraintError } from '../errors/EntityDatabaseAdapterError.ts';
import { EntityNotFoundError } from '../errors/EntityNotFoundError.ts';

/**
 * Create an entity if it doesn't exist, or get the existing entity if it does.
 */
export async function createOrGetExistingAsync<
  TFields extends object,
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
  TGetArgs,
  TCreateArgs,
  TSelectedFields extends keyof TFields = keyof TFields,
>(
  viewerContext: TViewerContext,
  entityClass: IEntityClass<
    TFields,
    TIDField,
    TViewerContext,
    TEntity,
    TPrivacyPolicy,
    TSelectedFields
  >,
  getAsync: (
    viewerContext: TViewerContext,
    getArgs: TGetArgs,
    queryContext?: EntityQueryContext,
  ) => Promise<TEntity | null>,
  getArgs: TGetArgs,
  createAsync: (
    viewerContext: TViewerContext,
    createArgs: TCreateArgs,
    queryContext?: EntityQueryContext,
  ) => Promise<TEntity>,
  createArgs: TCreateArgs,
  queryContext?: EntityQueryContext,
): Promise<TEntity> {
  const effectiveQueryContext =
    queryContext ??
    viewerContext
      .getViewerScopedEntityCompanionForClass(entityClass)
      .getQueryContextProvider()
      .getQueryContext();

  // This is done in a nested query context since entity may negatively cache load results
  // in the current query context. Without it, create recovery can hit that negative cache
  // after a concurrent insert causes a unique constraint error.
  const maybeEntity = await effectiveQueryContext.runInNestedQueryContextAsync(
    async (nestedQueryContext) => await getAsync(viewerContext, getArgs, nestedQueryContext),
  );
  if (maybeEntity) {
    return maybeEntity;
  }

  return await createWithUniqueConstraintRecoveryAsync(
    viewerContext,
    entityClass,
    getAsync,
    getArgs,
    createAsync,
    createArgs,
    effectiveQueryContext,
  );
}

/**
 * Account for concurrent requests that may try to create the same entity.
 * Return the existing entity if we get a Unique Constraint error.
 */
export async function createWithUniqueConstraintRecoveryAsync<
  TFields extends object,
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
  TGetArgs,
  TCreateArgs,
  TSelectedFields extends keyof TFields = keyof TFields,
>(
  viewerContext: TViewerContext,
  entityClass: IEntityClass<
    TFields,
    TIDField,
    TViewerContext,
    TEntity,
    TPrivacyPolicy,
    TSelectedFields
  >,
  getAsync: (
    viewerContext: TViewerContext,
    getArgs: TGetArgs,
    queryContext?: EntityQueryContext,
  ) => Promise<TEntity | null>,
  getArgs: TGetArgs,
  createAsync: (
    viewerContext: TViewerContext,
    createArgs: TCreateArgs,
    queryContext?: EntityQueryContext,
  ) => Promise<TEntity>,
  createArgs: TCreateArgs,
  queryContext?: EntityQueryContext,
): Promise<TEntity> {
  try {
    if (!queryContext) {
      return await createAsync(viewerContext, createArgs);
    }
    if (!queryContext.isInTransaction()) {
      return await createAsync(viewerContext, createArgs, queryContext);
    }
    return await queryContext.runInNestedTransactionAsync(
      async (nestedQueryContext) =>
        await createAsync(viewerContext, createArgs, nestedQueryContext),
    );
  } catch (e) {
    if (e instanceof EntityDatabaseAdapterUniqueConstraintError) {
      const entity = await getAsync(viewerContext, getArgs, queryContext);
      if (!entity) {
        throw new EntityNotFoundError(
          `Expected entity to exist after unique constraint error: ${entityClass.name}`,
        );
      }
      return entity;
    } else {
      throw e;
    }
  }
}
