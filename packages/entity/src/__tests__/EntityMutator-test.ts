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
import {
  EntityMutationTriggerConfiguration,
  EntityMutationTrigger,
} from '../EntityMutationTrigger';
import EntityMutatorFactory from '../EntityMutatorFactory';
import {
  EntityTransactionalQueryContext,
  EntityQueryContext,
  EntityNonTransactionalQueryContext,
} from '../EntityQueryContext';
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

class TestMutationTrigger extends EntityMutationTrigger<
  TestFields,
  string,
  ViewerContext,
  TestEntity,
  keyof TestFields
> {
  async executeAsync(
    _viewerContext: ViewerContext,
    _queryContext: EntityQueryContext,
    _entity: TestEntity
  ): Promise<void> {}
}

const setUpMutationTriggerSpies = (
  mutationTriggers: EntityMutationTriggerConfiguration<
    TestFields,
    string,
    ViewerContext,
    TestEntity,
    keyof TestFields
  >
): EntityMutationTriggerConfiguration<
  TestFields,
  string,
  ViewerContext,
  TestEntity,
  keyof TestFields
> => {
  return {
    beforeCreate: [spy(mutationTriggers.beforeCreate![0])],
    afterCreate: [spy(mutationTriggers.afterCreate![0])],
    beforeUpdate: [spy(mutationTriggers.beforeUpdate![0])],
    afterUpdate: [spy(mutationTriggers.afterUpdate![0])],
    beforeDelete: [spy(mutationTriggers.beforeDelete![0])],
    afterDelete: [spy(mutationTriggers.afterDelete![0])],
    beforeAll: [spy(mutationTriggers.beforeAll![0])],
    afterAll: [spy(mutationTriggers.afterAll![0])],
    afterCommit: [spy(mutationTriggers.afterCommit![0])],
  };
};

const verifyTriggerCounts = (
  viewerContext: ViewerContext,
  mutationTriggerSpies: EntityMutationTriggerConfiguration<
    TestFields,
    string,
    ViewerContext,
    TestEntity,
    keyof TestFields
  >,
  executed: Record<
    keyof Pick<
      EntityMutationTriggerConfiguration<
        TestFields,
        string,
        ViewerContext,
        TestEntity,
        keyof TestFields
      >,
      | 'beforeCreate'
      | 'afterCreate'
      | 'beforeUpdate'
      | 'afterUpdate'
      | 'beforeDelete'
      | 'afterDelete'
    >,
    boolean
  >
): void => {
  Object.keys(executed).forEach((s) => {
    if ((executed as any)[s]) {
      verify(
        (mutationTriggerSpies as any)[s]![0].executeAsync(
          viewerContext,
          anyOfClass(EntityTransactionalQueryContext),
          anyOfClass(TestEntity)
        )
      ).once();
    } else {
      verify(
        (mutationTriggerSpies as any)[s]![0].executeAsync(
          viewerContext,
          anyOfClass(EntityTransactionalQueryContext),
          anyOfClass(TestEntity)
        )
      ).never();
    }
  });

  verify(
    mutationTriggerSpies.beforeAll![0].executeAsync(
      viewerContext,
      anyOfClass(EntityTransactionalQueryContext),
      anyOfClass(TestEntity)
    )
  ).once();

  verify(
    mutationTriggerSpies.afterAll![0].executeAsync(
      viewerContext,
      anyOfClass(EntityTransactionalQueryContext),
      anyOfClass(TestEntity)
    )
  ).once();

  verify(
    mutationTriggerSpies.afterCommit![0].executeAsync(
      viewerContext,
      anyOfClass(EntityNonTransactionalQueryContext),
      anyOfClass(TestEntity)
    )
  ).once();
};

const createEntityMutatorFactory = (
  existingObjects: TestFields[]
): {
  privacyPolicy: TestEntityPrivacyPolicy;
  entityLoaderFactory: EntityLoaderFactory<
    TestFields,
    string,
    ViewerContext,
    TestEntity,
    TestEntityPrivacyPolicy,
    keyof TestFields
  >;
  entityMutatorFactory: EntityMutatorFactory<
    TestFields,
    string,
    ViewerContext,
    TestEntity,
    TestEntityPrivacyPolicy
  >;
  metricsAdapter: IEntityMetricsAdapter;
  mutationTriggers: EntityMutationTriggerConfiguration<
    TestFields,
    string,
    ViewerContext,
    TestEntity,
    keyof TestFields
  >;
} => {
  const mutationTriggers: EntityMutationTriggerConfiguration<
    TestFields,
    string,
    ViewerContext,
    TestEntity,
    keyof TestFields
  > = {
    beforeCreate: [new TestMutationTrigger()],
    afterCreate: [new TestMutationTrigger()],
    beforeUpdate: [new TestMutationTrigger()],
    afterUpdate: [new TestMutationTrigger()],
    beforeDelete: [new TestMutationTrigger()],
    afterDelete: [new TestMutationTrigger()],
    beforeAll: [new TestMutationTrigger()],
    afterAll: [new TestMutationTrigger()],
    afterCommit: [new TestMutationTrigger()],
  };
  const privacyPolicy = new TestEntityPrivacyPolicy();
  const databaseAdapter = new StubDatabaseAdapter<TestFields>(
    testEntityConfiguration,
    StubDatabaseAdapter.convertFieldObjectsToDataStore(
      testEntityConfiguration,
      new Map([[testEntityConfiguration.tableName, existingObjects]])
    )
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
    testEntityConfiguration.idField,
    TestEntity,
    privacyPolicy,
    dataManager
  );
  const entityMutatorFactory = new EntityMutatorFactory(
    testEntityConfiguration,
    TestEntity,
    privacyPolicy,
    mutationTriggers,
    entityLoaderFactory,
    databaseAdapter,
    metricsAdapter
  );
  return {
    privacyPolicy,
    entityLoaderFactory,
    entityMutatorFactory,
    metricsAdapter,
    mutationTriggers,
  };
};

