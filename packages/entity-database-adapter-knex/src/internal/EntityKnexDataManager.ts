import {
  EntityQueryContext,
  timeAndLogLoadEventAsync,
  EntityMetricsLoadType,
  IEntityMetricsAdapter,
  EntityConfiguration,
  getDatabaseFieldForEntityField,
  EntityDatabaseAdapterPaginationCursorInvalidError,
} from '@expo/entity';
import assert from 'assert';

import {
  BasePostgresEntityDatabaseAdapter,
  FieldEqualityCondition,
  NullsOrdering,
  OrderByOrdering,
  PostgresOrderByClause,
  PostgresQuerySelectionModifiers,
} from '../BasePostgresEntityDatabaseAdapter';
import { PaginationStrategy } from '../PaginationStrategy';
import { SQLFragment, SQLFragmentHelpers, identifier, raw, sql } from '../SQLOperator';
import { DistributiveOmit, NonNullableKeys } from './utilityTypes';

interface DataManagerStandardSpecification<TFields extends Record<string, any>> {
  strategy: PaginationStrategy.STANDARD;
  orderBy: readonly PostgresOrderByClause<TFields>[];
}

type DataManagerFieldNameConstructorFn<TFields extends Record<string, any>> = (
  fieldName: keyof TFields,
) => SQLFragment;

type DataManagerSearchFieldSQLFragmentFnSpecification<TFields extends Record<string, any>> = {
  fieldConstructor: (
    getFragmentForFieldName: DataManagerFieldNameConstructorFn<TFields>,
  ) => SQLFragment;
};

function isDataManagerSearchFieldSQLFragmentFnSpecification<TFields extends Record<string, any>>(
  obj: keyof TFields | SQLFragment | DataManagerSearchFieldSQLFragmentFnSpecification<TFields>,
): obj is DataManagerSearchFieldSQLFragmentFnSpecification<TFields> {
  return typeof obj === 'object' && obj !== null && 'fieldConstructor' in obj;
}

type DataManagerSearchFieldSpecification<TFields extends Record<string, any>> =
  | NonNullableKeys<TFields>
  | DataManagerSearchFieldSQLFragmentFnSpecification<TFields>;

interface DataManagerSearchSpecificationBase<TFields extends Record<string, any>> {
  term: string;
  fields: readonly DataManagerSearchFieldSpecification<TFields>[];
}

interface DataManagerILikeSearchSpecification<
  TFields extends Record<string, any>,
> extends DataManagerSearchSpecificationBase<TFields> {
  strategy: PaginationStrategy.ILIKE_SEARCH;
}

interface DataManagerTrigramSearchSpecification<
  TFields extends Record<string, any>,
> extends DataManagerSearchSpecificationBase<TFields> {
  strategy: PaginationStrategy.TRIGRAM_SEARCH;
  threshold: number;
  extraOrderByFields?: readonly DataManagerSearchFieldSpecification<TFields>[];
}

type DataManagerSearchSpecification<TFields extends Record<string, any>> =
  | DataManagerILikeSearchSpecification<TFields>
  | DataManagerTrigramSearchSpecification<TFields>;

type DataManagerPaginationSpecification<TFields extends Record<string, any>> =
  | DataManagerStandardSpecification<TFields>
  | DataManagerSearchSpecification<TFields>;

interface BaseUnifiedPaginationArgs<TFields extends Record<string, any>> {
  where?: SQLFragment;
  pagination: DataManagerPaginationSpecification<TFields>;
}

interface ForwardUnifiedPaginationArgs<
  TFields extends Record<string, any>,
> extends BaseUnifiedPaginationArgs<TFields> {
  first: number;
  after?: string;
}

interface BackwardUnifiedPaginationArgs<
  TFields extends Record<string, any>,
> extends BaseUnifiedPaginationArgs<TFields> {
  last: number;
  before?: string;
}

type LoadPageArgs<TFields extends Record<string, any>> =
  | ForwardUnifiedPaginationArgs<TFields>
  | BackwardUnifiedPaginationArgs<TFields>;

/**
 * Edge in a connection
 */
