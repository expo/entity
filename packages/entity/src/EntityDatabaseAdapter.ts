import invariant from 'invariant';

import { EntityConfiguration } from './EntityConfiguration';
import { EntityQueryContext } from './EntityQueryContext';
import {
  EntityDatabaseAdapterEmptyInsertResultError,
  EntityDatabaseAdapterEmptyUpdateResultError,
  EntityDatabaseAdapterExcessiveDeleteResultError,
  EntityDatabaseAdapterExcessiveInsertResultError,
  EntityDatabaseAdapterExcessiveUpdateResultError,
} from './errors/EntityDatabaseAdapterError';
import {
  FieldTransformerMap,
  getDatabaseFieldForEntityField,
  transformDatabaseObjectToFields,
  transformFieldsToDatabaseObject,
} from './internal/EntityFieldTransformationUtils';
import { IEntityLoadKey, IEntityLoadValue } from './internal/EntityLoadInterfaces';

/**
 * A database adapter is an interface by which entity objects can be
 * fetched, inserted, updated, and deleted from a database. This base class
 * handles all entity field transformation. Subclasses are responsible for
 * implementing database-specific logic for a type of database.
 */
export abstract class EntityDatabaseAdapter<
  TFields extends Record<string, any>,
  TIDField extends keyof TFields,
