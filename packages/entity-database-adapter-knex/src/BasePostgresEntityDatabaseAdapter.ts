import type { EntityQueryContext, FieldEqualityCondition } from '@expo/entity';
import {
  EntityDatabaseAdapter,
  getDatabaseFieldForEntityField,
  isSingleValueFieldEqualityCondition,
  transformDatabaseObjectToFields,
} from '@expo/entity';
import type { Knex } from 'knex';

import type { SQLFragment } from './SQLOperator.ts';

export interface TableFieldSingleValueEqualityCondition {
  tableField: string;
  tableValue: any;
}

export interface TableFieldMultiValueEqualityCondition {
  tableField: string;
  tableValues: readonly any[];
}

export enum NullsOrdering {
  FIRST = 'first',
  LAST = 'last',
}

/**
 * Ordering options for `orderBy` clauses.
 */
export enum OrderByOrdering {
  /**
   * Ascending order (lowest to highest).
   * Ascending order puts smaller values first, where "smaller" is defined in terms of the %3C operator.
   */
  ASCENDING = 'asc',

  /**
   * Descending order (highest to lowest).
   * Descending order puts larger values first, where "larger" is defined in terms of the %3E operator.
   */
  DESCENDING = 'desc',
}

export type PostgresOrderByClause<TFields extends Record<string, any>> =
  | {
      /**
       * The field name to order by.
       */
      fieldName: keyof TFields;

      /**
       * The OrderByOrdering to order by.
       */
      order: OrderByOrdering;

      /**
       * Optional nulls ordering. If not provided, the database default is used
       * (NULLS LAST for ASC, NULLS FIRST for DESC in PostgreSQL).
       */
      nulls?: NullsOrdering | undefined;
    }
  | {
      /**
       * A raw SQL fragment to order by. May not contain ASC or DESC, as ordering direction is determined by the `order` property.
       */
      fieldFragment: SQLFragment<TFields>;

      /**
       * The OrderByOrdering to order by.
       */
      order: OrderByOrdering;

      /**
       * Optional nulls ordering. If not provided, the database default is used
       * (NULLS LAST for ASC, NULLS FIRST for DESC in PostgreSQL).
       */
      nulls?: NullsOrdering | undefined;
    };

/**
 * SQL modifiers that only affect the selection but not the projection.
 */
export interface PostgresQuerySelectionModifiers<TFields extends Record<string, any>> {
  /**
   * Order the entities by specified columns and orders.
   */
  orderBy?: readonly PostgresOrderByClause<TFields>[];

  /**
   * Skip the specified number of entities queried before returning.
   */
  offset?: number;

  /**
   * Limit the number of entities returned.
   */
  limit?: number;
}

export type TableOrderByClause<TFields extends Record<string, any>> =
  | {
      columnName: string;
      order: OrderByOrdering;
      nulls: NullsOrdering | undefined;
    }
  | {
      columnFragment: SQLFragment<TFields>;
      order: OrderByOrdering;
      nulls: NullsOrdering | undefined;
    };

export interface TableQuerySelectionModifiers<TFields extends Record<string, any>> {
  orderBy: TableOrderByClause<TFields>[] | undefined;
  offset: number | undefined;
  limit: number | undefined;
}

export abstract class BasePostgresEntityDatabaseAdapter<
  TFields extends Record<string, any>,
  TIDField extends keyof TFields,
