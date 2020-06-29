import {
  EntityDatabaseAdapter,
  FieldTransformerMap,
  FieldTransformer,
  JSONArrayField,
  MaybeJSONArrayField,
  TableQuerySelectionModifiers,
  TableFieldSingleValueEqualityCondition,
  TableFieldMultiValueEqualityCondition,
} from '@expo/entity';
import Knex from 'knex';

export default class PostgresEntityDatabaseAdapter<TDatabaseFields> extends EntityDatabaseAdapter<
  TDatabaseFields
> {
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
    tableField: string,
    tableValues: readonly any[]
  ): Promise<object[]> {
    return await queryInterface
      .select()
      .from(tableName)
      .whereRaw('?? = ANY(?)', [tableField, tableValues as any[]]);
  }

  private applyQueryModifiersToQuery(
    query: Knex.QueryBuilder,
    querySelectionModifiers: TableQuerySelectionModifiers
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
    querySelectionModifiers: TableQuerySelectionModifiers
  ): Promise<object[]> {
    let query = queryInterface.select().from(tableName);

    if (tableFieldSingleValueEqualityOperands.length > 0) {
      const whereObject: { [key: string]: any } = {};
      for (const { tableField, tableValue } of tableFieldSingleValueEqualityOperands) {
        whereObject[tableField] = tableValue;
      }
      query = query.where(whereObject);
    }

    if (tableFieldMultiValueEqualityOperands.length > 0) {
      for (const { tableField, tableValues } of tableFieldMultiValueEqualityOperands) {
        query = query.whereRaw('?? = ANY(?)', [tableField, tableValues]);
      }
    }

    query = this.applyQueryModifiersToQuery(query, querySelectionModifiers);
    return await query;
  }

  protected async fetchManyByRawWhereClauseInternalAsync(
    queryInterface: Knex,
    tableName: string,
    rawWhereClause: string,
    bindings: object | any[],
    querySelectionModifiers: TableQuerySelectionModifiers
  ): Promise<object[]> {
    let query = queryInterface
      .select()
      .from(tableName)
      .whereRaw(rawWhereClause, bindings as any);
    query = this.applyQueryModifiersToQuery(query, querySelectionModifiers);
    return await query;
  }

  protected async insertInternalAsync(
    queryInterface: Knex,
    tableName: string,
    object: object
  ): Promise<object[]> {
    return await queryInterface.insert(object).into(tableName).returning('*');
  }

  protected async updateInternalAsync(
    queryInterface: Knex,
    tableName: string,
    tableIdField: string,
    id: any,
    object: object
  ): Promise<object[]> {
    return await queryInterface
      .update(object)
      .into(tableName)
      .where(tableIdField, id)
      .returning('*');
  }

  protected async deleteInternalAsync(
    queryInterface: Knex,
    tableName: string,
    tableIdField: string,
    id: any
  ): Promise<number> {
    return await queryInterface.into(tableName).where(tableIdField, id).del();
  }
}
