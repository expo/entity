import { DatabaseAdapterFlavor, CacheAdapterFlavor } from './EntityCompanionProvider';
import { EntityFieldDefinition } from './EntityFields';
import { mapMap, invertMap, reduceMap } from './utils/collections/maps';

/**
 * The data storage configuration for a type of Entity. Contains information relating to IDs,
 * cachable fields, field mappings, and types of cache and database adapter.
 */
export default class EntityConfiguration<TDatabaseFields> {
  readonly idField: keyof TDatabaseFields;
  readonly tableName: string;
  readonly cacheableKeys: ReadonlySet<keyof TDatabaseFields>;
  readonly cacheKeyVersion: number;

  readonly schema: ReadonlyMap<keyof TDatabaseFields, EntityFieldDefinition>;
  readonly entityToDBFieldsKeyMapping: ReadonlyMap<keyof TDatabaseFields, string>;
  readonly dbToEntityFieldsKeyMapping: ReadonlyMap<string, keyof TDatabaseFields>;

  readonly databaseAdapterFlavor: DatabaseAdapterFlavor;
  readonly cacheAdapterFlavor: CacheAdapterFlavor;

  constructor({
    idField,
    tableName,
    schema,
    cacheKeyVersion = 0,
    databaseAdapterFlavor,
    cacheAdapterFlavor,
  }: {
    idField: keyof TDatabaseFields;
    tableName: string;
    schema: Record<keyof TDatabaseFields, EntityFieldDefinition>;
    cacheKeyVersion?: number;
    databaseAdapterFlavor: DatabaseAdapterFlavor;
    cacheAdapterFlavor: CacheAdapterFlavor;
  }) {
    this.idField = idField;
    this.tableName = tableName;
    this.cacheKeyVersion = cacheKeyVersion;
    this.databaseAdapterFlavor = databaseAdapterFlavor;
    this.cacheAdapterFlavor = cacheAdapterFlavor;

    // external schema is a Record to typecheck that all fields have FieldDefinitions,
    // but internally the most useful representation is a map for lookups
    // TODO(wschurman): validate schema
    this.schema = new Map(Object.entries(schema) as any);

    this.cacheableKeys = EntityConfiguration.computeCacheableKeys(this.schema);
    this.entityToDBFieldsKeyMapping = EntityConfiguration.computeEntityToDBFieldsKeyMapping(
      this.schema
    );
    this.dbToEntityFieldsKeyMapping = invertMap(this.entityToDBFieldsKeyMapping);
  }

  private static computeCacheableKeys<TFields>(
    schema: ReadonlyMap<keyof TFields, EntityFieldDefinition>
  ): ReadonlySet<keyof TFields> {
    return reduceMap(
      schema,
      (acc, v, k) => {
        if (v.cache) {
          acc.add(k);
        }
        return acc;
      },
      new Set<keyof TFields>()
    );
  }

  private static computeEntityToDBFieldsKeyMapping<TFields>(
    schema: ReadonlyMap<keyof TFields, EntityFieldDefinition>
  ): ReadonlyMap<keyof TFields, string> {
    return mapMap(schema, (v) => v.columnName);
  }
}
