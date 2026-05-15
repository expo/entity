import invariant from 'invariant';

import type { IEntityClass } from './Entity.ts';
import type { CacheAdapterFlavor, DatabaseAdapterFlavor } from './EntityCompanionProvider.ts';
import type { FieldEqualityCondition } from './EntityDatabaseAdapter.ts';
import { RESERVED_ENTITY_COUNT_QUERY_ALIAS } from './EntityDatabaseAdapter.ts';
import type { EntityFieldDefinition } from './EntityFieldDefinition.ts';
import type { SerializedCompositeFieldHolder } from './internal/CompositeFieldHolder.ts';
import { CompositeFieldHolder } from './internal/CompositeFieldHolder.ts';
import { invertMap, mapMap, reduceMap } from './utils/collections/maps.ts';

/**
 * A composite field is an unordered set of fields by which entities can be loaded in a batched
 * and (optionally) cached manner akin to how normal fieldName loads are batched and (optionally) cached.
 */
export type EntityCompositeField<TFields extends Record<string, any>> = readonly (keyof TFields)[];

/**
 * Specification of composite field for an entity and whether it can be cached.
 */
export type EntityCompositeFieldDefinition<TFields extends Record<string, any>> = {
  /**
   * The composite field.
   */
  compositeField: EntityCompositeField<TFields>;

  /**
   * Whether or not to cache loaded instances of the entity by this composite field. The column names in
   * the composite field are used to derive a cache key for the cache entry. If true, the set of columns
   * must be able uniquely identify the entity and the database must have a unique constraint on the
   * set of columns.
   */
  cache: boolean;
};

/**
 * A composite field value is a mapping of fields to values for a composite field.
 */
export type EntityCompositeFieldValue<
  TFields extends Record<string, any>,
  TCompositeField extends EntityCompositeField<TFields>,
> = Record<TCompositeField[number], NonNullable<TFields[TCompositeField[number]]>>;

/**
 * Helper class to validate and store composite field information.
 */
export class CompositeFieldInfo<
  TFields extends Record<string, any>,
  TIDField extends keyof TFields,
> {
  private readonly compositeFieldInfoMap: ReadonlyMap<
    SerializedCompositeFieldHolder,
    {
      compositeFieldHolder: CompositeFieldHolder<TFields, TIDField>;
      cache: boolean;
    }
  >;

  constructor(compositeFieldsDefinitions: EntityCompositeFieldDefinition<TFields>[]) {
    this.compositeFieldInfoMap = new Map(
      compositeFieldsDefinitions.map((keyDefinition) => {
        invariant(
          keyDefinition.compositeField.length >= 2,
          'Composite field must have at least two sub-fields',
        );
        invariant(
          keyDefinition.compositeField.length === new Set(keyDefinition.compositeField).size,
          'Composite field must have unique sub-fields',
        );
        const compositeFieldHolder = new CompositeFieldHolder<TFields, TIDField>(
          keyDefinition.compositeField,
        );
        return [
          compositeFieldHolder.serialize(),
          { compositeFieldHolder, cache: keyDefinition.cache ?? false },
        ];
      }),
    );
  }

  public getCompositeFieldHolderForCompositeField(
    compositeField: EntityCompositeField<TFields>,
  ): CompositeFieldHolder<TFields, TIDField> | undefined {
    return this.compositeFieldInfoMap.get(
      new CompositeFieldHolder<TFields, TIDField>(compositeField).serialize(),
    )?.compositeFieldHolder;
  }

  public getAllCompositeFieldHolders(): readonly CompositeFieldHolder<TFields, TIDField>[] {
    return Array.from(this.compositeFieldInfoMap.values()).map((v) => v.compositeFieldHolder);
  }

  public canCacheCompositeField(compositeField: EntityCompositeField<TFields>): boolean {
    const compositeFieldInfo = this.compositeFieldInfoMap.get(
      new CompositeFieldHolder<TFields, TIDField>(compositeField).serialize(),
    );
    invariant(
      compositeFieldInfo,
      `Composite field (${compositeField.join(',')}) not found in entity configuration`,
    );
    return compositeFieldInfo.cache;
  }
}

/**
 * The data storage configuration for a type of Entity. Contains information relating to IDs,
 * cachable fields, field mappings, and types of cache and database adapter.
 */
export class EntityConfiguration<
  TFields extends Record<string, any>,
  TIDField extends keyof TFields,
