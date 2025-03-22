import { verify, mock, instance, when, anything } from 'ts-mockito';

import EntityConfiguration from '../../EntityConfiguration';
import { UUIDField } from '../../EntityFields';
import IEntityCacheAdapter from '../../IEntityCacheAdapter';
import ReadThroughEntityCache, { CacheStatus } from '../ReadThroughEntityCache';
import {
  SingleFieldHolder,
  SingleFieldValueHolder,
  SingleFieldValueHolderMap,
} from '../SingleFieldHolder';
import { deepEqualEntityAware, isEqualWithEntityAware } from './TSMockitoExtensions';

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
    fetcherFieldValues: readonly SingleFieldValueHolder<BlahFields, N>[],
  ): Promise<
    ReadonlyMap<SingleFieldValueHolder<BlahFields, N>, readonly Readonly<BlahFields>[]>
  > => {
    const results = new SingleFieldValueHolderMap<BlahFields, N, readonly Readonly<BlahFields>[]>();
    fetcherFieldValues.forEach((v) => {
      if (ids.includes(v.fieldValue)) {
        results.set(v, [{ id: v.fieldValue }]);
      } else {
        results.set(v, []);
      }
    });
    return results;
  };

const createFetcherNonUnique =
  (ids: string[]) =>
  async <N extends keyof BlahFields>(
    fetcherFieldValues: readonly SingleFieldValueHolder<BlahFields, N>[],
  ): Promise<
    ReadonlyMap<SingleFieldValueHolder<BlahFields, N>, readonly Readonly<BlahFields>[]>
  > => {
    const results = new SingleFieldValueHolderMap<BlahFields, N, readonly Readonly<BlahFields>[]>();
    fetcherFieldValues.forEach((v) => {
      if (ids.includes(v.fieldValue)) {
        results.set(v, [{ id: v.fieldValue }, { id: v.fieldValue + '2' }]);
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

      when(
        cacheAdapterMock.loadManyAsync(
          deepEqualEntityAware(new SingleFieldHolder('id')),
          deepEqualEntityAware([
            new SingleFieldValueHolder('wat'),
            new SingleFieldValueHolder('who'),
          ]),
        ),
      ).thenResolve(
        new SingleFieldValueHolderMap(
          new Map([
            [new SingleFieldValueHolder('wat'), { status: CacheStatus.MISS }],
            [new SingleFieldValueHolder('who'), { status: CacheStatus.MISS }],
          ]),
        ),
      );

      const result = await entityCache.readManyThroughAsync(
        new SingleFieldHolder<BlahFields, 'id'>('id'),
        [
          new SingleFieldValueHolder<BlahFields, 'id'>('wat'),
          new SingleFieldValueHolder<BlahFields, 'id'>('who'),
        ],
        fetcher,
      );

      verify(
        cacheAdapterMock.loadManyAsync(
          deepEqualEntityAware(new SingleFieldHolder('id')),
          deepEqualEntityAware([
            new SingleFieldValueHolder('wat'),
            new SingleFieldValueHolder('who'),
          ]),
        ),
      ).once();
      verify(
        cacheAdapterMock.cacheManyAsync(
          deepEqualEntityAware(new SingleFieldHolder('id')),
          deepEqualEntityAware(
            new SingleFieldValueHolderMap(
              new Map([
                [new SingleFieldValueHolder('wat'), { id: 'wat' }],
                [new SingleFieldValueHolder('who'), { id: 'who' }],
              ]),
            ),
          ),
        ),
      ).once();
      verify(
        cacheAdapterMock.cacheDBMissesAsync(
          deepEqualEntityAware(new SingleFieldHolder<BlahFields, 'id'>('id')),
          deepEqualEntityAware([] as SingleFieldValueHolder<BlahFields, 'id'>[]),
        ),
      ).once();
      expect(result).toEqual(
        new SingleFieldValueHolderMap(
          new Map([
            [new SingleFieldValueHolder('wat'), [{ id: 'wat' }]],
            [new SingleFieldValueHolder('who'), [{ id: 'who' }]],
          ]),
        ),
      );
    });

    it('does not fetch from the DB or cache results when all cache fetches are hits', async () => {
      const cacheAdapterMock = mock<IEntityCacheAdapter<BlahFields>>();
      const cacheAdapter = instance(cacheAdapterMock);
      const entityCache = new ReadThroughEntityCache(makeEntityConfiguration(true), cacheAdapter);
      const fetcher = createIdFetcher(['wat', 'who']);

      when(
        cacheAdapterMock.loadManyAsync(
          deepEqualEntityAware(new SingleFieldHolder('id')),
          deepEqualEntityAware([
            new SingleFieldValueHolder('wat'),
            new SingleFieldValueHolder('who'),
          ]),
        ),
      ).thenResolve(
        new Map([
          [new SingleFieldValueHolder('wat'), { status: CacheStatus.HIT, item: { id: 'wat' } }],
          [new SingleFieldValueHolder('who'), { status: CacheStatus.HIT, item: { id: 'who' } }],
        ]),
      );

      const result = await entityCache.readManyThroughAsync(
        new SingleFieldHolder<BlahFields, 'id'>('id'),
        [
          new SingleFieldValueHolder<BlahFields, 'id'>('wat'),
          new SingleFieldValueHolder<BlahFields, 'id'>('who'),
        ],
        fetcher,
      );

      verify(
        cacheAdapterMock.loadManyAsync(
          deepEqualEntityAware(new SingleFieldHolder('id')),
          deepEqualEntityAware([
            new SingleFieldValueHolder('wat'),
            new SingleFieldValueHolder('who'),
          ]),
        ),
      ).once();
      verify(
        cacheAdapterMock.cacheManyAsync(
          deepEqualEntityAware(new SingleFieldHolder('id')),
          deepEqualEntityAware(
            new SingleFieldValueHolderMap(
              new Map([
                [new SingleFieldValueHolder('wat'), { id: 'wat' }],
                [new SingleFieldValueHolder('who'), { id: 'who' }],
              ]),
            ),
          ),
        ),
      ).never();
      verify(
        cacheAdapterMock.cacheDBMissesAsync(
          deepEqualEntityAware(new SingleFieldHolder<BlahFields, 'id'>('id')),
          deepEqualEntityAware([] as SingleFieldValueHolder<BlahFields, 'id'>[]),
        ),
      ).never();
      expect(result).toEqual(
        new SingleFieldValueHolderMap(
          new Map([
            [new SingleFieldValueHolder('wat'), [{ id: 'wat' }]],
            [new SingleFieldValueHolder('who'), [{ id: 'who' }]],
          ]),
        ),
      );
    });

    it('negatively caches db misses', async () => {
      const cacheAdapterMock = mock<IEntityCacheAdapter<BlahFields>>();
      const cacheAdapter = instance(cacheAdapterMock);
      const entityCache = new ReadThroughEntityCache(makeEntityConfiguration(true), cacheAdapter);

      // simulate db miss
      const fetcher = createIdFetcher(['wat', 'who']);

      when(
        cacheAdapterMock.loadManyAsync(
          deepEqualEntityAware(new SingleFieldHolder('id')),
          deepEqualEntityAware([new SingleFieldValueHolder('why')]),
        ),
      ).thenResolve(
        new SingleFieldValueHolderMap(
          new Map([[new SingleFieldValueHolder('why'), { status: CacheStatus.MISS }]]),
        ),
      );

      const result = await entityCache.readManyThroughAsync(
        new SingleFieldHolder<BlahFields, 'id'>('id'),
        [new SingleFieldValueHolder<BlahFields, 'id'>('why')],
        fetcher,
      );

      verify(
        cacheAdapterMock.loadManyAsync(
          deepEqualEntityAware(new SingleFieldHolder('id')),
          deepEqualEntityAware([new SingleFieldValueHolder('why')]),
        ),
      ).once();
      verify(
        cacheAdapterMock.cacheManyAsync(
          deepEqualEntityAware(new SingleFieldHolder('id')),
          deepEqualEntityAware(new SingleFieldValueHolderMap(new Map())),
        ),
      ).once();
      verify(
        cacheAdapterMock.cacheDBMissesAsync(
          deepEqualEntityAware(new SingleFieldHolder('id')),
          deepEqualEntityAware([new SingleFieldValueHolder('why')]),
        ),
      ).once();
      expect(result).toEqual(new SingleFieldValueHolderMap(new Map()));
    });

    it('does not return or fetch negatively cached results from DB', async () => {
      const cacheAdapterMock = mock<IEntityCacheAdapter<BlahFields>>();
      const cacheAdapter = instance(cacheAdapterMock);
      const entityCache = new ReadThroughEntityCache(makeEntityConfiguration(true), cacheAdapter);
      const fetcher = createIdFetcher([]);

      when(
        cacheAdapterMock.loadManyAsync(
          deepEqualEntityAware(new SingleFieldHolder('id')),
          deepEqualEntityAware([new SingleFieldValueHolder('why')]),
        ),
      ).thenResolve(
        new SingleFieldValueHolderMap(
          new Map([[new SingleFieldValueHolder('why'), { status: CacheStatus.NEGATIVE }]]),
        ),
      );

      const result = await entityCache.readManyThroughAsync(
        new SingleFieldHolder<BlahFields, 'id'>('id'),
        [new SingleFieldValueHolder<BlahFields, 'id'>('why')],
        fetcher,
      );
      verify(
        cacheAdapterMock.loadManyAsync(
          deepEqualEntityAware(new SingleFieldHolder('id')),
          deepEqualEntityAware([new SingleFieldValueHolder('why')]),
        ),
      ).once();
      verify(cacheAdapterMock.cacheManyAsync(new SingleFieldHolder('id'), anything())).never();
      verify(cacheAdapterMock.cacheDBMissesAsync(new SingleFieldHolder('id'), anything())).never();
      expect(result).toEqual(new SingleFieldValueHolderMap(new Map()));
    });

    it('does a mix and match of hit, miss, and negative', async () => {
      const cacheAdapterMock = mock<IEntityCacheAdapter<BlahFields>>();
      const cacheAdapter = instance(cacheAdapterMock);
      const entityCache = new ReadThroughEntityCache(makeEntityConfiguration(true), cacheAdapter);
      const fetcher = createIdFetcher(['wat', 'who', 'why']);

      when(
        cacheAdapterMock.loadManyAsync(
          deepEqualEntityAware(new SingleFieldHolder('id')),
          deepEqualEntityAware([
            new SingleFieldValueHolder('wat'),
            new SingleFieldValueHolder('who'),
            new SingleFieldValueHolder('why'),
            new SingleFieldValueHolder('how'),
          ]),
        ),
      ).thenResolve(
        new SingleFieldValueHolderMap(
          new Map([
            [new SingleFieldValueHolder('wat'), { status: CacheStatus.MISS }],
            [new SingleFieldValueHolder('who'), { status: CacheStatus.NEGATIVE }],
            [new SingleFieldValueHolder('why'), { status: CacheStatus.HIT, item: { id: 'why' } }],
            [new SingleFieldValueHolder('how'), { status: CacheStatus.MISS }],
          ]),
        ),
      );

      const result = await entityCache.readManyThroughAsync(
        new SingleFieldHolder<BlahFields, 'id'>('id'),
        [
          new SingleFieldValueHolder<BlahFields, 'id'>('wat'),
          new SingleFieldValueHolder<BlahFields, 'id'>('who'),
          new SingleFieldValueHolder<BlahFields, 'id'>('why'),
          new SingleFieldValueHolder<BlahFields, 'id'>('how'),
        ],
        fetcher,
      );
      verify(
        cacheAdapterMock.loadManyAsync(
          deepEqualEntityAware(new SingleFieldHolder('id')),
          deepEqualEntityAware([
            new SingleFieldValueHolder('wat'),
            new SingleFieldValueHolder('who'),
            new SingleFieldValueHolder('why'),
            new SingleFieldValueHolder('how'),
          ]),
        ),
      ).once();
      verify(
        cacheAdapterMock.cacheManyAsync(
          deepEqualEntityAware(new SingleFieldHolder('id')),
          deepEqualEntityAware(
            new SingleFieldValueHolderMap(
              new Map([[new SingleFieldValueHolder('wat'), { id: 'wat' }]]),
            ),
          ),
        ),
      ).once();
      verify(
        cacheAdapterMock.cacheDBMissesAsync(
          deepEqualEntityAware(new SingleFieldHolder('id')),
          deepEqualEntityAware([new SingleFieldValueHolder('how')]),
        ),
      ).once();
      expect(
        isEqualWithEntityAware(
          result,
          new SingleFieldValueHolderMap(
            new Map([
              [new SingleFieldValueHolder('wat'), [{ id: 'wat' }]],
              [new SingleFieldValueHolder('why'), [{ id: 'why' }]],
            ]),
          ),
        ),
      ).toBe(true);
    });

    it('does not call into cache for field that is not cacheable', async () => {
      const cacheAdapterMock = mock<IEntityCacheAdapter<BlahFields>>();
      const cacheAdapter = instance(cacheAdapterMock);
      const entityCache = new ReadThroughEntityCache(makeEntityConfiguration(false), cacheAdapter);
      const fetcher = createIdFetcher(['wat']);
      const result = await entityCache.readManyThroughAsync(
        new SingleFieldHolder<BlahFields, 'id'>('id'),
        [new SingleFieldValueHolder<BlahFields, 'id'>('wat')],
        fetcher,
      );
      verify(cacheAdapterMock.loadManyAsync(new SingleFieldHolder('id'), anything())).never();
      expect(result).toEqual(
        new SingleFieldValueHolderMap(
          new Map([[new SingleFieldValueHolder('wat'), [{ id: 'wat' }]]]),
        ),
      );
    });

    it('does not cache when DB returns multiple objects for what is supposed to be unique and returns empty', async () => {
      const consoleSpy = jest.spyOn(console, 'warn');

      const cacheAdapterMock = mock<IEntityCacheAdapter<BlahFields>>();
      const cacheAdapter = instance(cacheAdapterMock);
      const entityCache = new ReadThroughEntityCache(makeEntityConfiguration(true), cacheAdapter);
      const fetcher = createFetcherNonUnique(['wat', 'who']);

      when(
        cacheAdapterMock.loadManyAsync(
          deepEqualEntityAware(new SingleFieldHolder('id')),
          deepEqualEntityAware([
            new SingleFieldValueHolder('wat'),
            new SingleFieldValueHolder('who'),
          ]),
        ),
      ).thenResolve(
        new SingleFieldValueHolderMap(
          new Map([
            [new SingleFieldValueHolder('wat'), { status: CacheStatus.MISS }],
            [new SingleFieldValueHolder('who'), { status: CacheStatus.MISS }],
          ]),
        ),
      );

      const result = await entityCache.readManyThroughAsync(
        new SingleFieldHolder<BlahFields, 'id'>('id'),
        [
          new SingleFieldValueHolder<BlahFields, 'id'>('wat'),
          new SingleFieldValueHolder<BlahFields, 'id'>('who'),
        ],
        fetcher,
      );

      verify(
        cacheAdapterMock.loadManyAsync(
          deepEqualEntityAware(new SingleFieldHolder('id')),
          deepEqualEntityAware([
            new SingleFieldValueHolder('wat'),
            new SingleFieldValueHolder('who'),
          ]),
        ),
      ).once();
      verify(
        cacheAdapterMock.cacheManyAsync(
          deepEqualEntityAware(new SingleFieldHolder('id')),
          deepEqualEntityAware(
            new Map([
              [new SingleFieldValueHolder('wat'), { id: 'wat' }],
              [new SingleFieldValueHolder('who'), { id: 'who' }],
            ]),
          ),
        ),
      ).never();
      verify(
        cacheAdapterMock.cacheDBMissesAsync(
          deepEqualEntityAware(new SingleFieldHolder<BlahFields, 'id'>('id')),
          deepEqualEntityAware([] as SingleFieldValueHolder<BlahFields, 'id'>[]),
        ),
      ).once();
      expect(result).toEqual(new SingleFieldValueHolderMap(new Map()));

      expect(consoleSpy).toHaveBeenCalledWith(
        'unique key SingleField(id) in table blah returned multiple rows for SingleFieldValue(wat)',
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        'unique key SingleField(id) in table blah returned multiple rows for SingleFieldValue(who)',
      );
    });
  });

  describe('invalidateManyAsync', () => {
    it('calls cache adapter invalidate', async () => {
      const cacheAdapterMock = mock<IEntityCacheAdapter<BlahFields>>();
      const cacheAdapter = instance(cacheAdapterMock);
      const entityCache = new ReadThroughEntityCache(makeEntityConfiguration(true), cacheAdapter);
      await entityCache.invalidateManyAsync(new SingleFieldHolder('id'), [
        new SingleFieldValueHolder('wat'),
      ]);
      verify(
        cacheAdapterMock.invalidateManyAsync(
          deepEqualEntityAware(new SingleFieldHolder('id')),
          deepEqualEntityAware([new SingleFieldValueHolder('wat')]),
        ),
      ).once();
    });
  });
});
