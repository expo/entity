import {
  CompositeFieldHolder,
  CompositeFieldValueHolder,
  CompositeFieldValueHolderMap,
  SingleFieldHolder,
  SingleFieldValueHolder,
  SingleFieldValueHolderMap,
  CacheStatus,
} from '@expo/entity';

import {
  InMemoryFullCacheStubCacheAdapterProvider,
  InMemoryFullCacheStubCacheAdapter,
  NoCacheStubCacheAdapter,
} from '../StubCacheAdapter';
import { testEntityConfiguration, TestFields } from '../__testfixtures__/TestEntity';

describe(NoCacheStubCacheAdapter, () => {
  describe('loadManyAsync', () => {
    it('should return a map of CacheLoadResult with status CacheStatus.MISS for all single values', async () => {
      const adapter = new NoCacheStubCacheAdapter<TestFields, 'customIdField'>();
      const result = await adapter.loadManyAsync(new SingleFieldHolder('stringField'), [
        new SingleFieldValueHolder('huh'),
      ]);
      expect(result).toEqual(
        new SingleFieldValueHolderMap(
          new Map([[new SingleFieldValueHolder('huh'), { status: CacheStatus.MISS }]]),
        ),
      );
    });

    it('should return a map of CacheLoadResult with status CacheStatus.MISS for all composite values', async () => {
      const adapter = new NoCacheStubCacheAdapter<TestFields, 'customIdField'>();
      const result = await adapter.loadManyAsync(
        new CompositeFieldHolder<TestFields, 'customIdField'>(['stringField', 'intField']),
        [new CompositeFieldValueHolder({ stringField: 'huh', intField: 42 })],
      );
      expect(result).toEqual(
        new CompositeFieldValueHolderMap(
          new Map([
            [
              new CompositeFieldValueHolder({ stringField: 'huh', intField: 42 }),
              { status: CacheStatus.MISS },
            ],
          ]),
        ),
      );
    });
  });
});

describe(InMemoryFullCacheStubCacheAdapter, () => {
  it('correctly functions', async () => {
    const adapter = new InMemoryFullCacheStubCacheAdapterProvider().getCacheAdapter(
      testEntityConfiguration,
    );
    const result = await adapter.loadManyAsync(new SingleFieldHolder('stringField'), [
      new SingleFieldValueHolder('huh'),
    ]);
    expect(result).toEqual(
      new SingleFieldValueHolderMap(
        new Map([[new SingleFieldValueHolder('huh'), { status: CacheStatus.MISS }]]),
      ),
    );

    await adapter.cacheManyAsync(new SingleFieldHolder('stringField'), new Map());
    const result2 = await adapter.loadManyAsync(new SingleFieldHolder('stringField'), [
      new SingleFieldValueHolder('huh'),
    ]);
    expect(result2).toEqual(
      new SingleFieldValueHolderMap(
        new Map([[new SingleFieldValueHolder('huh'), { status: CacheStatus.MISS }]]),
      ),
    );

    const fields = {
      stringField: 'huh',
      customIdField: 'id1',
      testIndexedField: 'wat',
      intField: 3,
      dateField: new Date(),
      nullableField: null,
    };

    await adapter.cacheManyAsync(
      new SingleFieldHolder('stringField'),
      new Map([[new SingleFieldValueHolder('huh'), fields]]),
    );
    const result3 = await adapter.loadManyAsync(new SingleFieldHolder('stringField'), [
      new SingleFieldValueHolder('huh'),
    ]);
    expect(result3).toEqual(
      new SingleFieldValueHolderMap(
        new Map([[new SingleFieldValueHolder('huh'), { status: CacheStatus.HIT, item: fields }]]),
      ),
    );

    await adapter.invalidateManyAsync(new SingleFieldHolder('stringField'), [
      new SingleFieldValueHolder('huh'),
    ]);
    const result4 = await adapter.loadManyAsync(new SingleFieldHolder('stringField'), [
      new SingleFieldValueHolder('huh'),
    ]);
    expect(result4).toEqual(
      new SingleFieldValueHolderMap(
        new Map([[new SingleFieldValueHolder('huh'), { status: CacheStatus.MISS }]]),
      ),
    );

    await adapter.cacheDBMissesAsync(new SingleFieldHolder('stringField'), [
      new SingleFieldValueHolder('huh'),
    ]);
    const result5 = await adapter.loadManyAsync(new SingleFieldHolder('stringField'), [
      new SingleFieldValueHolder('huh'),
    ]);
    expect(result5).toEqual(
      new SingleFieldValueHolderMap(
        new Map([[new SingleFieldValueHolder('huh'), { status: CacheStatus.NEGATIVE }]]),
      ),
    );

    await adapter.invalidateManyAsync(new SingleFieldHolder('stringField'), [
      new SingleFieldValueHolder('huh'),
    ]);
    const result6 = await adapter.loadManyAsync(new SingleFieldHolder('stringField'), [
      new SingleFieldValueHolder('huh'),
    ]);
    expect(result6).toEqual(
      new SingleFieldValueHolderMap(
        new Map([[new SingleFieldValueHolder('huh'), { status: CacheStatus.MISS }]]),
      ),
    );
  });
});
