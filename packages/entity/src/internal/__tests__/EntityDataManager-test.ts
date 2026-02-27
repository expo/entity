import { describe, expect, it, jest } from '@jest/globals';
import {
  anyNumber,
  anything,
  deepEqual,
  instance,
  mock,
  resetCalls,
  verify,
  when,
} from 'ts-mockito';

import { EntityDatabaseAdapter } from '../../EntityDatabaseAdapter';
import { TransactionalDataLoaderMode } from '../../EntityQueryContext';
import {
  EntityMetricsLoadType,
  IEntityMetricsAdapter,
  IncrementLoadCountEventType,
} from '../../metrics/IEntityMetricsAdapter';
import { NoOpEntityMetricsAdapter } from '../../metrics/NoOpEntityMetricsAdapter';
import {
  InMemoryFullCacheStubCacheAdapterProvider,
  NoCacheStubCacheAdapterProvider,
} from '../../utils/__testfixtures__/StubCacheAdapter';
import { StubDatabaseAdapter } from '../../utils/__testfixtures__/StubDatabaseAdapter';
import { StubQueryContextProvider } from '../../utils/__testfixtures__/StubQueryContextProvider';
import {
  TestEntity,
  testEntityConfiguration,
  TestFields,
} from '../../utils/__testfixtures__/TestEntity';
import { CompositeFieldHolder, CompositeFieldValueHolder } from '../CompositeFieldHolder';
import { EntityDataManager } from '../EntityDataManager';
import { EntityLoadMethodType } from '../../EntityLoadInterfaces';
import { ReadThroughEntityCache } from '../ReadThroughEntityCache';
import { SingleFieldHolder, SingleFieldValueHolder } from '../SingleFieldHolder';

const getObjects = (): Map<string, TestFields[]> =>
  new Map([
    [
      testEntityConfiguration.tableName,
      [
        {
          customIdField: '1',
          testIndexedField: 'unique1',
          stringField: 'hello',
          intField: 1,
          dateField: new Date(),
          nullableField: null,
        },
        {
          customIdField: '2',
          testIndexedField: 'unique2',
          stringField: 'hello',
          intField: 1,
          dateField: new Date(),
          nullableField: null,
        },
        {
          customIdField: '3',
          testIndexedField: 'unique3',
          stringField: 'world',
          intField: 1,
          dateField: new Date(),
          nullableField: null,
        },
      ],
    ],
  ]);

