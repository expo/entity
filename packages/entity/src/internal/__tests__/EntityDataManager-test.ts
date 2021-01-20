import {
  mock,
  instance,
  when,
  anything,
  verify,
  anyNumber,
  objectContaining,
  spy,
  anyString,
  resetCalls,
  deepEqual,
} from 'ts-mockito';

import EntityDatabaseAdapter from '../../EntityDatabaseAdapter';
import IEntityMetricsAdapter, { EntityMetricsLoadType } from '../../metrics/IEntityMetricsAdapter';
import NoOpEntityMetricsAdapter from '../../metrics/NoOpEntityMetricsAdapter';
import TestEntity, { testEntityConfiguration, TestFields } from '../../testfixtures/TestEntity';
import {
  NoCacheStubCacheAdapterProvider,
  InMemoryFullCacheStubCacheAdapterProvider,
} from '../../utils/testing/StubCacheAdapter';
import StubDatabaseAdapter from '../../utils/testing/StubDatabaseAdapter';
import StubQueryContextProvider from '../../utils/testing/StubQueryContextProvider';
import EntityDataManager from '../EntityDataManager';
import ReadThroughEntityCache from '../ReadThroughEntityCache';

const getObjects = (): Map<string, TestFields[]> =>
  new Map([
    [
      testEntityConfiguration.tableName,
      [
        {
          customIdField: '1',
          testIndexedField: 'unique1',
          stringField: 'hello',
          numberField: 1,
          dateField: new Date(),
          nullableField: null,
        },
        {
          customIdField: '2',
          testIndexedField: 'unique2',
          stringField: 'hello',
          numberField: 1,
          dateField: new Date(),
          nullableField: null,
        },
        {
          customIdField: '3',
          testIndexedField: 'unique3',
          stringField: 'world',
          numberField: 1,
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
      objects
    );
    const databaseAdapter = new StubDatabaseAdapter<TestFields>(testEntityConfiguration, dataStore);
    const cacheAdapterProvider = new NoCacheStubCacheAdapterProvider();
    const cacheAdapter = cacheAdapterProvider.getCacheAdapter(testEntityConfiguration);
    const entityCache = new ReadThroughEntityCache(testEntityConfiguration, cacheAdapter);
    const entityDataManager = new EntityDataManager(
      databaseAdapter,
      entityCache,
      StubQueryContextProvider,
      new NoOpEntityMetricsAdapter(),
      TestEntity.name
    );
    const queryContext = StubQueryContextProvider.getQueryContext();

    const dbSpy = jest.spyOn(databaseAdapter, 'fetchManyWhereAsync');
    const cacheSpy = jest.spyOn(entityCache, 'readManyThroughAsync');

    const entityDatas = await entityDataManager.loadManyByFieldEqualingAsync(
      queryContext,
      'customIdField',
      ['2']
    );
    expect(entityDatas.get('2')).toHaveLength(1);

    expect(dbSpy).toHaveBeenCalled();
    expect(cacheSpy).toHaveBeenCalled();
    dbSpy.mockClear();
    cacheSpy.mockClear();

    const entityDatas2 = await entityDataManager.loadManyByFieldEqualingAsync(
      queryContext,
      'testIndexedField',
      ['unique2', 'unique3']
    );
    expect(entityDatas2.get('unique2')).toHaveLength(1);
    expect(entityDatas2.get('unique3')).toHaveLength(1);

    expect(dbSpy).toHaveBeenCalled();
    expect(cacheSpy).toHaveBeenCalled();
    dbSpy.mockClear();
    cacheSpy.mockClear();
  });

  it('loads from a caching adaptor', async () => {
    const objects = getObjects();
    const dataStore = StubDatabaseAdapter.convertFieldObjectsToDataStore(
      testEntityConfiguration,
      objects
    );
    const databaseAdapter = new StubDatabaseAdapter<TestFields>(testEntityConfiguration, dataStore);
    const cacheAdapterProvider = new InMemoryFullCacheStubCacheAdapterProvider();
    const cacheAdapter = cacheAdapterProvider.getCacheAdapter(testEntityConfiguration);
    const entityCache = new ReadThroughEntityCache(testEntityConfiguration, cacheAdapter);
    const entityDataManager = new EntityDataManager(
      databaseAdapter,
      entityCache,
      StubQueryContextProvider,
      new NoOpEntityMetricsAdapter(),
      TestEntity.name
    );
    const queryContext = StubQueryContextProvider.getQueryContext();

    const dbSpy = jest.spyOn(databaseAdapter, 'fetchManyWhereAsync');
    const cacheSpy = jest.spyOn(entityCache, 'readManyThroughAsync');

    const entityDatas = await entityDataManager.loadManyByFieldEqualingAsync(
      queryContext,
      'customIdField',
      ['1']
    );
    expect(entityDatas.get('1')).toHaveLength(1);

    expect(dbSpy).toHaveBeenCalled();
    expect(cacheSpy).toHaveBeenCalled();
    dbSpy.mockClear();
    cacheSpy.mockClear();

    const entityDatas2 = await entityDataManager.loadManyByFieldEqualingAsync(
      queryContext,
      'testIndexedField',
      ['unique2', 'unique3']
    );
    expect(entityDatas2.get('unique2')).toHaveLength(1);
    expect(entityDatas2.get('unique3')).toHaveLength(1);

    expect(dbSpy).toHaveBeenCalled();
    expect(cacheSpy).toHaveBeenCalled();
    dbSpy.mockClear();
    cacheSpy.mockClear();
  });

  it('loads from a caching adapter with a cache hit', async () => {
    const objects = getObjects();
    const dataStore = StubDatabaseAdapter.convertFieldObjectsToDataStore(
      testEntityConfiguration,
      objects
    );
    const databaseAdapter = new StubDatabaseAdapter<TestFields>(testEntityConfiguration, dataStore);
    const cacheAdapterProvider = new InMemoryFullCacheStubCacheAdapterProvider();
    const cacheAdapter = cacheAdapterProvider.getCacheAdapter(testEntityConfiguration);
    const entityCache = new ReadThroughEntityCache(testEntityConfiguration, cacheAdapter);
    const entityDataManager = new EntityDataManager(
      databaseAdapter,
      entityCache,
      StubQueryContextProvider,
      new NoOpEntityMetricsAdapter(),
      TestEntity.name
    );
    const queryContext = StubQueryContextProvider.getQueryContext();
    // use second data manager to ensure that cache is hit instead of data loader
    const entityDataManager2 = new EntityDataManager(
      databaseAdapter,
      entityCache,
      StubQueryContextProvider,
      new NoOpEntityMetricsAdapter(),
      TestEntity.name
    );

    const dbSpy = jest.spyOn(databaseAdapter, 'fetchManyWhereAsync');
    const cacheSpy = jest.spyOn(entityCache, 'readManyThroughAsync');

    await entityDataManager.loadManyByFieldEqualingAsync(queryContext, 'testIndexedField', [
      'unique2',
    ]);
    await entityDataManager2.loadManyByFieldEqualingAsync(queryContext, 'testIndexedField', [
      'unique2',
    ]);

    expect(dbSpy).toHaveBeenCalledTimes(1);
    expect(cacheSpy).toHaveBeenCalledTimes(2);

    dbSpy.mockReset();
    cacheSpy.mockReset();
  });

  it('loads from data loader for same query', async () => {
    const objects = getObjects();
    const dataStore = StubDatabaseAdapter.convertFieldObjectsToDataStore(
      testEntityConfiguration,
      objects
    );
    const databaseAdapter = new StubDatabaseAdapter<TestFields>(testEntityConfiguration, dataStore);
    const cacheAdapterProvider = new InMemoryFullCacheStubCacheAdapterProvider();
    const cacheAdapter = cacheAdapterProvider.getCacheAdapter(testEntityConfiguration);
    const entityCache = new ReadThroughEntityCache(testEntityConfiguration, cacheAdapter);
    const entityDataManager = new EntityDataManager(
      databaseAdapter,
      entityCache,
      StubQueryContextProvider,
      new NoOpEntityMetricsAdapter(),
      TestEntity.name
    );
    const queryContext = StubQueryContextProvider.getQueryContext();

    const dbSpy = jest.spyOn(databaseAdapter, 'fetchManyWhereAsync');
    const cacheSpy = jest.spyOn(entityCache, 'readManyThroughAsync');

    await entityDataManager.loadManyByFieldEqualingAsync(queryContext, 'testIndexedField', [
      'unique2',
    ]);
    await entityDataManager.loadManyByFieldEqualingAsync(queryContext, 'testIndexedField', [
      'unique2',
    ]);

    expect(dbSpy).toHaveBeenCalledTimes(1);
    expect(cacheSpy).toHaveBeenCalledTimes(1);

    dbSpy.mockReset();
    cacheSpy.mockReset();
  });

  it('loads and in-memory caches (dataloader) non-unique, non-cacheable loads', async () => {
    const objects = getObjects();
    const dataStore = StubDatabaseAdapter.convertFieldObjectsToDataStore(
      testEntityConfiguration,
      objects
    );
    const databaseAdapter = new StubDatabaseAdapter<TestFields>(testEntityConfiguration, dataStore);
    const cacheAdapterProvider = new InMemoryFullCacheStubCacheAdapterProvider();
    const cacheAdapter = cacheAdapterProvider.getCacheAdapter(testEntityConfiguration);
    const entityCache = new ReadThroughEntityCache(testEntityConfiguration, cacheAdapter);
    const entityDataManager = new EntityDataManager(
      databaseAdapter,
      entityCache,
      StubQueryContextProvider,
      new NoOpEntityMetricsAdapter(),
      TestEntity.name
    );
    const queryContext = StubQueryContextProvider.getQueryContext();

    const dbSpy = jest.spyOn(databaseAdapter, 'fetchManyWhereAsync');
    const cacheSpy = jest.spyOn(entityCache, 'readManyThroughAsync');

    const entityData = await entityDataManager.loadManyByFieldEqualingAsync(
      queryContext,
      'stringField',
      ['hello', 'world']
    );
    const entityData2 = await entityDataManager.loadManyByFieldEqualingAsync(
      queryContext,
      'stringField',
      ['hello', 'world']
    );

    expect(dbSpy).toHaveBeenCalledTimes(1);
    expect(cacheSpy).toHaveBeenCalledTimes(1);

    expect(entityData).toMatchObject(entityData2);
    expect(entityData.get('hello')).toHaveLength(2);
    expect(entityData.get('world')).toHaveLength(1);

    dbSpy.mockReset();
    cacheSpy.mockReset();
  });

  it('invalidates objects', async () => {
    const objects = getObjects();
    const dataStore = StubDatabaseAdapter.convertFieldObjectsToDataStore(
      testEntityConfiguration,
      objects
    );
    const databaseAdapter = new StubDatabaseAdapter<TestFields>(testEntityConfiguration, dataStore);
    const cacheAdapterProvider = new InMemoryFullCacheStubCacheAdapterProvider();
    const cacheAdapter = cacheAdapterProvider.getCacheAdapter(testEntityConfiguration);
    const entityCache = new ReadThroughEntityCache(testEntityConfiguration, cacheAdapter);
    const entityDataManager = new EntityDataManager(
      databaseAdapter,
      entityCache,
      StubQueryContextProvider,
      new NoOpEntityMetricsAdapter(),
      TestEntity.name
    );
    const queryContext = StubQueryContextProvider.getQueryContext();

    const objectInQuestion = objects.get(testEntityConfiguration.tableName)![1];

    const dbSpy = jest.spyOn(databaseAdapter, 'fetchManyWhereAsync');
    const cacheSpy = jest.spyOn(entityCache, 'readManyThroughAsync');

    await entityDataManager.loadManyByFieldEqualingAsync(queryContext, 'testIndexedField', [
      objectInQuestion['testIndexedField']!,
    ]);
    await entityDataManager.invalidateObjectFieldsAsync(objectInQuestion);
    await entityDataManager.loadManyByFieldEqualingAsync(queryContext, 'testIndexedField', [
      objectInQuestion['testIndexedField']!,
    ]);

    expect(dbSpy).toHaveBeenCalledTimes(2);
    expect(cacheSpy).toHaveBeenCalledTimes(2);

    dbSpy.mockReset();
    cacheSpy.mockReset();
  });

  it('invalidates all fields for an object', async () => {
    const objects = getObjects();
    const dataStore = StubDatabaseAdapter.convertFieldObjectsToDataStore(
      testEntityConfiguration,
      objects
    );
    const databaseAdapter = new StubDatabaseAdapter<TestFields>(testEntityConfiguration, dataStore);
    const cacheAdapterProvider = new InMemoryFullCacheStubCacheAdapterProvider();
    const cacheAdapter = cacheAdapterProvider.getCacheAdapter(testEntityConfiguration);
    const entityCache = new ReadThroughEntityCache(testEntityConfiguration, cacheAdapter);
    const entityDataManager = new EntityDataManager(
      databaseAdapter,
      entityCache,
      StubQueryContextProvider,
      new NoOpEntityMetricsAdapter(),
      TestEntity.name
    );
    const queryContext = StubQueryContextProvider.getQueryContext();

    const objectInQuestion = objects.get(testEntityConfiguration.tableName)![1];

    const dbSpy = jest.spyOn(databaseAdapter, 'fetchManyWhereAsync');
    const cacheSpy = jest.spyOn(entityCache, 'readManyThroughAsync');

    await entityDataManager.loadManyByFieldEqualingAsync(queryContext, 'testIndexedField', [
      objectInQuestion['testIndexedField']!,
    ]);
    await entityDataManager.invalidateObjectFieldsAsync(objectInQuestion);
    await entityDataManager.loadManyByFieldEqualingAsync(queryContext, 'customIdField', [
      objectInQuestion['customIdField']!,
    ]);

    expect(dbSpy).toHaveBeenCalledTimes(2);
    expect(cacheSpy).toHaveBeenCalledTimes(2);

    dbSpy.mockReset();
    cacheSpy.mockReset();
  });

  it('loads only from DB when in transaction', async () => {
    const objects = getObjects();
    const dataStore = StubDatabaseAdapter.convertFieldObjectsToDataStore(
      testEntityConfiguration,
      objects
    );
    const databaseAdapter = new StubDatabaseAdapter<TestFields>(testEntityConfiguration, dataStore);
    const cacheAdapterProvider = new InMemoryFullCacheStubCacheAdapterProvider();
    const cacheAdapter = cacheAdapterProvider.getCacheAdapter(testEntityConfiguration);
    const entityCache = new ReadThroughEntityCache(testEntityConfiguration, cacheAdapter);
    const entityDataManager = new EntityDataManager(
      databaseAdapter,
      entityCache,
      StubQueryContextProvider,
      new NoOpEntityMetricsAdapter(),
      TestEntity.name
    );

    const dbSpy = jest.spyOn(databaseAdapter, 'fetchManyWhereAsync');
    const cacheSpy = jest.spyOn(entityCache, 'readManyThroughAsync');

    const entityDatas = await StubQueryContextProvider.runInTransactionAsync(
      async (queryContext) => {
        return await entityDataManager.loadManyByFieldEqualingAsync(queryContext, 'customIdField', [
          '1',
        ]);
      }
    );

    expect(entityDatas.get('1')).toHaveLength(1);

    expect(dbSpy).toHaveBeenCalled();
    expect(cacheSpy).not.toHaveBeenCalled();

    dbSpy.mockReset();
    cacheSpy.mockReset();
  });

  it('loads by field equality conjunction and does not cache', async () => {
    const objects = getObjects();
    const dataStore = StubDatabaseAdapter.convertFieldObjectsToDataStore(
      testEntityConfiguration,
      objects
    );
    const databaseAdapter = new StubDatabaseAdapter<TestFields>(testEntityConfiguration, dataStore);
    const cacheAdapterProvider = new InMemoryFullCacheStubCacheAdapterProvider();
    const cacheAdapter = cacheAdapterProvider.getCacheAdapter(testEntityConfiguration);
    const entityCache = new ReadThroughEntityCache(testEntityConfiguration, cacheAdapter);
    const entityDataManager = new EntityDataManager(
      databaseAdapter,
      entityCache,
      StubQueryContextProvider,
      new NoOpEntityMetricsAdapter(),
      TestEntity.name
    );
    const queryContext = StubQueryContextProvider.getQueryContext();

    const dbSpy = jest.spyOn(databaseAdapter, 'fetchManyByFieldEqualityConjunctionAsync');
    const cacheSpy = jest.spyOn(entityCache, 'readManyThroughAsync');

    const entityDatas = await entityDataManager.loadManyByFieldEqualityConjunctionAsync(
      queryContext,
      [
        {
          fieldName: 'stringField',
          fieldValue: 'hello',
        },
        {
          fieldName: 'numberField',
          fieldValue: 1,
        },
      ],
      {}
    );

    expect(entityDatas).toHaveLength(2);

    expect(dbSpy).toHaveBeenCalled();
    expect(cacheSpy).not.toHaveBeenCalled();

    dbSpy.mockReset();
    cacheSpy.mockReset();
  });

  it('handles DB errors as expected', async () => {
    const databaseAdapterMock = mock<EntityDatabaseAdapter<TestFields>>();
    when(databaseAdapterMock.fetchManyWhereAsync(anything(), anything(), anything())).thenReject(
      new Error('DB query failed')
    );

    const databaseAdapter = instance(databaseAdapterMock);
    const cacheAdapterProvider = new NoCacheStubCacheAdapterProvider();
    const cacheAdapter = cacheAdapterProvider.getCacheAdapter(testEntityConfiguration);
    const entityCache = new ReadThroughEntityCache(testEntityConfiguration, cacheAdapter);
    const entityDataManager = new EntityDataManager(
      databaseAdapter,
      entityCache,
      StubQueryContextProvider,
      new NoOpEntityMetricsAdapter(),
      TestEntity.name
    );
    const queryContext = StubQueryContextProvider.getQueryContext();

    await expect(
      entityDataManager.loadManyByFieldEqualingAsync(queryContext, 'customIdField', ['2'])
    ).rejects.toThrow();
  });

  it('records metrics appropriately', async () => {
    const metricsAdapterMock = mock<IEntityMetricsAdapter>();
    const metricsAdapter = instance(metricsAdapterMock);

    const objects = getObjects();
    const dataStore = StubDatabaseAdapter.convertFieldObjectsToDataStore(
      testEntityConfiguration,
      objects
    );
    const databaseAdapter = new StubDatabaseAdapter<TestFields>(testEntityConfiguration, dataStore);
    const cacheAdapterProvider = new InMemoryFullCacheStubCacheAdapterProvider();
    const cacheAdapter = cacheAdapterProvider.getCacheAdapter(testEntityConfiguration);
    const entityCache = new ReadThroughEntityCache(testEntityConfiguration, cacheAdapter);
    const entityDataManager = new EntityDataManager(
      databaseAdapter,
      entityCache,
      StubQueryContextProvider,
      metricsAdapter,
      TestEntity.name
    );
    const queryContext = StubQueryContextProvider.getQueryContext();

    await entityDataManager.loadManyByFieldEqualingAsync(queryContext, 'customIdField', ['1']);
    verify(
      metricsAdapterMock.logDataManagerLoadEvent(
        objectContaining({
          type: EntityMetricsLoadType.LOAD_MANY,
          entityClassName: TestEntity.name,
          count: 1,
        })
      )
    ).once();

    await entityDataManager.loadManyByFieldEqualityConjunctionAsync(
      queryContext,
      [
        {
          fieldName: 'customIdField',
          fieldValue: '1',
        },
      ],
      {}
    );
    verify(
      metricsAdapterMock.logDataManagerLoadEvent(
        objectContaining({
          type: EntityMetricsLoadType.LOAD_MANY_EQUALITY_CONJUNCTION,
          entityClassName: TestEntity.name,
          count: 1,
        })
      )
    ).once();

    verify(
      metricsAdapterMock.incrementDataManagerDataloaderLoadCount(
        deepEqual({
          fieldValueCount: 1,
          entityClassName: TestEntity.name,
        })
      )
    ).once();
    verify(
      metricsAdapterMock.incrementDataManagerCacheLoadCount(
        deepEqual({
          fieldValueCount: 1,
          entityClassName: TestEntity.name,
        })
      )
    ).once();
    verify(
      metricsAdapterMock.incrementDataManagerDatabaseLoadCount(
        deepEqual({
          fieldValueCount: 1,
          entityClassName: TestEntity.name,
        })
      )
    ).once();

    resetCalls(metricsAdapterMock);

    const databaseAdapterSpy = spy(databaseAdapter);
    when(
      databaseAdapterSpy.fetchManyByRawWhereClauseAsync(
        anything(),
        anyString(),
        anything(),
        anything()
      )
    ).thenResolve([]);
    await entityDataManager.loadManyByRawWhereClauseAsync(queryContext, '', [], {});
    verify(
      metricsAdapterMock.logDataManagerLoadEvent(
        objectContaining({
          type: EntityMetricsLoadType.LOAD_MANY_RAW,
          entityClassName: TestEntity.name,
          count: 0,
        })
      )
    ).once();

    verify(metricsAdapterMock.incrementDataManagerDataloaderLoadCount(anyNumber())).never();
    verify(metricsAdapterMock.incrementDataManagerCacheLoadCount(anyNumber())).never();
    verify(metricsAdapterMock.incrementDataManagerDatabaseLoadCount(anyNumber())).never();
  });

  it('throws when a load-by value is null or undefined', async () => {
    const objects = getObjects();
    const dataStore = StubDatabaseAdapter.convertFieldObjectsToDataStore(
      testEntityConfiguration,
      objects
    );
    const databaseAdapter = new StubDatabaseAdapter<TestFields>(testEntityConfiguration, dataStore);
    const cacheAdapterProvider = new NoCacheStubCacheAdapterProvider();
    const cacheAdapter = cacheAdapterProvider.getCacheAdapter(testEntityConfiguration);
    const entityCache = new ReadThroughEntityCache(testEntityConfiguration, cacheAdapter);
    const entityDataManager = new EntityDataManager(
      databaseAdapter,
      entityCache,
      StubQueryContextProvider,
      new NoOpEntityMetricsAdapter(),
      TestEntity.name
    );
    const queryContext = StubQueryContextProvider.getQueryContext();

    await expect(
      entityDataManager.loadManyByFieldEqualingAsync(queryContext, 'nullableField', [null as any])
    ).rejects.toThrowError('Invalid load: TestEntity (nullableField = null)');

    await expect(
      entityDataManager.loadManyByFieldEqualingAsync(queryContext, 'nullableField', [
        undefined as any,
      ])
    ).rejects.toThrowError('Invalid load: TestEntity (nullableField = undefined)');
  });
});
