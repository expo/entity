import {
  OrderByOrdering,
  createUnitTestEntityCompanionProvider,
  enforceResultsAsync,
  ViewerContext,
} from '@expo/entity';
import { enforceAsyncResult } from '@expo/results';
import Knex from 'knex';

import PostgresTestEntity from '../testfixtures/PostgresTestEntity';
import { createKnexIntegrationTestEntityCompanionProvider } from '../testfixtures/createKnexIntegrationTestEntityCompanionProvider';

describe('postgres entity integration', () => {
  let knexInstance: Knex;

  beforeAll(() => {
    knexInstance = Knex({
      client: 'pg',
      connection: {
        user: process.env.PGUSER,
        password: process.env.PGPASSWORD,
        host: 'localhost',
        port: parseInt(process.env.PGPORT!, 10),
        database: process.env.PGDATABASE,
      },
    });
  });

  beforeEach(async () => {
    await PostgresTestEntity.createOrTruncatePostgresTable(knexInstance);
  });

  afterAll(async () => {
    await PostgresTestEntity.dropPostgresTable(knexInstance);
    knexInstance.destroy();
  });

  it('supports parallel partial updates', async () => {
    const vc = new ViewerContext(createKnexIntegrationTestEntityCompanionProvider(knexInstance));
    const entity = await enforceAsyncResult(
      PostgresTestEntity.creator(vc).setField('name', 'hello').createAsync()
    );

    // update two different fields at the same time (from the same entity)
    await Promise.all([
      PostgresTestEntity.updater(entity).setField('hasACat', true).updateAsync(),
      PostgresTestEntity.updater(entity).setField('hasADog', false).updateAsync(),
    ]);

    const loadedEntity = await PostgresTestEntity.loader(vc)
      .enforcing()
      .loadByIDAsync(entity.getID());

    expect(loadedEntity.getField('hasACat')).toBe(true);
    expect(loadedEntity.getField('hasADog')).toBe(false);
  });

  describe('empty creates and updates', () => {
    it('allows empty create', async () => {
      const vc = new ViewerContext(createKnexIntegrationTestEntityCompanionProvider(knexInstance));
      const entity = await enforceAsyncResult(PostgresTestEntity.creator(vc).createAsync());
      expect(entity.getID()).toBeTruthy();
    });

    it('throws knex error upon empty update', async () => {
      const vc = new ViewerContext(createKnexIntegrationTestEntityCompanionProvider(knexInstance));
      const entity = await enforceAsyncResult(
        PostgresTestEntity.creator(vc).setField('name', 'hello').createAsync()
      );
      await expect(PostgresTestEntity.updater(entity).updateAsync()).rejects.toThrow();
    });

    it('throws error upon empty update for stub database adapter to match behavior', async () => {
      const vc = new ViewerContext(createUnitTestEntityCompanionProvider());
      const entity = await enforceAsyncResult(
        PostgresTestEntity.creator(vc).setField('name', 'hello').createAsync()
      );
      await expect(PostgresTestEntity.updater(entity).updateAsync()).rejects.toThrow();
    });
  });

  it('supports transactions', async () => {
    const vc1 = new ViewerContext(createKnexIntegrationTestEntityCompanionProvider(knexInstance));

    // put one in the DB
    const firstEntity = await enforceAsyncResult(
      PostgresTestEntity.creator(vc1).setField('name', 'hello').createAsync()
    );

    await enforceAsyncResult(PostgresTestEntity.loader(vc1).loadByIDAsync(firstEntity.getID()));

    const errorToThrow = new Error('Intentional error');

    await expect(
      PostgresTestEntity.runInTransactionAsync(vc1, async (queryContext) => {
        // put another in the DB that will be rolled back due to error thrown
        await enforceAsyncResult(
          PostgresTestEntity.creator(vc1, queryContext).setField('name', 'hello').createAsync()
        );

        throw errorToThrow;
      })
    ).rejects.toEqual(errorToThrow);

    const entities = await enforceResultsAsync(
      PostgresTestEntity.loader(vc1).loadManyByFieldEqualingAsync('name', 'hello')
    );
    expect(entities).toHaveLength(1);
  });

  describe('JSON fields', () => {
    it('supports both types of array fields', async () => {
      const vc1 = new ViewerContext(createKnexIntegrationTestEntityCompanionProvider(knexInstance));

      const entity = await enforceAsyncResult(
        PostgresTestEntity.creator(vc1)
          .setField('stringArray', ['hello', 'world'])
          .setField('jsonArrayField', ['hello', 'world'])
          .createAsync()
      );

      expect(entity.getField('stringArray')).toEqual(['hello', 'world']);
      expect(entity.getField('jsonArrayField')).toEqual(['hello', 'world']);
    });

    it('supports object field', async () => {
      const vc1 = new ViewerContext(createKnexIntegrationTestEntityCompanionProvider(knexInstance));

      const entity = await enforceAsyncResult(
        PostgresTestEntity.creator(vc1)
          .setField('jsonObjectField', { hello: 'world' })
          .createAsync()
      );

      expect(entity.getField('jsonObjectField')).toEqual({ hello: 'world' });
    });

    it('supports MaybeJSONArray field', async () => {
      const vc1 = new ViewerContext(createKnexIntegrationTestEntityCompanionProvider(knexInstance));

      const entity1 = await enforceAsyncResult(
        PostgresTestEntity.creator(vc1)
          .setField('maybeJsonArrayField', ['hello', 'world'])
          .createAsync()
      );
      const entity2 = await enforceAsyncResult(
        PostgresTestEntity.creator(vc1)
          .setField('maybeJsonArrayField', { hello: 'world' })
          .createAsync()
      );

      expect(entity1.getField('maybeJsonArrayField')).toEqual(['hello', 'world']);
      expect(entity2.getField('maybeJsonArrayField')).toEqual({ hello: 'world' });
    });
  });

  describe('conjunction field equality loading', () => {
    it('supports single fieldValue and multiple fieldValues', async () => {
      const vc1 = new ViewerContext(createKnexIntegrationTestEntityCompanionProvider(knexInstance));

      await enforceAsyncResult(
        PostgresTestEntity.creator(vc1)
          .setField('name', 'hello')
          .setField('hasACat', false)
          .setField('hasADog', true)
          .createAsync()
      );

      await enforceAsyncResult(
        PostgresTestEntity.creator(vc1)
          .setField('name', 'world')
          .setField('hasACat', false)
          .setField('hasADog', true)
          .createAsync()
      );

      await enforceAsyncResult(
        PostgresTestEntity.creator(vc1)
          .setField('name', 'wat')
          .setField('hasACat', false)
          .setField('hasADog', false)
          .createAsync()
      );

      const results = await PostgresTestEntity.loader(vc1)
        .enforcing()
        .loadManyByFieldEqualityConjunctionAsync([
          {
            fieldName: 'hasACat',
            fieldValue: false,
          },
          {
            fieldName: 'hasADog',
            fieldValue: true,
          },
        ]);

      expect(results).toHaveLength(2);

      const results2 = await PostgresTestEntity.loader(vc1)
        .enforcing()
        .loadManyByFieldEqualityConjunctionAsync([
          { fieldName: 'hasADog', fieldValues: [true, false] },
        ]);
      expect(results2).toHaveLength(3);
    });

    it('supports query modifiers', async () => {
      const vc1 = new ViewerContext(createKnexIntegrationTestEntityCompanionProvider(knexInstance));

      await enforceAsyncResult(PostgresTestEntity.creator(vc1).setField('name', 'a').createAsync());

      await enforceAsyncResult(PostgresTestEntity.creator(vc1).setField('name', 'b').createAsync());

      await enforceAsyncResult(PostgresTestEntity.creator(vc1).setField('name', 'c').createAsync());

      const results = await PostgresTestEntity.loader(vc1)
        .enforcing()
        .loadManyByFieldEqualityConjunctionAsync([], {
          limit: 2,
          offset: 1,
          orderBy: [
            {
              fieldName: 'name',
              order: OrderByOrdering.DESCENDING,
            },
          ],
        });
      expect(results).toHaveLength(2);
      expect(results.map((e) => e.getField('name'))).toEqual(['b', 'a']);
    });
  });

  describe('raw where clause loading', () => {
    it('loads by raw where clause', async () => {
      const vc1 = new ViewerContext(createKnexIntegrationTestEntityCompanionProvider(knexInstance));
      await enforceAsyncResult(
        PostgresTestEntity.creator(vc1)
          .setField('name', 'hello')
          .setField('hasACat', false)
          .setField('hasADog', true)
          .createAsync()
      );

      const results = await PostgresTestEntity.loader(vc1)
        .enforcing()
        .loadManyByRawWhereClauseAsync('name = ?', ['hello']);

      expect(results).toHaveLength(1);
    });

    it('throws with invalid where clause', async () => {
      const vc1 = new ViewerContext(createKnexIntegrationTestEntityCompanionProvider(knexInstance));
      await enforceAsyncResult(
        PostgresTestEntity.creator(vc1)
          .setField('name', 'hello')
          .setField('hasACat', false)
          .setField('hasADog', true)
          .createAsync()
      );

      await expect(
        PostgresTestEntity.loader(vc1)
          .enforcing()
          .loadManyByRawWhereClauseAsync('invalid_column = ?', ['hello'])
      ).rejects.toThrow();
    });

    it('supports query modifiers', async () => {
      const vc1 = new ViewerContext(createKnexIntegrationTestEntityCompanionProvider(knexInstance));

      await enforceAsyncResult(
        PostgresTestEntity.creator(vc1)
          .setField('name', 'a')
          .setField('hasADog', true)
          .createAsync()
      );

      await enforceAsyncResult(
        PostgresTestEntity.creator(vc1)
          .setField('name', 'b')
          .setField('hasADog', true)
          .createAsync()
      );

      await enforceAsyncResult(
        PostgresTestEntity.creator(vc1)
          .setField('name', 'c')
          .setField('hasADog', true)
          .createAsync()
      );

      const results = await PostgresTestEntity.loader(vc1)
        .enforcing()
        .loadManyByRawWhereClauseAsync('has_a_dog = ?', [true], {
          limit: 2,
          offset: 1,
          orderBy: [
            {
              fieldName: 'name',
              order: OrderByOrdering.ASCENDING,
            },
          ],
        });

      expect(results).toHaveLength(2);
      expect(results.map((e) => e.getField('name'))).toEqual(['b', 'c']);

      const resultsMultipleOrderBy = await PostgresTestEntity.loader(vc1)
        .enforcing()
        .loadManyByRawWhereClauseAsync('has_a_dog = ?', [true], {
          orderBy: [
            {
              fieldName: 'hasADog',
              order: OrderByOrdering.ASCENDING,
            },
            {
              fieldName: 'name',
              order: OrderByOrdering.DESCENDING,
            },
          ],
        });

      expect(resultsMultipleOrderBy).toHaveLength(3);
      expect(resultsMultipleOrderBy.map((e) => e.getField('name'))).toEqual(['c', 'b', 'a']);
    });
  });
});
