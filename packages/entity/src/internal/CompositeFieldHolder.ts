import invariant from 'invariant';

import EntityConfiguration, {
  EntityCompositeField,
  EntityCompositeFieldValue,
} from '../EntityConfiguration';
import { pick } from '../entityUtils';
import { CompositeFieldValueHolderMap } from './CompositeFieldValueHolderMap';
import { getDatabaseFieldForEntityField } from './EntityFieldTransformationUtils';
import {
  DataManagerLoadMethodType,
  IEntityLoadKey,
  IEntityLoadValue,
  LoadValueMap,
} from '../internal/EntityAdapterLoadInterfaces';
import { ISerializable } from '../utils/collections/SerializableKeyMap';

declare const CompositeFieldHolderSerializedBrand: unique symbol;
export type SerializedCompositeFieldHolder = string & {
  readonly [CompositeFieldHolderSerializedBrand]: true;
};

export class CompositeFieldHolder<TFields extends Record<string, any>>
  implements
    ISerializable<SerializedCompositeFieldHolder>,
    IEntityLoadKey<
      TFields,
      SerializedCompositeFieldValueHolder,
      CompositeFieldValueHolder<TFields, EntityCompositeField<TFields>>
    >
{
  public readonly compositeField: EntityCompositeField<TFields>;

  constructor(compositeFieldInput: EntityCompositeField<TFields>) {
    this.compositeField = [...compositeFieldInput].sort();
  }

  debugString(): string {
    return `CompositeFieldHolder[${this.compositeField.join(',')}]`;
  }

  public getFieldSet(): ReadonlySet<keyof TFields> {
    return new Set(this.compositeField);
  }

  public extractCompositeFieldValueHolderFromObjectFields(
    objectFields: TFields,
  ): CompositeFieldValueHolder<TFields, EntityCompositeField<TFields>> | null {
    const selection = pick(objectFields, this.compositeField);
    if (Object.values(selection).some((value) => value === undefined || value === null)) {
      return null;
    }
    return new CompositeFieldValueHolder(selection);
  }

  public static deserialize<TFields extends Record<string, any>>(
    serialized: SerializedCompositeFieldHolder,
  ): CompositeFieldHolder<TFields> {
    return new CompositeFieldHolder(JSON.parse(serialized) as EntityCompositeField<TFields>);
  }

  public serialize(): SerializedCompositeFieldHolder {
    return JSON.stringify(this.compositeField) as SerializedCompositeFieldHolder;
  }

  isCacheable(entityConfiguration: EntityConfiguration<TFields>): boolean {
    return entityConfiguration.compositeFieldInfo.canCacheCompositeField(this.compositeField);
  }

  getDatabaseColumns(entityConfiguration: EntityConfiguration<TFields>): readonly string[] {
    return this.compositeField.map((fieldName) =>
      getDatabaseFieldForEntityField(entityConfiguration, fieldName),
    );
  }

  getDatabaseValues(
    value: CompositeFieldValueHolder<TFields, EntityCompositeField<TFields>>,
  ): readonly any[] {
    return this.compositeField.map((fieldName) => value.compositeFieldValue[fieldName]);
  }

  getLoadValueForObject(
    object: Readonly<TFields>,
  ): CompositeFieldValueHolder<TFields, EntityCompositeField<TFields>> | null {
    return this.extractCompositeFieldValueHolderFromObjectFields(object);
  }

  getCacheKeyParts(
    entityConfiguration: EntityConfiguration<TFields>,
    value: CompositeFieldValueHolder<TFields, EntityCompositeField<TFields>>,
  ): {
    cacheKeyType: string;
    parts: readonly string[];
  } {
    const columnNames = this.compositeField.map((fieldName) => {
      const columnName = entityConfiguration.entityToDBFieldsKeyMapping.get(fieldName);
      invariant(columnName, `database field mapping missing for ${String(fieldName)}`);
      return columnName;
    });
    const compositeFieldValues = this.compositeField.map(
      (fieldName) => value.compositeFieldValue[fieldName],
    );

    return {
      cacheKeyType: 'composite',
      parts: [...columnNames, ...compositeFieldValues.map((value) => String(value))],
    };
  }

  getDataManagerLoadMethodType(): DataManagerLoadMethodType {
    return DataManagerLoadMethodType.COMPOSITE;
  }

  getDataManagerDataLoaderKey(): string {
    return this.serialize();
  }

  serializeLoadValueForDataManagerDataLoader(
    value: CompositeFieldValueHolder<TFields, EntityCompositeField<TFields>>,
  ): unknown {
    return value.serialize();
  }

  deserializeLoadValueForDataManagerDataLoader(
    value: unknown,
  ): CompositeFieldValueHolder<TFields, EntityCompositeField<TFields>> {
    return CompositeFieldValueHolder.deserialize(value as SerializedCompositeFieldValueHolder);
  }

  validateRuntimeLoadValuesForDataManagerDataLoader(
    values: readonly CompositeFieldValueHolder<TFields, EntityCompositeField<TFields>>[],
    entityClassName: string,
  ): void {
    const isInvalidRuntimeCompositeFieldValue = (
      value: CompositeFieldValueHolder<TFields, EntityCompositeField<TFields>>,
    ): boolean =>
      Object.values(value.compositeFieldValue).some(
        (fieldValue) => fieldValue === undefined || fieldValue === null,
      );

    const invalidValueIndex = values.findIndex(isInvalidRuntimeCompositeFieldValue);
    if (invalidValueIndex >= 0) {
      throw new Error(
        `Invalid load: ${entityClassName} (${String(this.compositeField)} = ${
          values[invalidValueIndex]
        })`,
      );
    }
  }

  vendNewLoadValueMap<V>(): LoadValueMap<
    SerializedCompositeFieldValueHolder,
    CompositeFieldValueHolder<TFields, EntityCompositeField<TFields>>,
    V
  > {
    return new CompositeFieldValueHolderMap();
  }
}

declare const CompositeFieldValueHolderSerializedBrand: unique symbol;
export type SerializedCompositeFieldValueHolder = string & {
  readonly [CompositeFieldValueHolderSerializedBrand]: true;
};

export class CompositeFieldValueHolder<
  TFields extends Record<string, any>,
  TCompositeField extends EntityCompositeField<TFields>,
> implements IEntityLoadValue<SerializedCompositeFieldValueHolder>
{
  constructor(
    public readonly compositeFieldValue: EntityCompositeFieldValue<TFields, TCompositeField>,
  ) {}

  debugString(): string {
    return `CompositeFieldValueHolder[${Object.entries(this.compositeFieldValue)
      .map(([fieldName, fieldValue]) => `${fieldName}=${fieldValue}`)
      .join(',')}]`;
  }

  public getFieldSet(): ReadonlySet<keyof TFields> {
    return new Set(Object.keys(this.compositeFieldValue) as (keyof TFields)[]);
  }

  public static deserialize<
    TFields extends Record<string, any>,
    TCompositeField extends EntityCompositeField<TFields>,
  >(
    serialized: SerializedCompositeFieldValueHolder,
  ): CompositeFieldValueHolder<TFields, TCompositeField> {
    return new CompositeFieldValueHolder(
      JSON.parse(serialized) as EntityCompositeFieldValue<TFields, TCompositeField>,
    );
  }

  public serialize(): SerializedCompositeFieldValueHolder {
    return JSON.stringify(
      this.compositeFieldValue,
      Object.keys(this.compositeFieldValue).sort(),
    ) as SerializedCompositeFieldValueHolder;
  }
}
