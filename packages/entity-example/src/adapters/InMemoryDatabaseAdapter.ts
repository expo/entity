import type {
  EntityConfiguration,
  FieldTransformerMap,
  IEntityDatabaseAdapterProvider,
} from '@expo/entity';
import { EntityDatabaseAdapter, getDatabaseFieldForEntityField } from '@expo/entity';
import { v4 as uuidv4 } from 'uuid';

const dbObjects: Readonly<{ [key: string]: any }>[] = [];

export class InMemoryDatabaseAdapterProvider implements IEntityDatabaseAdapterProvider {
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

  protected async insertManyInternalAsync(
    _queryInterface: any,
    _tableName: string,
    objects: readonly object[],
  ): Promise<object[]> {
    const configurationPrivate = this['entityConfiguration'];
    const idField = getDatabaseFieldForEntityField(
      configurationPrivate,
      configurationPrivate.idField,
    );
    const insertedObjects: object[] = [];
    for (const object of objects) {
      const objectToInsert = {
        [idField]: uuidv4(),
        ...object,
      };
      dbObjects.push(objectToInsert);
      insertedObjects.push(objectToInsert);
    }
    return insertedObjects;
  }

  protected async updateManyInternalAsync(
    _queryInterface: any,
    _tableName: string,
    tableIdField: string,
    items: readonly { id: any; object: object }[],
  ): Promise<readonly { updatedRowCount: number }[]> {
    const results: { updatedRowCount: number }[] = [];
    for (const item of items) {
      // SQL does not support empty updates, mirror behavior here for better test simulation
      if (Object.keys(item.object).length === 0) {
        throw new Error(`Empty update (${tableIdField} = ${item.id})`);
      }

      const objectIndex = dbObjects.findIndex((obj) => {
        return obj[tableIdField] === item.id;
      });

      if (objectIndex < 0) {
        results.push({ updatedRowCount: 0 });
        continue;
      }

      dbObjects[objectIndex] = {
        ...dbObjects[objectIndex],
        ...item.object,
      };
      results.push({ updatedRowCount: 1 });
    }
    return results;
  }

  protected async deleteManyInternalAsync(
    _queryInterface: any,
    _tableName: string,
    tableIdField: string,
    ids: readonly any[],
  ): Promise<number> {
    let numDeleted = 0;
    for (const id of ids) {
      const objectIndex = dbObjects.findIndex((obj) => {
        return obj[tableIdField] === id;
      });

      if (objectIndex < 0) {
        continue;
      }

      dbObjects.splice(objectIndex, 1);
      numDeleted++;
    }
    return numDeleted;
  }
}