describe(EntityDataManager, () => {
  it('loads from db with a no-cache adapter', async () => {
    const objects = getObjects();
    const dataStore = StubDatabaseAdapter.convertFieldObjectsToDataStore(
      testEntityConfiguration,
      objects,
    );
    const databaseAdapter = new StubDatabaseAdapter<TestFields, 'customIdField'>(
      testEntityConfiguration,
      dataStore,
    );
    const cacheAdapterProvider = new NoCacheStubCacheAdapterProvider();
    const cacheAdapter = cacheAdapterProvider.getCacheAdapter(testEntityConfiguration);
    const entityCache = new ReadThroughEntityCache(testEntityConfiguration, cacheAdapter);
    const entityDataManager = new EntityDataManager(
      databaseAdapter,
      entityCache,
      new StubQueryContextProvider(),
      new NoOpEntityMetricsAdapter(),
      TestEntity.name,
    );
    const queryContext = new StubQueryContextProvider().getQueryContext();

    const dbSpy = jest.spyOn(databaseAdapter, 'fetchManyWhereAsync');
    const cacheSpy = jest.spyOn(entityCache, 'readManyThroughAsync');

    const entityDatas = await entityDataManager.loadManyEqualingAsync(
      queryContext,
      new SingleFieldHolder<TestFields, 'customIdField', 'customIdField'>('customIdField'),
      [new SingleFieldValueHolder('2')],
    );
    expect(entityDatas.get(new SingleFieldValueHolder('2'))).toHaveLength(1);

    expect(dbSpy).toHaveBeenCalled();
    expect(cacheSpy).toHaveBeenCalled();
    dbSpy.mockClear();
    cacheSpy.mockClear();

    const entityDatas2 = await entityDataManager.loadManyEqualingAsync(
      queryContext,
      new SingleFieldHolder<TestFields, 'customIdField', 'testIndexedField'>('testIndexedField'),
      [new SingleFieldValueHolder('unique2'), new SingleFieldValueHolder('unique3')],
    );
    expect(entityDatas2.get(new SingleFieldValueHolder('unique2'))).toHaveLength(1);
    expect(entityDatas2.get(new SingleFieldValueHolder('unique3'))).toHaveLength(1);

    expect(dbSpy).toHaveBeenCalled();
    expect(cacheSpy).toHaveBeenCalled();
    dbSpy.mockClear();
    cacheSpy.mockClear();
  });

  it('loads from a caching adapter', async () => {
    const objects = getObjects();
    const dataStore = StubDatabaseAdapter.convertFieldObjectsToDataStore(
      testEntityConfiguration,
      objects,
    );
    const databaseAdapter = new StubDatabaseAdapter<TestFields, 'customIdField'>(
      testEntityConfiguration,
      dataStore,
    );
    const cacheAdapterProvider = new InMemoryFullCacheStubCacheAdapterProvider();
    const cacheAdapter = cacheAdapterProvider.getCacheAdapter(testEntityConfiguration);
    const entityCache = new ReadThroughEntityCache(testEntityConfiguration, cacheAdapter);
    const entityDataManager = new EntityDataManager(
      databaseAdapter,
      entityCache,
      new StubQueryContextProvider(),
      new NoOpEntityMetricsAdapter(),
      TestEntity.name,
    );
    const queryContext = new StubQueryContextProvider().getQueryContext();

    const dbSpy = jest.spyOn(databaseAdapter, 'fetchManyWhereAsync');
    const cacheSpy = jest.spyOn(entityCache, 'readManyThroughAsync');

    const entityDatas = await entityDataManager.loadManyEqualingAsync(
      queryContext,
      new SingleFieldHolder<TestFields, 'customIdField', 'customIdField'>('customIdField'),
      [new SingleFieldValueHolder('1')],
    );
    expect(entityDatas.get(new SingleFieldValueHolder('1'))).toHaveLength(1);

    expect(dbSpy).toHaveBeenCalled();
    expect(cacheSpy).toHaveBeenCalled();
    dbSpy.mockClear();
    cacheSpy.mockClear();

    const entityDatas2 = await entityDataManager.loadManyEqualingAsync(
      queryContext,
      new SingleFieldHolder<TestFields, 'customIdField', 'testIndexedField'>('testIndexedField'),
      [new SingleFieldValueHolder('unique2'), new SingleFieldValueHolder('unique3')],
    );
    expect(entityDatas2.get(new SingleFieldValueHolder('unique2'))).toHaveLength(1);
    expect(entityDatas2.get(new SingleFieldValueHolder('unique3'))).toHaveLength(1);

    expect(dbSpy).toHaveBeenCalled();
    expect(cacheSpy).toHaveBeenCalled();
    dbSpy.mockClear();
    cacheSpy.mockClear();
  });

  it('loads from a caching adapter with a cache hit', async () => {
    const objects = getObjects();
    const dataStore = StubDatabaseAdapter.convertFieldObjectsToDataStore(
      testEntityConfiguration,
      objects,
    );
    const databaseAdapter = new StubDatabaseAdapter<TestFields, 'customIdField'>(
      testEntityConfiguration,
      dataStore,
    );
    const cacheAdapterProvider = new InMemoryFullCacheStubCacheAdapterProvider();
    const cacheAdapter = cacheAdapterProvider.getCacheAdapter(testEntityConfiguration);
    const entityCache = new ReadThroughEntityCache(testEntityConfiguration, cacheAdapter);
    const entityDataManager = new EntityDataManager(
      databaseAdapter,
      entityCache,
      new StubQueryContextProvider(),
      new NoOpEntityMetricsAdapter(),
      TestEntity.name,
    );
    const queryContext = new StubQueryContextProvider().getQueryContext();
    // use second data manager to ensure that cache is hit instead of data loader
    const entityDataManager2 = new EntityDataManager(
      databaseAdapter,
      entityCache,
      new StubQueryContextProvider(),
      new NoOpEntityMetricsAdapter(),
      TestEntity.name,
    );

    const dbSpy = jest.spyOn(databaseAdapter, 'fetchManyWhereAsync');
    const cacheSpy = jest.spyOn(entityCache, 'readManyThroughAsync');

    await entityDataManager.loadManyEqualingAsync(
      queryContext,
      new SingleFieldHolder<TestFields, 'customIdField', 'testIndexedField'>('testIndexedField'),
      [new SingleFieldValueHolder('unique2')],
    );
    await entityDataManager2.loadManyEqualingAsync(
      queryContext,
      new SingleFieldHolder<TestFields, 'customIdField', 'testIndexedField'>('testIndexedField'),
      [new SingleFieldValueHolder('unique2')],
    );

    expect(dbSpy).toHaveBeenCalledTimes(1);
    expect(cacheSpy).toHaveBeenCalledTimes(2);

    dbSpy.mockReset();
    cacheSpy.mockReset();
  });

  it('loads from data loader for same query', async () => {
    const objects = getObjects();
    const dataStore = StubDatabaseAdapter.convertFieldObjectsToDataStore(
      testEntityConfiguration,
      objects,
    );
    const databaseAdapter = new StubDatabaseAdapter<TestFields, 'customIdField'>(
      testEntityConfiguration,
      dataStore,
    );
    const cacheAdapterProvider = new InMemoryFullCacheStubCacheAdapterProvider();
    const cacheAdapter = cacheAdapterProvider.getCacheAdapter(testEntityConfiguration);
    const entityCache = new ReadThroughEntityCache(testEntityConfiguration, cacheAdapter);
    const entityDataManager = new EntityDataManager(
      databaseAdapter,
      entityCache,
      new StubQueryContextProvider(),
      new NoOpEntityMetricsAdapter(),
      TestEntity.name,
    );
    const queryContext = new StubQueryContextProvider().getQueryContext();

    const dbSpy = jest.spyOn(databaseAdapter, 'fetchManyWhereAsync');
    const cacheSpy = jest.spyOn(entityCache, 'readManyThroughAsync');

    await entityDataManager.loadManyEqualingAsync(
      queryContext,
      new SingleFieldHolder<TestFields, 'customIdField', 'testIndexedField'>('testIndexedField'),
      [new SingleFieldValueHolder('unique2')],
    );
    await entityDataManager.loadManyEqualingAsync(
      queryContext,
      new SingleFieldHolder<TestFields, 'customIdField', 'testIndexedField'>('testIndexedField'),
      [new SingleFieldValueHolder('unique2')],
    );

    expect(dbSpy).toHaveBeenCalledTimes(1);
    expect(cacheSpy).toHaveBeenCalledTimes(1);

    dbSpy.mockReset();
    cacheSpy.mockReset();
  });

  it('loads and in-memory caches (dataloader) non-unique, non-cacheable loads', async () => {
    const objects = getObjects();
    const dataStore = StubDatabaseAdapter.convertFieldObjectsToDataStore(
      testEntityConfiguration,
      objects,
    );
    const databaseAdapter = new StubDatabaseAdapter<TestFields, 'customIdField'>(
      testEntityConfiguration,
      dataStore,
    );
    const cacheAdapterProvider = new InMemoryFullCacheStubCacheAdapterProvider();
    const cacheAdapter = cacheAdapterProvider.getCacheAdapter(testEntityConfiguration);
    const entityCache = new ReadThroughEntityCache(testEntityConfiguration, cacheAdapter);
    const entityDataManager = new EntityDataManager(
      databaseAdapter,
      entityCache,
      new StubQueryContextProvider(),
      new NoOpEntityMetricsAdapter(),
      TestEntity.name,
    );
    const queryContext = new StubQueryContextProvider().getQueryContext();

    const dbSpy = jest.spyOn(databaseAdapter, 'fetchManyWhereAsync');
    const cacheSpy = jest.spyOn(entityCache, 'readManyThroughAsync');

    const entityData = await entityDataManager.loadManyEqualingAsync(
      queryContext,
      new SingleFieldHolder<TestFields, 'customIdField', 'stringField'>('stringField'),
      [new SingleFieldValueHolder('hello'), new SingleFieldValueHolder('world')],
    );
    const entityData2 = await entityDataManager.loadManyEqualingAsync(
      queryContext,
      new SingleFieldHolder<TestFields, 'customIdField', 'stringField'>('stringField'),
      [new SingleFieldValueHolder('hello'), new SingleFieldValueHolder('world')],
    );

    expect(dbSpy).toHaveBeenCalledTimes(1);
    expect(cacheSpy).toHaveBeenCalledTimes(1);

    expect(entityData).toEqual(entityData2);
    expect(entityData.get(new SingleFieldValueHolder('hello'))).toHaveLength(2);
    expect(entityData.get(new SingleFieldValueHolder('world'))).toHaveLength(1);

    dbSpy.mockReset();
    cacheSpy.mockReset();
  });

  it('loads and in-memory batches (dataloader) loads in transaction when enabled with TransactionalDataLoaderMode.ENABLED_BATCH_ONLY and does not read from cache for transactions and nested transactions', async () => {
    const objects = getObjects();
    const dataStore = StubDatabaseAdapter.convertFieldObjectsToDataStore(
      testEntityConfiguration,
      objects,
    );
    const databaseAdapter = new StubDatabaseAdapter<TestFields, 'customIdField'>(
      testEntityConfiguration,
      dataStore,
    );
    const cacheAdapterProvider = new InMemoryFullCacheStubCacheAdapterProvider();
    const cacheAdapter = cacheAdapterProvider.getCacheAdapter(testEntityConfiguration);
    const entityCache = new ReadThroughEntityCache(testEntityConfiguration, cacheAdapter);
    const entityDataManager = new EntityDataManager(
      databaseAdapter,
      entityCache,
      new StubQueryContextProvider(),
      new NoOpEntityMetricsAdapter(),
      TestEntity.name,
    );

    const dbSpy = jest.spyOn(databaseAdapter, 'fetchManyWhereAsync');
    const cacheSpy = jest.spyOn(entityCache, 'readManyThroughAsync');

    const [entityData, entityData2, entityData3, entityData4] =
      await new StubQueryContextProvider().runInTransactionAsync(async (queryContext) => {
        const [entityData, entityData2] = await Promise.all([
          entityDataManager.loadManyEqualingAsync(
            queryContext,
            new SingleFieldHolder<TestFields, 'customIdField', 'stringField'>('stringField'),
            [new SingleFieldValueHolder('hello'), new SingleFieldValueHolder('world')],
          ),
          entityDataManager.loadManyEqualingAsync(
            queryContext,
            new SingleFieldHolder<TestFields, 'customIdField', 'stringField'>('stringField'),
            [new SingleFieldValueHolder('hello'), new SingleFieldValueHolder('world')],
          ),
        ]);
        const [entityData3, entityData4] = await queryContext.runInNestedTransactionAsync(
          async (innerQueryContext) => {
            const entityData3 = await entityDataManager.loadManyEqualingAsync(
              innerQueryContext,
              new SingleFieldHolder<TestFields, 'customIdField', 'stringField'>('stringField'),
              [new SingleFieldValueHolder('hello'), new SingleFieldValueHolder('world')],
            );

            const entityData4 = await queryContext.runInNestedTransactionAsync(
              async (innerInnerQueryContext) => {
                return await entityDataManager.loadManyEqualingAsync(
                  innerInnerQueryContext,
                  new SingleFieldHolder<TestFields, 'customIdField', 'stringField'>('stringField'),
                  [new SingleFieldValueHolder('hello'), new SingleFieldValueHolder('world')],
                );
              },
            );

            return [entityData3, entityData4];
          },
        );
        return [entityData, entityData2, entityData3, entityData4];
      });

    // entityData, entityData3 (new nested transaction), and entityData4 (new nested transaction) loads should all need to call the database
    // entityData and entityData2 should be batched to one db load call
    expect(dbSpy).toHaveBeenCalledTimes(3);
    expect(cacheSpy).toHaveBeenCalledTimes(0);

    expect(entityData).toEqual(entityData2);
    expect(entityData2).toEqual(entityData3);
    expect(entityData3).toEqual(entityData4);
    expect(entityData.get(new SingleFieldValueHolder('hello'))).toHaveLength(2);
    expect(entityData.get(new SingleFieldValueHolder('world'))).toHaveLength(1);

    dbSpy.mockReset();
    cacheSpy.mockReset();
  });

  it('loads and in-memory caches (dataloader) loads in transaction when enabled with TransactionalDataLoaderMode.ENABLED and does not read from cache for transactions and nested transactions', async () => {
    const objects = getObjects();
    const dataStore = StubDatabaseAdapter.convertFieldObjectsToDataStore(
      testEntityConfiguration,
      objects,
    );
    const databaseAdapter = new StubDatabaseAdapter<TestFields, 'customIdField'>(
      testEntityConfiguration,
      dataStore,
    );
    const cacheAdapterProvider = new InMemoryFullCacheStubCacheAdapterProvider();
    const cacheAdapter = cacheAdapterProvider.getCacheAdapter(testEntityConfiguration);
    const entityCache = new ReadThroughEntityCache(testEntityConfiguration, cacheAdapter);
    const entityDataManager = new EntityDataManager(
      databaseAdapter,
      entityCache,
      new StubQueryContextProvider(),
      new NoOpEntityMetricsAdapter(),
      TestEntity.name,
    );

    const dbSpy = jest.spyOn(databaseAdapter, 'fetchManyWhereAsync');
    const cacheSpy = jest.spyOn(entityCache, 'readManyThroughAsync');

    const [entityData, entityData2, entityData3, entityData4] =
      await new StubQueryContextProvider().runInTransactionAsync(async (queryContext) => {
        const entityData = await entityDataManager.loadManyEqualingAsync(
          queryContext,
          new SingleFieldHolder<TestFields, 'customIdField', 'stringField'>('stringField'),
          [new SingleFieldValueHolder('hello'), new SingleFieldValueHolder('world')],
        );
        const entityData2 = await entityDataManager.loadManyEqualingAsync(
          queryContext,
          new SingleFieldHolder<TestFields, 'customIdField', 'stringField'>('stringField'),
          [new SingleFieldValueHolder('hello'), new SingleFieldValueHolder('world')],
        );
        const [entityData3, entityData4] = await queryContext.runInNestedTransactionAsync(
          async (innerQueryContext) => {
            const entityData3 = await entityDataManager.loadManyEqualingAsync(
              innerQueryContext,
              new SingleFieldHolder<TestFields, 'customIdField', 'stringField'>('stringField'),
              [new SingleFieldValueHolder('hello'), new SingleFieldValueHolder('world')],
            );

            const entityData4 = await queryContext.runInNestedTransactionAsync(
              async (innerInnerQueryContext) => {
                return await entityDataManager.loadManyEqualingAsync(
                  innerInnerQueryContext,
                  new SingleFieldHolder<TestFields, 'customIdField', 'stringField'>('stringField'),
                  [new SingleFieldValueHolder('hello'), new SingleFieldValueHolder('world')],
                );
              },
            );

            return [entityData3, entityData4];
          },
        );
        return [entityData, entityData2, entityData3, entityData4];
      });

    // entityData, entityData3 (new nested transaction), and entityData4 (new nested transaction) loads should all need to call the database
    // entityData2 load should be cached in the dataloader
    expect(dbSpy).toHaveBeenCalledTimes(3);
    expect(cacheSpy).toHaveBeenCalledTimes(0);

    expect(entityData).toEqual(entityData2);
    expect(entityData2).toEqual(entityData3);
    expect(entityData3).toEqual(entityData4);
    expect(entityData.get(new SingleFieldValueHolder('hello'))).toHaveLength(2);
    expect(entityData.get(new SingleFieldValueHolder('world'))).toHaveLength(1);

    dbSpy.mockReset();
    cacheSpy.mockReset();
  });

  it('loads and does not in-memory cache (dataloader) loads in transaction when disabled', async () => {
    const objects = getObjects();
    const dataStore = StubDatabaseAdapter.convertFieldObjectsToDataStore(
      testEntityConfiguration,
      objects,
    );
    const databaseAdapter = new StubDatabaseAdapter<TestFields, 'customIdField'>(
      testEntityConfiguration,
      dataStore,
    );
    const cacheAdapterProvider = new InMemoryFullCacheStubCacheAdapterProvider();
    const cacheAdapter = cacheAdapterProvider.getCacheAdapter(testEntityConfiguration);
    const entityCache = new ReadThroughEntityCache(testEntityConfiguration, cacheAdapter);
    const entityDataManager = new EntityDataManager(
      databaseAdapter,
      entityCache,
      new StubQueryContextProvider(),
      new NoOpEntityMetricsAdapter(),
      TestEntity.name,
    );

    const dbSpy = jest.spyOn(databaseAdapter, 'fetchManyWhereAsync');
    const cacheSpy = jest.spyOn(entityCache, 'readManyThroughAsync');

    const [entityData, entityData2, entityData3, entityData4] =
      await new StubQueryContextProvider().runInTransactionAsync(
        async (queryContext) => {
          const entityData = await entityDataManager.loadManyEqualingAsync(
            queryContext,
            new SingleFieldHolder<TestFields, 'customIdField', 'stringField'>('stringField'),
            [new SingleFieldValueHolder('hello'), new SingleFieldValueHolder('world')],
          );
          const entityData2 = await entityDataManager.loadManyEqualingAsync(
            queryContext,
            new SingleFieldHolder<TestFields, 'customIdField', 'stringField'>('stringField'),
            [new SingleFieldValueHolder('hello'), new SingleFieldValueHolder('world')],
          );
          const [entityData3, entityData4] = await queryContext.runInNestedTransactionAsync(
            async (innerQueryContext) => {
              const entityData3 = await entityDataManager.loadManyEqualingAsync(
                innerQueryContext,
                new SingleFieldHolder<TestFields, 'customIdField', 'stringField'>('stringField'),
                [new SingleFieldValueHolder('hello'), new SingleFieldValueHolder('world')],
              );

              const entityData4 = await queryContext.runInNestedTransactionAsync(
                async (innerInnerQueryContext) => {
                  return await entityDataManager.loadManyEqualingAsync(
                    innerInnerQueryContext,
                    new SingleFieldHolder<TestFields, 'customIdField', 'stringField'>(
                      'stringField',
                    ),
                    [new SingleFieldValueHolder('hello'), new SingleFieldValueHolder('world')],
                  );
                },
              );

              return [entityData3, entityData4];
            },
          );
          return [entityData, entityData2, entityData3, entityData4];
        },
        {
          transactionalDataLoaderMode: TransactionalDataLoaderMode.DISABLED,
        },
      );

    // entityData, entityData2, entityData3 (new nested transaction), and entityData4 (new nested transaction) loads should all need to call the database
    expect(dbSpy).toHaveBeenCalledTimes(4);
    expect(cacheSpy).toHaveBeenCalledTimes(0);

    expect(entityData).toEqual(entityData2);
    expect(entityData2).toEqual(entityData3);
    expect(entityData3).toEqual(entityData4);
    expect(entityData.get(new SingleFieldValueHolder('hello'))).toHaveLength(2);
    expect(entityData.get(new SingleFieldValueHolder('world'))).toHaveLength(1);

    dbSpy.mockReset();
    cacheSpy.mockReset();
  });

  it('invalidates objects', async () => {
    const objects = getObjects();
    const dataStore = StubDatabaseAdapter.convertFieldObjectsToDataStore(
      testEntityConfiguration,
      objects,
    );
    const databaseAdapter = new StubDatabaseAdapter<TestFields, 'customIdField'>(
      testEntityConfiguration,
      dataStore,
    );
    const cacheAdapterProvider = new InMemoryFullCacheStubCacheAdapterProvider();
    const cacheAdapter = cacheAdapterProvider.getCacheAdapter(testEntityConfiguration);
    const entityCache = new ReadThroughEntityCache(testEntityConfiguration, cacheAdapter);
    const entityDataManager = new EntityDataManager(
      databaseAdapter,
      entityCache,
      new StubQueryContextProvider(),
      new NoOpEntityMetricsAdapter(),
      TestEntity.name,
    );
    const queryContext = new StubQueryContextProvider().getQueryContext();

    const objectInQuestion = objects.get(testEntityConfiguration.tableName)![1]!;

    const dbSpy = jest.spyOn(databaseAdapter, 'fetchManyWhereAsync');
    const cacheSpy = jest.spyOn(entityCache, 'readManyThroughAsync');

    await entityDataManager.loadManyEqualingAsync(
      queryContext,
      new SingleFieldHolder<TestFields, 'customIdField', 'testIndexedField'>('testIndexedField'),
      [new SingleFieldValueHolder(objectInQuestion['testIndexedField'])],
    );
    await entityDataManager.invalidateKeyValuePairsAsync([
      [
        new SingleFieldHolder<TestFields, 'customIdField', 'testIndexedField'>('testIndexedField'),
        new SingleFieldValueHolder(objectInQuestion['testIndexedField']),
      ],
    ]);
    await entityDataManager.loadManyEqualingAsync(
      queryContext,
      new SingleFieldHolder<TestFields, 'customIdField', 'testIndexedField'>('testIndexedField'),
      [new SingleFieldValueHolder(objectInQuestion['testIndexedField'])],
    );

    expect(dbSpy).toHaveBeenCalledTimes(2);
    expect(cacheSpy).toHaveBeenCalledTimes(2);

    dbSpy.mockReset();
    cacheSpy.mockReset();
  });

  it('invalidates all fields for an object', async () => {
    const objects = getObjects();
    const dataStore = StubDatabaseAdapter.convertFieldObjectsToDataStore(
      testEntityConfiguration,
      objects,
    );
    const databaseAdapter = new StubDatabaseAdapter<TestFields, 'customIdField'>(
      testEntityConfiguration,
      dataStore,
    );
    const cacheAdapterProvider = new InMemoryFullCacheStubCacheAdapterProvider();
    const cacheAdapter = cacheAdapterProvider.getCacheAdapter(testEntityConfiguration);
    const entityCache = new ReadThroughEntityCache(testEntityConfiguration, cacheAdapter);
    const entityDataManager = new EntityDataManager(
      databaseAdapter,
      entityCache,
      new StubQueryContextProvider(),
      new NoOpEntityMetricsAdapter(),
      TestEntity.name,
    );
    const queryContext = new StubQueryContextProvider().getQueryContext();

    const objectInQuestion = objects.get(testEntityConfiguration.tableName)![1]!;

    const dbSpy = jest.spyOn(databaseAdapter, 'fetchManyWhereAsync');
    const cacheSpy = jest.spyOn(entityCache, 'readManyThroughAsync');

    await entityDataManager.loadManyEqualingAsync(
      queryContext,
      new SingleFieldHolder<TestFields, 'customIdField', 'testIndexedField'>('testIndexedField'),
      [new SingleFieldValueHolder(objectInQuestion['testIndexedField'])],
    );
    await entityDataManager.invalidateKeyValuePairsAsync([
      [
        new SingleFieldHolder<TestFields, 'customIdField', 'testIndexedField'>('testIndexedField'),
        new SingleFieldValueHolder(objectInQuestion['testIndexedField']),
      ],
    ]);
    await entityDataManager.loadManyEqualingAsync(
      queryContext,
      new SingleFieldHolder<TestFields, 'customIdField', 'customIdField'>('customIdField'),
      [new SingleFieldValueHolder(objectInQuestion['customIdField'])],
    );

    expect(dbSpy).toHaveBeenCalledTimes(2);
    expect(cacheSpy).toHaveBeenCalledTimes(2);

    dbSpy.mockReset();
    cacheSpy.mockReset();
  });

  it('invalidates transactions and nested transactions correctly', async () => {
    const objects = getObjects();
    const dataStore = StubDatabaseAdapter.convertFieldObjectsToDataStore(
      testEntityConfiguration,
      objects,
    );
    const databaseAdapter = new StubDatabaseAdapter<TestFields, 'customIdField'>(
      testEntityConfiguration,
      dataStore,
    );
    const cacheAdapterProvider = new InMemoryFullCacheStubCacheAdapterProvider();
    const cacheAdapter = cacheAdapterProvider.getCacheAdapter(testEntityConfiguration);
    const entityCache = new ReadThroughEntityCache(testEntityConfiguration, cacheAdapter);
    const entityDataManager = new EntityDataManager(
      databaseAdapter,
      entityCache,
      new StubQueryContextProvider(),
      new NoOpEntityMetricsAdapter(),
      TestEntity.name,
    );

    await new StubQueryContextProvider().runInTransactionAsync(async (queryContext) => {
      const objectInQuestion = objects.get(testEntityConfiguration.tableName)![1]!;

      const dbSpy = jest.spyOn(databaseAdapter, 'fetchManyWhereAsync');
      const cacheSpy = jest.spyOn(entityCache, 'readManyThroughAsync');

      await entityDataManager.loadManyEqualingAsync(
        queryContext,
        new SingleFieldHolder<TestFields, 'customIdField', 'testIndexedField'>('testIndexedField'),
        [new SingleFieldValueHolder(objectInQuestion['testIndexedField'])],
      );
      entityDataManager.invalidateKeyValuePairsForTransaction(queryContext, [
        [
          new SingleFieldHolder<TestFields, 'customIdField', 'testIndexedField'>(
            'testIndexedField',
          ),
          new SingleFieldValueHolder(objectInQuestion['testIndexedField']),
        ],
      ]);
      await entityDataManager.loadManyEqualingAsync(
        queryContext,
        new SingleFieldHolder<TestFields, 'customIdField', 'testIndexedField'>('testIndexedField'),
        [new SingleFieldValueHolder(objectInQuestion['testIndexedField'])],
      );

      expect(dbSpy).toHaveBeenCalledTimes(2);
      expect(cacheSpy).toHaveBeenCalledTimes(0);

      dbSpy.mockClear();
      cacheSpy.mockClear();

      await queryContext.runInNestedTransactionAsync(async (innerQueryContext) => {
        await entityDataManager.loadManyEqualingAsync(
          innerQueryContext,
          new SingleFieldHolder<TestFields, 'customIdField', 'testIndexedField'>(
            'testIndexedField',
          ),
          [new SingleFieldValueHolder(objectInQuestion['testIndexedField'])],
        );
        entityDataManager.invalidateKeyValuePairsForTransaction(innerQueryContext, [
          [
            new SingleFieldHolder<TestFields, 'customIdField', 'testIndexedField'>(
              'testIndexedField',
            ),
            new SingleFieldValueHolder(objectInQuestion['testIndexedField']),
          ],
        ]);
        await entityDataManager.loadManyEqualingAsync(
          innerQueryContext,
          new SingleFieldHolder<TestFields, 'customIdField', 'testIndexedField'>(
            'testIndexedField',
          ),
          [new SingleFieldValueHolder(objectInQuestion['testIndexedField'])],
        );

        expect(dbSpy).toHaveBeenCalledTimes(2);
        expect(cacheSpy).toHaveBeenCalledTimes(0);

        dbSpy.mockClear();
        cacheSpy.mockClear();
      });
    });
  });

  it('does not use transactional dataloader when disabled', async () => {
    const objects = getObjects();
    const dataStore = StubDatabaseAdapter.convertFieldObjectsToDataStore(
      testEntityConfiguration,
      objects,
    );
    const databaseAdapter = new StubDatabaseAdapter<TestFields, 'customIdField'>(
      testEntityConfiguration,
      dataStore,
    );
    const cacheAdapterProvider = new InMemoryFullCacheStubCacheAdapterProvider();
    const cacheAdapter = cacheAdapterProvider.getCacheAdapter(testEntityConfiguration);
    const entityCache = new ReadThroughEntityCache(testEntityConfiguration, cacheAdapter);
    const entityDataManager = new EntityDataManager(
      databaseAdapter,
      entityCache,
      new StubQueryContextProvider(),
      new NoOpEntityMetricsAdapter(),
      TestEntity.name,
    );

    await new StubQueryContextProvider().runInTransactionAsync(
      async (queryContext) => {
        const objectInQuestion = objects.get(testEntityConfiguration.tableName)![1]!;

        const dbSpy = jest.spyOn(databaseAdapter, 'fetchManyWhereAsync');
        const cacheSpy = jest.spyOn(entityCache, 'readManyThroughAsync');

        await entityDataManager.loadManyEqualingAsync(
          queryContext,
          new SingleFieldHolder<TestFields, 'customIdField', 'testIndexedField'>(
            'testIndexedField',
          ),
          [new SingleFieldValueHolder(objectInQuestion['testIndexedField'])],
        );
        entityDataManager.invalidateKeyValuePairsForTransaction(queryContext, [
          [
            new SingleFieldHolder<TestFields, 'customIdField', 'testIndexedField'>(
              'testIndexedField',
            ),
            new SingleFieldValueHolder(objectInQuestion['testIndexedField']),
          ],
        ]);
        await entityDataManager.loadManyEqualingAsync(
          queryContext,
          new SingleFieldHolder<TestFields, 'customIdField', 'testIndexedField'>(
            'testIndexedField',
          ),
          [new SingleFieldValueHolder(objectInQuestion['testIndexedField'])],
        );

        expect(dbSpy).toHaveBeenCalledTimes(2);
        expect(cacheSpy).toHaveBeenCalledTimes(0);

        dbSpy.mockClear();
        cacheSpy.mockClear();
      },
      { transactionalDataLoaderMode: TransactionalDataLoaderMode.DISABLED },
    );

    expect(entityDataManager['transactionalDataLoaders'].size).toBe(0);
  });

  it('does not load from cache when in transaction', async () => {
    const objects = getObjects();
    const dataStore = StubDatabaseAdapter.convertFieldObjectsToDataStore(
      testEntityConfiguration,
      objects,
    );
    const databaseAdapter = new StubDatabaseAdapter<TestFields, 'customIdField'>(
      testEntityConfiguration,
      dataStore,
    );
    const cacheAdapterProvider = new InMemoryFullCacheStubCacheAdapterProvider();
    const cacheAdapter = cacheAdapterProvider.getCacheAdapter(testEntityConfiguration);
    const entityCache = new ReadThroughEntityCache(testEntityConfiguration, cacheAdapter);
    const entityDataManager = new EntityDataManager(
      databaseAdapter,
      entityCache,
      new StubQueryContextProvider(),
      new NoOpEntityMetricsAdapter(),
      TestEntity.name,
    );

    const dbSpy = jest.spyOn(databaseAdapter, 'fetchManyWhereAsync');
    const cacheSpy = jest.spyOn(entityCache, 'readManyThroughAsync');

    const entityDatas = await new StubQueryContextProvider().runInTransactionAsync(
      async (queryContext) => {
        return await entityDataManager.loadManyEqualingAsync(
          queryContext,
          new SingleFieldHolder<TestFields, 'customIdField', 'customIdField'>('customIdField'),
          [new SingleFieldValueHolder('1')],
        );
      },
      {},
    );

    expect(entityDatas.get(new SingleFieldValueHolder('1'))).toHaveLength(1);

    expect(dbSpy).toHaveBeenCalled();
    expect(cacheSpy).not.toHaveBeenCalled();

    dbSpy.mockReset();
    cacheSpy.mockReset();
  });

  it('handles DB errors as expected', async () => {
    const databaseAdapterMock = mock<EntityDatabaseAdapter<TestFields, 'customIdField'>>();
    when(databaseAdapterMock.fetchManyWhereAsync(anything(), anything(), anything())).thenReject(
      new Error('DB query failed'),
    );

    const databaseAdapter = instance(databaseAdapterMock);
    const cacheAdapterProvider = new NoCacheStubCacheAdapterProvider();
    const cacheAdapter = cacheAdapterProvider.getCacheAdapter(testEntityConfiguration);
    const entityCache = new ReadThroughEntityCache(testEntityConfiguration, cacheAdapter);
    const entityDataManager = new EntityDataManager(
      databaseAdapter,
      entityCache,
      new StubQueryContextProvider(),
      new NoOpEntityMetricsAdapter(),
      TestEntity.name,
    );
    const queryContext = new StubQueryContextProvider().getQueryContext();

    await expect(
      entityDataManager.loadManyEqualingAsync(
        queryContext,
        new SingleFieldHolder<TestFields, 'customIdField', 'customIdField'>('customIdField'),
        [new SingleFieldValueHolder('2')],
      ),
    ).rejects.toThrow();
  });

  describe('metrics', () => {
    it('records metrics appropriately outside of transactions', async () => {
      const metricsAdapterMock = mock<IEntityMetricsAdapter>();
      const metricsAdapter = instance(metricsAdapterMock);

      const objects = getObjects();
      const dataStore = StubDatabaseAdapter.convertFieldObjectsToDataStore(
        testEntityConfiguration,
        objects,
      );
      const databaseAdapter = new StubDatabaseAdapter<TestFields, 'customIdField'>(
        testEntityConfiguration,
        dataStore,
      );
      const cacheAdapterProvider = new InMemoryFullCacheStubCacheAdapterProvider();
      const cacheAdapter = cacheAdapterProvider.getCacheAdapter(testEntityConfiguration);
      const entityCache = new ReadThroughEntityCache(testEntityConfiguration, cacheAdapter);
      const entityDataManager = new EntityDataManager(
        databaseAdapter,
        entityCache,
        new StubQueryContextProvider(),
        metricsAdapter,
        TestEntity.name,
      );
      const queryContext = new StubQueryContextProvider().getQueryContext();

      // make call to loadManyByFieldEqualingAsync to populate cache and dataloader, ensure metrics are recorded
      // for dataloader, cache, and database
      await entityDataManager.loadManyEqualingAsync(
        queryContext,
        new SingleFieldHolder<TestFields, 'customIdField', 'testIndexedField'>('testIndexedField'),
        [new SingleFieldValueHolder('unique1')],
      );
      verify(
        metricsAdapterMock.logDataManagerLoadEvent(
          deepEqual({
            type: EntityMetricsLoadType.LOAD_MANY,
            isInTransaction: false,
            entityClassName: TestEntity.name,
            duration: anyNumber(),
            count: 1,
          }),
        ),
      ).once();
      verify(metricsAdapterMock.incrementDataManagerLoadCount(anything())).thrice();
      verify(
        metricsAdapterMock.incrementDataManagerLoadCount(
          deepEqual({
            type: IncrementLoadCountEventType.DATALOADER,
            isInTransaction: false,
            fieldValueCount: 1,
            entityClassName: TestEntity.name,
            loadType: EntityLoadMethodType.SINGLE,
          }),
        ),
      ).once();
      verify(
        metricsAdapterMock.incrementDataManagerLoadCount(
          deepEqual({
            type: IncrementLoadCountEventType.CACHE,
            isInTransaction: false,
            fieldValueCount: 1,
            entityClassName: TestEntity.name,
            loadType: EntityLoadMethodType.SINGLE,
          }),
        ),
      ).once();
      verify(
        metricsAdapterMock.incrementDataManagerLoadCount(
          deepEqual({
            type: IncrementLoadCountEventType.DATABASE,
            isInTransaction: false,
            fieldValueCount: 1,
            entityClassName: TestEntity.name,
            loadType: EntityLoadMethodType.SINGLE,
          }),
        ),
      ).once();

      resetCalls(metricsAdapterMock);

      // make second call to loadManyByFieldEqualingAsync, ensure metrics are only recorded for dataloader since
      // entity is in local dataloader
      await entityDataManager.loadManyEqualingAsync(
        queryContext,
        new SingleFieldHolder<TestFields, 'customIdField', 'testIndexedField'>('testIndexedField'),
        [new SingleFieldValueHolder('unique1')],
      );
      verify(metricsAdapterMock.incrementDataManagerLoadCount(anything())).once();
      verify(
        metricsAdapterMock.incrementDataManagerLoadCount(
          deepEqual({
            type: IncrementLoadCountEventType.DATALOADER,
            isInTransaction: false,
            fieldValueCount: 1,
            entityClassName: TestEntity.name,
            loadType: EntityLoadMethodType.SINGLE,
          }),
        ),
      ).once();

      resetCalls(metricsAdapterMock);

      // make third call in new data manager but query two keys, ensure only one of the keys is fetched
      // from the database and the other is fetched from the cache
      const entityCache2 = new ReadThroughEntityCache(testEntityConfiguration, cacheAdapter);
      const entityDataManager2 = new EntityDataManager(
        databaseAdapter,
        entityCache2,
        new StubQueryContextProvider(),
        metricsAdapter,
        TestEntity.name,
      );
      await entityDataManager2.loadManyEqualingAsync(
        queryContext,
        new SingleFieldHolder<TestFields, 'customIdField', 'testIndexedField'>('testIndexedField'),
        [new SingleFieldValueHolder('unique1'), new SingleFieldValueHolder('unique2')],
      );
      verify(metricsAdapterMock.incrementDataManagerLoadCount(anything())).thrice();
      verify(
        metricsAdapterMock.incrementDataManagerLoadCount(
          deepEqual({
            type: IncrementLoadCountEventType.DATALOADER,
            isInTransaction: false,
            fieldValueCount: 2,
            entityClassName: TestEntity.name,
            loadType: EntityLoadMethodType.SINGLE,
          }),
        ),
      ).once();
      verify(
        metricsAdapterMock.incrementDataManagerLoadCount(
          deepEqual({
            type: IncrementLoadCountEventType.CACHE,
            isInTransaction: false,
            fieldValueCount: 2,
            entityClassName: TestEntity.name,
            loadType: EntityLoadMethodType.SINGLE,
          }),
        ),
      ).once();
      verify(
        metricsAdapterMock.incrementDataManagerLoadCount(
          deepEqual({
            type: IncrementLoadCountEventType.DATABASE,
            isInTransaction: false,
            fieldValueCount: 1,
            entityClassName: TestEntity.name,
            loadType: EntityLoadMethodType.SINGLE,
          }),
        ),
      ).once();
    });

    it('records metrics appropriately inside of transactions', async () => {
      const metricsAdapterMock = mock<IEntityMetricsAdapter>();
      const metricsAdapter = instance(metricsAdapterMock);

      const objects = getObjects();
      const dataStore = StubDatabaseAdapter.convertFieldObjectsToDataStore(
        testEntityConfiguration,
        objects,
      );
      const databaseAdapter = new StubDatabaseAdapter<TestFields, 'customIdField'>(
        testEntityConfiguration,
        dataStore,
      );
      const cacheAdapterProvider = new InMemoryFullCacheStubCacheAdapterProvider();
      const cacheAdapter = cacheAdapterProvider.getCacheAdapter(testEntityConfiguration);
      const entityCache = new ReadThroughEntityCache(testEntityConfiguration, cacheAdapter);
      const entityDataManager = new EntityDataManager(
        databaseAdapter,
        entityCache,
        new StubQueryContextProvider(),
        metricsAdapter,
        TestEntity.name,
      );

      await new StubQueryContextProvider().runInTransactionAsync(async (queryContext) => {
        // make call to loadManyByFieldEqualingAsync to populate cache and dataloader, ensure metrics are recorded
        // for dataloader, cache, and database
        await entityDataManager.loadManyEqualingAsync(
          queryContext,
          new SingleFieldHolder<TestFields, 'customIdField', 'testIndexedField'>(
            'testIndexedField',
          ),
          [new SingleFieldValueHolder('unique1')],
        );
        verify(
          metricsAdapterMock.logDataManagerLoadEvent(
            deepEqual({
              type: EntityMetricsLoadType.LOAD_MANY,
              isInTransaction: true,
              entityClassName: TestEntity.name,
              duration: anyNumber(),
              count: 1,
            }),
          ),
        ).once();
        verify(metricsAdapterMock.incrementDataManagerLoadCount(anything())).twice();
        verify(
          metricsAdapterMock.incrementDataManagerLoadCount(
            deepEqual({
              type: IncrementLoadCountEventType.DATALOADER,
              isInTransaction: true,
              fieldValueCount: 1,
              entityClassName: TestEntity.name,
              loadType: EntityLoadMethodType.SINGLE,
            }),
          ),
        ).once();
        verify(
          metricsAdapterMock.incrementDataManagerLoadCount(
            deepEqual({
              type: IncrementLoadCountEventType.DATABASE,
              isInTransaction: true,
              fieldValueCount: 1,
              entityClassName: TestEntity.name,
              loadType: EntityLoadMethodType.SINGLE,
            }),
          ),
        ).once();

        resetCalls(metricsAdapterMock);

        // make second call to loadManyByFieldEqualingAsync, ensure metrics are only recorded for dataloader since
        // entity is in local dataloader
        await entityDataManager.loadManyEqualingAsync(
          queryContext,
          new SingleFieldHolder<TestFields, 'customIdField', 'testIndexedField'>(
            'testIndexedField',
          ),
          [new SingleFieldValueHolder('unique1')],
        );
        verify(metricsAdapterMock.incrementDataManagerLoadCount(anything())).once();
        verify(
          metricsAdapterMock.incrementDataManagerLoadCount(
            deepEqual({
              type: IncrementLoadCountEventType.DATALOADER,
              isInTransaction: true,
              fieldValueCount: 1,
              entityClassName: TestEntity.name,
              loadType: EntityLoadMethodType.SINGLE,
            }),
          ),
        ).once();
      });
    });
  });

  it('throws when a single value load-by value is null or undefined', async () => {
    const objects = getObjects();
    const dataStore = StubDatabaseAdapter.convertFieldObjectsToDataStore(
      testEntityConfiguration,
      objects,
    );
    const databaseAdapter = new StubDatabaseAdapter<TestFields, 'customIdField'>(
      testEntityConfiguration,
      dataStore,
    );
    const cacheAdapterProvider = new NoCacheStubCacheAdapterProvider();
    const cacheAdapter = cacheAdapterProvider.getCacheAdapter(testEntityConfiguration);
    const entityCache = new ReadThroughEntityCache(testEntityConfiguration, cacheAdapter);
    const entityDataManager = new EntityDataManager(
      databaseAdapter,
      entityCache,
      new StubQueryContextProvider(),
      new NoOpEntityMetricsAdapter(),
      TestEntity.name,
    );
    const queryContext = new StubQueryContextProvider().getQueryContext();

    await expect(
      entityDataManager.loadManyEqualingAsync(
        queryContext,
        new SingleFieldHolder<TestFields, 'customIdField', 'nullableField'>('nullableField'),
        [new SingleFieldValueHolder(null)],
      ),
    ).rejects.toThrow('Invalid load: TestEntity (nullableField = null)');

    await expect(
      entityDataManager.loadManyEqualingAsync(
        queryContext,
        new SingleFieldHolder<TestFields, 'customIdField', 'nullableField'>('nullableField'),
        [new SingleFieldValueHolder(undefined)],
      ),
    ).rejects.toThrow('Invalid load: TestEntity (nullableField = undefined)');
  });

  it('throws when a composite value load-by value is null or undefined', async () => {
    const objects = getObjects();
    const dataStore = StubDatabaseAdapter.convertFieldObjectsToDataStore(
      testEntityConfiguration,
      objects,
    );
    const databaseAdapter = new StubDatabaseAdapter<TestFields, 'customIdField'>(
      testEntityConfiguration,
      dataStore,
    );
    const cacheAdapterProvider = new NoCacheStubCacheAdapterProvider();
    const cacheAdapter = cacheAdapterProvider.getCacheAdapter(testEntityConfiguration);
    const entityCache = new ReadThroughEntityCache(testEntityConfiguration, cacheAdapter);
    const entityDataManager = new EntityDataManager(
      databaseAdapter,
      entityCache,
      new StubQueryContextProvider(),
      new NoOpEntityMetricsAdapter(),
      TestEntity.name,
    );
    const queryContext = new StubQueryContextProvider().getQueryContext();

    await expect(
      entityDataManager.loadManyEqualingAsync(
        queryContext,
        new CompositeFieldHolder<TestFields, 'customIdField'>([
          'nullableField',
          'testIndexedField',
        ]),
        [
          new CompositeFieldValueHolder({
            nullableField: null,
            testIndexedField: 'unique1',
          }),
        ],
      ),
    ).rejects.toThrow(
      'Invalid load: TestEntity (nullableField,testIndexedField = CompositeFieldValue(nullableField=null,testIndexedField=unique1))',
    );

    await expect(
      entityDataManager.loadManyEqualingAsync(
        queryContext,
        new CompositeFieldHolder<TestFields, 'customIdField'>([
          'nullableField',
          'testIndexedField',
        ]),
        [
          new CompositeFieldValueHolder({
            nullableField: undefined,
            testIndexedField: 'unique1',
          }),
        ],
      ),
    ).rejects.toThrow(
      'Invalid load: TestEntity (nullableField,testIndexedField = CompositeFieldValue(nullableField=undefined,testIndexedField=unique1))',
    );
  });
});
