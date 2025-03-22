import { EntityCompositeField, EntityCompositeFieldValue } from '../EntityConfiguration';
import {
  SerializedCompositeFieldValueHolder,
  CompositeFieldValueHolder,
} from './CompositeFieldHolder';

export class CompositeFieldValueMap<
  TFields extends Record<string, any>,
  N extends EntityCompositeField<TFields>,
  TOutput,
> implements ReadonlyMap<EntityCompositeFieldValue<TFields, N>, TOutput>
{
  private readonly map: Map<SerializedCompositeFieldValueHolder, TOutput>;

  constructor(entries: [CompositeFieldValueHolder<TFields, N>, TOutput][]) {
    const map = new Map<SerializedCompositeFieldValueHolder, TOutput>();
    for (const [key, value] of entries) {
      map.set(key.serialize(), value);
    }
    this.map = map;
  }

  get(compositeFieldValue: EntityCompositeFieldValue<TFields, N>): TOutput | undefined {
    return this.map.get(new CompositeFieldValueHolder(compositeFieldValue).serialize());
  }

  has(compositeFieldValue: EntityCompositeFieldValue<TFields, N>): boolean {
    return this.map.has(new CompositeFieldValueHolder(compositeFieldValue).serialize());
  }

  forEach(
    callbackfn: (
      value: TOutput,
      key: EntityCompositeFieldValue<TFields, N>,
      map: CompositeFieldValueMap<TFields, N, TOutput>,
    ) => void,
    thisArg?: any,
  ): void {
    this.map.forEach((value, key) => {
      callbackfn.call(
        thisArg,
        value,
        CompositeFieldValueHolder.deserialize<TFields, N>(key).compositeFieldValue,
        this,
      );
    });
  }

  get size(): number {
    return this.map.size;
  }

  *entries(): MapIterator<[EntityCompositeFieldValue<TFields, N>, TOutput]> {
    for (const [key, value] of this.map.entries()) {
      yield [CompositeFieldValueHolder.deserialize<TFields, N>(key).compositeFieldValue, value];
    }
  }

  *keys(): MapIterator<EntityCompositeFieldValue<TFields, N>> {
    for (const key of this.map.keys()) {
      yield CompositeFieldValueHolder.deserialize<TFields, N>(key).compositeFieldValue;
    }
  }

  *values(): MapIterator<TOutput> {
    for (const value of this.map.values()) {
      yield value;
    }
  }

  [Symbol.iterator](): MapIterator<[EntityCompositeFieldValue<TFields, N>, TOutput]> {
    return this.entries();
  }

  get [Symbol.toStringTag](): string {
    return 'CompositeFieldValueMap';
  }
}
