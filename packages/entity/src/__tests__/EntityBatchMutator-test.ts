import { enforceAsyncResult } from '@expo/results';
import { describe, expect, it } from '@jest/globals';
import { anyOfClass, anything, deepEqual, instance, mock, spy, verify, when } from 'ts-mockito';
import { v4 as uuidv4 } from 'uuid';

import { AuthorizationResultBasedEntityLoader } from '../AuthorizationResultBasedEntityLoader';
import { EntityCompanionProvider } from '../EntityCompanionProvider';
import { EntityConfiguration } from '../EntityConfiguration';
import { EntityConstructionUtils } from '../EntityConstructionUtils';
import { EntityDatabaseAdapter } from '../EntityDatabaseAdapter';
import { EntityLoaderFactory } from '../EntityLoaderFactory';
import {
  EntityMutationType,
  EntityTriggerMutationInfo,
  EntityValidatorMutationInfo,
} from '../EntityMutationInfo';
import {
  EntityMutationTrigger,
  EntityMutationTriggerConfiguration,
  EntityNonTransactionalMutationTrigger,
} from '../EntityMutationTriggerConfiguration';
import {
  EntityMutationValidator,
  EntityMutationValidatorConfiguration,
} from '../EntityMutationValidatorConfiguration';
import { EntityMutatorFactory } from '../EntityMutatorFactory';
import { EntityPrivacyPolicyEvaluationContext } from '../EntityPrivacyPolicy';
import { EntityQueryContext, EntityTransactionalQueryContext } from '../EntityQueryContext';
import { IEntityDatabaseAdapterProvider } from '../IEntityDatabaseAdapterProvider';
import { ViewerContext } from '../ViewerContext';
import { EntityDataManager } from '../internal/EntityDataManager';
import { ReadThroughEntityCache } from '../internal/ReadThroughEntityCache';
import { IEntityMetricsAdapter } from '../metrics/IEntityMetricsAdapter';
import { NoOpEntityMetricsAdapter } from '../metrics/NoOpEntityMetricsAdapter';
import {
  SimpleTestEntity,
  simpleTestEntityConfiguration,
  SimpleTestEntityPrivacyPolicy,
  SimpleTestFields,
} from '../utils/__testfixtures__/SimpleTestEntity';
import { NoCacheStubCacheAdapterProvider } from '../utils/__testfixtures__/StubCacheAdapter';
import { StubDatabaseAdapter } from '../utils/__testfixtures__/StubDatabaseAdapter';
import { StubQueryContextProvider } from '../utils/__testfixtures__/StubQueryContextProvider';
import {
  TestEntity,
  testEntityConfiguration,
  TestEntityPrivacyPolicy,
  TestFields,
} from '../utils/__testfixtures__/TestEntity';

class TestMutationValidator extends EntityMutationValidator<
  TestFields,
  'customIdField',
  ViewerContext,
  TestEntity,
  keyof TestFields
> {
  async executeAsync(
    _viewerContext: ViewerContext,
    _queryContext: EntityQueryContext,
    _entity: TestEntity,
    _mutationInfo: EntityValidatorMutationInfo<
      TestFields,
      'customIdField',
      ViewerContext,
      TestEntity,
      keyof TestFields
    >,
  ): Promise<void> {}
}

class TestMutationTrigger extends EntityMutationTrigger<
  TestFields,
  'customIdField',
  ViewerContext,
  TestEntity,
  keyof TestFields
> {
  async executeAsync(
    _viewerContext: ViewerContext,
    _queryContext: EntityQueryContext,
    _entity: TestEntity,
    _mutationInfo: EntityTriggerMutationInfo<
      TestFields,
      'customIdField',
      ViewerContext,
      TestEntity,
      keyof TestFields
    >,
  ): Promise<void> {}
}

class TestNonTransactionalMutationTrigger extends EntityNonTransactionalMutationTrigger<
  TestFields,
  'customIdField',
  ViewerContext,
  TestEntity,
  keyof TestFields
> {
  async executeAsync(_viewerContext: ViewerContext, _entity: TestEntity): Promise<void> {}
}