describe(EntityMutatorFactory, () => {
  describe('forCreate', () => {
    it('creates entities', async () => {
      const viewerContext = mock<ViewerContext>();
      const queryContext = StubQueryContextProvider.getQueryContext();
      const { entityMutatorFactory } = createEntityMutatorFactory([
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
      const newEntity = await entityMutatorFactory
        .forCreate(viewerContext, queryContext)
        .setField('stringField', 'huh')
        .enforceCreateAsync();
      expect(newEntity).toBeTruthy();
    });

    it('checks privacy', async () => {
      const viewerContext = mock<ViewerContext>();
      const queryContext = StubQueryContextProvider.getQueryContext();
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

      await entityMutatorFactory
        .forCreate(viewerContext, queryContext)
        .setField('stringField', 'huh')
        .enforceCreateAsync();

      verify(
        spiedPrivacyPolicy.authorizeCreateAsync(
          viewerContext,
          anyOfClass(EntityTransactionalQueryContext),
          anyOfClass(TestEntity)
        )
      ).once();
    });

    it('executes triggers', async () => {
      const viewerContext = mock<ViewerContext>();
      const queryContext = StubQueryContextProvider.getQueryContext();
      const { mutationTriggers, entityMutatorFactory } = createEntityMutatorFactory([
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

      const triggerSpies = setUpMutationTriggerSpies(mutationTriggers);

      await entityMutatorFactory
        .forCreate(viewerContext, queryContext)
        .setField('stringField', 'huh')
        .enforceCreateAsync();

      verifyTriggerCounts(viewerContext, triggerSpies, {
        beforeCreate: true,
        afterCreate: true,
        beforeUpdate: false,
        afterUpdate: false,
        beforeDelete: false,
        afterDelete: false,
      });
    });
  });

  describe('forUpdate', () => {
    it('updates entities', async () => {
      const viewerContext = mock<ViewerContext>();
      const queryContext = StubQueryContextProvider.getQueryContext();
      const { entityMutatorFactory, entityLoaderFactory } = createEntityMutatorFactory([
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
      ]);

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
    });

    it('checks privacy', async () => {
      const viewerContext = mock<ViewerContext>();
      const queryContext = StubQueryContextProvider.getQueryContext();
      const {
        privacyPolicy,
        entityMutatorFactory,
        entityLoaderFactory,
      } = createEntityMutatorFactory([
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
      ]);

      const spiedPrivacyPolicy = spy(privacyPolicy);

      const existingEntity = await enforceAsyncResult(
        entityLoaderFactory.forLoad(viewerContext, queryContext).loadByIDAsync('world')
      );

      await entityMutatorFactory
        .forUpdate(existingEntity, queryContext)
        .setField('stringField', 'huh2')
        .enforceUpdateAsync();

      verify(
        spiedPrivacyPolicy.authorizeUpdateAsync(
          viewerContext,
          anyOfClass(EntityTransactionalQueryContext),
          anyOfClass(TestEntity)
        )
      ).once();
    });

    it('executes triggers', async () => {
      const viewerContext = mock<ViewerContext>();
      const queryContext = StubQueryContextProvider.getQueryContext();
      const {
        mutationTriggers,
        entityMutatorFactory,
        entityLoaderFactory,
      } = createEntityMutatorFactory([
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
      ]);

      const triggerSpies = setUpMutationTriggerSpies(mutationTriggers);

      const existingEntity = await enforceAsyncResult(
        entityLoaderFactory.forLoad(viewerContext, queryContext).loadByIDAsync('world')
      );

      await entityMutatorFactory
        .forUpdate(existingEntity, queryContext)
        .setField('stringField', 'huh2')
        .enforceUpdateAsync();

      verifyTriggerCounts(viewerContext, triggerSpies, {
        beforeCreate: false,
        afterCreate: false,
        beforeUpdate: true,
        afterUpdate: true,
        beforeDelete: false,
        afterDelete: false,
      });
    });
  });

  describe('forDelete', () => {
    it('deletes entities', async () => {
      const viewerContext = mock<ViewerContext>();
      const queryContext = StubQueryContextProvider.getQueryContext();
      const { entityMutatorFactory, entityLoaderFactory } = createEntityMutatorFactory([
        {
          customIdField: 'world',
          stringField: 'huh',
          testIndexedField: '3',
          numberField: 3,
          dateField: new Date(),
        },
      ]);

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
    });

    it('checks privacy', async () => {
      const viewerContext = mock<ViewerContext>();
      const queryContext = StubQueryContextProvider.getQueryContext();
      const {
        privacyPolicy,
        entityMutatorFactory,
        entityLoaderFactory,
      } = createEntityMutatorFactory([
        {
          customIdField: 'world',
          stringField: 'huh',
          testIndexedField: '3',
          numberField: 3,
          dateField: new Date(),
        },
      ]);

      const spiedPrivacyPolicy = spy(privacyPolicy);

      const existingEntity = await enforceAsyncResult(
        entityLoaderFactory.forLoad(viewerContext, queryContext).loadByIDAsync('world')
      );

      await entityMutatorFactory.forDelete(existingEntity, queryContext).enforceDeleteAsync();

      verify(
        spiedPrivacyPolicy.authorizeDeleteAsync(
          viewerContext,
          anyOfClass(EntityTransactionalQueryContext),
          anyOfClass(TestEntity)
        )
      ).once();
    });

    it('executes triggers', async () => {
      const viewerContext = mock<ViewerContext>();
      const queryContext = StubQueryContextProvider.getQueryContext();
      const {
        mutationTriggers,
        entityMutatorFactory,
        entityLoaderFactory,
      } = createEntityMutatorFactory([
        {
          customIdField: 'world',
          stringField: 'huh',
          testIndexedField: '3',
          numberField: 3,
          dateField: new Date(),
        },
      ]);

      const triggerSpies = setUpMutationTriggerSpies(mutationTriggers);

      const existingEntity = await enforceAsyncResult(
        entityLoaderFactory.forLoad(viewerContext, queryContext).loadByIDAsync('world')
      );

      await entityMutatorFactory.forDelete(existingEntity, queryContext).enforceDeleteAsync();

      verifyTriggerCounts(viewerContext, triggerSpies, {
        beforeCreate: false,
        afterCreate: false,
        beforeUpdate: false,
        afterUpdate: false,
        beforeDelete: true,
        afterDelete: true,
      });
    });
  });

  it('invalidates cache for fields upon create', async () => {
    const viewerContext = mock<ViewerContext>();
    const queryContext = StubQueryContextProvider.getQueryContext();
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
    const queryContext = StubQueryContextProvider.getQueryContext();
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
          SimpleTestEntityPrivacyPolicy,
          keyof SimpleTestFields
        >
      >(EntityLoaderFactory)
    );

    const rejectionError = new Error();

    when(
      privacyPolicyMock.authorizeCreateAsync(
        viewerContext,
        anyOfClass(EntityTransactionalQueryContext),
        anyOfClass(SimpleTestEntity)
      )
    ).thenReject(rejectionError);
    when(
      privacyPolicyMock.authorizeUpdateAsync(
        viewerContext,
        anyOfClass(EntityTransactionalQueryContext),
        anyOfClass(SimpleTestEntity)
      )
    ).thenReject(rejectionError);
    when(
      privacyPolicyMock.authorizeDeleteAsync(
        viewerContext,
        anyOfClass(EntityTransactionalQueryContext),
        anyOfClass(SimpleTestEntity)
      )
    ).thenReject(rejectionError);

    const entityMutatorFactory = new EntityMutatorFactory(
      simpleTestEntityConfiguration,
      SimpleTestEntity,
      instance(privacyPolicyMock),
      {},
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
    const queryContext = StubQueryContextProvider.getQueryContext();
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
          SimpleTestEntityPrivacyPolicy,
          keyof SimpleTestFields
        >
      >(EntityLoaderFactory)
    );

    const rejectionError = new Error();

    when(
      databaseAdapterMock.insertAsync(anyOfClass(EntityTransactionalQueryContext), anything())
    ).thenReject(rejectionError);
    when(
      databaseAdapterMock.updateAsync(
        anyOfClass(EntityTransactionalQueryContext),
        anything(),
        anything(),
        anything()
      )
    ).thenReject(rejectionError);
    when(
      databaseAdapterMock.deleteAsync(
        anyOfClass(EntityTransactionalQueryContext),
        anything(),
        anything()
      )
    ).thenReject(rejectionError);

    const entityMutatorFactory = new EntityMutatorFactory(
      simpleTestEntityConfiguration,
      SimpleTestEntity,
      privacyPolicy,
      {},
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
    const queryContext = StubQueryContextProvider.getQueryContext();
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
