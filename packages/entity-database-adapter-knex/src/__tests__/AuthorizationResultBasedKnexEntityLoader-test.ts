import {
  EntityPrivacyPolicyEvaluationContext,
  ViewerContext,
  enforceResultsAsync,
  IEntityMetricsAdapter,
  EntityConstructionUtils,
  EntityQueryContext,
} from '@expo/entity';
import { describe, expect, it } from '@jest/globals';
import { anyOfClass, anything, instance, mock, spy, verify, when } from 'ts-mockito';
import { v4 as uuidv4 } from 'uuid';

import { AuthorizationResultBasedKnexEntityLoader } from '../AuthorizationResultBasedKnexEntityLoader';
import { OrderByOrdering } from '../BasePostgresEntityDatabaseAdapter';
import {
  TestEntity,
  testEntityConfiguration,
  TestEntityPrivacyPolicy,
  TestFields,
} from './fixtures/TestEntity';
import { EntityKnexDataManager } from '../internal/EntityKnexDataManager';

describe(AuthorizationResultBasedKnexEntityLoader, () => {
  it('loads entities with loadManyByFieldEqualityConjunction', async () => {
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
    const queryContext = instance(mock<EntityQueryContext>());

    const knexDataManagerMock =
      mock<EntityKnexDataManager<TestFields, 'customIdField'>>(EntityKnexDataManager);

    const id1 = uuidv4();
    const id2 = uuidv4();
    when(
      knexDataManagerMock.loadManyByFieldEqualityConjunctionAsync(
        queryContext,
        anything(),
        anything(),
      ),
    ).thenResolve([
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
    ]);

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
    const knexEntityLoader = new AuthorizationResultBasedKnexEntityLoader(
      queryContext,
      instance(knexDataManagerMock),
      metricsAdapter,
      constructionUtils,
    );
    const entityResults = await enforceResultsAsync(
      knexEntityLoader.loadManyByFieldEqualityConjunctionAsync([
        {
          fieldName: 'stringField',
          fieldValue: 'huh',
        },
        {
          fieldName: 'intField',
          fieldValues: [4],
        },
      ]),
    );
    expect(entityResults).toHaveLength(2);
    verify(
      spiedPrivacyPolicy.authorizeReadAsync(
        viewerContext,
        queryContext,
        privacyPolicyEvaluationContext,
        anyOfClass(TestEntity),
        anything(),
      ),
    ).twice();

    await expect(
      knexEntityLoader.loadManyByFieldEqualityConjunctionAsync([
        { fieldName: 'customIdField', fieldValue: 'not-a-uuid' },
      ]),
    ).rejects.toThrow('Entity field not valid: TestEntity (customIdField = not-a-uuid)');
  });

  it('loads entities with loadFirstByFieldEqualityConjunction', async () => {
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
    const queryContext = instance(mock<EntityQueryContext>());

    const knexDataManagerMock =
      mock<EntityKnexDataManager<TestFields, 'customIdField'>>(EntityKnexDataManager);
    when(
      knexDataManagerMock.loadManyByFieldEqualityConjunctionAsync(
        queryContext,
        anything(),
        anything(),
      ),
    ).thenResolve([
      {
        customIdField: 'id',
        stringField: 'huh',
        intField: 4,
        testIndexedField: '5',
        dateField: new Date(),
        nullableField: null,
      },
    ]);

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
    const knexEntityLoader = new AuthorizationResultBasedKnexEntityLoader(
      queryContext,
      instance(knexDataManagerMock),
      metricsAdapter,
      constructionUtils,
    );
    const result = await knexEntityLoader.loadFirstByFieldEqualityConjunctionAsync(
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
      { orderBy: [{ fieldName: 'testIndexedField', order: OrderByOrdering.DESCENDING }] },
    );
    expect(result).not.toBeNull();
    expect(result!.ok).toBe(true);

    const resultEntity = result?.enforceValue();
    expect(resultEntity).toBeInstanceOf(TestEntity);
    expect(resultEntity!.getField('testIndexedField')).toEqual('5');

    verify(
      spiedPrivacyPolicy.authorizeReadAsync(
        viewerContext,
        queryContext,
        privacyPolicyEvaluationContext,
        anyOfClass(TestEntity),
        anything(),
      ),
    ).once();
  });

  it('loads entities with loadManyByRawWhereClauseAsync', async () => {
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
    const queryContext = instance(mock<EntityQueryContext>());

    const knexDataManagerMock =
      mock<EntityKnexDataManager<TestFields, 'customIdField'>>(EntityKnexDataManager);
    when(
      knexDataManagerMock.loadManyByRawWhereClauseAsync(
        queryContext,
        anything(),
        anything(),
        anything(),
      ),
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
    const knexDataManager = instance(knexDataManagerMock);

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
    const knexEntityLoader = new AuthorizationResultBasedKnexEntityLoader(
      queryContext,
      knexDataManager,
      metricsAdapter,
      constructionUtils,
    );

    const result = await knexEntityLoader.loadManyByRawWhereClauseAsync('id = ?', [1], {
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
        anything(),
      ),
    ).once();
  });
});