> {
  protected readonly fieldTransformerMap: FieldTransformerMap;

  constructor(protected readonly entityConfiguration: EntityConfiguration<TFields, TIDField>) {
    this.fieldTransformerMap = this.getFieldTransformerMap();
  }

  /**
   * Transformer definitions for field types. Used to modify values as they are read from or written to
   * the database. Override in concrete subclasses to change transformation behavior.
   * If a field type is not present in the map, then fields of that type will not be transformed.
   */
  protected abstract getFieldTransformerMap(): FieldTransformerMap;

  /**
   * Fetch many objects where key is one of values.
   *
   * @param queryContext - query context with which to perform the fetch
   * @param key - load key being queried
   * @param values - load values being queried
   * @returns map from value to objects that match the query for that value
   */
  async fetchManyWhereAsync<
    TLoadKey extends IEntityLoadKey<TFields, TIDField, TSerializedLoadValue, TLoadValue>,
    TSerializedLoadValue,
    TLoadValue extends IEntityLoadValue<TSerializedLoadValue>,
  >(
    queryContext: EntityQueryContext,
    key: TLoadKey,
    values: readonly TLoadValue[],
  ): Promise<ReadonlyMap<TLoadValue, readonly Readonly<TFields>[]>> {
    const keyDatabaseColumns = key.getDatabaseColumns(this.entityConfiguration);
    const valueDatabaseValues = values.map((value) => key.getDatabaseValues(value));

    const results = await this.fetchManyWhereInternalAsync(
      queryContext.getQueryInterface(),
      this.entityConfiguration.tableName,
      keyDatabaseColumns,
      valueDatabaseValues,
    );

    const objects = results.map((result) =>
      transformDatabaseObjectToFields(this.entityConfiguration, this.fieldTransformerMap, result),
    );

    const objectMap = key.vendNewLoadValueMap<Readonly<TFields>[]>();
    for (const value of values) {
      objectMap.set(value, []);
    }

    objects.forEach((object) => {
      const objectMapKeyForObject = key.getLoadValueForObject(object);
      invariant(
        objectMapKeyForObject !== null,
        `One or more fields from the object is invalid for key ${key}; ${JSON.stringify(object)}. This may indicate a faulty database adapter implementation.`,
      );
      const objectList = objectMap.get(objectMapKeyForObject);
      invariant(
        objectList !== undefined,
        `Unexpected object field value during database result transformation: ${objectMapKeyForObject}. This should never happen.`,
      );
      objectList.push(object);
    });

    return objectMap;
  }

  protected abstract fetchManyWhereInternalAsync(
    queryInterface: any,
    tableName: string,
    tableColumns: readonly string[],
    tableTuples: (readonly any[])[],
  ): Promise<object[]>;

  /**
   * Fetch one objects where key is equal to value, null if no matching object exists.
   * Returned object is not guaranteed to be deterministic. Most concrete implementations will implement this
   * with a "first" or "limit 1" query.
   *
   * @param queryContext - query context with which to perform the fetch
   * @param key - load key being queried
   * @param values - load value being queried
   * @returns object that matches the query for the value
   */
  async fetchOneWhereAsync<
    TLoadKey extends IEntityLoadKey<TFields, TIDField, TSerializedLoadValue, TLoadValue>,
    TSerializedLoadValue,
    TLoadValue extends IEntityLoadValue<TSerializedLoadValue>,
  >(
    queryContext: EntityQueryContext,
    key: TLoadKey,
    value: TLoadValue,
  ): Promise<Readonly<TFields> | null> {
    const keyDatabaseColumns = key.getDatabaseColumns(this.entityConfiguration);
    const valueDatabaseValue = key.getDatabaseValues(value);

    const result = await this.fetchOneWhereInternalAsync(
      queryContext.getQueryInterface(),
      this.entityConfiguration.tableName,
      keyDatabaseColumns,
      valueDatabaseValue,
    );

    if (!result) {
      return null;
    }

    return transformDatabaseObjectToFields(
      this.entityConfiguration,
      this.fieldTransformerMap,
      result,
    );
  }

  protected abstract fetchOneWhereInternalAsync(
    queryInterface: any,
    tableName: string,
    tableColumns: readonly string[],
    tableTuple: readonly any[],
  ): Promise<object | null>;

  /**
   * Insert an object.
   *
   * @param queryContext - query context with which to perform the insert
   * @param object - the object to insert
   * @returns the inserted object
   */
  async insertAsync(
    queryContext: EntityQueryContext,
    object: Readonly<Partial<TFields>>,
  ): Promise<Readonly<TFields>> {
    const dbObject = transformFieldsToDatabaseObject(
      this.entityConfiguration,
      this.fieldTransformerMap,
      object,
    );
    const results = await this.insertInternalAsync(
      queryContext.getQueryInterface(),
      this.entityConfiguration.tableName,
      dbObject,
    );

    // These should never happen with a properly implemented database adapter unless the underlying database has weird triggers
    // or something.
    // These errors are exposed to help application developers detect and diagnose such issues.
    if (results.length > 1) {
      throw new EntityDatabaseAdapterExcessiveInsertResultError(
        `Excessive results from database adapter insert: ${this.entityConfiguration.tableName}`,
      );
    } else if (results.length === 0) {
      throw new EntityDatabaseAdapterEmptyInsertResultError(
        `Empty results from database adapter insert: ${this.entityConfiguration.tableName}`,
      );
    }

    return transformDatabaseObjectToFields(
      this.entityConfiguration,
      this.fieldTransformerMap,
      results[0]!,
    );
  }

  protected abstract insertInternalAsync(
    queryInterface: any,
    tableName: string,
    object: object,
  ): Promise<object[]>;

  /**
   * Update an object.
   *
   * @param queryContext - query context with which to perform the update
   * @param idField - the field in the object that is the ID
   * @param id - the value of the ID field in the object
   * @param object - the object to update
   * @returns the updated object
   */
  async updateAsync<K extends keyof TFields>(
    queryContext: EntityQueryContext,
    idField: K,
    id: any,
    object: Readonly<Partial<TFields>>,
  ): Promise<Readonly<TFields>> {
    const idColumn = getDatabaseFieldForEntityField(this.entityConfiguration, idField);
    const dbObject = transformFieldsToDatabaseObject(
      this.entityConfiguration,
      this.fieldTransformerMap,
      object,
    );
    const results = await this.updateInternalAsync(
      queryContext.getQueryInterface(),
      this.entityConfiguration.tableName,
      idColumn,
      id,
      dbObject,
    );

    if (results.length > 1) {
      // This should never happen with a properly implemented database adapter unless the underlying table has a non-unique
      // primary key column.
      throw new EntityDatabaseAdapterExcessiveUpdateResultError(
        `Excessive results from database adapter update: ${this.entityConfiguration.tableName}(id = ${id})`,
      );
    } else if (results.length === 0) {
      // This happens when the object to update does not exist. It may have been deleted by another process.
      throw new EntityDatabaseAdapterEmptyUpdateResultError(
        `Empty results from database adapter update: ${this.entityConfiguration.tableName}(id = ${id})`,
      );
    }

    return transformDatabaseObjectToFields(
      this.entityConfiguration,
      this.fieldTransformerMap,
      results[0]!,
    );
  }

  protected abstract updateInternalAsync(
    queryInterface: any,
    tableName: string,
    tableIdField: string,
    id: any,
    object: object,
  ): Promise<object[]>;

  /**
   * Delete an object by ID.
   *
   * @param queryContext - query context with which to perform the deletion
   * @param idField - the field in the object that is the ID
   * @param id - the value of the ID field in the object
   */
  async deleteAsync<K extends keyof TFields>(
    queryContext: EntityQueryContext,
    idField: K,
    id: any,
  ): Promise<void> {
    const idColumn = getDatabaseFieldForEntityField(this.entityConfiguration, idField);
    const numDeleted = await this.deleteInternalAsync(
      queryContext.getQueryInterface(),
      this.entityConfiguration.tableName,
      idColumn,
      id,
    );

    if (numDeleted > 1) {
      throw new EntityDatabaseAdapterExcessiveDeleteResultError(
        `Excessive deletions from database adapter delete: ${this.entityConfiguration.tableName}(id = ${id})`,
      );
    }
  }

  protected abstract deleteInternalAsync(
    queryInterface: any,
    tableName: string,
    tableIdField: string,
    id: any,
  ): Promise<number>;
}
