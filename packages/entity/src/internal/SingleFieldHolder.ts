import invariant from 'invariant';

import EntityConfiguration from '../EntityConfiguration';
import { getDatabaseFieldForEntityField } from './EntityFieldTransformationUtils';
import {
  DataManagerLoadMethodType,
  IEntityLoadKey,
  IEntityLoadValue,
  LoadValueMap,
} from '../internal/EntityAdapterLoadInterfaces';

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
    return new SingleFieldValueHolder(object[this.fieldName]);
  }

  getCacheKeyParts(
    entityConfiguration: EntityConfiguration<TFields>,
    value: SingleFieldValueHolder<TFields, N>,
  ): { cacheKeyType: string; parts: readonly string[] } {
    const columnName = entityConfiguration.entityToDBFieldsKeyMapping.get(this.fieldName);
    invariant(columnName, `database field mapping missing for ${String(this.fieldName)}`);
    return {
      cacheKeyType: 'single',
      parts: [columnName, String(value.fieldValue)],
    };
  }

  getDataManagerLoadMethodType(): DataManagerLoadMethodType {
    return DataManagerLoadMethodType.SINGLE;
  }

  getDataManagerDataLoaderKey(): string {
    return this.fieldName as string;
  }

  serializeLoadValueForDataManagerDataLoader(value: SingleFieldValueHolder<TFields, N>): unknown {
    return value.fieldValue;
  }

  deserializeLoadValueForDataManagerDataLoader(value: unknown): SingleFieldValueHolder<TFields, N> {
    return new SingleFieldValueHolder(value as NonNullable<TFields[N]>);
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
}

export class SingleFieldValueHolderMap<
  TFields extends Record<string, any>,
  N extends keyof TFields,
  V,
> extends LoadValueMap<NonNullable<TFields[N]>, SingleFieldValueHolder<TFields, N>, V> {
  protected override deserialize(
    serialized: NonNullable<TFields[N]>,
  ): SingleFieldValueHolder<TFields, N> {
    return new SingleFieldValueHolder(serialized);
  }
}
