import { EntityConfiguration, FieldTransformer, FieldTransformerMap } from '@expo/entity';
import { Knex } from 'knex';

import {
  BasePostgresEntityDatabaseAdapter,
  TableFieldMultiValueEqualityCondition,
  TableFieldSingleValueEqualityCondition,
  TableQuerySelectionModifiers,
  TableQuerySelectionModifiersWithOrderByFragment,
  TableQuerySelectionModifiersWithOrderByRaw,
} from './BasePostgresEntityDatabaseAdapter';
import { JSONArrayField, MaybeJSONArrayField } from './EntityFields';
import { PostgresEntityDatabaseAdapterConfiguration } from './PostgresEntityDatabaseAdapterProvider';
import { SQLFragment } from './SQLOperator';
import { wrapNativePostgresCallAsync } from './errors/wrapNativePostgresCallAsync';

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
            tableColumns[0],
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

  private applyQueryModifiersToQueryOrderByRaw(
    query: Knex.QueryBuilder,
    querySelectionModifiers: TableQuerySelectionModifiersWithOrderByRaw,
  ): Knex.QueryBuilder {
    const { orderByRaw } = querySelectionModifiers;

    // orderByRaw takes precedence over orderBy - they are mutually exclusive
    if (orderByRaw !== undefined) {
      // Apply only orderByRaw (offset/limit still applied, but not orderBy)
      return this.applyQueryModifiersToQuery(query, {
        ...querySelectionModifiers,
        orderBy: undefined, // Explicitly exclude orderBy when orderByRaw is present
      }).orderByRaw(orderByRaw);
    } else {
      // Apply regular orderBy (and offset/limit)
      return this.applyQueryModifiersToQuery(query, querySelectionModifiers);
    }
  }

  private applyQueryModifiersToQuery(
    query: Knex.QueryBuilder,
    querySelectionModifiers: TableQuerySelectionModifiers,
  ): Knex.QueryBuilder {
    const { orderBy, offset, limit } = querySelectionModifiers;

    let ret = query;

    if (orderBy !== undefined) {
      for (const orderBySpecification of orderBy) {
        if ('columnName' in orderBySpecification) {
          ret = ret.orderBy(orderBySpecification.columnName, orderBySpecification.order);
        } else {
          ret = ret.orderByRaw(
            `(${orderBySpecification.columnFragment.sql}) ${orderBySpecification.order}`,
            orderBySpecification.columnFragment.getKnexBindings(),
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
    let query = queryInterface.select().from(tableName).whereRaw(rawWhereClause, bindings);
    query = this.applyQueryModifiersToQueryOrderByRaw(query, querySelectionModifiers);
    return await wrapNativePostgresCallAsync(() => query);
  }

  protected async fetchManyBySQLFragmentInternalAsync(
    queryInterface: Knex,
    tableName: string,
    sqlFragment: SQLFragment,
    querySelectionModifiers: TableQuerySelectionModifiersWithOrderByFragment,
  ): Promise<object[]> {
    let query = queryInterface
      .select()
      .from(tableName)
      .whereRaw(sqlFragment.sql, sqlFragment.getKnexBindings());

    // Apply order by modifiers
    // orderByFragment takes precedence over orderBy - they are mutually exclusive
    const { orderByFragment } = querySelectionModifiers;
    if (orderByFragment !== undefined) {
      // Apply only orderByFragment (offset/limit still applied, but not orderBy)
      query = this.applyQueryModifiersToQuery(query, {
        ...querySelectionModifiers,
        orderBy: undefined, // Explicitly exclude orderBy when orderByFragment is present
      }).orderByRaw(orderByFragment.sql, orderByFragment.getKnexBindings());
    } else {
      // Apply regular orderBy (and offset/limit)
      query = this.applyQueryModifiersToQuery(query, querySelectionModifiers);
    }
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
