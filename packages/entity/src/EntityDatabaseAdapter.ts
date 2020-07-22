import EntityConfiguration from './EntityConfiguration';
import { EntityQueryContext } from './EntityQueryContext';
import {
  getDatabaseFieldForEntityField,
  transformDatabaseObjectToFields,
  transformFieldsToDatabaseObject,
  FieldTransformerMap,
} from './internal/EntityFieldTransformationUtils';

interface SingleValueFieldEqualityCondition<TFields, N extends keyof TFields = keyof TFields> {
  fieldName: N;
  fieldValue: TFields[N];
}

interface MultiValueFieldEqualityCondition<TFields, N extends keyof TFields = keyof TFields> {
  fieldName: N;
  fieldValues: TFields[N][];
}

export type FieldEqualityCondition<TFields, N extends keyof TFields = keyof TFields> =
  | SingleValueFieldEqualityCondition<TFields, N>
  | MultiValueFieldEqualityCondition<TFields, N>;

function isSingleValueFieldEqualityCondition<TFields, N extends keyof TFields = keyof TFields>(
  condition: FieldEqualityCondition<TFields, N>
): condition is SingleValueFieldEqualityCondition<TFields, N> {
  return (condition as SingleValueFieldEqualityCondition<TFields, N>).fieldValue !== undefined;
}

export interface TableFieldSingleValueEqualityCondition {
  tableField: string;
  tableValue: any;
}

export interface TableFieldMultiValueEqualityCondition {
  tableField: string;
  tableValues: any[];
}

export enum OrderByOrdering {
  ASCENDING = 'asc',
  DESCENDING = 'desc',
}

/**
 * SQL modifiers that only affect the selection but not the projection.
 */
