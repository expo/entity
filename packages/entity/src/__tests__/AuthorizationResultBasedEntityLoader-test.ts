import { enforceAsyncResult } from '@expo/results';
import { describe, expect, it } from '@jest/globals';
import { anyOfClass, anything, instance, mock, spy, verify, when } from 'ts-mockito';
import { v4 as uuidv4 } from 'uuid';

import { AuthorizationResultBasedEntityLoader } from '../AuthorizationResultBasedEntityLoader';
import { EntityConstructionUtils } from '../EntityConstructionUtils';
import { EntityInvalidationUtils } from '../EntityInvalidationUtils';
import { EntityPrivacyPolicyEvaluationContext } from '../EntityPrivacyPolicy';
import { ViewerContext } from '../ViewerContext';
import { enforceResultsAsync } from '../entityUtils';
import { EntityNotFoundError } from '../errors/EntityNotFoundError';
import { CompositeFieldHolder, CompositeFieldValueHolder } from '../internal/CompositeFieldHolder';
import { EntityDataManager } from '../internal/EntityDataManager';
import { ReadThroughEntityCache } from '../internal/ReadThroughEntityCache';
import {
  SingleFieldHolder,
  SingleFieldValueHolder,
  SingleFieldValueHolderMap,
} from '../internal/SingleFieldHolder';
import { IEntityMetricsAdapter } from '../metrics/IEntityMetricsAdapter';
import { NoCacheStubCacheAdapterProvider } from '../utils/__testfixtures__/StubCacheAdapter';
import { StubDatabaseAdapter } from '../utils/__testfixtures__/StubDatabaseAdapter';
import { StubQueryContextProvider } from '../utils/__testfixtures__/StubQueryContextProvider';
import { deepEqualEntityAware } from '../utils/__testfixtures__/TSMockitoExtensions';
import {
  TestEntity,
  TestEntityPrivacyPolicy,
  TestFields,
  testEntityConfiguration,
} from '../utils/__testfixtures__/TestEntity';