export interface Edge<TNode> {
  cursor: string;
  node: TNode;
}

/**
 * Page information for pagination
 */
export interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor: string | null;
  endCursor: string | null;
}

/**
 * Relay-style Connection type
 */
export interface Connection<TNode> {
  edges: readonly Edge<TNode>[];
  pageInfo: PageInfo;
}

enum PaginationDirection {
  FORWARD = 'forward',
  BACKWARD = 'backward',
}

const CURSOR_ROW_TABLE_ALIAS = 'cursor_row';

interface PaginationProvider<TFields extends Record<string, any>, TIDField extends keyof TFields> {
  whereClause: SQLFragment | undefined;
  buildOrderBy: (direction: PaginationDirection) => readonly PostgresOrderByClause<TFields>[];
  buildCursorCondition: (
    decodedCursorId: TFields[TIDField],
    direction: PaginationDirection,
    orderByClauses: readonly PostgresOrderByClause<TFields>[],
  ) => SQLFragment;
}

/**
 * A knex data manager is responsible for handling non-dataloader-based
 * database operations.
 *
 * @internal
 */
export class EntityKnexDataManager<
  TFields extends Record<string, any>,
  TIDField extends keyof TFields,
> {
  constructor(
    private readonly entityConfiguration: EntityConfiguration<TFields, TIDField>,
    private readonly databaseAdapter: BasePostgresEntityDatabaseAdapter<TFields, TIDField>,
    private readonly metricsAdapter: IEntityMetricsAdapter,
    private readonly entityClassName: string,
  ) {}

  /**
   * Loads many objects matching the conjunction of where clauses constructed from
   * specified field equality operands.
   *
   * @param queryContext - query context in which to perform the load
   * @param fieldEqualityOperands - list of field equality where clause operand specifications
   * @param querySelectionModifiers - limit, offset, and orderBy for the query
   * @returns array of objects matching the query
   */
  async loadManyByFieldEqualityConjunctionAsync<N extends keyof TFields>(
    queryContext: EntityQueryContext,
    fieldEqualityOperands: readonly FieldEqualityCondition<TFields, N>[],
    querySelectionModifiers: PostgresQuerySelectionModifiers<TFields>,
  ): Promise<readonly Readonly<TFields>[]> {
    EntityKnexDataManager.validateOrderByClauses(querySelectionModifiers.orderBy);

    return await timeAndLogLoadEventAsync(
      this.metricsAdapter,
      EntityMetricsLoadType.LOAD_MANY_EQUALITY_CONJUNCTION,
      this.entityClassName,
      queryContext,
    )(
      this.databaseAdapter.fetchManyByFieldEqualityConjunctionAsync(
        queryContext,
        fieldEqualityOperands,
        querySelectionModifiers,
      ),
    );
  }

  /**
   * Loads many objects matching the raw WHERE clause.
   *
   * @param queryContext - query context in which to perform the load
   * @param rawWhereClause - parameterized SQL WHERE clause with positional binding placeholders or named binding placeholders
   * @param bindings - array of positional bindings or object of named bindings
   * @param querySelectionModifiers - limit, offset, orderBy, and orderByRaw for the query
   * @returns array of objects matching the query
   */
  async loadManyByRawWhereClauseAsync(
    queryContext: EntityQueryContext,
    rawWhereClause: string,
    bindings: readonly any[] | object,
    querySelectionModifiers: PostgresQuerySelectionModifiers<TFields>,
  ): Promise<readonly Readonly<TFields>[]> {
    EntityKnexDataManager.validateOrderByClauses(querySelectionModifiers.orderBy);

    return await timeAndLogLoadEventAsync(
      this.metricsAdapter,
      EntityMetricsLoadType.LOAD_MANY_RAW,
      this.entityClassName,
      queryContext,
    )(
      this.databaseAdapter.fetchManyByRawWhereClauseAsync(
        queryContext,
        rawWhereClause,
        bindings,
        querySelectionModifiers,
      ),
    );
  }

  async loadManyBySQLFragmentAsync(
    queryContext: EntityQueryContext,
    sqlFragment: SQLFragment,
    querySelectionModifiers: PostgresQuerySelectionModifiers<TFields>,
  ): Promise<readonly Readonly<TFields>[]> {
    EntityKnexDataManager.validateOrderByClauses(querySelectionModifiers.orderBy);

    return await timeAndLogLoadEventAsync(
      this.metricsAdapter,
      EntityMetricsLoadType.LOAD_MANY_SQL,
      this.entityClassName,
      queryContext,
    )(
      this.databaseAdapter.fetchManyBySQLFragmentAsync(
        queryContext,
        sqlFragment,
        querySelectionModifiers,
      ),
    );
  }

  /**
   * Load a page of objects using cursor-based pagination with unified pagination specification.
   *
   * @remarks
   *
   * This method implements cursor-based pagination using the seek method for efficient pagination even on large datasets
   * given appropriate indexes. Cursors are opaque and encode the necessary information to fetch the next page based on the
   * specified pagination strategy (standard, ILIKE search, or trigram search). For this implementation in particular,
   * the cursor encodes the ID of the last entity in the page to ensure correct pagination for all strategies, even in cases
   * where multiple rows have the same value for all fields other than the ID. If the entity referenced by a cursor has been
   * deleted, the load will return an empty page with `hasNextPage: false`.
   *
   * @param queryContext - query context in which to perform the load
   * @param args - pagination arguments including pagination and first/after or last/before
   * @returns connection with edges containing field objects and page info
   */
  async loadPageAsync(
    queryContext: EntityQueryContext,
    args: LoadPageArgs<TFields>,
  ): Promise<Connection<Readonly<TFields>>> {
    const { where, pagination } = args;

    if (pagination.strategy === PaginationStrategy.STANDARD) {
      // Standard pagination
      EntityKnexDataManager.validateOrderByClauses(pagination.orderBy);
      EntityKnexDataManager.validateOrderByClausesHaveConsistentDirection(pagination.orderBy);

      const idField = this.entityConfiguration.idField;
      const augmentedOrderByClauses = this.augmentOrderByIfNecessary(pagination.orderBy, idField);

      const fieldsToUseInPostgresTupleCursor: readonly (keyof TFields | SQLFragment)[] =
        augmentedOrderByClauses.map((order) =>
          'fieldName' in order ? order.fieldName : order.fieldFragment,
        );

      // Create strategy for regular pagination
      const strategy: PaginationProvider<TFields, TIDField> = {
        whereClause: where,
        buildOrderBy: (direction: PaginationDirection) => {
          // For backward pagination, we flip the ORDER BY and NULLS direction to fetch records
          // in reverse order. This allows us to use a simple "less than" cursor comparison
          // instead of complex SQL. We'll reverse the results array later to restore
          // the original requested order.
          // Example: If user wants last 3 items ordered by name ASC, we:
          // 1. Flip to name DESC to get the last items first
          // 2. Apply cursor with < comparison
          // 3. Reverse the final array to present items in name ASC order
          return direction === PaginationDirection.FORWARD
            ? augmentedOrderByClauses
            : augmentedOrderByClauses.map(
                (clause): PostgresOrderByClause<TFields> => ({
                  ...clause,
                  order:
                    clause.order === OrderByOrdering.ASCENDING
                      ? OrderByOrdering.DESCENDING
                      : OrderByOrdering.ASCENDING,
                  nulls: clause.nulls
                    ? EntityKnexDataManager.flipNullsOrderingSpread(clause.nulls)
                    : undefined,
                }),
              );
        },
        buildCursorCondition: (decodedCursorId, _direction, orderByClauses) => {
          // all clauses are guaranteed to have the same order due to validation, so we can just look at the first one for effective ordering
          const effectiveOrdering = orderByClauses[0]?.order ?? OrderByOrdering.ASCENDING;
          return this.buildCursorCondition(
            decodedCursorId,
            fieldsToUseInPostgresTupleCursor,
            effectiveOrdering,
          );
        },
      };

      return await this.loadPageInternalAsync(queryContext, args, strategy);
    } else {
      // Search pagination (ILIKE or TRIGRAM)
      const search = pagination;

      // Validate search parameters
      assert(search.term.length > 0, 'Search term must be a non-empty string');
      assert(search.fields.length > 0, 'Search fields must be a non-empty array');

      const { searchWhere, searchOrderByClauses } = this.buildSearchConditionAndOrderBy(search);

      // Combine WHERE conditions: base where + search where
      const whereClause =
        where && searchWhere ? SQLFragmentHelpers.and(where, searchWhere) : (where ?? searchWhere);

      const fieldsToUseInPostgresTupleCursor =
        search.strategy === PaginationStrategy.TRIGRAM_SEARCH
          ? // For trigram search, cursor includes extra order by fields (if specified) + ID to ensure stable ordering that matches ORDER BY clause
            [...(search.extraOrderByFields ?? []), this.entityConfiguration.idField]
          : // For ILIKE search, cursor includes search fields + ID to ensure stable ordering that matches ORDER BY clause
            [...search.fields, this.entityConfiguration.idField];

      // Create strategy for search pagination
      const strategy: PaginationProvider<TFields, TIDField> = {
        whereClause,
        buildOrderBy: (direction) => {
          return direction === PaginationDirection.FORWARD
            ? searchOrderByClauses
            : searchOrderByClauses.map(
                (clause): DistributiveOmit<PostgresOrderByClause<TFields>, 'nulls'> => ({
                  ...clause,
                  order:
                    clause.order === OrderByOrdering.ASCENDING
                      ? OrderByOrdering.DESCENDING
                      : OrderByOrdering.ASCENDING,
                }),
              );
        },
        buildCursorCondition: (decodedCursorId, direction) =>
          search.strategy === PaginationStrategy.TRIGRAM_SEARCH
            ? this.buildTrigramCursorCondition(search, decodedCursorId, direction)
            : this.buildCursorCondition(
                decodedCursorId,
                fieldsToUseInPostgresTupleCursor,
                // ILIKE search always orders ASC, so effective ordering matches direction
                direction === PaginationDirection.FORWARD
                  ? OrderByOrdering.ASCENDING
                  : OrderByOrdering.DESCENDING,
              ),
      };

      return await this.loadPageInternalAsync(queryContext, args, strategy);
    }
  }

  getCursorForEntityID(entityID: TFields[TIDField]): string {
    return this.encodeOpaqueCursor(entityID);
  }

  /**
   * Internal method for loading a page with cursor-based pagination.
   * Shared logic for both regular and search pagination.
   */
  private async loadPageInternalAsync(
    queryContext: EntityQueryContext,
    args: LoadPageArgs<TFields>,
    paginationProvider: PaginationProvider<TFields, TIDField>,
  ): Promise<Connection<Readonly<TFields>>> {
    const idField = this.entityConfiguration.idField;

    // Validate pagination arguments
    const maxPageSize = this.databaseAdapter.paginationMaxPageSize;
    const isForward = 'first' in args;
    if (isForward) {
      assert(
        Number.isInteger(args.first) && args.first > 0,
        'first must be an integer greater than 0',
      );
      if (maxPageSize !== undefined) {
        assert(
          args.first <= maxPageSize,
          `first must not exceed maximum page size of ${maxPageSize}`,
        );
      }
    } else {
      assert(
        Number.isInteger(args.last) && args.last > 0,
        'last must be an integer greater than 0',
      );
      if (maxPageSize !== undefined) {
        assert(
          args.last <= maxPageSize,
          `last must not exceed maximum page size of ${maxPageSize}`,
        );
      }
    }

    const direction = isForward ? PaginationDirection.FORWARD : PaginationDirection.BACKWARD;
    const limit = isForward ? args.first : args.last;
    const cursor = isForward ? args.after : args.before;

    // Decode cursor
    const decodedExternalCursorEntityID = cursor ? this.decodeOpaqueCursor(cursor) : null;

    // Get ordering from strategy
    const orderByClauses = paginationProvider.buildOrderBy(direction);

    // Build WHERE clause with cursor condition
    const baseWhere = paginationProvider.whereClause;
    const cursorCondition = decodedExternalCursorEntityID
      ? paginationProvider.buildCursorCondition(
          decodedExternalCursorEntityID,
          direction,
          orderByClauses,
        )
      : null;

    const whereClause = this.combineWhereConditions(baseWhere, cursorCondition);

    // Determine query modifiers
    const queryModifiers: PostgresQuerySelectionModifiers<TFields> = {
      ...(orderByClauses !== undefined && { orderBy: orderByClauses }),
      limit: limit + 1, // Fetch data with limit + 1 to check for more pages
    };

    const fieldObjects = await timeAndLogLoadEventAsync(
      this.metricsAdapter,
      EntityMetricsLoadType.LOAD_PAGE,
      this.entityClassName,
      queryContext,
    )(this.databaseAdapter.fetchManyBySQLFragmentAsync(queryContext, whereClause, queryModifiers));

    // Process results
    const hasMore = fieldObjects.length > limit;
    const pageFieldObjects = hasMore ? fieldObjects.slice(0, limit) : [...fieldObjects];

    if (direction === PaginationDirection.BACKWARD) {
      // Restore the original requested order by reversing the results.
      // We fetched with flipped ORDER BY for efficient cursor comparison,
      // so now we reverse to match the order the user expects.
      pageFieldObjects.reverse();
    }

    // Build edges with cursors
    const edges = pageFieldObjects.map((fieldObject) => ({
      node: fieldObject,
      cursor: this.encodeOpaqueCursor(fieldObject[idField]),
    }));

    const pageInfo: PageInfo = {
      hasNextPage: direction === PaginationDirection.FORWARD ? hasMore : false,
      hasPreviousPage: direction === PaginationDirection.BACKWARD ? hasMore : false,
      startCursor: edges[0]?.cursor ?? null,
      endCursor: edges[edges.length - 1]?.cursor ?? null,
    };

    return {
      edges,
      pageInfo,
    };
  }

  private combineWhereConditions(
    baseWhere: SQLFragment | undefined,
    cursorCondition: SQLFragment | null,
  ): SQLFragment {
    const conditions = [baseWhere, cursorCondition].filter((it) => !!it);
    if (conditions.length === 0) {
      return sql`1 = 1`;
    }
    if (conditions.length === 1) {
      return conditions[0]!;
    }
    // Wrap baseWhere in parens if combining with cursor condition
    // We know we have exactly 2 conditions at this point
    const [first, second] = conditions;
    return sql`(${first}) AND ${second}`;
  }

  private augmentOrderByIfNecessary(
    orderBy: readonly PostgresOrderByClause<TFields>[] | undefined,
    idField: TIDField,
  ): readonly PostgresOrderByClause<TFields>[] {
    const clauses = orderBy ?? [];

    // Always ensure ID is included for stability and cursor correctness. Note that this may add a redundant order by
    // if ID is already included as a fragment, but that is preferable to the risk of incorrect pagination behavior.
    const hasId = clauses.some((spec) => 'fieldName' in spec && spec.fieldName === idField);
    if (!hasId) {
      const lastClauseOrder =
        clauses.length > 0 ? clauses[clauses.length - 1]!.order : OrderByOrdering.ASCENDING;
      return [...clauses, { fieldName: idField, order: lastClauseOrder }];
    }
    return clauses;
  }

  private static flipNullsOrderingSpread(
    nulls: NullsOrdering | undefined,
  ): NullsOrdering | undefined {
    return nulls === NullsOrdering.FIRST ? NullsOrdering.LAST : NullsOrdering.FIRST;
  }

  private static validateOrderByClauses<TFields extends Record<string, any>>(
    orderBy: readonly PostgresOrderByClause<TFields>[] | undefined,
  ): void {
    if (orderBy === undefined) {
      return;
    }
    for (const clause of orderBy) {
      if ('fieldFragment' in clause) {
        const trimmedSql = clause.fieldFragment.sql.trimEnd();
        assert(
          !/\b(ASC|DESC)\s*$/i.test(trimmedSql),
          'fieldFragment must not contain ASC or DESC at the end. Use the order property to specify ordering direction.',
        );
      }
    }
  }

  /**
   * Cursor-based pagination uses Postgres tuple comparison (e.g., (a, b) \> (x, y)) which
   * applies a single comparison direction to all columns. Mixed ordering directions would
   * produce incorrect pagination results.
   */
  private static validateOrderByClausesHaveConsistentDirection<TFields extends Record<string, any>>(
    orderBy: readonly PostgresOrderByClause<TFields>[] | undefined,
  ): void {
    if (orderBy === undefined || orderBy.length <= 1) {
      return;
    }
    const firstOrder = orderBy[0]!.order;
    assert(
      orderBy.every((clause) => clause.order === firstOrder),
      'All orderBy clauses must have the same ordering direction. Mixed ordering directions are not supported with cursor-based pagination.',
    );
  }

  private encodeOpaqueCursor(idField: TFields[TIDField]): string {
    return Buffer.from(JSON.stringify({ id: idField })).toString('base64url');
  }

  private decodeOpaqueCursor(cursor: string): TFields[TIDField] {
    let parsedCursor: any;
    try {
      const decoded = Buffer.from(cursor, 'base64url').toString();
      parsedCursor = JSON.parse(decoded);
    } catch (e) {
      throw new EntityDatabaseAdapterPaginationCursorInvalidError(
        `Failed to decode cursor`,
        e instanceof Error ? e : undefined,
      );
    }

    if (!('id' in parsedCursor)) {
      throw new EntityDatabaseAdapterPaginationCursorInvalidError(
        `Cursor is missing required 'id' field. Parsed cursor: ${JSON.stringify(parsedCursor)}`,
      );
    }

    return parsedCursor.id;
  }

  private resolveSearchFieldToSQLFragment(
    field: keyof TFields | SQLFragment | DataManagerSearchFieldSQLFragmentFnSpecification<TFields>,
    tableAlias?: typeof CURSOR_ROW_TABLE_ALIAS,
  ): SQLFragment {
    if (field instanceof SQLFragment) {
      return field;
    }

    if (isDataManagerSearchFieldSQLFragmentFnSpecification<TFields>(field)) {
      return field.fieldConstructor((fieldName) => {
        const dbField = getDatabaseFieldForEntityField(this.entityConfiguration, fieldName);
        return tableAlias
          ? sql`${raw(tableAlias)}.${identifier(dbField)}`
          : sql`${identifier(dbField)}`;
      });
    }

    const dbField = getDatabaseFieldForEntityField(this.entityConfiguration, field);
    return tableAlias
      ? sql`${raw(tableAlias)}.${identifier(dbField)}`
      : sql`${identifier(dbField)}`;
  }

  private buildCursorCondition(
    decodedExternalCursorEntityID: TFields[TIDField],
    fieldsToUseInPostgresTupleCursor: readonly (
      | keyof TFields
      | SQLFragment
      | DataManagerSearchFieldSQLFragmentFnSpecification<TFields>
    )[],
    effectiveOrdering: OrderByOrdering,
  ): SQLFragment {
    // We build a tuple comparison for fieldsToUseInPostgresTupleCursor fields of the
    // entity identified by the external cursor to ensure correct pagination behavior
    // even in cases where multiple rows have the same value all fields other than id.
    // If the cursor entity has been deleted, the subquery returns no rows and the
    // comparison evaluates to NULL, filtering out all results (empty page).
    const operator = effectiveOrdering === OrderByOrdering.ASCENDING ? '>' : '<';

    const idField = getDatabaseFieldForEntityField(
      this.entityConfiguration,
      this.entityConfiguration.idField,
    );
    const tableName = this.entityConfiguration.tableName;

    const postgresCursorFieldIdentifiers = fieldsToUseInPostgresTupleCursor.map((f) =>
      this.resolveSearchFieldToSQLFragment(f),
    );

    // Build left side of comparison (current row's computed values)
    const leftSide = SQLFragment.joinWithCommaSeparator(...postgresCursorFieldIdentifiers);

    // Build right side using subquery to get computed values for cursor entity.
    // For field names, qualify with the cursor row alias. For SQL fragments,
    // use as-is since unqualified column names resolve to the only table in the subquery.
    const postgresCursorRowFieldIdentifiers = fieldsToUseInPostgresTupleCursor.map((f) =>
      this.resolveSearchFieldToSQLFragment(f, CURSOR_ROW_TABLE_ALIAS),
    );

    // Build SELECT fields for subquery
    const rightSideSubquery = sql`
      SELECT ${SQLFragment.joinWithCommaSeparator(...postgresCursorRowFieldIdentifiers)}
      FROM ${identifier(tableName)} AS ${raw(CURSOR_ROW_TABLE_ALIAS)}
      WHERE ${raw(CURSOR_ROW_TABLE_ALIAS)}.${identifier(idField)} = ${decodedExternalCursorEntityID}
    `;
    return sql`(${leftSide}) ${raw(operator)} (${rightSideSubquery})`;
  }

  private buildILikeConditions(
    search: DataManagerSearchSpecification<TFields>,
    tableAlias?: typeof CURSOR_ROW_TABLE_ALIAS,
  ): readonly SQLFragment[] {
    return search.fields.map((field) => {
      const fieldFragment = this.resolveSearchFieldToSQLFragment(field, tableAlias);
      return sql`${fieldFragment} ILIKE ${'%' + EntityKnexDataManager.escapeILikePattern(search.term) + '%'}`;
    });
  }

  private buildTrigramSimilarityExpressions(
    search: DataManagerSearchSpecification<TFields>,
    tableAlias?: typeof CURSOR_ROW_TABLE_ALIAS,
  ): readonly SQLFragment[] {
    return search.fields.map((field) => {
      const fieldFragment = this.resolveSearchFieldToSQLFragment(field, tableAlias);
      return sql`similarity(${fieldFragment}, ${search.term})`;
    });
  }

  private buildTrigramExactMatchCaseExpression(
    search: DataManagerSearchSpecification<TFields>,
    tableAlias?: typeof CURSOR_ROW_TABLE_ALIAS,
  ): SQLFragment {
    const ilikeConditions = this.buildILikeConditions(search, tableAlias);
    return sql`CASE WHEN ${SQLFragmentHelpers.or(...ilikeConditions)} THEN 1 ELSE 0 END`;
  }

  private buildTrigramSimilarityGreatestExpression(
    search: DataManagerSearchSpecification<TFields>,
    tableAlias?: typeof CURSOR_ROW_TABLE_ALIAS,
  ): SQLFragment {
    const similarityExprs = this.buildTrigramSimilarityExpressions(search, tableAlias);
    return sql`GREATEST(${SQLFragment.joinWithCommaSeparator(...similarityExprs)})`;
  }

  private buildTrigramCursorCondition(
    search: DataManagerTrigramSearchSpecification<TFields>,
    decodedExternalCursorEntityID: TFields[TIDField],
    direction: PaginationDirection,
  ): SQLFragment {
    // For TRIGRAM search, we compute the similarity values using a subquery, similar to normal cursor.
    // If the cursor entity has been deleted, the subquery returns no rows and the
    // comparison evaluates to NULL, filtering out all results (empty page).
    const operator = direction === PaginationDirection.FORWARD ? '<' : '>';
    const idField = getDatabaseFieldForEntityField(
      this.entityConfiguration,
      this.entityConfiguration.idField,
    );

    const exactMatchExpr = this.buildTrigramExactMatchCaseExpression(search);
    const similarityExpr = this.buildTrigramSimilarityGreatestExpression(search);

    // Build extra order by fields
    const extraOrderByFields = search.extraOrderByFields;
    const extraFields =
      extraOrderByFields?.map((f) => this.resolveSearchFieldToSQLFragment(f)) ?? [];

    // Build left side of comparison (current row's computed values)
    const leftSide = SQLFragment.joinWithCommaSeparator(
      exactMatchExpr,
      similarityExpr,
      ...extraFields,
      sql`${identifier(idField)}`,
    );

    // Build right side using subquery to get computed values for cursor entity
    // We need to rebuild the same expressions for the cursor row

    const cursorExactMatchExpr = this.buildTrigramExactMatchCaseExpression(
      search,
      CURSOR_ROW_TABLE_ALIAS,
    );
    const cursorSimilarityExpr = this.buildTrigramSimilarityGreatestExpression(
      search,
      CURSOR_ROW_TABLE_ALIAS,
    );

    const cursorExtraFields =
      extraOrderByFields?.map((f) =>
        this.resolveSearchFieldToSQLFragment(f, CURSOR_ROW_TABLE_ALIAS),
      ) ?? [];

    // Build SELECT fields for subquery
    const selectFields = [
      cursorExactMatchExpr,
      cursorSimilarityExpr,
      ...cursorExtraFields,
      sql`${raw(CURSOR_ROW_TABLE_ALIAS)}.${identifier(idField)}`,
    ];

    const rightSideSubquery = sql`
      SELECT ${SQLFragment.joinWithCommaSeparator(...selectFields)}
      FROM ${identifier(this.entityConfiguration.tableName)} AS ${raw(CURSOR_ROW_TABLE_ALIAS)}
      WHERE ${raw(CURSOR_ROW_TABLE_ALIAS)}.${identifier(idField)} = ${decodedExternalCursorEntityID}
    `;

    return sql`(${leftSide}) ${raw(operator)} (${rightSideSubquery})`;
  }

  private buildSearchConditionAndOrderBy(search: DataManagerSearchSpecification<TFields>): {
    searchWhere: SQLFragment;
    searchOrderByClauses: readonly DistributiveOmit<PostgresOrderByClause<TFields>, 'nulls'>[];
  } {
    switch (search.strategy) {
      case PaginationStrategy.ILIKE_SEARCH: {
        const conditions = this.buildILikeConditions(search);

        // Order by search fields + ID to match cursor fields
        const searchOrderByClauses: PostgresOrderByClause<TFields>[] = [
          ...search.fields.map(
            (field): PostgresOrderByClause<TFields> => ({
              fieldFragment: this.resolveSearchFieldToSQLFragment(field),
              order: OrderByOrdering.ASCENDING,
            }),
          ),
          {
            fieldName: this.entityConfiguration.idField,
            order: OrderByOrdering.ASCENDING,
          },
        ];

        return {
          searchWhere: conditions.length > 0 ? SQLFragmentHelpers.or(...conditions) : sql`1 = 0`,
          searchOrderByClauses,
        };
      }

      case PaginationStrategy.TRIGRAM_SEARCH: {
        // PostgreSQL trigram similarity
        const ilikeConditions = this.buildILikeConditions(search);
        const similarityExprs = this.buildTrigramSimilarityExpressions(search);

        assert(
          search.threshold >= 0 && search.threshold <= 1,
          `Trigram similarity threshold must be between 0 and 1, got ${search.threshold}`,
        );

        const conditions = similarityExprs.map((expr) => sql`${expr} > ${search.threshold}`);

        // Combine exact matches (ILIKE) with similarity
        const allConditions = [...ilikeConditions, ...conditions];

        // Build ORDER BY clauses for trigram search:
        // 1. Exact matches first (ILIKE)
        // 2. Then by similarity score
        // 3. Then by extra fields and ID field for stability
        const searchOrderByClauses: DistributiveOmit<PostgresOrderByClause<TFields>, 'nulls'>[] = [
          {
            fieldFragment: this.buildTrigramExactMatchCaseExpression(search),
            order: OrderByOrdering.DESCENDING,
          },
          {
            fieldFragment: this.buildTrigramSimilarityGreatestExpression(search),
            order: OrderByOrdering.DESCENDING,
          },
          ...(search.extraOrderByFields ?? []).map((field) => ({
            fieldFragment: this.resolveSearchFieldToSQLFragment(field),
            order: OrderByOrdering.DESCENDING,
          })),
          {
            fieldName: this.entityConfiguration.idField,
            order: OrderByOrdering.DESCENDING,
          },
        ];

        return {
          searchWhere: SQLFragmentHelpers.or(...allConditions),
          searchOrderByClauses,
        };
      }
    }
  }

  private static escapeILikePattern(term: string): string {
    return term.replace(/[%_\\]/g, '\\$&');
  }
}
