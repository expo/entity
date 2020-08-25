import {
  OrderByOrdering,
  createUnitTestEntityCompanionProvider,
  enforceResultsAsync,
  ViewerContext,
} from '@expo/entity';
import { enforceAsyncResult } from '@expo/results';
import Knex from 'knex';

import PostgresTestEntity from '../testfixtures/PostgresTestEntity';
import PostgresTriggerTestEntity from '../testfixtures/PostgresTriggerTestEntity';
import PostgresValidatorTestEntity from '../testfixtures/PostgresValidatorTestEntity';
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
    await knexInstance.destroy();
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

  describe('trigger transaction behavior', () => {
    describe('create', () => {
      it('rolls back transaction when trigger throws except afterCommit', async () => {
        const vc1 = new ViewerContext(
          createKnexIntegrationTestEntityCompanionProvider(knexInstance)
        );

        await expect(
          PostgresTriggerTestEntity.creator(vc1)
            .setField('name', 'beforeCreate')
            .enforceCreateAsync()
        ).rejects.toThrowError('name cannot have value beforeCreate');
        await expect(
          PostgresTriggerTestEntity.loader(vc1)
            .enforcing()
            .loadByFieldEqualingAsync('name', 'beforeCreate')
        ).resolves.toBeNull();

        await expect(
          PostgresTriggerTestEntity.creator(vc1)
            .setField('name', 'afterCreate')
            .enforceCreateAsync()
        ).rejects.toThrowError('name cannot have value afterCreate');
        await expect(
          PostgresTriggerTestEntity.loader(vc1)
            .enforcing()
            .loadByFieldEqualingAsync('name', 'afterCreate')
        ).resolves.toBeNull();

        await expect(
          PostgresTriggerTestEntity.creator(vc1).setField('name', 'beforeAll').enforceCreateAsync()
        ).rejects.toThrowError('name cannot have value beforeAll');
        await expect(
          PostgresTriggerTestEntity.loader(vc1)
            .enforcing()
            .loadByFieldEqualingAsync('name', 'beforeAll')
        ).resolves.toBeNull();

        await expect(
          PostgresTriggerTestEntity.creator(vc1).setField('name', 'afterAll').enforceCreateAsync()
        ).rejects.toThrowError('name cannot have value afterAll');
        await expect(
          PostgresTriggerTestEntity.loader(vc1)
            .enforcing()
            .loadByFieldEqualingAsync('name', 'afterAll')
        ).resolves.toBeNull();

        await expect(
          PostgresTriggerTestEntity.creator(vc1)
            .setField('name', 'afterCommit')
            .enforceCreateAsync()
        ).rejects.toThrowError('name cannot have value afterCommit');
        await expect(
          PostgresTriggerTestEntity.loader(vc1)
            .enforcing()
            .loadByFieldEqualingAsync('name', 'afterCommit')
        ).resolves.not.toBeNull();
      });
    });

    describe('update', () => {
      it('rolls back transaction when trigger throws except afterCommit', async () => {
        const vc1 = new ViewerContext(
          createKnexIntegrationTestEntityCompanionProvider(knexInstance)
        );

        const entity = await PostgresTriggerTestEntity.creator(vc1)
          .setField('name', 'blah')
          .enforceCreateAsync();

        await expect(
          PostgresTriggerTestEntity.updater(entity)
            .setField('name', 'beforeUpdate')
            .enforceUpdateAsync()
        ).rejects.toThrowError('name cannot have value beforeUpdate');
        await expect(
          PostgresTriggerTestEntity.loader(vc1)
            .enforcing()
            .loadByFieldEqualingAsync('name', 'beforeUpdate')
        ).resolves.toBeNull();

        await expect(
          PostgresTriggerTestEntity.updater(entity)
            .setField('name', 'afterUpdate')
            .enforceUpdateAsync()
        ).rejects.toThrowError('name cannot have value afterUpdate');
        await expect(
          PostgresTriggerTestEntity.loader(vc1)
            .enforcing()
            .loadByFieldEqualingAsync('name', 'afterUpdate')
        ).resolves.toBeNull();

        await expect(
          PostgresTriggerTestEntity.updater(entity)
            .setField('name', 'beforeAll')
            .enforceUpdateAsync()
        ).rejects.toThrowError('name cannot have value beforeAll');
        await expect(
          PostgresTriggerTestEntity.loader(vc1)
            .enforcing()
            .loadByFieldEqualingAsync('name', 'beforeAll')
        ).resolves.toBeNull();

        await expect(
          PostgresTriggerTestEntity.updater(entity)
            .setField('name', 'afterAll')
            .enforceUpdateAsync()
        ).rejects.toThrowError('name cannot have value afterAll');
        await expect(
          PostgresTriggerTestEntity.loader(vc1)
            .enforcing()
            .loadByFieldEqualingAsync('name', 'afterAll')
        ).resolves.toBeNull();

        await expect(
          PostgresTriggerTestEntity.updater(entity)
            .setField('name', 'afterCommit')
            .enforceUpdateAsync()
        ).rejects.toThrowError('name cannot have value afterCommit');
        await expect(
          PostgresTriggerTestEntity.loader(vc1)
            .enforcing()
            .loadByFieldEqualingAsync('name', 'afterCommit')
        ).resolves.not.toBeNull();
      });
    });

    describe('delete', () => {
      it('rolls back transaction when trigger throws except afterCommit', async () => {
        const vc1 = new ViewerContext(
          createKnexIntegrationTestEntityCompanionProvider(knexInstance)
        );

        const entityBeforeDelete = await PostgresTriggerTestEntity.creator(vc1)
          .setField('name', 'beforeDelete')
          .enforceCreateAsync();
        await expect(
          PostgresTriggerTestEntity.enforceDeleteAsync(entityBeforeDelete)
        ).rejects.toThrowError('name cannot have value beforeDelete');
        await expect(
          PostgresTriggerTestEntity.loader(vc1)
            .enforcing()
            .loadByFieldEqualingAsync('name', 'beforeDelete')
        ).resolves.not.toBeNull();

        const entityAfterDelete = await PostgresTriggerTestEntity.creator(vc1)
          .setField('name', 'afterDelete')
          .enforceCreateAsync();
        await expect(
          PostgresTriggerTestEntity.enforceDeleteAsync(entityAfterDelete)
        ).rejects.toThrowError('name cannot have value afterDelete');
        await expect(
          PostgresTriggerTestEntity.loader(vc1)
            .enforcing()
            .loadByFieldEqualingAsync('name', 'afterDelete')
        ).resolves.not.toBeNull();
      });
    });
    describe('validation transaction behavior', () => {
      describe('create', () => {
        it('rolls back transaction when trigger throws ', async () => {
          const vc1 = new ViewerContext(
            createKnexIntegrationTestEntityCompanionProvider(knexInstance)
          );

          await expect(
            PostgresValidatorTestEntity.creator(vc1)
              .setField('name', 'beforeCreateAndBeforeUpdate')
              .enforceCreateAsync()
          ).rejects.toThrowError('name cannot have value beforeCreateAndBeforeUpdate');
          await expect(
            PostgresValidatorTestEntity.loader(vc1)
              .enforcing()
              .loadByFieldEqualingAsync('name', 'beforeCreateAndBeforeUpdate')
          ).resolves.toBeNull();
        });
      });
      describe('update', () => {
        it('rolls back transaction when trigger throws ', async () => {
          const vc1 = new ViewerContext(
            createKnexIntegrationTestEntityCompanionProvider(knexInstance)
          );

          const entity = await PostgresValidatorTestEntity.creator(vc1)
            .setField('name', 'blah')
            .enforceCreateAsync();

          await expect(
            PostgresValidatorTestEntity.updater(entity)
              .setField('name', 'beforeCreateAndBeforeUpdate')
              .enforceUpdateAsync()
          ).rejects.toThrowError('name cannot have value beforeCreateAndBeforeUpdate');
          await expect(
            PostgresValidatorTestEntity.loader(vc1)
              .enforcing()
              .loadByFieldEqualingAsync('name', 'beforeCreateAndBeforeUpdate')
          ).resolves.toBeNull();
        });
      });
      describe('delete', () => {
        it('validation should not run on a delete mutation', async () => {
          const vc1 = new ViewerContext(
            createKnexIntegrationTestEntityCompanionProvider(knexInstance)
          );

          const entityToDelete = await PostgresValidatorTestEntity.creator(vc1)
            .setField('name', 'shouldBeDeleted')
            .enforceCreateAsync();
          await PostgresValidatorTestEntity.enforceDeleteAsync(entityToDelete);
          await expect(
            PostgresValidatorTestEntity.loader(vc1)
              .enforcing()
              .loadByFieldEqualingAsync('name', 'shouldBeDeleted')
          ).resolves.toBeNull();
        });
      });
    });
  });
});
