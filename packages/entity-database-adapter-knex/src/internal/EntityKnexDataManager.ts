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
import { SQLFragment, identifier, raw, sql } from '../SQLOperator';

/**
 * Base pagination arguments
 */
interface BasePaginationArgs<TFields extends Record<string, any>> {
  where?: SQLFragment;
  orderBy?: PostgresOrderByClause<TFields>[];
}

/**
 * Forward pagination arguments
 */
export interface ForwardPaginationArgs<
  TFields extends Record<string, any>,
> extends BasePaginationArgs<TFields> {
  first: number;
  after?: string;
}

/**
 * Backward pagination arguments
 */
export interface BackwardPaginationArgs<
  TFields extends Record<string, any>,
> extends BasePaginationArgs<TFields> {
  last: number;
  before?: string;
}

/**
 * Combined pagination arguments using discriminated union
 */
export type LoadPageArgs<TFields extends Record<string, any>> =
  | ForwardPaginationArgs<TFields>
  | BackwardPaginationArgs<TFields>;

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
   * Load a page of objects using cursor-based pagination.
   *
   * @param queryContext - query context in which to perform the load
   * @param args - pagination arguments including first/after or last/before
   * @param idField - the ID field name for the entity
   * @returns connection with edges containing field objects and page info
   */
  async loadPageBySQLFragmentAsync(
    queryContext: EntityQueryContext,
    args: LoadPageArgs<TFields>,
  ): Promise<Connection<Readonly<TFields>>> {
    const idField = this.entityConfiguration.idField;

    // Validate pagination arguments
    if ('first' in args) {
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

    const isForward = 'first' in args;
    const { where, orderBy } = args;

    let limit: number;
    let cursor: string | undefined;
    if (isForward) {
      limit = args.first;
      cursor = args.after;
    } else {
      limit = args.last;
      cursor = args.before;
    }

    // Augment orderBy with ID field for stability
    const orderByClauses = this.augmentOrderByIfNecessary(orderBy, idField);

    // Build cursor fields from orderBy + id for stability
    const fieldsToUseInPostgresCursor = orderByClauses.map((order) => order.fieldName);

    // Decode cursor
    const decodedExternalCursorEntityID = cursor ? this.decodeOpaqueCursor(cursor) : null;

    // Build WHERE clause with cursor condition for keyset pagination
    const whereClause = this.buildWhereClause({
      ...(where && { where }),
      decodedExternalCursorEntityID,
      fieldsToUseInPostgresCursor,
      direction: isForward ? 'forward' : 'backward',
    });

    // Adjust order for backward pagination
    const finalOrderByClauses = isForward
      ? orderByClauses
      : orderByClauses.map((clause) => ({
          fieldName: clause.fieldName,
          order:
            clause.order === OrderByOrdering.ASCENDING
              ? OrderByOrdering.DESCENDING
              : OrderByOrdering.ASCENDING,
        }));

    // Fetch data with limit + 1 to check for more pages
    const fieldObjects = await timeAndLogLoadEventAsync(
      this.metricsAdapter,
      EntityMetricsLoadType.LOAD_PAGE,
      this.entityClassName,
      queryContext,
    )(
      this.databaseAdapter.fetchManyBySQLFragmentAsync(queryContext, whereClause, {
        orderBy: finalOrderByClauses,
        limit: limit + 1,
      }),
    );

    // Process results
    const hasMore = fieldObjects.length > limit;
    const pageFieldObjects = hasMore ? fieldObjects.slice(0, limit) : [...fieldObjects];

    if (!isForward) {
      pageFieldObjects.reverse();
    }

    // Build edges with cursors
    const edges = pageFieldObjects.map((fieldObject) => ({
      node: fieldObject,
      cursor: this.encodeOpaqueCursor(fieldObject[idField]),
    }));

    const pageInfo: PageInfo = {
      hasNextPage: isForward ? hasMore : false,
      hasPreviousPage: !isForward ? hasMore : false,
      startCursor: edges[0]?.cursor ?? null,
      endCursor: edges[edges.length - 1]?.cursor ?? null,
    };

    return {
      edges,
      pageInfo,
    };
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

  private buildWhereClause(options: {
    where?: SQLFragment;
    decodedExternalCursorEntityID: TFields[TIDField] | null;
    fieldsToUseInPostgresCursor: readonly (keyof TFields)[];
    direction: 'forward' | 'backward';
  }): SQLFragment {
    const { where, decodedExternalCursorEntityID, fieldsToUseInPostgresCursor, direction } =
      options;

    const cursorCondition = decodedExternalCursorEntityID
      ? this.buildCursorCondition(
          decodedExternalCursorEntityID,
          fieldsToUseInPostgresCursor,
          direction === 'forward' ? '>' : '<',
        )
      : null;

    // Combine conditions
    const conditions = [where, cursorCondition].filter((it) => !!it);

    // Return combined WHERE clause or "1 = 1" if no conditions
    return conditions.length > 0 ? SQLFragment.join(conditions, ' AND ') : sql`1 = 1`;
  }

  private buildCursorCondition(
    decodedExternalCursorEntityID: TFields[TIDField],
    fieldsToUseInPostgresCursor: readonly (keyof TFields)[],
    operator: '<' | '>',
  ): SQLFragment {
    // We build a tuple comparison for fieldsToUseInPostgresCursor fields of the
    // entity identified by the external cursor to ensure correct pagination behavior
    // even in cases where multiple rows have the same value all fields other than id.

    const idField = getDatabaseFieldForEntityField(
      this.entityConfiguration,
      this.entityConfiguration.idField,
    );
    const tableName = this.entityConfiguration.tableName;

    const postgresCursorFieldIdentifiers = fieldsToUseInPostgresCursor.map((f) => {
      const dbField = getDatabaseFieldForEntityField(this.entityConfiguration, f);
      return sql`${identifier(dbField)}`;
    });

    // Build left side of comparison (current row's computed values)
    const leftSide = SQLFragment.join(postgresCursorFieldIdentifiers, ', ');

    // Build right side using subquery to get computed values for cursor entity
    const postgresCursorRowFieldIdentifiers = fieldsToUseInPostgresCursor.map((f) => {
      const dbField = getDatabaseFieldForEntityField(this.entityConfiguration, f);
      return sql`cursor_row.${identifier(dbField)}`;
    });

    // Build SELECT fields for subquery
    const rightSideSubquery = sql`
      SELECT ${SQLFragment.join(postgresCursorRowFieldIdentifiers, ', ')}
      FROM ${identifier(tableName)} AS cursor_row
      WHERE cursor_row.${identifier(idField)} = ${decodedExternalCursorEntityID}
    `;
    return sql`(${leftSide}) ${raw(operator)} (${rightSideSubquery})`;
  }
}
