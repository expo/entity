import { describe, expect, it } from '@jest/globals';
import invariant from 'invariant';
import nullthrows from 'nullthrows';

import ComposedSecondaryEntityCache from '../ComposedSecondaryEntityCache';
import { ISecondaryEntityCache } from '../EntitySecondaryCacheLoader';

type TestFields = { id: string };
type TestLoadParams = { lp: string };

class TestEntitySecondaryCache implements ISecondaryEntityCache<TestFields, TestLoadParams> {
  constructor(
    private readonly prefilledResults: Map<Readonly<TestLoadParams>, Readonly<TestFields>>,
  ) {}

  async loadManyThroughAsync(
    loadParamsArray: readonly Readonly<TestLoadParams>[],
    fetcher: (
      fetcherLoadParamsArray: readonly Readonly<TestLoadParams>[],
    ) => Promise<ReadonlyMap<Readonly<TestLoadParams>, Readonly<TestFields> | null>>,
  ): Promise<ReadonlyMap<Readonly<TestLoadParams>, Readonly<TestFields> | null>> {
    // this does an unusual method of calling fetcher, but there's no constraint that says fetcher can only be called once
    // so this tests that

    const retMap = new Map<Readonly<TestLoadParams>, Readonly<TestFields> | null>();
    for (const loadParams of loadParamsArray) {
      if (this.prefilledResults.has(loadParams)) {
        retMap.set(loadParams, nullthrows(this.prefilledResults.get(loadParams)));
      } else {
        const fetcherResult = await fetcher([loadParams]);
        const toSet = fetcherResult.get(loadParams);
        invariant(toSet !== undefined, 'should be set');
        retMap.set(loadParams, toSet);
      }
    }
    return retMap;
  }

  async invalidateManyAsync(loadParamsArray: readonly Readonly<TestLoadParams>[]): Promise<void> {
    for (const loadParams of loadParamsArray) {
      this.prefilledResults.delete(loadParams);
    }
  }
}

describe(ComposedSecondaryEntityCache, () => {
  it('composes correctly', async () => {
    // TODO(wschurman): investigate whether we can use immutable or something to do better object equality for the map keys
    const lp1 = { lp: '1' };
    const lp2 = { lp: '2' };
    const lp3 = { lp: '3' };

    const primarySecondaryEntityCache = new TestEntitySecondaryCache(
      new Map([[lp1, { id: 'primary-1' }]]),
    );
    const fallbackSecondaryEntityCache = new TestEntitySecondaryCache(
      new Map([[lp2, { id: 'fallback-2' }]]),
    );

    const composedSecondaryEntityCache = new ComposedSecondaryEntityCache([
      primarySecondaryEntityCache,
      fallbackSecondaryEntityCache,
    ]);

    const results = await composedSecondaryEntityCache.loadManyThroughAsync(
      [lp1, lp2, lp3],
      async (fetcherLoadParamsArray) =>
        new Map(fetcherLoadParamsArray.map((flp) => [flp, { id: `db-fetched-${flp.lp}` }])),
    );

    expect(results.get(lp1)).toEqual({ id: 'primary-1' });
    expect(results.get(lp2)).toEqual({ id: 'fallback-2' });
    expect(results.get(lp3)).toEqual({ id: 'db-fetched-3' });

    await composedSecondaryEntityCache.invalidateManyAsync([lp1, lp2, lp3]);

    const resultsAfterInvalidate = await composedSecondaryEntityCache.loadManyThroughAsync(
      [lp1, lp2, lp3],
      async (fetcherLoadParamsArray) =>
        new Map(fetcherLoadParamsArray.map((flp) => [flp, { id: `db-fetched-${flp.lp}` }])),
    );

    expect(resultsAfterInvalidate.get(lp1)).toEqual({ id: 'db-fetched-1' });
    expect(resultsAfterInvalidate.get(lp2)).toEqual({ id: 'db-fetched-2' });
    expect(resultsAfterInvalidate.get(lp3)).toEqual({ id: 'db-fetched-3' });
  });

  it('handles n=0 compose case', async () => {
    const lp1 = { lp: '1' };
    const composedSecondaryEntityCache = new ComposedSecondaryEntityCache<
      TestLoadParams,
      TestFields
    >([]);
    const results = await composedSecondaryEntityCache.loadManyThroughAsync(
      [lp1],
      async (fetcherLoadParamsArray) =>
        new Map(fetcherLoadParamsArray.map((flp) => [flp, { id: `db-fetched-${flp.lp}` }])),
    );

    expect(results.get(lp1)).toEqual({ id: 'db-fetched-1' });
  });
});
