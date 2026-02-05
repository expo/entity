import { EntityConstructionUtils, EntityQueryContext, IEntityMetricsAdapter } from '@expo/entity';
import { result } from '@expo/results';
import { describe, expect, it } from '@jest/globals';
import { anything, instance, mock, when } from 'ts-mockito';

import {
  AuthorizationResultBasedKnexEntityLoader,
  AuthorizationResultBasedSQLQueryBuilder,
} from '../AuthorizationResultBasedKnexEntityLoader';
import { EnforcingKnexEntityLoader } from '../EnforcingKnexEntityLoader';
import { sql } from '../SQLOperator';
import { EntityKnexDataManager } from '../internal/EntityKnexDataManager';

describe(EnforcingKnexEntityLoader, () => {
  describe('loadFirstByFieldEqualityConjunction', () => {
    it('throws when result is unsuccessful', async () => {
      const nonEnforcingKnexEntityLoaderMock = mock(
        AuthorizationResultBasedKnexEntityLoader<any, any, any, any, any, any>,
      );
      const rejection = new Error();
      when(
        nonEnforcingKnexEntityLoaderMock.loadFirstByFieldEqualityConjunctionAsync(
          anything(),
          anything(),
        ),
      ).thenResolve(result(rejection));
      const nonEnforcingKnexEntityLoader = instance(nonEnforcingKnexEntityLoaderMock);
      const enforcingKnexEntityLoader = new EnforcingKnexEntityLoader(
        nonEnforcingKnexEntityLoader,
        instance(mock(EntityQueryContext)),
        instance(mock(EntityKnexDataManager)),
        instance(mock<IEntityMetricsAdapter>()),
        instance(mock(EntityConstructionUtils)),
      );
      await expect(
        enforcingKnexEntityLoader.loadFirstByFieldEqualityConjunctionAsync(anything(), anything()),
      ).rejects.toThrow(rejection);
    });

    it('returns value when result is successful', async () => {
      const nonEnforcingKnexEntityLoaderMock = mock(
        AuthorizationResultBasedKnexEntityLoader<any, any, any, any, any, any>,
      );
      const resolved = {};
      when(
        nonEnforcingKnexEntityLoaderMock.loadFirstByFieldEqualityConjunctionAsync(
          anything(),
          anything(),
        ),
      ).thenResolve(result(resolved));
      const nonEnforcingKnexEntityLoader = instance(nonEnforcingKnexEntityLoaderMock);
      const enforcingKnexEntityLoader = new EnforcingKnexEntityLoader(
        nonEnforcingKnexEntityLoader,
        instance(mock(EntityQueryContext)),
        instance(mock(EntityKnexDataManager)),
        instance(mock<IEntityMetricsAdapter>()),
        instance(mock(EntityConstructionUtils)),
      );
      await expect(
        enforcingKnexEntityLoader.loadFirstByFieldEqualityConjunctionAsync(anything(), anything()),
      ).resolves.toEqual(resolved);
    });

    it('returns null when the query is successful but no rows match', async () => {
      const nonEnforcingKnexEntityLoaderMock = mock(
        AuthorizationResultBasedKnexEntityLoader<any, any, any, any, any, any>,
      );
      when(
        nonEnforcingKnexEntityLoaderMock.loadFirstByFieldEqualityConjunctionAsync(
          anything(),
          anything(),
        ),
      ).thenResolve(null);
      const nonEnforcingKnexEntityLoader = instance(nonEnforcingKnexEntityLoaderMock);
      const enforcingKnexEntityLoader = new EnforcingKnexEntityLoader(
        nonEnforcingKnexEntityLoader,
        instance(mock(EntityQueryContext)),
        instance(mock(EntityKnexDataManager)),
        instance(mock<IEntityMetricsAdapter>()),
        instance(mock(EntityConstructionUtils)),
      );
      await expect(
        enforcingKnexEntityLoader.loadFirstByFieldEqualityConjunctionAsync(anything(), anything()),
      ).resolves.toBeNull();
    });
  });

  describe('loadManyByFieldEqualityConjunction', () => {
    it('throws when result is unsuccessful', async () => {
      const nonEnforcingKnexEntityLoaderMock = mock(
        AuthorizationResultBasedKnexEntityLoader<any, any, any, any, any, any>,
      );
      const rejection = new Error();
      when(
        nonEnforcingKnexEntityLoaderMock.loadManyByFieldEqualityConjunctionAsync(
          anything(),
          anything(),
        ),
      ).thenResolve([result(rejection)]);
      const nonEnforcingKnexEntityLoader = instance(nonEnforcingKnexEntityLoaderMock);
      const enforcingKnexEntityLoader = new EnforcingKnexEntityLoader(
        nonEnforcingKnexEntityLoader,
        instance(mock(EntityQueryContext)),
        instance(mock(EntityKnexDataManager)),
        instance(mock<IEntityMetricsAdapter>()),
        instance(mock(EntityConstructionUtils)),
      );
      await expect(
        enforcingKnexEntityLoader.loadManyByFieldEqualityConjunctionAsync(anything(), anything()),
      ).rejects.toThrow(rejection);
    });

    it('returns value when result is successful', async () => {
      const nonEnforcingKnexEntityLoaderMock = mock(
        AuthorizationResultBasedKnexEntityLoader<any, any, any, any, any, any>,
      );
      const resolved = {};
      when(
        nonEnforcingKnexEntityLoaderMock.loadManyByFieldEqualityConjunctionAsync(
          anything(),
          anything(),
        ),
      ).thenResolve([result(resolved)]);
      const nonEnforcingKnexEntityLoader = instance(nonEnforcingKnexEntityLoaderMock);
      const enforcingKnexEntityLoader = new EnforcingKnexEntityLoader(
        nonEnforcingKnexEntityLoader,
        instance(mock(EntityQueryContext)),
        instance(mock(EntityKnexDataManager)),
        instance(mock<IEntityMetricsAdapter>()),
        instance(mock(EntityConstructionUtils)),
      );
      await expect(
        enforcingKnexEntityLoader.loadManyByFieldEqualityConjunctionAsync(anything(), anything()),
      ).resolves.toEqual([resolved]);
    });
  });

  describe('loadManyByRawWhereClause', () => {
    it('throws when result is unsuccessful', async () => {
      const nonEnforcingKnexEntityLoaderMock = mock(
        AuthorizationResultBasedKnexEntityLoader<any, any, any, any, any, any>,
      );
      const rejection = new Error();
      when(
        nonEnforcingKnexEntityLoaderMock.loadManyByRawWhereClauseAsync(
          anything(),
          anything(),
          anything(),
        ),
      ).thenResolve([result(rejection)]);
      const nonEnforcingKnexEntityLoader = instance(nonEnforcingKnexEntityLoaderMock);
      const enforcingKnexEntityLoader = new EnforcingKnexEntityLoader(
        nonEnforcingKnexEntityLoader,
        instance(mock(EntityQueryContext)),
        instance(mock(EntityKnexDataManager)),
        instance(mock<IEntityMetricsAdapter>()),
        instance(mock(EntityConstructionUtils)),
      );
      await expect(
        enforcingKnexEntityLoader.loadManyByRawWhereClauseAsync(anything(), anything(), anything()),
      ).rejects.toThrow(rejection);
    });

    it('returns value when result is successful', async () => {
      const nonEnforcingKnexEntityLoaderMock = mock(
        AuthorizationResultBasedKnexEntityLoader<any, any, any, any, any, any>,
      );
      const resolved = {};
      when(
        nonEnforcingKnexEntityLoaderMock.loadManyByRawWhereClauseAsync(
          anything(),
          anything(),
          anything(),
        ),
      ).thenResolve([result(resolved)]);
      const nonEnforcingKnexEntityLoader = instance(nonEnforcingKnexEntityLoaderMock);
      const enforcingKnexEntityLoader = new EnforcingKnexEntityLoader(
        nonEnforcingKnexEntityLoader,
        instance(mock(EntityQueryContext)),
        instance(mock(EntityKnexDataManager)),
        instance(mock<IEntityMetricsAdapter>()),
        instance(mock(EntityConstructionUtils)),
      );
      await expect(
        enforcingKnexEntityLoader.loadManyByRawWhereClauseAsync(anything(), anything(), anything()),
      ).resolves.toEqual([resolved]);
    });
  });

  describe('loadManyBySQL', () => {
    it('throws when result is unsuccessful', async () => {
      const nonEnforcingKnexEntityLoaderMock = mock(
        AuthorizationResultBasedKnexEntityLoader<any, any, any, any, any, any>,
      );
      const rejection = new Error('Authorization failed');

      const queryBuilderMock = mock(
        AuthorizationResultBasedSQLQueryBuilder<any, any, any, any, any, any>,
      );
      when(queryBuilderMock.executeAsync()).thenResolve([result(rejection)]);
      const queryBuilder = instance(queryBuilderMock);

      when(nonEnforcingKnexEntityLoaderMock.loadManyBySQL(anything(), anything())).thenReturn(
        queryBuilder,
      );

      const nonEnforcingKnexEntityLoader = instance(nonEnforcingKnexEntityLoaderMock);
      const enforcingKnexEntityLoader = new EnforcingKnexEntityLoader(
        nonEnforcingKnexEntityLoader,
        instance(mock(EntityQueryContext)),
        instance(mock(EntityKnexDataManager)),
        instance(mock<IEntityMetricsAdapter>()),
        instance(mock(EntityConstructionUtils)),
      );

      const enforcingQueryBuilder = enforcingKnexEntityLoader.loadManyBySQL(sql`1=1`);
      await expect(enforcingQueryBuilder.executeAsync()).rejects.toThrow(rejection);
    });

    it('returns value when result is successful', async () => {
      const nonEnforcingKnexEntityLoaderMock = mock(
        AuthorizationResultBasedKnexEntityLoader<any, any, any, any, any, any>,
      );
      const entity1 = { id: '1', name: 'Entity 1' };
      const entity2 = { id: '2', name: 'Entity 2' };

      const queryBuilderMock = mock(
        AuthorizationResultBasedSQLQueryBuilder<any, any, any, any, any, any>,
      );
      when(queryBuilderMock.executeAsync()).thenResolve([result(entity1), result(entity2)]);
      const queryBuilder = instance(queryBuilderMock);

      when(nonEnforcingKnexEntityLoaderMock.loadManyBySQL(anything(), anything())).thenReturn(
        queryBuilder,
      );

      const nonEnforcingKnexEntityLoader = instance(nonEnforcingKnexEntityLoaderMock);
      const enforcingKnexEntityLoader = new EnforcingKnexEntityLoader(
        nonEnforcingKnexEntityLoader,
        instance(mock(EntityQueryContext)),
        instance(mock(EntityKnexDataManager)),
        instance(mock<IEntityMetricsAdapter>()),
        instance(mock(EntityConstructionUtils)),
      );

      const enforcingQueryBuilder = enforcingKnexEntityLoader.loadManyBySQL(sql`1=1`);
      await expect(enforcingQueryBuilder.executeAsync()).resolves.toEqual([entity1, entity2]);
    });
  });

  describe('loadPageBySQLAsync', () => {
    it('throws when result is unsuccessful', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const knexDataManagerMock = mock<EntityKnexDataManager<any, any>>(EntityKnexDataManager);
      const constructionUtilsMock =
        mock<EntityConstructionUtils<any, any, any, any, any, any>>(EntityConstructionUtils);
      const rejection = new Error('Entity not authorized');

      // Mock the data manager to return a connection with field objects
      when(knexDataManagerMock.loadPageBySQLFragmentAsync(anything(), anything())).thenResolve({
        edges: [
          {
            cursor: 'cursor1',
            node: { id: '1', name: 'Entity 1' },
          },
        ],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: 'cursor1',
          endCursor: 'cursor1',
        },
      });

      // Mock constructionUtils to throw when constructing entities
      when(constructionUtilsMock.constructAndAuthorizeEntityAsync(anything())).thenResolve(
        result(rejection),
      );

      const enforcingKnexEntityLoader = new EnforcingKnexEntityLoader(
        instance(mock(AuthorizationResultBasedKnexEntityLoader<any, any, any, any, any, any>)),
        queryContext,
        instance(knexDataManagerMock),
        instance(mock<IEntityMetricsAdapter>()),
        instance(constructionUtilsMock),
      );

      await expect(
        enforcingKnexEntityLoader.loadPageBySQLAsync({
          first: 10,
          orderBy: [],
        }),
      ).rejects.toThrow(rejection);
    });

    it('returns value when result is successful', async () => {
      const queryContext = instance(mock(EntityQueryContext));
      const knexDataManagerMock = mock<EntityKnexDataManager<any, any>>(EntityKnexDataManager);
      const constructionUtilsMock =
        mock<EntityConstructionUtils<any, any, any, any, any, any>>(EntityConstructionUtils);
      const entity1 = { id: '1', name: 'Entity 1', getID: () => '1' };
      const entity2 = { id: '2', name: 'Entity 2', getID: () => '2' };

      when(knexDataManagerMock.loadPageBySQLFragmentAsync(anything(), anything())).thenResolve({
        edges: [
          {
            cursor: 'cursor1',
            node: { id: '1', name: 'Entity 1' },
          },
          {
            cursor: 'cursor2',
            node: { id: '2', name: 'Entity 2' },
          },
        ],
        pageInfo: {
          hasNextPage: true,
          hasPreviousPage: false,
          startCursor: 'cursor1',
          endCursor: 'cursor2',
        },
      });

      when(constructionUtilsMock.constructAndAuthorizeEntityAsync(anything())).thenCall(
        async (fieldObject: any) => {
          if (fieldObject.id === '1') {
            return result(entity1);
          } else if (fieldObject.id === '2') {
            return result(entity2);
          }
          throw new Error('Unexpected field object');
        },
      );

      const enforcingKnexEntityLoader = new EnforcingKnexEntityLoader(
        instance(mock(AuthorizationResultBasedKnexEntityLoader<any, any, any, any, any, any>)),
        queryContext,
        instance(knexDataManagerMock),
        instance(mock<IEntityMetricsAdapter>()),
        instance(constructionUtilsMock),
      );

      const connection = await enforcingKnexEntityLoader.loadPageBySQLAsync({
        first: 10,
        orderBy: [],
      });

      expect(connection.edges).toHaveLength(2);
      expect(connection.edges[0]).toEqual({
        cursor: 'cursor1',
        node: entity1,
      });
      expect(connection.edges[1]).toEqual({
        cursor: 'cursor2',
        node: entity2,
      });
      expect(connection.pageInfo).toEqual({
        hasNextPage: true,
        hasPreviousPage: false,
        startCursor: 'cursor1',
        endCursor: 'cursor2',
      });
    });
  });

  it('has the same method names as AuthorizationResultBasedKnexEntityLoader', () => {
    const enforcingKnexLoaderProperties = Object.getOwnPropertyNames(
      EnforcingKnexEntityLoader.prototype,
    );
    const nonEnforcingKnexLoaderProperties = Object.getOwnPropertyNames(
      AuthorizationResultBasedKnexEntityLoader.prototype,
    );

    // The knex loaders don't have the internal validation methods that regular loaders have,
    // so we just check that all methods match without any exclusions
    expect(enforcingKnexLoaderProperties).toEqual(nonEnforcingKnexLoaderProperties);
  });
});
