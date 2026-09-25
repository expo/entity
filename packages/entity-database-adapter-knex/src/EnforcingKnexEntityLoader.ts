import type {
  EntityConstructionUtils,
  EntityPrivacyPolicy,
  EntityQueryContext,
  IEntityMetricsAdapter,
  ReadonlyEntity,
  ViewerContext,
} from '@expo/entity';
import { mapMap } from '@expo/entity';

import type {
  AuthorizationResultBasedKnexEntityLoader,
  EntityLoaderLoadPageArgs,
  EntityLoaderQuerySelectionModifiers,
  EntityLoaderRowLockingModifiers,
  EntityLoaderRowLockingModifiersWithoutSkipLocked,
} from './AuthorizationResultBasedKnexEntityLoader.ts';
import type { FieldEqualityCondition } from './BasePostgresEntityDatabaseAdapter.ts';
import { BaseSQLQueryBuilder } from './BaseSQLQueryBuilder.ts';
import type { SQLFragment } from './SQLOperator.ts';
import type { Connection, EntityKnexDataManager } from './internal/EntityKnexDataManager.ts';

/**
 * Enforcing knex entity loader for non-data-loader-based load methods.
 * All loads through this loader will throw if the load is not successful.
 */
export class EnforcingKnexEntityLoader<
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
  constructor(
    private readonly knexEntityLoader: AuthorizationResultBasedKnexEntityLoader<
      TFields,
      TIDField,
      TViewerContext,
      TEntity,
      TPrivacyPolicy,
      TSelectedFields
    >,
    private readonly queryContext: EntityQueryContext,
    private readonly knexDataManager: EntityKnexDataManager<TFields, TIDField>,
    protected readonly metricsAdapter: IEntityMetricsAdapter,
    private readonly constructionUtils: EntityConstructionUtils<
      TFields,
      TIDField,
      TViewerContext,
      TEntity,
      TPrivacyPolicy,
      TSelectedFields
    >,
  ) {}

  /**
   * Load an entity by ID directly from the database, bypassing the dataloader and cache.
   *
   * Unlike {@link "@expo/entity"!EnforcingEntityLoader.loadByIDAsync | EnforcingEntityLoader.loadByIDAsync}, this
   * issues one database query per call and does not read from or write to the entity cache. It exists
   * for cases that need row locking modifiers, which are required to make this intent explicit.
   * `skipLocked` is not permitted here since a skipped row would be reported as not found.
   * Use {@link loadByIDNullableFromDatabaseAsync} with `skipLocked`.
   *
   * @param id - ID of the entity
   * @param modifiers - row locking modifiers for the query
   * @returns entity matching ID
   * @throws EntityNotAuthorizedError when viewer is not authorized to view the returned entity
   * @throws EntityNotFoundError when no entity exists for ID
   */
  async loadByIDFromDatabaseAsync(
    id: TFields[TIDField],
    modifiers: EntityLoaderRowLockingModifiersWithoutSkipLocked,
  ): Promise<TEntity> {
    const entityResult = await this.knexEntityLoader.loadByIDFromDatabaseAsync(id, modifiers);
    return entityResult.enforceValue();
  }

  /**
   * Load an entity by ID directly from the database, or return null if non-existent.
   * See {@link loadByIDFromDatabaseAsync} for how this differs from the standard loader.
   *
   * @param id - ID of the entity
   * @param modifiers - row locking modifiers for the query
   * @returns entity for matching ID, or null if no entity exists for ID
   * @throws EntityNotAuthorizedError when viewer is not authorized to view the returned entity
   */
  async loadByIDNullableFromDatabaseAsync(
    id: TFields[TIDField],
    modifiers: EntityLoaderRowLockingModifiers,
  ): Promise<TEntity | null> {
    const entityResult = await this.knexEntityLoader.loadByIDNullableFromDatabaseAsync(
      id,
      modifiers,
    );
    return entityResult ? entityResult.enforceValue() : null;
  }

  /**
   * Load many entities for a list of IDs directly from the database.
   * See {@link loadByIDFromDatabaseAsync} for how this differs from the standard loader.
   *
   * `skipLocked` is not permitted here since a skipped row would be reported as not found.
   * Use {@link loadManyByIDsNullableFromDatabaseAsync} with `skipLocked`.
   *
   * @param ids - IDs of the entities to load
   * @param modifiers - row locking modifiers for the query
   * @returns map from ID to corresponding entity
   * @throws EntityNotAuthorizedError when viewer is not authorized to view one or more of the returned entities
   * @throws EntityNotFoundError when no entity exists for one or more of the IDs
   */
  async loadManyByIDsFromDatabaseAsync(
    ids: readonly TFields[TIDField][],
    modifiers: EntityLoaderRowLockingModifiersWithoutSkipLocked,
  ): Promise<ReadonlyMap<TFields[TIDField], TEntity>> {
    const entityResults = await this.knexEntityLoader.loadManyByIDsFromDatabaseAsync(
      ids,
      modifiers,
    );
    return mapMap(entityResults, (entityResult) => entityResult.enforceValue());
  }

  /**
   * Load many entities for a list of IDs directly from the database, returning null for any IDs that are non-existent.
   * See {@link loadByIDFromDatabaseAsync} for how this differs from the standard loader.
   *
   * @param ids - IDs of the entities to load
   * @param modifiers - row locking modifiers for the query
   * @returns map from ID to nullable corresponding entity
   * @throws EntityNotAuthorizedError when viewer is not authorized to view one or more of the returned entities
   */
  async loadManyByIDsNullableFromDatabaseAsync(
    ids: readonly TFields[TIDField][],
    modifiers: EntityLoaderRowLockingModifiers,
  ): Promise<ReadonlyMap<TFields[TIDField], TEntity | null>> {
    const entityResults = await this.knexEntityLoader.loadManyByIDsNullableFromDatabaseAsync(
      ids,
      modifiers,
    );
    return mapMap(entityResults, (entityResult) => entityResult?.enforceValue() ?? null);
  }

  /**
   * Load an entity where uniqueFieldName equals fieldValue directly from the database, or null if no entity matches.
   * See {@link loadByIDFromDatabaseAsync} for how this differs from the standard loader.
   *
   * @param uniqueFieldName - entity field being queried
   * @param fieldValue - uniqueFieldName field value being queried
   * @param modifiers - row locking modifiers for the query
   * @returns entity where uniqueFieldName equals fieldValue, or null if no entity matches the condition
   * @throws when multiple entities match the condition
   * @throws EntityNotAuthorizedError when viewer is not authorized to view the returned entity
   */
  async loadByFieldEqualingFromDatabaseAsync<N extends keyof Pick<TFields, TSelectedFields>>(
    uniqueFieldName: N,
    fieldValue: NonNullable<TFields[N]>,
    modifiers: EntityLoaderRowLockingModifiers,
  ): Promise<TEntity | null> {
    const entityResult = await this.knexEntityLoader.loadByFieldEqualingFromDatabaseAsync(
      uniqueFieldName,
      fieldValue,
      modifiers,
    );
    return entityResult ? entityResult.enforceValue() : null;
  }

  /**
   * Load many entities where fieldName equals fieldValue directly from the database.
   * See {@link loadByIDFromDatabaseAsync} for how this differs from the standard loader.
   *
   * @param fieldName - entity field being queried
   * @param fieldValue - fieldName field value being queried
   * @param modifiers - row locking modifiers for the query
   * @returns array of entities where fieldName equals fieldValue
   * @throws EntityNotAuthorizedError when viewer is not authorized to view one or more of the returned entities
   */
  async loadManyByFieldEqualingFromDatabaseAsync<N extends keyof Pick<TFields, TSelectedFields>>(
    fieldName: N,
    fieldValue: NonNullable<TFields[N]>,
    modifiers: EntityLoaderRowLockingModifiers,
  ): Promise<readonly TEntity[]> {
    const entityResults = await this.knexEntityLoader.loadManyByFieldEqualingFromDatabaseAsync(
      fieldName,
      fieldValue,
      modifiers,
    );
    return entityResults.map((entityResult) => entityResult.enforceValue());
  }

  /**
   * Load the first entity matching the conjunction of field equality operands and
   * query modifiers.
   *
   * This is a convenience method for {@link loadManyByFieldEqualityConjunctionAsync}. However, the
   * orderBy query modifier is required to ensure consistent results if more than one entity matches
   * the filters.
   *
   * @throws EntityNotAuthorizedError if viewer is not authorized to view the entity
   * @returns the first entity matching the filters, or null if none match
   */
  async loadFirstByFieldEqualityConjunctionAsync<N extends keyof Pick<TFields, TSelectedFields>>(
    fieldEqualityOperands: FieldEqualityCondition<TFields, N>[],
    querySelectionModifiers: Omit<
      EntityLoaderQuerySelectionModifiers<TFields, TSelectedFields>,
      'limit'
    > &
      Required<Pick<EntityLoaderQuerySelectionModifiers<TFields, TSelectedFields>, 'orderBy'>>,
  ): Promise<TEntity | null> {
    const entityResult = await this.knexEntityLoader.loadFirstByFieldEqualityConjunctionAsync(
      fieldEqualityOperands,
      querySelectionModifiers,
    );
    return entityResult?.enforceValue() ?? null;
  }

  /**
   * Load entities matching the conjunction of field equality operands and
   * query modifiers.
   *
   * Typically this is used for complex queries that cannot be expressed through simpler
   * convenience methods such as {@link "@expo/entity"!EnforcingEntityLoader.loadManyByFieldEqualingAsync | EnforcingEntityLoader.loadManyByFieldEqualingAsync}.
   *
   * @throws EntityNotAuthorizedError if viewer is not authorized to view the entity
   * @returns entities matching the filters
   */
  async loadManyByFieldEqualityConjunctionAsync<N extends keyof Pick<TFields, TSelectedFields>>(
    fieldEqualityOperands: FieldEqualityCondition<TFields, N>[],
    querySelectionModifiers: EntityLoaderQuerySelectionModifiers<TFields, TSelectedFields> = {},
  ): Promise<readonly TEntity[]> {
    const entityResults = await this.knexEntityLoader.loadManyByFieldEqualityConjunctionAsync(
      fieldEqualityOperands,
      querySelectionModifiers,
    );
    return entityResults.map((result) => result.enforceValue());
  }

  /**
   * Count entities matching the conjunction of field equality operands.
   * This does not perform authorization since count does not load full entities.
   * Note that this should be used with the same caution as loadManyByFieldEqualityConjunctionAsync
   * regarding indexing since counts can be expensive on large datasets without appropriate indexes.
   *
   * @returns count of entities matching the filters
   */
  async countByFieldEqualityConjunctionAsync<N extends keyof Pick<TFields, TSelectedFields>>(
    fieldEqualityOperands: FieldEqualityCondition<TFields, N>[],
  ): Promise<number> {
    return await this.knexEntityLoader.countByFieldEqualityConjunctionAsync(fieldEqualityOperands);
  }

  /**
   * Count entities matching a SQL fragment.
   * This does not perform authorization since count does not load full entity rows.
   * Note that this should be used with the same caution as loadManyBySQL regarding indexing
   * since counts can be expensive on large datasets without appropriate indexes.
   *
   * @returns count of entities matching the query
   */
  async countBySQLAsync(fragment: SQLFragment<Pick<TFields, TSelectedFields>>): Promise<number> {
    return await this.knexEntityLoader.countBySQLAsync(fragment);
  }

  /**
   * Load entities using a SQL query builder. When executed, all queries will enforce authorization and throw if not authorized.
   *
   * @example
   * ```ts
   * const entities = await ExampleEntity.loader(vc)
   *   .loadManyBySQL(sql`age >= ${18} AND status = ${'active'}`)
   *   .orderBy('createdAt', 'DESC')
   *   .limit(10)
   *   .executeAsync();
   *
   * const { between, inArray } = SQLExpression;
   * const filtered = await ExampleEntity.loader(vc)
   *   .loadManyBySQL(
   *     sql`${between('age', 18, 65)} AND ${inArray('role', ['admin', 'moderator'])}`
   *   )
   *   .executeAsync();
   * ```
   */
  loadManyBySQL(
    fragment: SQLFragment<Pick<TFields, TSelectedFields>>,
    modifiers: EntityLoaderQuerySelectionModifiers<TFields, TSelectedFields> = {},
  ): EnforcingSQLQueryBuilder<
    TFields,
    TIDField,
    TViewerContext,
    TEntity,
    TPrivacyPolicy,
    TSelectedFields
  > {
    return new EnforcingSQLQueryBuilder(this.knexEntityLoader, fragment, modifiers);
  }

  /**
   * Load a page of entities with Relay-style cursor pagination.
   *
   * @param args - Pagination arguments with pagination and either first/after or last/before
   * @returns a page of entities matching the pagination arguments
   * @throws EntityNotAuthorizedError if viewer is not authorized to view any returned entity
   */
  async loadPageAsync(
    args: EntityLoaderLoadPageArgs<TFields, TSelectedFields>,
  ): Promise<Connection<TEntity>> {
    const pageResult = await this.knexDataManager.loadPageAsync(this.queryContext, args);
    const edges = await Promise.all(
      pageResult.edges.map(async (edge) => {
        const entityResult = await this.constructionUtils.constructAndAuthorizeEntityAsync(
          edge.node,
        );
        const entity = entityResult.enforceValue();
        return {
          ...edge,
          node: entity,
        };
      }),
    );

    return {
      edges,
      pageInfo: pageResult.pageInfo,
    };
  }

  /**
   * Get cursor for a given entity that matches what loadPageAsync would produce.
   * Useful for constructing pagination cursors for entities returned from other loader methods that can then be passed to loadPageAsync for pagination.
   * Most commonly used for testing pagination behavior.
   *
   * @param entity - The entity to get the pagination cursor for.
   * @returns The pagination cursor for the given entity.
   */
  getPaginationCursorForEntity(entity: TEntity): string {
    return this.knexEntityLoader.getPaginationCursorForEntity(entity);
  }
}

/**
 * SQL query builder for EnforcingKnexEntityLoader.
 * Provides a fluent API for building and executing SQL queries with enforced authorization.
 */
export class EnforcingSQLQueryBuilder<
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
> extends BaseSQLQueryBuilder<TFields, TSelectedFields, TEntity> {
  constructor(
    private readonly knexEntityLoader: AuthorizationResultBasedKnexEntityLoader<
      TFields,
      TIDField,
      TViewerContext,
      TEntity,
      TPrivacyPolicy,
      TSelectedFields
    >,
    sqlFragment: SQLFragment<Pick<TFields, TSelectedFields>>,
    modifiers: EntityLoaderQuerySelectionModifiers<TFields, TSelectedFields>,
  ) {
    super(sqlFragment, modifiers);
  }

  /**
   * Execute the query.
   * @returns entities matching the query
   * @throws EntityNotAuthorizedError if viewer is not authorized to view any entity
   */
  async executeInternalAsync(): Promise<readonly TEntity[]> {
    const entityResults = await this.knexEntityLoader
      .loadManyBySQL(this.getSQLFragment(), this.getModifiers())
      .executeAsync();
    return entityResults.map((result) => result.enforceValue());
  }
}
