import invariant from 'invariant';

import EntityConfiguration from '../EntityConfiguration';
import { getDatabaseFieldForEntityField } from './EntityFieldTransformationUtils';
import {
  EntityLoadMethodType,
  IEntityLoadKey,
  IEntityLoadValue,
  LoadValueMap,
} from './EntityLoadInterfaces';

/**
 * A load key that represents a single field (fieldName) on an entity.
 */
export class SingleFieldHolder<TFields extends Record<string, any>, N extends keyof TFields>
  implements IEntityLoadKey<TFields, NonNullable<TFields[N]>, SingleFieldValueHolder<TFields, N>>
{
  constructor(public readonly fieldName: N) {}

  debugString(): string {
    return `SingleFieldHolder[${String(this.fieldName)}]`;
  }

  public isCacheable(entityConfiguration: EntityConfiguration<TFields>): boolean {
    return entityConfiguration.cacheableKeys.has(this.fieldName);
  }

  public getDatabaseColumns(entityConfiguration: EntityConfiguration<TFields>): string[] {
    return [getDatabaseFieldForEntityField(entityConfiguration, this.fieldName)];
  }

  getDatabaseValues(value: SingleFieldValueHolder<TFields, N>): readonly any[] {
    return [value.fieldValue];
  }

  getLoadValueForObject(object: Readonly<TFields>): SingleFieldValueHolder<TFields, N> | null {
    const value = object[this.fieldName];
    if (value === null || value === undefined) {
      return null;
    }
    return new SingleFieldValueHolder(value);
  }

  createCacheKeyPartsForLoadValue(
    entityConfiguration: EntityConfiguration<TFields>,
    value: SingleFieldValueHolder<TFields, N>,
  ): readonly string[] {
    const columnName = entityConfiguration.entityToDBFieldsKeyMapping.get(this.fieldName);
    invariant(columnName, `database field mapping missing for ${String(this.fieldName)}`);
    return [columnName, String(value.fieldValue)];
  }

  getLoadMethodType(): EntityLoadMethodType {
    return EntityLoadMethodType.SINGLE;
  }

  getDataManagerDataLoaderKey(): string {
    return this.fieldName as string;
  }

  serializeLoadValue(value: SingleFieldValueHolder<TFields, N>): NonNullable<TFields[N]> {
    return value.serialize();
  }

  deserializeLoadValue(value: NonNullable<TFields[N]>): SingleFieldValueHolder<TFields, N> {
    return SingleFieldValueHolder.deserialize(value);
  }

  validateRuntimeLoadValuesForDataManagerDataLoader(
    values: readonly SingleFieldValueHolder<TFields, N>[],
    entityClassName: string,
  ): void {
    const nullOrUndefinedValueIndex = values.findIndex(
      (value) => value.fieldValue === null || value.fieldValue === undefined,
    );
    if (nullOrUndefinedValueIndex >= 0) {
      throw new Error(
        `Invalid load: ${entityClassName} (${String(this.fieldName)} = ${
          values[nullOrUndefinedValueIndex]?.fieldValue
        })`,
      );
    }
  }

  vendNewLoadValueMap<V>(): LoadValueMap<
    NonNullable<TFields[N]>,
    SingleFieldValueHolder<TFields, N>,
    V
  > {
    return new SingleFieldValueHolderMap();
  }
}

/**
 * A load value for a SingleFieldHolder.
 */
export class SingleFieldValueHolder<TFields extends Record<string, any>, N extends keyof TFields>
  implements IEntityLoadValue<NonNullable<TFields[N]>>
{
  constructor(public readonly fieldValue: NonNullable<TFields[N]>) {}

  debugString(): string {
    return `SingleFieldValueHolder[${String(this.fieldValue)}]`;
  }

  serialize(): NonNullable<TFields[N]> {
    return this.fieldValue;
  }

  static deserialize<TFields extends Record<string, any>, N extends keyof TFields>(
    fieldValue: NonNullable<TFields[N]>,
  ): SingleFieldValueHolder<TFields, N> {
    return new SingleFieldValueHolder(fieldValue);
  }
}

export class SingleFieldValueHolderMap<
  TFields extends Record<string, any>,
  N extends keyof TFields,
  V,
> extends LoadValueMap<NonNullable<TFields[N]>, SingleFieldValueHolder<TFields, N>, V> {
  protected override deserializeKey(
    serializedKey: NonNullable<TFields[N]>,
  ): SingleFieldValueHolder<TFields, N> {
    return SingleFieldValueHolder.deserialize(serializedKey);
  }
}