describe(AuthorizationResultBasedEntityLoader, () => {
  it('loads entities', async () => {
    const dateToInsert = new Date();
    const viewerContext = instance(mock(ViewerContext));
    const privacyPolicyEvaluationContext =
      instance(
        mock<
          EntityPrivacyPolicyEvaluationContext<
            TestFields,
            'customIdField',
            ViewerContext,
            TestEntity
          >
        >(),
      );
    const metricsAdapter = instance(mock<IEntityMetricsAdapter>());
    const queryContext = new StubQueryContextProvider().getQueryContext();

    const id1 = uuidv4();
    const id2 = uuidv4();
    const databaseAdapter = new StubDatabaseAdapter<TestFields, 'customIdField'>(
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
        ]),
      ),
    );
    const privacyPolicy = new TestEntityPrivacyPolicy();
    const cacheAdapterProvider = new NoCacheStubCacheAdapterProvider();
    const cacheAdapter = cacheAdapterProvider.getCacheAdapter(testEntityConfiguration);
    const entityCache = new ReadThroughEntityCache(testEntityConfiguration, cacheAdapter);
    const dataManager = new EntityDataManager(
      databaseAdapter,
      entityCache,
      new StubQueryContextProvider(),
      instance(mock<IEntityMetricsAdapter>()),
      TestEntity.name,
    );
    const invalidationUtils = new EntityInvalidationUtils(
      testEntityConfiguration,
      TestEntity,
      dataManager,
      metricsAdapter,
    );
    const constructionUtils = new EntityConstructionUtils(
      viewerContext,
      queryContext,
      privacyPolicyEvaluationContext,
      testEntityConfiguration,
      TestEntity,
      /* entitySelectedFields */ undefined,
      privacyPolicy,
      metricsAdapter,
    );
    const entityLoader = new AuthorizationResultBasedEntityLoader(
      queryContext,
      testEntityConfiguration,
      TestEntity,
      dataManager,
      metricsAdapter,
      invalidationUtils,
      constructionUtils,
    );

    const entity = await enforceAsyncResult(entityLoader.loadByIDAsync(id1));
    expect(entity.getID()).toEqual(id1);
    expect(entity.getField('dateField')).toEqual(dateToInsert);

    const entities = await enforceResultsAsync(
      entityLoader.loadManyByFieldEqualingAsync('stringField', 'huh'),
    );
    expect(entities.map((m) => m.getID())).toEqual([id1, id2]);

    const entityResultNumber3 = await entityLoader.loadByFieldEqualingAsync('intField', 3);
    expect(entityResultNumber3).not.toBeNull();
    expect(entityResultNumber3!.enforceValue().getID()).toEqual(id2);

    const entityResultNumber4 = await entityLoader.loadByFieldEqualingAsync('intField', 4);
    expect(entityResultNumber4).toBeNull();

    const entityResultDuplicateValues = await entityLoader.loadManyByFieldEqualingManyAsync(
      'stringField',
      ['huh', 'huh'],
    );
    expect(entityResultDuplicateValues.size).toBe(1);
    expect(entityResultDuplicateValues.get('huh')?.map((m) => m.enforceValue().getID())).toEqual([
      id1,
      id2,
    ]);

    await expect(entityLoader.loadByFieldEqualingAsync('stringField', 'huh')).rejects.toThrow(
      'loadByFieldEqualing: Multiple entities of type TestEntity found for stringField=huh',
    );

    await expect(entityLoader.loadByIDNullableAsync(uuidv4())).resolves.toBeNull();
    await expect(entityLoader.loadByIDNullableAsync(id1)).resolves.not.toBeNull();

    const nonExistentId = uuidv4();
    const manyIdResults = await entityLoader.loadManyByIDsNullableAsync([nonExistentId, id1]);
    expect(manyIdResults.get(nonExistentId)).toBeNull();
    expect(manyIdResults.get(id1)).not.toBeNull();

    await expect(enforceAsyncResult(entityLoader.loadByIDAsync(nonExistentId))).rejects.toThrow(
      EntityNotFoundError,
    );

    await expect(entityLoader.loadByIDAsync('not-a-uuid')).rejects.toThrow(
      'Entity field not valid: TestEntity (customIdField = not-a-uuid)',
    );
  });

  it('loads entities by composite fields', async () => {
    const dateToInsert = new Date();
    const viewerContext = instance(mock(ViewerContext));
    const privacyPolicyEvaluationContext =
      instance(
        mock<
          EntityPrivacyPolicyEvaluationContext<
            TestFields,
            'customIdField',
            ViewerContext,
            TestEntity
          >
        >(),
      );
    const metricsAdapter = instance(mock<IEntityMetricsAdapter>());
    const queryContext = new StubQueryContextProvider().getQueryContext();

    const id1 = uuidv4();
    const id2 = uuidv4();
    const id3 = uuidv4();
    const id4 = uuidv4();
    const databaseAdapter = new StubDatabaseAdapter<TestFields, 'customIdField'>(
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
                intField: 5,
                stringField: 'huh',
                dateField: dateToInsert,
                nullableField: null,
              },
              {
                customIdField: id3,
                testIndexedField: 'h2',
                intField: 3,
                stringField: 'huh',
                dateField: dateToInsert,
                nullableField: null,
              },
              {
                customIdField: id4,
                stringField: 'huh3',
                intField: 4,
                testIndexedField: '7',
                dateField: new Date(),
                nullableField: 'non-null-nullable-field',
              },
            ],
          ],
        ]),
      ),
    );
    const privacyPolicy = new TestEntityPrivacyPolicy();
    const cacheAdapterProvider = new NoCacheStubCacheAdapterProvider();
    const cacheAdapter = cacheAdapterProvider.getCacheAdapter(testEntityConfiguration);
    const entityCache = new ReadThroughEntityCache(testEntityConfiguration, cacheAdapter);
    const dataManager = new EntityDataManager(
      databaseAdapter,
      entityCache,
      new StubQueryContextProvider(),
      instance(mock<IEntityMetricsAdapter>()),
      TestEntity.name,
    );
    const invalidationUtils = new EntityInvalidationUtils(
      testEntityConfiguration,
      TestEntity,
      dataManager,
      metricsAdapter,
    );
    const constructionUtils = new EntityConstructionUtils(
      viewerContext,
      queryContext,
      privacyPolicyEvaluationContext,
      testEntityConfiguration,
      TestEntity,
      /* entitySelectedFields */ undefined,
      privacyPolicy,
      metricsAdapter,
    );
    const entityLoader = new AuthorizationResultBasedEntityLoader(
      queryContext,
      testEntityConfiguration,
      TestEntity,
      dataManager,
      metricsAdapter,
      invalidationUtils,
      constructionUtils,
    );

    const entities = await enforceResultsAsync(
      entityLoader.loadManyByCompositeFieldEqualingAsync(['stringField', 'intField'], {
        stringField: 'huh',
        intField: 5,
      }),
    );
    expect(entities.map((m) => m.getID())).toEqual([id1, id2]);

    const entityNullableCompositeValueResult = await entityLoader.loadByCompositeFieldEqualingAsync(
      ['nullableField', 'testIndexedField'],
      {
        nullableField: 'non-null-nullable-field',
        testIndexedField: '7',
      },
    );
    expect(entityNullableCompositeValueResult?.enforceValue().getID()).toBe(id4);

    const entityResultDuplicateValues =
      await entityLoader.loadManyByCompositeFieldEqualingManyAsync(
        ['stringField', 'intField'],
        [
          { stringField: 'huh', intField: 5 },
          { stringField: 'huh', intField: 5 },
        ],
      );
    expect(entityResultDuplicateValues.size).toBe(1);
    expect(
      entityResultDuplicateValues
        .get({ stringField: 'huh', intField: 5 })
        ?.map((m) => m.enforceValue().getID()),
    ).toEqual([id1, id2]);

    const entityResultNoValues = await entityLoader.loadManyByCompositeFieldEqualingAsync(
      ['stringField', 'intField'],
      { stringField: 'huh', intField: 999 },
    );
    expect(entityResultNoValues).toHaveLength(0);

    await expect(
      entityLoader.loadByCompositeFieldEqualingAsync(['stringField', 'intField'], {
        stringField: 'huh',
        intField: 5,
      }),
    ).rejects.toThrow(
      'loadByCompositeFieldEqualing: Multiple entities of type TestEntity found for composite field (stringField,intField)={"stringField":"huh","intField":5}',
    );

    // test the result map
    const entityResultMap = await entityLoader.loadManyByCompositeFieldEqualingManyAsync(
      ['stringField', 'intField'],
      [
        { stringField: 'huh', intField: 5 },
        { stringField: 'huh', intField: 3 },
      ],
    );
    expect(entityResultMap.size).toBe(2);
    expect(
      entityResultMap
        .get({ stringField: 'huh', intField: 5 })
        ?.map((m) => m.enforceValue().getID()),
    ).toEqual([id1, id2]);
    expect(
      entityResultMap
        .get({ stringField: 'huh', intField: 3 })
        ?.map((m) => m.enforceValue().getID()),
    ).toEqual([id3]);
  });

  it('authorizes loaded entities', async () => {
    const privacyPolicy = new TestEntityPrivacyPolicy();
    const spiedPrivacyPolicy = spy(privacyPolicy);

    const viewerContext = instance(mock(ViewerContext));
    const privacyPolicyEvaluationContext =
      instance(
        mock<
          EntityPrivacyPolicyEvaluationContext<
            TestFields,
            'customIdField',
            ViewerContext,
            TestEntity
          >
        >(),
      );
    const metricsAdapter = instance(mock<IEntityMetricsAdapter>());
    const queryContext = new StubQueryContextProvider().getQueryContext();

    const id1 = uuidv4();
    const databaseAdapter = new StubDatabaseAdapter<TestFields, 'customIdField'>(
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
        ]),
      ),
    );
    const cacheAdapterProvider = new NoCacheStubCacheAdapterProvider();
    const cacheAdapter = cacheAdapterProvider.getCacheAdapter(testEntityConfiguration);
    const entityCache = new ReadThroughEntityCache(testEntityConfiguration, cacheAdapter);
    const dataManager = new EntityDataManager(
      databaseAdapter,
      entityCache,
      new StubQueryContextProvider(),
      instance(mock<IEntityMetricsAdapter>()),
      TestEntity.name,
    );
    const invalidationUtils = new EntityInvalidationUtils(
      testEntityConfiguration,
      TestEntity,
      dataManager,
      metricsAdapter,
    );
    const constructionUtils = new EntityConstructionUtils(
      viewerContext,
      queryContext,
      privacyPolicyEvaluationContext,
      testEntityConfiguration,
      TestEntity,
      /* entitySelectedFields */ undefined,
      privacyPolicy,
      metricsAdapter,
    );
    const entityLoader = new AuthorizationResultBasedEntityLoader(
      queryContext,
      testEntityConfiguration,
      TestEntity,
      dataManager,
      metricsAdapter,
      invalidationUtils,
      constructionUtils,
    );
    const entity = await enforceAsyncResult(entityLoader.loadByIDAsync(id1));
    verify(
      spiedPrivacyPolicy.authorizeReadAsync(
        viewerContext,
        queryContext,
        privacyPolicyEvaluationContext,
        entity,
        anything(),
      ),
    ).once();
  });

  it('invalidates upon invalidate one', async () => {
    const viewerContext = instance(mock(ViewerContext));
    const privacyPolicyEvaluationContext =
      instance(
        mock<
          EntityPrivacyPolicyEvaluationContext<
            TestFields,
            'customIdField',
            ViewerContext,
            TestEntity
          >
        >(),
      );
    const metricsAdapter = instance(mock<IEntityMetricsAdapter>());
    const queryContext = new StubQueryContextProvider().getQueryContext();
    const privacyPolicy = instance(mock(TestEntityPrivacyPolicy));
    const dataManagerMock = mock<EntityDataManager<TestFields, 'customIdField'>>();
    const dataManagerInstance = instance(dataManagerMock);

    const id1 = uuidv4();
    const invalidationUtils = new EntityInvalidationUtils(
      testEntityConfiguration,
      TestEntity,
      dataManagerInstance,
      metricsAdapter,
    );
    const constructionUtils = new EntityConstructionUtils(
      viewerContext,
      queryContext,
      privacyPolicyEvaluationContext,
      testEntityConfiguration,
      TestEntity,
      /* entitySelectedFields */ undefined,
      privacyPolicy,
      metricsAdapter,
    );
    const entityLoader = new AuthorizationResultBasedEntityLoader(
      queryContext,
      testEntityConfiguration,
      TestEntity,
      dataManagerInstance,
      metricsAdapter,
      invalidationUtils,
      constructionUtils,
    );

    const date = new Date();

    await entityLoader.invalidationUtils.invalidateFieldsAsync({
      customIdField: id1,
      testIndexedField: 'h1',
      intField: 5,
      stringField: 'huh',
      dateField: date,
      nullableField: null,
    });

    verify(dataManagerMock.invalidateKeyValuePairsAsync(anything())).once();
    verify(
      dataManagerMock.invalidateKeyValuePairsAsync(
        deepEqualEntityAware([
          [
            new SingleFieldHolder<TestFields, 'customIdField', 'customIdField'>('customIdField'),
            new SingleFieldValueHolder<TestFields, 'customIdField'>(id1),
          ],
          [
            new SingleFieldHolder<TestFields, 'customIdField', 'testIndexedField'>(
              'testIndexedField',
            ),
            new SingleFieldValueHolder<TestFields, 'testIndexedField'>('h1'),
          ],
          [
            new SingleFieldHolder<TestFields, 'customIdField', 'intField'>('intField'),
            new SingleFieldValueHolder<TestFields, 'intField'>(5),
          ],
          [
            new SingleFieldHolder<TestFields, 'customIdField', 'stringField'>('stringField'),
            new SingleFieldValueHolder<TestFields, 'stringField'>('huh'),
          ],
          [
            new SingleFieldHolder<TestFields, 'customIdField', 'dateField'>('dateField'),
            new SingleFieldValueHolder<TestFields, 'dateField'>(date),
          ],
          [
            new CompositeFieldHolder(['stringField', 'intField']),
            new CompositeFieldValueHolder({ stringField: 'huh', intField: 5 }),
          ],
          [
            new CompositeFieldHolder(['stringField', 'testIndexedField']),
            new CompositeFieldValueHolder({ stringField: 'huh', testIndexedField: 'h1' }),
          ],
        ]),
      ),
    ).once();
  });

  it('invalidates upon invalidate by entity', async () => {
    const viewerContext = instance(mock(ViewerContext));
    const privacyPolicyEvaluationContext =
      instance(
        mock<
          EntityPrivacyPolicyEvaluationContext<
            TestFields,
            'customIdField',
            ViewerContext,
            TestEntity
          >
        >(),
      );
    const metricsAdapter = instance(mock<IEntityMetricsAdapter>());
    const queryContext = new StubQueryContextProvider().getQueryContext();
    const privacyPolicy = instance(mock(TestEntityPrivacyPolicy));
    const dataManagerMock = mock<EntityDataManager<TestFields, 'customIdField'>>();
    const dataManagerInstance = instance(dataManagerMock);

    const id1 = uuidv4();
    const entityMock = mock(TestEntity);
    const date = new Date();

    when(entityMock.getAllDatabaseFields()).thenReturn({
      customIdField: id1,
      testIndexedField: 'h1',
      intField: 5,
      stringField: 'huh',
      dateField: date,
      nullableField: null,
    });
    const entityInstance = instance(entityMock);

    const invalidationUtils = new EntityInvalidationUtils(
      testEntityConfiguration,
      TestEntity,
      dataManagerInstance,
      metricsAdapter,
    );
    const constructionUtils = new EntityConstructionUtils(
      viewerContext,
      queryContext,
      privacyPolicyEvaluationContext,
      testEntityConfiguration,
      TestEntity,
      /* entitySelectedFields */ undefined,
      privacyPolicy,
      metricsAdapter,
    );
    const entityLoader = new AuthorizationResultBasedEntityLoader(
      queryContext,
      testEntityConfiguration,
      TestEntity,
      dataManagerInstance,
      metricsAdapter,
      invalidationUtils,
      constructionUtils,
    );
    await entityLoader.invalidationUtils.invalidateEntityAsync(entityInstance);

    verify(dataManagerMock.invalidateKeyValuePairsAsync(anything())).once();
    verify(
      dataManagerMock.invalidateKeyValuePairsAsync(
        deepEqualEntityAware([
          [
            new SingleFieldHolder<TestFields, 'customIdField', 'customIdField'>('customIdField'),
            new SingleFieldValueHolder<TestFields, 'customIdField'>(id1),
          ],
          [
            new SingleFieldHolder<TestFields, 'customIdField', 'testIndexedField'>(
              'testIndexedField',
            ),
            new SingleFieldValueHolder<TestFields, 'testIndexedField'>('h1'),
          ],
          [
            new SingleFieldHolder<TestFields, 'customIdField', 'intField'>('intField'),
            new SingleFieldValueHolder<TestFields, 'intField'>(5),
          ],
          [
            new SingleFieldHolder<TestFields, 'customIdField', 'stringField'>('stringField'),
            new SingleFieldValueHolder<TestFields, 'stringField'>('huh'),
          ],
          [
            new SingleFieldHolder<TestFields, 'customIdField', 'dateField'>('dateField'),
            new SingleFieldValueHolder<TestFields, 'dateField'>(date),
          ],
          [
            new CompositeFieldHolder(['stringField', 'intField']),
            new CompositeFieldValueHolder({ stringField: 'huh', intField: 5 }),
          ],
          [
            new CompositeFieldHolder(['stringField', 'testIndexedField']),
            new CompositeFieldValueHolder({ stringField: 'huh', testIndexedField: 'h1' }),
          ],
        ]),
      ),
    ).once();
  });

  it('invalidates upon invalidate by entity within transaction', async () => {
    const viewerContext = instance(mock(ViewerContext));
    const privacyPolicyEvaluationContext =
      instance(
        mock<
          EntityPrivacyPolicyEvaluationContext<
            TestFields,
            'customIdField',
            ViewerContext,
            TestEntity
          >
        >(),
      );
    const metricsAdapter = instance(mock<IEntityMetricsAdapter>());

    const privacyPolicy = instance(mock(TestEntityPrivacyPolicy));
    const dataManagerMock = mock<EntityDataManager<TestFields, 'customIdField'>>();
    const dataManagerInstance = instance(dataManagerMock);

    const id1 = uuidv4();
    const entityMock = mock(TestEntity);
    const date = new Date();

    when(entityMock.getAllDatabaseFields()).thenReturn({
      customIdField: id1,
      testIndexedField: 'h1',
      intField: 5,
      stringField: 'huh',
      dateField: date,
      nullableField: null,
    });
    const entityInstance = instance(entityMock);

    await new StubQueryContextProvider().runInTransactionAsync(async (queryContext) => {
      const invalidationUtils = new EntityInvalidationUtils(
        testEntityConfiguration,
        TestEntity,
        dataManagerInstance,
        metricsAdapter,
      );
      const constructionUtils = new EntityConstructionUtils(
        viewerContext,
        queryContext,
        privacyPolicyEvaluationContext,
        testEntityConfiguration,
        TestEntity,
        /* entitySelectedFields */ undefined,
        privacyPolicy,
        metricsAdapter,
      );
      const entityLoader = new AuthorizationResultBasedEntityLoader(
        queryContext,
        testEntityConfiguration,
        TestEntity,
        dataManagerInstance,
        metricsAdapter,
        invalidationUtils,
        constructionUtils,
      );
      entityLoader.invalidationUtils.invalidateEntityForTransaction(queryContext, entityInstance);

      verify(
        dataManagerMock.invalidateKeyValuePairsForTransaction(queryContext, anything()),
      ).once();
      verify(
        dataManagerMock.invalidateKeyValuePairsForTransaction(
          queryContext,
          deepEqualEntityAware([
            [
              new SingleFieldHolder<TestFields, 'customIdField', 'customIdField'>('customIdField'),
              new SingleFieldValueHolder<TestFields, 'customIdField'>(id1),
            ],
            [
              new SingleFieldHolder<TestFields, 'customIdField', 'testIndexedField'>(
                'testIndexedField',
              ),
              new SingleFieldValueHolder<TestFields, 'testIndexedField'>('h1'),
            ],
            [
              new SingleFieldHolder<TestFields, 'customIdField', 'intField'>('intField'),
              new SingleFieldValueHolder<TestFields, 'intField'>(5),
            ],
            [
              new SingleFieldHolder<TestFields, 'customIdField', 'stringField'>('stringField'),
              new SingleFieldValueHolder<TestFields, 'stringField'>('huh'),
            ],
            [
              new SingleFieldHolder<TestFields, 'customIdField', 'dateField'>('dateField'),
              new SingleFieldValueHolder<TestFields, 'dateField'>(date),
            ],
            [
              new CompositeFieldHolder(['stringField', 'intField']),
              new CompositeFieldValueHolder({ stringField: 'huh', intField: 5 }),
            ],
            [
              new CompositeFieldHolder(['stringField', 'testIndexedField']),
              new CompositeFieldValueHolder({ stringField: 'huh', testIndexedField: 'h1' }),
            ],
          ]),
        ),
      ).once();
    });
  });

  it('returns error result when not allowed', async () => {
    const viewerContext = instance(mock(ViewerContext));
    const privacyPolicyEvaluationContext =
      instance(
        mock<
          EntityPrivacyPolicyEvaluationContext<
            TestFields,
            'customIdField',
            ViewerContext,
            TestEntity
          >
        >(),
      );
    const metricsAdapter = instance(mock<IEntityMetricsAdapter>());
    const queryContext = new StubQueryContextProvider().getQueryContext();
    const privacyPolicyMock = mock(TestEntityPrivacyPolicy);
    const dataManagerMock = mock<EntityDataManager<TestFields, 'customIdField'>>();

    const id1 = uuidv4();
    when(dataManagerMock.loadManyEqualingAsync(anything(), anything(), anything())).thenResolve(
      new SingleFieldValueHolderMap<
        TestFields,
        'customIdField',
        readonly Readonly<TestFields>[]
      >().set(new SingleFieldValueHolder(id1), [
        {
          customIdField: id1,
          testIndexedField: '',
          stringField: '',
          intField: 0,
          dateField: new Date(),
          nullableField: null,
        },
      ]),
    );

    const rejectionError = new Error();

    when(
      privacyPolicyMock.authorizeReadAsync(
        viewerContext,
        queryContext,
        privacyPolicyEvaluationContext,
        anyOfClass(TestEntity),
        anything(),
      ),
    ).thenReject(rejectionError);

    const privacyPolicy = instance(privacyPolicyMock);
    const dataManagerInstance = instance(dataManagerMock);

    const invalidationUtils = new EntityInvalidationUtils(
      testEntityConfiguration,
      TestEntity,
      dataManagerInstance,
      metricsAdapter,
    );
    const constructionUtils = new EntityConstructionUtils(
      viewerContext,
      queryContext,
      privacyPolicyEvaluationContext,
      testEntityConfiguration,
      TestEntity,
      /* entitySelectedFields */ undefined,
      privacyPolicy,
      metricsAdapter,
    );
    const entityLoader = new AuthorizationResultBasedEntityLoader(
      queryContext,
      testEntityConfiguration,
      TestEntity,
      dataManagerInstance,
      metricsAdapter,
      invalidationUtils,
      constructionUtils,
    );

    const entityResult = await entityLoader.loadByIDAsync(id1);
    expect(entityResult.ok).toBe(false);
    expect(entityResult.reason).toEqual(rejectionError);
    expect(entityResult.value).toBe(undefined);
  });

  it('throws upon database adapter error', async () => {
    const viewerContext = instance(mock(ViewerContext));
    const privacyPolicyEvaluationContext =
      instance(
        mock<
          EntityPrivacyPolicyEvaluationContext<
            TestFields,
            'customIdField',
            ViewerContext,
            TestEntity
          >
        >(),
      );
    const metricsAdapter = instance(mock<IEntityMetricsAdapter>());
    const queryContext = new StubQueryContextProvider().getQueryContext();
    const privacyPolicy = instance(mock(TestEntityPrivacyPolicy));
    const dataManagerMock = mock<EntityDataManager<TestFields, 'customIdField'>>();

    const error = new Error();

    when(dataManagerMock.loadManyEqualingAsync(anything(), anything(), anything())).thenReject(
      error,
    );

    const dataManagerInstance = instance(dataManagerMock);

    const invalidationUtils = new EntityInvalidationUtils(
      testEntityConfiguration,
      TestEntity,
      dataManagerInstance,
      metricsAdapter,
    );
    const constructionUtils = new EntityConstructionUtils(
      viewerContext,
      queryContext,
      privacyPolicyEvaluationContext,
      testEntityConfiguration,
      TestEntity,
      /* entitySelectedFields */ undefined,
      privacyPolicy,
      metricsAdapter,
    );
    const entityLoader = new AuthorizationResultBasedEntityLoader(
      queryContext,
      testEntityConfiguration,
      TestEntity,
      dataManagerInstance,
      metricsAdapter,
      invalidationUtils,
      constructionUtils,
    );

    const loadByValue = uuidv4();

    await expect(entityLoader.loadByIDAsync(loadByValue)).rejects.toEqual(error);
    await expect(entityLoader.loadManyByIDsAsync([loadByValue])).rejects.toEqual(error);
    await expect(entityLoader.loadManyByIDsNullableAsync([loadByValue])).rejects.toEqual(error);
    await expect(
      entityLoader.loadManyByFieldEqualingAsync('customIdField', loadByValue),
    ).rejects.toEqual(error);
    await expect(
      entityLoader.loadManyByFieldEqualingManyAsync('customIdField', [loadByValue]),
    ).rejects.toEqual(error);
  });
});
