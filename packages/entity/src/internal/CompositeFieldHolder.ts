import { EntityCompositeField, EntityCompositeFieldValue } from '../EntityConfiguration';
import { pick } from '../entityUtils';
import { ISerializable } from '../utils/collections/SerializableKeyMap';

declare const CompositeFieldHolderSerializedBrand: unique symbol;
export type SerializedCompositeFieldHolder = string & {
  readonly [CompositeFieldHolderSerializedBrand]: true;
};

export class CompositeFieldHolder<TFields extends Record<string, any>>
  implements ISerializable<SerializedCompositeFieldHolder>
{
  public readonly compositeField: EntityCompositeField<TFields>;

  constructor(compositeFieldInput: EntityCompositeField<TFields>) {
    this.compositeField = [...compositeFieldInput].sort();
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
}

declare const CompositeFieldValueHolderSerializedBrand: unique symbol;
export type SerializedCompositeFieldValueHolder = string & {
  readonly [CompositeFieldValueHolderSerializedBrand]: true;
};

export class CompositeFieldValueHolder<
  TFields extends Record<string, any>,
  TCompositeField extends EntityCompositeField<TFields>,
> {
  constructor(
    public readonly compositeFieldValue: EntityCompositeFieldValue<TFields, TCompositeField>,
  ) {}

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
