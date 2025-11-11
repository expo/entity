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
 * Equality operand that is used for selecting entities with a field with a single value.
 */
export interface SingleValueFieldEqualityCondition<
  TFields extends Record<string, any>,
  N extends keyof TFields = keyof TFields,
> {
  fieldName: N;
  fieldValue: TFields[N];
}

/**
 * Equality operand that is used for selecting entities with a field matching one of multiple values.
 */
export interface MultiValueFieldEqualityCondition<
  TFields extends Record<string, any>,
  N extends keyof TFields = keyof TFields,
> {
  fieldName: N;
  fieldValues: readonly TFields[N][];
}

/**
 * A single equality operand for use in a selection clause.
 * See EntityLoader.loadManyByFieldEqualityConjunctionAsync documentation for examples.
 */
export type FieldEqualityCondition<
  TFields extends Record<string, any>,
  N extends keyof TFields = keyof TFields,
> = SingleValueFieldEqualityCondition<TFields, N> | MultiValueFieldEqualityCondition<TFields, N>;

export function isSingleValueFieldEqualityCondition<
  TFields extends Record<string, any>,
  N extends keyof TFields = keyof TFields,
>(
  condition: FieldEqualityCondition<TFields, N>,
): condition is SingleValueFieldEqualityCondition<TFields, N> {
  return (condition as SingleValueFieldEqualityCondition<TFields, N>).fieldValue !== undefined;
}

export interface TableFieldSingleValueEqualityCondition {
  tableField: string;
  tableValue: any;
}

export interface TableFieldMultiValueEqualityCondition {
  tableField: string;
  tableValues: readonly any[];
}

/**
 * Ordering options for `orderBy` clauses.
 */
export enum OrderByOrdering {
  /**
   * Ascending order (lowest to highest).
   * Ascending order puts smaller values first, where "smaller" is defined in terms of the %3C operator.
   */
  ASCENDING = 'asc',

  /**
   * Descending order (highest to lowest).
   * Descending order puts larger values first, where "larger" is defined in terms of the %3E operator.
   */
  DESCENDING = 'desc',
}

/**
 * SQL modifiers that only affect the selection but not the projection.
 */
export interface QuerySelectionModifiers<TFields extends Record<string, any>> {
  /**
   * Order the entities by specified columns and orders.
   */
  orderBy?: {
    /**
     * The field name to order by.
     */
    fieldName: keyof TFields;

    /**
     * The OrderByOrdering to order by.
     */
    order: OrderByOrdering;
  }[];

  /**
   * Skip the specified number of entities queried before returning.
   */
  offset?: number;

  /**
   * Limit the number of entities returned.
   */
  limit?: number;
}

export interface QuerySelectionModifiersWithOrderByRaw<TFields extends Record<string, any>>
  extends QuerySelectionModifiers<TFields> {
  /**
   * Order the entities by a raw SQL `ORDER BY` clause.
   */
  orderByRaw?: string;
}

export interface TableQuerySelectionModifiers {
  orderBy:
    | {
        columnName: string;
        order: OrderByOrdering;
      }[]
    | undefined;
  offset: number | undefined;
  limit: number | undefined;
}

