import { DatabaseAdapterFlavor, CacheAdapterFlavor } from './EntityCompanionProvider';
import { EntityFieldDefinition } from './EntityFields';
import { mapMap, invertMap, reduceMap } from './utils/collections/maps';

/**
 * The data storage configuration for a type of Entity. Contains information relating to IDs,
 * cachable fields, field mappings, and types of cache and database adapter.
 */
export default class EntityConfiguration<TFields> {
  readonly idField: keyof TFields;
  readonly tableName: string;
  readonly cacheableKeys: ReadonlySet<keyof TFields>;
  readonly cacheKeyVersion: number;

  readonly schema: ReadonlyMap<keyof TFields, EntityFieldDefinition>;
  readonly entityToDBFieldsKeyMapping: ReadonlyMap<keyof TFields, string>;
  readonly dbToEntityFieldsKeyMapping: ReadonlyMap<string, keyof TFields>;

  readonly databaseAdaptorFlavor: DatabaseAdapterFlavor;
  readonly cacheAdaptorFlavor: CacheAdapterFlavor;

  constructor({
    idField,
    tableName,
    schema,
    cacheKeyVersion = 0,
    databaseAdaptorFlavor,
    cacheAdaptorFlavor,
  }: {
    idField: keyof TFields;
    tableName: string;
    schema: Record<keyof TFields, EntityFieldDefinition>;
    cacheKeyVersion?: number;
    databaseAdaptorFlavor: DatabaseAdapterFlavor;
    cacheAdaptorFlavor: CacheAdapterFlavor;
  }) {
    this.idField = idField;
    this.tableName = tableName;
    this.cacheKeyVersion = cacheKeyVersion;
    this.databaseAdaptorFlavor = databaseAdaptorFlavor;
    this.cacheAdaptorFlavor = cacheAdaptorFlavor;

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
