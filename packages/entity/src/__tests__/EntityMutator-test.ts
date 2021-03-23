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
  deepEqual,
} from 'ts-mockito';
import { v4 as uuidv4 } from 'uuid';

import EntityDatabaseAdapter from '../EntityDatabaseAdapter';
import EntityLoaderFactory from '../EntityLoaderFactory';
import EntityMutationTriggerConfiguration, {
  EntityMutationTrigger,
  EntityNonTransactionalMutationTrigger,
} from '../EntityMutationTriggerConfiguration';
import EntityMutationValidator from '../EntityMutationValidator';
import { EntityMutationInfo, EntityMutationType } from '../EntityMutator';
import EntityMutatorFactory from '../EntityMutatorFactory';
import { EntityTransactionalQueryContext, EntityQueryContext } from '../EntityQueryContext';
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
    _entity: TestEntity,
    _mutationInfo: EntityMutationInfo<
      TestFields,
      string,
      ViewerContext,
      TestEntity,
      keyof TestFields
    >
  ): Promise<void> {}
}

class TestNonTransactionalMutationTrigger extends EntityNonTransactionalMutationTrigger<
  TestFields,
  string,
  ViewerContext,
  TestEntity,
  keyof TestFields
> {
  async executeAsync(_viewerContext: ViewerContext, _entity: TestEntity): Promise<void> {}
}

const setUpMutationValidatorSpies = (
  mutationValidators: EntityMutationValidator<
    TestFields,
    string,
    ViewerContext,
    TestEntity,
    keyof TestFields
  >[]
): EntityMutationValidator<TestFields, string, ViewerContext, TestEntity, keyof TestFields>[] => {
  return mutationValidators.map((validator) => spy(validator));
};

