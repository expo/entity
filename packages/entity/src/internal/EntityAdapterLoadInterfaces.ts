import EntityConfiguration from '../EntityConfiguration';
import { ISerializable, SerializableKeyMap } from '../utils/collections/SerializableKeyMap';

export enum DataManagerLoadMethodType {
  SINGLE = 'single',
  COMPOSITE = 'composite',
}

export interface IEntityLoadKey<
  TFields extends Record<string, any>,
  TSerializedLoadValue,
  TLoadValue extends IEntityLoadValue<TSerializedLoadValue>,
> {
  debugString(): string;

  // load value map type
  vendNewLoadValueMap<V>(): LoadValueMap<TSerializedLoadValue, TLoadValue, V>;

  // cache adapter methods
  isCacheable(entityConfiguration: EntityConfiguration<TFields>): boolean;
  getCacheKeyParts(
    entityConfiguration: EntityConfiguration<TFields>,
    value: TLoadValue,
  ): { cacheKeyType: string; parts: readonly string[] };

  // data manager methods
  getDataManagerLoadMethodType(): DataManagerLoadMethodType;
  getDataManagerDataLoaderKey(): string;
  serializeLoadValueForDataManagerDataLoader(value: TLoadValue): unknown;
  deserializeLoadValueForDataManagerDataLoader(value: unknown): TLoadValue;
  validateRuntimeLoadValuesForDataManagerDataLoader(
    values: readonly TLoadValue[],
    entityClassName: string,
  ): void;

  // database adapter methods
  getDatabaseColumns(entityConfiguration: EntityConfiguration<TFields>): readonly string[];
  getDatabaseValues(value: TLoadValue): readonly any[];
  getLoadValueForObject(object: Readonly<TFields>): TLoadValue | null;
}

export interface IEntityLoadValue<TSerialized> extends ISerializable<TSerialized> {
  debugString(): string;
}

export abstract class LoadValueMap<
  TSerialized,
  TLoadValue extends IEntityLoadValue<TSerialized>,
  V,
> extends SerializableKeyMap<TSerialized, TLoadValue, V> {}
