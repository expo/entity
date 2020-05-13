import {
  EntityDatabaseAdapter,
  FieldTransformerMap,
  OrderByOrdering,
  TableFieldSingleValueEqualityCondition,
  TableFieldMultiValueEqualityCondition,
  TableQuerySelectionModifiers,
  getDatabaseFieldForEntityField,
  EntityConfiguration,
} from '@expo/entity';
import invariant from 'invariant';
import { v4 as uuidv4 } from 'uuid';

const dbObjects: Readonly<{ [key: string]: any }>[] = [];

/**
 * In-memory database adapter for entity for the purposes of this example. Normally `@expo/entity-database-adapter-knex`
 * or another production adapter would be used. Very similar to StubDatabaseAdapter but shared in a way more akin to a normal database.
 */
export default class InMemoryDatabaseAdapter<T> extends EntityDatabaseAdapter<T> {
  protected getFieldTransformerMap(): FieldTransformerMap {
    return new Map();
  }

  protected async fetchManyWhereInternalAsync(
    _queryInterface: any,
    _tableName: string,
    tableField: string,
    tableValues: readonly any[]
  ): Promise<object[]> {
    return tableValues.reduce((acc, fieldValue) => {
      return acc.concat(
        dbObjects.filter((obj) => {
          return obj[tableField] === fieldValue;
        })
      );
    }, []);
  }

  private static compareByOrderBys(
    orderBys: {
      columnName: string;
      order: OrderByOrdering;
    }[],
    objectA: { [key: string]: any },
    objectB: { [key: string]: any }
  ): 0 | 1 | -1 {
    if (orderBys.length === 0) {
      return 0;
    }

    const currentOrderBy = orderBys[0];
    const aField = objectA[currentOrderBy.columnName];
    const bField = objectB[currentOrderBy.columnName];
    switch (currentOrderBy.order) {
      case OrderByOrdering.DESCENDING:
        return aField > bField
          ? -1
          : aField < bField
          ? 1
          : this.compareByOrderBys(orderBys.slice(1), objectA, objectB);
      case OrderByOrdering.ASCENDING:
        return bField > aField
          ? -1
          : bField < aField
          ? 1
          : this.compareByOrderBys(orderBys.slice(1), objectA, objectB);
    }
  }

  protected async fetchManyByFieldEqualityConjunctionInternalAsync(
    _queryInterface: any,
    _tableName: string,
    tableFieldSingleValueEqualityOperands: TableFieldSingleValueEqualityCondition[],
    tableFieldMultiValueEqualityOperands: TableFieldMultiValueEqualityCondition[],
    querySelectionModifiers: TableQuerySelectionModifiers
  ): Promise<object[]> {
    let filteredObjects = dbObjects;
    for (const { tableField, tableValue } of tableFieldSingleValueEqualityOperands) {
      filteredObjects = filteredObjects.filter((obj) => obj[tableField] === tableValue);
    }

    for (const { tableField, tableValues } of tableFieldMultiValueEqualityOperands) {
      filteredObjects = filteredObjects.filter((obj) => tableValues.includes(obj[tableField]));
    }

    const orderBy = querySelectionModifiers.orderBy;
    if (orderBy !== undefined) {
      filteredObjects = filteredObjects.sort((a, b) =>
        InMemoryDatabaseAdapter.compareByOrderBys(orderBy, a, b)
      );
    }

    const offset = querySelectionModifiers.offset;
    if (offset !== undefined) {
      filteredObjects = filteredObjects.slice(offset);
    }

    const limit = querySelectionModifiers.limit;
    if (limit !== undefined) {
      filteredObjects = filteredObjects.slice(0, 0 + limit);
    }

    return filteredObjects;
  }

  protected fetchManyByRawWhereClauseInternalAsync(
    _queryInterface: any,
    _tableName: string,
    _rawWhereClause: string,
    _bindings: object | any[],
    _querySelectionModifiers: TableQuerySelectionModifiers
  ): Promise<object[]> {
    throw new Error('Raw WHERE clauses not supported for InMemoryDatabaseAdapter');
  }

  protected async insertInternalAsync(
    _queryInterface: any,
    _tableName: string,
    object: object
  ): Promise<object[]> {
    const configurationPrivate = this['entityConfiguration'] as EntityConfiguration<T>;
    const idField = getDatabaseFieldForEntityField(
      configurationPrivate,
      configurationPrivate.idField
    );
    const objectToInsert = {
      [idField]: uuidv4(),
      ...object,
    };
    dbObjects.push(objectToInsert);
    return [objectToInsert];
  }

  protected async updateInternalAsync(
    _queryInterface: any,
    _tableName: string,
    tableIdField: string,
    id: any,
    object: object
  ): Promise<object[]> {
    // SQL does not support empty updates, mirror behavior here for better test simulation
    if (Object.keys(object).length === 0) {
      throw new Error(`Empty update (${tableIdField} = ${id})`);
    }

    const objectIndex = dbObjects.findIndex((obj) => {
      return obj[tableIdField] === id;
    });
    invariant(objectIndex >= 0, 'should exist');
    dbObjects[objectIndex] = {
      ...dbObjects[objectIndex],
      ...object,
    };
    return [dbObjects[objectIndex]];
  }

  protected async deleteInternalAsync(
    _queryInterface: any,
    _tableName: string,
    tableIdField: string,
    id: any
  ): Promise<void> {
    const objectIndex = dbObjects.findIndex((obj) => {
      return obj[tableIdField] === id;
    });
    invariant(objectIndex >= 0, 'should exist');
    dbObjects.splice(objectIndex, 1);
  }
}
