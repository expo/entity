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
  NullsOrdering,
  OrderByOrdering,
} from './BasePostgresEntityDatabaseAdapter';
import { BaseSQLQueryBuilder } from './BaseSQLQueryBuilder';
import { PaginationStrategy } from './PaginationStrategy';
import { SQLFragment } from './SQLOperator';
import type { Connection, PageInfo } from './internal/EntityKnexDataManager';
import { EntityKnexDataManager } from './internal/EntityKnexDataManager';
import { NonNullableKeys } from './internal/utilityTypes';

export type EntityLoaderBaseOrderByClause = {
  /**
   * The OrderByOrdering to order by.
   */
  order: OrderByOrdering;

  /**
   * Optional nulls ordering for this order by clause. If not provided, no specific nulls ordering is applied.
   */
  nulls?: NullsOrdering | undefined;
};

export type EntityLoaderFieldNameOrderByClause<
  TFields extends Record<string, any>,
  TSelectedFields extends keyof TFields = keyof TFields,
> = EntityLoaderBaseOrderByClause & {
  /**
   * The field name to order by.
   */
  fieldName: TSelectedFields;
};

export type EntityLoaderFieldFragmentOrderByClause<
  TFields extends Record<string, any>,
  TSelectedFields extends keyof TFields = keyof TFields,
> = EntityLoaderBaseOrderByClause & {
  /**
   * The SQL fragment to order by, which can reference selected fields. Example: `COALESCE(NULLIF(display_name, ''), split_part(full_name, '/', 2))`.
   * May not contain ASC or DESC, as ordering direction is controlled by the `order` property.
   */
  fieldFragment: SQLFragment<Pick<TFields, TSelectedFields>>;
};

export type EntityLoaderOrderByClause<
  TFields extends Record<string, any>,
  TSelectedFields extends keyof TFields = keyof TFields,
> =
  | EntityLoaderFieldNameOrderByClause<TFields, TSelectedFields>
  | EntityLoaderFieldFragmentOrderByClause<TFields, TSelectedFields>;

/**
 * SQL modifiers that only affect the selection but not the projection.
 */
export interface EntityLoaderQuerySelectionModifiers<
  TFields extends Record<string, any>,
  TSelectedFields extends keyof TFields = keyof TFields,
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

/**
 * Function to be used for constructing search fields based on field names.
 * The function takes a field name and returns a SQLFragment that can be used in the search field portion.
 */
export type EntityLoaderFieldNameConstructorFn<
  TFields extends Record<string, any>,
  TSelectedFields extends keyof TFields = keyof TFields,
> = (fieldName: TSelectedFields) => SQLFragment<TFields>;

/**
 * Specification for a search field that is a manually constructed SQLFragment. Useful for complex search fields that require
 * transformations or combinations of multiple fields, such as `COALESCE(NULLIF(display_name, ''), split_part(full_name, '/', 2))`
 * to search by display name with fallback to full name.
 */
export type EntityLoaderSearchFieldSQLFragmentFnSpecification<
  TFields extends Record<string, any>,
  TSelectedFields extends keyof TFields = keyof TFields,
> = {
  /**
   * Function that constructs the SQLFragment for the search field.
   *
   * @param getFragmentForFieldName - A helper function that takes a field name and returns a SQLFragment for that field, which should be used
   *                                  to construct the final SQLFragment for the search field.
   * @returns a SQLFragment representing the search field, which must reference selected fields through the provided helper function.
   *
   * @example
   * For example, to construct a search field that searches by display name (nullable column) with fallback to full name,
   * the fieldConstructor function could be implemented as follows:
   * ```
   * fieldConstructor: (getFragmentForFieldName) => {
   *   const displayNameFragment = getFragmentForFieldName('display_name');
   *   const fullNameFragment = getFragmentForFieldName('full_name');
   *   return sql`COALESCE(NULLIF(${displayNameFragment}, ''), split_part(${fullNameFragment}, '/', 2))`;
   * }
   * ```
   */
  fieldConstructor: (
    /**
     * Helper function to get a SQLFragment for a given field name, which should be used to construct the final SQLFragment for the search field.
     */
    getFragmentForFieldName: EntityLoaderFieldNameConstructorFn<TFields, TSelectedFields>,
  ) => SQLFragment<Pick<TFields, TSelectedFields>>;
};

