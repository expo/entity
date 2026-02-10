import {
  EntityConstructionUtils,
  EntityPrivacyPolicy,
  EntityQueryContext,
  ReadonlyEntity,
  ViewerContext,
  IEntityMetricsAdapter,
} from '@expo/entity';
import { Result } from '@expo/results';

import {
  FieldEqualityCondition,
  isSingleValueFieldEqualityCondition,
  OrderByOrdering,
} from './BasePostgresEntityDatabaseAdapter';
import { BaseSQLQueryBuilder } from './BaseSQLQueryBuilder';
import { SQLFragment } from './SQLOperator';
import type { Connection, PageInfo } from './internal/EntityKnexDataManager';
import { EntityKnexDataManager } from './internal/EntityKnexDataManager';

export interface EntityLoaderOrderByClause<
  TFields extends Record<string, any>,
  TSelectedFields extends keyof TFields,
> {
  /**
   * The field name to order by.
   */
  fieldName: TSelectedFields;

  /**
   * The OrderByOrdering to order by.
   */
  order: OrderByOrdering;
}

/**
 * SQL modifiers that only affect the selection but not the projection.
 */
export interface EntityLoaderQuerySelectionModifiers<
  TFields extends Record<string, any>,
  TSelectedFields extends keyof TFields,
> {
  /**
   * Order the entities by specified columns and orders.
   */
  orderBy?: readonly EntityLoaderOrderByClause<TFields, TSelectedFields>[];

  /**
   * Skip the specified number of entities queried before returning.
   */
  offset?: number;

  /**
   * Limit the number of entities returned.
   */
  limit?: number;
}

export interface EntityLoaderQuerySelectionModifiersWithOrderByRaw<
  TFields extends Record<string, any>,
  TSelectedFields extends keyof TFields,
> extends EntityLoaderQuerySelectionModifiers<TFields, TSelectedFields> {
  /**
   * Order the entities by a raw SQL `ORDER BY` clause.
   */
  orderByRaw?: string;
}

export interface EntityLoaderQuerySelectionModifiersWithOrderByFragment<
  TFields extends Record<string, any>,
  TSelectedFields extends keyof TFields,
> extends EntityLoaderQuerySelectionModifiers<TFields, TSelectedFields> {
  /**
   * Order the entities by a SQL fragment `ORDER BY` clause.
   */
  orderByFragment?: SQLFragment;
}

/**
 * Base pagination arguments
 */
interface EntityLoaderBasePaginationArgs<
  TFields extends Record<string, any>,
  TSelectedFields extends keyof TFields,
> {
  /**
   * SQLFragment representing the WHERE clause to filter the entities being paginated.
   */
  where?: SQLFragment;

  /**
   * Order the entities by specified columns and orders. If the ID field is not included in the orderBy, it will be automatically included as the last orderBy field to ensure stable pagination.
   */
  orderBy?: EntityLoaderOrderByClause<TFields, TSelectedFields>[];

  /**
   * Whether to calculate and include the Connection totalCount field containing the total count of entities matching the where SQLFragment.
   *
   * Note that this may be an expensive operation, especially for large datasets, as it may require an additional SQL query with a COUNT(*) aggregation.
   * It is recommended to only set this to true when necessary for the client application, such as when implementing pagination UIs that need to know the total number of pages.
   *
   * When true and cursor is non-null, the total count is calculated by running a separate COUNT(*) query with the same WHERE clause.
   * When true and cursor is null, the total count is calculated by running the main query with a window function to count all matching rows, which is slightly faster but still expensive.
   */
  includeTotal?: boolean;
}

/**
 * Forward pagination arguments
 */
export interface EntityLoaderForwardPaginationArgs<
  TFields extends Record<string, any>,
  TSelectedFields extends keyof TFields,
