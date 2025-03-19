export interface ISerializable<TSerialized extends string> {
  serialize(): TSerialized;
}

export abstract class SerializableKeyMap<
    TSerialized extends string,
    K extends ISerializable<TSerialized>,
    V,
  >
  implements ReadonlyMap<K, V>, Map<K, V>
{
  protected readonly underlyingMap: Map<TSerialized, V>;

  constructor(map: Map<K, V> = new Map()) {
    this.underlyingMap = new Map(
      Array.from(map.entries()).map(([key, value]) => [key.serialize(), value]),
    );
  }

  protected abstract deserialize(serialized: TSerialized): K;

  forEach(
    callbackfn: (value: V, key: K, map: SerializableKeyMap<TSerialized, K, V>) => void,
    thisArg?: any,
  ): void {
    this.underlyingMap.forEach((value, key) => {
      callbackfn.call(thisArg, value, this.deserialize(key), this);
    });
  }

  get(key: K): V | undefined {
    return this.underlyingMap.get(key.serialize());
  }

  has(key: K): boolean {
    return this.underlyingMap.has(key.serialize());
  }

  clear(): void {
    this.underlyingMap.clear();
  }

  delete(key: K): boolean {
    return this.underlyingMap.delete(key.serialize());
  }

  set(key: K, value: V): this {
    this.underlyingMap.set(key.serialize(), value);
    return this;
  }

  get size(): number {
    return this.underlyingMap.size;
  }

  *entries(): MapIterator<[K, V]> {
    for (const [key, value] of this.underlyingMap.entries()) {
      yield [this.deserialize(key), value];
    }
  }

  *keys(): MapIterator<K> {
    for (const key of this.underlyingMap.keys()) {
      yield this.deserialize(key);
    }
  }

  *values(): MapIterator<V> {
    for (const value of this.underlyingMap.values()) {
      yield value;
    }
  }

  [Symbol.iterator](): MapIterator<[K, V]> {
    return this.entries();
  }

  get [Symbol.toStringTag](): string {
    return 'SerializableKeyMap';
  }
}
