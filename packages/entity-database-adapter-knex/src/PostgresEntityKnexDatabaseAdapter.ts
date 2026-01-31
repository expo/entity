import {
  EntityConfiguration,
  EntityKnexDatabaseAdapter,
  FieldTransformerMap,
  TableFieldMultiValueEqualityCondition,
  TableFieldSingleValueEqualityCondition,
  TableQuerySelectionModifiers,
  TableQuerySelectionModifiersWithOrderByRaw,
} from '@expo/entity';
import { Knex } from 'knex';

import { wrapNativePostgresCallAsync } from './errors/wrapNativePostgresCallAsync';

export class PostgresEntityKnexDatabaseAdapter<
  TFields extends Record<string, any>,
  TIDField extends keyof TFields,
> extends EntityKnexDatabaseAdapter<TFields, TIDField> {
  constructor(
    entityConfiguration: EntityConfiguration<TFields, TIDField>,
    fieldTransformerMap: FieldTransformerMap,
  ) {
    super(entityConfiguration, fieldTransformerMap);
  }

  private applyQueryModifiersToQueryOrderByRaw(
    query: Knex.QueryBuilder,
    querySelectionModifiers: TableQuerySelectionModifiersWithOrderByRaw,
  ): Knex.QueryBuilder {
    let ret = this.applyQueryModifiersToQuery(query, querySelectionModifiers);

    const { orderByRaw } = querySelectionModifiers;
    if (orderByRaw !== undefined) {
      ret = ret.orderByRaw(orderByRaw);
    }

    return ret;
  }

  private applyQueryModifiersToQuery(
    query: Knex.QueryBuilder,
    querySelectionModifiers: TableQuerySelectionModifiers,
  ): Knex.QueryBuilder {
    const { orderBy, offset, limit } = querySelectionModifiers;

    let ret = query;

    if (orderBy !== undefined) {
      for (const orderBySpecification of orderBy) {
        ret = ret.orderBy(orderBySpecification.columnName, orderBySpecification.order);
      }
    }

    if (offset !== undefined) {
      ret = ret.offset(offset);
    }

    if (limit !== undefined) {
      ret = ret.limit(limit);
    }

    return ret;
  }

  protected async fetchManyByFieldEqualityConjunctionInternalAsync(
    queryInterface: Knex,
    tableName: string,
    tableFieldSingleValueEqualityOperands: TableFieldSingleValueEqualityCondition[],
    tableFieldMultiValueEqualityOperands: TableFieldMultiValueEqualityCondition[],
    querySelectionModifiers: TableQuerySelectionModifiers,
  ): Promise<object[]> {
    let query = queryInterface.select().from(tableName);

    if (tableFieldSingleValueEqualityOperands.length > 0) {
      const whereObject: { [key: string]: any } = {};
      const nonNullTableFieldSingleValueEqualityOperands =
        tableFieldSingleValueEqualityOperands.filter(({ tableValue }) => tableValue !== null);
      const nullTableFieldSingleValueEqualityOperands =
        tableFieldSingleValueEqualityOperands.filter(({ tableValue }) => tableValue === null);

      if (nonNullTableFieldSingleValueEqualityOperands.length > 0) {
        for (const { tableField, tableValue } of nonNullTableFieldSingleValueEqualityOperands) {
          whereObject[tableField] = tableValue;
        }
        query = query.where(whereObject);
      }
      if (nullTableFieldSingleValueEqualityOperands.length > 0) {
        for (const { tableField } of nullTableFieldSingleValueEqualityOperands) {
          query = query.whereNull(tableField);
        }
      }
    }

    if (tableFieldMultiValueEqualityOperands.length > 0) {
      for (const { tableField, tableValues } of tableFieldMultiValueEqualityOperands) {
        const nonNullTableValues = tableValues.filter((tableValue) => tableValue !== null);
        query = query.where((builder) => {
          builder.whereRaw('?? = ANY(?)', [tableField, [...nonNullTableValues]]);
          // there was at least one null, allow null in this equality clause
          if (nonNullTableValues.length !== tableValues.length) {
            builder.orWhereNull(tableField);
          }
        });
      }
    }

    query = this.applyQueryModifiersToQuery(query, querySelectionModifiers);
    return await wrapNativePostgresCallAsync(() => query);
  }

  protected async fetchManyByRawWhereClauseInternalAsync(
    queryInterface: Knex,
    tableName: string,
    rawWhereClause: string,
    bindings: object | any[],
    querySelectionModifiers: TableQuerySelectionModifiersWithOrderByRaw,
  ): Promise<object[]> {
    let query = queryInterface
      .select()
      .from(tableName)
      .whereRaw(rawWhereClause, bindings as any);
    query = this.applyQueryModifiersToQueryOrderByRaw(query, querySelectionModifiers);
    return await wrapNativePostgresCallAsync(() => query);
  }
}