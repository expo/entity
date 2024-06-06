import { mock, spy, verify, anyOfClass, deepEqual } from 'ts-mockito';
import { v4 as uuidv4 } from 'uuid';

import EntityCompanionProvider from '../../EntityCompanionProvider';
import EntityConfiguration from '../../EntityConfiguration';
import EntityDatabaseAdapter from '../../EntityDatabaseAdapter';
import EntityLoaderFactory from '../../EntityLoaderFactory';
import { EntityMutationType, EntityTriggerMutationInfo } from '../../EntityMutationInfo';
import EntityMutationTriggerConfiguration from '../../EntityMutationTriggerConfiguration';
import EntityMutationValidator from '../../EntityMutationValidator';
import EntityMutatorFactory from '../../EntityMutatorFactory';
import { EntityTransactionalQueryContext } from '../../EntityQueryContext';
import IEntityDatabaseAdapterProvider from '../../IEntityDatabaseAdapterProvider';
import ViewerContext from '../../ViewerContext';
import EntityDataManager from '../../internal/EntityDataManager';
import ReadThroughEntityCache from '../../internal/ReadThroughEntityCache';
import IEntityMetricsAdapter from '../../metrics/IEntityMetricsAdapter';
import NoOpEntityMetricsAdapter from '../../metrics/NoOpEntityMetricsAdapter';
import TestEntityWithMutationTriggers, {
  TestMTFields,
  TestEntityMTPrivacyPolicy,
  testEntityMTConfiguration,
  TestMutationTrigger,
} from '../../testfixtures/TestEntityWithMutationTriggers';
import { mergeEntityMutationTriggerConfigurations } from '../mergeMutationTriggers';
import { NoCacheStubCacheAdapterProvider } from '../testing/StubCacheAdapter';
import StubDatabaseAdapter from '../testing/StubDatabaseAdapter';
import StubQueryContextProvider from '../testing/StubQueryContextProvider';

const setUpMutationTriggerSpies = (
  mutationTriggers: EntityMutationTriggerConfiguration<
    TestMTFields,
    string,
    ViewerContext,
    TestEntityWithMutationTriggers,
    keyof TestMTFields
  >,
): EntityMutationTriggerConfiguration<
  TestMTFields,
  string,
  ViewerContext,
  TestEntityWithMutationTriggers,
  keyof TestMTFields
> => {
  return Object.entries(mutationTriggers).reduce<
    EntityMutationTriggerConfiguration<
      TestMTFields,
      string,
      ViewerContext,
      TestEntityWithMutationTriggers,
      keyof TestMTFields
    >
  >((accum, [triggerName, triggers]) => {
    accum[triggerName as keyof typeof mutationTriggers] = triggers.map(spy);

    return accum;
  }, {});
};

const verifyTriggerCounts = (
  viewerContext: ViewerContext,
  mutationTriggerSpies: EntityMutationTriggerConfiguration<
    TestMTFields,
    string,
    ViewerContext,
    TestEntityWithMutationTriggers,
    keyof TestMTFields
  >,
  executed: Record<
    keyof Pick<
      EntityMutationTriggerConfiguration<
        TestMTFields,
        string,
        ViewerContext,
        TestEntityWithMutationTriggers,
        keyof TestMTFields
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
  mutationInfo: EntityTriggerMutationInfo<
    TestMTFields,
    string,
    ViewerContext,
    TestEntityWithMutationTriggers,
    keyof TestMTFields
  >,
): void => {
  for (const [triggerName, check] of Object.entries(executed)) {
    const triggersSpies =
      mutationTriggerSpies[triggerName as keyof typeof mutationTriggerSpies] ?? [];

    for (const triggerSpy of triggersSpies) {
      verify(
        triggerSpy.executeAsync(
          viewerContext,
          anyOfClass(EntityTransactionalQueryContext),
          anyOfClass(TestEntityWithMutationTriggers),
          deepEqual(mutationInfo),
        ),
      )[check ? 'once' : 'never']();
    }
  }

  if (mutationTriggerSpies.beforeAll?.length) {
    for (const triggerSpy of mutationTriggerSpies.beforeAll) {
      verify(
        triggerSpy.executeAsync(
          viewerContext,
          anyOfClass(EntityTransactionalQueryContext),
          anyOfClass(TestEntityWithMutationTriggers),
          deepEqual(mutationInfo),
        ),
      ).once();
    }
  }

  if (mutationTriggerSpies.afterAll?.length) {
    for (const triggerSpy of mutationTriggerSpies.afterAll) {
      verify(
        triggerSpy.executeAsync(
          viewerContext,
          anyOfClass(EntityTransactionalQueryContext),
          anyOfClass(TestEntityWithMutationTriggers),
          deepEqual(mutationInfo),
        ),
      ).once();
    }
  }

  if (mutationTriggerSpies.afterCommit?.length) {
    for (const triggerSpy of mutationTriggerSpies.afterCommit) {
      verify(
        triggerSpy.executeAsync(
          viewerContext,
          anyOfClass(TestEntityWithMutationTriggers),
          deepEqual(mutationInfo),
        ),
      ).once();
    }
  }
};

