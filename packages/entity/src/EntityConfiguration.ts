import { EntityFieldDefinition } from './EntityFields';
import { mapMap, invertMap, reduceMap } from './utils/collections/maps';

/**
 * The data storage configuration for a type of Entity. Contains information relating to IDs,
 * cachable fields, and field mappings.
 */
export default class EntityConfiguration<TFields> {
  readonly idField: keyof TFields;
  readonly tableName: string;
  readonly cacheableKeys: ReadonlySet<keyof TFields>;
  readonly cacheKeyVersion: number;
  readonly cacheName: string;

  readonly schema: ReadonlyMap<keyof TFields, EntityFieldDefinition<any>>;
  readonly entityToDBFieldsKeyMapping: ReadonlyMap<keyof TFields, string>;
  readonly dbToEntityFieldsKeyMapping: ReadonlyMap<string, keyof TFields>;

  constructor({
    idField,
    tableName,
    schema,
    cacheKeyVersion = 0,
    cacheName = tableName,
  }: {
    idField: keyof TFields;
    tableName: string;
    schema: Record<keyof TFields, EntityFieldDefinition<any>>;
    cacheKeyVersion?: number;
    cacheName?: string;
  }) {
    this.idField = idField;
    this.tableName = tableName;
    this.cacheKeyVersion = cacheKeyVersion;
    this.cacheName = cacheName;

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
    schema: ReadonlyMap<keyof TFields, EntityFieldDefinition<any>>
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
    schema: ReadonlyMap<keyof TFields, EntityFieldDefinition<any>>
  ): ReadonlyMap<keyof TFields, string> {
    return mapMap(schema, (v) => v.columnName);
  }
}
