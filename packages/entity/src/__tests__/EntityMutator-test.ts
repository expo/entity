import { enforceAsyncResult } from '@expo/results';
import {
  mock,
  spy,
  verify,
  anyOfClass,
  instance,
  when,
  anything,
  objectContaining,
} from 'ts-mockito';

import EntityDatabaseAdapter from '../EntityDatabaseAdapter';
import EntityLoaderFactory from '../EntityLoaderFactory';
import EntityMutatorFactory from '../EntityMutatorFactory';
import { EntityQueryContext, EntityNonTransactionalQueryContext } from '../EntityQueryContext';
import ViewerContext from '../ViewerContext';
import { enforceResultsAsync } from '../entityUtils';
import EntityDataManager from '../internal/EntityDataManager';
import ReadThroughEntityCache from '../internal/ReadThroughEntityCache';
import IEntityMetricsAdapter, { EntityMetricsMutationType } from '../metrics/IEntityMetricsAdapter';
import NoOpEntityMetricsAdapter from '../metrics/NoOpEntityMetricsAdapter';
import SimpleTestEntity, {
  simpleTestEntityConfiguration,
  SimpleTestEntityPrivacyPolicy,
  SimpleTestFields,
} from '../testfixtures/SimpleTestEntity';
import TestEntity, {
  TestFields,
  TestEntityPrivacyPolicy,
  testEntityConfiguration,
} from '../testfixtures/TestEntity';
import { NoCacheStubCacheAdapterProvider } from '../utils/testing/StubCacheAdapter';
import StubDatabaseAdapter from '../utils/testing/StubDatabaseAdapter';
import StubQueryContextProvider from '../utils/testing/StubQueryContextProvider';

const createEntityMutatorFactory = (
  existingObjects: TestFields[]
): {
  privacyPolicy: TestEntityPrivacyPolicy;
  entityLoaderFactory: EntityLoaderFactory<
    TestFields,
    string,
    ViewerContext,
    TestEntity,
    TestEntityPrivacyPolicy
  >;
  entityMutatorFactory: EntityMutatorFactory<
    TestFields,
    string,
    ViewerContext,
    TestEntity,
    TestEntityPrivacyPolicy
  >;
  metricsAdapter: IEntityMetricsAdapter;
} => {
  const privacyPolicy = new TestEntityPrivacyPolicy();
  const databaseAdapter = new StubDatabaseAdapter<TestFields>(
    testEntityConfiguration,
    existingObjects
  );
  const metricsAdapter = new NoOpEntityMetricsAdapter();
  const cacheAdapterProvider = new NoCacheStubCacheAdapterProvider();
  const cacheAdapter = cacheAdapterProvider.getCacheAdapter(testEntityConfiguration);
  const entityCache = new ReadThroughEntityCache<TestFields>(testEntityConfiguration, cacheAdapter);
  const dataManager = new EntityDataManager(
    databaseAdapter,
    entityCache,
    StubQueryContextProvider,
    metricsAdapter
  );
  const entityLoaderFactory = new EntityLoaderFactory(
    testEntityConfiguration,
    TestEntity,
    privacyPolicy,
    dataManager
  );
  const entityMutatorFactory = new EntityMutatorFactory(
    testEntityConfiguration,
    TestEntity,
    privacyPolicy,
    entityLoaderFactory,
    databaseAdapter,
    metricsAdapter
  );
  return {
    privacyPolicy,
    entityLoaderFactory,
    entityMutatorFactory,
    metricsAdapter,
  };
};

