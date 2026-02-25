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
import { PaginationStrategy } from '../PaginationStrategy';
import { sql } from '../SQLOperator';
import {
  TestEntity,
  testEntityConfiguration,
  TestEntityPrivacyPolicy,
  TestFields,
} from './fixtures/TestEntity';
import {
  TestPaginationEntity,
  testPaginationEntityConfiguration,
  TestPaginationPrivacyPolicy,
  TestPaginationFields,
} from './fixtures/TestPaginationEntity';
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

  describe('loads entities with loadManyBySQL', () => {
    it('returns entities with authorization results', async () => {
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
        knexDataManagerMock.loadManyBySQLFragmentAsync(queryContext, anything(), anything()),
      ).thenResolve([
        {
          customIdField: id1,
          stringField: 'test1',
          intField: 1,
          testIndexedField: '1',
          dateField: new Date(),
          nullableField: null,
        },
        {
          customIdField: id2,
          stringField: 'test2',
          intField: 2,
          testIndexedField: '2',
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

      const queryBuilder = knexEntityLoader.loadManyBySQL(sql`intField > ${0}`);
      const results = await queryBuilder.executeAsync();

      expect(results).toHaveLength(2);
      expect(results[0]!.ok).toBe(true);
      expect(results[1]!.ok).toBe(true);

      const entity1 = results[0]!.enforceValue();
      const entity2 = results[1]!.enforceValue();
      expect(entity1.getField('stringField')).toEqual('test1');
      expect(entity2.getField('stringField')).toEqual('test2');

      verify(
        spiedPrivacyPolicy.authorizeReadAsync(
          viewerContext,
          queryContext,
          privacyPolicyEvaluationContext,
          anyOfClass(TestEntity),
          anything(),
        ),
      ).twice();
    });

    it('supports chaining query builder methods', async () => {
      const privacyPolicy = new TestEntityPrivacyPolicy();
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
        knexDataManagerMock.loadManyBySQLFragmentAsync(queryContext, anything(), anything()),
      ).thenCall(async (_context, _fragment, modifiers) => {
        // Verify the modifiers are passed correctly
        expect(modifiers?.limit).toEqual(5);
        expect(modifiers?.orderBy).toEqual([
          { fieldName: 'intField', order: OrderByOrdering.DESCENDING },
        ]);
        return [
          {
            customIdField: uuidv4(),
            stringField: 'result',
            intField: 10,
            testIndexedField: '1',
            dateField: new Date(),
            nullableField: null,
          },
        ];
      });

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

      const results = await knexEntityLoader
        .loadManyBySQL(sql`status = ${'active'}`)
        .orderBy('intField', OrderByOrdering.DESCENDING)
        .limit(5)
        .executeAsync();

      expect(results).toHaveLength(1);
      expect(results[0]!.ok).toBe(true);
    });
  });

  describe('loads entities with loadPageAsync', () => {
    it('returns paginated entities with forward pagination', async () => {
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
      when(knexDataManagerMock.loadPageAsync(queryContext, anything())).thenResolve({
        edges: [
          {
            cursor: 'cursor1',
            node: {
              customIdField: id1,
              stringField: 'page1',
              intField: 1,
              testIndexedField: '1',
              dateField: new Date(),
              nullableField: null,
            },
          },
          {
            cursor: 'cursor2',
            node: {
              customIdField: id2,
              stringField: 'page2',
              intField: 2,
              testIndexedField: '2',
              dateField: new Date(),
              nullableField: null,
            },
          },
        ],
        pageInfo: {
          hasNextPage: true,
          hasPreviousPage: false,
          startCursor: 'cursor1',
          endCursor: 'cursor2',
        },
      });

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

      const connection = await knexEntityLoader.loadPageAsync({
        first: 10,
        where: sql`intField > ${0}`,
        pagination: {
          strategy: PaginationStrategy.STANDARD,
          orderBy: [{ fieldName: 'intField', order: OrderByOrdering.ASCENDING }],
        },
      });

      expect(connection.edges).toHaveLength(2);
      expect(connection.edges[0]!.cursor).toEqual('cursor1');
      expect(connection.edges[0]!.node.getField('stringField')).toEqual('page1');
      expect(connection.edges[1]!.cursor).toEqual('cursor2');
      expect(connection.edges[1]!.node.getField('stringField')).toEqual('page2');

      expect(connection.pageInfo).toEqual({
        hasNextPage: true,
        hasPreviousPage: false,
        startCursor: 'cursor1',
        endCursor: 'cursor2',
      });

      verify(
        spiedPrivacyPolicy.authorizeReadAsync(
          viewerContext,
          queryContext,
          privacyPolicyEvaluationContext,
          anyOfClass(TestEntity),
          anything(),
        ),
      ).twice();
    });

    it('filters out entities that fail authorization', async () => {
      const privacyPolicy = new TestPaginationPrivacyPolicy();
      const viewerContext = instance(mock(ViewerContext));
      const privacyPolicyEvaluationContext =
        instance(
          mock<
            EntityPrivacyPolicyEvaluationContext<
              TestPaginationFields,
              'id',
              ViewerContext,
              TestPaginationEntity
            >
          >(),
        );
      const metricsAdapter = instance(mock<IEntityMetricsAdapter>());
      const queryContext = instance(mock<EntityQueryContext>());

      const knexDataManagerMock =
        mock<EntityKnexDataManager<TestPaginationFields, 'id'>>(EntityKnexDataManager);

      const id1 = uuidv4();
      const id2 = uuidv4();
      const id3 = uuidv4();
      when(knexDataManagerMock.loadPageAsync(queryContext, anything())).thenResolve({
        edges: [
          {
            cursor: 'cursor1',
            node: {
              id: id1,
              name: 'Entity 1',
              status: 'active',
              createdAt: new Date('2024-01-01'),
              score: 100,
            },
          },
          {
            cursor: 'cursor2',
            node: {
              id: id2,
              name: 'Entity 2',
              status: 'unauthorized', // This will fail authorization
              createdAt: new Date('2024-01-02'),
              score: 200,
            },
          },
          {
            cursor: 'cursor3',
            node: {
              id: id3,
              name: 'Entity 3',
              status: 'active',
              createdAt: new Date('2024-01-03'),
              score: 300,
            },
          },
        ],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: 'cursor1',
          endCursor: 'cursor3',
        },
      });

      const constructionUtils = new EntityConstructionUtils(
        viewerContext,
        queryContext,
        privacyPolicyEvaluationContext,
        testPaginationEntityConfiguration,
        TestPaginationEntity,
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

      const connection = await knexEntityLoader.loadPageAsync({
        first: 10,
        where: sql`score > ${0}`,
        pagination: {
          strategy: PaginationStrategy.STANDARD,
          orderBy: [{ fieldName: 'createdAt', order: OrderByOrdering.ASCENDING }],
        },
      });

      // Should only have 2 entities (unauthorized one filtered out)
      expect(connection.edges).toHaveLength(2);
      expect(connection.edges[0]!.node.getField('name')).toEqual('Entity 1');
      expect(connection.edges[1]!.node.getField('name')).toEqual('Entity 3');

      // Cursors should be maintained from successful entities only
      expect(connection.edges[0]!.cursor).toEqual('cursor1');
      expect(connection.edges[1]!.cursor).toEqual('cursor3');

      expect(connection.pageInfo).toEqual({
        hasNextPage: false,
        hasPreviousPage: false,
        startCursor: 'cursor1',
        endCursor: 'cursor3',
      });
    });

    it('supports backward pagination with last/before', async () => {
      const privacyPolicy = new TestEntityPrivacyPolicy();
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

      when(knexDataManagerMock.loadPageAsync(queryContext, anything())).thenResolve({
        edges: [
          {
            cursor: 'cursor5',
            node: {
              customIdField: uuidv4(),
              stringField: 'item5',
              intField: 5,
              testIndexedField: '5',
              dateField: new Date(),
              nullableField: null,
            },
          },
        ],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: true,
          startCursor: 'cursor5',
          endCursor: 'cursor5',
        },
      });

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

      const connection = await knexEntityLoader.loadPageAsync({
        last: 5,
        before: 'someCursor',
        pagination: {
          strategy: PaginationStrategy.STANDARD,
          orderBy: [{ fieldName: 'intField', order: OrderByOrdering.ASCENDING }],
        },
      });

      expect(connection.edges).toHaveLength(1);
      expect(connection.pageInfo.hasPreviousPage).toBe(true);
      expect(connection.pageInfo.hasNextPage).toBe(false);
    });
  });

  describe('loads entities with loadPageAsync (search)', () => {
    it('performs ILIKE search and filters unauthorized entities', async () => {
      const privacyPolicy = new TestPaginationPrivacyPolicy();
      const viewerContext = instance(mock(ViewerContext));
      const privacyPolicyEvaluationContext =
        instance(
          mock<
            EntityPrivacyPolicyEvaluationContext<
              TestPaginationFields,
              'id',
              ViewerContext,
              TestPaginationEntity
            >
          >(),
        );
      const metricsAdapter = instance(mock<IEntityMetricsAdapter>());
      const queryContext = instance(mock<EntityQueryContext>());

      const knexDataManagerMock =
        mock<EntityKnexDataManager<TestPaginationFields, 'id'>>(EntityKnexDataManager);

      const id1 = uuidv4();
      const id2 = uuidv4();
      const id3 = uuidv4();

      // Mock data manager to return 3 entities from search
      when(knexDataManagerMock.loadPageAsync(queryContext, anything())).thenResolve({
        edges: [
          {
            cursor: 'cursor1',
            node: {
              id: id1,
              name: 'Alice Johnson',
              status: 'active',
              createdAt: new Date(),
              score: 1,
            },
          },
          {
            cursor: 'cursor2',
            node: {
              id: id2,
              name: 'Bob Johnson',
              status: 'unauthorized', // This will fail authorization per TestPaginationPrivacyPolicy
              createdAt: new Date(),
              score: 2,
            },
          },
          {
            cursor: 'cursor3',
            node: {
              id: id3,
              name: 'Charlie Johnson',
              status: 'active',
              createdAt: new Date(),
              score: 3,
            },
          },
        ],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: 'cursor1',
          endCursor: 'cursor3',
        },
      });

      const constructionUtils = new EntityConstructionUtils(
        viewerContext,
        queryContext,
        privacyPolicyEvaluationContext,
        testPaginationEntityConfiguration,
        TestPaginationEntity,
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

      const connection = await knexEntityLoader.loadPageAsync({
        first: 10,
        pagination: {
          strategy: PaginationStrategy.ILIKE_SEARCH,
          term: 'Johnson',
          fields: ['name'],
        },
      });

      // Should only have 2 edges (Bob was filtered out)
      expect(connection.edges).toHaveLength(2);
      expect(connection.edges[0]?.node.getField('id')).toBe(id1);
      expect(connection.edges[0]?.node.getField('name')).toBe('Alice Johnson');
      expect(connection.edges[1]?.node.getField('id')).toBe(id3);
      expect(connection.edges[1]?.node.getField('name')).toBe('Charlie Johnson');

      // Cursors should be updated to reflect only authorized entities
      expect(connection.pageInfo.startCursor).toBe('cursor1');
      expect(connection.pageInfo.endCursor).toBe('cursor3');
    });

    it('performs TRIGRAM search with cursor pagination', async () => {
      const privacyPolicy = new TestPaginationPrivacyPolicy();
      const viewerContext = instance(mock(ViewerContext));
      const privacyPolicyEvaluationContext =
        instance(
          mock<
            EntityPrivacyPolicyEvaluationContext<
              TestPaginationFields,
              'id',
              ViewerContext,
              TestPaginationEntity
            >
          >(),
        );
      const metricsAdapter = instance(mock<IEntityMetricsAdapter>());
      const queryContext = instance(mock<EntityQueryContext>());

      const knexDataManagerMock =
        mock<EntityKnexDataManager<TestPaginationFields, 'id'>>(EntityKnexDataManager);

      const id1 = uuidv4();
      const id2 = uuidv4();

      // Mock first page of TRIGRAM search results
      when(knexDataManagerMock.loadPageAsync(queryContext, anything())).thenResolve({
        edges: [
          {
            cursor: 'cursor1',
            node: {
              id: id1,
              name: 'Johnson', // Exact match
              status: 'active',
              createdAt: new Date(),
              score: 1,
            },
          },
          {
            cursor: 'cursor2',
            node: {
              id: id2,
              name: 'Jonson', // Similar match
              status: 'active',
              createdAt: new Date(),
              score: 2,
            },
          },
        ],
        pageInfo: {
          hasNextPage: true,
          hasPreviousPage: false,
          startCursor: 'cursor1',
          endCursor: 'cursor2',
        },
      });

      const constructionUtils = new EntityConstructionUtils(
        viewerContext,
        queryContext,
        privacyPolicyEvaluationContext,
        testPaginationEntityConfiguration,
        TestPaginationEntity,
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

      const connection = await knexEntityLoader.loadPageAsync({
        first: 2,
        after: 'someCursor',
        pagination: {
          strategy: PaginationStrategy.TRIGRAM_SEARCH,
          term: 'Johnson',
          fields: ['name'],
          threshold: 0.3,
          extraOrderBy: [{ fieldName: 'score', order: OrderByOrdering.DESCENDING }],
        },
      });

      expect(connection.edges).toHaveLength(2);
      expect(connection.edges[0]?.node.getField('name')).toBe('Johnson');
      expect(connection.edges[1]?.node.getField('name')).toBe('Jonson');
      expect(connection.pageInfo.hasNextPage).toBe(true);
    });

    it('handles backward pagination with search', async () => {
      const privacyPolicy = new TestPaginationPrivacyPolicy();
      const viewerContext = instance(mock(ViewerContext));
      const privacyPolicyEvaluationContext =
        instance(
          mock<
            EntityPrivacyPolicyEvaluationContext<
              TestPaginationFields,
              'id',
              ViewerContext,
              TestPaginationEntity
            >
          >(),
        );
      const metricsAdapter = instance(mock<IEntityMetricsAdapter>());
      const queryContext = instance(mock<EntityQueryContext>());

      const knexDataManagerMock =
        mock<EntityKnexDataManager<TestPaginationFields, 'id'>>(EntityKnexDataManager);

      const id1 = uuidv4();
      const id2 = uuidv4();

      // Mock backward pagination results
      when(knexDataManagerMock.loadPageAsync(queryContext, anything())).thenResolve({
        edges: [
          {
            cursor: 'cursor1',
            node: {
              id: id1,
              name: 'Charlie Smith',
              status: 'active',
              createdAt: new Date(),
              score: 3,
            },
          },
          {
            cursor: 'cursor2',
            node: {
              id: id2,
              name: 'David Smith',
              status: 'active',
              createdAt: new Date(),
              score: 4,
            },
          },
        ],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: true,
          startCursor: 'cursor1',
          endCursor: 'cursor2',
        },
      });

      const constructionUtils = new EntityConstructionUtils(
        viewerContext,
        queryContext,
        privacyPolicyEvaluationContext,
        testPaginationEntityConfiguration,
        TestPaginationEntity,
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

      const connection = await knexEntityLoader.loadPageAsync({
        last: 2,
        before: 'someCursor',
        pagination: {
          strategy: PaginationStrategy.ILIKE_SEARCH,
          term: 'Smith',
          fields: ['name'],
        },
      });

      expect(connection.edges).toHaveLength(2);
      expect(connection.pageInfo.hasPreviousPage).toBe(true);
      expect(connection.pageInfo.hasNextPage).toBe(false);
    });

    it('handles empty search results', async () => {
      const privacyPolicy = new TestPaginationPrivacyPolicy();
      const viewerContext = instance(mock(ViewerContext));
      const privacyPolicyEvaluationContext =
        instance(
          mock<
            EntityPrivacyPolicyEvaluationContext<
              TestPaginationFields,
              'id',
              ViewerContext,
              TestPaginationEntity
            >
          >(),
        );
      const metricsAdapter = instance(mock<IEntityMetricsAdapter>());
      const queryContext = instance(mock<EntityQueryContext>());

      const knexDataManagerMock =
        mock<EntityKnexDataManager<TestPaginationFields, 'id'>>(EntityKnexDataManager);

      // Mock empty search results
      when(knexDataManagerMock.loadPageAsync(queryContext, anything())).thenResolve({
        edges: [],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: null,
          endCursor: null,
        },
      });

      const constructionUtils = new EntityConstructionUtils(
        viewerContext,
        queryContext,
        privacyPolicyEvaluationContext,
        testPaginationEntityConfiguration,
        TestPaginationEntity,
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

      const connection = await knexEntityLoader.loadPageAsync({
        first: 10,
        pagination: {
          strategy: PaginationStrategy.ILIKE_SEARCH,
          term: 'NonexistentTerm',
          fields: ['name'],
        },
      });

      expect(connection.edges).toHaveLength(0);
      expect(connection.pageInfo.startCursor).toBeNull();
      expect(connection.pageInfo.endCursor).toBeNull();
    });

    it('handles all entities failing authorization', async () => {
      const privacyPolicy = new TestPaginationPrivacyPolicy();
      const viewerContext = instance(mock(ViewerContext));
      const privacyPolicyEvaluationContext =
        instance(
          mock<
            EntityPrivacyPolicyEvaluationContext<
              TestPaginationFields,
              'id',
              ViewerContext,
              TestPaginationEntity
            >
          >(),
        );
      const metricsAdapter = instance(mock<IEntityMetricsAdapter>());
      const queryContext = instance(mock<EntityQueryContext>());

      const knexDataManagerMock =
        mock<EntityKnexDataManager<TestPaginationFields, 'id'>>(EntityKnexDataManager);

      const id1 = uuidv4();
      const id2 = uuidv4();

      // Mock search results
      when(knexDataManagerMock.loadPageAsync(queryContext, anything())).thenResolve({
        edges: [
          {
            cursor: 'cursor1',
            node: {
              id: id1,
              name: 'Alice',
              status: 'unauthorized', // This will fail authorization
              createdAt: new Date(),
              score: 1,
            },
          },
          {
            cursor: 'cursor2',
            node: {
              id: id2,
              name: 'Bob',
              status: 'unauthorized', // This will fail authorization
              createdAt: new Date(),
              score: 2,
            },
          },
        ],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: 'cursor1',
          endCursor: 'cursor2',
        },
      });

      const constructionUtils = new EntityConstructionUtils(
        viewerContext,
        queryContext,
        privacyPolicyEvaluationContext,
        testPaginationEntityConfiguration,
        TestPaginationEntity,
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

      const connection = await knexEntityLoader.loadPageAsync({
        first: 10,
        pagination: {
          strategy: PaginationStrategy.ILIKE_SEARCH,
          term: 'test',
          fields: ['name'],
        },
      });

      // All entities filtered out due to failed authorization
      expect(connection.edges).toHaveLength(0);
      expect(connection.pageInfo.startCursor).toBeNull();
      expect(connection.pageInfo.endCursor).toBeNull();
    });
  });
});