/**
 * Set of selected fields that are non-nullable, which can be used for search fields that require non-nullable fields.
 * To use a nullable field as a search field, use an EntityLoaderSearchFieldSQLFragmentFnSpecification with appropriate SQL
 * to handle null values, such as `COALESCE(field_name, '')` to treat nulls as empty strings for searching.
 */
export type NonNullableSelectedFields<
  TFields extends Record<string, any>,
  TSelectedFields extends keyof TFields,
> = TSelectedFields & NonNullableKeys<TFields>;

/**
 * Specification for a search field that can be either a simple selected field name (which must be non-nullable) or a manually constructed
 * SQLFragment using EntityLoaderSearchFieldSQLFragmentFnSpecification.
 */
export type EntityLoaderSearchFieldSpecification<
  TFields extends Record<string, any>,
  TSelectedFields extends keyof TFields = keyof TFields,
> =
  | NonNullableSelectedFields<TFields, TSelectedFields>
  | EntityLoaderSearchFieldSQLFragmentFnSpecification<TFields, TSelectedFields>;

interface SearchSpecificationBase<
  TFields extends Record<string, any>,
  TSelectedFields extends keyof TFields = keyof TFields,
> {
  /**
   * The search term to search for. Must be a non-empty string.
   */
  term: string;

  /**
   * The fields to search within.
   */
  fields: readonly EntityLoaderSearchFieldSpecification<TFields, TSelectedFields>[];
}

interface ILikeSearchSpecification<
  TFields extends Record<string, any>,
  TSelectedFields extends keyof TFields = keyof TFields,
> extends SearchSpecificationBase<TFields, TSelectedFields> {
  /**
   * Case-insensitive pattern matching search using SQL ILIKE operator.
   * Results are ordered by the fields being searched within in the order specified, then by ID for tie-breaking and stable pagination.
   */
  strategy: PaginationStrategy.ILIKE_SEARCH;
}

interface TrigramSearchSpecification<
  TFields extends Record<string, any>,
  TSelectedFields extends keyof TFields = keyof TFields,
> extends SearchSpecificationBase<TFields, TSelectedFields> {
  /**
   * Similarity search using PostgreSQL trigram similarity. Results are ordered by exact match priority, then by similarity score, then by specified extra order by fields if provided, then by ID for tie-breaking and stable pagination.
   * Note that trigram similarity search can be significantly slower than ILIKE search, especially on large datasets without appropriate indexes, and results may not be as relevant as more advanced full-text search solutions.
   * It is recommended to use this strategy only when ILIKE search does not meet the application's needs and to ensure appropriate database indexing for performance.
   */
  strategy: PaginationStrategy.TRIGRAM_SEARCH;

  /**
   * Similarity threshold for trigram matching.
   * Must be between 0 and 1, where:
   * - 0 matches everything
   * - 1 requires exact match
   *
   * Recommended threshold values:
   * - 0.3: Loose matching, allows more variation (default PostgreSQL similarity threshold)
   * - 0.4-0.5: Moderate matching, good balance for most use cases
   * - 0.6+: Strict matching, requires high similarity
   */
  threshold: number;

  /**
   * Optional additional fields to order by after similarity score and before ID for tie-breaking.
   * These fields are independent of search fields and can be used to provide meaningful
   * ordering when multiple results have the same similarity score.
   */
  extraOrderByFields?: readonly EntityLoaderSearchFieldSpecification<TFields, TSelectedFields>[];
}

interface StandardPaginationSpecification<
  TFields extends Record<string, any>,
  TSelectedFields extends keyof TFields = keyof TFields,
> {
  /**
   * Standard pagination without search. Results are ordered by the specified orderBy fields.
   */
  strategy: PaginationStrategy.STANDARD;

  /**
   * Order the entities by specified columns and orders. If the ID field is not included, it will be automatically added for stable pagination.
   */
  orderBy: readonly EntityLoaderOrderByClause<TFields, TSelectedFields>[];
}

/**
 * Pagination specification for SQL-based pagination (with or without search).
 */
export type PaginationSpecification<
  TFields extends Record<string, any>,
  TSelectedFields extends keyof TFields = keyof TFields,
> =
  | StandardPaginationSpecification<TFields, TSelectedFields>
  | ILikeSearchSpecification<TFields, TSelectedFields>
  | TrigramSearchSpecification<TFields, TSelectedFields>;

