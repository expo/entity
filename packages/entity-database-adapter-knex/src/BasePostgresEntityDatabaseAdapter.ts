import {
  EntityDatabaseAdapter,
  EntityQueryContext,
  getDatabaseFieldForEntityField,
  transformDatabaseObjectToFields,
} from '@expo/entity';
import { Knex } from 'knex';

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

/**
 * SQL modifiers that only affect the selection but not the projection.
 */
export interface QuerySelectionModifiers<TFields extends Record<string, any>> {
  /**
   * Order the entities by specified columns and orders.
   */
  orderBy?: {
    /**
     * The field name to order by.
     */
    fieldName: keyof TFields;

    /**
     * The OrderByOrdering to order by.
     */
    order: OrderByOrdering;
  }[];

  /**
   * Skip the specified number of entities queried before returning.
   */
  offset?: number;

  /**
   * Limit the number of entities returned.
   */
  limit?: number;
}

export interface QuerySelectionModifiersWithOrderByRaw<
  TFields extends Record<string, any>,
> extends QuerySelectionModifiers<TFields> {
  /**
   * Order the entities by a raw SQL `ORDER BY` clause.
   */
  orderByRaw?: string;
}

export interface TableQuerySelectionModifiers {
  orderBy:
    | {
        columnName: string;
        order: OrderByOrdering;
      }[]
    | undefined;
  offset: number | undefined;
  limit: number | undefined;
}

export interface TableQuerySelectionModifiersWithOrderByRaw extends TableQuerySelectionModifiers {
  orderByRaw: string | undefined;
}

export abstract class BasePostgresEntityDatabaseAdapter<
  TFields extends Record<string, any>,
  TIDField extends keyof TFields,
> extends EntityDatabaseAdapter<TFields, TIDField> {
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
    querySelectionModifiers: QuerySelectionModifiers<TFields>,
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
    querySelectionModifiers: QuerySelectionModifiersWithOrderByRaw<TFields>,
  ): Promise<readonly Readonly<TFields>[]> {
    const results = await this.fetchManyByRawWhereClauseInternalAsync(
      queryContext.getQueryInterface(),
      this.entityConfiguration.tableName,
      rawWhereClause,
      bindings,
      this.convertToTableQueryModifiersWithOrderByRaw(querySelectionModifiers),
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
    querySelectionModifiers: TableQuerySelectionModifiersWithOrderByRaw,
  ): Promise<object[]>;

  private convertToTableQueryModifiersWithOrderByRaw(
    querySelectionModifiers: QuerySelectionModifiersWithOrderByRaw<TFields>,
  ): TableQuerySelectionModifiersWithOrderByRaw {
    return {
      ...this.convertToTableQueryModifiers(querySelectionModifiers),
      orderByRaw: querySelectionModifiers.orderByRaw,
    };
  }

  private convertToTableQueryModifiers(
    querySelectionModifiers: QuerySelectionModifiers<TFields>,
  ): TableQuerySelectionModifiers {
    const orderBy = querySelectionModifiers.orderBy;
    return {
      orderBy:
        orderBy !== undefined
          ? orderBy.map((orderBySpecification) => ({
              columnName: getDatabaseFieldForEntityField(
                this.entityConfiguration,
                orderBySpecification.fieldName,
              ),
              order: orderBySpecification.order,
            }))
          : undefined,
      offset: querySelectionModifiers.offset,
      limit: querySelectionModifiers.limit,
    };
  }
}