export interface QuerySelectionModifiers<TFields> {
  /**
   * Order the entities by specified columns and orders.
   */
  orderBy?: {
    fieldName: keyof TFields;
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

export interface TableQuerySelectionModifiers {
  orderBy?: {
    columnName: string;
    order: OrderByOrdering;
  }[];
  offset?: number;
  limit?: number;
}

/**
 * A database adapter is an interface by which entity objects can be
 * fetched, inserted, updated, and deleted from a database. This base class
 * handles all entity field transformation. Subclasses are responsible for
 * implementing database-specific logic for a type of database.
 */
export default abstract class EntityDatabaseAdapter<TFields> {
  private readonly fieldTransformerMap: FieldTransformerMap;

  constructor(private readonly entityConfiguration: EntityConfiguration<TFields>) {
    this.fieldTransformerMap = this.getFieldTransformerMap();
  }

  /**
   * Transformer definitions for field types. Used to modify values as they are read from or written to
   * the database. Override in concrete subclasses to change transformation behavior.
   * If a field type is not present in the map, then fields of that type will not be transformed.
   */
  protected abstract getFieldTransformerMap(): FieldTransformerMap;

  /**
   * Fetch many objects where fieldName is one of fieldValues.
   *
   * @param queryContext - query context with which to perform the fetch
   * @param fieldName - object field being queried
   * @param fieldValues - fieldName field values being queried
   * @returns map from fieldValue to objects that match the query for that fieldValue
   */
  async fetchManyWhereAsync<K extends keyof TFields>(
    queryContext: EntityQueryContext,
    field: K,
    fieldValues: readonly NonNullable<TFields[K]>[]
  ): Promise<ReadonlyMap<NonNullable<TFields[K]>, readonly Readonly<TFields>[]>> {
    const fieldColumn = getDatabaseFieldForEntityField(this.entityConfiguration, field);
    const results = await this.fetchManyWhereInternalAsync(
      queryContext.getQueryInterface(),
      this.entityConfiguration.tableName,
      fieldColumn,
      fieldValues
    );
    const objects = results.map((result) =>
      transformDatabaseObjectToFields(this.entityConfiguration, this.fieldTransformerMap, result)
    );

    const objectMap = new Map();
    for (const fieldValue of fieldValues) {
      objectMap.set(fieldValue, []);
    }

    objects.forEach((object) => {
      const objectFieldValue = object[field];
      objectMap.get(objectFieldValue).push(object);
    });

    return objectMap;
  }

  protected abstract fetchManyWhereInternalAsync(
    queryInterface: any,
    tableName: string,
    tableField: string,
    tableValues: readonly any[]
  ): Promise<object[]>;

  /**
   * Fetch many objects matching the conjunction of where clauses constructed from
   * specified field equality operands.
   *
   * @param queryContext - query context with which to perform the fetch
   * @param fieldEqualityOperands - list of field equality where clause operand specifications
   * @param querySelectionModifiers - limit, offset, and orderBy for the query
   * @returns array of objects matching the query
   */
  async fetchManyByFieldEqualityConjunctionAsync<N extends keyof TFields>(
    queryContext: EntityQueryContext,
    fieldEqualityOperands: FieldEqualityCondition<TFields, N>[],
    querySelectionModifiers: QuerySelectionModifiers<TFields>
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
      this.convertToTableQueryModifiers(querySelectionModifiers)
    );

    return results.map((result) =>
      transformDatabaseObjectToFields(this.entityConfiguration, this.fieldTransformerMap, result)
    );
  }

  protected abstract fetchManyByFieldEqualityConjunctionInternalAsync(
    queryInterface: any,
    tableName: string,
    tableFieldSingleValueEqualityOperands: TableFieldSingleValueEqualityCondition[],
    tableFieldMultiValueEqualityOperands: TableFieldMultiValueEqualityCondition[],
    querySelectionModifiers: TableQuerySelectionModifiers
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
    querySelectionModifiers: QuerySelectionModifiers<TFields>
  ): Promise<readonly Readonly<TFields>[]> {
    const results = await this.fetchManyByRawWhereClauseInternalAsync(
      queryContext.getQueryInterface(),
      this.entityConfiguration.tableName,
      rawWhereClause,
      bindings,
      this.convertToTableQueryModifiers(querySelectionModifiers)
    );

    return results.map((result) =>
      transformDatabaseObjectToFields(this.entityConfiguration, this.fieldTransformerMap, result)
    );
  }

  protected abstract fetchManyByRawWhereClauseInternalAsync(
    queryInterface: any,
    tableName: string,
    rawWhereClause: string,
    bindings: any[] | object,
    querySelectionModifiers: TableQuerySelectionModifiers
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
    object: Readonly<Partial<TFields>>
  ): Promise<Readonly<TFields>> {
    const dbObject = transformFieldsToDatabaseObject(
      this.entityConfiguration,
      this.fieldTransformerMap,
      object
    );
    const results = await this.insertInternalAsync(
      queryContext.getQueryInterface(),
      this.entityConfiguration.tableName,
      dbObject
    );

    if (results.length > 1) {
      throw new Error(
        `Excessive results from database adapter insert: ${this.entityConfiguration.tableName}`
      );
    } else if (results.length === 0) {
      throw new Error(
        `Empty results from database adapter insert: ${this.entityConfiguration.tableName}`
      );
    }

    return transformDatabaseObjectToFields(
      this.entityConfiguration,
      this.fieldTransformerMap,
      results[0]
    );
  }

  protected abstract insertInternalAsync(
    queryInterface: any,
    tableName: string,
    object: object
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
    object: Readonly<Partial<TFields>>
  ): Promise<Readonly<TFields>> {
    const idColumn = getDatabaseFieldForEntityField(this.entityConfiguration, idField);
    const dbObject = transformFieldsToDatabaseObject(
      this.entityConfiguration,
      this.fieldTransformerMap,
      object
    );
    const results = await this.updateInternalAsync(
      queryContext.getQueryInterface(),
      this.entityConfiguration.tableName,
      idColumn,
      id,
      dbObject
    );

    if (results.length > 1) {
      throw new Error(
        `Excessive results from database adapter update: ${this.entityConfiguration.tableName}(id = ${id})`
      );
    } else if (results.length === 0) {
      throw new Error(
        `Empty results from database adapter update: ${this.entityConfiguration.tableName}(id = ${id})`
      );
    }

    return transformDatabaseObjectToFields(
      this.entityConfiguration,
      this.fieldTransformerMap,
      results[0]
    );
  }

  protected abstract updateInternalAsync(
    queryInterface: any,
    tableName: string,
    tableIdField: string,
    id: any,
    object: object
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
    id: any
  ): Promise<void> {
    const idColumn = getDatabaseFieldForEntityField(this.entityConfiguration, idField);
    const numDeleted = await this.deleteInternalAsync(
      queryContext.getQueryInterface(),
      this.entityConfiguration.tableName,
      idColumn,
      id
    );

    if (numDeleted > 1) {
      throw new Error(
        `Excessive deletions from database adapter delete: ${this.entityConfiguration.tableName}(id = ${id})`
      );
    }
  }

  protected abstract deleteInternalAsync(
    queryInterface: any,
    tableName: string,
    tableIdField: string,
    id: any
  ): Promise<number>;

  private convertToTableQueryModifiers(
    querySelectionModifiers: QuerySelectionModifiers<TFields>
  ): TableQuerySelectionModifiers {
    const orderBy = querySelectionModifiers.orderBy;
    return {
      orderBy:
        orderBy !== undefined
          ? orderBy.map((orderBySpecification) => ({
              columnName: getDatabaseFieldForEntityField(
                this.entityConfiguration,
                orderBySpecification.fieldName
              ),
              order: orderBySpecification.order,
            }))
          : undefined,
      offset: querySelectionModifiers.offset,
      limit: querySelectionModifiers.limit,
    };
  }
}