const createEntityMutatorFactory = (
  existingObjects: TestMTFields[],
  globalMutationTriggers: EntityMutationTriggerConfiguration<any, any, any, any, any> = {},
): {
  privacyPolicy: TestEntityMTPrivacyPolicy;
  entityLoaderFactory: EntityLoaderFactory<
    TestMTFields,
    string,
    ViewerContext,
    TestEntityWithMutationTriggers,
    TestEntityMTPrivacyPolicy,
    keyof TestMTFields
  >;
  entityMutatorFactory: EntityMutatorFactory<
    TestMTFields,
    string,
    ViewerContext,
    TestEntityWithMutationTriggers,
    TestEntityMTPrivacyPolicy
  >;
  metricsAdapter: IEntityMetricsAdapter;
  mutationValidators: EntityMutationValidator<
    TestMTFields,
    string,
    ViewerContext,
    TestEntityWithMutationTriggers,
    keyof TestMTFields
  >[];
  mutationTriggers: EntityMutationTriggerConfiguration<
    TestMTFields,
    string,
    ViewerContext,
    TestEntityWithMutationTriggers,
    keyof TestMTFields
  >;
} => {
  const mutationValidators: EntityMutationValidator<
    TestMTFields,
    string,
    ViewerContext,
    TestEntityWithMutationTriggers,
    keyof TestMTFields
  >[] = [];
  const mutationTriggers: EntityMutationTriggerConfiguration<
    TestMTFields,
    string,
    ViewerContext,
    TestEntityWithMutationTriggers,
    keyof TestMTFields
  > = {
    beforeCreate: [new TestMutationTrigger('1')],
    afterCreate: [new TestMutationTrigger('2')],
    beforeUpdate: [new TestMutationTrigger('3')],
    afterUpdate: [new TestMutationTrigger('4')],
    beforeDelete: [new TestMutationTrigger('5')],
    afterDelete: [new TestMutationTrigger('6')],
    beforeAll: [new TestMutationTrigger('7')],
    afterAll: [new TestMutationTrigger('8')],
    afterCommit: [],
  };
  const databaseAdapter = new StubDatabaseAdapter<TestMTFields>(
    testEntityMTConfiguration,
    StubDatabaseAdapter.convertFieldObjectsToDataStore(
      testEntityMTConfiguration,
      new Map([[testEntityMTConfiguration.tableName, existingObjects]]),
    ),
  );
  const customStubDatabaseAdapterProvider: IEntityDatabaseAdapterProvider = {
    getDatabaseAdapter<TFields extends Record<string, any>>(
      _entityConfiguration: EntityConfiguration<TFields>,
    ): EntityDatabaseAdapter<TFields> {
      return databaseAdapter as any as EntityDatabaseAdapter<TFields>;
    },
  };
  const metricsAdapter = new NoOpEntityMetricsAdapter();
  const cacheAdapterProvider = new NoCacheStubCacheAdapterProvider();
  const cacheAdapter = cacheAdapterProvider.getCacheAdapter(testEntityMTConfiguration);
  const entityCache = new ReadThroughEntityCache<TestMTFields>(
    testEntityMTConfiguration,
    cacheAdapter,
  );

  const companionProvider = new EntityCompanionProvider(
    metricsAdapter,
    new Map([
      [
        'postgres',
        {
          adapterProvider: customStubDatabaseAdapterProvider,
          queryContextProvider: StubQueryContextProvider,
        },
      ],
    ]),
    new Map([
      [
        'redis',
        {
          cacheAdapterProvider,
        },
      ],
    ]),
    globalMutationTriggers,
  );

  const dataManager = new EntityDataManager(
    databaseAdapter,
    entityCache,
    StubQueryContextProvider,
    metricsAdapter,
    TestEntityWithMutationTriggers.name,
  );
  const entityLoaderFactory = new EntityLoaderFactory(
    companionProvider.getCompanionForEntity(TestEntityWithMutationTriggers),
    dataManager,
    metricsAdapter,
  );
  const entityMutatorFactory = new EntityMutatorFactory(
    companionProvider,
    testEntityMTConfiguration,
    TestEntityWithMutationTriggers,
    companionProvider.getCompanionForEntity(TestEntityWithMutationTriggers).privacyPolicy,
    mutationValidators,
    mutationTriggers,
    entityLoaderFactory,
    databaseAdapter,
    metricsAdapter,
  );
  return {
    privacyPolicy: companionProvider.getCompanionForEntity(TestEntityWithMutationTriggers)
      .privacyPolicy,
    entityLoaderFactory,
    entityMutatorFactory,
    metricsAdapter,
    mutationValidators,
    mutationTriggers,
  };
};

describe(mergeEntityMutationTriggerConfigurations, () => {
  it('executes merged triggers', async () => {
    const viewerContext = mock<ViewerContext>();
    const queryContext = StubQueryContextProvider.getQueryContext();

    const globalMutationTriggers: EntityMutationTriggerConfiguration<
      TestMTFields,
      string,
      ViewerContext,
      TestEntityWithMutationTriggers,
      keyof TestMTFields
    > = {
      afterCreate: [new TestMutationTrigger('globalAfterCreate')],
      afterAll: [new TestMutationTrigger('globalAfterAll')],
    };

    const id1 = uuidv4();
    const id2 = uuidv4();
    const { mutationTriggers, entityMutatorFactory } = createEntityMutatorFactory(
      [
        {
          id: id1,
          stringField: 'huh',
        },
        {
          id: id2,
          stringField: 'huh',
        },
      ],
      globalMutationTriggers,
    );

    const triggerSpies = setUpMutationTriggerSpies(mutationTriggers);
    const globalTriggerSpies = setUpMutationTriggerSpies(globalMutationTriggers);

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
      { type: EntityMutationType.CREATE },
    );
    verifyTriggerCounts(
      viewerContext,
      globalTriggerSpies,
      {
        beforeCreate: true,
        afterCreate: true,
        beforeUpdate: false,
        afterUpdate: false,
        beforeDelete: false,
        afterDelete: false,
      },
      { type: EntityMutationType.CREATE },
    );
  });
});
