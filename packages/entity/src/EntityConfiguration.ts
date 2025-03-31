import invariant from 'invariant';

import { IEntityClass } from './Entity';
import { DatabaseAdapterFlavor, CacheAdapterFlavor } from './EntityCompanionProvider';
import { EntityFieldDefinition } from './EntityFieldDefinition';
import {
  CompositeFieldHolder,
  SerializedCompositeFieldHolder,
} from './internal/CompositeFieldHolder';
import { mapMap, invertMap, reduceMap } from './utils/collections/maps';

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
  cache?: boolean;
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
        const compositeFieldHolder = new CompositeFieldHolder(keyDefinition.compositeField);
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
    return this.compositeFieldInfoMap.get(new CompositeFieldHolder(compositeField).serialize())
      ?.compositeFieldHolder;
  }

  public getAllCompositeFieldHolders(): readonly CompositeFieldHolder<TFields, TIDField>[] {
    return Array.from(this.compositeFieldInfoMap.values()).map((v) => v.compositeFieldHolder);
  }

  public canCacheCompositeField(compositeField: EntityCompositeField<TFields>): boolean {
    const compositeFieldInfo = this.compositeFieldInfoMap.get(
      new CompositeFieldHolder(compositeField).serialize(),
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
export default class EntityConfiguration<
  TFields extends Record<string, any>,
  TIDField extends keyof TFields,
> {
  readonly idField: keyof TFields;
  readonly tableName: string;
  readonly cacheableKeys: ReadonlySet<keyof TFields>;
  readonly compositeFieldInfo: CompositeFieldInfo<TFields, TIDField>;
  readonly cacheKeyVersion: number;
  readonly otherCacheKeyVersionsToInvalidate: ReadonlySet<number> = new Set();

  readonly inboundEdges: IEntityClass<any, any, any, any, any, any>[];
  readonly schema: ReadonlyMap<keyof TFields, EntityFieldDefinition<any>>;
  readonly entityToDBFieldsKeyMapping: ReadonlyMap<keyof TFields, string>;
  readonly dbToEntityFieldsKeyMapping: ReadonlyMap<string, keyof TFields>;

  readonly databaseAdapterFlavor: DatabaseAdapterFlavor;
  readonly cacheAdapterFlavor: CacheAdapterFlavor;

  constructor({
    idField,
    tableName,
    schema,
    inboundEdges = [],
    cacheKeyVersion = 0,
    compositeFieldDefinitions,
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
    schema: Record<keyof TFields, EntityFieldDefinition<any>>;

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

    // external schema is a Record to typecheck that all fields have FieldDefinitions,
    // but internally the most useful representation is a map for lookups
    EntityConfiguration.validateSchema<TFields>(schema);
    this.schema = new Map(Object.entries(schema));

    this.cacheableKeys = EntityConfiguration.computeCacheableKeys(this.schema);
    this.compositeFieldInfo = new CompositeFieldInfo(compositeFieldDefinitions ?? []);
    this.entityToDBFieldsKeyMapping = EntityConfiguration.computeEntityToDBFieldsKeyMapping(
      this.schema,
    );
    this.dbToEntityFieldsKeyMapping = invertMap(this.entityToDBFieldsKeyMapping);
  }

  private static validateSchema<TFields extends Record<string, any>>(
    schema: Record<keyof TFields, EntityFieldDefinition<any>>,
  ): void {
    const disallowedFieldsKeys = Object.getOwnPropertyNames(Object.prototype);
    for (const disallowedFieldsKey of disallowedFieldsKeys) {
      if (Object.hasOwn(schema, disallowedFieldsKey)) {
        throw new Error(
          `Entity field name not allowed to prevent conflicts with standard Object prototype fields: ${disallowedFieldsKey}`,
        );
      }
    }
  }

  private static computeCacheableKeys<TFields extends Record<string, any>>(
    schema: ReadonlyMap<keyof TFields, EntityFieldDefinition<any>>,
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
    schema: ReadonlyMap<keyof TFields, EntityFieldDefinition<any>>,
  ): ReadonlyMap<keyof TFields, string> {
    return mapMap(schema, (v) => v.columnName);
  }
}