describe(EntityMutatorFactory, () => {
  it('creates entities and checks privacy', async () => {
    const viewerContext = mock<ViewerContext>();
    const queryContext = mock<EntityQueryContext>();
    const { privacyPolicy, entityMutatorFactory } = createEntityMutatorFactory([
      {
        customIdField: 'hello',
        stringField: 'huh',
        testIndexedField: '4',
        numberField: 1,
        dateField: new Date(),
      },
      {
        customIdField: 'world',
        stringField: 'huh',
        testIndexedField: '5',
        numberField: 1,
        dateField: new Date(),
      },
    ]);

    const spiedPrivacyPolicy = spy(privacyPolicy);

    const newEntity = await entityMutatorFactory
      .forCreate(viewerContext, queryContext)
      .setField('stringField', 'huh')
      .enforceCreateAsync();

    expect(newEntity).toBeTruthy();

    verify(
      spiedPrivacyPolicy.authorizeCreateAsync(viewerContext, queryContext, anyOfClass(TestEntity))
    ).once();
  });

  it('updates entities and checks privacy', async () => {
    const viewerContext = mock<ViewerContext>();
    const queryContext = mock<EntityQueryContext>();
    const { privacyPolicy, entityMutatorFactory, entityLoaderFactory } = createEntityMutatorFactory(
      [
        {
          customIdField: 'hello',
          stringField: 'huh',
          testIndexedField: '3',
          numberField: 3,
          dateField: new Date(),
        },
        {
          customIdField: 'world',
          stringField: 'huh',
          testIndexedField: '4',
          numberField: 3,
          dateField: new Date(),
        },
      ]
    );

    const spiedPrivacyPolicy = spy(privacyPolicy);

    const existingEntity = await enforceAsyncResult(
      entityLoaderFactory.forLoad(viewerContext, queryContext).loadByIDAsync('world')
    );

    const updatedEntity = await entityMutatorFactory
      .forUpdate(existingEntity, queryContext)
      .setField('stringField', 'huh2')
      .enforceUpdateAsync();

    expect(updatedEntity).toBeTruthy();
    expect(updatedEntity.getAllFields()).not.toMatchObject(existingEntity.getAllFields());
    expect(updatedEntity.getField('stringField')).toEqual('huh2');

    const reloadedEntity = await enforceAsyncResult(
      entityLoaderFactory.forLoad(viewerContext, queryContext).loadByIDAsync('world')
    );
    expect(reloadedEntity.getAllFields()).toMatchObject(updatedEntity.getAllFields());

    verify(
      spiedPrivacyPolicy.authorizeUpdateAsync(viewerContext, queryContext, anyOfClass(TestEntity))
    ).once();
  });

  it('deletes entities and checks privacy', async () => {
    const viewerContext = mock<ViewerContext>();
    const queryContext = mock<EntityQueryContext>();
    const { privacyPolicy, entityMutatorFactory, entityLoaderFactory } = createEntityMutatorFactory(
      [
        {
          customIdField: 'world',
          stringField: 'huh',
          testIndexedField: '3',
          numberField: 3,
          dateField: new Date(),
        },
      ]
    );

    const spiedPrivacyPolicy = spy(privacyPolicy);

    const existingEntity = await enforceAsyncResult(
      entityLoaderFactory.forLoad(viewerContext, queryContext).loadByIDAsync('world')
    );
    expect(existingEntity).toBeTruthy();

    await entityMutatorFactory.forDelete(existingEntity, queryContext).enforceDeleteAsync();

    await expect(
      enforceAsyncResult(
        entityLoaderFactory.forLoad(viewerContext, queryContext).loadByIDAsync('world')
      )
    ).rejects.toBeInstanceOf(Error);

    verify(
      spiedPrivacyPolicy.authorizeDeleteAsync(viewerContext, queryContext, anyOfClass(TestEntity))
    ).once();
  });

  it('invalidates cache for fields upon create', async () => {
    const viewerContext = mock<ViewerContext>();
    const queryContext = mock<EntityQueryContext>();
    const { entityMutatorFactory, entityLoaderFactory } = createEntityMutatorFactory([
      {
        customIdField: 'world',
        stringField: 'huh',
        testIndexedField: '3',
        numberField: 3,
        dateField: new Date(),
      },
    ]);

    const entites1 = await enforceResultsAsync(
      entityLoaderFactory
        .forLoad(viewerContext, queryContext)
        .loadManyByFieldEqualingAsync('stringField', 'huh')
    );
    expect(entites1).toHaveLength(1);

    await enforceAsyncResult(
      entityMutatorFactory
        .forCreate(viewerContext, queryContext)
        .setField('stringField', 'huh')
        .createAsync()
    );

    const entities2 = await enforceResultsAsync(
      entityLoaderFactory
        .forLoad(viewerContext, queryContext)
        .loadManyByFieldEqualingAsync('stringField', 'huh')
    );
    expect(entities2).toHaveLength(2);
  });

  it('returns error result when not authorized to create', async () => {
    const viewerContext = instance(mock(ViewerContext));
    const queryContext = instance(mock(EntityNonTransactionalQueryContext));
    const privacyPolicyMock = mock(SimpleTestEntityPrivacyPolicy);
    const databaseAdapter = instance(mock(EntityDatabaseAdapter));
    const metricsAdapter = instance(mock<IEntityMetricsAdapter>());
    const entityLoaderFactory = instance(
      mock<
        EntityLoaderFactory<
          SimpleTestFields,
          string,
          ViewerContext,
          SimpleTestEntity,
          SimpleTestEntityPrivacyPolicy
        >
      >(EntityLoaderFactory)
    );

    const rejectionError = new Error();

    when(
      privacyPolicyMock.authorizeCreateAsync(
        viewerContext,
        queryContext,
        anyOfClass(SimpleTestEntity)
      )
    ).thenReject(rejectionError);
    when(
      privacyPolicyMock.authorizeUpdateAsync(
        viewerContext,
        queryContext,
        anyOfClass(SimpleTestEntity)
      )
    ).thenReject(rejectionError);
    when(
      privacyPolicyMock.authorizeDeleteAsync(
        viewerContext,
        queryContext,
        anyOfClass(SimpleTestEntity)
      )
    ).thenReject(rejectionError);

    const entityMutatorFactory = new EntityMutatorFactory(
      simpleTestEntityConfiguration,
      SimpleTestEntity,
      instance(privacyPolicyMock),
      entityLoaderFactory,
      databaseAdapter,
      metricsAdapter
    );

    const entityCreateResult = await entityMutatorFactory
      .forCreate(viewerContext, queryContext)
      .createAsync();
    expect(entityCreateResult.ok).toBe(false);
    expect(entityCreateResult.reason).toEqual(rejectionError);
    expect(entityCreateResult.value).toBe(undefined);

    const fakeEntity = new SimpleTestEntity(viewerContext, {
      id: 'hello',
    });

    const entityUpdateResult = await entityMutatorFactory
      .forUpdate(fakeEntity, queryContext)
      .updateAsync();
    expect(entityUpdateResult.ok).toBe(false);
    expect(entityUpdateResult.reason).toEqual(rejectionError);
    expect(entityUpdateResult.value).toBe(undefined);

    const entityDeleteResult = await entityMutatorFactory
      .forDelete(fakeEntity, queryContext)
      .deleteAsync();
    expect(entityDeleteResult.ok).toBe(false);
    expect(entityDeleteResult.reason).toEqual(rejectionError);
    expect(entityDeleteResult.value).toBe(undefined);
  });

  it('throws error when db adapter throws', async () => {
    const viewerContext = instance(mock(ViewerContext));
    const queryContext = instance(mock(EntityNonTransactionalQueryContext));
    const privacyPolicy = instance(mock(SimpleTestEntityPrivacyPolicy));
    const databaseAdapterMock = mock(EntityDatabaseAdapter);
    const metricsAdapter = instance(mock<IEntityMetricsAdapter>());
    const entityLoaderFactory = instance(
      mock<
        EntityLoaderFactory<
          SimpleTestFields,
          string,
          ViewerContext,
          SimpleTestEntity,
          SimpleTestEntityPrivacyPolicy
        >
      >(EntityLoaderFactory)
    );

    const rejectionError = new Error();

    when(databaseAdapterMock.insertAsync(queryContext, anything())).thenReject(rejectionError);
    when(
      databaseAdapterMock.updateAsync(queryContext, anything(), anything(), anything())
    ).thenReject(rejectionError);
    when(databaseAdapterMock.deleteAsync(queryContext, anything(), anything())).thenReject(
      rejectionError
    );

    const entityMutatorFactory = new EntityMutatorFactory(
      simpleTestEntityConfiguration,
      SimpleTestEntity,
      privacyPolicy,
      entityLoaderFactory,
      instance(databaseAdapterMock),
      metricsAdapter
    );

    const fakeEntity = new SimpleTestEntity(viewerContext, {
      id: 'hello',
    });

    await expect(
      entityMutatorFactory.forCreate(viewerContext, queryContext).createAsync()
    ).rejects.toEqual(rejectionError);
    await expect(
      entityMutatorFactory.forUpdate(fakeEntity, queryContext).updateAsync()
    ).rejects.toEqual(rejectionError);
    await expect(
      entityMutatorFactory.forDelete(fakeEntity, queryContext).deleteAsync()
    ).rejects.toEqual(rejectionError);
  });

  it('records metrics appropriately', async () => {
    const viewerContext = mock<ViewerContext>();
    const queryContext = mock<EntityQueryContext>();
    const { entityMutatorFactory, metricsAdapter } = createEntityMutatorFactory([]);
    const spiedMetricsAdapter = spy(metricsAdapter);

    const newEntity = await enforceAsyncResult(
      entityMutatorFactory
        .forCreate(viewerContext, queryContext)
        .setField('stringField', 'huh')
        .createAsync()
    );

    await enforceAsyncResult(
      entityMutatorFactory
        .forUpdate(newEntity, queryContext)
        .setField('stringField', 'wat')
        .updateAsync()
    );

    await enforceAsyncResult(entityMutatorFactory.forDelete(newEntity, queryContext).deleteAsync());

    verify(
      spiedMetricsAdapter.logMutatorMutationEvent(
        objectContaining({
          type: EntityMetricsMutationType.CREATE,
        })
      )
    ).once();
    verify(
      spiedMetricsAdapter.logMutatorMutationEvent(
        objectContaining({
          type: EntityMetricsMutationType.UPDATE,
        })
      )
    ).once();
    verify(
      spiedMetricsAdapter.logMutatorMutationEvent(
        objectContaining({
          type: EntityMetricsMutationType.DELETE,
        })
      )
    ).once();
    verify(spiedMetricsAdapter.logMutatorMutationEvent(anything())).thrice();
  });
});
