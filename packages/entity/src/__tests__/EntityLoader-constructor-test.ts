import { instance, mock } from 'ts-mockito';

import Entity from '../Entity';
import { EntityCompanionDefinition } from '../EntityCompanionProvider';
import EntityConfiguration from '../EntityConfiguration';
import { StringField } from '../EntityFields';
import EntityLoader from '../EntityLoader';
import EntityPrivacyPolicy, { EntityPrivacyPolicyEvaluationContext } from '../EntityPrivacyPolicy';
import ViewerContext from '../ViewerContext';
import EntityDataManager from '../internal/EntityDataManager';
import ReadThroughEntityCache from '../internal/ReadThroughEntityCache';
import IEntityMetricsAdapter from '../metrics/IEntityMetricsAdapter';
import AlwaysAllowPrivacyPolicyRule from '../rules/AlwaysAllowPrivacyPolicyRule';
import { NoCacheStubCacheAdapterProvider } from '../utils/testing/StubCacheAdapter';
import StubDatabaseAdapter from '../utils/testing/StubDatabaseAdapter';
import StubQueryContextProvider from '../utils/testing/StubQueryContextProvider';

export type TestFields = {
  id: string;
};

export type TestFieldSelection = keyof TestFields;

export const testEntityConfiguration = new EntityConfiguration<TestFields>({
  idField: 'id',
  tableName: 'test_entity_should_not_write_to_db',
  schema: {
    id: new StringField({
      columnName: 'id',
    }),
  },
  databaseAdapterFlavor: 'postgres',
  cacheAdapterFlavor: 'redis',
});

export class TestEntityPrivacyPolicy extends EntityPrivacyPolicy<
  TestFields,
  string,
  ViewerContext,
  TestEntity,
  TestFieldSelection
> {
  protected override readonly readRules = [
    new AlwaysAllowPrivacyPolicyRule<
      TestFields,
      string,
      ViewerContext,
      TestEntity,
      TestFieldSelection
    >(),
  ];
  protected override readonly createRules = [
    new AlwaysAllowPrivacyPolicyRule<
      TestFields,
      string,
      ViewerContext,
      TestEntity,
      TestFieldSelection
    >(),
  ];
  protected override readonly updateRules = [
    new AlwaysAllowPrivacyPolicyRule<
      TestFields,
      string,
      ViewerContext,
      TestEntity,
      TestFieldSelection
    >(),
  ];
  protected override readonly deleteRules = [
    new AlwaysAllowPrivacyPolicyRule<
      TestFields,
      string,
      ViewerContext,
      TestEntity,
      TestFieldSelection
    >(),
  ];
}

const ID_SENTINEL_THROW_LITERAL = 'throw_literal';
const ID_SENTINEL_THROW_ERROR = 'throw_error';

export default class TestEntity extends Entity<
  TestFields,
  string,
  ViewerContext,
  TestFieldSelection
> {
  constructor(viewerContext: ViewerContext, rawFields: Readonly<TestFields>) {
    if (rawFields.id === ID_SENTINEL_THROW_LITERAL) {
      // eslint-disable-next-line no-throw-literal,@typescript-eslint/no-throw-literal
      throw 'hello';
    } else if (rawFields.id === ID_SENTINEL_THROW_ERROR) {
      throw new Error('world');
    }
    super(viewerContext, rawFields);
  }

  static getCompanionDefinition(): EntityCompanionDefinition<
    TestFields,
    string,
    ViewerContext,
    TestEntity,
    TestEntityPrivacyPolicy,
    TestFieldSelection
  > {
    return testEntityCompanion;
  }
}

export const testEntityCompanion = new EntityCompanionDefinition({
  entityClass: TestEntity,
  entityConfiguration: testEntityConfiguration,
  privacyPolicyClass: TestEntityPrivacyPolicy,
});

describe(EntityLoader, () => {
  it('handles thrown errors and literals from constructor', async () => {
    const viewerContext = instance(mock(ViewerContext));
    const privacyPolicyEvaluationContext = instance(mock<EntityPrivacyPolicyEvaluationContext>());
    const metricsAdapter = instance(mock<IEntityMetricsAdapter>());
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
                id: ID_SENTINEL_THROW_LITERAL,
              },
              {
                id: ID_SENTINEL_THROW_ERROR,
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
      metricsAdapter,
      TestEntity.name
    );
    const entityLoader = new EntityLoader(
      viewerContext,
      queryContext,
      privacyPolicyEvaluationContext,
      testEntityConfiguration,
      TestEntity,
      privacyPolicy,
      dataManager,
      metricsAdapter
    );

    let capturedThrownThing1: any;
    try {
      await entityLoader.resultLoader.loadByIDAsync(ID_SENTINEL_THROW_LITERAL);
    } catch (e) {
      capturedThrownThing1 = e;
    }
    expect(capturedThrownThing1).not.toBeInstanceOf(Error);
    expect(capturedThrownThing1).toEqual('hello');

    const result = await entityLoader.resultLoader.loadByIDAsync(ID_SENTINEL_THROW_ERROR);
    expect(result.ok).toBe(false);
    expect(result.enforceError().message).toEqual('world');
  });
});
