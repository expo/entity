import {
  EntityDatabaseAdapter,
  FieldTransformerMap,
  FieldTransformer,
  TableQuerySelectionModifiers,
  TableFieldSingleValueEqualityCondition,
  TableFieldMultiValueEqualityCondition,
  TableQuerySelectionModifiersWithOrderByRaw,
} from '@expo/entity';
import { Knex } from 'knex';

import { JSONArrayField, MaybeJSONArrayField } from './EntityFields';
import wrapNativePostgresCallAsync from './errors/wrapNativePostgresCallAsync';

export default class PostgresEntityDatabaseAdapter<
  TFields extends Record<string, any>,
> extends EntityDatabaseAdapter<TFields> {
  protected getFieldTransformerMap(): FieldTransformerMap {
    return new Map<string, FieldTransformer<any>>([
      [
        JSONArrayField.name,
        {
          /**
           * JSON array fields must be stringified before insertion using Knex.
           * http://knexjs.org/#Schema-json
           */
          write: (val: any[]) => JSON.stringify(val),
        },
      ],
      [
        MaybeJSONArrayField.name,
        {
          /**
           * JSON array fields must be stringified before insertion using Knex.
           * For this field it is only an array some of the time.
           * http://knexjs.org/#Schema-json
           */
          write: (val: any[] | any) => (Array.isArray(val) ? JSON.stringify(val) : val),
        },
      ],
    ]);
  }

  protected async fetchManyWhereInternalAsync(
    queryInterface: Knex,
    tableName: string,
    tableColumns: readonly string[],
    tableValueValues: (readonly any[])[],
  ): Promise<object[]> {
    const rawPlaceholders = tableColumns.map(() => '??').join(', ');
    return await wrapNativePostgresCallAsync(() =>
      // queryInterface.select().from(tableName).whereIn(tableFields, tableFieldsValues),
      queryInterface
        .select()
        .from(tableName)
        .whereRaw(`(${rawPlaceholders}) = ANY(?)`, [...tableColumns, tableValueValues]),
    );
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

  protected async insertInternalAsync(
    queryInterface: Knex,
    tableName: string,
    object: object,
  ): Promise<object[]> {
    return await wrapNativePostgresCallAsync(() =>
      queryInterface.insert(object).into(tableName).returning('*'),
    );
  }

  protected async updateInternalAsync(
    queryInterface: Knex,
    tableName: string,
    tableIdField: string,
    id: any,
    object: object,
  ): Promise<object[]> {
    return await wrapNativePostgresCallAsync(() =>
      queryInterface.update(object).into(tableName).where(tableIdField, id).returning('*'),
    );
  }

  protected async deleteInternalAsync(
    queryInterface: Knex,
    tableName: string,
    tableIdField: string,
    id: any,
  ): Promise<number> {
    return await wrapNativePostgresCallAsync(() =>
      queryInterface.into(tableName).where(tableIdField, id).del(),
    );
  }
}
