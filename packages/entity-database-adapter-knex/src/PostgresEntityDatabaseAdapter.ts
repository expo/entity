import type { EntityConfiguration, FieldTransformer, FieldTransformerMap } from '@expo/entity';
import { getDatabaseFieldForEntityField, RESERVED_ENTITY_COUNT_QUERY_ALIAS } from '@expo/entity';
import type { Knex } from 'knex';

import type {
  TableFieldMultiValueEqualityCondition,
  TableFieldSingleValueEqualityCondition,
  TableQuerySelectionModifiers,
} from './BasePostgresEntityDatabaseAdapter.ts';
import {
  BasePostgresEntityDatabaseAdapter,
  NullsOrdering,
  OrderByOrdering,
} from './BasePostgresEntityDatabaseAdapter.ts';
import { JSONArrayField, MaybeJSONArrayField } from './EntityFields.ts';
import type { PostgresEntityDatabaseAdapterConfiguration } from './PostgresEntityDatabaseAdapterProvider.ts';
import type { SQLFragment } from './SQLOperator.ts';
import { wrapNativePostgresCallAsync } from './errors/wrapNativePostgresCallAsync.ts';

export class PostgresEntityDatabaseAdapter<
  TFields extends Record<string, any>,
  TIDField extends keyof TFields,