/**
 * Base unified pagination arguments
 */
interface EntityLoaderBaseUnifiedPaginationArgs<
  TFields extends Record<string, any>,
  TSelectedFields extends keyof TFields = keyof TFields,
> {
  /**
   * SQLFragment representing the WHERE clause to filter the entities being paginated.
   */
  where?: SQLFragment<Pick<TFields, TSelectedFields>>;

  /**
   * Pagination specification determining how to order and paginate results.
   */
  pagination: PaginationSpecification<TFields, TSelectedFields>;
}

/**
 * Forward unified pagination arguments
 */
export interface EntityLoaderForwardUnifiedPaginationArgs<
  TFields extends Record<string, any>,
  TSelectedFields extends keyof TFields = keyof TFields,
> extends EntityLoaderBaseUnifiedPaginationArgs<TFields, TSelectedFields> {
  /**
   * The number of entities to return starting from the entity after the cursor. Must be a positive integer.
   */
  first: number;

  /**
   * The number of entities to return starting from the entity before the cursor. Must be a positive integer.
   * Not allowed with forward pagination.
   */
  last?: never;

  /**
   * The cursor to paginate after for forward pagination.
   */
  after?: string;

  /**
   * The cursor to paginate before for backward pagination.
   * Not allowed with forward pagination.
   */
  before?: never;
}

/**
 * Backward unified pagination arguments
 */
export interface EntityLoaderBackwardUnifiedPaginationArgs<
  TFields extends Record<string, any>,
  TSelectedFields extends keyof TFields = keyof TFields,
> extends EntityLoaderBaseUnifiedPaginationArgs<TFields, TSelectedFields> {
  /**
   * The number of entities to return starting from the entity after the cursor. Must be a positive integer.
   * Not allowed with backward pagination.
   */
  first?: never;

  /**
   * The number of entities to return starting from the entity before the cursor. Must be a positive integer.
   */
  last: number;

  /**
   * The cursor to paginate after for forward pagination.
   * Not allowed with backward pagination.
   */
  after?: never;

  /**
   * The cursor to paginate before for backward pagination.
   */
  before?: string;
}

/**
 * Load page pagination arguments, which can be either forward or backward unified pagination arguments.
 */
export type EntityLoaderLoadPageArgs<
  TFields extends Record<string, any>,
  TSelectedFields extends keyof TFields = keyof TFields,
> =
  | EntityLoaderForwardUnifiedPaginationArgs<TFields, TSelectedFields>
  | EntityLoaderBackwardUnifiedPaginationArgs<TFields, TSelectedFields>;

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
  TSelectedFields extends keyof TFields = keyof TFields,
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
    fieldEqualityOperands: readonly FieldEqualityCondition<TFields, N>[],
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
    fieldEqualityOperands: readonly FieldEqualityCondition<TFields, N>[],
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
   *
   * @deprecated Use loadManyBySQL instead for safer value bindings and more flexible query building.
   */
  async loadManyByRawWhereClauseAsync(
    rawWhereClause: string,
    bindings: any[] | object,
    querySelectionModifiers: EntityLoaderQuerySelectionModifiers<TFields, TSelectedFields> = {},
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
    fragment: SQLFragment<Pick<TFields, TSelectedFields>>,
    modifiers: EntityLoaderQuerySelectionModifiers<TFields, TSelectedFields> = {},
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
   * Load a page of entities with Relay-style cursor pagination using a unified pagination specification.
   * Only returns successfully authorized entities for cursor stability; failed authorization results are filtered out.
   *
   * @returns Connection with only successfully authorized entities
   */
  async loadPageAsync(
    args: EntityLoaderLoadPageArgs<TFields, TSelectedFields>,
  ): Promise<Connection<TEntity>> {
    const pageResult = await this.knexDataManager.loadPageAsync(this.queryContext, args);

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
    };
  }

  /**
   * Authorization-result-based version of the EnforcingKnexEntityLoader method by the same name.
   * @returns The pagination cursor for the given entity.
   */
  getPaginationCursorForEntity(entity: TEntity): string {
    return this.knexDataManager.getCursorForEntityID(entity.getID());
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
    sqlFragment: SQLFragment<Pick<TFields, TSelectedFields>>,
    modifiers: EntityLoaderQuerySelectionModifiers<TFields, TSelectedFields>,
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
