import { EntityCompositeFieldValue } from '../../EntityConfiguration';
import { CompositeFieldValueHolder } from '../CompositeFieldHolder';
import { CompositeFieldValueMap } from '../CompositeFieldValueMap';

describe(CompositeFieldValueMap, () => {
  it('behaves like a ReadonlyMap', () => {
    const map = new CompositeFieldValueMap([
      [new CompositeFieldValueHolder({ a: 1, b: 'foo' }), 'foo'],
      [new CompositeFieldValueHolder({ a: 2, b: 'bar' }), 'bar'],
    ]);

    expect(map.size).toBe(2);
    expect(map.get({ a: 1, b: 'foo' })).toBe('foo');
    expect(map.get({ a: 2, b: 'bar' })).toBe('bar');
    expect(map.get({ a: 3, b: 'baz' })).toBeUndefined();
    expect(map.has({ a: 1, b: 'foo' })).toBe(true);
    expect(map.has({ a: 3, b: 'baz' })).toBe(false);

    const keys = Array.from(map.keys());
    expect(keys).toEqual([
      { a: 1, b: 'foo' },
      { a: 2, b: 'bar' },
    ]);

    const values = Array.from(map.values());
    expect(values).toEqual(['foo', 'bar']);

    const entries2 = Array.from(map.entries());
    expect(entries2).toEqual([
      [{ a: 1, b: 'foo' }, 'foo'],
      [{ a: 2, b: 'bar' }, 'bar'],
    ]);

    const forEachEntries: [EntityCompositeFieldValue<any, any>, string, typeof map][] = [];
    map.forEach((value, key, map) => {
      forEachEntries.push([key, value, map]);
    });
    expect(forEachEntries).toEqual([
      [{ a: 1, b: 'foo' }, 'foo', map],
      [{ a: 2, b: 'bar' }, 'bar', map],
    ]);
  });
});
