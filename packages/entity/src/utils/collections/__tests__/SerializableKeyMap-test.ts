import { ISerializable, SerializableKeyMap } from '../SerializableKeyMap';

describe(SerializableKeyMap, () => {
  it('behaves as a Map/ReadonlyMap', () => {
    const map = new TestSerializableKeyMap();
    expect(map.size).toBe(0);
    expect(map.has(new TestSerializableKey('key'))).toBe(false);
    expect(map.get(new TestSerializableKey('key'))).toBe(undefined);

    map.set(new TestSerializableKey('key'), 'value');
    expect(map.size).toBe(1);
    expect(map.has(new TestSerializableKey('key'))).toBe(true);
    expect(map.get(new TestSerializableKey('key'))).toBe('value');

    map.delete(new TestSerializableKey('key'));
    expect(map.size).toBe(0);
    expect(map.has(new TestSerializableKey('key'))).toBe(false);
    expect(map.get(new TestSerializableKey('key'))).toBe(undefined);

    map.set(new TestSerializableKey('key'), 'value');
    expect(map.size).toBe(1);
    map.clear();
    expect(map.size).toBe(0);
    expect(map.get(new TestSerializableKey('key'))).toBe(undefined);

    map.set(new TestSerializableKey('key'), 'value');
    map.set(new TestSerializableKey('key'), 'value');
    expect(map.size).toBe(1);

    map.set(new TestSerializableKey('key2'), 'value2');
    expect(map.size).toBe(2);

    // check keys ordering based on insertion order
    const keys = Array.from(map.keys());
    expect(keys.length).toBe(2);
    expect(keys[0]!.value).toBe('key');
    expect(keys[1]!.value).toBe('key2');

    // check values ordering based on insertion order
    const values = Array.from(map.values());
    expect(values.length).toBe(2);
    expect(values[0]).toBe('value');
    expect(values[1]).toBe('value2');

    // check entries ordering based on insertion order
    const entries = Array.from(map.entries());
    expect(entries.length).toBe(2);
    expect(entries[0]![0].value).toBe('key');
    expect(entries[0]![1]).toBe('value');
    expect(entries[1]![0].value).toBe('key2');
    expect(entries[1]![1]).toBe('value2');

    // check forEach ordering based on insertion order
    const forEachEntries: [TestSerializableKey, string][] = [];
    map.forEach((value, key) => {
      forEachEntries.push([key, value]);
    });
    expect(forEachEntries.length).toBe(2);
    expect(forEachEntries[0]![0].value).toBe('key');
    expect(forEachEntries[0]![1]).toBe('value');
    expect(forEachEntries[1]![0].value).toBe('key2');
    expect(forEachEntries[1]![1]).toBe('value2');

    // check iterator ordering based on insertion order
    const iteratorEntries = Array.from(map);
    expect(iteratorEntries.length).toBe(2);
    expect(iteratorEntries[0]![0].value).toBe('key');
    expect(iteratorEntries[0]![1]).toBe('value');
    expect(iteratorEntries[1]![0].value).toBe('key2');
    expect(iteratorEntries[1]![1]).toBe('value2');
  });

  it('constructs with values', () => {
    const map = new TestSerializableKeyMap([
      [new TestSerializableKey('key'), 'value'],
      [new TestSerializableKey('key2'), 'value2'],
    ]);
    expect(map.size).toBe(2);
    expect(map.get(new TestSerializableKey('key'))).toBe('value');
    expect(map.get(new TestSerializableKey('key2'))).toBe('value2');

    const keys = Array.from(map.keys());
    expect(keys.length).toBe(2);
    expect(keys[0]!.value).toBe('key');
    expect(keys[1]!.value).toBe('key2');
  });

  it('has correct toStringTag', () => {
    const map = new TestSerializableKeyMap();
    expect(Object.prototype.toString.call(map)).toBe('[object SerializableKeyMap]');
  });
});

declare const TestSerializableKeySerializedBrand: unique symbol;
export type SerializedTestSerializableKey = string & {
  readonly [TestSerializableKeySerializedBrand]: true;
};

class TestSerializableKey implements ISerializable<SerializedTestSerializableKey> {
  constructor(public readonly value: string) {}

  serialize(): SerializedTestSerializableKey {
    return JSON.stringify(this.value) as SerializedTestSerializableKey;
  }

  static deserialize(serialized: SerializedTestSerializableKey): TestSerializableKey {
    return new TestSerializableKey(JSON.parse(serialized));
  }
}

class TestSerializableKeyMap extends SerializableKeyMap<
  SerializedTestSerializableKey,
  TestSerializableKey,
  string
> {
  protected deserializeKey(serializedKey: SerializedTestSerializableKey): TestSerializableKey {
    return TestSerializableKey.deserialize(serializedKey);
  }
}
