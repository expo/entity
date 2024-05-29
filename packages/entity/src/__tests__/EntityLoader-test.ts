import { enforceAsyncResult } from '@expo/results';
import { mock, instance, verify, spy, deepEqual, anyOfClass, anything, when } from 'ts-mockito';
import { v4 as uuidv4 } from 'uuid';

import { OrderByOrdering } from '../EntityDatabaseAdapter';
import EntityLoader from '../EntityLoader';
import { EntityPrivacyPolicyEvaluationContext } from '../EntityPrivacyPolicy';
import ViewerContext from '../ViewerContext';
import { enforceResultsAsync } from '../entityUtils';
import EntityNotFoundError from '../errors/EntityNotFoundError';
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
    const privacyPolicyEvaluationContext = instance(mock<EntityPrivacyPolicyEvaluationContext>());
    const metricsAdapter = instance(mock<IEntityMetricsAdapter>());
    const queryContext = StubQueryContextProvider.getQueryContext();

    const id1 = uuidv4();
    const id2 = uuidv4();
    const databaseAdapter = new StubDatabaseAdapter<TestFields>(
      testEntityConfiguration,
      StubDatabaseAdapter.convertFieldObjectsToDataStore(
        testEntityConfiguration,
        new Map([
          [
            testEntityConfiguration.tableName,
            [
              {
                customIdField: id1,
                testIndexedField: 'h1',
                intField: 5,
                stringField: 'huh',
                dateField: dateToInsert,
                nullableField: null,
              },
              {
                customIdField: id2,
                testIndexedField: 'h2',
                intField: 3,
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
      privacyPolicyEvaluationContext,
      testEntityConfiguration,
      TestEntity,
      /* entitySelectedFields */ undefined,
      privacyPolicy,
      dataManager,
      metricsAdapter
    );
    const entity = await enforceAsyncResult(entityLoader.loadByIDAsync(id1));
    expect(entity.getID()).toEqual(id1);
    expect(entity.getField('dateField')).toEqual(dateToInsert);

    const entities = await enforceResultsAsync(
      entityLoader.loadManyByFieldEqualingAsync('stringField', 'huh')
    );
    expect(entities.map((m) => m.getID())).toEqual([id1, id2]);

    const entityResultNumber3 = await entityLoader.loadByFieldEqualingAsync('intField', 3);
    expect(entityResultNumber3).not.toBeNull();
    expect(entityResultNumber3!.enforceValue().getID()).toEqual(id2);

    const entityResultNumber4 = await entityLoader.loadByFieldEqualingAsync('intField', 4);
    expect(entityResultNumber4).toBeNull();

    const entityResultDuplicateValues = await entityLoader
      .enforcing()
      .loadManyByFieldEqualingManyAsync('stringField', ['huh', 'huh']);
    expect(entityResultDuplicateValues.size).toBe(1);
    expect(entityResultDuplicateValues.get('huh')?.map((m) => m.getID())).toEqual([id1, id2]);

    await expect(entityLoader.loadByFieldEqualingAsync('stringField', 'huh')).rejects.toThrowError(
      'loadByFieldEqualing: Multiple entities of type TestEntity found for stringField=huh'
    );

    await expect(entityLoader.loadByIDNullableAsync(uuidv4())).resolves.toBeNull();
    await expect(entityLoader.loadByIDNullableAsync(id1)).resolves.not.toBeNull();

    const nonExistentId = uuidv4();
    const manyIdResults = await entityLoader.loadManyByIDsNullableAsync([nonExistentId, id1]);
    expect(manyIdResults.get(nonExistentId)).toBeNull();
    expect(manyIdResults.get(id1)).not.toBeNull();

    await expect(enforceAsyncResult(entityLoader.loadByIDAsync(nonExistentId))).rejects.toThrow(
      EntityNotFoundError
    );

    await expect(entityLoader.loadByIDAsync('not-a-uuid')).rejects.toThrowError(
      'Entity field not valid: TestEntity (customIdField = not-a-uuid)'
    );
  });

  it('loads entities with loadManyByFieldEqualityConjunction', async () => {
    const privacyPolicy = new TestEntityPrivacyPolicy();
    const spiedPrivacyPolicy = spy(privacyPolicy);
    const viewerContext = instance(mock(ViewerContext));
    const privacyPolicyEvaluationContext = instance(mock<EntityPrivacyPolicyEvaluationContext>());
    const metricsAdapter = instance(mock<IEntityMetricsAdapter>());
    const queryContext = StubQueryContextProvider.getQueryContext();

    const id1 = uuidv4();
    const id2 = uuidv4();
    const id3 = uuidv4();
    const databaseAdapter = new StubDatabaseAdapter<TestFields>(
      testEntityConfiguration,
      StubDatabaseAdapter.convertFieldObjectsToDataStore(
        testEntityConfiguration,
        new Map([
          [
            testEntityConfiguration.tableName,
            [
              {
                customIdField: id1,
                stringField: 'huh',
                intField: 4,
                testIndexedField: '4',
                dateField: new Date(),
                nullableField: null,
              },
              {
                customIdField: id2,
                stringField: 'huh',
                intField: 4,
                testIndexedField: '5',
                dateField: new Date(),
                nullableField: null,
              },
              {
                customIdField: id3,
                stringField: 'huh2',
                intField: 4,
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
      privacyPolicyEvaluationContext,
      testEntityConfiguration,
      TestEntity,
      /* entitySelectedFields */ undefined,
      privacyPolicy,
      dataManager,
      metricsAdapter
    );
    const entities = await enforceResultsAsync(
      entityLoader.loadManyByFieldEqualityConjunctionAsync([
        {
          fieldName: 'stringField',
          fieldValue: 'huh',
        },
        {
          fieldName: 'intField',
          fieldValues: [4],
        },
      ])
    );
    expect(entities).toHaveLength(2);
    verify(
      spiedPrivacyPolicy.authorizeReadAsync(
        viewerContext,
        queryContext,
        privacyPolicyEvaluationContext,
        anyOfClass(TestEntity),
        anything()
      )
    ).twice();

    await expect(
      entityLoader.loadManyByFieldEqualityConjunctionAsync([
        { fieldName: 'customIdField', fieldValue: 'not-a-uuid' },
      ])
    ).rejects.toThrowError('Entity field not valid: TestEntity (customIdField = not-a-uuid)');
  });

  it('loads entities with loadFirstByFieldEqualityConjunction', async () => {
    const privacyPolicy = new TestEntityPrivacyPolicy();
    const spiedPrivacyPolicy = spy(privacyPolicy);
    const viewerContext = instance(mock(ViewerContext));
    const privacyPolicyEvaluationContext = instance(mock<EntityPrivacyPolicyEvaluationContext>());
    const metricsAdapter = instance(mock<IEntityMetricsAdapter>());
    const queryContext = StubQueryContextProvider.getQueryContext();

    const id1 = uuidv4();
    const id2 = uuidv4();
    const id3 = uuidv4();
    const databaseAdapter = new StubDatabaseAdapter<TestFields>(
      testEntityConfiguration,
      StubDatabaseAdapter.convertFieldObjectsToDataStore(
        testEntityConfiguration,
        new Map([
          [
            testEntityConfiguration.tableName,
            [
              {
                customIdField: id1,
                stringField: 'huh',
                intField: 4,
                testIndexedField: '4',
                dateField: new Date(),
                nullableField: null,
              },
              {
                customIdField: id2,
                stringField: 'huh',
                intField: 4,
                testIndexedField: '5',
                dateField: new Date(),
                nullableField: null,
              },
              {
                customIdField: id3,
                stringField: 'huh2',
                intField: 4,
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
      privacyPolicyEvaluationContext,
      testEntityConfiguration,
      TestEntity,
      /* entitySelectedFields */ undefined,
      privacyPolicy,
      dataManager,
      metricsAdapter
    );
    const result = await entityLoader.loadFirstByFieldEqualityConjunctionAsync(
      [
        {
          fieldName: 'stringField',
          fieldValue: 'huh',
        },
        {
          fieldName: 'intField',
          fieldValue: 4,
        },
      ],
      { orderBy: [{ fieldName: 'testIndexedField', order: OrderByOrdering.DESCENDING }] }
    );
    expect(result).not.toBeNull();
    expect(result!.ok).toBe(true);
    expect(result!.enforceValue().getField('testIndexedField')).toEqual('5');
    verify(
      spiedPrivacyPolicy.authorizeReadAsync(
        viewerContext,
        queryContext,
        privacyPolicyEvaluationContext,
        anyOfClass(TestEntity),
        anything()
      )
    ).once();
  });

  it('loads entities with loadManyByRawWhereClauseAsync', async () => {
    const privacyPolicy = new TestEntityPrivacyPolicy();
    const spiedPrivacyPolicy = spy(privacyPolicy);
    const viewerContext = instance(mock(ViewerContext));
    const privacyPolicyEvaluationContext = instance(mock<EntityPrivacyPolicyEvaluationContext>());
    const metricsAdapter = instance(mock<IEntityMetricsAdapter>());
    const queryContext = StubQueryContextProvider.getQueryContext();

    const dataManagerMock = mock<EntityDataManager<TestFields>>(EntityDataManager);
    when(
      dataManagerMock.loadManyByRawWhereClauseAsync(
        queryContext,
        anything(),
        anything(),
        anything()
      )
    ).thenResolve([
      {
        customIdField: 'id',
        stringField: 'huh',
        intField: 4,
        testIndexedField: '4',
        dateField: new Date(),
        nullableField: null,
      },
    ]);
    const dataManager = instance(dataManagerMock);
    const entityLoader = new EntityLoader(
      viewerContext,
      queryContext,
      privacyPolicyEvaluationContext,
      testEntityConfiguration,
      TestEntity,
      /* entitySelectedFields */ undefined,
      privacyPolicy,
      dataManager,
      metricsAdapter
    );
    const result = await entityLoader.loadManyByRawWhereClauseAsync('id = ?', [1], {
      orderBy: [{ fieldName: 'testIndexedField', order: OrderByOrdering.DESCENDING }],
    });
    expect(result).toHaveLength(1);
    expect(result[0]).not.toBeNull();
    expect(result[0]!.ok).toBe(true);
    expect(result[0]!.enforceValue().getField('testIndexedField')).toEqual('4');
    verify(
      spiedPrivacyPolicy.authorizeReadAsync(
        viewerContext,
        queryContext,
        privacyPolicyEvaluationContext,
        anyOfClass(TestEntity),
        anything()
      )
    ).once();
  });

  it('authorizes loaded entities', async () => {
    const privacyPolicy = new TestEntityPrivacyPolicy();
    const spiedPrivacyPolicy = spy(privacyPolicy);

    const viewerContext = instance(mock(ViewerContext));
    const privacyPolicyEvaluationContext = instance(mock<EntityPrivacyPolicyEvaluationContext>());
    const metricsAdapter = instance(mock<IEntityMetricsAdapter>());
    const queryContext = StubQueryContextProvider.getQueryContext();

    const id1 = uuidv4();
    const databaseAdapter = new StubDatabaseAdapter<TestFields>(
      testEntityConfiguration,
      StubDatabaseAdapter.convertFieldObjectsToDataStore(
        testEntityConfiguration,
        new Map([
          [
            testEntityConfiguration.tableName,
            [
              {
                customIdField: id1,
                stringField: 'huh',
                testIndexedField: '1',
                intField: 3,
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
      privacyPolicyEvaluationContext,
      testEntityConfiguration,
      TestEntity,
      /* entitySelectedFields */ undefined,
      privacyPolicy,
      dataManager,
      metricsAdapter
    );
    const entity = await enforceAsyncResult(entityLoader.loadByIDAsync(id1));
    verify(
      spiedPrivacyPolicy.authorizeReadAsync(
        viewerContext,
        queryContext,
        privacyPolicyEvaluationContext,
        entity,
        anything()
      )
    ).once();
  });

  it('invalidates upon invalidate one', async () => {
    const viewerContext = instance(mock(ViewerContext));
    const privacyPolicyEvaluationContext = instance(mock<EntityPrivacyPolicyEvaluationContext>());
    const metricsAdapter = instance(mock<IEntityMetricsAdapter>());
    const queryContext = StubQueryContextProvider.getQueryContext();
    const privacyPolicy = instance(mock(TestEntityPrivacyPolicy));
    const dataManagerMock = mock<EntityDataManager<TestFields>>();
    const dataManagerInstance = instance(dataManagerMock);

    const id1 = uuidv4();
    const entityLoader = new EntityLoader(
      viewerContext,
      queryContext,
      privacyPolicyEvaluationContext,
      testEntityConfiguration,
      TestEntity,
      /* entitySelectedFields */ undefined,
      privacyPolicy,
      dataManagerInstance,
      metricsAdapter
    );
    await entityLoader.invalidateFieldsAsync({ customIdField: id1 } as any);

    verify(
      dataManagerMock.invalidateObjectFieldsAsync(deepEqual({ customIdField: id1 } as any))
    ).once();
  });

  it('invalidates upon invalidate by field', async () => {
    const viewerContext = instance(mock(ViewerContext));
    const privacyPolicyEvaluationContext = instance(mock<EntityPrivacyPolicyEvaluationContext>());
    const metricsAdapter = instance(mock<IEntityMetricsAdapter>());
    const queryContext = StubQueryContextProvider.getQueryContext();
    const privacyPolicy = instance(mock(TestEntityPrivacyPolicy));
    const dataManagerMock = mock<EntityDataManager<TestFields>>();
    const dataManagerInstance = instance(dataManagerMock);

    const id1 = uuidv4();
    const entityLoader = new EntityLoader(
      viewerContext,
      queryContext,
      privacyPolicyEvaluationContext,
      testEntityConfiguration,
      TestEntity,
      /* entitySelectedFields */ undefined,
      privacyPolicy,
      dataManagerInstance,
      metricsAdapter
    );
    await entityLoader.invalidateFieldsAsync({ customIdField: id1 } as any);
    verify(
      dataManagerMock.invalidateObjectFieldsAsync(deepEqual({ customIdField: id1 } as any))
    ).once();
  });

  it('invalidates upon invalidate by entity', async () => {
    const viewerContext = instance(mock(ViewerContext));
    const privacyPolicyEvaluationContext = instance(mock<EntityPrivacyPolicyEvaluationContext>());
    const metricsAdapter = instance(mock<IEntityMetricsAdapter>());
    const queryContext = StubQueryContextProvider.getQueryContext();
    const privacyPolicy = instance(mock(TestEntityPrivacyPolicy));
    const dataManagerMock = mock<EntityDataManager<TestFields>>();
    const dataManagerInstance = instance(dataManagerMock);

    const id1 = uuidv4();
    const entityMock = mock(TestEntity);
    when(entityMock.getAllDatabaseFields()).thenReturn({ customIdField: id1 } as any);
    const entityInstance = instance(entityMock);

    const entityLoader = new EntityLoader(
      viewerContext,
      queryContext,
      privacyPolicyEvaluationContext,
      testEntityConfiguration,
      TestEntity,
      /* entitySelectedFields */ undefined,
      privacyPolicy,
      dataManagerInstance,
      metricsAdapter
    );
    await entityLoader.invalidateEntityAsync(entityInstance);
    verify(
      dataManagerMock.invalidateObjectFieldsAsync(deepEqual({ customIdField: id1 } as any))
    ).once();
  });

  it('returns error result when not allowed', async () => {
    const viewerContext = instance(mock(ViewerContext));
    const privacyPolicyEvaluationContext = instance(mock<EntityPrivacyPolicyEvaluationContext>());
    const metricsAdapter = instance(mock<IEntityMetricsAdapter>());
    const queryContext = StubQueryContextProvider.getQueryContext();
    const privacyPolicyMock = mock(TestEntityPrivacyPolicy);
    const dataManagerMock = mock<EntityDataManager<TestFields>>();

    const id1 = uuidv4();
    when(
      dataManagerMock.loadManyByFieldEqualingAsync(anything(), anything(), anything())
    ).thenResolve(new Map().set(id1, [{ customIdField: id1 }]));

    const rejectionError = new Error();

    when(
      privacyPolicyMock.authorizeReadAsync(
        viewerContext,
        queryContext,
        privacyPolicyEvaluationContext,
        anyOfClass(TestEntity),
        anything()
      )
    ).thenReject(rejectionError);

    const privacyPolicy = instance(privacyPolicyMock);
    const dataManagerInstance = instance(dataManagerMock);

    const entityLoader = new EntityLoader(
      viewerContext,
      queryContext,
      privacyPolicyEvaluationContext,
      testEntityConfiguration,
      TestEntity,
      /* entitySelectedFields */ undefined,
      privacyPolicy,
      dataManagerInstance,
      metricsAdapter
    );

    const entityResult = await entityLoader.loadByIDAsync(id1);
    expect(entityResult.ok).toBe(false);
    expect(entityResult.reason).toEqual(rejectionError);
    expect(entityResult.value).toBe(undefined);
  });

  it('throws upon database adapter error', async () => {
    const viewerContext = instance(mock(ViewerContext));
    const privacyPolicyEvaluationContext = instance(mock<EntityPrivacyPolicyEvaluationContext>());
    const metricsAdapter = instance(mock<IEntityMetricsAdapter>());
    const queryContext = StubQueryContextProvider.getQueryContext();
    const privacyPolicy = instance(mock(TestEntityPrivacyPolicy));
    const dataManagerMock = mock<EntityDataManager<TestFields>>();

    const error = new Error();

    when(
      dataManagerMock.loadManyByFieldEqualingAsync(anything(), anything(), anything())
    ).thenReject(error);

    const dataManagerInstance = instance(dataManagerMock);

    const entityLoader = new EntityLoader(
      viewerContext,
      queryContext,
      privacyPolicyEvaluationContext,
      testEntityConfiguration,
      TestEntity,
      /* entitySelectedFields */ undefined,
      privacyPolicy,
      dataManagerInstance,
      metricsAdapter
    );

    const loadByValue = uuidv4();

    await expect(entityLoader.loadByIDAsync(loadByValue)).rejects.toEqual(error);
    await expect(entityLoader.enforcing().loadByIDAsync(loadByValue)).rejects.toEqual(error);
    await expect(entityLoader.loadManyByIDsAsync([loadByValue])).rejects.toEqual(error);
    await expect(entityLoader.enforcing().loadManyByIDsAsync([loadByValue])).rejects.toEqual(error);
    await expect(entityLoader.loadManyByIDsNullableAsync([loadByValue])).rejects.toEqual(error);
    await expect(
      entityLoader.enforcing().loadManyByIDsNullableAsync([loadByValue])
    ).rejects.toEqual(error);
    await expect(
      entityLoader.loadManyByFieldEqualingAsync('customIdField', loadByValue)
    ).rejects.toEqual(error);
    await expect(
      entityLoader.enforcing().loadManyByFieldEqualingAsync('customIdField', loadByValue)
    ).rejects.toEqual(error);
    await expect(
      entityLoader.loadManyByFieldEqualingManyAsync('customIdField', [loadByValue])
    ).rejects.toEqual(error);
    await expect(
      entityLoader.enforcing().loadManyByFieldEqualingManyAsync('customIdField', [loadByValue])
    ).rejects.toEqual(error);
  });
});