const createEntityMutatorFactory = (
  existingObjects: TestFields[],
): {
  privacyPolicy: TestEntityPrivacyPolicy;
  entityLoaderFactory: EntityLoaderFactory<
    TestFields,
    'customIdField',
    ViewerContext,
    TestEntity,
    TestEntityPrivacyPolicy,
    keyof TestFields
  >;
  entityMutatorFactory: EntityMutatorFactory<
    TestFields,
    'customIdField',
    ViewerContext,
    TestEntity,
    TestEntityPrivacyPolicy
  >;
  metricsAdapter: IEntityMetricsAdapter;
  mutationValidators: EntityMutationValidatorConfiguration<
    TestFields,
    'customIdField',
    ViewerContext,
    TestEntity,
    keyof TestFields
  >;
  mutationTriggers: EntityMutationTriggerConfiguration<
    TestFields,
    'customIdField',
    ViewerContext,
    TestEntity,
    keyof TestFields
  >;
} => {
  const mutationValidators: EntityMutationValidatorConfiguration<
    TestFields,
    'customIdField',
    ViewerContext,
    TestEntity,
    keyof TestFields
  > = {
    beforeCreateAndUpdate: [new TestMutationValidator()],
    beforeDelete: [new TestMutationValidator()],
  };
  const mutationTriggers: EntityMutationTriggerConfiguration<
    TestFields,
    'customIdField',
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
  const databaseAdapter = new StubDatabaseAdapter<TestFields, 'customIdField'>(
    testEntityConfiguration,
    StubDatabaseAdapter.convertFieldObjectsToDataStore(
      testEntityConfiguration,
      new Map([[testEntityConfiguration.tableName, existingObjects]]),
    ),
  );
  const customStubDatabaseAdapterProvider: IEntityDatabaseAdapterProvider = {
    getDatabaseAdapter<TFields extends Record<string, any>, TIDField extends keyof TFields>(
      _entityConfiguration: EntityConfiguration<TFields, TIDField>,
    ): EntityDatabaseAdapter<TFields, TIDField> {
      return databaseAdapter as any as EntityDatabaseAdapter<TFields, TIDField>;
    },
  };
  const metricsAdapter = new NoOpEntityMetricsAdapter();
  const cacheAdapterProvider = new NoCacheStubCacheAdapterProvider();
  const cacheAdapter = cacheAdapterProvider.getCacheAdapter(testEntityConfiguration);
  const entityCache = new ReadThroughEntityCache<TestFields, 'customIdField'>(
    testEntityConfiguration,
    cacheAdapter,
  );

  const queryContextProvider = new StubQueryContextProvider();
  const companionProvider = new EntityCompanionProvider(
    metricsAdapter,
    new Map([
      [
        'postgres',
        {
          adapterProvider: customStubDatabaseAdapterProvider,
          queryContextProvider,
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
  );

  const dataManager = new EntityDataManager(
    databaseAdapter,
    entityCache,
    queryContextProvider,
    metricsAdapter,
    TestEntity.name,
  );
  const entityLoaderFactory = new EntityLoaderFactory(
    companionProvider.getCompanionForEntity(TestEntity),
    dataManager,
    metricsAdapter,
  );
  const entityMutatorFactory = new EntityMutatorFactory(
    companionProvider,
    testEntityConfiguration,
    TestEntity,
    companionProvider.getCompanionForEntity(TestEntity).privacyPolicy,
    mutationValidators,
    mutationTriggers,
    entityLoaderFactory,
    databaseAdapter,
    metricsAdapter,
  );
  return {
    privacyPolicy: companionProvider.getCompanionForEntity(TestEntity).privacyPolicy,
    entityLoaderFactory,
    entityMutatorFactory,
    metricsAdapter,
    mutationValidators,
    mutationTriggers,
  };
};

describe('Batch Entity Mutators', () => {
  describe('forBatchCreate', () => {
    it('creates multiple entities with correct fields', async () => {
      const viewerContext = mock<ViewerContext>();
      const queryContext = new StubQueryContextProvider().getQueryContext();

      const { entityMutatorFactory } = createEntityMutatorFactory([]);
      const entities = await enforceAsyncResult(
        entityMutatorFactory
          .forBatchCreate(viewerContext, queryContext, [
            {
              stringField: 'hello',
              testIndexedField: '1',
              intField: 1,
              dateField: new Date(),
              nullableField: null,
            },
            {
              stringField: 'world',
              testIndexedField: '2',
              intField: 2,
              dateField: new Date(),
              nullableField: null,
            },
          ])
          .createAsync(),
      );

      expect(entities).toHaveLength(2);
      expect(entities[0]!.getField('stringField')).toBe('hello');
      expect(entities[1]!.getField('stringField')).toBe('world');
    });

    it('returns empty array for empty input with no DB calls', async () => {
      const viewerContext = mock<ViewerContext>();
      const queryContext = new StubQueryContextProvider().getQueryContext();

      const { entityMutatorFactory } = createEntityMutatorFactory([]);
      const result = await entityMutatorFactory
        .forBatchCreate(viewerContext, queryContext, [])
        .createAsync();

      expect(result.ok).toBe(true);
      expect(result.enforceValue()).toHaveLength(0);
    });

    it('aborts entire batch on first auth failure', async () => {
      const entityCompanionProviderMock = mock(EntityCompanionProvider);
      when(entityCompanionProviderMock.getCompanionForEntity(SimpleTestEntity)).thenReturn({
        entityCompanionDefinition: SimpleTestEntity.defineCompanionDefinition(),
      } as any);
      const entityCompanionProvider = instance(entityCompanionProviderMock);

      const viewerContext = instance(mock(ViewerContext));
      const queryContext = new StubQueryContextProvider().getQueryContext();
      const privacyPolicyMock = mock(SimpleTestEntityPrivacyPolicy);
      const databaseAdapter = instance(mock<EntityDatabaseAdapter<SimpleTestFields, 'id'>>());
      const metricsAdapter = instance(mock<IEntityMetricsAdapter>());

      const fakeEntity = new SimpleTestEntity({
        viewerContext,
        id: '00000000-0000-0000-0000-000000000000',
        selectedFields: { id: '00000000-0000-0000-0000-000000000000' },
        databaseFields: { id: '00000000-0000-0000-0000-000000000000' },
      });

      const entityLoaderMock = mock<
        AuthorizationResultBasedEntityLoader<
          SimpleTestFields,
          'id',
          ViewerContext,
          SimpleTestEntity,
          SimpleTestEntityPrivacyPolicy,
          keyof SimpleTestFields
        >
      >(AuthorizationResultBasedEntityLoader);
      const entityConstructionUtilsMock =
        mock<
          EntityConstructionUtils<
            SimpleTestFields,
            'id',
            ViewerContext,
            SimpleTestEntity,
            SimpleTestEntityPrivacyPolicy,
            keyof SimpleTestFields
          >
        >(EntityConstructionUtils);
      when(entityConstructionUtilsMock.constructEntity(anything())).thenReturn(fakeEntity);
      when(entityLoaderMock.constructionUtils).thenReturn(instance(entityConstructionUtilsMock));
      const entityLoader = instance(entityLoaderMock);

      const entityLoaderFactoryMock =
        mock<
          EntityLoaderFactory<
            SimpleTestFields,
            'id',
            ViewerContext,
            SimpleTestEntity,
            SimpleTestEntityPrivacyPolicy,
            keyof SimpleTestFields
          >
        >(EntityLoaderFactory);
      when(
        entityLoaderFactoryMock.forLoad(
          viewerContext,
          anyOfClass(EntityTransactionalQueryContext),
          anything(),
        ),
      ).thenReturn(entityLoader);
      const entityLoaderFactory = instance(entityLoaderFactoryMock);

      const rejectionError = new Error('not authorized');
      when(
        privacyPolicyMock.authorizeCreateAsync(
          viewerContext,
          anyOfClass(EntityTransactionalQueryContext),
          anything(),
          anyOfClass(SimpleTestEntity),
          anything(),
        ),
      ).thenReject(rejectionError);

      const entityMutatorFactory = new EntityMutatorFactory(
        entityCompanionProvider,
        simpleTestEntityConfiguration,
        SimpleTestEntity,
        instance(privacyPolicyMock),
        {},
        {},
        entityLoaderFactory,
        databaseAdapter,
        metricsAdapter,
      );

      const entityCreateResult = await entityMutatorFactory
        .forBatchCreate(viewerContext, queryContext, [{}, {}])
        .createAsync();
      expect(entityCreateResult.ok).toBe(false);
      expect(entityCreateResult.reason).toEqual(rejectionError);
    });

    it('throws on field validation failure', async () => {
      const viewerContext = mock<ViewerContext>();
      const queryContext = new StubQueryContextProvider().getQueryContext();

      const { entityMutatorFactory } = createEntityMutatorFactory([]);

      await expect(
        entityMutatorFactory
          .forBatchCreate(viewerContext, queryContext, [{ stringField: 10 as any }])
          .createAsync(),
      ).rejects.toThrow('Entity field not valid: TestEntity (stringField = 10)');
    });

    it('executes triggers per-entity', async () => {
      const viewerContext = mock<ViewerContext>();
      const queryContext = new StubQueryContextProvider().getQueryContext();

      const { mutationTriggers, entityMutatorFactory } = createEntityMutatorFactory([]);

      const beforeCreateSpy = spy(mutationTriggers.beforeCreate![0]!);
      const afterCreateSpy = spy(mutationTriggers.afterCreate![0]!);
      const beforeAllSpy = spy(mutationTriggers.beforeAll![0]!);
      const afterAllSpy = spy(mutationTriggers.afterAll![0]!);
      const afterCommitSpy = spy(mutationTriggers.afterCommit![0]!);

      await enforceAsyncResult(
        entityMutatorFactory
          .forBatchCreate(viewerContext, queryContext, [
            {
              stringField: 'a',
              testIndexedField: '1',
              intField: 1,
              dateField: new Date(),
              nullableField: null,
            },
            {
              stringField: 'b',
              testIndexedField: '2',
              intField: 2,
              dateField: new Date(),
              nullableField: null,
            },
          ])
          .createAsync(),
      );

      verify(
        beforeCreateSpy.executeAsync(
          viewerContext,
          anyOfClass(EntityTransactionalQueryContext),
          anyOfClass(TestEntity),
          deepEqual({ type: EntityMutationType.CREATE }),
        ),
      ).twice();

      verify(
        afterCreateSpy.executeAsync(
          viewerContext,
          anyOfClass(EntityTransactionalQueryContext),
          anyOfClass(TestEntity),
          deepEqual({ type: EntityMutationType.CREATE }),
        ),
      ).twice();

      verify(
        beforeAllSpy.executeAsync(
          viewerContext,
          anyOfClass(EntityTransactionalQueryContext),
          anyOfClass(TestEntity),
          deepEqual({ type: EntityMutationType.CREATE }),
        ),
      ).twice();

      verify(
        afterAllSpy.executeAsync(
          viewerContext,
          anyOfClass(EntityTransactionalQueryContext),
          anyOfClass(TestEntity),
          deepEqual({ type: EntityMutationType.CREATE }),
        ),
      ).twice();

      verify(
        afterCommitSpy.executeAsync(
          viewerContext,
          anyOfClass(TestEntity),
          deepEqual({ type: EntityMutationType.CREATE }),
        ),
      ).twice();
    });

    it('executes validators per-entity', async () => {
      const viewerContext = mock<ViewerContext>();
      const queryContext = new StubQueryContextProvider().getQueryContext();

      const { mutationValidators, entityMutatorFactory } = createEntityMutatorFactory([]);

      const beforeCreateAndUpdateSpy = spy(mutationValidators.beforeCreateAndUpdate![0]!);

      await enforceAsyncResult(
        entityMutatorFactory
          .forBatchCreate(viewerContext, queryContext, [
            {
              stringField: 'a',
              testIndexedField: '1',
              intField: 1,
              dateField: new Date(),
              nullableField: null,
            },
            {
              stringField: 'b',
              testIndexedField: '2',
              intField: 2,
              dateField: new Date(),
              nullableField: null,
            },
          ])
          .createAsync(),
      );

      verify(
        beforeCreateAndUpdateSpy.executeAsync(
          viewerContext,
          anyOfClass(EntityTransactionalQueryContext),
          anyOfClass(TestEntity),
          deepEqual({ type: EntityMutationType.CREATE }),
        ),
      ).twice();
    });
  });

  describe('forBatchUpdate', () => {
    it('updates multiple entities with same field changes', async () => {
      const viewerContext = mock<ViewerContext>();
      const privacyPolicyEvaluationContext =
        instance(
          mock<
            EntityPrivacyPolicyEvaluationContext<
              TestFields,
              'customIdField',
              ViewerContext,
              TestEntity,
              keyof TestFields
            >
          >(),
        );
      const queryContext = new StubQueryContextProvider().getQueryContext();

      const id1 = uuidv4();
      const id2 = uuidv4();
      const { entityMutatorFactory, entityLoaderFactory } = createEntityMutatorFactory([
        {
          customIdField: id1,
          stringField: 'original',
          testIndexedField: '1',
          intField: 1,
          dateField: new Date(),
          nullableField: null,
        },
        {
          customIdField: id2,
          stringField: 'original',
          testIndexedField: '2',
          intField: 2,
          dateField: new Date(),
          nullableField: null,
        },
      ]);

      const entity1 = await enforceAsyncResult(
        entityLoaderFactory
          .forLoad(viewerContext, queryContext, privacyPolicyEvaluationContext)
          .loadByIDAsync(id1),
      );
      const entity2 = await enforceAsyncResult(
        entityLoaderFactory
          .forLoad(viewerContext, queryContext, privacyPolicyEvaluationContext)
          .loadByIDAsync(id2),
      );

      const updatedEntities = await enforceAsyncResult(
        entityMutatorFactory
          .forBatchUpdate([entity1, entity2], queryContext)
          .setField('stringField', 'updated')
          .updateAsync(),
      );

      expect(updatedEntities).toHaveLength(2);
      expect(updatedEntities[0]!.getField('stringField')).toBe('updated');
      expect(updatedEntities[1]!.getField('stringField')).toBe('updated');
      // Verify IDs are preserved and in order
      expect(updatedEntities[0]!.getID()).toBe(id1);
      expect(updatedEntities[1]!.getID()).toBe(id2);
    });

    it('returns empty array for empty entity list', async () => {
      const queryContext = new StubQueryContextProvider().getQueryContext();

      const { entityMutatorFactory } = createEntityMutatorFactory([]);
      const result = await entityMutatorFactory
        .forBatchUpdate([], queryContext)
        .setField('stringField', 'updated')
        .updateAsync();

      expect(result.ok).toBe(true);
      expect(result.enforceValue()).toHaveLength(0);
    });

    it('aborts entire batch on first auth failure', async () => {
      const entityCompanionProviderMock = mock(EntityCompanionProvider);
      when(entityCompanionProviderMock.getCompanionForEntity(SimpleTestEntity)).thenReturn({
        entityCompanionDefinition: SimpleTestEntity.defineCompanionDefinition(),
      } as any);
      const entityCompanionProvider = instance(entityCompanionProviderMock);

      const viewerContext = instance(mock(ViewerContext));
      const queryContext = new StubQueryContextProvider().getQueryContext();
      const privacyPolicyMock = mock(SimpleTestEntityPrivacyPolicy);
      const databaseAdapter = instance(mock<EntityDatabaseAdapter<SimpleTestFields, 'id'>>());
      const metricsAdapter = instance(mock<IEntityMetricsAdapter>());

      const id1 = uuidv4();
      const fakeEntity1 = new SimpleTestEntity({
        viewerContext,
        id: id1,
        selectedFields: { id: id1 },
        databaseFields: { id: id1 },
      });

      const id2 = uuidv4();
      const fakeEntity2 = new SimpleTestEntity({
        viewerContext,
        id: id2,
        selectedFields: { id: id2 },
        databaseFields: { id: id2 },
      });

      const entityLoaderMock = mock<
        AuthorizationResultBasedEntityLoader<
          SimpleTestFields,
          'id',
          ViewerContext,
          SimpleTestEntity,
          SimpleTestEntityPrivacyPolicy,
          keyof SimpleTestFields
        >
      >(AuthorizationResultBasedEntityLoader);
      const entityConstructionUtilsMock =
        mock<
          EntityConstructionUtils<
            SimpleTestFields,
            'id',
            ViewerContext,
            SimpleTestEntity,
            SimpleTestEntityPrivacyPolicy,
            keyof SimpleTestFields
          >
        >(EntityConstructionUtils);
      when(entityConstructionUtilsMock.constructEntity(anything())).thenReturn(fakeEntity1);
      when(entityLoaderMock.constructionUtils).thenReturn(instance(entityConstructionUtilsMock));
      const entityLoader = instance(entityLoaderMock);

      const entityLoaderFactoryMock =
        mock<
          EntityLoaderFactory<
            SimpleTestFields,
            'id',
            ViewerContext,
            SimpleTestEntity,
            SimpleTestEntityPrivacyPolicy,
            keyof SimpleTestFields
          >
        >(EntityLoaderFactory);
      when(
        entityLoaderFactoryMock.forLoad(
          viewerContext,
          anyOfClass(EntityTransactionalQueryContext),
          anything(),
        ),
      ).thenReturn(entityLoader);
      const entityLoaderFactory = instance(entityLoaderFactoryMock);

      const rejectionError = new Error('not authorized');
      when(
        privacyPolicyMock.authorizeUpdateAsync(
          viewerContext,
          anyOfClass(EntityTransactionalQueryContext),
          anything(),
          anyOfClass(SimpleTestEntity),
          anything(),
        ),
      ).thenReject(rejectionError);

      const entityMutatorFactory = new EntityMutatorFactory(
        entityCompanionProvider,
        simpleTestEntityConfiguration,
        SimpleTestEntity,
        instance(privacyPolicyMock),
        {},
        {},
        entityLoaderFactory,
        databaseAdapter,
        metricsAdapter,
      );

      const entityUpdateResult = await entityMutatorFactory
        .forBatchUpdate([fakeEntity1, fakeEntity2], queryContext)
        .updateAsync();
      expect(entityUpdateResult.ok).toBe(false);
      expect(entityUpdateResult.reason).toEqual(rejectionError);
    });

    it('throws when id field is modified', async () => {
      const viewerContext = mock<ViewerContext>();
      const privacyPolicyEvaluationContext =
        instance(
          mock<
            EntityPrivacyPolicyEvaluationContext<
              TestFields,
              'customIdField',
              ViewerContext,
              TestEntity,
              keyof TestFields
            >
          >(),
        );
      const queryContext = new StubQueryContextProvider().getQueryContext();

      const id1 = uuidv4();
      const { entityMutatorFactory, entityLoaderFactory } = createEntityMutatorFactory([
        {
          customIdField: id1,
          stringField: 'huh',
          testIndexedField: '1',
          intField: 1,
          dateField: new Date(),
          nullableField: null,
        },
      ]);

      const entity = await enforceAsyncResult(
        entityLoaderFactory
          .forLoad(viewerContext, queryContext, privacyPolicyEvaluationContext)
          .loadByIDAsync(id1),
      );

      await expect(
        enforceAsyncResult(
          entityMutatorFactory
            .forBatchUpdate([entity], queryContext)
            .setField('customIdField', uuidv4())
            .updateAsync(),
        ),
      ).rejects.toThrow('id field updates not supported: (entityClass = TestEntity)');
    });

    it('executes triggers per-entity with correct previousValue', async () => {
      const viewerContext = mock<ViewerContext>();
      const privacyPolicyEvaluationContext =
        instance(
          mock<
            EntityPrivacyPolicyEvaluationContext<
              TestFields,
              'customIdField',
              ViewerContext,
              TestEntity,
              keyof TestFields
            >
          >(),
        );
      const queryContext = new StubQueryContextProvider().getQueryContext();

      const id1 = uuidv4();
      const id2 = uuidv4();
      const { mutationTriggers, entityMutatorFactory, entityLoaderFactory } =
        createEntityMutatorFactory([
          {
            customIdField: id1,
            stringField: 'a',
            testIndexedField: '1',
            intField: 1,
            dateField: new Date(),
            nullableField: null,
          },
          {
            customIdField: id2,
            stringField: 'b',
            testIndexedField: '2',
            intField: 2,
            dateField: new Date(),
            nullableField: null,
          },
        ]);

      const beforeUpdateSpy = spy(mutationTriggers.beforeUpdate![0]!);
      const afterUpdateSpy = spy(mutationTriggers.afterUpdate![0]!);
      const beforeAllSpy = spy(mutationTriggers.beforeAll![0]!);
      const afterAllSpy = spy(mutationTriggers.afterAll![0]!);
      const afterCommitSpy = spy(mutationTriggers.afterCommit![0]!);

      const entity1 = await enforceAsyncResult(
        entityLoaderFactory
          .forLoad(viewerContext, queryContext, privacyPolicyEvaluationContext)
          .loadByIDAsync(id1),
      );
      const entity2 = await enforceAsyncResult(
        entityLoaderFactory
          .forLoad(viewerContext, queryContext, privacyPolicyEvaluationContext)
          .loadByIDAsync(id2),
      );

      await enforceAsyncResult(
        entityMutatorFactory
          .forBatchUpdate([entity1, entity2], queryContext)
          .setField('stringField', 'updated')
          .updateAsync(),
      );

      // Each trigger should fire twice (once per entity)
      verify(
        beforeUpdateSpy.executeAsync(
          viewerContext,
          anyOfClass(EntityTransactionalQueryContext),
          anyOfClass(TestEntity),
          anything(),
        ),
      ).twice();

      verify(
        afterUpdateSpy.executeAsync(
          viewerContext,
          anyOfClass(EntityTransactionalQueryContext),
          anyOfClass(TestEntity),
          anything(),
        ),
      ).twice();

      verify(
        beforeAllSpy.executeAsync(
          viewerContext,
          anyOfClass(EntityTransactionalQueryContext),
          anyOfClass(TestEntity),
          anything(),
        ),
      ).twice();

      verify(
        afterAllSpy.executeAsync(
          viewerContext,
          anyOfClass(EntityTransactionalQueryContext),
          anyOfClass(TestEntity),
          anything(),
        ),
      ).twice();

      verify(
        afterCommitSpy.executeAsync(viewerContext, anyOfClass(TestEntity), anything()),
      ).twice();
    });

    it('executes validators per-entity', async () => {
      const viewerContext = mock<ViewerContext>();
      const privacyPolicyEvaluationContext =
        instance(
          mock<
            EntityPrivacyPolicyEvaluationContext<
              TestFields,
              'customIdField',
              ViewerContext,
              TestEntity,
              keyof TestFields
            >
          >(),
        );
      const queryContext = new StubQueryContextProvider().getQueryContext();

      const id1 = uuidv4();
      const id2 = uuidv4();
      const { mutationValidators, entityMutatorFactory, entityLoaderFactory } =
        createEntityMutatorFactory([
          {
            customIdField: id1,
            stringField: 'a',
            testIndexedField: '1',
            intField: 1,
            dateField: new Date(),
            nullableField: null,
          },
          {
            customIdField: id2,
            stringField: 'b',
            testIndexedField: '2',
            intField: 2,
            dateField: new Date(),
            nullableField: null,
          },
        ]);

      const beforeCreateAndUpdateSpy = spy(mutationValidators.beforeCreateAndUpdate![0]!);

      const entity1 = await enforceAsyncResult(
        entityLoaderFactory
          .forLoad(viewerContext, queryContext, privacyPolicyEvaluationContext)
          .loadByIDAsync(id1),
      );
      const entity2 = await enforceAsyncResult(
        entityLoaderFactory
          .forLoad(viewerContext, queryContext, privacyPolicyEvaluationContext)
          .loadByIDAsync(id2),
      );

      await enforceAsyncResult(
        entityMutatorFactory
          .forBatchUpdate([entity1, entity2], queryContext)
          .setField('stringField', 'updated')
          .updateAsync(),
      );

      verify(
        beforeCreateAndUpdateSpy.executeAsync(
          viewerContext,
          anyOfClass(EntityTransactionalQueryContext),
          anyOfClass(TestEntity),
          anything(),
        ),
      ).twice();
    });

    it('result ordering matches input entity ordering', async () => {
      const viewerContext = mock<ViewerContext>();
      const privacyPolicyEvaluationContext =
        instance(
          mock<
            EntityPrivacyPolicyEvaluationContext<
              TestFields,
              'customIdField',
              ViewerContext,
              TestEntity,
              keyof TestFields
            >
          >(),
        );
      const queryContext = new StubQueryContextProvider().getQueryContext();

      const id1 = uuidv4();
      const id2 = uuidv4();
      const id3 = uuidv4();
      const { entityMutatorFactory, entityLoaderFactory } = createEntityMutatorFactory([
        {
          customIdField: id1,
          stringField: 'first',
          testIndexedField: '1',
          intField: 1,
          dateField: new Date(),
          nullableField: null,
        },
        {
          customIdField: id2,
          stringField: 'second',
          testIndexedField: '2',
          intField: 2,
          dateField: new Date(),
          nullableField: null,
        },
        {
          customIdField: id3,
          stringField: 'third',
          testIndexedField: '3',
          intField: 3,
          dateField: new Date(),
          nullableField: null,
        },
      ]);

      const entity1 = await enforceAsyncResult(
        entityLoaderFactory
          .forLoad(viewerContext, queryContext, privacyPolicyEvaluationContext)
          .loadByIDAsync(id1),
      );
      const entity2 = await enforceAsyncResult(
        entityLoaderFactory
          .forLoad(viewerContext, queryContext, privacyPolicyEvaluationContext)
          .loadByIDAsync(id2),
      );
      const entity3 = await enforceAsyncResult(
        entityLoaderFactory
          .forLoad(viewerContext, queryContext, privacyPolicyEvaluationContext)
          .loadByIDAsync(id3),
      );

      // Pass in reverse order to verify ordering
      const updatedEntities = await enforceAsyncResult(
        entityMutatorFactory
          .forBatchUpdate([entity3, entity1, entity2], queryContext)
          .setField('stringField', 'updated')
          .updateAsync(),
      );

      expect(updatedEntities).toHaveLength(3);
      expect(updatedEntities[0]!.getID()).toBe(id3);
      expect(updatedEntities[1]!.getID()).toBe(id1);
      expect(updatedEntities[2]!.getID()).toBe(id2);
    });
  });

  describe('forBatchDelete', () => {
    it('deletes multiple entities', async () => {
      const viewerContext = mock<ViewerContext>();
      const privacyPolicyEvaluationContext =
        instance(
          mock<
            EntityPrivacyPolicyEvaluationContext<
              TestFields,
              'customIdField',
              ViewerContext,
              TestEntity,
              keyof TestFields
            >
          >(),
        );
      const queryContext = new StubQueryContextProvider().getQueryContext();

      const id1 = uuidv4();
      const id2 = uuidv4();
      const { entityMutatorFactory, entityLoaderFactory } = createEntityMutatorFactory([
        {
          customIdField: id1,
          stringField: 'hello',
          testIndexedField: '1',
          intField: 1,
          dateField: new Date(),
          nullableField: null,
        },
        {
          customIdField: id2,
          stringField: 'world',
          testIndexedField: '2',
          intField: 2,
          dateField: new Date(),
          nullableField: null,
        },
      ]);

      const entity1 = await enforceAsyncResult(
        entityLoaderFactory
          .forLoad(viewerContext, queryContext, privacyPolicyEvaluationContext)
          .loadByIDAsync(id1),
      );
      const entity2 = await enforceAsyncResult(
        entityLoaderFactory
          .forLoad(viewerContext, queryContext, privacyPolicyEvaluationContext)
          .loadByIDAsync(id2),
      );

      const deleteResult = await entityMutatorFactory
        .forBatchDelete([entity1, entity2], queryContext)
        .deleteAsync();

      expect(deleteResult.ok).toBe(true);

      // Verify entities are no longer loadable
      const loadResult1 = await entityLoaderFactory
        .forLoad(viewerContext, queryContext, privacyPolicyEvaluationContext)
        .loadByIDAsync(id1);
      expect(loadResult1.ok).toBe(false);

      const loadResult2 = await entityLoaderFactory
        .forLoad(viewerContext, queryContext, privacyPolicyEvaluationContext)
        .loadByIDAsync(id2);
      expect(loadResult2.ok).toBe(false);
    });

    it('returns void result for successful batch delete', async () => {
      const viewerContext = mock<ViewerContext>();
      const privacyPolicyEvaluationContext =
        instance(
          mock<
            EntityPrivacyPolicyEvaluationContext<
              TestFields,
              'customIdField',
              ViewerContext,
              TestEntity,
              keyof TestFields
            >
          >(),
        );
      const queryContext = new StubQueryContextProvider().getQueryContext();

      const id1 = uuidv4();
      const { entityMutatorFactory, entityLoaderFactory } = createEntityMutatorFactory([
        {
          customIdField: id1,
          stringField: 'hello',
          testIndexedField: '1',
          intField: 1,
          dateField: new Date(),
          nullableField: null,
        },
      ]);

      const entity1 = await enforceAsyncResult(
        entityLoaderFactory
          .forLoad(viewerContext, queryContext, privacyPolicyEvaluationContext)
          .loadByIDAsync(id1),
      );

      const deleteResult = await entityMutatorFactory
        .forBatchDelete([entity1], queryContext)
        .deleteAsync();

      expect(deleteResult.ok).toBe(true);
      expect(deleteResult.enforceValue()).toBeUndefined();
    });

    it('returns void for empty entity list', async () => {
      const queryContext = new StubQueryContextProvider().getQueryContext();

      const { entityMutatorFactory } = createEntityMutatorFactory([]);
      const result = await entityMutatorFactory.forBatchDelete([], queryContext).deleteAsync();

      expect(result.ok).toBe(true);
    });

    it('aborts entire batch on first auth failure', async () => {
      const entityCompanionProviderMock = mock(EntityCompanionProvider);
      when(entityCompanionProviderMock.getCompanionForEntity(SimpleTestEntity)).thenReturn({
        entityCompanionDefinition: SimpleTestEntity.defineCompanionDefinition(),
      } as any);
      const entityCompanionProvider = instance(entityCompanionProviderMock);

      const viewerContext = instance(mock(ViewerContext));
      const queryContext = new StubQueryContextProvider().getQueryContext();
      const privacyPolicyMock = mock(SimpleTestEntityPrivacyPolicy);
      const databaseAdapter = instance(mock<EntityDatabaseAdapter<SimpleTestFields, 'id'>>());
      const metricsAdapter = instance(mock<IEntityMetricsAdapter>());

      const id1 = uuidv4();
      const fakeEntity1 = new SimpleTestEntity({
        viewerContext,
        id: id1,
        selectedFields: { id: id1 },
        databaseFields: { id: id1 },
      });

      const id2 = uuidv4();
      const fakeEntity2 = new SimpleTestEntity({
        viewerContext,
        id: id2,
        selectedFields: { id: id2 },
        databaseFields: { id: id2 },
      });

      const entityLoaderFactoryMock =
        mock<
          EntityLoaderFactory<
            SimpleTestFields,
            'id',
            ViewerContext,
            SimpleTestEntity,
            SimpleTestEntityPrivacyPolicy,
            keyof SimpleTestFields
          >
        >(EntityLoaderFactory);
      const entityLoaderFactory = instance(entityLoaderFactoryMock);

      const rejectionError = new Error('not authorized');
      when(
        privacyPolicyMock.authorizeDeleteAsync(
          viewerContext,
          anyOfClass(EntityTransactionalQueryContext),
          anything(),
          anyOfClass(SimpleTestEntity),
          anything(),
        ),
      ).thenReject(rejectionError);

      const entityMutatorFactory = new EntityMutatorFactory(
        entityCompanionProvider,
        simpleTestEntityConfiguration,
        SimpleTestEntity,
        instance(privacyPolicyMock),
        {},
        {},
        entityLoaderFactory,
        databaseAdapter,
        metricsAdapter,
      );

      const entityDeleteResult = await entityMutatorFactory
        .forBatchDelete([fakeEntity1, fakeEntity2], queryContext)
        .deleteAsync();
      expect(entityDeleteResult.ok).toBe(false);
      expect(entityDeleteResult.reason).toEqual(rejectionError);
    });

    it('executes triggers per-entity', async () => {
      const viewerContext = mock<ViewerContext>();
      const privacyPolicyEvaluationContext =
        instance(
          mock<
            EntityPrivacyPolicyEvaluationContext<
              TestFields,
              'customIdField',
              ViewerContext,
              TestEntity,
              keyof TestFields
            >
          >(),
        );
      const queryContext = new StubQueryContextProvider().getQueryContext();

      const id1 = uuidv4();
      const id2 = uuidv4();
      const { mutationTriggers, entityMutatorFactory, entityLoaderFactory } =
        createEntityMutatorFactory([
          {
            customIdField: id1,
            stringField: 'a',
            testIndexedField: '1',
            intField: 1,
            dateField: new Date(),
            nullableField: null,
          },
          {
            customIdField: id2,
            stringField: 'b',
            testIndexedField: '2',
            intField: 2,
            dateField: new Date(),
            nullableField: null,
          },
        ]);

      const beforeDeleteSpy = spy(mutationTriggers.beforeDelete![0]!);
      const afterDeleteSpy = spy(mutationTriggers.afterDelete![0]!);
      const beforeAllSpy = spy(mutationTriggers.beforeAll![0]!);
      const afterAllSpy = spy(mutationTriggers.afterAll![0]!);
      const afterCommitSpy = spy(mutationTriggers.afterCommit![0]!);

      const entity1 = await enforceAsyncResult(
        entityLoaderFactory
          .forLoad(viewerContext, queryContext, privacyPolicyEvaluationContext)
          .loadByIDAsync(id1),
      );
      const entity2 = await enforceAsyncResult(
        entityLoaderFactory
          .forLoad(viewerContext, queryContext, privacyPolicyEvaluationContext)
          .loadByIDAsync(id2),
      );

      await enforceAsyncResult(
        entityMutatorFactory.forBatchDelete([entity1, entity2], queryContext).deleteAsync(),
      );

      verify(
        beforeDeleteSpy.executeAsync(
          viewerContext,
          anyOfClass(EntityTransactionalQueryContext),
          anyOfClass(TestEntity),
          deepEqual({ type: EntityMutationType.DELETE, cascadingDeleteCause: null }),
        ),
      ).twice();

      verify(
        afterDeleteSpy.executeAsync(
          viewerContext,
          anyOfClass(EntityTransactionalQueryContext),
          anyOfClass(TestEntity),
          deepEqual({ type: EntityMutationType.DELETE, cascadingDeleteCause: null }),
        ),
      ).twice();

      verify(
        beforeAllSpy.executeAsync(
          viewerContext,
          anyOfClass(EntityTransactionalQueryContext),
          anyOfClass(TestEntity),
          deepEqual({ type: EntityMutationType.DELETE, cascadingDeleteCause: null }),
        ),
      ).twice();

      verify(
        afterAllSpy.executeAsync(
          viewerContext,
          anyOfClass(EntityTransactionalQueryContext),
          anyOfClass(TestEntity),
          deepEqual({ type: EntityMutationType.DELETE, cascadingDeleteCause: null }),
        ),
      ).twice();

      verify(
        afterCommitSpy.executeAsync(
          viewerContext,
          anyOfClass(TestEntity),
          deepEqual({ type: EntityMutationType.DELETE, cascadingDeleteCause: null }),
        ),
      ).twice();
    });

    it('executes validators per-entity', async () => {
      const viewerContext = mock<ViewerContext>();
      const privacyPolicyEvaluationContext =
        instance(
          mock<
            EntityPrivacyPolicyEvaluationContext<
              TestFields,
              'customIdField',
              ViewerContext,
              TestEntity,
              keyof TestFields
            >
          >(),
        );
      const queryContext = new StubQueryContextProvider().getQueryContext();

      const id1 = uuidv4();
      const id2 = uuidv4();
      const { mutationValidators, entityMutatorFactory, entityLoaderFactory } =
        createEntityMutatorFactory([
          {
            customIdField: id1,
            stringField: 'a',
            testIndexedField: '1',
            intField: 1,
            dateField: new Date(),
            nullableField: null,
          },
          {
            customIdField: id2,
            stringField: 'b',
            testIndexedField: '2',
            intField: 2,
            dateField: new Date(),
            nullableField: null,
          },
        ]);

      const beforeDeleteSpy = spy(mutationValidators.beforeDelete![0]!);

      const entity1 = await enforceAsyncResult(
        entityLoaderFactory
          .forLoad(viewerContext, queryContext, privacyPolicyEvaluationContext)
          .loadByIDAsync(id1),
      );
      const entity2 = await enforceAsyncResult(
        entityLoaderFactory
          .forLoad(viewerContext, queryContext, privacyPolicyEvaluationContext)
          .loadByIDAsync(id2),
      );

      await enforceAsyncResult(
        entityMutatorFactory.forBatchDelete([entity1, entity2], queryContext).deleteAsync(),
      );

      verify(
        beforeDeleteSpy.executeAsync(
          viewerContext,
          anyOfClass(EntityTransactionalQueryContext),
          anyOfClass(TestEntity),
          deepEqual({ type: EntityMutationType.DELETE, cascadingDeleteCause: null }),
        ),
      ).twice();
    });
  });
});