> {
  readonly idField: TIDField;
  readonly tableName: string;
  readonly cacheableKeys: ReadonlySet<keyof TFields>;
  readonly compositeFieldInfo: CompositeFieldInfo<TFields, TIDField>;
  readonly cacheKeyVersion: number;

  readonly inboundEdges: IEntityClass<any, any, any, any, any, any>[];
  readonly schema: ReadonlyMap<keyof TFields, EntityFieldDefinition<any, any>>;
  readonly entityToDBFieldsKeyMapping: ReadonlyMap<keyof TFields, string>;
  readonly dbToEntityFieldsKeyMapping: ReadonlyMap<string, keyof TFields>;

  readonly inherentFilters: readonly FieldEqualityCondition<TFields, keyof TFields>[];

  /**
   * Cache-key component derived from {@link inherentFilters}; empty string when no filters
   * are configured. Two configurations sharing a `tableName` but with different inherent
   * filters represent different logical scopes of the same physical table, and must not
   * share cache namespaces. Cache adapters include this component in their cache keys so
   * that scope-A and scope-B caches stay isolated even when the underlying cache store is
   * shared.
   *
   * @internal
   */
  readonly inherentFiltersCacheKeyComponent: string;

  readonly databaseAdapterFlavor: DatabaseAdapterFlavor;
  readonly cacheAdapterFlavor: CacheAdapterFlavor;

  constructor({
    idField,
    tableName,
    schema,
    inboundEdges = [],
    cacheKeyVersion = 0,
    compositeFieldDefinitions,
    inherentFilters,
    databaseAdapterFlavor,
    cacheAdapterFlavor,
  }: {
    /**
     * The field used to identify this entity. Must be a unique field in the table.
     */
    idField: TIDField;

    /**
     * The name of the table where entities of this type are stored.
     */
    tableName: string;

    /**
     * Map from each entity field to an EntityFieldDefinition specifying information about the field.
     */
    schema: Omit<Record<keyof TFields, EntityFieldDefinition<any, false>>, TIDField> &
      Record<TIDField, EntityFieldDefinition<any, true>>;

    /**
     * List of other entity types that reference this type in EntityFieldDefinition associations.
     */
    inboundEdges?: IEntityClass<any, any, any, any, any, any>[];

    /**
     * Cache key version for this entity type. Should be bumped when a field is added to, removed from, or changed
     * in this entity and the underlying database table.
     */
    cacheKeyVersion?: number;

    /**
     * Composite field definitions for this entity.
     */
    compositeFieldDefinitions?: EntityCompositeFieldDefinition<TFields>[];

    /**
     * Field equality conditions that are inherent to this entity type — i.e., they are AND'd
     * into every fetch against the underlying table for this entity. Useful for polymorphic
     * tables where multiple entity classes share a row layout (each class registers a
     * scope-disambiguating filter so it only ever sees its own rows), and for any other case
     * where an entity represents a strict subset of the rows in its table (e.g., a
     * `deletedAt IS NULL` invariant, or a tenant scope).
     *
     * Rows that don't satisfy these filters are invisible to this entity's loaders: a
     * `loadByIDAsync` against an excluded row returns null; a `loadManyByFieldEqualingAsync`
     * never returns excluded rows; and cascade deletes through this entity's inbound edges
     * only see the included scope. Cache keys are not augmented — relying on the fact that
     * each entity class has its own configuration and therefore its own cache namespace.
     */
    inherentFilters?: readonly FieldEqualityCondition<TFields, keyof TFields>[];

    /**
     * Backing database and transaction type for this entity.
     */
    databaseAdapterFlavor: DatabaseAdapterFlavor;

    /**
     * Cache system for this entity.
     */
    cacheAdapterFlavor: CacheAdapterFlavor;
  }) {
    this.idField = idField;
    this.tableName = tableName;
    this.cacheKeyVersion = cacheKeyVersion;
    this.databaseAdapterFlavor = databaseAdapterFlavor;
    this.cacheAdapterFlavor = cacheAdapterFlavor;
    this.inboundEdges = inboundEdges;
    this.inherentFilters = inherentFilters ?? [];
    this.inherentFiltersCacheKeyComponent =
      this.inherentFilters.length === 0
        ? ''
        : `f${JSON.stringify(
            // Sort by field name so call-order differences in inherentFilters declaration
            // don't change the cache key.
            [...this.inherentFilters].sort((a, b) =>
              String(a.fieldName) < String(b.fieldName)
                ? -1
                : String(a.fieldName) > String(b.fieldName)
                  ? 1
                  : 0,
            ),
          )}`;

    // external schema is a Record to typecheck that all fields have FieldDefinitions,
    // but internally the most useful representation is a map for lookups
    this.schema = this.validateSchemaMap(new Map(Object.entries(schema)));

    this.cacheableKeys = EntityConfiguration.computeCacheableKeys(this.schema);
    this.compositeFieldInfo = new CompositeFieldInfo(compositeFieldDefinitions ?? []);
    this.entityToDBFieldsKeyMapping = EntityConfiguration.computeEntityToDBFieldsKeyMapping(
      this.schema,
    );
    this.dbToEntityFieldsKeyMapping = invertMap(this.entityToDBFieldsKeyMapping);
  }

  private validateSchemaMap(
    schemaMap: ReadonlyMap<keyof TFields, EntityFieldDefinition<any, any>>,
  ): ReadonlyMap<keyof TFields, EntityFieldDefinition<any, any>> {
    for (const disallowedFieldName of Object.getOwnPropertyNames(Object.prototype)) {
      if (schemaMap.has(disallowedFieldName)) {
        throw new Error(
          `Entity field name not allowed to prevent conflicts with standard Object prototype fields: ${disallowedFieldName}`,
        );
      }
    }

    // check for column named RESERVED_ENTITY_COUNT_QUERY_ALIAS which is used for count queries and would cause issues if used as a column name for an entity field
    for (const [fieldName, fieldDefinition] of schemaMap) {
      if (fieldDefinition.columnName === RESERVED_ENTITY_COUNT_QUERY_ALIAS) {
        throw new Error(
          `Entity field "${String(fieldName)}" has disallowed column name "${RESERVED_ENTITY_COUNT_QUERY_ALIAS}" which is reserved for count queries. Choose a different column name.`,
        );
      }
    }

    return schemaMap;
  }

  private static computeCacheableKeys<TFields extends Record<string, any>>(
    schema: ReadonlyMap<keyof TFields, EntityFieldDefinition<any, any>>,
  ): ReadonlySet<keyof TFields> {
    return reduceMap(
      schema,
      (acc, v, k) => {
        if (v.cache) {
          acc.add(k);
        }
        return acc;
      },
      new Set<keyof TFields>(),
    );
  }

  private static computeEntityToDBFieldsKeyMapping<TFields>(
    schema: ReadonlyMap<keyof TFields, EntityFieldDefinition<any, any>>,
  ): ReadonlyMap<keyof TFields, string> {
    return mapMap(schema, (v) => v.columnName);
  }
}