> extends BasePostgresEntityDatabaseAdapter<TFields, TIDField> {
  constructor(
    entityConfiguration: EntityConfiguration<TFields, TIDField>,
    private readonly adapterConfiguration: PostgresEntityDatabaseAdapterConfiguration = {},
  ) {
    super(entityConfiguration);
  }

  override get paginationMaxPageSize(): number | undefined {
    return this.adapterConfiguration.paginationMaxPageSize;
  }

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
    tableTuples: any[][],
  ): Promise<object[]> {
    // For single column queries, use the ANY operator to derive a consistent
    // query shape in the postgres query stats table.
    // This produces a query of the form `SELECT * FROM table WHERE ("id") = ANY(?)`
    // with value bindings of the form `[[1]]`, thus not making different value cardinalities
    // produce different query shapes.
    //
    // But for multi-column queries, we must use the IN operator as the ANY operator
    // does not support anonymous composite types. The solution to keep using the ANY operator would be explicit
    // postgres type casting on each value in each tableTuple, thus creating a unique query shape and defeating the purpose.
    // The same applies to using UNNEST on anonymous composite types.
    // Note that this solution is not possible in entity though since we don't have the postgres column types and they
    // can't be derived dynamically.
    //
    // Therefore, for multi-column quries, we use the IN operator which produces a query of the form
    // `SELECT * FROM table WHERE ("id", "name") IN ((?, ?), (?, ?))` with value bindings of the form
    // `[[1, 'a'], [2, 'b']]`, which will produce a unique query shape in the postgres query stats table for
    // each value cardinality.
    //
    // We could use the IN operator for single column queries as well, but we prefer to use ANY to at least keep some
    // consistency in the query shape for the stats table.

    if (tableColumns.length === 1) {
      return await wrapNativePostgresCallAsync(() =>
        queryInterface
          .select()
          .from(tableName)
          .whereRaw(`(??) = ANY(?)`, [
            tableColumns[0]!,
            tableTuples.map((tableTuple) => tableTuple[0]),
          ]),
      );
    }

    return await wrapNativePostgresCallAsync(() =>
      queryInterface.select().from(tableName).whereIn(tableColumns, tableTuples),
    );
  }

  protected async fetchOneWhereInternalAsync(
    queryInterface: Knex,
    tableName: string,
    tableColumns: readonly string[],
    tableTuple: readonly any[],
  ): Promise<object | null> {
    const results = await this.fetchManyByFieldEqualityConjunctionInternalAsync(
      queryInterface,
      tableName,
      tableColumns.map((column, index) => ({
        tableField: column,
        tableValue: tableTuple[index],
      })),
      [],
      { limit: 1, orderBy: undefined, offset: undefined },
    );
    return results[0] ?? null;
  }

  private applyQueryModifiersToQuery(
    query: Knex.QueryBuilder,
    querySelectionModifiers: TableQuerySelectionModifiers<TFields>,
  ): Knex.QueryBuilder {
    const { orderBy, offset, limit } = querySelectionModifiers;

    let ret = query;

    if (orderBy !== undefined) {
      for (const orderBySpecification of orderBy) {
        if ('columnName' in orderBySpecification) {
          ret = ret.orderBy(
            orderBySpecification.columnName,
            orderBySpecification.order,
            orderBySpecification.nulls,
          );
        } else {
          const orderDirection =
            orderBySpecification.order === OrderByOrdering.ASCENDING ? 'ASC' : 'DESC';
          const nullsSuffix = orderBySpecification.nulls
            ? ` NULLS ${orderBySpecification.nulls === NullsOrdering.FIRST ? 'FIRST' : 'LAST'}`
            : '';
          ret = ret.orderByRaw(
            `(${orderBySpecification.columnFragment.sql}) ${orderDirection}${nullsSuffix}`,
            orderBySpecification.columnFragment.getKnexBindings((fieldName) =>
              getDatabaseFieldForEntityField(this.entityConfiguration, fieldName),
            ),
          );
        }
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

  private applyFieldEqualityConjunctionWhereClause(
    query: Knex.QueryBuilder,
    tableFieldSingleValueEqualityOperands: TableFieldSingleValueEqualityCondition[],
    tableFieldMultiValueEqualityOperands: TableFieldMultiValueEqualityCondition[],
  ): Knex.QueryBuilder {
    let result = query;

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
        result = result.where(whereObject);
      }
      if (nullTableFieldSingleValueEqualityOperands.length > 0) {
        for (const { tableField } of nullTableFieldSingleValueEqualityOperands) {
          result = result.whereNull(tableField);
        }
      }
    }

    if (tableFieldMultiValueEqualityOperands.length > 0) {
      for (const { tableField, tableValues } of tableFieldMultiValueEqualityOperands) {
        const nonNullTableValues = tableValues.filter((tableValue) => tableValue !== null);
        result = result.where((builder) => {
          builder.whereRaw('?? = ANY(?)', [tableField, [...nonNullTableValues]]);
          // there was at least one null, allow null in this equality clause
          if (nonNullTableValues.length !== tableValues.length) {
            builder.orWhereNull(tableField);
          }
        });
      }
    }

    return result;
  }

  protected async fetchManyByFieldEqualityConjunctionInternalAsync(
    queryInterface: Knex,
    tableName: string,
    tableFieldSingleValueEqualityOperands: TableFieldSingleValueEqualityCondition[],
    tableFieldMultiValueEqualityOperands: TableFieldMultiValueEqualityCondition[],
    querySelectionModifiers: TableQuerySelectionModifiers<TFields>,
  ): Promise<object[]> {
    let query = this.applyFieldEqualityConjunctionWhereClause(
      queryInterface.select().from(tableName),
      tableFieldSingleValueEqualityOperands,
      tableFieldMultiValueEqualityOperands,
    );
    query = this.applyQueryModifiersToQuery(query, querySelectionModifiers);
    return await wrapNativePostgresCallAsync(() => query);
  }

  private applySQLFragmentWhereClause(
    query: Knex.QueryBuilder,
    sqlFragment: SQLFragment<TFields>,
  ): Knex.QueryBuilder {
    return query.whereRaw(
      sqlFragment.sql,
      sqlFragment.getKnexBindings((fieldName) =>
        getDatabaseFieldForEntityField(this.entityConfiguration, fieldName),
      ),
    );
  }

  protected async fetchManyBySQLFragmentInternalAsync(
    queryInterface: Knex,
    tableName: string,
    sqlFragment: SQLFragment<TFields>,
    querySelectionModifiers: TableQuerySelectionModifiers<TFields>,
  ): Promise<object[]> {
    let query = this.applySQLFragmentWhereClause(
      queryInterface.select().from(tableName),
      sqlFragment,
    );
    query = this.applyQueryModifiersToQuery(query, querySelectionModifiers);
    return await wrapNativePostgresCallAsync(() => query);
  }

  protected async countByFieldEqualityConjunctionInternalAsync(
    queryInterface: Knex,
    tableName: string,
    tableFieldSingleValueEqualityOperands: TableFieldSingleValueEqualityCondition[],
    tableFieldMultiValueEqualityOperands: TableFieldMultiValueEqualityCondition[],
  ): Promise<number> {
    const query = this.applyFieldEqualityConjunctionWhereClause(
      queryInterface.count('*', { as: RESERVED_ENTITY_COUNT_QUERY_ALIAS }).from(tableName),
      tableFieldSingleValueEqualityOperands,
      tableFieldMultiValueEqualityOperands,
    );
    const result = await wrapNativePostgresCallAsync(() => query);
    return parseInt(String(result[0][RESERVED_ENTITY_COUNT_QUERY_ALIAS]), 10);
  }

  protected async countBySQLFragmentInternalAsync(
    queryInterface: Knex,
    tableName: string,
    sqlFragment: SQLFragment<TFields>,
  ): Promise<number> {
    const query = this.applySQLFragmentWhereClause(
      queryInterface.count('*', { as: RESERVED_ENTITY_COUNT_QUERY_ALIAS }).from(tableName),
      sqlFragment,
    );
    const result = await wrapNativePostgresCallAsync(() => query);
    return parseInt(String(result[0][RESERVED_ENTITY_COUNT_QUERY_ALIAS]), 10);
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
  ): Promise<{ updatedRowCount: number }> {
    const updatedRowCount = await wrapNativePostgresCallAsync(() =>
      queryInterface.update(object).into(tableName).where(tableIdField, id),
    );
    return { updatedRowCount };
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
