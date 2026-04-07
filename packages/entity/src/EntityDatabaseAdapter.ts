import invariant from 'invariant';

import type { EntityConfiguration } from './EntityConfiguration.ts';
import type { EntityQueryContext } from './EntityQueryContext.ts';
import {
  EntityDatabaseAdapterEmptyInsertResultError,
  EntityDatabaseAdapterEmptyUpdateResultError,
  EntityDatabaseAdapterExcessiveDeleteResultError,
  EntityDatabaseAdapterExcessiveInsertResultError,
  EntityDatabaseAdapterExcessiveUpdateResultError,
} from './errors/EntityDatabaseAdapterError.ts';
import type { FieldTransformerMap } from './internal/EntityFieldTransformationUtils.ts';
import {
  getDatabaseFieldForEntityField,
  transformDatabaseObjectToFields,
  transformFieldsToDatabaseObject,
} from './internal/EntityFieldTransformationUtils.ts';
import type { IEntityLoadKey, IEntityLoadValue } from './internal/EntityLoadInterfaces.ts';

export const RESERVED_ENTITY_COUNT_QUERY_ALIAS = '__entity_count__';

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
   * Insert many objects.
   *
   * @param queryContext - query context with which to perform the inserts
   * @param objects - the objects to insert
   * @returns the inserted objects, in the same order as the input
   */
  async insertManyAsync(
    queryContext: EntityQueryContext,
    objects: readonly Readonly<Partial<TFields>>[],
  ): Promise<readonly Readonly<TFields>[]> {
    const dbObjects = objects.map((object) =>
      transformFieldsToDatabaseObject(this.entityConfiguration, this.fieldTransformerMap, object),
    );
    const results = await this.insertManyInternalAsync(
      queryContext.getQueryInterface(),
      this.entityConfiguration.tableName,
      dbObjects,
    );

    if (results.length !== objects.length) {
      if (results.length > objects.length) {
        throw new EntityDatabaseAdapterExcessiveInsertResultError(
          `Excessive results from database adapter insert: ${this.entityConfiguration.tableName} (expected ${objects.length}, got ${results.length})`,
        );
      } else {
        throw new EntityDatabaseAdapterEmptyInsertResultError(
          `Insufficient results from database adapter insert: ${this.entityConfiguration.tableName} (expected ${objects.length}, got ${results.length})`,
        );
      }
    }

    return results.map((result) =>
      transformDatabaseObjectToFields(this.entityConfiguration, this.fieldTransformerMap, result),
    );
  }

  protected abstract insertManyInternalAsync(
    queryInterface: any,
    tableName: string,
    objects: readonly object[],
  ): Promise<object[]>;

  /**
   * Update many objects. All items must be updating the same set of fields.
   *
   * @param queryContext - query context with which to perform the updates
   * @param idField - the field in the objects that is the ID
   * @param items - the items to update, each with an id and the fields to update
   */
  async updateManyAsync<K extends keyof TFields, TUpdate extends Readonly<Partial<TFields>>>(
    queryContext: EntityQueryContext,
    idField: K,
    items: readonly { id: any; object: TUpdate }[],
  ): Promise<void> {
    const idColumn = getDatabaseFieldForEntityField(this.entityConfiguration, idField);
    const dbItems = items.map((item) => ({
      id: item.id,
      object: transformFieldsToDatabaseObject(
        this.entityConfiguration,
        this.fieldTransformerMap,
        item.object,
      ),
    }));
    const results = await this.updateManyInternalAsync(
      queryContext.getQueryInterface(),
      this.entityConfiguration.tableName,
      idColumn,
      dbItems,
    );

    for (let i = 0; i < results.length; i++) {
      const { updatedRowCount } = results[i]!;
      const item = items[i]!;
      if (updatedRowCount > 1) {
        throw new EntityDatabaseAdapterExcessiveUpdateResultError(
          `Excessive results from database adapter update: ${this.entityConfiguration.tableName}(id = ${item.id})`,
        );
      } else if (updatedRowCount === 0) {
        throw new EntityDatabaseAdapterEmptyUpdateResultError(
          `Empty results from database adapter update: ${this.entityConfiguration.tableName}(id = ${item.id})`,
        );
      }
    }
  }

  protected abstract updateManyInternalAsync(
    queryInterface: any,
    tableName: string,
    tableIdField: string,
    items: readonly { id: any; object: object }[],
  ): Promise<readonly { updatedRowCount: number }[]>;

  /**
   * Delete many objects by ID.
   *
   * @param queryContext - query context with which to perform the deletions
   * @param idField - the field in the objects that is the ID
   * @param ids - the IDs of the objects to delete
   */
  async deleteManyAsync<K extends keyof TFields>(
    queryContext: EntityQueryContext,
    idField: K,
    ids: readonly any[],
  ): Promise<void> {
    const idColumn = getDatabaseFieldForEntityField(this.entityConfiguration, idField);
    const numDeleted = await this.deleteManyInternalAsync(
      queryContext.getQueryInterface(),
      this.entityConfiguration.tableName,
      idColumn,
      ids,
    );

    if (numDeleted > ids.length) {
      throw new EntityDatabaseAdapterExcessiveDeleteResultError(
        `Excessive deletions from database adapter delete: ${this.entityConfiguration.tableName} (expected at most ${ids.length}, got ${numDeleted})`,
      );
    }
  }

  protected abstract deleteManyInternalAsync(
    queryInterface: any,
    tableName: string,
    tableIdField: string,
    ids: readonly any[],
  ): Promise<number>;
}
