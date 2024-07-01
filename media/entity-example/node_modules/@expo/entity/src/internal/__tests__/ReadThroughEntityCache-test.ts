import { verify, deepEqual, mock, instance, when, anything } from 'ts-mockito';

import EntityConfiguration from '../../EntityConfiguration';
import { UUIDField } from '../../EntityFields';
import IEntityCacheAdapter from '../../IEntityCacheAdapter';
import ReadThroughEntityCache, { CacheStatus } from '../ReadThroughEntityCache';

type BlahFields = {
  id: string;
};

const makeEntityConfiguration = (cacheIdField: boolean): EntityConfiguration<BlahFields> =>
  new EntityConfiguration<BlahFields>({
    idField: 'id',
    tableName: 'blah',
    schema: {
      id: new UUIDField({ columnName: 'id', cache: cacheIdField }),
    },
    databaseAdapterFlavor: 'postgres',
    cacheAdapterFlavor: 'redis',
  });

const createIdFetcher =
  (ids: string[]) =>
  async <N extends keyof BlahFields>(
    fetcherFieldValues: readonly NonNullable<BlahFields[N]>[],
  ): Promise<ReadonlyMap<NonNullable<BlahFields[N]>, readonly Readonly<BlahFields>[]>> => {
    const results = new Map();
    fetcherFieldValues.forEach((v) => {
      if (ids.includes(v)) {
        results.set(v, [{ id: v }]);
      } else {
        results.set(v, []);
      }
    });
    return results;
  };

const createFetcherNonUnique =
  (ids: string[]) =>
  async <N extends keyof BlahFields>(
    fetcherFieldValues: readonly NonNullable<BlahFields[N]>[],
  ): Promise<ReadonlyMap<NonNullable<BlahFields[N]>, readonly Readonly<BlahFields>[]>> => {
    const results = new Map();
    fetcherFieldValues.forEach((v) => {
      if (ids.includes(v)) {
        results.set(v, [{ id: v }, { id: v + '2' }]);
      } else {
        results.set(v, []);
      }
    });
    return results;
  };

