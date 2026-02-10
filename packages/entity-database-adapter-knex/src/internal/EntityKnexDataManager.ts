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
  OrderByOrdering,
  PostgresOrderByClause,
  PostgresQuerySelectionModifiers,
  PostgresQuerySelectionModifiersWithOrderByFragment,
  PostgresQuerySelectionModifiersWithOrderByRaw,
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
  extraOrderByFields?: (keyof TFields)[];
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

interface PaginationProvider<TFields extends Record<string, any>, TIDField extends keyof TFields> {
  whereClause: SQLFragment | undefined;
  buildOrderBy: (direction: PaginationDirection) => {
    clauses?: PostgresOrderByClause<TFields>[];
    fragment?: SQLFragment | undefined;
  };
  buildCursorCondition: (
    decodedCursorId: TFields[TIDField],
    direction: PaginationDirection,
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
    fieldEqualityOperands: FieldEqualityCondition<TFields, N>[],
    querySelectionModifiers: PostgresQuerySelectionModifiers<TFields>,
  ): Promise<readonly Readonly<TFields>[]> {
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
    querySelectionModifiers: PostgresQuerySelectionModifiersWithOrderByRaw<TFields>,
  ): Promise<readonly Readonly<TFields>[]> {
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
    querySelectionModifiers: PostgresQuerySelectionModifiersWithOrderByFragment<TFields>,
  ): Promise<readonly Readonly<TFields>[]> {
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
      const idField = this.entityConfiguration.idField;
      const augmentedOrderByClauses = this.augmentOrderByIfNecessary(pagination.orderBy, idField);

      const fieldsToUseInPostgresTupleCursor = augmentedOrderByClauses.map(
        (order) => order.fieldName,
      );

      // Create strategy for regular pagination
      const strategy: PaginationProvider<TFields, TIDField> = {
        whereClause: where,
        buildOrderBy: (direction) => {
          // For backward pagination, we flip the ORDER BY direction to fetch records
          // in reverse order. This allows us to use a simple "less than" cursor comparison
          // instead of complex SQL. We'll reverse the results array later to restore
          // the original requested order.
          // Example: If user wants last 3 items ordered by name ASC, we:
          // 1. Flip to name DESC to get the last items first
          // 2. Apply cursor with < comparison
          // 3. Reverse the final array to present items in name ASC order
          const clauses =
            direction === PaginationDirection.FORWARD
              ? augmentedOrderByClauses
              : augmentedOrderByClauses.map((clause) => ({
                  fieldName: clause.fieldName,
                  order:
                    clause.order === OrderByOrdering.ASCENDING
                      ? OrderByOrdering.DESCENDING
                      : OrderByOrdering.ASCENDING,
                }));
          return { clauses };
        },
        buildCursorCondition: (decodedCursorId, direction) =>
          this.buildCursorCondition(decodedCursorId, fieldsToUseInPostgresTupleCursor, direction),
      };

      return await this.loadPageInternalAsync(queryContext, args, strategy);
    } else {
      // Search pagination (ILIKE or TRIGRAM)
      const search = pagination;

      // Validate search parameters
      assert(search.term.length > 0, 'Search term must be a non-empty string');
      assert(search.fields.length > 0, 'Search fields must be a non-empty array');

      const direction =
        'first' in args ? PaginationDirection.FORWARD : PaginationDirection.BACKWARD;
      const { searchWhere, searchOrderByFragment } = this.buildSearchConditionAndOrderBy(
        search,
        direction,
      );

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
        buildOrderBy: () => {
          return { fragment: searchOrderByFragment };
        },
        buildCursorCondition: (decodedCursorId, direction) =>
          search.strategy === PaginationStrategy.TRIGRAM_SEARCH
            ? this.buildTrigramCursorCondition(search, decodedCursorId, direction)
            : this.buildCursorCondition(
                decodedCursorId,
                fieldsToUseInPostgresTupleCursor,
                direction,
              ),
      };

