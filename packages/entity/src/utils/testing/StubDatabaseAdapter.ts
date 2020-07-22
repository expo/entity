import invariant from 'invariant';
import { v4 as uuidv4 } from 'uuid';

import EntityConfiguration from '../../EntityConfiguration';
import EntityDatabaseAdapter, {
  TableFieldSingleValueEqualityCondition,
  TableFieldMultiValueEqualityCondition,
  TableQuerySelectionModifiers,
  OrderByOrdering,
} from '../../EntityDatabaseAdapter';
import { StringField, NumberField } from '../../EntityFields';
import {
  getDatabaseFieldForEntityField,
  FieldTransformerMap,
  transformFieldsToDatabaseObject,
} from '../../internal/EntityFieldTransformationUtils';
import { computeIfAbsent, mapMap } from '../collections/maps';

export default class StubDatabaseAdapter<T> extends EntityDatabaseAdapter<T> {
  constructor(
    private readonly entityConfiguration2: EntityConfiguration<T>,
    private readonly dataStore: Map<string, Readonly<{ [key: string]: any }>[]>
  ) {
    super(entityConfiguration2);
  }

  public static convertFieldObjectsToDataStore<T>(
    entityConfiguration: EntityConfiguration<T>,
    dataStore: Map<string, Readonly<T>[]>
  ): Map<string, Readonly<{ [key: string]: any }>[]> {
    return mapMap(dataStore, (objectsForTable) =>
      objectsForTable.map((objectForTable) =>
        transformFieldsToDatabaseObject(entityConfiguration, new Map(), objectForTable)
      )
    );
  }

  public getObjectCollectionForTable(tableName: string): { [key: string]: any }[] {
    return computeIfAbsent(this.dataStore, tableName, () => []);
  }

  protected getFieldTransformerMap(): FieldTransformerMap {
    return new Map();
  }

  protected async fetchManyWhereInternalAsync(
    _queryInterface: any,
    tableName: string,
    tableField: string,
    tableValues: readonly any[]
  ): Promise<object[]> {
    const objectCollection = this.getObjectCollectionForTable(tableName);
    return tableValues.reduce((acc, fieldValue) => {
      return acc.concat(
        objectCollection.filter((obj) => {
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
    tableName: string,
    tableFieldSingleValueEqualityOperands: TableFieldSingleValueEqualityCondition[],
    tableFieldMultiValueEqualityOperands: TableFieldMultiValueEqualityCondition[],
    querySelectionModifiers: TableQuerySelectionModifiers
  ): Promise<object[]> {
    let filteredObjects = this.getObjectCollectionForTable(tableName);
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

  private generateRandomID(): any {
    const idSchemaField = this.entityConfiguration2.schema.get(this.entityConfiguration2.idField);
    invariant(idSchemaField, `No schema field found for ${this.entityConfiguration2.idField}`);
    if (idSchemaField instanceof StringField) {
      return uuidv4();
    } else if (idSchemaField instanceof NumberField) {
      return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
    } else {
      throw new Error(
        `Unsupported ID type for StubDatabaseAdapter: ${idSchemaField.constructor.name}`
      );
    }
  }

  protected async insertInternalAsync(
    _queryInterface: any,
    tableName: string,
    object: object
  ): Promise<object[]> {
    const objectCollection = this.getObjectCollectionForTable(tableName);

    const idField = getDatabaseFieldForEntityField(
      this.entityConfiguration2,
      this.entityConfiguration2.idField
    );
    const objectToInsert = {
      [idField]: this.generateRandomID(),
      ...object,
    };
    objectCollection.push(objectToInsert);
    return [objectToInsert];
  }

  protected async updateInternalAsync(
    _queryInterface: any,
    tableName: string,
    tableIdField: string,
    id: any,
    object: object
  ): Promise<object[]> {
    // SQL does not support empty updates, mirror behavior here for better test simulation
    if (Object.keys(object).length === 0) {
      throw new Error(`Empty update (${tableIdField} = ${id})`);
    }

    const objectCollection = this.getObjectCollectionForTable(tableName);

    const objectIndex = objectCollection.findIndex((obj) => {
      return obj[tableIdField] === id;
    });
    invariant(objectIndex >= 0, 'should exist');
    objectCollection[objectIndex] = {
      ...objectCollection[objectIndex],
      ...object,
    };
    return [objectCollection[objectIndex]];
  }

  protected async deleteInternalAsync(
    _queryInterface: any,
    tableName: string,
    tableIdField: string,
    id: any
  ): Promise<number> {
    const objectCollection = this.getObjectCollectionForTable(tableName);

    const objectIndex = objectCollection.findIndex((obj) => {
      return obj[tableIdField] === id;
    });
    if (objectIndex < 0) {
      return 0;
    }
    objectCollection.splice(objectIndex, 1);
    return 1;
  }
}
