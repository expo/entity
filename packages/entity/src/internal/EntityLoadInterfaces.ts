import { EntityConfiguration } from '../EntityConfiguration';
import { ISerializable, SerializableKeyMap } from '../utils/collections/SerializableKeyMap';

/**
 * Load method type identifier of a load key. Used for keying data loaders and identification in metrics.
 *
 * @internal
 */
export enum EntityLoadMethodType {
  /**
   * Load method type for loading entities by single fieldName and fieldValue(s).
   */
  SINGLE = 'single',

  /**
   * Load method type for loading entities by composite field.
   */
  COMPOSITE = 'composite',
}

/**
 * Interface responsible for defining how the key and corresponding load values behave in the data manager, cache adapter,
 * and database adapter during entity field loading.
 *
 * @internal
 */
export interface IEntityLoadKey<
  TFields extends Record<string, any>,
  TIDField extends keyof TFields,
  TSerializedLoadValue,
  TLoadValue extends IEntityLoadValue<TSerializedLoadValue>,
> {
  toString(): string;

  /**
   * Vends a new empty load value map with a key type corresponding to the load value type of this load key.
   *
   * @returns A new empty load value map.
   */
  vendNewLoadValueMap<V>(): LoadValueMap<TSerializedLoadValue, TLoadValue, V>;

  /**
   * Determines if this key is cacheable in cache adapters according to the entity configuration.
   *
   * @param entityConfiguration - The entity configuration to check.
   * @returns Boolean indicating whether this key is cacheable.
   */
  isCacheable(entityConfiguration: EntityConfiguration<TFields, TIDField>): boolean;

  /**
   * Creates cache key parts for this key and a load value given an entity configuration.
   * These parts will be included as part of the cache key.
   *
   * @param entityConfiguration - The entity configuration used to derive cache key parts.
   * @param value - The load value for which to create cache key parts for.
   * @returns An object containing the cache key type and parts.
   */
  createCacheKeyPartsForLoadValue(
    entityConfiguration: EntityConfiguration<TFields, TIDField>,
    value: TLoadValue,
  ): readonly string[];

  /**
   * Gets the load method type of this key. Used as part of cache keys and data loader keys.
   */
  getLoadMethodType(): EntityLoadMethodType;

  /**
   * Gets the data loader key for this key. For single field keys, this is the field name. For composite keys, this is a
   * unique identifier for the composite key.
   */
  getDataManagerDataLoaderKey(): string;

  /**
   * Serialize a load value for use in the data manager data loader as the dataloader value key.
   */
  serializeLoadValue(value: TLoadValue): TSerializedLoadValue;

  /**
   * Deserialize a load value for use in the data manager data loader as the dataloader value key.
   */
  deserializeLoadValue(value: TSerializedLoadValue): TLoadValue;

  /**
   * Validate that that the load values adhere to the typescript types at runtime in order to
   * prevent inadvertently passing invalid values to the data loader, cache adapter, or database adapter.
   * @param values - The load values to validate.
   * @param entityClassName - The name of the entity class to which the load values belong (for error message only).
   */
  validateRuntimeLoadValuesForDataManagerDataLoader(
    values: readonly TLoadValue[],
    entityClassName: string,
  ): void;

  /**
   * Get the database columns for this key given an entity configuration.
   *
   * @param entityConfiguration - The entity configuration.
   * @returns An array of database column names.
   */
  getDatabaseColumns(
    entityConfiguration: EntityConfiguration<TFields, TIDField>,
  ): readonly string[];

  /**
   * Get the database values corresponding to the database columns for this key for a load value.
   *
   * @param value - The load value.
   * @returns An array of database values.
   */
  getDatabaseValues(value: TLoadValue): readonly any[];

  /**
   * Get the load value for an entity fields object from the database.
   *
   * @param object - The entity fields object.
   * @returns The load value for the object or null if the load value would be invalid for the object (for example, if the value is null).
   */
  getLoadValueForObject(object: Readonly<TFields>): TLoadValue | null;
}

/**
 * Interface for a load value corresponding to a load key.
 *
 * @internal
 */
export interface IEntityLoadValue<TSerialized> extends ISerializable<TSerialized> {
  toString(): string;
}

/**
 * Map from load value interface to value.
 *
 * @internal
 */
export abstract class LoadValueMap<
  TSerialized,
  TLoadValue extends IEntityLoadValue<TSerialized>,
  V,
> extends SerializableKeyMap<TSerialized, TLoadValue, V> {}

/**
 * Load pair type for a load key and load value.
 *
 * @internal
 */
export type LoadPair<
  TFields extends Record<string, any>,
  TIDField extends keyof TFields,
  TLoadKey extends IEntityLoadKey<TFields, TIDField, TSerializedLoadValue, TLoadValue>,
  TSerializedLoadValue,
  TLoadValue extends IEntityLoadValue<TSerializedLoadValue>,
> = readonly [TLoadKey, TLoadValue];