> extends EntityLoaderBasePaginationArgs<TFields, TSelectedFields> {
  /**
   * The number of entities to return starting from the entity after the cursor (for forward pagination). Must be a positive integer.
   */
  first: number;

  /**
   * The cursor to paginate after for forward pagination, typically an opaque string encoding of the values of the cursor fields of the last entity in the previous page. If not provided, pagination starts from the beginning of the result set.
   */
  after?: string;
}

/**
 * Backward pagination arguments
 */
export interface EntityLoaderBackwardPaginationArgs<
  TFields extends Record<string, any>,
  TSelectedFields extends keyof TFields,
> extends EntityLoaderBasePaginationArgs<TFields, TSelectedFields> {
  /**
   * The number of entities to return starting from the entity before the cursor (for backward pagination). Must be a positive integer.
   */
  last: number;

  /**
   * The cursor to paginate before for backward pagination, typically an opaque string encoding of the values of the cursor fields of the first entity in the previous page. If not provided, pagination starts from the end of the result set.
   */
  before?: string;
}

/**
 * Load page pagination arguments, which can be either forward or backward pagination arguments.
 */
export type EntityLoaderLoadPageArgs<
  TFields extends Record<string, any>,
  TSelectedFields extends keyof TFields,
> =
  | EntityLoaderForwardPaginationArgs<TFields, TSelectedFields>
  | EntityLoaderBackwardPaginationArgs<TFields, TSelectedFields>;

/**
 * Authorization-result-based knex entity loader for non-data-loader-based load methods.
 * All loads through this loader are results (or null for some loader methods), where an
 * unsuccessful result means an authorization error or entity construction error occurred.
 * Other errors are thrown.
 */
