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
import { EntityLoadMethodType } from './internal/EntityLoadInterfaces.ts';
import { SingleFieldHolder, SingleFieldValueHolder } from './internal/SingleFieldHolder.ts';

export const RESERVED_ENTITY_COUNT_QUERY_ALIAS = '__entity_count__';

/**
 * Equality operand for selecting entities where a field equals a single value.
 */
export interface SingleValueFieldEqualityCondition<
  TFields extends Record<string, any>,
  N extends keyof TFields = keyof TFields,
> {
  fieldName: N;
  fieldValue: TFields[N];
}

/**
 * Equality operand for selecting entities where a field equals one of multiple values.
 */
export interface MultiValueFieldEqualityCondition<
  TFields extends Record<string, any>,
  N extends keyof TFields = keyof TFields,
> {
  fieldName: N;
  fieldValues: readonly TFields[N][];
}

/**
 * A single equality operand for use in a conjunction selection clause.
 * See {@link AuthorizationResultBasedEntityLoader.loadManyByFieldEqualityConjunctionAsync} and
 * {@link EntityDatabaseAdapter.fetchManyByFieldEqualityConjunctionAsync}.
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
    const objectMap = key.vendNewLoadValueMap<Readonly<TFields>[]>();
    for (const value of values) {
      objectMap.set(value, []);
    }

    const inherentFilters = this.entityConfiguration.inherentFilters;

    let objects: readonly Readonly<TFields>[];

    // When the entity has inherent filters and the load is on a single field, route the
    // fetch through fetchManyByFieldEqualityConjunctionAsync so that adapters with native
    // conjunction support (e.g. the knex adapter) can push the inherent filters all the
    // way down to SQL. Composite-key loads fall through to fetchManyWhereInternalAsync and
    // apply inherent filters as an in-memory post-filter, since their `(col1, col2) IN
    // tuples` shape doesn't decompose to per-column equality.
    if (
      inherentFilters.length > 0 &&
      key.getLoadMethodType() === EntityLoadMethodType.SINGLE &&
      values.length > 0
    ) {
      const singleFieldKey = key as unknown as SingleFieldHolder<TFields, TIDField, keyof TFields>;
      const fieldName = singleFieldKey.fieldName;
      const fieldValues = (
        values as unknown as readonly SingleFieldValueHolder<TFields, keyof TFields>[]
      ).map((v) => v.fieldValue);
      const operands: FieldEqualityCondition<TFields, keyof TFields>[] = [
        { fieldName, fieldValues } as FieldEqualityCondition<TFields, keyof TFields>,
      ];
      // fetchManyByFieldEqualityConjunctionAsync also AND's in inherent filters internally.
      objects = await this.fetchManyByFieldEqualityConjunctionAsync(queryContext, operands);
    } else {
      const keyDatabaseColumns = key.getDatabaseColumns(this.entityConfiguration);
      const valueDatabaseValues = values.map((value) => key.getDatabaseValues(value));

      const results = await this.fetchManyWhereInternalAsync(
        queryContext.getQueryInterface(),
        this.entityConfiguration.tableName,
        keyDatabaseColumns,
        valueDatabaseValues,
      );

      const transformed = results.map((result) =>
        transformDatabaseObjectToFields(this.entityConfiguration, this.fieldTransformerMap, result),
      );

      objects =
        inherentFilters.length > 0 ? this.applyInherentFiltersInMemory(transformed) : transformed;
    }

    for (const object of objects) {
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
    }

    return objectMap;
  }

  private applyInherentFiltersInMemory(
    objects: readonly Readonly<TFields>[],
  ): readonly Readonly<TFields>[] {
    // Callers must guard on inherentFilters.length > 0; this method assumes there is at
    // least one filter to apply. An empty `every` would no-op, but the guard at the call
    // site keeps the common case (no filters) free of the array.filter overhead.
    const inherentFilters = this.entityConfiguration.inherentFilters;
    return objects.filter((object) =>
      inherentFilters.every((operand) => {
        const value = object[operand.fieldName];
        if (isSingleValueFieldEqualityCondition(operand)) {
          return value === operand.fieldValue;
        }
        return operand.fieldValues.some((v) => v === value);
      }),
    );
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
    const inherentFilters = this.entityConfiguration.inherentFilters;

    // Mirror fetchManyWhereAsync: when there are inherent filters and the key is a single
    // field, route through the conjunction path so adapters with native conjunction
    // support can apply the filters in SQL.
    if (inherentFilters.length > 0 && key.getLoadMethodType() === EntityLoadMethodType.SINGLE) {
      const singleFieldKey = key as unknown as SingleFieldHolder<TFields, TIDField, keyof TFields>;
      const singleFieldValue = value as unknown as SingleFieldValueHolder<TFields, keyof TFields>;
      const operands: FieldEqualityCondition<TFields, keyof TFields>[] = [
        {
          fieldName: singleFieldKey.fieldName,
          fieldValue: singleFieldValue.fieldValue,
        } as FieldEqualityCondition<TFields, keyof TFields>,
        ...inherentFilters,
      ];
      const matches = await this.fetchManyByFieldEqualityConjunctionAsync(queryContext, operands);
      return matches[0] ?? null;
    }

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

    const object = transformDatabaseObjectToFields(
      this.entityConfiguration,
      this.fieldTransformerMap,
      result,
    );

    if (inherentFilters.length > 0) {
      const [matched] = this.applyInherentFiltersInMemory([object]);
      return matched ?? null;
    }

    return object;
  }

  protected abstract fetchOneWhereInternalAsync(
    queryInterface: any,
    tableName: string,
    tableColumns: readonly string[],
    tableTuple: readonly any[],
  ): Promise<object | null>;

  /**
   * Fetch objects matching the conjunction of equality operands. Each operand asserts that a
   * field equals a single value (SingleValueFieldEqualityCondition) or one of multiple values
   * (MultiValueFieldEqualityCondition). All operands are AND'd together. The entity
   * configuration's {@link EntityConfiguration.inherentFilters} are also AND'd in.
   *
   * The default implementation builds the SQL WHERE clause from the single-value operands
   * (via {@link fetchManyWhereInternalAsync}) and applies multi-value operands as an
   * in-memory filter. Concrete adapters with native conjunction support should override
   * this method.
   *
   * Limitations of the default implementation:
   * - Requires at least one single-value operand (after combining caller-supplied operands
   *   with the entity's inherent filters). Pure multi-value-only conjunctions throw.
   * - Single-value operands with a null `fieldValue` will not match anything (NULL semantics).
   *   Adapters that need to support null-equality operands should override this method.
   *
   * @param queryContext - query context with which to perform the fetch
   * @param fieldEqualityOperands - list of field equality where-clause operands AND'd together
   * @returns array of objects matching the conjunction
   */
  async fetchManyByFieldEqualityConjunctionAsync<N extends keyof TFields>(
    queryContext: EntityQueryContext,
    fieldEqualityOperands: readonly FieldEqualityCondition<TFields, N>[],
  ): Promise<readonly Readonly<TFields>[]> {
    const combinedOperands: readonly FieldEqualityCondition<TFields, N>[] = [
      ...fieldEqualityOperands,
      ...(this.entityConfiguration.inherentFilters as readonly FieldEqualityCondition<
        TFields,
        N
      >[]),
    ];

    const singleValueOperands: SingleValueFieldEqualityCondition<TFields, N>[] = [];
    const multiValueOperands: MultiValueFieldEqualityCondition<TFields, N>[] = [];
    for (const operand of combinedOperands) {
      if (isSingleValueFieldEqualityCondition(operand)) {
        singleValueOperands.push(operand);
      } else {
        multiValueOperands.push(operand);
      }
    }

    if (multiValueOperands.some((op) => op.fieldValues.length === 0)) {
      return [];
    }

    invariant(
      singleValueOperands.length > 0,
      'EntityDatabaseAdapter default fetchManyByFieldEqualityConjunctionAsync requires at least ' +
        'one single-value field equality operand. Subclasses may override this method for more ' +
        'general support.',
    );

    const tableColumns = singleValueOperands.map((op) =>
      getDatabaseFieldForEntityField(this.entityConfiguration, op.fieldName),
    );
    const tableTuple = singleValueOperands.map((op) => op.fieldValue);

    const rawRows = await this.fetchManyWhereInternalAsync(
      queryContext.getQueryInterface(),
      this.entityConfiguration.tableName,
      tableColumns,
      [tableTuple],
    );

    const transformedRows = rawRows.map((row) =>
      transformDatabaseObjectToFields(this.entityConfiguration, this.fieldTransformerMap, row),
    );

    if (multiValueOperands.length === 0) {
      return transformedRows;
    }

    return transformedRows.filter((row) =>
      multiValueOperands.every((op) => {
        const rowValue = row[op.fieldName];
        return op.fieldValues.some((v) => v === rowValue);
      }),
    );
  }

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
   */
  async updateAsync<K extends keyof TFields>(
    queryContext: EntityQueryContext,
    idField: K,
    id: any,
    object: Readonly<Partial<TFields>>,
  ): Promise<void> {
    const idColumn = getDatabaseFieldForEntityField(this.entityConfiguration, idField);
    const dbObject = transformFieldsToDatabaseObject(
      this.entityConfiguration,
      this.fieldTransformerMap,
      object,
    );
    const { updatedRowCount } = await this.updateInternalAsync(
      queryContext.getQueryInterface(),
      this.entityConfiguration.tableName,
      idColumn,
      id,
      dbObject,
    );

    if (updatedRowCount > 1) {
      // This should never happen with a properly implemented database adapter unless the underlying table has a non-unique
      // primary key column.
      throw new EntityDatabaseAdapterExcessiveUpdateResultError(
        `Excessive results from database adapter update: ${this.entityConfiguration.tableName}(id = ${id})`,
      );
    } else if (updatedRowCount === 0) {
      // This happens when the object to update does not exist. It may have been deleted by another process.
      throw new EntityDatabaseAdapterEmptyUpdateResultError(
        `Empty results from database adapter update: ${this.entityConfiguration.tableName}(id = ${id})`,
      );
    }
  }

  protected abstract updateInternalAsync(
    queryInterface: any,
    tableName: string,
    tableIdField: string,
    id: any,
    object: object,
  ): Promise<{ updatedRowCount: number }>;

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
