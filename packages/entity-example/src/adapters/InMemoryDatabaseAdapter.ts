import {
  EntityConfiguration,
  EntityDatabaseAdapter,
  type FieldTransformerMap,
  type IEntityDatabaseAdapterProvider,
  getDatabaseFieldForEntityField,
} from '@expo/entity';
import { v4 as uuidv4 } from 'uuid';

const dbObjects: Readonly<{ [key: string]: any }>[] = [];

export class InMemoryDatabaseAdapterProvider implements IEntityDatabaseAdapterProvider {
  getExtensionsKey(): string {
    return 'InMemoryDatabaseAdapterProvider';
  }

  installExtensions(): void {
    // No-op
  }

  getDatabaseAdapter<TFields extends Record<string, any>, TIDField extends keyof TFields>(
    entityConfiguration: EntityConfiguration<TFields, TIDField>,
  ): EntityDatabaseAdapter<TFields, TIDField> {
    return new InMemoryDatabaseAdapter(entityConfiguration);
  }
}

/**
 * In-memory database adapter for entity for the purposes of this example. Normally `@expo/entity-database-adapter-knex`
 * or another production adapter would be used. Very similar to StubDatabaseAdapter but shared in a way more akin to a normal database.
 */
class InMemoryDatabaseAdapter<
  TFields extends Record<string, any>,
  TIDField extends keyof TFields,
> extends EntityDatabaseAdapter<TFields, TIDField> {
  protected getFieldTransformerMap(): FieldTransformerMap {
    return new Map();
  }

  protected async fetchManyWhereInternalAsync(
    _queryInterface: any,
    _tableName: string,
    tableColumns: readonly string[],
    tableTuples: (readonly any[])[],
  ): Promise<object[]> {
    const results = tableTuples.reduce((acc, tableTuple) => {
      return acc.concat(
        dbObjects.filter((obj) => {
          return tableColumns.every((tableColumn, index) => {
            return obj[tableColumn] === tableTuple[index];
          });
        }),
      );
    }, []);
    return [...results];
  }

  protected override async fetchOneWhereInternalAsync(
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

  protected async insertInternalAsync(
    _queryInterface: any,
    _tableName: string,
    object: object,
  ): Promise<object[]> {
    const configurationPrivate = this['entityConfiguration'];
    const idField = getDatabaseFieldForEntityField(
      configurationPrivate,
      configurationPrivate.idField,
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
    object: object,
  ): Promise<object[]> {
    // SQL does not support empty updates, mirror behavior here for better test simulation
    if (Object.keys(object).length === 0) {
      throw new Error(`Empty update (${tableIdField} = ${id})`);
    }

    const objectIndex = dbObjects.findIndex((obj) => {
      return obj[tableIdField] === id;
    });

    // SQL updates to a nonexistent row succeed but affect 0 rows,
    // mirror that behavior here for better test simulation
    if (objectIndex < 0) {
      return [];
    }

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
    id: any,
  ): Promise<number> {
    const objectIndex = dbObjects.findIndex((obj) => {
      return obj[tableIdField] === id;
    });

    // SQL deletes to a nonexistent row succeed and affect 0 rows,
    // mirror that behavior here for better test simulation
    if (objectIndex < 0) {
      return 0;
    }

    dbObjects.splice(objectIndex, 1);
    return 1;
  }
}
