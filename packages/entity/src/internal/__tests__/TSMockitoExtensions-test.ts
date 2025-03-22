import {
  SingleFieldHolder,
  SingleFieldValueHolder,
  SingleFieldValueHolderMap,
} from '../SingleFieldHolder';
import {
  deepEqualEntityAware,
  DeepEqualEntityAwareMatcher,
  isEqualWithEntityAware,
} from './TSMockitoExtensions';

describe(deepEqualEntityAware, () => {
  it('should return a DeepEqualEntityAwareMatcher', () => {
    const actual = deepEqualEntityAware('foo');
    expect(actual).toBeInstanceOf(DeepEqualEntityAwareMatcher);
    expect(actual.toString()).toBe('deepEqualEntityAware(foo)');

    const actual2 = deepEqualEntityAware(['bar']);
    expect(actual2.toString()).toBe('deepEqualEntityAware([bar])');
  });
});

describe(isEqualWithEntityAware, () => {
  it('works for basic cases', () => {
    expect(isEqualWithEntityAware('foo', 'foo')).toBe(true);
    expect(isEqualWithEntityAware('foo', 'bar')).toBe(false);

    const obj1 = { foo: 'bar' };
    const obj2 = { foo: 'bar' };
    expect(isEqualWithEntityAware(obj1, obj2)).toBe(true);
  });

  it('works for nested matchers', () => {
    const obj1 = { foo: deepEqualEntityAware('bar') };
    const obj2 = { foo: 'bar' };
    expect(isEqualWithEntityAware(obj1, obj2)).toBe(true);
  });

  it('works for SingleFieldHolder', () => {
    const singleFieldHolder1 = new SingleFieldHolder('foo');
    const singleFieldHolder2 = new SingleFieldHolder('foo');
    const singleFieldHolder3 = new SingleFieldHolder('bar');
    expect(isEqualWithEntityAware(singleFieldHolder1, singleFieldHolder2)).toBe(true);
    expect(isEqualWithEntityAware(singleFieldHolder1, singleFieldHolder3)).toBe(false);
  });

  it('works for SingleFieldValueHolder', () => {
    const singleFieldValueHolder1 = new SingleFieldValueHolder('foo');
    const singleFieldValueHolder2 = new SingleFieldValueHolder('foo');
    const singleFieldValueHolder3 = new SingleFieldValueHolder('bar');
    expect(isEqualWithEntityAware(singleFieldValueHolder1, singleFieldValueHolder2)).toBe(true);
    expect(isEqualWithEntityAware(singleFieldValueHolder1, singleFieldValueHolder3)).toBe(false);
  });

  it('works for SerializableKeyMap', () => {
    const map1 = new SingleFieldValueHolderMap(
      new Map([[new SingleFieldValueHolder('foo'), 'bar']]),
    );
    const map2 = new SingleFieldValueHolderMap(
      new Map([[new SingleFieldValueHolder('foo'), 'bar']]),
    );
    const map3 = new SingleFieldValueHolderMap(
      new Map([[new SingleFieldValueHolder('foo2'), 'bar']]),
    );
    expect(isEqualWithEntityAware(map1, map2)).toBe(true);
    expect(isEqualWithEntityAware(map1, map3)).toBe(false);
  });
});
