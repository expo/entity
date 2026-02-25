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
  PostgresBaseOrderByClause,
  PostgresOrderByClause,
  PostgresQuerySelectionModifiers,
} from '../BasePostgresEntityDatabaseAdapter';
import { PaginationStrategy } from '../PaginationStrategy';
import { SQLFragment, SQLFragmentHelpers, identifier, raw, sql } from '../SQLOperator';

interface DataManagerStandardSpecification<TFields extends Record<string, any>> {
  strategy: PaginationStrategy.STANDARD;
  orderBy: PostgresOrderByClause<TFields>[];
}

interface DataManagerSearchSpecificationBase<TFields extends Record<string, any>> {
  term: string;
  fields: (keyof TFields)[];
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
  extraOrderBy?: PostgresOrderByClause<TFields>[];
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
  edges: Edge<TNode>[];
  pageInfo: PageInfo;
}

enum PaginationDirection {
  FORWARD = 'forward',
  BACKWARD = 'backward',
}

const CURSOR_ROW_TABLE_ALIAS = 'cursor_row';

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
    fieldEqualityOperands: FieldEqualityCondition<TFields, N>[],
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
    bindings: any[] | object,
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

      const idField = this.entityConfiguration.idField;
      const orderByClauses = this.augmentOrderByIfNecessary(pagination.orderBy, idField);

      return await this.loadPageInternalAsync(queryContext, args, where, orderByClauses);
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

      return await this.loadPageInternalAsync(
        queryContext,
        args,
        whereClause,
        searchOrderByClauses,
      );
    }
  }

  /**
   * Internal method for loading a page with cursor-based pagination.
   * Shared logic for both regular and search pagination.
   *
   * Handles ORDER BY flipping for backward pagination internally:
   * backward pagination flips the ORDER BY direction and nulls ordering,
   * fetches results, then reverses to restore the original order.
   */
  private async loadPageInternalAsync(
    queryContext: EntityQueryContext,
    args: LoadPageArgs<TFields>,
    baseWhere: SQLFragment | undefined,
    orderByClauses: PostgresOrderByClause<TFields>[],
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

    // For backward pagination, flip ORDER BY so the seek method works correctly
    const effectiveOrderBy =
      direction === PaginationDirection.BACKWARD
        ? EntityKnexDataManager.flipOrderByClauses(orderByClauses)
        : orderByClauses;

    // Decode cursor
    const decodedExternalCursorEntityID = cursor ? this.decodeOpaqueCursor(cursor) : null;

    // Build cursor condition using the effective (potentially flipped) ORDER BY
    const cursorCondition = decodedExternalCursorEntityID
      ? this.buildNullAwareCursorCondition(
          effectiveOrderBy.map((clause) => {
            const currentExpr =
              'fieldName' in clause
                ? sql`${identifier(getDatabaseFieldForEntityField(this.entityConfiguration, clause.fieldName))}`
                : clause.fieldFragment;
            const cursorExpr =
              'fieldName' in clause
                ? sql`${raw(CURSOR_ROW_TABLE_ALIAS)}.${identifier(getDatabaseFieldForEntityField(this.entityConfiguration, clause.fieldName))}`
                : clause.fieldFragment;
            return {
              currentExpr,
              cursorExpr,
              ordering: { order: clause.order, nulls: clause.nulls },
            };
          }),
          decodedExternalCursorEntityID,
        )
      : null;

    const whereClause = this.combineWhereConditions(baseWhere, cursorCondition);

    // Determine query modifiers
    const queryModifiers: PostgresQuerySelectionModifiers<TFields> = {
      orderBy: effectiveOrderBy,
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
    orderBy: PostgresOrderByClause<TFields>[] | undefined,
    idField: TIDField,
  ): PostgresOrderByClause<TFields>[] {
    const clauses = orderBy ?? [];

    // Always ensure ID is included for stability and cursor correctness. Note that this may add a redundant order by
    // if ID is already included as a fragment, but that is preferable to the risk of incorrect pagination behavior.
    const hasId = clauses.some((spec) => 'fieldName' in spec && spec.fieldName === idField);
    if (!hasId) {
      return [...clauses, { fieldName: idField, order: OrderByOrdering.ASCENDING }];
    }
    return clauses;
  }

  private static flipOrderByClauses<TFields extends Record<string, any>>(
    clauses: PostgresOrderByClause<TFields>[],
  ): PostgresOrderByClause<TFields>[] {
    return clauses.map((clause) => ({
      ...clause,
      order:
        clause.order === OrderByOrdering.ASCENDING
          ? OrderByOrdering.DESCENDING
          : OrderByOrdering.ASCENDING,
      nulls:
        clause.nulls === undefined
          ? undefined
          : clause.nulls === NullsOrdering.FIRST
            ? NullsOrdering.LAST
            : NullsOrdering.FIRST,
    }));
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

  /**
   * Builds a NULL-aware cursor condition for pagination.
   *
   * Instead of using PostgreSQL tuple comparison (which evaluates to NULL when any element is NULL,
   * breaking cursor pagination across NULL boundaries), this generates an expanded per-column
   * comparison that correctly handles NULLs according to each column's nulls ordering specification.
   *
   * For columns [c1, c2, c3] the expanded form is:
   *   null_after(c1, cursor_c1)
   *   OR (null_eq(c1, cursor_c1) AND null_after(c2, cursor_c2))
   *   OR (null_eq(c1, cursor_c1) AND null_eq(c2, cursor_c2) AND null_after(c3, cursor_c3))
   *
   * Where null_after and null_eq handle NULL values according to the column's ordering specification.
   * This also correctly handles mixed ASC/DESC columns (which tuple comparison does not).
   */
  private buildNullAwareCursorCondition(
    columns: {
      currentExpr: SQLFragment;
      cursorExpr: SQLFragment;
      ordering: PostgresBaseOrderByClause;
    }[],
    cursorEntityId: TFields[TIDField],
  ): SQLFragment {
    const idField = getDatabaseFieldForEntityField(
      this.entityConfiguration,
      this.entityConfiguration.idField,
    );
    const tableName = this.entityConfiguration.tableName;

    // Build the SELECT fields for the cursor subquery, aliasing each as c0, c1, c2, ...
    const selectFields = columns.map((col, i) => sql`${col.cursorExpr} AS ${raw(`c${i}`)}`);

    const subquery = sql`
      SELECT ${SQLFragment.join(selectFields, ', ')}
      FROM ${identifier(tableName)} AS ${raw(CURSOR_ROW_TABLE_ALIAS)}
      WHERE ${raw(CURSOR_ROW_TABLE_ALIAS)}.${identifier(idField)} = ${cursorEntityId}
    `;

    // Build the expanded comparison
    // For each level i, we need: eq(c0) AND eq(c1) AND ... AND eq(c_{i-1}) AND after(c_i)
    const orClauses: SQLFragment[] = [];

    for (let i = 0; i < columns.length; i++) {
      const parts: SQLFragment[] = [];

      // Add equality conditions for all preceding columns
      for (let j = 0; j < i; j++) {
        parts.push(
          EntityKnexDataManager.buildNullAwareEq(columns[j]!.currentExpr, sql`cr.${raw(`c${j}`)}`),
        );
      }

      // Add "comes after" condition for column i
      parts.push(
        EntityKnexDataManager.buildNullAwareAfter(
          columns[i]!.currentExpr,
          sql`cr.${raw(`c${i}`)}`,
          columns[i]!.ordering,
        ),
      );

      if (parts.length === 1) {
        orClauses.push(parts[0]!);
      } else {
        orClauses.push(sql`(${SQLFragment.join(parts, ' AND ')})`);
      }
    }

    const comparison = SQLFragment.join(orClauses, ' OR ');

    // Wrap in a subquery: (SELECT <comparison> FROM (<cursor subquery>) AS cr)
    // When the cursor entity doesn't exist, the subquery returns no rows,
    // so the outer SELECT returns NULL, filtering out all results (empty page).
    return sql`(SELECT ${comparison} FROM (${subquery}) AS cr)`;
  }

  /**
   * NULL-aware equality: returns TRUE when both values are equal (including both NULL).
   */
  private static buildNullAwareEq(currentExpr: SQLFragment, cursorExpr: SQLFragment): SQLFragment {
    return sql`((${currentExpr}) IS NOT DISTINCT FROM (${cursorExpr}))`;
  }

  /**
   * NULL-aware "comes after" comparison for a single column.
   *
   * Given a column's ORDER BY specification, determines if the current row's value
   * sorts strictly after the cursor row's value in that ordering.
   *
   * For NULLS FIRST (nulls sort at the beginning):
   *   - Both NULL → FALSE (equal, not after)
   *   - cursor NULL, current NOT NULL → TRUE (current after null cursor)
   *   - cursor NOT NULL, current NULL → FALSE (current before non-null cursor)
   *   - Both NOT NULL → standard comparison (ASC: \>, DESC: \<)
   *
   * For NULLS LAST (nulls sort at the end):
   *   - Both NULL → FALSE (equal, not after)
   *   - cursor NULL, current NOT NULL → FALSE (cursor at end, current before)
   *   - cursor NOT NULL, current NULL → TRUE (current at end, after non-null cursor)
   *   - Both NOT NULL → standard comparison (ASC: \>, DESC: \<)
   */
  private static buildNullAwareAfter(
    currentExpr: SQLFragment,
    cursorExpr: SQLFragment,
    ordering: PostgresBaseOrderByClause,
  ): SQLFragment {
    // Determine effective nulls ordering (use PostgreSQL defaults if not specified)
    const effectiveNulls =
      ordering.nulls ??
      (ordering.order === OrderByOrdering.ASCENDING ? NullsOrdering.LAST : NullsOrdering.FIRST);

    // Determine comparison operator for non-NULL values
    const op = ordering.order === OrderByOrdering.ASCENDING ? '>' : '<';

    // For NULLS FIRST: current NULL → before cursor (FALSE), cursor NULL → current after (TRUE)
    // For NULLS LAST: current NULL → after cursor (TRUE), cursor NULL → current before (FALSE)
    const currentNullResult = effectiveNulls === NullsOrdering.FIRST ? 'FALSE' : 'TRUE';
    const cursorNullResult = effectiveNulls === NullsOrdering.FIRST ? 'TRUE' : 'FALSE';

    return sql`CASE WHEN (${cursorExpr}) IS NULL AND (${currentExpr}) IS NULL THEN FALSE WHEN (${cursorExpr}) IS NULL THEN ${raw(cursorNullResult)} WHEN (${currentExpr}) IS NULL THEN ${raw(currentNullResult)} ELSE (${currentExpr}) ${raw(op)} (${cursorExpr}) END`;
  }

  private buildILikeConditions(search: DataManagerSearchSpecification<TFields>): SQLFragment[] {
    return search.fields.map((field) => {
      const dbField = getDatabaseFieldForEntityField(this.entityConfiguration, field);
      return sql`${identifier(dbField)} ILIKE ${'%' + EntityKnexDataManager.escapeILikePattern(search.term) + '%'}`;
    });
  }

  private buildTrigramSimilarityExpressions(
    search: DataManagerSearchSpecification<TFields>,
  ): SQLFragment[] {
    return search.fields.map((field) => {
      const dbField = getDatabaseFieldForEntityField(this.entityConfiguration, field);
      return sql`similarity(${identifier(dbField)}, ${search.term})`;
    });
  }

  private buildTrigramExactMatchCaseExpression(
    search: DataManagerSearchSpecification<TFields>,
  ): SQLFragment {
    const ilikeConditions = this.buildILikeConditions(search);
    return sql`CASE WHEN ${SQLFragment.join(ilikeConditions, ' OR ')} THEN 1 ELSE 0 END`;
  }

  private buildTrigramSimilarityGreatestExpression(
    search: DataManagerSearchSpecification<TFields>,
  ): SQLFragment {
    const similarityExprs = this.buildTrigramSimilarityExpressions(search);
    return sql`GREATEST(${SQLFragment.join(similarityExprs, ', ')})`;
  }

  private buildSearchConditionAndOrderBy(search: DataManagerSearchSpecification<TFields>): {
    searchWhere: SQLFragment;
    searchOrderByClauses: PostgresOrderByClause<TFields>[];
  } {
    switch (search.strategy) {
      case PaginationStrategy.ILIKE_SEARCH: {
        const conditions = this.buildILikeConditions(search);

        // Order by search fields + ID to match cursor fields
        const searchOrderByClauses: PostgresOrderByClause<TFields>[] = [
          ...search.fields.map(
            (field): PostgresOrderByClause<TFields> => ({
              fieldName: field,
              order: OrderByOrdering.ASCENDING,
            }),
          ),
          {
            fieldName: this.entityConfiguration.idField,
            order: OrderByOrdering.ASCENDING,
          },
        ];

        return {
          searchWhere: conditions.length > 0 ? SQLFragment.join(conditions, ' OR ') : sql`1 = 0`,
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
        const searchOrderByClauses: PostgresOrderByClause<TFields>[] = [
          {
            fieldFragment: this.buildTrigramExactMatchCaseExpression(search),
            order: OrderByOrdering.DESCENDING,
          },
          {
            fieldFragment: this.buildTrigramSimilarityGreatestExpression(search),
            order: OrderByOrdering.DESCENDING,
          },
          ...(search.extraOrderBy ?? []),
          {
            fieldName: this.entityConfiguration.idField,
            order: OrderByOrdering.DESCENDING,
          },
        ];

        return {
          searchWhere: SQLFragment.join(allConditions, ' OR '),
          searchOrderByClauses,
        };
      }
    }
  }

  private static escapeILikePattern(term: string): string {
    return term.replace(/[%_\\]/g, '\\$&');
  }
}
