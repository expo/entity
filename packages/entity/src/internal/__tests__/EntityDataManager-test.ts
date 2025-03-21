import {
  mock,
  instance,
  when,
  anything,
  verify,
  objectContaining,
  spy,
  anyString,
  resetCalls,
  deepEqual,
} from 'ts-mockito';

import EntityDatabaseAdapter from '../../EntityDatabaseAdapter';
import IEntityMetricsAdapter, {
  EntityMetricsLoadType,
  IncrementLoadCountEventType,
} from '../../metrics/IEntityMetricsAdapter';
import NoOpEntityMetricsAdapter from '../../metrics/NoOpEntityMetricsAdapter';
import TestEntity, { testEntityConfiguration, TestFields } from '../../testfixtures/TestEntity';
import {
  NoCacheStubCacheAdapterProvider,
  InMemoryFullCacheStubCacheAdapterProvider,
} from '../../utils/testing/StubCacheAdapter';
import StubDatabaseAdapter from '../../utils/testing/StubDatabaseAdapter';
import StubQueryContextProvider from '../../utils/testing/StubQueryContextProvider';
import { DataManagerLoadMethodType } from '../EntityAdapterLoadInterfaces';
import EntityDataManager from '../EntityDataManager';
import ReadThroughEntityCache from '../ReadThroughEntityCache';
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
    const databaseAdapter = new StubDatabaseAdapter<TestFields>(testEntityConfiguration, dataStore);
    const cacheAdapterProvider = new NoCacheStubCacheAdapterProvider();
    const cacheAdapter = cacheAdapterProvider.getCacheAdapter(testEntityConfiguration);
    const entityCache = new ReadThroughEntityCache(testEntityConfiguration, cacheAdapter);
    const entityDataManager = new EntityDataManager(
      testEntityConfiguration,
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
      new SingleFieldHolder('customIdField'),
      [new SingleFieldValueHolder('2')],
    );
    expect(entityDatas.get(new SingleFieldValueHolder('2'))).toHaveLength(1);

    expect(dbSpy).toHaveBeenCalled();
    expect(cacheSpy).toHaveBeenCalled();
    dbSpy.mockClear();
    cacheSpy.mockClear();

    const entityDatas2 = await entityDataManager.loadManyEqualingAsync(
      queryContext,
      new SingleFieldHolder('testIndexedField'),
      [new SingleFieldValueHolder('unique2'), new SingleFieldValueHolder('unique3')],
    );
    expect(entityDatas2.get(new SingleFieldValueHolder('unique2'))).toHaveLength(1);
    expect(entityDatas2.get(new SingleFieldValueHolder('unique3'))).toHaveLength(1);

    expect(dbSpy).toHaveBeenCalled();
    expect(cacheSpy).toHaveBeenCalled();
    dbSpy.mockClear();
    cacheSpy.mockClear();
  });

  it('loads from a caching adaptor', async () => {
    const objects = getObjects();
    const dataStore = StubDatabaseAdapter.convertFieldObjectsToDataStore(
      testEntityConfiguration,
      objects,
    );
    const databaseAdapter = new StubDatabaseAdapter<TestFields>(testEntityConfiguration, dataStore);
    const cacheAdapterProvider = new InMemoryFullCacheStubCacheAdapterProvider();
    const cacheAdapter = cacheAdapterProvider.getCacheAdapter(testEntityConfiguration);
    const entityCache = new ReadThroughEntityCache(testEntityConfiguration, cacheAdapter);
    const entityDataManager = new EntityDataManager(
      testEntityConfiguration,
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
      new SingleFieldHolder('customIdField'),
      [new SingleFieldValueHolder('1')],
    );
    expect(entityDatas.get(new SingleFieldValueHolder('1'))).toHaveLength(1);

    expect(dbSpy).toHaveBeenCalled();
    expect(cacheSpy).toHaveBeenCalled();
    dbSpy.mockClear();
    cacheSpy.mockClear();

    const entityDatas2 = await entityDataManager.loadManyEqualingAsync(
      queryContext,
      new SingleFieldHolder('testIndexedField'),
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
    const databaseAdapter = new StubDatabaseAdapter<TestFields>(testEntityConfiguration, dataStore);
    const cacheAdapterProvider = new InMemoryFullCacheStubCacheAdapterProvider();
    const cacheAdapter = cacheAdapterProvider.getCacheAdapter(testEntityConfiguration);
    const entityCache = new ReadThroughEntityCache(testEntityConfiguration, cacheAdapter);
    const entityDataManager = new EntityDataManager(
      testEntityConfiguration,
      databaseAdapter,
      entityCache,
      new StubQueryContextProvider(),
      new NoOpEntityMetricsAdapter(),
      TestEntity.name,
    );
    const queryContext = new StubQueryContextProvider().getQueryContext();
    // use second data manager to ensure that cache is hit instead of data loader
    const entityDataManager2 = new EntityDataManager(
      testEntityConfiguration,
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
      new SingleFieldHolder('testIndexedField'),
      [new SingleFieldValueHolder('unique2')],
    );
    await entityDataManager2.loadManyEqualingAsync(
      queryContext,
      new SingleFieldHolder('testIndexedField'),
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
    const databaseAdapter = new StubDatabaseAdapter<TestFields>(testEntityConfiguration, dataStore);
    const cacheAdapterProvider = new InMemoryFullCacheStubCacheAdapterProvider();
    const cacheAdapter = cacheAdapterProvider.getCacheAdapter(testEntityConfiguration);
    const entityCache = new ReadThroughEntityCache(testEntityConfiguration, cacheAdapter);
    const entityDataManager = new EntityDataManager(
      testEntityConfiguration,
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
      new SingleFieldHolder('testIndexedField'),
      [new SingleFieldValueHolder('unique2')],
    );
    await entityDataManager.loadManyEqualingAsync(
      queryContext,
      new SingleFieldHolder('testIndexedField'),
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
    const databaseAdapter = new StubDatabaseAdapter<TestFields>(testEntityConfiguration, dataStore);
    const cacheAdapterProvider = new InMemoryFullCacheStubCacheAdapterProvider();
    const cacheAdapter = cacheAdapterProvider.getCacheAdapter(testEntityConfiguration);
    const entityCache = new ReadThroughEntityCache(testEntityConfiguration, cacheAdapter);
    const entityDataManager = new EntityDataManager(
      testEntityConfiguration,
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
      new SingleFieldHolder('stringField'),
      [new SingleFieldValueHolder('hello'), new SingleFieldValueHolder('world')],
    );
    const entityData2 = await entityDataManager.loadManyEqualingAsync(
      queryContext,
      new SingleFieldHolder('stringField'),
      [new SingleFieldValueHolder('hello'), new SingleFieldValueHolder('world')],
    );

    expect(dbSpy).toHaveBeenCalledTimes(1);
    expect(cacheSpy).toHaveBeenCalledTimes(1);

    expect(entityData).toMatchObject(entityData2);
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
    const databaseAdapter = new StubDatabaseAdapter<TestFields>(testEntityConfiguration, dataStore);
    const cacheAdapterProvider = new InMemoryFullCacheStubCacheAdapterProvider();
    const cacheAdapter = cacheAdapterProvider.getCacheAdapter(testEntityConfiguration);
    const entityCache = new ReadThroughEntityCache(testEntityConfiguration, cacheAdapter);
    const entityDataManager = new EntityDataManager(
      testEntityConfiguration,
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
      new SingleFieldHolder('testIndexedField'),
      [new SingleFieldValueHolder(objectInQuestion['testIndexedField'])],
    );
    await entityDataManager.invalidateObjectFieldsAsync(objectInQuestion);
    await entityDataManager.loadManyEqualingAsync(
      queryContext,
      new SingleFieldHolder('testIndexedField'),
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
    const databaseAdapter = new StubDatabaseAdapter<TestFields>(testEntityConfiguration, dataStore);
    const cacheAdapterProvider = new InMemoryFullCacheStubCacheAdapterProvider();
    const cacheAdapter = cacheAdapterProvider.getCacheAdapter(testEntityConfiguration);
    const entityCache = new ReadThroughEntityCache(testEntityConfiguration, cacheAdapter);
    const entityDataManager = new EntityDataManager(
      testEntityConfiguration,
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
      new SingleFieldHolder('testIndexedField'),
      [new SingleFieldValueHolder(objectInQuestion['testIndexedField'])],
    );
    await entityDataManager.invalidateObjectFieldsAsync(objectInQuestion);
    await entityDataManager.loadManyEqualingAsync(
      queryContext,
      new SingleFieldHolder('customIdField'),
      [new SingleFieldValueHolder(objectInQuestion['customIdField'])],
    );

    expect(dbSpy).toHaveBeenCalledTimes(2);
    expect(cacheSpy).toHaveBeenCalledTimes(2);

    dbSpy.mockReset();
    cacheSpy.mockReset();
  });

  it('loads only from DB when in transaction', async () => {
    const objects = getObjects();
    const dataStore = StubDatabaseAdapter.convertFieldObjectsToDataStore(
      testEntityConfiguration,
      objects,
    );
    const databaseAdapter = new StubDatabaseAdapter<TestFields>(testEntityConfiguration, dataStore);
    const cacheAdapterProvider = new InMemoryFullCacheStubCacheAdapterProvider();
    const cacheAdapter = cacheAdapterProvider.getCacheAdapter(testEntityConfiguration);
    const entityCache = new ReadThroughEntityCache(testEntityConfiguration, cacheAdapter);
    const entityDataManager = new EntityDataManager(
      testEntityConfiguration,
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
          new SingleFieldHolder('customIdField'),
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

  it('loads by field equality conjunction and does not cache', async () => {
    const objects = getObjects();
    const dataStore = StubDatabaseAdapter.convertFieldObjectsToDataStore(
      testEntityConfiguration,
      objects,
    );
    const databaseAdapter = new StubDatabaseAdapter<TestFields>(testEntityConfiguration, dataStore);
    const cacheAdapterProvider = new InMemoryFullCacheStubCacheAdapterProvider();
    const cacheAdapter = cacheAdapterProvider.getCacheAdapter(testEntityConfiguration);
    const entityCache = new ReadThroughEntityCache(testEntityConfiguration, cacheAdapter);
    const entityDataManager = new EntityDataManager(
      testEntityConfiguration,
      databaseAdapter,
      entityCache,
      new StubQueryContextProvider(),
      new NoOpEntityMetricsAdapter(),
      TestEntity.name,
    );
    const queryContext = new StubQueryContextProvider().getQueryContext();

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
          fieldName: 'intField',
          fieldValue: 1,
        },
      ],
      {},
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
      new Error('DB query failed'),
    );

    const databaseAdapter = instance(databaseAdapterMock);
    const cacheAdapterProvider = new NoCacheStubCacheAdapterProvider();
    const cacheAdapter = cacheAdapterProvider.getCacheAdapter(testEntityConfiguration);
    const entityCache = new ReadThroughEntityCache(testEntityConfiguration, cacheAdapter);
    const entityDataManager = new EntityDataManager(
      testEntityConfiguration,
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
        new SingleFieldHolder('customIdField'),
        [new SingleFieldValueHolder('2')],
      ),
    ).rejects.toThrow();
  });

  it('records metrics appropriately', async () => {
    const metricsAdapterMock = mock<IEntityMetricsAdapter>();
    const metricsAdapter = instance(metricsAdapterMock);

    const objects = getObjects();
    const dataStore = StubDatabaseAdapter.convertFieldObjectsToDataStore(
      testEntityConfiguration,
      objects,
    );
    const databaseAdapter = new StubDatabaseAdapter<TestFields>(testEntityConfiguration, dataStore);
    const cacheAdapterProvider = new InMemoryFullCacheStubCacheAdapterProvider();
    const cacheAdapter = cacheAdapterProvider.getCacheAdapter(testEntityConfiguration);
    const entityCache = new ReadThroughEntityCache(testEntityConfiguration, cacheAdapter);
    const entityDataManager = new EntityDataManager(
      testEntityConfiguration,
      databaseAdapter,
      entityCache,
      new StubQueryContextProvider(),
      metricsAdapter,
      TestEntity.name,
    );
    const queryContext = new StubQueryContextProvider().getQueryContext();

    await entityDataManager.loadManyEqualingAsync(
      queryContext,
      new SingleFieldHolder('customIdField'),
      [new SingleFieldValueHolder('1')],
    );
    verify(
      metricsAdapterMock.logDataManagerLoadEvent(
        objectContaining({
          type: EntityMetricsLoadType.LOAD_MANY,
          entityClassName: TestEntity.name,
          count: 1,
        }),
      ),
    ).once();

    await entityDataManager.loadManyByFieldEqualityConjunctionAsync(
      queryContext,
      [
        {
          fieldName: 'customIdField',
          fieldValue: '1',
        },
      ],
      {},
    );
    verify(
      metricsAdapterMock.logDataManagerLoadEvent(
        objectContaining({
          type: EntityMetricsLoadType.LOAD_MANY_EQUALITY_CONJUNCTION,
          entityClassName: TestEntity.name,
          count: 1,
        }),
      ),
    ).once();

    verify(
      metricsAdapterMock.incrementDataManagerLoadCount(
        deepEqual({
          type: IncrementLoadCountEventType.DATALOADER,
          loadType: DataManagerLoadMethodType.SINGLE,
          fieldValueCount: 1,
          entityClassName: TestEntity.name,
        }),
      ),
    ).once();
    verify(
      metricsAdapterMock.incrementDataManagerLoadCount(
        deepEqual({
          type: IncrementLoadCountEventType.CACHE,
          loadType: DataManagerLoadMethodType.SINGLE,
          fieldValueCount: 1,
          entityClassName: TestEntity.name,
        }),
      ),
    ).once();
    verify(
      metricsAdapterMock.incrementDataManagerLoadCount(
        deepEqual({
          type: IncrementLoadCountEventType.DATABASE,
          loadType: DataManagerLoadMethodType.SINGLE,
          fieldValueCount: 1,
          entityClassName: TestEntity.name,
        }),
      ),
    ).once();

    resetCalls(metricsAdapterMock);

    const databaseAdapterSpy = spy(databaseAdapter);
    when(
      databaseAdapterSpy.fetchManyByRawWhereClauseAsync(
        anything(),
        anyString(),
        anything(),
        anything(),
      ),
    ).thenResolve([]);
    await entityDataManager.loadManyByRawWhereClauseAsync(queryContext, '', [], {});
    verify(
      metricsAdapterMock.logDataManagerLoadEvent(
        objectContaining({
          type: EntityMetricsLoadType.LOAD_MANY_RAW,
          entityClassName: TestEntity.name,
          count: 0,
        }),
      ),
    ).once();

    verify(metricsAdapterMock.incrementDataManagerLoadCount(anything())).never();
  });

  it('throws when a load-by value is null or undefined', async () => {
    const objects = getObjects();
    const dataStore = StubDatabaseAdapter.convertFieldObjectsToDataStore(
      testEntityConfiguration,
      objects,
    );
    const databaseAdapter = new StubDatabaseAdapter<TestFields>(testEntityConfiguration, dataStore);
    const cacheAdapterProvider = new NoCacheStubCacheAdapterProvider();
    const cacheAdapter = cacheAdapterProvider.getCacheAdapter(testEntityConfiguration);
    const entityCache = new ReadThroughEntityCache(testEntityConfiguration, cacheAdapter);
    const entityDataManager = new EntityDataManager(
      testEntityConfiguration,
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
        new SingleFieldHolder('nullableField'),
        [new SingleFieldValueHolder(null as any)],
      ),
    ).rejects.toThrowError('Invalid load: TestEntity (nullableField = null)');

    await expect(
      entityDataManager.loadManyEqualingAsync(
        queryContext,
        new SingleFieldHolder('nullableField'),
        [new SingleFieldValueHolder(undefined as any)],
      ),
    ).rejects.toThrowError('Invalid load: TestEntity (nullableField = undefined)');
  });
});