> extends EntityDatabaseAdapter<TFields, TIDField> {
  /**
   * Get the maximum page size for pagination.
   * @returns maximum page size if configured, undefined otherwise
   */
  get paginationMaxPageSize(): number | undefined {
    return undefined;
  }
  /**
   * Fetch many objects matching the conjunction of where clauses constructed from
   * specified field equality operands. Overrides the base entity adapter implementation
   * to push the conjunction filter all the way down to SQL.
   *
   * @param queryContext - query context with which to perform the fetch
   * @param fieldEqualityOperands - list of field equality where clause operand specifications
   * @param querySelectionModifiers - limit, offset, orderBy, and orderByRaw for the query.
   *   Optional; when omitted the entire conjunction is returned in arbitrary order.
   * @returns array of objects matching the query
   */
  override async fetchManyByFieldEqualityConjunctionAsync<N extends keyof TFields>(
    queryContext: EntityQueryContext,
    fieldEqualityOperands: readonly FieldEqualityCondition<TFields, N>[],
    querySelectionModifiers: PostgresQuerySelectionModifiers<TFields> = {},
  ): Promise<readonly Readonly<TFields>[]> {
    const combinedOperands: readonly FieldEqualityCondition<TFields, N>[] = [
      ...fieldEqualityOperands,
      ...(this.entityConfiguration.inherentFilters as readonly FieldEqualityCondition<
        TFields,
        N
      >[]),
    ];

    const tableFieldSingleValueOperands: TableFieldSingleValueEqualityCondition[] = [];
    const tableFieldMultipleValueOperands: TableFieldMultiValueEqualityCondition[] = [];
    for (const operand of combinedOperands) {
      if (isSingleValueFieldEqualityCondition(operand)) {
        tableFieldSingleValueOperands.push({
          tableField: getDatabaseFieldForEntityField(this.entityConfiguration, operand.fieldName),
          tableValue: operand.fieldValue,
        });
      } else {
        tableFieldMultipleValueOperands.push({
          tableField: getDatabaseFieldForEntityField(this.entityConfiguration, operand.fieldName),
          tableValues: operand.fieldValues,
        });
      }
    }

    const results = await this.fetchManyByFieldEqualityConjunctionInternalAsync(
      queryContext.getQueryInterface(),
      this.entityConfiguration.tableName,
      tableFieldSingleValueOperands,
      tableFieldMultipleValueOperands,
      this.convertToTableQueryModifiers(querySelectionModifiers),
    );

    return results.map((result) =>
      transformDatabaseObjectToFields(this.entityConfiguration, this.fieldTransformerMap, result),
    );
  }

  protected abstract fetchManyByFieldEqualityConjunctionInternalAsync(
    queryInterface: Knex,
    tableName: string,
    tableFieldSingleValueEqualityOperands: TableFieldSingleValueEqualityCondition[],
    tableFieldMultiValueEqualityOperands: TableFieldMultiValueEqualityCondition[],
    querySelectionModifiers: TableQuerySelectionModifiers<TFields>,
  ): Promise<object[]>;

  /**
   * Fetch many objects matching the SQL fragment.
   *
   * @param queryContext - query context with which to perform the fetch
   * @param sqlFragment - SQLFragment for the WHERE clause of the query
   * @param querySelectionModifiers - limit, offset, and orderByFragment for the query
   * @returns array of objects matching the query
   */
  async fetchManyBySQLFragmentAsync(
    queryContext: EntityQueryContext,
    sqlFragment: SQLFragment<TFields>,
    querySelectionModifiers: PostgresQuerySelectionModifiers<TFields>,
  ): Promise<readonly Readonly<TFields>[]> {
    const results = await this.fetchManyBySQLFragmentInternalAsync(
      queryContext.getQueryInterface(),
      this.entityConfiguration.tableName,
      sqlFragment,
      this.convertToTableQueryModifiers(querySelectionModifiers),
    );

    return results.map((result) =>
      transformDatabaseObjectToFields(this.entityConfiguration, this.fieldTransformerMap, result),
    );
  }

  protected abstract fetchManyBySQLFragmentInternalAsync(
    queryInterface: Knex,
    tableName: string,
    sqlFragment: SQLFragment<TFields>,
    querySelectionModifiers: TableQuerySelectionModifiers<TFields>,
  ): Promise<object[]>;

  /**
   * Count objects matching the conjunction of where clauses constructed from
   * specified field equality operands.
   *
   * @param queryContext - query context with which to perform the count
   * @param fieldEqualityOperands - list of field equality where clause operand specifications
   * @returns count of objects matching the query
   */
  async countByFieldEqualityConjunctionAsync<N extends keyof TFields>(
    queryContext: EntityQueryContext,
    fieldEqualityOperands: readonly FieldEqualityCondition<TFields, N>[],
  ): Promise<number> {
    const tableFieldSingleValueOperands: TableFieldSingleValueEqualityCondition[] = [];
    const tableFieldMultipleValueOperands: TableFieldMultiValueEqualityCondition[] = [];
    for (const operand of fieldEqualityOperands) {
      if (isSingleValueFieldEqualityCondition(operand)) {
        tableFieldSingleValueOperands.push({
          tableField: getDatabaseFieldForEntityField(this.entityConfiguration, operand.fieldName),
          tableValue: operand.fieldValue,
        });
      } else {
        tableFieldMultipleValueOperands.push({
          tableField: getDatabaseFieldForEntityField(this.entityConfiguration, operand.fieldName),
          tableValues: operand.fieldValues,
        });
      }
    }

    return await this.countByFieldEqualityConjunctionInternalAsync(
      queryContext.getQueryInterface(),
      this.entityConfiguration.tableName,
      tableFieldSingleValueOperands,
      tableFieldMultipleValueOperands,
    );
  }

  protected abstract countByFieldEqualityConjunctionInternalAsync(
    queryInterface: Knex,
    tableName: string,
    tableFieldSingleValueEqualityOperands: TableFieldSingleValueEqualityCondition[],
    tableFieldMultiValueEqualityOperands: TableFieldMultiValueEqualityCondition[],
  ): Promise<number>;

  /**
   * Count objects matching the SQL fragment.
   *
   * @param queryContext - query context with which to perform the count
   * @param sqlFragment - SQLFragment for the WHERE clause of the query
   * @returns count of objects matching the query
   */
  async countBySQLFragmentAsync(
    queryContext: EntityQueryContext,
    sqlFragment: SQLFragment<TFields>,
  ): Promise<number> {
    return await this.countBySQLFragmentInternalAsync(
      queryContext.getQueryInterface(),
      this.entityConfiguration.tableName,
      sqlFragment,
    );
  }

  protected abstract countBySQLFragmentInternalAsync(
    queryInterface: Knex,
    tableName: string,
    sqlFragment: SQLFragment<TFields>,
  ): Promise<number>;

  private convertToTableQueryModifiers(
    querySelectionModifiers: PostgresQuerySelectionModifiers<TFields>,
  ): TableQuerySelectionModifiers<TFields> {
    const orderBy = querySelectionModifiers.orderBy;
    return {
      orderBy:
        orderBy !== undefined
          ? orderBy.map((orderBySpecification): TableOrderByClause<TFields> => {
              if ('fieldName' in orderBySpecification) {
                return {
                  columnName: getDatabaseFieldForEntityField(
                    this.entityConfiguration,
                    orderBySpecification.fieldName,
                  ),
                  order: orderBySpecification.order,
                  nulls: orderBySpecification.nulls,
                };
              } else {
                return {
                  columnFragment: orderBySpecification.fieldFragment,
                  order: orderBySpecification.order,
                  nulls: orderBySpecification.nulls,
                };
              }
            })
          : undefined,
      offset: querySelectionModifiers.offset,
      limit: querySelectionModifiers.limit,
    };
  }
}
