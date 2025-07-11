import { result } from '@expo/results';
import { describe, expect, it } from '@jest/globals';

import {
  enforceResultsAsync,
  successfulResults,
  failedResults,
  successfulResultsFilterMap,
  failedResultsFilterMap,
  pick,
  partitionArray,
} from '../entityUtils';

describe(enforceResultsAsync, () => {
  it('throws when any result is an error', async () => {
    const error = new Error('hi');
    const results = Promise.resolve([result(error), result(3)]);
    await expect(enforceResultsAsync(results)).rejects.toEqual(error);
  });

  it('returns values when results are all value', async () => {
    const results = Promise.resolve([result(2), result(3)]);
    await expect(enforceResultsAsync(results)).resolves.toEqual([2, 3]);
  });
});

describe(successfulResults, () => {
  it('filters out failed results', () => {
    const result1 = result(1);
    const result2 = result(new Error('hello'));
    const result3 = result(1);
    const allResults = [result1, result2, result3];
    expect(successfulResults(allResults)).toEqual([result1, result3]);
  });
});

describe(failedResults, () => {
  it('filters out successful results', () => {
    const result1 = result(1);
    const result2 = result(new Error('hello'));
    const result3 = result(1);
    const allResults = [result1, result2, result3];
    expect(failedResults(allResults)).toEqual([result2]);
  });
});

describe(successfulResultsFilterMap, () => {
  it('filters out failed results', () => {
    const result1 = result(1);
    const result2 = result(new Error('hello'));
    const result3 = result(1);
    const allResults = new Map(
      Object.entries({
        a: result1,
        b: result2,
        c: result3,
      }),
    );

    const resultingMap = successfulResultsFilterMap(allResults);

    expect(resultingMap.get('a')).toEqual(result1);
    expect(resultingMap.get('b')).toBeUndefined();
    expect(resultingMap.get('c')).toEqual(result3);
  });
});

describe(failedResultsFilterMap, () => {
  it('filters out successful results', () => {
    const result1 = result(1);
    const result2 = result(new Error('hello'));
    const result3 = result(1);
    const allResults = new Map(
      Object.entries({
        a: result1,
        b: result2,
        c: result3,
      }),
    );

    const resultingMap = failedResultsFilterMap(allResults);

    expect(resultingMap.get('a')).toBeUndefined();
    expect(resultingMap.get('b')).toEqual(result2);
    expect(resultingMap.get('c')).toBeUndefined();
  });
});

describe(pick, () => {
  it('picks specified keys', () => {
    const object = {
      a: 1,
      b: 2,
      c: 3,
    };
    expect(pick(object, ['a', 'b'])).toEqual({
      a: 1,
      b: 2,
    });
  });
});

describe(partitionArray, () => {
  it('partitions array', () => {
    type A = true;
    type B = false;
    const arr: (A | B)[] = [true, false, true, true, false];
    const [as, bs] = partitionArray<A, B>(arr, (val: A | B): val is A => val === true);
    expect(as).toStrictEqual([true, true, true]);
    expect(bs).toStrictEqual([false, false]);
  });
});