const verifyValidatorCounts = (
  viewerContext: ViewerContext,
  mutationValidatorSpies: EntityMutationValidator<
    TestFields,
    string,
    ViewerContext,
    TestEntity,
    keyof TestFields
  >[],
  expectedCalls: number,
  mutationInfo: EntityMutationInfo<TestFields, string, ViewerContext, TestEntity, keyof TestFields>
): void => {
  for (const validator of mutationValidatorSpies) {
    verify(
      validator.executeAsync(
        viewerContext,
        anyOfClass(EntityTransactionalQueryContext),
        anyOfClass(TestEntity),
        deepEqual(mutationInfo)
      )
    ).times(expectedCalls);
  }
};

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
  >,
  mutationInfo: EntityMutationInfo<TestFields, string, ViewerContext, TestEntity, keyof TestFields>
): void => {
  Object.keys(executed).forEach((s) => {
    if ((executed as any)[s]) {
      verify(
        (mutationTriggerSpies as any)[s]![0].executeAsync(
          viewerContext,
          anyOfClass(EntityTransactionalQueryContext),
          anyOfClass(TestEntity),
          deepEqual(mutationInfo)
        )
      ).once();
    } else {
      verify(
        (mutationTriggerSpies as any)[s]![0].executeAsync(
          viewerContext,
          anyOfClass(EntityTransactionalQueryContext),
          anyOfClass(TestEntity),
          deepEqual(mutationInfo)
        )
      ).never();
    }
  });

  verify(
    mutationTriggerSpies.beforeAll![0].executeAsync(
      viewerContext,
      anyOfClass(EntityTransactionalQueryContext),
      anyOfClass(TestEntity),
      deepEqual(mutationInfo)
    )
  ).once();

  verify(
    mutationTriggerSpies.afterAll![0].executeAsync(
      viewerContext,
      anyOfClass(EntityTransactionalQueryContext),
      anyOfClass(TestEntity),
      deepEqual(mutationInfo)
    )
  ).once();

  verify(
    mutationTriggerSpies.afterCommit![0].executeAsync(
      viewerContext,
      anyOfClass(TestEntity),
      deepEqual(mutationInfo)
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
  mutationValidators: EntityMutationValidator<
    TestFields,
    string,
    ViewerContext,
    TestEntity,
    keyof TestFields
  >[];
  mutationTriggers: EntityMutationTriggerConfiguration<
    TestFields,
    string,
    ViewerContext,
    TestEntity,
    keyof TestFields
  >;
} => {
  const mutationValidators: EntityMutationValidator<
    TestFields,
    string,
    ViewerContext,
    TestEntity,
    keyof TestFields
  >[] = [new TestMutationTrigger()];
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
    afterCommit: [new TestNonTransactionalMutationTrigger()],
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
    metricsAdapter,
    TestEntity.name
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
    mutationValidators,
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
    mutationValidators,
    mutationTriggers,
  };
};

describe(EntityMutatorFactory, () => {
  describe('forCreate', () => {
    it('creates entities', async () => {
      const viewerContext = mock<ViewerContext>();
      const queryContext = StubQueryContextProvider.getQueryContext();

      const id1 = uuidv4();
      const id2 = uuidv4();
      const { entityMutatorFactory } = createEntityMutatorFactory([
        {
          customIdField: id1,
          stringField: 'huh',
          testIndexedField: '4',
          numberField: 1,
          dateField: new Date(),
          nullableField: null,
        },
        {
          customIdField: id2,
          stringField: 'huh',
          testIndexedField: '5',
          numberField: 1,
          dateField: new Date(),
          nullableField: null,
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

      const id1 = uuidv4();
      const id2 = uuidv4();
      const { privacyPolicy, entityMutatorFactory } = createEntityMutatorFactory([
        {
          customIdField: id1,
          stringField: 'huh',
          testIndexedField: '4',
          numberField: 1,
          dateField: new Date(),
          nullableField: null,
        },
        {
          customIdField: id2,
          stringField: 'huh',
          testIndexedField: '5',
          numberField: 1,
          dateField: new Date(),
          nullableField: null,
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

      const id1 = uuidv4();
      const id2 = uuidv4();
      const { mutationTriggers, entityMutatorFactory } = createEntityMutatorFactory([
        {
          customIdField: id1,
          stringField: 'huh',
          testIndexedField: '4',
          numberField: 1,
          dateField: new Date(),
          nullableField: null,
        },
        {
          customIdField: id2,
          stringField: 'huh',
          testIndexedField: '5',
          numberField: 1,
          dateField: new Date(),
          nullableField: null,
        },
      ]);

      const triggerSpies = setUpMutationTriggerSpies(mutationTriggers);

      await entityMutatorFactory
        .forCreate(viewerContext, queryContext)
        .setField('stringField', 'huh')
        .enforceCreateAsync();

      verifyTriggerCounts(
        viewerContext,
        triggerSpies,
        {
          beforeCreate: true,
          afterCreate: true,
          beforeUpdate: false,
          afterUpdate: false,
          beforeDelete: false,
          afterDelete: false,
        },
        { type: EntityMutationType.CREATE }
      );
    });

    it('executes validators', async () => {
      const viewerContext = mock<ViewerContext>();
      const queryContext = StubQueryContextProvider.getQueryContext();

      const id1 = uuidv4();
      const id2 = uuidv4();
      const { mutationValidators, entityMutatorFactory } = createEntityMutatorFactory([
        {
          customIdField: id1,
          stringField: 'huh',
          testIndexedField: '4',
          numberField: 1,
          dateField: new Date(),
          nullableField: null,
        },
        {
          customIdField: id2,
          stringField: 'huh',
          testIndexedField: '5',
          numberField: 1,
          dateField: new Date(),
          nullableField: null,
        },
      ]);

      const validatorSpies = setUpMutationValidatorSpies(mutationValidators);

      await entityMutatorFactory
        .forCreate(viewerContext, queryContext)
        .setField('stringField', 'huh')
        .enforceCreateAsync();

      verifyValidatorCounts(viewerContext, validatorSpies, 1, { type: EntityMutationType.CREATE });
    });
  });

  describe('forUpdate', () => {
    it('updates entities', async () => {
      const viewerContext = mock<ViewerContext>();
      const queryContext = StubQueryContextProvider.getQueryContext();

      const id1 = uuidv4();
      const id2 = uuidv4();
      const { entityMutatorFactory, entityLoaderFactory } = createEntityMutatorFactory([
        {
          customIdField: id1,
          stringField: 'huh',
          testIndexedField: '3',
          numberField: 3,
          dateField: new Date(),
          nullableField: null,
        },
        {
          customIdField: id2,
          stringField: 'huh',
          testIndexedField: '4',
          numberField: 3,
          dateField: new Date(),
          nullableField: null,
        },
      ]);

      const existingEntity = await enforceAsyncResult(
        entityLoaderFactory.forLoad(viewerContext, queryContext).loadByIDAsync(id2)
      );

      const updatedEntity = await entityMutatorFactory
        .forUpdate(existingEntity, queryContext)
        .setField('stringField', 'huh2')
        .enforceUpdateAsync();

      expect(updatedEntity).toBeTruthy();
      expect(updatedEntity.getAllFields()).not.toMatchObject(existingEntity.getAllFields());
      expect(updatedEntity.getField('stringField')).toEqual('huh2');

      const reloadedEntity = await enforceAsyncResult(
        entityLoaderFactory.forLoad(viewerContext, queryContext).loadByIDAsync(id2)
      );
      expect(reloadedEntity.getAllFields()).toMatchObject(updatedEntity.getAllFields());
    });

    it('checks privacy', async () => {
      const viewerContext = mock<ViewerContext>();
      const queryContext = StubQueryContextProvider.getQueryContext();

      const id1 = uuidv4();
      const id2 = uuidv4();
      const {
        privacyPolicy,
        entityMutatorFactory,
        entityLoaderFactory,
      } = createEntityMutatorFactory([
        {
          customIdField: id1,
          stringField: 'huh',
          testIndexedField: '3',
          numberField: 3,
          dateField: new Date(),
          nullableField: null,
        },
        {
          customIdField: id2,
          stringField: 'huh',
          testIndexedField: '4',
          numberField: 3,
          dateField: new Date(),
          nullableField: null,
        },
      ]);

      const spiedPrivacyPolicy = spy(privacyPolicy);

      const existingEntity = await enforceAsyncResult(
        entityLoaderFactory.forLoad(viewerContext, queryContext).loadByIDAsync(id2)
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

      const id1 = uuidv4();
      const id2 = uuidv4();
      const {
        mutationTriggers,
        entityMutatorFactory,
        entityLoaderFactory,
      } = createEntityMutatorFactory([
        {
          customIdField: id1,
          stringField: 'huh',
          testIndexedField: '3',
          numberField: 3,
          dateField: new Date(),
          nullableField: null,
        },
        {
          customIdField: id2,
          stringField: 'huh',
          testIndexedField: '4',
          numberField: 3,
          dateField: new Date(),
          nullableField: null,
        },
      ]);

      const triggerSpies = setUpMutationTriggerSpies(mutationTriggers);

      const existingEntity = await enforceAsyncResult(
        entityLoaderFactory.forLoad(viewerContext, queryContext).loadByIDAsync(id2)
      );

      await entityMutatorFactory
        .forUpdate(existingEntity, queryContext)
        .setField('stringField', 'huh2')
        .enforceUpdateAsync();

      verifyTriggerCounts(
        viewerContext,
        triggerSpies,
        {
          beforeCreate: false,
          afterCreate: false,
          beforeUpdate: true,
          afterUpdate: true,
          beforeDelete: false,
          afterDelete: false,
        },
        { type: EntityMutationType.UPDATE, previousValue: existingEntity }
      );
    });
    it('executes validators', async () => {
      const viewerContext = mock<ViewerContext>();
      const queryContext = StubQueryContextProvider.getQueryContext();

      const id1 = uuidv4();
      const id2 = uuidv4();
      const {
        mutationValidators,
        entityMutatorFactory,
        entityLoaderFactory,
      } = createEntityMutatorFactory([
        {
          customIdField: id1,
          stringField: 'huh',
          testIndexedField: '3',
          numberField: 3,
          dateField: new Date(),
          nullableField: null,
        },
        {
          customIdField: id2,
          stringField: 'huh',
          testIndexedField: '4',
          numberField: 3,
          dateField: new Date(),
          nullableField: null,
        },
      ]);

      const validatorSpies = setUpMutationValidatorSpies(mutationValidators);

      const existingEntity = await enforceAsyncResult(
        entityLoaderFactory.forLoad(viewerContext, queryContext).loadByIDAsync(id2)
      );

      await entityMutatorFactory
        .forUpdate(existingEntity, queryContext)
        .setField('stringField', 'huh2')
        .enforceUpdateAsync();

      verifyValidatorCounts(viewerContext, validatorSpies, 1, {
        type: EntityMutationType.UPDATE,
        previousValue: existingEntity,
      });
    });
  });

  describe('forDelete', () => {
    it('deletes entities', async () => {
      const viewerContext = mock<ViewerContext>();
      const queryContext = StubQueryContextProvider.getQueryContext();

      const id1 = uuidv4();
      const { entityMutatorFactory, entityLoaderFactory } = createEntityMutatorFactory([
        {
          customIdField: id1,
          stringField: 'huh',
          testIndexedField: '3',
          numberField: 3,
          dateField: new Date(),
          nullableField: null,
        },
      ]);

      const existingEntity = await enforceAsyncResult(
        entityLoaderFactory.forLoad(viewerContext, queryContext).loadByIDAsync(id1)
      );
      expect(existingEntity).toBeTruthy();

      await entityMutatorFactory.forDelete(existingEntity, queryContext).enforceDeleteAsync();

      await expect(
        enforceAsyncResult(
          entityLoaderFactory.forLoad(viewerContext, queryContext).loadByIDAsync(id1)
        )
      ).rejects.toBeInstanceOf(Error);
    });

    it('checks privacy', async () => {
      const viewerContext = mock<ViewerContext>();
      const queryContext = StubQueryContextProvider.getQueryContext();

      const id1 = uuidv4();
      const {
        privacyPolicy,
        entityMutatorFactory,
        entityLoaderFactory,
      } = createEntityMutatorFactory([
        {
          customIdField: id1,
          stringField: 'huh',
          testIndexedField: '3',
          numberField: 3,
          dateField: new Date(),
          nullableField: null,
        },
      ]);

      const spiedPrivacyPolicy = spy(privacyPolicy);

      const existingEntity = await enforceAsyncResult(
        entityLoaderFactory.forLoad(viewerContext, queryContext).loadByIDAsync(id1)
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

      const id1 = uuidv4();
      const {
        mutationTriggers,
        entityMutatorFactory,
        entityLoaderFactory,
      } = createEntityMutatorFactory([
        {
          customIdField: id1,
          stringField: 'huh',
          testIndexedField: '3',
          numberField: 3,
          dateField: new Date(),
          nullableField: null,
        },
      ]);

      const triggerSpies = setUpMutationTriggerSpies(mutationTriggers);

      const existingEntity = await enforceAsyncResult(
        entityLoaderFactory.forLoad(viewerContext, queryContext).loadByIDAsync(id1)
      );

      await entityMutatorFactory.forDelete(existingEntity, queryContext).enforceDeleteAsync();

      verifyTriggerCounts(
        viewerContext,
        triggerSpies,
        {
          beforeCreate: false,
          afterCreate: false,
          beforeUpdate: false,
          afterUpdate: false,
          beforeDelete: true,
          afterDelete: true,
        },
        { type: EntityMutationType.DELETE }
      );
    });

    it('does not execute validators', async () => {
      const viewerContext = mock<ViewerContext>();
      const queryContext = StubQueryContextProvider.getQueryContext();

      const id1 = uuidv4();
      const {
        mutationValidators,
        entityMutatorFactory,
        entityLoaderFactory,
      } = createEntityMutatorFactory([
        {
          customIdField: id1,
          stringField: 'huh',
          testIndexedField: '3',
          numberField: 3,
          dateField: new Date(),
          nullableField: null,
        },
      ]);

      const validatorSpies = setUpMutationValidatorSpies(mutationValidators);

      const existingEntity = await enforceAsyncResult(
        entityLoaderFactory.forLoad(viewerContext, queryContext).loadByIDAsync(id1)
      );

      await entityMutatorFactory.forDelete(existingEntity, queryContext).enforceDeleteAsync();

      verifyValidatorCounts(viewerContext, validatorSpies, 0, { type: EntityMutationType.DELETE });
    });
  });

  it('invalidates cache for fields upon create', async () => {
    const viewerContext = mock<ViewerContext>();
    const queryContext = StubQueryContextProvider.getQueryContext();

    const id1 = uuidv4();
    const { entityMutatorFactory, entityLoaderFactory } = createEntityMutatorFactory([
      {
        customIdField: id1,
        stringField: 'huh',
        testIndexedField: '3',
        numberField: 3,
        dateField: new Date(),
        nullableField: null,
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

  it('throws error when field not valid', async () => {
    const viewerContext = mock<ViewerContext>();
    const queryContext = StubQueryContextProvider.getQueryContext();
    const id1 = uuidv4();
    const { entityMutatorFactory } = createEntityMutatorFactory([
      {
        customIdField: id1,
        stringField: 'huh',
        testIndexedField: '3',
        numberField: 3,
        dateField: new Date(),
        nullableField: null,
      },
    ]);

    await expect(
      entityMutatorFactory
        .forCreate(viewerContext, queryContext)
        .setField('stringField', 10 as any)
        .createAsync()
    ).rejects.toThrowError('Entity field not valid: TestEntity (stringField = 10)');

    const createdEntity = await entityMutatorFactory
      .forCreate(viewerContext, queryContext)
      .setField('stringField', 'hello')
      .enforceCreateAsync();

    await expect(
      entityMutatorFactory
        .forUpdate(createdEntity, queryContext)
        .setField('stringField', 10 as any)
        .updateAsync()
    ).rejects.toThrowError('Entity field not valid: TestEntity (stringField = 10)');
  });

  it('returns error result when not authorized to create', async () => {
    const viewerContext = instance(mock(ViewerContext));
    const queryContext = StubQueryContextProvider.getQueryContext();
    const privacyPolicyMock = mock(SimpleTestEntityPrivacyPolicy);
    const databaseAdapter = instance(mock<EntityDatabaseAdapter<SimpleTestFields>>());
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
      [],
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

    const id1 = uuidv4();
    const fakeEntity = new SimpleTestEntity(viewerContext, {
      id: id1,
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
    const databaseAdapterMock = mock<EntityDatabaseAdapter<SimpleTestFields>>();
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
      [],
      {},
      entityLoaderFactory,
      instance(databaseAdapterMock),
      metricsAdapter
    );

    const id1 = uuidv4();
    const fakeEntity = new SimpleTestEntity(viewerContext, {
      id: id1,
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
          entityClassName: TestEntity.name,
        })
      )
    ).once();
    verify(
      spiedMetricsAdapter.logMutatorMutationEvent(
        objectContaining({
          type: EntityMetricsMutationType.UPDATE,
          entityClassName: TestEntity.name,
        })
      )
    ).once();
    verify(
      spiedMetricsAdapter.logMutatorMutationEvent(
        objectContaining({
          type: EntityMetricsMutationType.DELETE,
          entityClassName: TestEntity.name,
        })
      )
    ).once();
    verify(spiedMetricsAdapter.logMutatorMutationEvent(anything())).thrice();
  });
});
