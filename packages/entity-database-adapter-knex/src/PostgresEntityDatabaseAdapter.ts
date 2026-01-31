import {
  EntityDatabaseAdapter,
  FieldTransformer,
  FieldTransformerMap,
} from '@expo/entity';
import { Knex } from 'knex';

import { JSONArrayField, MaybeJSONArrayField } from './EntityFields';
import { wrapNativePostgresCallAsync } from './errors/wrapNativePostgresCallAsync';

export class PostgresEntityDatabaseAdapter<
  TFields extends Record<string, any>,
  TIDField extends keyof TFields,
> extends EntityDatabaseAdapter<TFields, TIDField> {
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
