import { IEntityClass } from '../Entity';
import EntityPrivacyPolicy from '../EntityPrivacyPolicy';
import { EntityTransactionalQueryContext } from '../EntityQueryContext';
import ReadonlyEntity from '../ReadonlyEntity';
import ViewerContext from '../ViewerContext';
import { EntityDatabaseAdapterUniqueConstraintError } from '../errors/EntityDatabaseAdapterError';
import EntityNotFoundError from '../errors/EntityNotFoundError';

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
    queryContext?: EntityTransactionalQueryContext,
  ) => Promise<TEntity | null>,
  getArgs: TGetArgs,
  createAsync: (
    viewerContext: TViewerContext,
    createArgs: TCreateArgs,
    queryContext?: EntityTransactionalQueryContext,
  ) => Promise<TEntity>,
  createArgs: TCreateArgs,
  queryContext?: EntityTransactionalQueryContext,
): Promise<TEntity> {
  if (!queryContext) {
    const maybeEntity = await getAsync(viewerContext, getArgs);
    if (maybeEntity) {
      return maybeEntity;
    }
  } else {
    // This is done in a nested transaction since entity may negatively cache load results per-transaction (when configured).
    // Without it, it would
    // 1. load the entity in the current query context, negatively cache it
    // 2. then try to create it in the nested transaction, which may fail due to a unique constraint error
    // 3. then try to load the entity again in the current query context, which would return null due to negative cache
    const maybeEntity = await queryContext.runInNestedTransactionAsync((nestedQueryContext) =>
      getAsync(viewerContext, getArgs, nestedQueryContext),
    );
    if (maybeEntity) {
      return maybeEntity;
    }
  }
  return await createWithUniqueConstraintRecoveryAsync(
    viewerContext,
    entityClass,
    getAsync,
    getArgs,
    createAsync,
    createArgs,
    queryContext,
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
    queryContext?: EntityTransactionalQueryContext,
  ) => Promise<TEntity | null>,
  getArgs: TGetArgs,
  createAsync: (
    viewerContext: TViewerContext,
    createArgs: TCreateArgs,
    queryContext?: EntityTransactionalQueryContext,
  ) => Promise<TEntity>,
  createArgs: TCreateArgs,
  queryContext?: EntityTransactionalQueryContext,
): Promise<TEntity> {
  try {
    if (!queryContext) {
      return await createAsync(viewerContext, createArgs);
    }
    return await queryContext.runInNestedTransactionAsync((nestedQueryContext) =>
      createAsync(viewerContext, createArgs, nestedQueryContext),
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
