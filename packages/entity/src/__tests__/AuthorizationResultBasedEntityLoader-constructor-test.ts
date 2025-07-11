import { describe, expect, it } from '@jest/globals';
import { instance, mock } from 'ts-mockito';

import { AuthorizationResultBasedEntityLoader } from '../AuthorizationResultBasedEntityLoader';
import { Entity } from '../Entity';
import { EntityCompanionDefinition } from '../EntityCompanionProvider';
import { EntityConfiguration } from '../EntityConfiguration';
import { StringField } from '../EntityFields';
import { EntityLoaderUtils } from '../EntityLoaderUtils';
import { EntityPrivacyPolicy, EntityPrivacyPolicyEvaluationContext } from '../EntityPrivacyPolicy';
import { ViewerContext } from '../ViewerContext';
import { EntityDataManager } from '../internal/EntityDataManager';
import { ReadThroughEntityCache } from '../internal/ReadThroughEntityCache';
import { IEntityMetricsAdapter } from '../metrics/IEntityMetricsAdapter';
import { AlwaysAllowPrivacyPolicyRule } from '../rules/AlwaysAllowPrivacyPolicyRule';
import { NoCacheStubCacheAdapterProvider } from '../utils/__testfixtures__/StubCacheAdapter';
import { StubDatabaseAdapter } from '../utils/__testfixtures__/StubDatabaseAdapter';
import { StubQueryContextProvider } from '../utils/__testfixtures__/StubQueryContextProvider';

export type TestFields = {
  id: string;
};

export type TestFieldSelection = keyof TestFields;

export const testEntityConfiguration = new EntityConfiguration<TestFields, 'id'>({
  idField: 'id',
  tableName: 'test_entity_should_not_write_to_db',
  schema: {
    id: new StringField({
      columnName: 'id',
      cache: false,
    }),
  },
  databaseAdapterFlavor: 'postgres',
  cacheAdapterFlavor: 'redis',
});

export class TestEntityPrivacyPolicy extends EntityPrivacyPolicy<
  TestFields,
  'id',
  ViewerContext,
  TestEntity,
  TestFieldSelection
> {
  protected override readonly readRules = [
    new AlwaysAllowPrivacyPolicyRule<
      TestFields,
      'id',
      ViewerContext,
      TestEntity,
      TestFieldSelection
    >(),
  ];
  protected override readonly createRules = [
    new AlwaysAllowPrivacyPolicyRule<
      TestFields,
      'id',
      ViewerContext,
      TestEntity,
      TestFieldSelection
    >(),
  ];
  protected override readonly updateRules = [
    new AlwaysAllowPrivacyPolicyRule<
      TestFields,
      'id',
      ViewerContext,
      TestEntity,
      TestFieldSelection
    >(),
  ];
  protected override readonly deleteRules = [
    new AlwaysAllowPrivacyPolicyRule<
      TestFields,
      'id',
      ViewerContext,
      TestEntity,
      TestFieldSelection
    >(),
  ];
}

const ID_SENTINEL_THROW_LITERAL = 'throw_literal';
const ID_SENTINEL_THROW_ERROR = 'throw_error';

export class TestEntity extends Entity<TestFields, 'id', ViewerContext, TestFieldSelection> {
  constructor(constructorParams: {
    viewerContext: ViewerContext;
    id: string;
    databaseFields: Readonly<TestFields>;
    selectedFields: Readonly<TestFields>;
  }) {
    if (constructorParams.selectedFields.id === ID_SENTINEL_THROW_LITERAL) {
      // eslint-disable-next-line no-throw-literal,@typescript-eslint/only-throw-error
      throw 'hello';
    } else if (constructorParams.selectedFields.id === ID_SENTINEL_THROW_ERROR) {
      throw new Error('world');
    }
    super(constructorParams);
  }

  static defineCompanionDefinition(): EntityCompanionDefinition<
    TestFields,
    'id',
    ViewerContext,
    TestEntity,
    TestEntityPrivacyPolicy,
    TestFieldSelection
  > {
    return {
      entityClass: TestEntity,
      entityConfiguration: testEntityConfiguration,
      privacyPolicyClass: TestEntityPrivacyPolicy,
    };
  }
}

describe(AuthorizationResultBasedEntityLoader, () => {
  it('handles thrown errors and literals from constructor', async () => {
    const viewerContext = instance(mock(ViewerContext));
    const privacyPolicyEvaluationContext =
      instance(
        mock<
          EntityPrivacyPolicyEvaluationContext<
            TestFields,
            'id',
            ViewerContext,
            TestEntity,
            TestFieldSelection
          >
        >(),
      );
    const metricsAdapter = instance(mock<IEntityMetricsAdapter>());
    const queryContext = new StubQueryContextProvider().getQueryContext();

    const databaseAdapter = new StubDatabaseAdapter<TestFields, 'id'>(
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
      metricsAdapter,
      TestEntity.name,
    );
    const utils = new EntityLoaderUtils(
      viewerContext,
      queryContext,
      privacyPolicyEvaluationContext,
      testEntityConfiguration,
      TestEntity,
      /* entitySelectedFields */ undefined,
      privacyPolicy,
      dataManager,
      metricsAdapter,
    );
    const entityLoader = new AuthorizationResultBasedEntityLoader(
      queryContext,
      testEntityConfiguration,
      TestEntity,
      dataManager,
      metricsAdapter,
      utils,
    );

    let capturedThrownThing1: any;
    try {
      await entityLoader.loadByIDAsync(ID_SENTINEL_THROW_LITERAL);
    } catch (e) {
      capturedThrownThing1 = e;
    }
    expect(capturedThrownThing1).not.toBeInstanceOf(Error);
    expect(capturedThrownThing1).toEqual('hello');

    const result = await entityLoader.loadByIDAsync(ID_SENTINEL_THROW_ERROR);
    expect(result.ok).toBe(false);
    expect(result.enforceError().message).toEqual('world');
  });
});