      return await this.loadPageInternalAsync(queryContext, args, strategy);
    }
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
    const isForward = 'first' in args;
    if (isForward) {
      assert(
        Number.isInteger(args.first) && args.first > 0,
        'first must be an integer greater than 0',
      );
    } else {
      assert(
        Number.isInteger(args.last) && args.last > 0,
        'last must be an integer greater than 0',
      );
    }

    const direction = isForward ? PaginationDirection.FORWARD : PaginationDirection.BACKWARD;
    const limit = isForward ? args.first : args.last;
    const cursor = isForward ? args.after : args.before;

    // Decode cursor
    const decodedExternalCursorEntityID = cursor ? this.decodeOpaqueCursor(cursor) : null;

    // Build WHERE clause with cursor condition
    const baseWhere = paginationProvider.whereClause;
    const cursorCondition = decodedExternalCursorEntityID
      ? paginationProvider.buildCursorCondition(decodedExternalCursorEntityID, direction)
      : null;

    const whereClause = this.combineWhereConditions(baseWhere, cursorCondition);

    // Get ordering from strategy
    const { clauses: orderByClauses, fragment: orderByFragment } =
      paginationProvider.buildOrderBy(direction);

    // Determine query modifiers
    const queryModifiers: PostgresQuerySelectionModifiersWithOrderByFragment<TFields> = {
      ...(orderByFragment !== undefined && { orderByFragment }),
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
    orderBy: PostgresOrderByClause<TFields>[] | undefined,
    idField: TIDField,
  ): PostgresOrderByClause<TFields>[] {
    const clauses = orderBy ?? [];

    // Always ensure ID is included for stability and cursor correctness
    const hasId = clauses.some((spec) => spec.fieldName === idField);
    if (!hasId) {
      return [...clauses, { fieldName: idField, order: OrderByOrdering.ASCENDING }];
    }
    return clauses;
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

  private buildCursorCondition(
    decodedExternalCursorEntityID: TFields[TIDField],
    fieldsToUseInPostgresTupleCursor: readonly (keyof TFields)[],
    direction: PaginationDirection,
  ): SQLFragment {
    // We build a tuple comparison for fieldsToUseInPostgresTupleCursor fields of the
    // entity identified by the external cursor to ensure correct pagination behavior
    // even in cases where multiple rows have the same value all fields other than id.
    const operator = direction === PaginationDirection.FORWARD ? '>' : '<';

    const idField = getDatabaseFieldForEntityField(
      this.entityConfiguration,
      this.entityConfiguration.idField,
    );
    const tableName = this.entityConfiguration.tableName;

    const postgresCursorFieldIdentifiers = fieldsToUseInPostgresTupleCursor.map((f) => {
      const dbField = getDatabaseFieldForEntityField(this.entityConfiguration, f);
      return sql`${identifier(dbField)}`;
    });

    // Build left side of comparison (current row's computed values)
    const leftSide = SQLFragment.join(postgresCursorFieldIdentifiers, ', ');

    // Build right side using subquery to get computed values for cursor entity
    const postgresCursorRowFieldIdentifiers = fieldsToUseInPostgresTupleCursor.map((f) => {
      const dbField = getDatabaseFieldForEntityField(this.entityConfiguration, f);
      return sql`${raw(CURSOR_ROW_TABLE_ALIAS)}.${identifier(dbField)}`;
    });

    // Build SELECT fields for subquery
    const rightSideSubquery = sql`
      SELECT ${SQLFragment.join(postgresCursorRowFieldIdentifiers, ', ')}
      FROM ${identifier(tableName)} AS ${raw(CURSOR_ROW_TABLE_ALIAS)}
      WHERE ${raw(CURSOR_ROW_TABLE_ALIAS)}.${identifier(idField)} = ${decodedExternalCursorEntityID}
    `;
    return sql`(${leftSide}) ${raw(operator)} (${rightSideSubquery})`;
  }

  private buildILikeConditions(
    search: DataManagerSearchSpecification<TFields>,
    tableAlias?: typeof CURSOR_ROW_TABLE_ALIAS,
  ): SQLFragment[] {
    return search.fields.map((field) => {
      const dbField = getDatabaseFieldForEntityField(this.entityConfiguration, field);
      const fieldIdentifier = tableAlias
        ? sql`${raw(tableAlias)}.${identifier(dbField)}`
        : sql`${identifier(dbField)}`;
      return sql`${fieldIdentifier} ILIKE ${'%' + EntityKnexDataManager.escapeILikePattern(search.term) + '%'}`;
    });
  }

  private buildTrigramSimilarityExpressions(
    search: DataManagerSearchSpecification<TFields>,
    tableAlias?: typeof CURSOR_ROW_TABLE_ALIAS,
  ): SQLFragment[] {
    return search.fields.map((field) => {
      const dbField = getDatabaseFieldForEntityField(this.entityConfiguration, field);
      const fieldIdentifier = tableAlias
        ? sql`${raw(tableAlias)}.${identifier(dbField)}`
        : sql`${identifier(dbField)}`;
      return sql`similarity(${fieldIdentifier}, ${search.term})`;
    });
  }

  private buildTrigramExactMatchCaseExpression(
    search: DataManagerSearchSpecification<TFields>,
    tableAlias?: typeof CURSOR_ROW_TABLE_ALIAS,
  ): SQLFragment {
    const ilikeConditions = this.buildILikeConditions(search, tableAlias);
    return sql`CASE WHEN ${SQLFragment.join(ilikeConditions, ' OR ')} THEN 1 ELSE 0 END`;
  }

  private buildTrigramSimilarityGreatestExpression(
    search: DataManagerSearchSpecification<TFields>,
    tableAlias?: typeof CURSOR_ROW_TABLE_ALIAS,
  ): SQLFragment {
    const similarityExprs = this.buildTrigramSimilarityExpressions(search, tableAlias);
    return sql`GREATEST(${SQLFragment.join(similarityExprs, ', ')})`;
  }

  private buildTrigramCursorCondition(
    search: DataManagerTrigramSearchSpecification<TFields>,
    decodedExternalCursorEntityID: TFields[TIDField],
    direction: PaginationDirection,
  ): SQLFragment {
    // For TRIGRAM search, we compute the similarity values using a subquery, similar to normal cursor
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
      extraOrderByFields?.map((f) => {
        const dbField = getDatabaseFieldForEntityField(this.entityConfiguration, f);
        return sql`${identifier(dbField)}`;
      }) ?? [];

    // Build left side of comparison (current row's computed values)
    const leftSide = SQLFragment.join(
      [exactMatchExpr, similarityExpr, ...extraFields, sql`${identifier(idField)}`],
      ', ',
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
      extraOrderByFields?.map((f) => {
        const dbField = getDatabaseFieldForEntityField(this.entityConfiguration, f);
        return sql`${raw(CURSOR_ROW_TABLE_ALIAS)}.${identifier(dbField)}`;
      }) ?? [];

    // Build SELECT fields for subquery
    const selectFields = [
      cursorExactMatchExpr,
      cursorSimilarityExpr,
      ...cursorExtraFields,
      sql`${raw(CURSOR_ROW_TABLE_ALIAS)}.${identifier(idField)}`,
    ];

    const rightSideSubquery = sql`
      SELECT ${SQLFragment.join(selectFields, ', ')}
      FROM ${identifier(this.entityConfiguration.tableName)} AS ${raw(CURSOR_ROW_TABLE_ALIAS)}
      WHERE ${raw(CURSOR_ROW_TABLE_ALIAS)}.${identifier(idField)} = ${decodedExternalCursorEntityID}
    `;

    return sql`(${leftSide}) ${raw(operator)} (${rightSideSubquery})`;
  }

  private buildSearchConditionAndOrderBy(
    search: DataManagerSearchSpecification<TFields>,
    direction: PaginationDirection,
  ): {
    searchWhere: SQLFragment;
    searchOrderByFragment: SQLFragment | undefined;
  } {
    switch (search.strategy) {
      case PaginationStrategy.ILIKE_SEARCH: {
        const conditions = this.buildILikeConditions(search);

        // Order by search fields + ID to match cursor fields
        const orderByFields = [...search.fields, this.entityConfiguration.idField].map((field) => {
          const dbField = getDatabaseFieldForEntityField(this.entityConfiguration, field);
          return sql`${identifier(dbField)} ${raw(
            direction === PaginationDirection.FORWARD ? 'ASC' : 'DESC',
          )}`;
        });

        return {
          searchWhere: conditions.length > 0 ? SQLFragment.join(conditions, ' OR ') : sql`1 = 0`,
          searchOrderByFragment: SQLFragment.join(orderByFields, ', '),
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

        // Build ORDER BY components
        const exactMatchPriority = this.buildTrigramExactMatchPriority(ilikeConditions, direction);
        const similarityRanking = this.buildTrigramSimilarityRanking(search, direction);
        const tieBreakers = this.buildTrigramTieBreakers(search, direction);

        return {
          searchWhere: SQLFragment.join(allConditions, ' OR '),
          // For trigram search, order by relevance with direction-aware ordering
          // 1. Exact matches first (ILIKE)
          // 2. Then by similarity score
          // 3. Then by extra fields and ID field for stability
          searchOrderByFragment: SQLFragment.join(
            [exactMatchPriority, similarityRanking, tieBreakers],
            ', ',
          ),
        };
      }
    }
  }

  /**
   * Builds the exact match priority component of the ORDER BY clause for trigram search.
   * Exact matches (via ILIKE) are prioritized over similarity matches.
   */
  private buildTrigramExactMatchPriority(
    ilikeConditions: SQLFragment[],
    direction: PaginationDirection,
  ): SQLFragment {
    const sortOrder = direction === PaginationDirection.FORWARD ? 'DESC' : 'ASC';
    const exactMatchCondition = SQLFragment.join(ilikeConditions, ' OR ');
    return sql`CASE WHEN ${exactMatchCondition} THEN 1 ELSE 0 END ${raw(sortOrder)}`;
  }

  /**
   * Builds the similarity score ranking component of the ORDER BY clause.
   * Uses the highest similarity score across all search fields.
   */
  private buildTrigramSimilarityRanking(
    search: DataManagerSearchSpecification<TFields>,
    direction: PaginationDirection,
  ): SQLFragment {
    const sortOrder = direction === PaginationDirection.FORWARD ? 'DESC' : 'ASC';
    const similarityGreatestExpr = this.buildTrigramSimilarityGreatestExpression(search);
    return sql`${similarityGreatestExpr} ${raw(sortOrder)}`;
  }

  /**
   * Builds the tie-breaker fields component of the ORDER BY clause.
   * Includes extra order-by fields (if specified) and always includes the ID field for stability.
   */
  private buildTrigramTieBreakers(
    search: DataManagerTrigramSearchSpecification<TFields>,
    direction: PaginationDirection,
  ): SQLFragment {
    const idField = getDatabaseFieldForEntityField(
      this.entityConfiguration,
      this.entityConfiguration.idField,
    );

    const extraOrderByFields = search.extraOrderByFields?.map((field) =>
      getDatabaseFieldForEntityField(this.entityConfiguration, field),
    );

    const sortOrder = direction === PaginationDirection.FORWARD ? 'DESC' : 'ASC';

    const allTieBreakerFields = [...(extraOrderByFields ?? []), idField];
    const tieBreakerClauses = allTieBreakerFields.map(
      (field) => sql`${identifier(field)} ${raw(sortOrder)}`,
    );

    return SQLFragment.join(tieBreakerClauses, ', ');
  }

  private static escapeILikePattern(term: string): string {
    return term.replace(/[%_\\]/g, '\\$&');
  }
}