describe(ReadThroughEntityCache, () => {
  describe('readManyThroughAsync', () => {
    it('fetches from DB upon cache miss and caches the result', async () => {
      const cacheAdapterMock = mock<IEntityCacheAdapter<BlahFields>>();
      const cacheAdapter = instance(cacheAdapterMock);
      const entityCache = new ReadThroughEntityCache(makeEntityConfiguration(true), cacheAdapter);
      const fetcher = createIdFetcher(['wat', 'who']);

      when(cacheAdapterMock.loadManyAsync('id', deepEqual(['wat', 'who']))).thenResolve(
        new Map([
          ['wat', { status: CacheStatus.MISS }],
          ['who', { status: CacheStatus.MISS }],
        ]),
      );

      const result = await entityCache.readManyThroughAsync('id', ['wat', 'who'], fetcher);

      verify(cacheAdapterMock.loadManyAsync('id', deepEqual(['wat', 'who']))).once();
      verify(
        cacheAdapterMock.cacheManyAsync(
          'id',
          deepEqual(
            new Map([
              ['wat', { id: 'wat' }],
              ['who', { id: 'who' }],
            ]),
          ),
        ),
      ).once();
      verify(cacheAdapterMock.cacheDBMissesAsync('id', deepEqual([]))).once();
      expect(result).toEqual(
        new Map([
          ['wat', [{ id: 'wat' }]],
          ['who', [{ id: 'who' }]],
        ]),
      );
    });

    it('does not fetch from the DB or cache results when all cache fetches are hits', async () => {
      const cacheAdapterMock = mock<IEntityCacheAdapter<BlahFields>>();
      const cacheAdapter = instance(cacheAdapterMock);
      const entityCache = new ReadThroughEntityCache(makeEntityConfiguration(true), cacheAdapter);
      const fetcher = createIdFetcher(['wat', 'who']);

      when(cacheAdapterMock.loadManyAsync('id', deepEqual(['wat', 'who']))).thenResolve(
        new Map([
          ['wat', { status: CacheStatus.HIT, item: { id: 'wat' } }],
          ['who', { status: CacheStatus.HIT, item: { id: 'who' } }],
        ]),
      );

      const result = await entityCache.readManyThroughAsync('id', ['wat', 'who'], fetcher);

      verify(cacheAdapterMock.loadManyAsync('id', deepEqual(['wat', 'who']))).once();
      verify(
        cacheAdapterMock.cacheManyAsync(
          'id',
          deepEqual(
            new Map([
              ['wat', { id: 'wat' }],
              ['who', { id: 'who' }],
            ]),
          ),
        ),
      ).never();
      verify(cacheAdapterMock.cacheDBMissesAsync('id', deepEqual([]))).never();
      expect(result).toEqual(
        new Map([
          ['wat', [{ id: 'wat' }]],
          ['who', [{ id: 'who' }]],
        ]),
      );
    });

    it('negatively caches db misses', async () => {
      const cacheAdapterMock = mock<IEntityCacheAdapter<BlahFields>>();
      const cacheAdapter = instance(cacheAdapterMock);
      const entityCache = new ReadThroughEntityCache(makeEntityConfiguration(true), cacheAdapter);

      // simulate db miss
      const fetcher = createIdFetcher(['wat', 'who']);

      when(cacheAdapterMock.loadManyAsync('id', deepEqual(['why']))).thenResolve(
        new Map([['why', { status: CacheStatus.MISS }]]),
      );

      const result = await entityCache.readManyThroughAsync('id', ['why'], fetcher);

      verify(cacheAdapterMock.loadManyAsync('id', deepEqual(['why']))).once();
      verify(cacheAdapterMock.cacheManyAsync('id', deepEqual(new Map()))).once();
      verify(cacheAdapterMock.cacheDBMissesAsync('id', deepEqual(['why']))).once();
      expect(result).toEqual(new Map());
    });

    it('does not return or fetch negatively cached results from DB', async () => {
      const cacheAdapterMock = mock<IEntityCacheAdapter<BlahFields>>();
      const cacheAdapter = instance(cacheAdapterMock);
      const entityCache = new ReadThroughEntityCache(makeEntityConfiguration(true), cacheAdapter);
      const fetcher = createIdFetcher([]);

      when(cacheAdapterMock.loadManyAsync('id', deepEqual(['why']))).thenResolve(
        new Map([['why', { status: CacheStatus.NEGATIVE }]]),
      );

      const result = await entityCache.readManyThroughAsync('id', ['why'], fetcher);
      verify(cacheAdapterMock.loadManyAsync('id', deepEqual(['why']))).once();
      verify(cacheAdapterMock.cacheManyAsync('id', anything())).never();
      verify(cacheAdapterMock.cacheDBMissesAsync('id', anything())).never();
      expect(result).toEqual(new Map());
    });

    it('does a mix and match of hit, miss, and negative', async () => {
      const cacheAdapterMock = mock<IEntityCacheAdapter<BlahFields>>();
      const cacheAdapter = instance(cacheAdapterMock);
      const entityCache = new ReadThroughEntityCache(makeEntityConfiguration(true), cacheAdapter);
      const fetcher = createIdFetcher(['wat', 'who', 'why']);

      when(
        cacheAdapterMock.loadManyAsync('id', deepEqual(['wat', 'who', 'why', 'how'])),
      ).thenResolve(
        new Map([
          ['wat', { status: CacheStatus.MISS }],
          ['who', { status: CacheStatus.NEGATIVE }],
          ['why', { status: CacheStatus.HIT, item: { id: 'why' } }],
          ['how', { status: CacheStatus.MISS }],
        ]),
      );

      const result = await entityCache.readManyThroughAsync(
        'id',
        ['wat', 'who', 'why', 'how'],
        fetcher,
      );
      verify(cacheAdapterMock.loadManyAsync('id', deepEqual(['wat', 'who', 'why', 'how']))).once();
      verify(
        cacheAdapterMock.cacheManyAsync('id', deepEqual(new Map([['wat', { id: 'wat' }]]))),
      ).once();
      verify(cacheAdapterMock.cacheDBMissesAsync('id', deepEqual(['how']))).once();
      expect(result).toEqual(
        new Map([
          ['wat', [{ id: 'wat' }]],
          ['why', [{ id: 'why' }]],
        ]),
      );
    });

    it('does not call into cache for field that is not cacheable', async () => {
      const cacheAdapterMock = mock<IEntityCacheAdapter<BlahFields>>();
      const cacheAdapter = instance(cacheAdapterMock);
      const entityCache = new ReadThroughEntityCache(makeEntityConfiguration(false), cacheAdapter);
      const fetcher = createIdFetcher(['wat']);
      const result = await entityCache.readManyThroughAsync('id', ['wat'], fetcher);
      verify(cacheAdapterMock.loadManyAsync('id', anything())).never();
      expect(result).toEqual(new Map([['wat', [{ id: 'wat' }]]]));
    });

    it('does not cache when DB returns multiple objects for what is supposed to be unique and returns empty', async () => {
      const consoleSpy = jest.spyOn(console, 'warn');

      const cacheAdapterMock = mock<IEntityCacheAdapter<BlahFields>>();
      const cacheAdapter = instance(cacheAdapterMock);
      const entityCache = new ReadThroughEntityCache(makeEntityConfiguration(true), cacheAdapter);
      const fetcher = createFetcherNonUnique(['wat', 'who']);

      when(cacheAdapterMock.loadManyAsync('id', deepEqual(['wat', 'who']))).thenResolve(
        new Map([
          ['wat', { status: CacheStatus.MISS }],
          ['who', { status: CacheStatus.MISS }],
        ]),
      );

      const result = await entityCache.readManyThroughAsync('id', ['wat', 'who'], fetcher);

      verify(cacheAdapterMock.loadManyAsync('id', deepEqual(['wat', 'who']))).once();
      verify(
        cacheAdapterMock.cacheManyAsync(
          'id',
          deepEqual(
            new Map([
              ['wat', { id: 'wat' }],
              ['who', { id: 'who' }],
            ]),
          ),
        ),
      ).never();
      verify(cacheAdapterMock.cacheDBMissesAsync('id', deepEqual([]))).once();
      expect(result).toEqual(new Map());

      expect(consoleSpy).toHaveBeenCalledWith(
        'unique key id in blah returned multiple rows for wat',
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        'unique key id in blah returned multiple rows for who',
      );
    });
  });

  describe('invalidateManyAsync', () => {
    it('calls cache adapter invalidate', async () => {
      const cacheAdapterMock = mock<IEntityCacheAdapter<BlahFields>>();
      const cacheAdapter = instance(cacheAdapterMock);
      const entityCache = new ReadThroughEntityCache(makeEntityConfiguration(true), cacheAdapter);
      await entityCache.invalidateManyAsync('id', ['wat']);
      verify(cacheAdapterMock.invalidateManyAsync('id', deepEqual(['wat']))).once();
    });
  });
});
