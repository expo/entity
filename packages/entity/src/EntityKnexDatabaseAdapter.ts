import { EntityConfiguration } from './EntityConfiguration';
import {
  FieldEqualityCondition,
  isSingleValueFieldEqualityCondition,
  QuerySelectionModifiers,
  QuerySelectionModifiersWithOrderByRaw,
  TableFieldMultiValueEqualityCondition,
  TableFieldSingleValueEqualityCondition,
  TableQuerySelectionModifiers,
  TableQuerySelectionModifiersWithOrderByRaw,
} from './EntityDatabaseAdapter';
import { EntityQueryContext } from './EntityQueryContext';
import {
  FieldTransformerMap,
  getDatabaseFieldForEntityField,
  transformDatabaseObjectToFields,
} from './internal/EntityFieldTransformationUtils';

/**
 * A database adapter that provides knex-specific query methods for fetching entities.
 * These methods directly query the database without using DataLoader.
 */
export abstract class EntityKnexDatabaseAdapter<
  TFields extends Record<string, any>,
  TIDField extends keyof TFields,
> {
  constructor(
    private readonly entityConfiguration: EntityConfiguration<TFields, TIDField>,
    private readonly fieldTransformerMap: FieldTransformerMap,
  ) {}

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
    queryInterface: any,
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
    queryInterface: any,
    tableName: string,
    rawWhereClause: string,
    bindings: any[] | object,
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