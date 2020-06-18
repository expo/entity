import { mock, instance, when } from 'ts-mockito';

import EntityCacheAdapter from '../EntityCacheAdapter';
import EntityConfiguration from '../EntityConfiguration';
import { FieldTransformerMap } from '../internal/EntityFieldTransformationUtils';

describe(EntityCacheAdapter, () => {
  class TestEntityCacheAdapter<TFields> extends EntityCacheAdapter<TFields> {
    public getFieldTransformerMap(): FieldTransformerMap {
      throw new Error('Method not implemented.');
    }
    public loadManyAsync<N extends keyof TFields>(
      _fieldName: N,
      _fieldValues: readonly NonNullable<TFields[N]>[]
    ): Promise<ReadonlyMap<NonNullable<TFields[N]>, import('..').CacheLoadResult>> {
      throw new Error('Method not implemented.');
    }
    public cacheManyAsync<N extends keyof TFields>(
      _fieldName: N,
      _objectMap: ReadonlyMap<NonNullable<TFields[N]>, object>
    ): Promise<void> {
      throw new Error('Method not implemented.');
    }
    public cacheDBMissesAsync<N extends keyof TFields>(
      _fieldName: N,
      _fieldValues: readonly NonNullable<TFields[N]>[]
    ): Promise<void> {
      throw new Error('Method not implemented.');
    }
    public invalidateManyAsync<N extends keyof TFields>(
      _fieldName: N,
      _fieldValues: readonly NonNullable<TFields[N]>[]
    ): Promise<void> {
      throw new Error('Method not implemented.');
    }
  }

  describe('getCacheKeyParts', () => {
    it('returns expected key parts as strings', () => {
      const configurationMock = mock(EntityConfiguration);
      when(configurationMock.cacheName).thenReturn('blah');
      when(configurationMock.cacheKeyVersion).thenReturn(10);

      const testAdapter = new TestEntityCacheAdapter(instance(configurationMock));
      expect(testAdapter['getCacheKeyParts']('hello', 'world')).toEqual([
        'blah',
        'v10',
        'hello',
        'world',
      ]);

      expect(testAdapter['getCacheKeyParts']('hello', 2)).toEqual(['blah', 'v10', 'hello', '2']);
    });
  });
});
