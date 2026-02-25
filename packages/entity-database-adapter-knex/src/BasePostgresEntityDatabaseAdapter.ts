import {
  EntityDatabaseAdapter,
  EntityQueryContext,
  getDatabaseFieldForEntityField,
  transformDatabaseObjectToFields,
} from '@expo/entity';
import { Knex } from 'knex';

import { SQLFragment } from './SQLOperator';

/**
 * Equality operand that is used for selecting entities with a field with a single value.
 */
export interface SingleValueFieldEqualityCondition<
  TFields extends Record<string, any>,
  N extends keyof TFields = keyof TFields,
> {
  fieldName: N;
  fieldValue: TFields[N];
}

/**
 * Equality operand that is used for selecting entities with a field matching one of multiple values.
 */
export interface MultiValueFieldEqualityCondition<
  TFields extends Record<string, any>,
  N extends keyof TFields = keyof TFields,
> {
  fieldName: N;
  fieldValues: readonly TFields[N][];
}

/**
 * A single equality operand for use in a selection clause.
 * See EntityLoader.loadManyByFieldEqualityConjunctionAsync documentation for examples.
 */
export type FieldEqualityCondition<
  TFields extends Record<string, any>,
  N extends keyof TFields = keyof TFields,
> = SingleValueFieldEqualityCondition<TFields, N> | MultiValueFieldEqualityCondition<TFields, N>;

export function isSingleValueFieldEqualityCondition<
  TFields extends Record<string, any>,
  N extends keyof TFields = keyof TFields,
>(
  condition: FieldEqualityCondition<TFields, N>,
): condition is SingleValueFieldEqualityCondition<TFields, N> {
  return (condition as SingleValueFieldEqualityCondition<TFields, N>).fieldValue !== undefined;
}

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

export type PostgresBaseOrderByClause = {
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

export type PostgresFieldOrderByClause<TFields extends Record<string, any>> =
  PostgresBaseOrderByClause & {
    /**
     * The field name to order by.
     */
    fieldName: keyof TFields;
  };

export type PostgresFragmentOrderByClause = PostgresBaseOrderByClause & {
  /**
   * A raw SQL fragment to order by. Must not contain ASC or DESC, as ordering direction is determined by the `order` property.
   */
  fieldFragment: SQLFragment;
};

export type PostgresOrderByClause<TFields extends Record<string, any>> =
  | PostgresFieldOrderByClause<TFields>
  | PostgresFragmentOrderByClause;

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

export type TableOrderByClause =
  | {
      columnName: string;
      order: OrderByOrdering;
      nulls: NullsOrdering | undefined;
    }
  | {
      columnFragment: SQLFragment;
      order: OrderByOrdering;
      nulls: NullsOrdering | undefined;
    };

export interface TableQuerySelectionModifiers {
  orderBy: TableOrderByClause[] | undefined;
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
   * specified field equality operands.
   *
   * @param queryContext - query context with which to perform the fetch
   * @param fieldEqualityOperands - list of field equality where clause operand specifications
   * @param querySelectionModifiers - limit, offset, orderBy, and orderByRaw for the query
   * @returns array of objects matching the query
   */
  async fetchManyByFieldEqualityConjunctionAsync<N extends keyof TFields>(
    queryContext: EntityQueryContext,
    fieldEqualityOperands: FieldEqualityCondition<TFields, N>[],
    querySelectionModifiers: PostgresQuerySelectionModifiers<TFields>,
  ): Promise<readonly Readonly<TFields>[]> {
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
    querySelectionModifiers: TableQuerySelectionModifiers,
  ): Promise<object[]>;

  /**
   * Fetch many objects matching the raw WHERE clause.
   *
   * @param queryContext - query context with which to perform the fetch
   * @param rawWhereClause - parameterized SQL WHERE clause with positional binding placeholders or named binding placeholders
   * @param bindings - array of positional bindings or object of named bindings
   * @param querySelectionModifiers - limit, offset, and orderBy for the query
   * @returns array of objects matching the query
   */
  async fetchManyByRawWhereClauseAsync(
    queryContext: EntityQueryContext,
    rawWhereClause: string,
    bindings: any[] | object,
    querySelectionModifiers: PostgresQuerySelectionModifiers<TFields>,
  ): Promise<readonly Readonly<TFields>[]> {
    const results = await this.fetchManyByRawWhereClauseInternalAsync(
      queryContext.getQueryInterface(),
      this.entityConfiguration.tableName,
      rawWhereClause,
      bindings,
      this.convertToTableQueryModifiers(querySelectionModifiers),
    );

    return results.map((result) =>
      transformDatabaseObjectToFields(this.entityConfiguration, this.fieldTransformerMap, result),
    );
  }

  protected abstract fetchManyByRawWhereClauseInternalAsync(
    queryInterface: Knex,
    tableName: string,
    rawWhereClause: string,
    bindings: object | any[],
    querySelectionModifiers: TableQuerySelectionModifiers,
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
    sqlFragment: SQLFragment,
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
    sqlFragment: SQLFragment,
    querySelectionModifiers: TableQuerySelectionModifiers,
  ): Promise<object[]>;

  private convertToTableQueryModifiers(
    querySelectionModifiers: PostgresQuerySelectionModifiers<TFields>,
  ): TableQuerySelectionModifiers {
    const orderBy = querySelectionModifiers.orderBy;
    return {
      orderBy:
        orderBy !== undefined
          ? orderBy.map((orderBySpecification): TableOrderByClause => {
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
