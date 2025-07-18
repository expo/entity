import { OrderByOrdering, TransactionIsolationLevel, ViewerContext } from '@expo/entity';
import { createUnitTestEntityCompanionProvider } from '@expo/entity-testing-utils';
import { enforceAsyncResult } from '@expo/results';
import { afterAll, beforeAll, beforeEach, describe, expect, it, test } from '@jest/globals';
import { knex, Knex } from 'knex';
import nullthrows from 'nullthrows';
import { setTimeout } from 'timers/promises';

import { PostgresTestEntity } from '../__testfixtures__/PostgresTestEntity';
import { PostgresTriggerTestEntity } from '../__testfixtures__/PostgresTriggerTestEntity';
import { PostgresValidatorTestEntity } from '../__testfixtures__/PostgresValidatorTestEntity';
import { createKnexIntegrationTestEntityCompanionProvider } from '../__testfixtures__/createKnexIntegrationTestEntityCompanionProvider';

describe('postgres entity integration', () => {
  let knexInstance: Knex;

  beforeAll(() => {
    knexInstance = knex({
      client: 'pg',
      connection: {
        user: nullthrows(process.env['PGUSER']),
        password: nullthrows(process.env['PGPASSWORD']),
        host: 'localhost',
        port: parseInt(nullthrows(process.env['PGPORT']), 10),
        database: nullthrows(process.env['PGDATABASE']),
      },
    });
  });

  beforeEach(async () => {
    await PostgresTestEntity.createOrTruncatePostgresTableAsync(knexInstance);
  });

  afterAll(async () => {
    await PostgresTestEntity.dropPostgresTableAsync(knexInstance);
    await knexInstance.destroy();
  });

  it('supports parallel partial updates', async () => {
    const vc = new ViewerContext(createKnexIntegrationTestEntityCompanionProvider(knexInstance));
    const entity = await enforceAsyncResult(
      PostgresTestEntity.creatorWithAuthorizationResults(vc)
        .setField('name', 'hello')
        .createAsync(),
    );

    // update two different fields at the same time (from the same entity)
    await Promise.all([
      PostgresTestEntity.updater(entity).setField('hasACat', true).updateAsync(),
      PostgresTestEntity.updater(entity).setField('hasADog', false).updateAsync(),
    ]);

    const loadedEntity = await PostgresTestEntity.loader(vc).loadByIDAsync(entity.getID());

    expect(loadedEntity.getField('hasACat')).toBe(true);
    expect(loadedEntity.getField('hasADog')).toBe(false);
  });

  describe('empty creates and updates', () => {
    it('allows empty create', async () => {
      const vc = new ViewerContext(createKnexIntegrationTestEntityCompanionProvider(knexInstance));
      const entity = await enforceAsyncResult(
        PostgresTestEntity.creatorWithAuthorizationResults(vc).createAsync(),
      );
      expect(entity.getID()).toBeTruthy();
    });

    it('throws knex error upon empty update', async () => {
      const vc = new ViewerContext(createKnexIntegrationTestEntityCompanionProvider(knexInstance));
      const entity = await enforceAsyncResult(
        PostgresTestEntity.creatorWithAuthorizationResults(vc)
          .setField('name', 'hello')
          .createAsync(),
      );
      await expect(PostgresTestEntity.updater(entity).updateAsync()).rejects.toThrow();
    });

    it('throws error upon empty update for stub database adapter to match behavior', async () => {
      const vc = new ViewerContext(createUnitTestEntityCompanionProvider());
      const entity = await enforceAsyncResult(
        PostgresTestEntity.creatorWithAuthorizationResults(vc)
          .setField('name', 'hello')
          .createAsync(),
      );
      await expect(PostgresTestEntity.updater(entity).updateAsync()).rejects.toThrow();
    });
  });

  it('supports transactions', async () => {
    const vc1 = new ViewerContext(createKnexIntegrationTestEntityCompanionProvider(knexInstance));

    // put one in the DB
    const firstEntity = await enforceAsyncResult(
      PostgresTestEntity.creatorWithAuthorizationResults(vc1)
        .setField('name', 'hello')
        .createAsync(),
    );

    await PostgresTestEntity.loader(vc1).loadByIDAsync(firstEntity.getID());

    const errorToThrow = new Error('Intentional error');

    await expect(
      vc1.runInTransactionForDatabaseAdaptorFlavorAsync(
        'postgres',
        async (queryContext) => {
          // put another in the DB that will be rolled back due to error thrown
          await enforceAsyncResult(
            PostgresTestEntity.creatorWithAuthorizationResults(vc1, queryContext)
              .setField('name', 'hello')
              .createAsync(),
          );

          throw errorToThrow;
        },
        {}, // test empty transaction config
      ),
    ).rejects.toEqual(errorToThrow);

    const entities = await PostgresTestEntity.loader(vc1).loadManyByFieldEqualingAsync(
      'name',
      'hello',
    );
    expect(entities).toHaveLength(1);
  });

  describe('isolation levels', () => {
    test.each(Object.values(TransactionIsolationLevel))(
      'isolation level: %p',
      async (isolationLevel: TransactionIsolationLevel) => {
        const vc1 = new ViewerContext(
          createKnexIntegrationTestEntityCompanionProvider(knexInstance),
        );

        const firstEntity = await enforceAsyncResult(
          PostgresTestEntity.creatorWithAuthorizationResults(vc1)
            .setField('name', 'hello')
            .createAsync(),
        );

        const loadAndUpdateAsync = async (
          newName: string,
          delay: number,
        ): Promise<{ error?: Error }> => {
          try {
            await vc1.runInTransactionForDatabaseAdaptorFlavorAsync(
              'postgres',
              async (queryContext) => {
                const entity = await PostgresTestEntity.loader(vc1, queryContext).loadByIDAsync(
                  firstEntity.getID(),
                );
                await setTimeout(delay);
                await PostgresTestEntity.updater(entity, queryContext)
                  .setField('name', entity.getField('name') + ',' + newName)
                  .updateAsync();
              },
              { isolationLevel },
            );
            return {};
          } catch (e) {
            return { error: e as Error };
          }
        };

        // do some parallel updates to trigger serializable error in at least some of them
        const results = await Promise.all([
          loadAndUpdateAsync('hello2', 0),
          loadAndUpdateAsync('hello3', 100),
          loadAndUpdateAsync('hello4', 200),
          loadAndUpdateAsync('hello5', 300),
        ]);

        if (isolationLevel === TransactionIsolationLevel.READ_COMMITTED) {
          // read committed seems executes the transactions and doesn't produce a consistent result, but doesn't throw
          expect(results.filter((r) => !!r.error).length > 0).toBe(false);
        } else {
          // all other isolation levels throw since they're doing nonrepeatable reads
          expect(results.filter((r) => (r.error as any)?.cause?.code === '40001').length > 0).toBe(
            true,
          );
        }
      },
    );
  });

  describe('JSON fields', () => {
    it('supports both types of array fields', async () => {
      const vc1 = new ViewerContext(createKnexIntegrationTestEntityCompanionProvider(knexInstance));

      const entity = await enforceAsyncResult(
        PostgresTestEntity.creatorWithAuthorizationResults(vc1)
          .setField('stringArray', ['hello', 'world'])
          .setField('jsonArrayField', ['hello', 'world'])
          .createAsync(),
      );

      expect(entity.getField('stringArray')).toEqual(['hello', 'world']);
      expect(entity.getField('jsonArrayField')).toEqual(['hello', 'world']);
    });

    it('supports object field', async () => {
      const vc1 = new ViewerContext(createKnexIntegrationTestEntityCompanionProvider(knexInstance));

      const entity = await enforceAsyncResult(
        PostgresTestEntity.creatorWithAuthorizationResults(vc1)
          .setField('jsonObjectField', { hello: 'world' })
          .createAsync(),
      );

      expect(entity.getField('jsonObjectField')).toEqual({ hello: 'world' });
    });

    it('supports MaybeJSONArray field', async () => {
      const vc1 = new ViewerContext(createKnexIntegrationTestEntityCompanionProvider(knexInstance));

      const entity1 = await enforceAsyncResult(
        PostgresTestEntity.creatorWithAuthorizationResults(vc1)
          .setField('maybeJsonArrayField', ['hello', 'world'])
          .createAsync(),
      );
      const entity2 = await enforceAsyncResult(
        PostgresTestEntity.creatorWithAuthorizationResults(vc1)
          .setField('maybeJsonArrayField', { hello: 'world' })
          .createAsync(),
      );

      expect(entity1.getField('maybeJsonArrayField')).toEqual(['hello', 'world']);
      expect(entity2.getField('maybeJsonArrayField')).toEqual({ hello: 'world' });
    });
  });

  describe('BIGINT fields', () => {
    it('supports BIGINT fields', async () => {
      const vc1 = new ViewerContext(createKnexIntegrationTestEntityCompanionProvider(knexInstance));

      let entity = await enforceAsyncResult(
        PostgresTestEntity.creatorWithAuthorizationResults(vc1)
          .setField('bigintField', '72057594037928038')
          .createAsync(),
      );
      expect(entity.getField('bigintField')).toEqual('72057594037928038');

      entity = await enforceAsyncResult(
        PostgresTestEntity.updaterWithAuthorizationResults(entity)
          .setField('bigintField', '10')
          .updateAsync(),
      );
      expect(entity.getField('bigintField')).toEqual('10');

      entity = await enforceAsyncResult(
        PostgresTestEntity.updaterWithAuthorizationResults(entity)
          .setField('bigintField', '-10')
          .updateAsync(),
      );
      expect(entity.getField('bigintField')).toEqual('-10');
    });
  });

  describe.only('BYTEA fields', () => {
    it('supports BYTEA fields', async () => {
      const vc1 = new ViewerContext(createKnexIntegrationTestEntityCompanionProvider(knexInstance));

      const buffer = Buffer.from('hello world');
      let entity = await enforceAsyncResult(
        PostgresTestEntity.creatorWithAuthorizationResults(vc1)
          .setField('binaryField', buffer)
          .createAsync(),
      );
      expect(entity.getField('binaryField')).toEqual(buffer);

      // load the entity in a different viewer context to ensure field deserialization works from db
      const vc2 = new ViewerContext(createKnexIntegrationTestEntityCompanionProvider(knexInstance));
      const entityLoaded = await PostgresTestEntity.loader(vc2).loadByIDAsync(entity.getID());
      expect(entityLoaded.getField('binaryField')).toEqual(buffer);

      const updatedBuffer = Buffer.from('updated hello world');
      entity = await enforceAsyncResult(
        PostgresTestEntity.updaterWithAuthorizationResults(entity)
          .setField('binaryField', updatedBuffer)
          .updateAsync(),
      );
      expect(entity.getField('binaryField')).toEqual(updatedBuffer);
    });
  });

  it('supports single field and composite field equality loading', async () => {
    const vc1 = new ViewerContext(createKnexIntegrationTestEntityCompanionProvider(knexInstance));

    const e1 = await enforceAsyncResult(
      PostgresTestEntity.creatorWithAuthorizationResults(vc1)
        .setField('name', 'hello')
        .setField('hasACat', false)
        .setField('hasADog', true)
        .createAsync(),
    );

    await enforceAsyncResult(
      PostgresTestEntity.creatorWithAuthorizationResults(vc1)
        .setField('name', 'world')
        .setField('hasACat', false)
        .setField('hasADog', true)
        .createAsync(),
    );

    await enforceAsyncResult(
      PostgresTestEntity.creatorWithAuthorizationResults(vc1)
        .setField('name', 'wat')
        .setField('hasACat', false)
        .setField('hasADog', false)
        .createAsync(),
    );

    const e1Loaded = await PostgresTestEntity.loader(vc1).loadByIDAsync(e1.getID());
    expect(e1Loaded).not.toBeNull();

    const results = await PostgresTestEntity.loader(vc1).loadManyByFieldEqualingAsync(
      'hasACat',
      false,
    );
    expect(results).toHaveLength(3);

    const compositeResults = await PostgresTestEntity.loader(
      vc1,
    ).loadManyByCompositeFieldEqualingManyAsync(
      ['hasACat', 'hasADog'],
      [
        { hasACat: false, hasADog: true },
        { hasACat: false, hasADog: false },
      ],
    );
    expect(compositeResults.size).toBe(2);
    expect(compositeResults.get({ hasACat: false, hasADog: true })).toHaveLength(2);
    expect(compositeResults.get({ hasACat: false, hasADog: false })).toHaveLength(1);

    const results2 = await PostgresTestEntity.loader(vc1).loadManyByFieldEqualingManyAsync(
      'hasADog',
      [true, false],
    );
    expect(results2.get(true)).toHaveLength(2);
    expect(results2.get(false)).toHaveLength(1);
  });

  describe('conjunction field equality loading', () => {
    it('supports single fieldValue and multiple fieldValues', async () => {
      const vc1 = new ViewerContext(createKnexIntegrationTestEntityCompanionProvider(knexInstance));

      await enforceAsyncResult(
        PostgresTestEntity.creatorWithAuthorizationResults(vc1)
          .setField('name', 'hello')
          .setField('hasACat', false)
          .setField('hasADog', true)
          .createAsync(),
      );

      await enforceAsyncResult(
        PostgresTestEntity.creatorWithAuthorizationResults(vc1)
          .setField('name', 'world')
          .setField('hasACat', false)
          .setField('hasADog', true)
          .createAsync(),
      );

      await enforceAsyncResult(
        PostgresTestEntity.creatorWithAuthorizationResults(vc1)
          .setField('name', 'wat')
          .setField('hasACat', false)
          .setField('hasADog', false)
          .createAsync(),
      );

      const results = await PostgresTestEntity.loader(vc1).loadManyByFieldEqualityConjunctionAsync([
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

      const results2 = await PostgresTestEntity.loader(vc1).loadManyByFieldEqualityConjunctionAsync(
        [{ fieldName: 'hasADog', fieldValues: [true, false] }],
      );
      expect(results2).toHaveLength(3);
    });

    it('supports query modifiers', async () => {
      const vc1 = new ViewerContext(createKnexIntegrationTestEntityCompanionProvider(knexInstance));

      await enforceAsyncResult(
        PostgresTestEntity.creatorWithAuthorizationResults(vc1).setField('name', 'a').createAsync(),
      );

      await enforceAsyncResult(
        PostgresTestEntity.creatorWithAuthorizationResults(vc1).setField('name', 'b').createAsync(),
      );

      await enforceAsyncResult(
        PostgresTestEntity.creatorWithAuthorizationResults(vc1).setField('name', 'c').createAsync(),
      );

      const results = await PostgresTestEntity.loader(vc1).loadManyByFieldEqualityConjunctionAsync(
        [],
        {
          limit: 2,
          offset: 1,
          orderBy: [
            {
              fieldName: 'name',
              order: OrderByOrdering.DESCENDING,
            },
          ],
        },
      );
      expect(results).toHaveLength(2);
      expect(results.map((e) => e.getField('name'))).toEqual(['b', 'a']);
    });

    it('supports null field values', async () => {
      const vc1 = new ViewerContext(createKnexIntegrationTestEntityCompanionProvider(knexInstance));
      await enforceAsyncResult(
        PostgresTestEntity.creatorWithAuthorizationResults(vc1)
          .setField('name', 'a')
          .setField('hasADog', true)
          .createAsync(),
      );
      await enforceAsyncResult(
        PostgresTestEntity.creatorWithAuthorizationResults(vc1)
          .setField('name', 'b')
          .setField('hasADog', true)
          .createAsync(),
      );
      await enforceAsyncResult(
        PostgresTestEntity.creatorWithAuthorizationResults(vc1)
          .setField('name', null)
          .setField('hasADog', true)
          .createAsync(),
      );
      await enforceAsyncResult(
        PostgresTestEntity.creatorWithAuthorizationResults(vc1)
          .setField('name', null)
          .setField('hasADog', false)
          .createAsync(),
      );

      const results = await PostgresTestEntity.loader(vc1).loadManyByFieldEqualityConjunctionAsync([
        { fieldName: 'name', fieldValue: null },
      ]);
      expect(results).toHaveLength(2);
      expect(results[0]!.getField('name')).toBeNull();

      const results2 = await PostgresTestEntity.loader(vc1).loadManyByFieldEqualityConjunctionAsync(
        [
          { fieldName: 'name', fieldValues: ['a', null] },
          { fieldName: 'hasADog', fieldValue: true },
        ],
        {
          orderBy: [
            {
              fieldName: 'name',
              order: OrderByOrdering.DESCENDING,
            },
          ],
        },
      );
      expect(results2).toHaveLength(2);
      expect(results2.map((e) => e.getField('name'))).toEqual([null, 'a']);
    });
  });

  describe('raw where clause loading', () => {
    it('loads by raw where clause', async () => {
      const vc1 = new ViewerContext(createKnexIntegrationTestEntityCompanionProvider(knexInstance));
      await enforceAsyncResult(
        PostgresTestEntity.creatorWithAuthorizationResults(vc1)
          .setField('name', 'hello')
          .setField('hasACat', false)
          .setField('hasADog', true)
          .createAsync(),
      );

      const results = await PostgresTestEntity.loader(vc1).loadManyByRawWhereClauseAsync(
        'name = ?',
        ['hello'],
      );

      expect(results).toHaveLength(1);
    });

    it('throws with invalid where clause', async () => {
      const vc1 = new ViewerContext(createKnexIntegrationTestEntityCompanionProvider(knexInstance));
      await enforceAsyncResult(
        PostgresTestEntity.creatorWithAuthorizationResults(vc1)
          .setField('name', 'hello')
          .setField('hasACat', false)
          .setField('hasADog', true)
          .createAsync(),
      );

      await expect(
        PostgresTestEntity.loader(vc1).loadManyByRawWhereClauseAsync('invalid_column = ?', [
          'hello',
        ]),
      ).rejects.toThrow();
    });

    it('supports query modifiers', async () => {
      const vc1 = new ViewerContext(createKnexIntegrationTestEntityCompanionProvider(knexInstance));

      await enforceAsyncResult(
        PostgresTestEntity.creatorWithAuthorizationResults(vc1)
          .setField('name', 'a')
          .setField('hasADog', true)
          .createAsync(),
      );

      await enforceAsyncResult(
        PostgresTestEntity.creatorWithAuthorizationResults(vc1)
          .setField('name', 'b')
          .setField('hasADog', true)
          .createAsync(),
      );

      await enforceAsyncResult(
        PostgresTestEntity.creatorWithAuthorizationResults(vc1)
          .setField('name', 'c')
          .setField('hasADog', true)
          .createAsync(),
      );

      const results = await PostgresTestEntity.loader(vc1).loadManyByRawWhereClauseAsync(
        'has_a_dog = ?',
        [true],
        {
          limit: 2,
          offset: 1,
          orderBy: [
            {
              fieldName: 'name',
              order: OrderByOrdering.ASCENDING,
            },
          ],
        },
      );

      expect(results).toHaveLength(2);
      expect(results.map((e) => e.getField('name'))).toEqual(['b', 'c']);

      const resultsMultipleOrderBy = await PostgresTestEntity.loader(
        vc1,
      ).loadManyByRawWhereClauseAsync('has_a_dog = ?', [true], {
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

      const resultsOrderByRaw = await PostgresTestEntity.loader(vc1).loadManyByRawWhereClauseAsync(
        'has_a_dog = ?',
        [true],
        {
          orderByRaw: 'has_a_dog ASC, name DESC',
        },
      );

      expect(resultsOrderByRaw).toHaveLength(3);
      expect(resultsOrderByRaw.map((e) => e.getField('name'))).toEqual(['c', 'b', 'a']);
    });
  });

  describe('trigger transaction behavior', () => {
    describe('create', () => {
      it('rolls back transaction when trigger throws except afterCommit', async () => {
        const vc1 = new ViewerContext(
          createKnexIntegrationTestEntityCompanionProvider(knexInstance),
        );

        await expect(
          PostgresTriggerTestEntity.creator(vc1).setField('name', 'beforeCreate').createAsync(),
        ).rejects.toThrow('name cannot have value beforeCreate');
        await expect(
          PostgresTriggerTestEntity.loader(vc1).loadByFieldEqualingAsync('name', 'beforeCreate'),
        ).resolves.toBeNull();

        await expect(
          PostgresTriggerTestEntity.creator(vc1).setField('name', 'afterCreate').createAsync(),
        ).rejects.toThrow('name cannot have value afterCreate');
        await expect(
          PostgresTriggerTestEntity.loader(vc1).loadByFieldEqualingAsync('name', 'afterCreate'),
        ).resolves.toBeNull();

        await expect(
          PostgresTriggerTestEntity.creator(vc1).setField('name', 'beforeAll').createAsync(),
        ).rejects.toThrow('name cannot have value beforeAll');
        await expect(
          PostgresTriggerTestEntity.loader(vc1).loadByFieldEqualingAsync('name', 'beforeAll'),
        ).resolves.toBeNull();

        await expect(
          PostgresTriggerTestEntity.creator(vc1).setField('name', 'afterAll').createAsync(),
        ).rejects.toThrow('name cannot have value afterAll');
        await expect(
          PostgresTriggerTestEntity.loader(vc1).loadByFieldEqualingAsync('name', 'afterAll'),
        ).resolves.toBeNull();

        await expect(
          PostgresTriggerTestEntity.creator(vc1).setField('name', 'afterCommit').createAsync(),
        ).rejects.toThrow('name cannot have value afterCommit');
        await expect(
          PostgresTriggerTestEntity.loader(vc1).loadByFieldEqualingAsync('name', 'afterCommit'),
        ).resolves.not.toBeNull();
      });
    });

    describe('update', () => {
      it('rolls back transaction when trigger throws except afterCommit', async () => {
        const vc1 = new ViewerContext(
          createKnexIntegrationTestEntityCompanionProvider(knexInstance),
        );

        const entity = await PostgresTriggerTestEntity.creator(vc1)
          .setField('name', 'blah')
          .createAsync();

        await expect(
          PostgresTriggerTestEntity.updater(entity).setField('name', 'beforeUpdate').updateAsync(),
        ).rejects.toThrow('name cannot have value beforeUpdate');
        await expect(
          PostgresTriggerTestEntity.loader(vc1).loadByFieldEqualingAsync('name', 'beforeUpdate'),
        ).resolves.toBeNull();

        await expect(
          PostgresTriggerTestEntity.updater(entity).setField('name', 'afterUpdate').updateAsync(),
        ).rejects.toThrow('name cannot have value afterUpdate');
        await expect(
          PostgresTriggerTestEntity.loader(vc1).loadByFieldEqualingAsync('name', 'afterUpdate'),
        ).resolves.toBeNull();

        await expect(
          PostgresTriggerTestEntity.updater(entity).setField('name', 'beforeAll').updateAsync(),
        ).rejects.toThrow('name cannot have value beforeAll');
        await expect(
          PostgresTriggerTestEntity.loader(vc1).loadByFieldEqualingAsync('name', 'beforeAll'),
        ).resolves.toBeNull();

        await expect(
          PostgresTriggerTestEntity.updater(entity).setField('name', 'afterAll').updateAsync(),
        ).rejects.toThrow('name cannot have value afterAll');
        await expect(
          PostgresTriggerTestEntity.loader(vc1).loadByFieldEqualingAsync('name', 'afterAll'),
        ).resolves.toBeNull();

        await expect(
          PostgresTriggerTestEntity.updater(entity).setField('name', 'afterCommit').updateAsync(),
        ).rejects.toThrow('name cannot have value afterCommit');
        await expect(
          PostgresTriggerTestEntity.loader(vc1).loadByFieldEqualingAsync('name', 'afterCommit'),
        ).resolves.not.toBeNull();
      });
    });

    describe('delete', () => {
      it('rolls back transaction when trigger throws except afterCommit', async () => {
        const vc1 = new ViewerContext(
          createKnexIntegrationTestEntityCompanionProvider(knexInstance),
        );

        const entityBeforeDelete = await PostgresTriggerTestEntity.creator(vc1)
          .setField('name', 'beforeDelete')
          .createAsync();
        await expect(
          PostgresTriggerTestEntity.deleter(entityBeforeDelete).deleteAsync(),
        ).rejects.toThrow('name cannot have value beforeDelete');
        await expect(
          PostgresTriggerTestEntity.loader(vc1).loadByFieldEqualingAsync('name', 'beforeDelete'),
        ).resolves.not.toBeNull();

        const entityAfterDelete = await PostgresTriggerTestEntity.creator(vc1)
          .setField('name', 'afterDelete')
          .createAsync();
        await expect(
          PostgresTriggerTestEntity.deleter(entityAfterDelete).deleteAsync(),
        ).rejects.toThrow('name cannot have value afterDelete');
        await expect(
          PostgresTriggerTestEntity.loader(vc1).loadByFieldEqualingAsync('name', 'afterDelete'),
        ).resolves.not.toBeNull();
      });
    });
    describe('validation transaction behavior', () => {
      describe('create', () => {
        it('rolls back transaction when trigger throws ', async () => {
          const vc1 = new ViewerContext(
            createKnexIntegrationTestEntityCompanionProvider(knexInstance),
          );

          await expect(
            PostgresValidatorTestEntity.creator(vc1)
              .setField('name', 'beforeCreateAndBeforeUpdate')
              .createAsync(),
          ).rejects.toThrow('name cannot have value beforeCreateAndBeforeUpdate');
          await expect(
            PostgresValidatorTestEntity.loader(vc1).loadByFieldEqualingAsync(
              'name',
              'beforeCreateAndBeforeUpdate',
            ),
          ).resolves.toBeNull();
        });
      });
      describe('update', () => {
        it('rolls back transaction when trigger throws ', async () => {
          const vc1 = new ViewerContext(
            createKnexIntegrationTestEntityCompanionProvider(knexInstance),
          );

          const entity = await PostgresValidatorTestEntity.creator(vc1)
            .setField('name', 'blah')
            .createAsync();

          await expect(
            PostgresValidatorTestEntity.updater(entity)
              .setField('name', 'beforeCreateAndBeforeUpdate')
              .updateAsync(),
          ).rejects.toThrow('name cannot have value beforeCreateAndBeforeUpdate');
          await expect(
            PostgresValidatorTestEntity.loader(vc1).loadByFieldEqualingAsync(
              'name',
              'beforeCreateAndBeforeUpdate',
            ),
          ).resolves.toBeNull();
        });
      });
      describe('delete', () => {
        it('validation should not run on a delete mutation', async () => {
          const vc1 = new ViewerContext(
            createKnexIntegrationTestEntityCompanionProvider(knexInstance),
          );

          const entityToDelete = await PostgresValidatorTestEntity.creator(vc1)
            .setField('name', 'shouldBeDeleted')
            .createAsync();
          await PostgresValidatorTestEntity.deleter(entityToDelete).deleteAsync();
          await expect(
            PostgresValidatorTestEntity.loader(vc1).loadByFieldEqualingAsync(
              'name',
              'shouldBeDeleted',
            ),
          ).resolves.toBeNull();
        });
      });
    });
  });

  describe('queryContext callback behavior', () => {
    it('calls callbacks correctly', async () => {
      const vc1 = new ViewerContext(createKnexIntegrationTestEntityCompanionProvider(knexInstance));

      let preCommitCallCount = 0;
      let preCommitInnerCallCount = 0;
      let postCommitCallCount = 0;

      await vc1.runInTransactionForDatabaseAdaptorFlavorAsync('postgres', async (queryContext) => {
        queryContext.appendPostCommitCallback(async () => {
          postCommitCallCount++;
        });
        queryContext.appendPreCommitCallback(async () => {
          preCommitCallCount++;
        }, 0);

        await queryContext.runInNestedTransactionAsync(async (innerQueryContext) => {
          innerQueryContext.appendPostCommitCallback(async () => {
            postCommitCallCount++;
          });
          innerQueryContext.appendPreCommitCallback(async () => {
            preCommitInnerCallCount++;
          }, 0);
        });

        // this one throws so its post commit shouldn't execute
        try {
          await queryContext.runInNestedTransactionAsync(async (innerQueryContext) => {
            innerQueryContext.appendPostCommitCallback(async () => {
              postCommitCallCount++;
            });
            innerQueryContext.appendPreCommitCallback(async () => {
              preCommitInnerCallCount++;
              throw Error('wat');
            }, 0);
          });
        } catch {}
      });

      await expect(
        vc1.runInTransactionForDatabaseAdaptorFlavorAsync('postgres', async (queryContext) => {
          queryContext.appendPostCommitCallback(async () => {
            postCommitCallCount++;
          });
          queryContext.appendPreCommitCallback(async () => {
            preCommitCallCount++;
            throw Error('wat');
          }, 0);
        }),
      ).rejects.toThrow('wat');

      expect(preCommitCallCount).toBe(2);
      expect(preCommitInnerCallCount).toBe(2);
      expect(postCommitCallCount).toBe(2);
    });
  });
});
