import invariant from 'invariant';

import {
  EntityCompositeField,
  EntityCompositeFieldValue,
  EntityConfiguration,
} from '../EntityConfiguration';
import { pick } from '../entityUtils';
import { getDatabaseFieldForEntityField } from './EntityFieldTransformationUtils';
import {
  EntityLoadMethodType,
  IEntityLoadKey,
  IEntityLoadValue,
  LoadValueMap,
} from '../EntityLoadInterfaces';

declare const CompositeFieldHolderSerializedBrand: unique symbol;

/**
 * @internal
 */
export type SerializedCompositeFieldHolder = string & {
  readonly [CompositeFieldHolderSerializedBrand]: true;
};

/**
 * A load key that represents a composite field (set of fieldName) on an entity.
 * Must be defined in the entity configuration composite field definition.
 *
 * @internal
 */
export class CompositeFieldHolder<
  TFields extends Record<string, any>,
  TIDField extends keyof TFields,
> implements IEntityLoadKey<
  TFields,
  TIDField,
  SerializedCompositeFieldValueHolder,
  CompositeFieldValueHolder<TFields, EntityCompositeField<TFields>>
> {
  public readonly compositeField: EntityCompositeField<TFields>;

  constructor(compositeFieldInput: EntityCompositeField<TFields>) {
    this.compositeField = [...compositeFieldInput].sort();
  }

  toString(): string {
    return `CompositeField(${this.compositeField.join(',')})`;
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

  public serialize(): SerializedCompositeFieldHolder {
    return JSON.stringify(this.compositeField) as SerializedCompositeFieldHolder;
  }

  isCacheable(entityConfiguration: EntityConfiguration<TFields, TIDField>): boolean {
    return entityConfiguration.compositeFieldInfo.canCacheCompositeField(this.compositeField);
  }

  getDatabaseColumns(
    entityConfiguration: EntityConfiguration<TFields, TIDField>,
  ): readonly string[] {
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

  createCacheKeyPartsForLoadValue(
    entityConfiguration: EntityConfiguration<TFields, TIDField>,
    value: CompositeFieldValueHolder<TFields, EntityCompositeField<TFields>>,
  ): readonly string[] {
    const columnNames = this.compositeField.map((fieldName) => {
      const columnName = entityConfiguration.entityToDBFieldsKeyMapping.get(fieldName);
      invariant(columnName, `database field mapping missing for ${String(fieldName)}`);
      return columnName;
    });
    const compositeFieldValues = this.compositeField.map(
      (fieldName) => value.compositeFieldValue[fieldName],
    );
    return [...columnNames, ...compositeFieldValues.map((value) => String(value))];
  }

  getLoadMethodType(): EntityLoadMethodType {
    return EntityLoadMethodType.COMPOSITE;
  }

  getDataManagerDataLoaderKey(): string {
    return this.serialize();
  }

  serializeLoadValue(
    value: CompositeFieldValueHolder<TFields, EntityCompositeField<TFields>>,
  ): SerializedCompositeFieldValueHolder {
    return value.serialize();
  }

  deserializeLoadValue(
    value: SerializedCompositeFieldValueHolder,
  ): CompositeFieldValueHolder<TFields, EntityCompositeField<TFields>> {
    return CompositeFieldValueHolder.deserialize(value);
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

/**
 * @internal
 */
export type SerializedCompositeFieldValueHolder = string & {
  readonly [CompositeFieldValueHolderSerializedBrand]: true;
};

/**
 * A load value for a CompositeFieldHolder.
 *
 * @internal
 */
export class CompositeFieldValueHolder<
  TFields extends Record<string, any>,
  TCompositeField extends EntityCompositeField<TFields>,
> implements IEntityLoadValue<SerializedCompositeFieldValueHolder> {
  constructor(
    public readonly compositeFieldValue: EntityCompositeFieldValue<TFields, TCompositeField>,
  ) {}

  toString(): string {
    return `CompositeFieldValue(${Object.entries(this.compositeFieldValue)
      .map(([fieldName, fieldValue]) => `${fieldName}=${fieldValue}`)
      .join(',')})`;
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
    // Specify the ordered keys to serialize in a sorted manner to ensure consistent serialization
    // between two objects of the same keys/values but different order.
    // The replacer argument is "An array of strings and numbers that acts as an approved list
    // for selecting the object properties that will be stringified."
    // but it is a secondary effect of specifying the order of keys in the stringified object.
    return JSON.stringify(
      this.compositeFieldValue,
      Object.keys(this.compositeFieldValue).sort(),
    ) as SerializedCompositeFieldValueHolder;
  }
}

/**
 * @internal
 */
export class CompositeFieldValueHolderMap<
  TFields extends Record<string, any>,
  N extends EntityCompositeField<TFields>,
  V,
> extends LoadValueMap<
  SerializedCompositeFieldValueHolder,
  CompositeFieldValueHolder<TFields, N>,
  V
> {
  protected override deserializeKey(
    serializedKey: SerializedCompositeFieldValueHolder,
  ): CompositeFieldValueHolder<TFields, N> {
    return CompositeFieldValueHolder.deserialize(serializedKey);
  }
}
