import { IEntityClass } from './Entity';
import { DatabaseAdapterFlavor, CacheAdapterFlavor } from './EntityCompanionProvider';
import { EntityFieldDefinition } from './EntityFieldDefinition';
import { mapMap, invertMap, reduceMap } from './utils/collections/maps';

/**
 * The data storage configuration for a type of Entity. Contains information relating to IDs,
 * cachable fields, field mappings, and types of cache and database adapter.
 */
export default class EntityConfiguration<TFields extends Record<string, any>> {
  readonly idField: keyof TFields;
  readonly tableName: string;
  readonly cacheableKeys: ReadonlySet<keyof TFields>;
  readonly cacheKeyVersion: number;

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
    databaseAdapterFlavor,
    cacheAdapterFlavor,
  }: {
    /**
     * The field used to identify this entity. Must be a unique field in the table.
     */
    idField: keyof TFields;

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
    EntityConfiguration.validateSchema(schema);
    this.schema = new Map(Object.entries(schema));

    this.cacheableKeys = EntityConfiguration.computeCacheableKeys(this.schema);
    this.entityToDBFieldsKeyMapping = EntityConfiguration.computeEntityToDBFieldsKeyMapping(
      this.schema,
    );
    this.dbToEntityFieldsKeyMapping = invertMap(this.entityToDBFieldsKeyMapping);
  }

  private static validateSchema<TFields extends Record<string, any>>(schema: TFields): void {
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
