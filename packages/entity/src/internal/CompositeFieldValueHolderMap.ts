import invariant from 'invariant';

import { EntityCompositeField } from '../EntityConfiguration';
import {
  CompositeFieldValueHolder,
  SerializedCompositeFieldValueHolder,
} from './CompositeFieldHolder';
import { SerializableKeyMap } from '../utils/collections/SerializableKeyMap';

export interface CompositeFieldValueHolderReadonlyMap<
  TFields extends Record<string, any>,
  N extends EntityCompositeField<TFields>,
  V,
> extends ReadonlyMap<CompositeFieldValueHolder<TFields, N>, V> {}

export class CompositeFieldValueHolderMap<
  TFields extends Record<string, any>,
  N extends EntityCompositeField<TFields>,
  V,
> extends SerializableKeyMap<
  SerializedCompositeFieldValueHolder,
  CompositeFieldValueHolder<TFields, N>,
  V
> {
  protected override deserialize(
    serialized: SerializedCompositeFieldValueHolder,
  ): CompositeFieldValueHolder<TFields, N> {
    return CompositeFieldValueHolder.deserialize(serialized);
  }

  public static fromKeysAndValueZip<
    TFields extends Record<string, any>,
    N extends EntityCompositeField<TFields>,
    V,
  >(
    keys: readonly CompositeFieldValueHolder<TFields, N>[],
    values: readonly V[],
  ): CompositeFieldValueHolderMap<TFields, N, V> {
    invariant(
      keys.length === values.length,
      `zipToSerializableKeyMap input length mismatch: keys[${keys.length}], values[${values.length}]`,
    );
    const mapToReturn = new CompositeFieldValueHolderMap<TFields, N, V>();
    for (let i = 0; i < keys.length; i++) {
      mapToReturn.set(keys[i]!, values[i]!);
    }
    return mapToReturn;
  }
}
