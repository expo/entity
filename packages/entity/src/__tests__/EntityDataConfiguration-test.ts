import { DatabaseAdapterFlavor, CacheAdapterFlavor } from '../EntityCompanionProvider';
import EntityConfiguration from '../EntityConfiguration';
import { UUIDField, StringField } from '../EntityFields';

describe(EntityConfiguration, () => {
  type BlahT = {
    id: string;
    cacheable: string;
    uniqueButNotCacheable: string;
  };

  type Blah2T = {
    id: string;
  };

  const blahEntityConfiguration = new EntityConfiguration<BlahT>({
    idField: 'id',
    tableName: 'blah_table',
    schema: {
      id: new UUIDField({
        columnName: 'id',
      }),
      cacheable: new StringField({
        columnName: 'cacheable',
        cache: true,
      }),
      uniqueButNotCacheable: new StringField({
        columnName: 'unique_but_not_cacheable',
      }),
    },
    databaseAdapterFlavor: DatabaseAdapterFlavor.POSTGRES,
    cacheAdapterFlavor: CacheAdapterFlavor.REDIS,
  });

  it('returns correct fields', () => {
    expect(blahEntityConfiguration.idField).toEqual('id');
    expect(blahEntityConfiguration.tableName).toEqual('blah_table');
    expect(blahEntityConfiguration.databaseAdapterFlavor).toEqual(DatabaseAdapterFlavor.POSTGRES);
    expect(blahEntityConfiguration.cacheAdapterFlavor).toEqual(CacheAdapterFlavor.REDIS);
  });

  it('filters cacheable fields', () => {
    expect(blahEntityConfiguration.cacheableKeys).toEqual(new Set(['cacheable']));
  });

  describe('cache key version', () => {
    it('defaults to 0', () => {
      const entityConfiguration = new EntityConfiguration<Blah2T>({
        idField: 'id',
        tableName: 'blah',
        schema: {
          id: new UUIDField({
            columnName: 'id',
          }),
        },
        databaseAdapterFlavor: DatabaseAdapterFlavor.POSTGRES,
        cacheAdapterFlavor: CacheAdapterFlavor.REDIS,
      });
      expect(entityConfiguration.cacheKeyVersion).toEqual(0);
    });

    it('sets to custom version', () => {
      const entityConfiguration = new EntityConfiguration<Blah2T>({
        idField: 'id',
        tableName: 'blah',
        schema: {
          id: new UUIDField({
            columnName: 'id',
          }),
        },
        databaseAdapterFlavor: DatabaseAdapterFlavor.POSTGRES,
        cacheAdapterFlavor: CacheAdapterFlavor.REDIS,
        cacheKeyVersion: 100,
      });
      expect(entityConfiguration.cacheKeyVersion).toEqual(100);
    });
  });
});