export class AuthorizationResultBasedKnexEntityLoader<
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
   * Authorization-result-based version of the EnforcingKnexEntityLoader method by the same name.
   * @returns the first entity results that matches the query, where result error can be
   *  UnauthorizedError
   */
  async loadFirstByFieldEqualityConjunctionAsync<N extends keyof Pick<TFields, TSelectedFields>>(
    fieldEqualityOperands: FieldEqualityCondition<TFields, N>[],
    querySelectionModifiers: Omit<
      EntityLoaderQuerySelectionModifiers<TFields, TSelectedFields>,
      'limit'
    > &
      Required<Pick<EntityLoaderQuerySelectionModifiers<TFields, TSelectedFields>, 'orderBy'>>,
  ): Promise<Result<TEntity> | null> {
    const results = await this.loadManyByFieldEqualityConjunctionAsync(fieldEqualityOperands, {
      ...querySelectionModifiers,
      limit: 1,
    });
    return results[0] ?? null;
  }

  /**
   * Authorization-result-based version of the EnforcingKnexEntityLoader method by the same name.
   * @returns array of entity results that match the query, where result error can be UnauthorizedError
   */
  async loadManyByFieldEqualityConjunctionAsync<N extends keyof Pick<TFields, TSelectedFields>>(
    fieldEqualityOperands: FieldEqualityCondition<TFields, N>[],
    querySelectionModifiers: EntityLoaderQuerySelectionModifiers<TFields, TSelectedFields> = {},
  ): Promise<readonly Result<TEntity>[]> {
    for (const fieldEqualityOperand of fieldEqualityOperands) {
      const fieldValues = isSingleValueFieldEqualityCondition(fieldEqualityOperand)
        ? [fieldEqualityOperand.fieldValue]
        : fieldEqualityOperand.fieldValues;
      this.constructionUtils.validateFieldAndValues(fieldEqualityOperand.fieldName, fieldValues);
    }

    const fieldObjects = await this.knexDataManager.loadManyByFieldEqualityConjunctionAsync(
      this.queryContext,
      fieldEqualityOperands,
      querySelectionModifiers,
    );
    return await this.constructionUtils.constructAndAuthorizeEntitiesArrayAsync(fieldObjects);
  }

  /**
   * Authorization-result-based version of the EnforcingKnexEntityLoader method by the same name.
   * @returns array of entity results that match the query, where result error can be UnauthorizedError
   * @throws Error when rawWhereClause or bindings are invalid
   */
  async loadManyByRawWhereClauseAsync(
    rawWhereClause: string,
    bindings: any[] | object,
    querySelectionModifiers: EntityLoaderQuerySelectionModifiersWithOrderByRaw<
      TFields,
      TSelectedFields
    > = {},
  ): Promise<readonly Result<TEntity>[]> {
    const fieldObjects = await this.knexDataManager.loadManyByRawWhereClauseAsync(
      this.queryContext,
      rawWhereClause,
      bindings,
      querySelectionModifiers,
    );
    return await this.constructionUtils.constructAndAuthorizeEntitiesArrayAsync(fieldObjects);
  }

  /**
   * Authorization-result-based version of the EnforcingKnexEntityLoader method by the same name.
   * @returns SQL query builder for building and executing SQL queries that when executed returns entity results where result error can be UnauthorizedError.
   */
  loadManyBySQL(
    fragment: SQLFragment,
    modifiers: EntityLoaderQuerySelectionModifiersWithOrderByFragment<
      TFields,
      TSelectedFields
    > = {},
  ): AuthorizationResultBasedSQLQueryBuilder<
    TFields,
    TIDField,
    TViewerContext,
    TEntity,
    TPrivacyPolicy,
    TSelectedFields
  > {
    return new AuthorizationResultBasedSQLQueryBuilder(
      this.knexDataManager,
      this.constructionUtils,
      this.queryContext,
      fragment,
      modifiers,
    );
  }

  /**
   * Load a page of entities with Relay-style cursor pagination.
   * Only returns successfully authorized entities for cursor stability; failed authorization results are filtered out.
   *
   * @returns Connection with only successfully authorized entities
   */
  async loadPageBySQLAsync(
    args: EntityLoaderLoadPageArgs<TFields, TSelectedFields>,
  ): Promise<Connection<TEntity>> {
    const pageResult = await this.knexDataManager.loadPageBySQLFragmentAsync(
      this.queryContext,
      args,
    );

    const edgeResults = await Promise.all(
      pageResult.edges.map(async (edge) => {
        const entityResult = await this.constructionUtils.constructAndAuthorizeEntityAsync(
          edge.node,
        );
        if (!entityResult.ok) {
          return null;
        }
        return {
          ...edge,
          node: entityResult.value,
        };
      }),
    );
    const edges = edgeResults.filter((edge) => edge !== null);
    const pageInfo: PageInfo = {
      ...pageResult.pageInfo,
      startCursor: edges[0]?.cursor ?? null,
      endCursor: edges[edges.length - 1]?.cursor ?? null,
    };

    return {
      edges,
      pageInfo,
      ...(pageResult.totalCount !== undefined && { totalCount: pageResult.totalCount }),
    };
  }
}

/**
 * SQL query builder implementation for AuthorizationResultBasedKnexEntityLoader.
 */
export class AuthorizationResultBasedSQLQueryBuilder<
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
> extends BaseSQLQueryBuilder<TFields, TSelectedFields, Result<TEntity>> {
  constructor(
    private readonly knexDataManager: EntityKnexDataManager<TFields, TIDField>,
    private readonly constructionUtils: EntityConstructionUtils<
      TFields,
      TIDField,
      TViewerContext,
      TEntity,
      TPrivacyPolicy,
      TSelectedFields
    >,
    private readonly queryContext: EntityQueryContext,
    sqlFragment: SQLFragment,
    modifiers: EntityLoaderQuerySelectionModifiersWithOrderByFragment<TFields, TSelectedFields>,
  ) {
    super(sqlFragment, modifiers);
  }

  /**
   * Execute the query and return results.
   */
  async executeInternalAsync(): Promise<readonly Result<TEntity>[]> {
    const fieldObjects = await this.knexDataManager.loadManyBySQLFragmentAsync(
      this.queryContext,
      this.getSQLFragment(),
      this.getModifiers(),
    );
    return await this.constructionUtils.constructAndAuthorizeEntitiesArrayAsync(fieldObjects);
  }
}
