import {
  EntityConfiguration,
  EntityDatabaseAdapter,
  FieldTransformerMap,
  IntField,
  StringField,
  computeIfAbsent,
  getDatabaseFieldForEntityField,
  mapMap,
  transformFieldsToDatabaseObject,
} from '@expo/entity';
import invariant from 'invariant';
import { v7 as uuidv7 } from 'uuid';

export class StubDatabaseAdapter<
  TFields extends Record<string, any>,
  TIDField extends keyof TFields,
> extends EntityDatabaseAdapter<TFields, TIDField> {
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
    const results = StubDatabaseAdapter.uniqBy(tableTuples, (tuple) => tuple.join(':')).reduce(
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
        `Unsupported ID type for StubDatabaseAdapter: ${idSchemaField.constructor.name}`,
      );
    }
  }

  protected async insertInternalAsync(
    _queryInterface: any,
    tableName: string,
    object: object,
  ): Promise<object[]> {
    const objectCollection = this.getObjectCollectionForTable(tableName);

    const idField = getDatabaseFieldForEntityField(
      this.entityConfiguration2,
      this.entityConfiguration2.idField,
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
    object: object,
  ): Promise<object[]> {
    // SQL does not support empty updates, mirror behavior here for better test simulation
    if (Object.keys(object).length === 0) {
      throw new Error(`Empty update (${tableIdField} = ${id})`);
    }

    const objectCollection = this.getObjectCollectionForTable(tableName);

    const objectIndex = objectCollection.findIndex((obj) => {
      return obj[tableIdField] === id;
    });

    // SQL updates to a nonexistent row succeed but affect 0 rows,
    // mirror that behavior here for better test simulation
    if (objectIndex < 0) {
      return [];
    }

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
    id: any,
  ): Promise<number> {
    const objectCollection = this.getObjectCollectionForTable(tableName);

    const objectIndex = objectCollection.findIndex((obj) => {
      return obj[tableIdField] === id;
    });

    // SQL deletes to a nonexistent row succeed and affect 0 rows,
    // mirror that behavior here for better test simulation
    if (objectIndex < 0) {
      return 0;
    }

    objectCollection.splice(objectIndex, 1);
    return 1;
  }
}
