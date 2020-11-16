import { enforceAsyncResult } from '@expo/results';
import { mock, instance, verify, spy, deepEqual, anyOfClass, anything, when } from 'ts-mockito';

import EntityLoader from '../EntityLoader';
import ViewerContext from '../ViewerContext';
import { enforceResultsAsync } from '../entityUtils';
import EntityDataManager from '../internal/EntityDataManager';
import ReadThroughEntityCache from '../internal/ReadThroughEntityCache';
import IEntityMetricsAdapter from '../metrics/IEntityMetricsAdapter';
import TestEntity, {
  TestFields,
  TestEntityPrivacyPolicy,
  testEntityConfiguration,
} from '../testfixtures/TestEntity';
import { NoCacheStubCacheAdapterProvider } from '../utils/testing/StubCacheAdapter';
import StubDatabaseAdapter from '../utils/testing/StubDatabaseAdapter';
import StubQueryContextProvider from '../utils/testing/StubQueryContextProvider';

describe(EntityLoader, () => {
  it('loads entities', async () => {
    const dateToInsert = new Date();
    const viewerContext = instance(mock(ViewerContext));
    const queryContext = StubQueryContextProvider.getQueryContext();

    const databaseAdapter = new StubDatabaseAdapter<TestFields>(
      testEntityConfiguration,
      StubDatabaseAdapter.convertFieldObjectsToDataStore(
        testEntityConfiguration,
        new Map([
          [
            testEntityConfiguration.tableName,
            [
              {
                customIdField: 'hello',
                testIndexedField: 'h1',
                numberField: 5,
                stringField: 'huh',
                dateField: dateToInsert,
                nullableField: null,
              },
              {
                customIdField: 'world',
                testIndexedField: 'h2',
                numberField: 3,
                stringField: 'huh',
                dateField: dateToInsert,
                nullableField: null,
              },
            ],
          ],
        ])
      )
    );
    const privacyPolicy = new TestEntityPrivacyPolicy();
    const cacheAdapterProvider = new NoCacheStubCacheAdapterProvider();
    const cacheAdapter = cacheAdapterProvider.getCacheAdapter(testEntityConfiguration);
    const entityCache = new ReadThroughEntityCache(testEntityConfiguration, cacheAdapter);
    const dataManager = new EntityDataManager(
      databaseAdapter,
      entityCache,
      StubQueryContextProvider,
      instance(mock<IEntityMetricsAdapter>()),
      TestEntity.name
    );
    const entityLoader = new EntityLoader(
      viewerContext,
      queryContext,
      testEntityConfiguration.idField,
      TestEntity,
      privacyPolicy,
      dataManager
    );
    const entity = await enforceAsyncResult(entityLoader.loadByIDAsync('hello'));
    expect(entity.getID()).toEqual('hello');
    expect(entity.getField('dateField')).toEqual(dateToInsert);

    const entities = await enforceResultsAsync(
      entityLoader.loadManyByFieldEqualingAsync('stringField', 'huh')
    );
    expect(entities.map((m) => m.getID())).toEqual(['hello', 'world']);

    const entityResultNumber3 = await entityLoader.loadByFieldEqualingAsync('numberField', 3);
    expect(entityResultNumber3).not.toBeNull();
    expect(entityResultNumber3.enforceValue()?.getID()).toEqual('world');

    const entityResultNumber4 = await entityLoader.loadByFieldEqualingAsync('numberField', 4);
    expect(entityResultNumber4.enforceValue()).toBeNull();

    await expect(entityLoader.loadByFieldEqualingAsync('stringField', 'huh')).rejects.toThrowError(
      'loadByFieldEqualing: Multiple entities of type TestEntity found for stringField=huh'
    );

    expect((await entityLoader.loadByIDNullableAsync('fake')).enforceValue()).toBeNull();
    await expect(entityLoader.loadByIDNullableAsync('hello')).resolves.not.toBeNull();
  });

  it('loads entities with loadManyByFieldEqualityConjunction', async () => {
    const privacyPolicy = new TestEntityPrivacyPolicy();
    const spiedPrivacyPolicy = spy(privacyPolicy);
    const viewerContext = instance(mock(ViewerContext));
    const queryContext = StubQueryContextProvider.getQueryContext();

    const databaseAdapter = new StubDatabaseAdapter<TestFields>(
      testEntityConfiguration,
      StubDatabaseAdapter.convertFieldObjectsToDataStore(
        testEntityConfiguration,
        new Map([
          [
            testEntityConfiguration.tableName,
            [
              {
                customIdField: 'hello',
                stringField: 'huh',
                numberField: 4,
                testIndexedField: '4',
                dateField: new Date(),
                nullableField: null,
              },
              {
                customIdField: 'world',
                stringField: 'huh',
                numberField: 4,
                testIndexedField: '5',
                dateField: new Date(),
                nullableField: null,
              },
              {
                customIdField: 'blah',
                stringField: 'huh2',
                numberField: 4,
                testIndexedField: '6',
                dateField: new Date(),
                nullableField: null,
              },
            ],
          ],
        ])
      )
    );
    const cacheAdapterProvider = new NoCacheStubCacheAdapterProvider();
    const cacheAdapter = cacheAdapterProvider.getCacheAdapter(testEntityConfiguration);
    const entityCache = new ReadThroughEntityCache(testEntityConfiguration, cacheAdapter);
    const dataManager = new EntityDataManager(
      databaseAdapter,
      entityCache,
      StubQueryContextProvider,
      instance(mock<IEntityMetricsAdapter>()),
      TestEntity.name
    );
    const entityLoader = new EntityLoader(
      viewerContext,
      queryContext,
      testEntityConfiguration.idField,
      TestEntity,
      privacyPolicy,
      dataManager
    );
    const entities = await enforceResultsAsync(
      entityLoader.loadManyByFieldEqualityConjunctionAsync([
        {
          fieldName: 'stringField',
          fieldValue: 'huh',
        },
        {
          fieldName: 'numberField',
          fieldValue: 4,
        },
      ])
    );
    expect(entities).toHaveLength(2);
    verify(
      spiedPrivacyPolicy.authorizeReadAsync(viewerContext, queryContext, anyOfClass(TestEntity))
    ).twice();
  });

  it('authorizes loaded entities', async () => {
    const privacyPolicy = new TestEntityPrivacyPolicy();
    const spiedPrivacyPolicy = spy(privacyPolicy);

    const viewerContext = instance(mock(ViewerContext));
    const queryContext = StubQueryContextProvider.getQueryContext();

    const databaseAdapter = new StubDatabaseAdapter<TestFields>(
      testEntityConfiguration,
      StubDatabaseAdapter.convertFieldObjectsToDataStore(
        testEntityConfiguration,
        new Map([
          [
            testEntityConfiguration.tableName,
            [
              {
                customIdField: 'hello',
                stringField: 'huh',
                testIndexedField: '1',
                numberField: 3,
                dateField: new Date(),
                nullableField: null,
              },
            ],
          ],
        ])
      )
    );
    const cacheAdapterProvider = new NoCacheStubCacheAdapterProvider();
    const cacheAdapter = cacheAdapterProvider.getCacheAdapter(testEntityConfiguration);
    const entityCache = new ReadThroughEntityCache(testEntityConfiguration, cacheAdapter);
    const dataManager = new EntityDataManager(
      databaseAdapter,
      entityCache,
      StubQueryContextProvider,
      instance(mock<IEntityMetricsAdapter>()),
      TestEntity.name
    );
    const entityLoader = new EntityLoader(
      viewerContext,
      queryContext,
      testEntityConfiguration.idField,
      TestEntity,
      privacyPolicy,
      dataManager
    );
    const entity = await enforceAsyncResult(entityLoader.loadByIDAsync('hello'));
    verify(spiedPrivacyPolicy.authorizeReadAsync(viewerContext, queryContext, entity)).once();
  });

  it('invalidates upon invalidate one', async () => {
    const viewerContext = instance(mock(ViewerContext));
    const queryContext = StubQueryContextProvider.getQueryContext();
    const privacyPolicy = instance(mock(TestEntityPrivacyPolicy));
    const dataManagerMock = mock(EntityDataManager);
    const dataManagerInstance = instance(dataManagerMock);

    const entityLoader = new EntityLoader(
      viewerContext,
      queryContext,
      testEntityConfiguration.idField,
      TestEntity,
      privacyPolicy,
      dataManagerInstance
    );
    await entityLoader.invalidateFieldsAsync({ customIdField: 'hello' } as any);

    verify(
      dataManagerMock.invalidateObjectFieldsAsync(deepEqual({ customIdField: 'hello' }))
    ).once();
  });

  it('invalidates upon invalidate by field', async () => {
    const viewerContext = instance(mock(ViewerContext));
    const queryContext = StubQueryContextProvider.getQueryContext();
    const privacyPolicy = instance(mock(TestEntityPrivacyPolicy));
    const dataManagerMock = mock(EntityDataManager);
    const dataManagerInstance = instance(dataManagerMock);

    const entityLoader = new EntityLoader(
      viewerContext,
      queryContext,
      testEntityConfiguration.idField,
      TestEntity,
      privacyPolicy,
      dataManagerInstance
    );
    await entityLoader.invalidateFieldsAsync({ customIdField: 'hello' } as any);
    verify(
      dataManagerMock.invalidateObjectFieldsAsync(deepEqual({ customIdField: 'hello' }))
    ).once();
  });

  it('invalidates upon invalidate by entity', async () => {
    const viewerContext = instance(mock(ViewerContext));
    const queryContext = StubQueryContextProvider.getQueryContext();
    const privacyPolicy = instance(mock(TestEntityPrivacyPolicy));
    const dataManagerMock = mock(EntityDataManager);
    const dataManagerInstance = instance(dataManagerMock);

    const entityMock = mock(TestEntity);
    when(entityMock.getAllDatabaseFields()).thenReturn({ customIdField: 'hello' } as any);
    const entityInstance = instance(entityMock);

    const entityLoader = new EntityLoader(
      viewerContext,
      queryContext,
      testEntityConfiguration.idField,
      TestEntity,
      privacyPolicy,
      dataManagerInstance
    );
    await entityLoader.invalidateEntityAsync(entityInstance);
    verify(
      dataManagerMock.invalidateObjectFieldsAsync(deepEqual({ customIdField: 'hello' }))
    ).once();
  });

  it('returns error result when not allowed', async () => {
    const viewerContext = instance(mock(ViewerContext));
    const queryContext = StubQueryContextProvider.getQueryContext();
    const privacyPolicyMock = mock(TestEntityPrivacyPolicy);
    const dataManagerMock = mock(EntityDataManager);

    when(
      dataManagerMock.loadManyByFieldEqualingAsync(anything(), anything(), anything())
    ).thenResolve(new Map().set('hello', [{ customIdField: 'hello' }]));

    const rejectionError = new Error();

    when(
      privacyPolicyMock.authorizeReadAsync(viewerContext, queryContext, anyOfClass(TestEntity))
    ).thenReject(rejectionError);

    const privacyPolicy = instance(privacyPolicyMock);
    const dataManagerInstance = instance(dataManagerMock);

    const entityLoader = new EntityLoader(
      viewerContext,
      queryContext,
      testEntityConfiguration.idField,
      TestEntity,
      privacyPolicy,
      dataManagerInstance
    );

    const entityResult = await entityLoader.loadByIDAsync('hello');
    expect(entityResult.ok).toBe(false);
    expect(entityResult.reason).toEqual(rejectionError);
    expect(entityResult.value).toBe(undefined);
  });

  it('throws upon database adapter error', async () => {
    const viewerContext = instance(mock(ViewerContext));
    const queryContext = StubQueryContextProvider.getQueryContext();
    const privacyPolicy = instance(mock(TestEntityPrivacyPolicy));
    const dataManagerMock = mock(EntityDataManager);

    const error = new Error();

    when(
      dataManagerMock.loadManyByFieldEqualingAsync(anything(), anything(), anything())
    ).thenReject(error);

    const dataManagerInstance = instance(dataManagerMock);

    const entityLoader = new EntityLoader(
      viewerContext,
      queryContext,
      testEntityConfiguration.idField,
      TestEntity,
      privacyPolicy,
      dataManagerInstance
    );

    await expect(entityLoader.loadByIDAsync('hello')).rejects.toEqual(error);
    await expect(entityLoader.enforcing().loadByIDAsync('hello')).rejects.toEqual(error);
    await expect(entityLoader.loadManyByIDsAsync(['hello'])).rejects.toEqual(error);
    await expect(entityLoader.loadManyByIDsAsync(['hello'])).rejects.toEqual(error);
    await expect(
      entityLoader.loadManyByFieldEqualingAsync('customIdField', 'hello')
    ).rejects.toEqual(error);
    await expect(
      entityLoader.enforcing().loadManyByFieldEqualingAsync('customIdField', 'hello')
    ).rejects.toEqual(error);
    await expect(
      entityLoader.loadManyByFieldEqualingManyAsync('customIdField', ['hello'])
    ).rejects.toEqual(error);
    await expect(
      entityLoader.enforcing().loadManyByFieldEqualingManyAsync('customIdField', ['hello'])
    ).rejects.toEqual(error);
  });
});