export interface TableQuerySelectionModifiersWithOrderByRaw extends TableQuerySelectionModifiers {
  orderByRaw: string | undefined;
}

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
  private readonly fieldTransformerMap: FieldTransformerMap;

  constructor(private readonly entityConfiguration: EntityConfiguration<TFields, TIDField>) {
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
   * Fetch many objects matching the conjunction of where clauses constructed from
   * specified field equality operands.
   *
   * @param queryContext - query context with which to perform the fetch
   * @param fieldEqualityOperands - list of field equality where clause operand specifications
   * @param querySelectionModifiers - limit, offset, orderBy, and orderByRaw for the query
   * @returns array of objects matching the query
   */
  async fetchManyByFieldEqualityConjunctionAsync<N extends keyof TFields>(
    queryContext: EntityQueryContext,
    fieldEqualityOperands: FieldEqualityCondition<TFields, N>[],
    querySelectionModifiers: QuerySelectionModifiers<TFields>,
  ): Promise<readonly Readonly<TFields>[]> {
    const tableFieldSingleValueOperands: TableFieldSingleValueEqualityCondition[] = [];
    const tableFieldMultipleValueOperands: TableFieldMultiValueEqualityCondition[] = [];
    for (const operand of fieldEqualityOperands) {
      if (isSingleValueFieldEqualityCondition(operand)) {
        tableFieldSingleValueOperands.push({
          tableField: getDatabaseFieldForEntityField(this.entityConfiguration, operand.fieldName),
          tableValue: operand.fieldValue,
        });
      } else {
        tableFieldMultipleValueOperands.push({
          tableField: getDatabaseFieldForEntityField(this.entityConfiguration, operand.fieldName),
          tableValues: operand.fieldValues,
        });
      }
    }

    const results = await this.fetchManyByFieldEqualityConjunctionInternalAsync(
      queryContext.getQueryInterface(),
      this.entityConfiguration.tableName,
      tableFieldSingleValueOperands,
      tableFieldMultipleValueOperands,
      this.convertToTableQueryModifiers(querySelectionModifiers),
    );

    return results.map((result) =>
      transformDatabaseObjectToFields(this.entityConfiguration, this.fieldTransformerMap, result),
    );
  }

  protected abstract fetchManyByFieldEqualityConjunctionInternalAsync(
    queryInterface: any,
    tableName: string,
    tableFieldSingleValueEqualityOperands: TableFieldSingleValueEqualityCondition[],
    tableFieldMultiValueEqualityOperands: TableFieldMultiValueEqualityCondition[],
    querySelectionModifiers: TableQuerySelectionModifiers,
  ): Promise<object[]>;

  /**
   * Fetch many objects matching the raw WHERE clause.
   *
   * @param queryContext - query context with which to perform the fetch
   * @param rawWhereClause - parameterized SQL WHERE clause with positional binding placeholders or named binding placeholders
   * @param bindings - array of positional bindings or object of named bindings
   * @param querySelectionModifiers - limit, offset, and orderBy for the query
   * @returns array of objects matching the query
   */
  async fetchManyByRawWhereClauseAsync(
    queryContext: EntityQueryContext,
    rawWhereClause: string,
    bindings: any[] | object,
    querySelectionModifiers: QuerySelectionModifiersWithOrderByRaw<TFields>,
  ): Promise<readonly Readonly<TFields>[]> {
    const results = await this.fetchManyByRawWhereClauseInternalAsync(
      queryContext.getQueryInterface(),
      this.entityConfiguration.tableName,
      rawWhereClause,
      bindings,
      this.convertToTableQueryModifiersWithOrderByRaw(querySelectionModifiers),
    );

    return results.map((result) =>
      transformDatabaseObjectToFields(this.entityConfiguration, this.fieldTransformerMap, result),
    );
  }

  protected abstract fetchManyByRawWhereClauseInternalAsync(
    queryInterface: any,
    tableName: string,
    rawWhereClause: string,
    bindings: any[] | object,
    querySelectionModifiers: TableQuerySelectionModifiersWithOrderByRaw,
  ): Promise<object[]>;

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

  private convertToTableQueryModifiersWithOrderByRaw(
    querySelectionModifiers: QuerySelectionModifiersWithOrderByRaw<TFields>,
  ): TableQuerySelectionModifiersWithOrderByRaw {
    return {
      ...this.convertToTableQueryModifiers(querySelectionModifiers),
      orderByRaw: querySelectionModifiers.orderByRaw,
    };
  }

  private convertToTableQueryModifiers(
    querySelectionModifiers: QuerySelectionModifiers<TFields>,
  ): TableQuerySelectionModifiers {
    const orderBy = querySelectionModifiers.orderBy;
    return {
      orderBy:
        orderBy !== undefined
          ? orderBy.map((orderBySpecification) => ({
              columnName: getDatabaseFieldForEntityField(
                this.entityConfiguration,
                orderBySpecification.fieldName,
              ),
              order: orderBySpecification.order,
            }))
          : undefined,
      offset: querySelectionModifiers.offset,
      limit: querySelectionModifiers.limit,
    };
  }
}
