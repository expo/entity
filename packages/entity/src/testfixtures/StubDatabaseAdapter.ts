import invariant from 'invariant';
import { v4 as uuidv4 } from 'uuid';

import EntityConfiguration from '../EntityConfiguration';
import EntityDatabaseAdapter, {
  TableFieldSingleValueEqualityCondition,
  TableFieldMultiValueEqualityCondition,
  TableQuerySelectionModifiers,
  OrderByOrdering,
} from '../EntityDatabaseAdapter';
import {
  getDatabaseFieldForEntityField,
  FieldTransformerMap,
  transformFieldsToDatabaseObject,
} from '../internal/EntityFieldTransformationUtils';

export default class StubDatabaseAdapter<T> extends EntityDatabaseAdapter<T> {
  private objects: Readonly<{ [key: string]: any }>[];

  constructor(
    private readonly entityConfiguration2: EntityConfiguration<T>,
    prepopulatedObjects: Readonly<T>[] = []
  ) {
    super(entityConfiguration2);
    this.objects = prepopulatedObjects.map((o) =>
      transformFieldsToDatabaseObject(entityConfiguration2, this.getFieldTransformerMap(), o)
    );
  }

  public getAllObjectsForTest(): Readonly<object>[] {
    return this.objects;
  }

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
        this.objects.filter((obj) => {
          return obj[tableField] === fieldValue;
        })
      );
    }, [] as { [key: string]: any });
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
    let filteredObjects = this.objects;
    for (const { tableField, tableValue } of tableFieldSingleValueEqualityOperands) {
      filteredObjects = filteredObjects.filter((obj) => obj[tableField] === tableValue);
    }

    for (const { tableField, tableValues } of tableFieldMultiValueEqualityOperands) {
      filteredObjects = filteredObjects.filter((obj) => tableValues.includes(obj[tableField]));
    }

    const orderBy = querySelectionModifiers.orderBy;
    if (orderBy !== undefined) {
      filteredObjects = filteredObjects.sort((a, b) =>
        StubDatabaseAdapter.compareByOrderBys(orderBy, a, b)
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
    throw new Error('Raw WHERE clauses not supported for StubDatabaseAdapter');
  }

  protected async insertInternalAsync(
    _queryInterface: any,
    _tableName: string,
    object: object
  ): Promise<object[]> {
    const idField = getDatabaseFieldForEntityField(
      this.entityConfiguration2,
      this.entityConfiguration2.idField
    );
    const objectToInsert = {
      [idField]: uuidv4(),
      ...object,
    };
    this.objects.push(objectToInsert);
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

    const objectIndex = this.objects.findIndex((obj) => {
      return obj[tableIdField] === id;
    });
    invariant(objectIndex >= 0, 'should exist');
    this.objects[objectIndex] = {
      ...this.objects[objectIndex],
      ...object,
    };
    return [this.objects[objectIndex]];
  }

  protected async deleteInternalAsync(
    _queryInterface: any,
    _tableName: string,
    tableIdField: string,
    id: any
  ): Promise<void> {
    const objectIndex = this.objects.findIndex((obj) => {
      return obj[tableIdField] === id;
    });
    invariant(objectIndex >= 0, 'should exist');
    this.objects.splice(objectIndex, 1);
  }
}
