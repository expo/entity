import type { EntityConfiguration, FieldTransformerMap } from '@expo/entity';
import {
  computeIfAbsent,
  getDatabaseFieldForEntityField,
  IntField,
  mapMap,
  StringField,
  transformFieldsToDatabaseObject,
} from '@expo/entity';
import type {
  SQLFragment,
  TableFieldMultiValueEqualityCondition,
  TableFieldSingleValueEqualityCondition,
  TableOrderByClause,
  TableQuerySelectionModifiers,
} from '@expo/entity-database-adapter-knex';
import {
  BasePostgresEntityDatabaseAdapter,
  NullsOrdering,
  OrderByOrdering,
} from '@expo/entity-database-adapter-knex';
import invariant from 'invariant';
import { v7 as uuidv7 } from 'uuid';

export class StubPostgresDatabaseAdapter<
  TFields extends Record<string, any>,
  TIDField extends keyof TFields,
> extends BasePostgresEntityDatabaseAdapter<TFields, TIDField> {
  constructor(
    private readonly entityConfiguration2: EntityConfiguration<TFields, TIDField>,
    private readonly dataStore: Map<string, Readonly<{ [key: string]: any }>[]>,
  ) {
    super(entityConfiguration2);
  }

  public static convertFieldObjectsToDataStore<
    TFields extends Record<string, any>,
    TIDField extends keyof TFields,
  >(
    entityConfiguration: EntityConfiguration<TFields, TIDField>,
    dataStore: Map<string, Readonly<TFields>[]>,
  ): Map<string, Readonly<{ [key: string]: any }>[]> {
    return mapMap(dataStore, (objectsForTable) =>
      objectsForTable.map((objectForTable) =>
        transformFieldsToDatabaseObject(entityConfiguration, new Map(), objectForTable),
      ),
    );
  }

  public getObjectCollectionForTable(tableName: string): { [key: string]: any }[] {
    return computeIfAbsent(this.dataStore, tableName, () => []);
  }

  protected getFieldTransformerMap(): FieldTransformerMap {
    return new Map();
  }

  private static uniqBy<T>(a: T[], keyExtractor: (k: T) => string): T[] {
    const seen = new Set();
    return a.filter((item) => {
      const k = keyExtractor(item);
      if (seen.has(k)) {
        return false;
      }
      seen.add(k);
      return true;
    });
  }

  protected async fetchManyWhereInternalAsync(
    _queryInterface: any,
    tableName: string,
    tableColumns: readonly string[],
    tableTuples: (readonly any[])[],
  ): Promise<object[]> {
    const objectCollection = this.getObjectCollectionForTable(tableName);
    const results = StubPostgresDatabaseAdapter.uniqBy(tableTuples, (tuple) =>
      tuple.join(':'),
    ).reduce(
      (acc, tableTuple) => {
        return acc.concat(
          objectCollection.filter((obj) => {
            return tableColumns.every((tableColumn, index) => {
              return obj[tableColumn] === tableTuple[index];
            });
          }),
        );
      },
      [] as { [key: string]: any }[],
    );
    return [...results];
  }

  protected async fetchOneWhereInternalAsync(
    queryInterface: any,
    tableName: string,
    tableColumns: readonly string[],
    tableTuple: readonly any[],
  ): Promise<object | null> {
    const results = await this.fetchManyWhereInternalAsync(
      queryInterface,
      tableName,
      tableColumns,
      [tableTuple],
    );
    return results[0] ?? null;
  }

  private static compareByOrderBys<TFields extends Record<string, any>>(
    orderBys: TableOrderByClause<TFields>[],
    objectA: { [key: string]: any },
    objectB: { [key: string]: any },
  ): 0 | 1 | -1 {
    if (orderBys.length === 0) {
      return 0;
    }

    const currentOrderBy = orderBys[0]!;
    if (!('columnName' in currentOrderBy)) {
      throw new Error('SQL fragment order by not supported for StubDatabaseAdapter');
    }
    const aField = objectA[currentOrderBy.columnName];
    const bField = objectB[currentOrderBy.columnName];

    // Determine effective nulls ordering:
    // - If explicitly set, use that
    // - Otherwise use PostgreSQL defaults: NULLS LAST for ASC, NULLS FIRST for DESC
    const nullsFirst =
      currentOrderBy.nulls !== undefined
        ? currentOrderBy.nulls === NullsOrdering.FIRST
        : currentOrderBy.order === OrderByOrdering.DESCENDING;

    if (aField === null && bField === null) {
      return this.compareByOrderBys(orderBys.slice(1), objectA, objectB);
    } else if (aField === null) {
      return nullsFirst ? -1 : 1;
    } else if (bField === null) {
      return nullsFirst ? 1 : -1;
    }

    switch (currentOrderBy.order) {
      case OrderByOrdering.DESCENDING: {
        return aField > bField
          ? -1
          : aField < bField
            ? 1
            : this.compareByOrderBys(orderBys.slice(1), objectA, objectB);
      }
      case OrderByOrdering.ASCENDING: {
        return bField > aField
          ? -1
          : bField < aField
            ? 1
            : this.compareByOrderBys(orderBys.slice(1), objectA, objectB);
      }
    }
  }

  protected async fetchManyByFieldEqualityConjunctionInternalAsync(
    _queryInterface: any,
    tableName: string,
    tableFieldSingleValueEqualityOperands: TableFieldSingleValueEqualityCondition[],
    tableFieldMultiValueEqualityOperands: TableFieldMultiValueEqualityCondition[],
    querySelectionModifiers: TableQuerySelectionModifiers<TFields>,
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
        StubPostgresDatabaseAdapter.compareByOrderBys(orderBy, a, b),
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

  protected fetchManyBySQLFragmentInternalAsync(
    _queryInterface: any,
    _tableName: string,
    _sqlFragment: SQLFragment<TFields>,
    _querySelectionModifiers: TableQuerySelectionModifiers<TFields>,
  ): Promise<object[]> {
    throw new Error('SQL fragments not supported for StubDatabaseAdapter');
  }

  protected async countByFieldEqualityConjunctionInternalAsync(
    queryInterface: any,
    tableName: string,
    tableFieldSingleValueEqualityOperands: TableFieldSingleValueEqualityCondition[],
    tableFieldMultiValueEqualityOperands: TableFieldMultiValueEqualityCondition[],
  ): Promise<number> {
    const results = await this.fetchManyByFieldEqualityConjunctionInternalAsync(
      queryInterface,
      tableName,
      tableFieldSingleValueEqualityOperands,
      tableFieldMultiValueEqualityOperands,
      { orderBy: undefined, offset: undefined, limit: undefined },
    );
    return results.length;
  }

  protected countBySQLFragmentInternalAsync(
    _queryInterface: any,
    _tableName: string,
    _sqlFragment: SQLFragment<TFields>,
  ): Promise<number> {
    throw new Error('SQL fragment count not supported for StubDatabaseAdapter');
  }

  private generateRandomID(): any {
    const idSchemaField = this.entityConfiguration2.schema.get(this.entityConfiguration2.idField);
    invariant(
      idSchemaField,
      `No schema field found for ${String(this.entityConfiguration2.idField)}`,
    );
    if (idSchemaField instanceof StringField) {
      return uuidv7();
    } else if (idSchemaField instanceof IntField) {
      return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
    } else {
      throw new Error(
        `Unsupported ID type for StubPostgresDatabaseAdapter: ${idSchemaField.constructor.name}`,
      );
    }
  }

  protected async insertManyInternalAsync(
    _queryInterface: any,
    tableName: string,
    objects: readonly object[],
  ): Promise<object[]> {
    const objectCollection = this.getObjectCollectionForTable(tableName);

    const idField = getDatabaseFieldForEntityField(
      this.entityConfiguration2,
      this.entityConfiguration2.idField,
    );
    const insertedObjects: object[] = [];
    for (const object of objects) {
      const objectToInsert = {
        [idField]: this.generateRandomID(),
        ...object,
      };
      objectCollection.push(objectToInsert);
      insertedObjects.push(objectToInsert);
    }
    return insertedObjects;
  }

  protected async updateManyInternalAsync(
    _queryInterface: any,
    tableName: string,
    tableIdField: string,
    items: readonly { id: any; object: object }[],
  ): Promise<readonly { updatedRowCount: number }[]> {
    const results: { updatedRowCount: number }[] = [];
    for (const item of items) {
      if (Object.keys(item.object).length === 0) {
        throw new Error(`Empty update (${tableIdField} = ${item.id})`);
      }

      const objectCollection = this.getObjectCollectionForTable(tableName);

      const objectIndex = objectCollection.findIndex((obj) => {
        return obj[tableIdField] === item.id;
      });

      if (objectIndex < 0) {
        results.push({ updatedRowCount: 0 });
        continue;
      }

      objectCollection[objectIndex] = {
        ...objectCollection[objectIndex],
        ...item.object,
      };
      results.push({ updatedRowCount: 1 });
    }
    return results;
  }

  protected async deleteManyInternalAsync(
    _queryInterface: any,
    tableName: string,
    tableIdField: string,
    ids: readonly any[],
  ): Promise<number> {
    const objectCollection = this.getObjectCollectionForTable(tableName);
    let numDeleted = 0;

    for (const id of ids) {
      const objectIndex = objectCollection.findIndex((obj) => {
        return obj[tableIdField] === id;
      });

      if (objectIndex < 0) {
        continue;
      }

      objectCollection.splice(objectIndex, 1);
      numDeleted++;
    }
    return numDeleted;
  }
}
