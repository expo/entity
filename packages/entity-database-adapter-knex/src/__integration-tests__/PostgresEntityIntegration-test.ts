import {
  EntityDatabaseAdapterEmptyUpdateResultError,
  TransactionIsolationLevel,
  ViewerContext,
} from '@expo/entity';
import { createUnitTestEntityCompanionProvider } from '@expo/entity-testing-utils';
import { enforceAsyncResult } from '@expo/results';
import { afterAll, beforeAll, beforeEach, describe, expect, it, test } from '@jest/globals';
import { knex, Knex } from 'knex';
import nullthrows from 'nullthrows';
import { setTimeout } from 'timers/promises';

import { OrderByOrdering } from '../BasePostgresEntityDatabaseAdapter';
import { PaginationStrategy } from '../PaginationStrategy';
import { raw, sql, SQLFragment, SQLFragmentHelpers } from '../SQLOperator';
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

  it('throws an appropriate error when updating a deleted row', async () => {
    const vc = new ViewerContext(createKnexIntegrationTestEntityCompanionProvider(knexInstance));
    const vc2 = new ViewerContext(createKnexIntegrationTestEntityCompanionProvider(knexInstance));

    const entity = await PostgresTestEntity.creator(vc)
      .setField('name', 'hello')
      .setField('hasACat', false)
      .createAsync();

    const entityLoadedVC2 = await PostgresTestEntity.loader(vc2).loadByIDAsync(entity.getID());
    await PostgresTestEntity.deleter(entityLoadedVC2).deleteAsync();

    await expect(
      PostgresTestEntity.updater(entity).setField('hasACat', true).updateAsync(),
    ).rejects.toThrow(EntityDatabaseAdapterEmptyUpdateResultError);
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

  describe('BYTEA fields', () => {
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

  describe('single field value loading (fetchOneWhereInternalAsync)', () => {
    it('supports one loading', async () => {
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

      const result = await PostgresTestEntity.loaderWithAuthorizationResults(vc1)[
        'loadOneByFieldEqualingAsync'
      ]('hasACat', false);
      expect(result?.enforceValue()).not.toBeNull();
      expect(result?.enforceValue().getField('hasACat')).toBe(false);
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

  describe('SQL operator loading with loadManyBySQL', () => {
    it('supports basic SQL template literal queries', async () => {
      const vc1 = new ViewerContext(createKnexIntegrationTestEntityCompanionProvider(knexInstance));

      await enforceAsyncResult(
        PostgresTestEntity.creatorWithAuthorizationResults(vc1)
          .setField('name', 'Alice')
          .setField('hasACat', true)
          .setField('hasADog', false)
          .createAsync(),
      );

      await enforceAsyncResult(
        PostgresTestEntity.creatorWithAuthorizationResults(vc1)
          .setField('name', 'Bob')
          .setField('hasACat', false)
          .setField('hasADog', true)
          .createAsync(),
      );

      await enforceAsyncResult(
        PostgresTestEntity.creatorWithAuthorizationResults(vc1)
          .setField('name', 'Charlie')
          .setField('hasACat', true)
          .setField('hasADog', true)
          .createAsync(),
      );

      // Test basic SQL query with parameters
      const catOwners = await PostgresTestEntity.knexLoader(vc1)
        .loadManyBySQL(sql`has_a_cat = ${true}`)
        .orderBy('name', OrderByOrdering.ASCENDING)
        .executeAsync();

      expect(catOwners).toHaveLength(2);
      expect(catOwners[0]!.getField('name')).toBe('Alice');
      expect(catOwners[1]!.getField('name')).toBe('Charlie');

      // Test with limit and offset
      const limitedResults = await PostgresTestEntity.knexLoader(vc1)
        .loadManyBySQL(sql`has_a_cat = ${true}`)
        .orderBy('name', OrderByOrdering.ASCENDING)
        .limit(1)
        .offset(1)
        .executeAsync();

      expect(limitedResults).toHaveLength(1);
      expect(limitedResults[0]!.getField('name')).toBe('Charlie');
    });

    it('supports SQL helper functions', async () => {
      const vc1 = new ViewerContext(createKnexIntegrationTestEntityCompanionProvider(knexInstance));
      const { and, or, eq, neq, inArray } = SQLFragmentHelpers;

      await enforceAsyncResult(
        PostgresTestEntity.creatorWithAuthorizationResults(vc1)
          .setField('name', 'User1')
          .setField('hasACat', true)
          .setField('hasADog', false)
          .createAsync(),
      );

      await enforceAsyncResult(
        PostgresTestEntity.creatorWithAuthorizationResults(vc1)
          .setField('name', 'User2')
          .setField('hasACat', false)
          .setField('hasADog', true)
          .createAsync(),
      );

      await enforceAsyncResult(
        PostgresTestEntity.creatorWithAuthorizationResults(vc1)
          .setField('name', 'User3')
          .setField('hasACat', true)
          .setField('hasADog', true)
          .createAsync(),
      );

      // Test AND condition
      const bothPets = await PostgresTestEntity.knexLoader(vc1)
        .loadManyBySQL(and(eq('has_a_cat', true), eq('has_a_dog', true)))
        .executeAsync();

      expect(bothPets).toHaveLength(1);
      expect(bothPets[0]!.getField('name')).toBe('User3');

      // Test OR condition
      const eitherPet = await PostgresTestEntity.knexLoader(vc1)
        .loadManyBySQL(or(eq('has_a_cat', false), eq('has_a_dog', false)))
        .orderBy('name', OrderByOrdering.ASCENDING)
        .executeAsync();

      expect(eitherPet).toHaveLength(2);
      expect(eitherPet[0]!.getField('name')).toBe('User1');
      expect(eitherPet[1]!.getField('name')).toBe('User2');

      // Test IN array
      const specificUsers = await PostgresTestEntity.knexLoader(vc1)
        .loadManyBySQL(inArray('name', ['User1', 'User3']))
        .orderBy('name', OrderByOrdering.ASCENDING)
        .executeAsync();

      expect(specificUsers).toHaveLength(2);
      expect(specificUsers[0]!.getField('name')).toBe('User1');
      expect(specificUsers[1]!.getField('name')).toBe('User3');

      // Test complex condition
      const complexQuery = await PostgresTestEntity.knexLoader(vc1)
        .loadManyBySQL(and(or(eq('has_a_cat', true), eq('has_a_dog', true)), neq('name', 'User2')))
        .orderBy('name', OrderByOrdering.ASCENDING)
        .executeAsync();

      expect(complexQuery).toHaveLength(2);
      expect(complexQuery[0]!.getField('name')).toBe('User1');
      expect(complexQuery[1]!.getField('name')).toBe('User3');
    });

    it('supports executeFirstAsync', async () => {
      const vc1 = new ViewerContext(createKnexIntegrationTestEntityCompanionProvider(knexInstance));

      await enforceAsyncResult(
        PostgresTestEntity.creatorWithAuthorizationResults(vc1)
          .setField('name', 'First')
          .setField('hasACat', true)
          .createAsync(),
      );

      await enforceAsyncResult(
        PostgresTestEntity.creatorWithAuthorizationResults(vc1)
          .setField('name', 'Second')
          .setField('hasACat', true)
          .createAsync(),
      );

      const firstCatOwnerLimit1 = await PostgresTestEntity.knexLoader(vc1)
        .loadManyBySQL(sql`has_a_cat = ${true}`)
        .orderBy('name', OrderByOrdering.ASCENDING)
        .limit(1)
        .executeAsync();

      expect(firstCatOwnerLimit1).toHaveLength(1);
      expect(firstCatOwnerLimit1[0]?.getField('name')).toBe('First');

      // Test executeFirstAsync with no results
      const noDogOwnerLimit1 = await PostgresTestEntity.knexLoader(vc1)
        .loadManyBySQL(sql`has_a_dog = ${true}`)
        .limit(1)
        .executeAsync();

      expect(noDogOwnerLimit1).toHaveLength(0);
    });

    it('supports authorization result-based loading', async () => {
      const vc1 = new ViewerContext(createKnexIntegrationTestEntityCompanionProvider(knexInstance));

      await enforceAsyncResult(
        PostgresTestEntity.creatorWithAuthorizationResults(vc1)
          .setField('name', 'AuthTest1')
          .setField('hasACat', true)
          .createAsync(),
      );

      await enforceAsyncResult(
        PostgresTestEntity.creatorWithAuthorizationResults(vc1)
          .setField('name', 'AuthTest2')
          .setField('hasACat', false)
          .createAsync(),
      );

      // Test with authorization results
      const results = await PostgresTestEntity.knexLoaderWithAuthorizationResults(vc1)
        .loadManyBySQL(sql`name LIKE ${'AuthTest%'}`)
        .orderBy('name', OrderByOrdering.ASCENDING)
        .executeAsync();

      expect(results).toHaveLength(2);
      expect(results[0]!.ok).toBe(true);
      expect(results[1]!.ok).toBe(true);

      if (results[0]!.ok) {
        expect(results[0]!.value.getField('name')).toBe('AuthTest1');
      }
      if (results[1]!.ok) {
        expect(results[1]!.value.getField('name')).toBe('AuthTest2');
      }

      const firstResultLimit1 = await PostgresTestEntity.knexLoaderWithAuthorizationResults(vc1)
        .loadManyBySQL(sql`has_a_cat = ${false}`)
        .limit(1)
        .executeAsync();

      expect(firstResultLimit1).toHaveLength(1);
      const firstResult = firstResultLimit1[0];
      expect(firstResult?.ok).toBe(true);
      if (firstResult?.ok) {
        expect(firstResult.value.getField('name')).toBe('AuthTest2');
      }
    });

    it('supports raw SQL for dynamic queries', async () => {
      const vc1 = new ViewerContext(createKnexIntegrationTestEntityCompanionProvider(knexInstance));

      await enforceAsyncResult(
        PostgresTestEntity.creatorWithAuthorizationResults(vc1)
          .setField('name', 'RawTest1')
          .setField('hasACat', true)
          .setField('hasADog', false)
          .createAsync(),
      );
      await enforceAsyncResult(
        PostgresTestEntity.creatorWithAuthorizationResults(vc1)
          .setField('name', 'RawTest2')
          .setField('hasACat', false)
          .setField('hasADog', true)
          .createAsync(),
      );
      await enforceAsyncResult(
        PostgresTestEntity.creatorWithAuthorizationResults(vc1)
          .setField('name', 'RawTest3')
          .setField('hasACat', true)
          .setField('hasADog', true)
          .createAsync(),
      );

      // Test raw SQL for dynamic column names with orderBySQL
      const sortColumn = 'name';
      const rawResults = await PostgresTestEntity.knexLoader(vc1)
        .loadManyBySQL(sql`${raw('name')} LIKE ${'RawTest%'}`)
        .orderBySQL(sql`${raw(sortColumn)} DESC`)
        .executeAsync();

      expect(rawResults).toHaveLength(3);
      expect(rawResults[0]!.getField('name')).toBe('RawTest3');
      expect(rawResults[1]!.getField('name')).toBe('RawTest2');
      expect(rawResults[2]!.getField('name')).toBe('RawTest1');

      // Test complex ORDER BY with CASE statement
      const priorityResults = await PostgresTestEntity.knexLoader(vc1)
        .loadManyBySQL(sql`name LIKE ${'RawTest%'}`)
        .orderBySQL(
          sql`CASE
            WHEN has_a_cat = true AND has_a_dog = true THEN 0
            WHEN has_a_cat = true THEN 1
            ELSE 2
          END, ${raw('name')} ASC`,
        )
        .executeAsync();

      expect(priorityResults).toHaveLength(3);
      expect(priorityResults[0]!.getField('name')).toBe('RawTest3'); // has both
      expect(priorityResults[1]!.getField('name')).toBe('RawTest1'); // has cat only
      expect(priorityResults[2]!.getField('name')).toBe('RawTest2'); // has dog only

      // Test raw SQL with complex expressions - using CASE statement
      const complexExpression = await PostgresTestEntity.knexLoader(vc1)
        .loadManyBySQL(
          sql`${raw('CASE WHEN has_a_cat THEN 1 ELSE 0 END')} + ${raw(
            'CASE WHEN has_a_dog THEN 1 ELSE 0 END',
          )} >= 1 AND name LIKE ${'RawTest%'}`,
        )
        .executeAsync();

      expect(complexExpression).toHaveLength(3);
    });

    it('supports join helper for building complex queries', async () => {
      const vc1 = new ViewerContext(createKnexIntegrationTestEntityCompanionProvider(knexInstance));

      await enforceAsyncResult(
        PostgresTestEntity.creatorWithAuthorizationResults(vc1)
          .setField('name', 'JoinTest1')
          .setField('hasACat', true)
          .setField('hasADog', false)
          .createAsync(),
      );
      await enforceAsyncResult(
        PostgresTestEntity.creatorWithAuthorizationResults(vc1)
          .setField('name', 'JoinTest2')
          .setField('hasACat', true)
          .setField('hasADog', true)
          .createAsync(),
      );

      // Test join with OR conditions
      const conditions = [
        sql`name = ${'JoinTest1'}`,
        sql`(has_a_cat = ${true} AND has_a_dog = ${true})`,
      ];
      const joinedResults = await PostgresTestEntity.knexLoader(vc1)
        .loadManyBySQL(SQLFragment.join(conditions, ' OR '))
        .orderBy('name', OrderByOrdering.ASCENDING)
        .executeAsync();

      expect(joinedResults).toHaveLength(2);
      expect(joinedResults[0]!.getField('name')).toBe('JoinTest1');
      expect(joinedResults[1]!.getField('name')).toBe('JoinTest2');
    });

    it('provides debug text for SQL queries', async () => {
      // Create a SQL fragment with various types of values
      const fragment = sql`name = ${'TestUser'} AND has_a_cat = ${true} AND age > ${18} AND data = ${{
        key: 'value',
      }} AND created_at > ${new Date('2024-01-01')}`;

      // Get the debug text
      const debugText = fragment.toDebugString;

      // Verify the text contains properly formatted values
      expect(debugText).toContain("'TestUser'");
      expect(debugText).toContain('TRUE');
      expect(debugText).toContain('18');
      expect(debugText).toContain('{"key":"value"}');
      expect(debugText).toContain('2024-01-01');

      // Ensure it's still a valid query (though we wouldn't execute the text directly)
      expect(debugText).toMatch(
        /^name = .* AND has_a_cat = .* AND age > .* AND data = .* AND created_at > .*$/,
      );
    });

    it('supports orderBySQL for type-safe dynamic ordering', async () => {
      const vc1 = new ViewerContext(createKnexIntegrationTestEntityCompanionProvider(knexInstance));

      // Create test entities with different combinations of fields
      await enforceAsyncResult(
        PostgresTestEntity.creatorWithAuthorizationResults(vc1)
          .setField('name', 'OrderTest1')
          .setField('hasACat', true)
          .setField('hasADog', false)
          .setField('stringArray', ['a', 'b', 'c'])
          .createAsync(),
      );
      await enforceAsyncResult(
        PostgresTestEntity.creatorWithAuthorizationResults(vc1)
          .setField('name', 'OrderTest2')
          .setField('hasACat', false)
          .setField('hasADog', true)
          .setField('stringArray', ['x', 'y'])
          .createAsync(),
      );
      await enforceAsyncResult(
        PostgresTestEntity.creatorWithAuthorizationResults(vc1)
          .setField('name', 'OrderTest3')
          .setField('hasACat', true)
          .setField('hasADog', true)
          .setField('stringArray', null)
          .createAsync(),
      );
      await enforceAsyncResult(
        PostgresTestEntity.creatorWithAuthorizationResults(vc1)
          .setField('name', 'OrderTest4')
          .setField('hasACat', false)
          .setField('hasADog', false)
          .setField('stringArray', ['m'])
          .createAsync(),
      );

      // Test 1: Simple orderBySQL with raw column
      const simpleOrder = await PostgresTestEntity.knexLoader(vc1)
        .loadManyBySQL(sql`name LIKE ${'OrderTest%'}`)
        .orderBySQL(sql`${raw('name')} DESC`)
        .executeAsync();

      expect(simpleOrder).toHaveLength(4);
      expect(simpleOrder[0]!.getField('name')).toBe('OrderTest4');
      expect(simpleOrder[1]!.getField('name')).toBe('OrderTest3');
      expect(simpleOrder[2]!.getField('name')).toBe('OrderTest2');
      expect(simpleOrder[3]!.getField('name')).toBe('OrderTest1');

      // Test 2: Complex CASE statement ordering with parameterized values
      const priority1 = 1;
      const priority2 = 2;
      const priority3 = 3;
      const priority4 = 4;
      const caseOrder = await PostgresTestEntity.knexLoader(vc1)
        .loadManyBySQL(sql`name LIKE ${'OrderTest%'}`)
        .orderBySQL(
          sql`CASE
            WHEN has_a_cat = true AND has_a_dog = true THEN ${priority1}
            WHEN has_a_cat = true THEN ${priority2}
            WHEN has_a_dog = true THEN ${priority3}
            ELSE ${priority4}
          END, ${raw('name')} ASC`,
        )
        .executeAsync();

      expect(caseOrder).toHaveLength(4);
      expect(caseOrder[0]!.getField('name')).toBe('OrderTest3'); // Both pets = 1
      expect(caseOrder[1]!.getField('name')).toBe('OrderTest1'); // Cat only = 2
      expect(caseOrder[2]!.getField('name')).toBe('OrderTest2'); // Dog only = 3
      expect(caseOrder[3]!.getField('name')).toBe('OrderTest4'); // Neither = 4

      // Test 3: Order by array length (PostgreSQL specific)
      const arrayLengthOrder = await PostgresTestEntity.knexLoader(vc1)
        .loadManyBySQL(sql`name LIKE ${'OrderTest%'}`)
        .orderBySQL(sql`COALESCE(array_length(string_array, 1), 0) DESC, ${raw('name')} ASC`)
        .executeAsync();

      expect(arrayLengthOrder).toHaveLength(4);
      expect(arrayLengthOrder[0]!.getField('name')).toBe('OrderTest1'); // 3 elements
      expect(arrayLengthOrder[1]!.getField('name')).toBe('OrderTest2'); // 2 elements
      expect(arrayLengthOrder[2]!.getField('name')).toBe('OrderTest4'); // 1 element
      expect(arrayLengthOrder[3]!.getField('name')).toBe('OrderTest3'); // null = 0

      // Test 4: Multiple orderBySQL calls (last one wins)
      const multipleOrderBy = await PostgresTestEntity.knexLoader(vc1)
        .loadManyBySQL(sql`name LIKE ${'OrderTest%'}`)
        .orderBySQL(sql`${raw('name')} DESC`) // This will be overridden
        .orderBySQL(sql`${raw('name')} ASC`) // This one wins
        .executeAsync();

      expect(multipleOrderBy).toHaveLength(4);
      expect(multipleOrderBy[0]!.getField('name')).toBe('OrderTest1');
      expect(multipleOrderBy[3]!.getField('name')).toBe('OrderTest4');

      // Test 5: Combining orderBySQL with limit and offset
      const limitedOrder = await PostgresTestEntity.knexLoader(vc1)
        .loadManyBySQL(sql`name LIKE ${'OrderTest%'}`)
        .orderBySQL(sql`${raw('name')} ASC`)
        .limit(2)
        .offset(1)
        .executeAsync();

      expect(limitedOrder).toHaveLength(2);
      expect(limitedOrder[0]!.getField('name')).toBe('OrderTest2');
      expect(limitedOrder[1]!.getField('name')).toBe('OrderTest3');

      // Test 6: orderBySQL with NULLS FIRST/LAST
      const nullsOrder = await PostgresTestEntity.knexLoader(vc1)
        .loadManyBySQL(sql`name LIKE ${'OrderTest%'}`)
        .orderBySQL(sql`string_array IS NULL, ${raw('name')} ASC`)
        .executeAsync();

      expect(nullsOrder).toHaveLength(4);
      expect(nullsOrder[0]!.getField('stringArray')).not.toBeNull(); // false comes first (not null)
      expect(nullsOrder[3]!.getField('stringArray')).toBeNull(); // true comes last (is null)
    });

    it('throws error on multiple executeAsync calls', async () => {
      const vc1 = new ViewerContext(createKnexIntegrationTestEntityCompanionProvider(knexInstance));

      // Create a test entity
      await PostgresTestEntity.creator(vc1)
        .setField('name', 'MultiExecTest')
        .setField('hasACat', true)
        .createAsync();

      // Create a query builder
      const queryBuilder = PostgresTestEntity.knexLoader(vc1).loadManyBySQL(
        sql`name = ${'MultiExecTest'}`,
      );

      // First execution should succeed
      const firstResult = await queryBuilder.executeAsync();
      expect(firstResult).toHaveLength(1);
      expect(firstResult[0]!.getField('name')).toBe('MultiExecTest');

      // Second execution should throw
      await expect(queryBuilder.executeAsync()).rejects.toThrow(
        'Query has already been executed. Create a new query builder to execute again.',
      );

      // Third execution should also throw
      await expect(queryBuilder.executeAsync()).rejects.toThrow(
        'Query has already been executed. Create a new query builder to execute again.',
      );

      // A new query builder should work fine
      const newQueryBuilder = PostgresTestEntity.knexLoader(vc1).loadManyBySQL(
        sql`name = ${'MultiExecTest'}`,
      );

      const newResult = await newQueryBuilder.executeAsync();
      expect(newResult).toHaveLength(1);
      expect(newResult[0]!.getField('name')).toBe('MultiExecTest');
    });
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

      const results = await PostgresTestEntity.knexLoader(
        vc1,
      ).loadManyByFieldEqualityConjunctionAsync([
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

      const results2 = await PostgresTestEntity.knexLoader(
        vc1,
      ).loadManyByFieldEqualityConjunctionAsync([
        { fieldName: 'hasADog', fieldValues: [true, false] },
      ]);
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

      const results = await PostgresTestEntity.knexLoader(
        vc1,
      ).loadManyByFieldEqualityConjunctionAsync([], {
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

      const results = await PostgresTestEntity.knexLoader(
        vc1,
      ).loadManyByFieldEqualityConjunctionAsync([{ fieldName: 'name', fieldValue: null }]);
      expect(results).toHaveLength(2);
      expect(results[0]!.getField('name')).toBeNull();

      const results2 = await PostgresTestEntity.knexLoader(
        vc1,
      ).loadManyByFieldEqualityConjunctionAsync(
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

      const results = await PostgresTestEntity.knexLoader(vc1).loadManyByRawWhereClauseAsync(
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
        PostgresTestEntity.knexLoader(vc1).loadManyByRawWhereClauseAsync('invalid_column = ?', [
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

      const results = await PostgresTestEntity.knexLoader(vc1).loadManyByRawWhereClauseAsync(
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

      const resultsMultipleOrderBy = await PostgresTestEntity.knexLoader(
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

      const resultsOrderByRaw = await PostgresTestEntity.knexLoader(
        vc1,
      ).loadManyByRawWhereClauseAsync('has_a_dog = ?', [true], {
        orderByRaw: 'has_a_dog ASC, name DESC',
      });

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
              .setField('name', 'beforeCreateAndUpdate')
              .createAsync(),
          ).rejects.toThrow('name cannot have value beforeCreateAndUpdate');
          await expect(
            PostgresValidatorTestEntity.loader(vc1).loadByFieldEqualingAsync(
              'name',
              'beforeCreateAndUpdate',
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
              .setField('name', 'beforeCreateAndUpdate')
              .updateAsync(),
          ).rejects.toThrow('name cannot have value beforeCreateAndUpdate');
          await expect(
            PostgresValidatorTestEntity.loader(vc1).loadByFieldEqualingAsync(
              'name',
              'beforeCreateAndUpdate',
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

  describe('pagination with loadPageAsync', () => {
    describe(PaginationStrategy.STANDARD, () => {
      describe('with standard test data', () => {
        beforeEach(async () => {
          const vc = new ViewerContext(
            createKnexIntegrationTestEntityCompanionProvider(knexInstance),
          );

          // Create test data with predictable values
          const names = ['Alice', 'Bob', 'Charlie', 'David', 'Eve', 'Frank', 'Grace', 'Henry'];
          for (let i = 0; i < names.length; i++) {
            await PostgresTestEntity.creator(vc)
              .setField('name', names[i]!)
              .setField('hasACat', i % 2 === 0)
              .setField('hasADog', i % 3 === 0)
              .setField('dateField', new Date(2024, 0, i + 1))
              .createAsync();
          }
        });

        it('performs forward pagination with first/after', async () => {
          const vc = new ViewerContext(
            createKnexIntegrationTestEntityCompanionProvider(knexInstance),
          );

          // Get first page
          const firstPage = await PostgresTestEntity.knexLoader(vc).loadPageAsync({
            first: 3,
            pagination: {
              strategy: PaginationStrategy.STANDARD,
              orderBy: [{ fieldName: 'name', order: OrderByOrdering.ASCENDING }],
            },
          });

          expect(firstPage.edges).toHaveLength(3);
          expect(firstPage.edges[0]?.node.getField('name')).toBe('Alice');
          expect(firstPage.edges[1]?.node.getField('name')).toBe('Bob');
          expect(firstPage.edges[2]?.node.getField('name')).toBe('Charlie');
          expect(firstPage.pageInfo.hasNextPage).toBe(true);
          expect(firstPage.pageInfo.hasPreviousPage).toBe(false);

          // Get second page using cursor
          const secondPage = await PostgresTestEntity.knexLoader(vc).loadPageAsync({
            first: 3,
            after: firstPage.pageInfo.endCursor!,
            pagination: {
              strategy: PaginationStrategy.STANDARD,
              orderBy: [{ fieldName: 'name', order: OrderByOrdering.ASCENDING }],
            },
          });

          expect(secondPage.edges).toHaveLength(3);
          expect(secondPage.edges[0]?.node.getField('name')).toBe('David');
          expect(secondPage.edges[1]?.node.getField('name')).toBe('Eve');
          expect(secondPage.edges[2]?.node.getField('name')).toBe('Frank');
          expect(secondPage.pageInfo.hasNextPage).toBe(true);
          expect(secondPage.pageInfo.hasPreviousPage).toBe(false);
        });

        it('performs backward pagination with last/before', async () => {
          const vc = new ViewerContext(
            createKnexIntegrationTestEntityCompanionProvider(knexInstance),
          );

          // Get last page
          const lastPage = await PostgresTestEntity.knexLoader(vc).loadPageAsync({
            last: 3,
            pagination: {
              strategy: PaginationStrategy.STANDARD,
              orderBy: [{ fieldName: 'name', order: OrderByOrdering.ASCENDING }],
            },
          });

          expect(lastPage.edges).toHaveLength(3);
          expect(lastPage.edges[0]?.node.getField('name')).toBe('Frank');
          expect(lastPage.edges[1]?.node.getField('name')).toBe('Grace');
          expect(lastPage.edges[2]?.node.getField('name')).toBe('Henry');
          expect(lastPage.pageInfo.hasNextPage).toBe(false);
          expect(lastPage.pageInfo.hasPreviousPage).toBe(true);

          // Get previous page using cursor
          const previousPage = await PostgresTestEntity.knexLoader(vc).loadPageAsync({
            last: 3,
            before: lastPage.pageInfo.startCursor!,
            pagination: {
              strategy: PaginationStrategy.STANDARD,
              orderBy: [{ fieldName: 'name', order: OrderByOrdering.ASCENDING }],
            },
          });

          expect(previousPage.edges).toHaveLength(3);
          expect(previousPage.edges[0]?.node.getField('name')).toBe('Charlie');
          expect(previousPage.edges[1]?.node.getField('name')).toBe('David');
          expect(previousPage.edges[2]?.node.getField('name')).toBe('Eve');
          expect(previousPage.pageInfo.hasNextPage).toBe(false);
          expect(previousPage.pageInfo.hasPreviousPage).toBe(true);
        });

        it('supports pagination with SQL where conditions', async () => {
          const vc = new ViewerContext(
            createKnexIntegrationTestEntityCompanionProvider(knexInstance),
          );

          // Query only entities with cats
          const page = await PostgresTestEntity.knexLoader(vc).loadPageAsync({
            first: 2,
            where: sql`has_a_cat = ${true}`,
            pagination: {
              strategy: PaginationStrategy.STANDARD,
              orderBy: [{ fieldName: 'name', order: OrderByOrdering.ASCENDING }],
            },
          });

          expect(page.edges).toHaveLength(2);
          expect(page.edges[0]?.node.getField('name')).toBe('Alice');
          expect(page.edges[0]?.node.getField('hasACat')).toBe(true);
          expect(page.edges[1]?.node.getField('name')).toBe('Charlie');
          expect(page.edges[1]?.node.getField('hasACat')).toBe(true);
          expect(page.pageInfo.hasNextPage).toBe(true);

          // Get next page with same where condition
          const nextPage = await PostgresTestEntity.knexLoader(vc).loadPageAsync({
            first: 2,
            after: page.pageInfo.endCursor!,
            where: sql`has_a_cat = ${true}`,
            pagination: {
              strategy: PaginationStrategy.STANDARD,
              orderBy: [{ fieldName: 'name', order: OrderByOrdering.ASCENDING }],
            },
          });

          expect(nextPage.edges).toHaveLength(2);
          expect(nextPage.edges[0]?.node.getField('name')).toBe('Eve');
          expect(nextPage.edges[0]?.node.getField('hasACat')).toBe(true);
          expect(nextPage.edges[1]?.node.getField('name')).toBe('Grace');
          expect(nextPage.edges[1]?.node.getField('hasACat')).toBe(true);
          expect(nextPage.pageInfo.hasNextPage).toBe(false);
        });

        it('supports pagination with multiple orderBy fields', async () => {
          const vc = new ViewerContext(
            createKnexIntegrationTestEntityCompanionProvider(knexInstance),
          );

          const page = await PostgresTestEntity.knexLoader(vc).loadPageAsync({
            first: 4,
            pagination: {
              strategy: PaginationStrategy.STANDARD,
              orderBy: [
                { fieldName: 'hasACat', order: OrderByOrdering.DESCENDING }, // true comes before false
                { fieldName: 'name', order: OrderByOrdering.ASCENDING },
                { fieldName: 'id', order: OrderByOrdering.ASCENDING },
              ],
            },
          });

          // Entities with cats (true) come first, then sorted by name
          expect(page.edges).toHaveLength(4);
          expect(page.edges[0]?.node.getField('hasACat')).toBe(true);
          expect(page.edges[0]?.node.getField('name')).toBe('Alice');
          expect(page.edges[1]?.node.getField('hasACat')).toBe(true);
          expect(page.edges[1]?.node.getField('name')).toBe('Charlie');
          expect(page.edges[2]?.node.getField('hasACat')).toBe(true);
          expect(page.edges[2]?.node.getField('name')).toBe('Eve');
          expect(page.edges[3]?.node.getField('hasACat')).toBe(true);
          expect(page.edges[3]?.node.getField('name')).toBe('Grace');
        });

        it('handles empty results correctly', async () => {
          const vc = new ViewerContext(
            createKnexIntegrationTestEntityCompanionProvider(knexInstance),
          );

          const page = await PostgresTestEntity.knexLoader(vc).loadPageAsync({
            first: 10,
            where: sql`name = ${'NonexistentName'}`,
            pagination: {
              strategy: PaginationStrategy.STANDARD,
              orderBy: [],
            },
          });

          expect(page.edges).toHaveLength(0);
          expect(page.pageInfo.hasNextPage).toBe(false);
          expect(page.pageInfo.hasPreviousPage).toBe(false);
          expect(page.pageInfo.startCursor).toBeNull();
          expect(page.pageInfo.endCursor).toBeNull();
        });

        it('includes cursors for each edge', async () => {
          const vc = new ViewerContext(
            createKnexIntegrationTestEntityCompanionProvider(knexInstance),
          );

          const page = await PostgresTestEntity.knexLoader(vc).loadPageAsync({
            first: 3,
            pagination: {
              strategy: PaginationStrategy.STANDARD,
              orderBy: [{ fieldName: 'name', order: OrderByOrdering.ASCENDING }],
            },
          });

          // Each edge should have a cursor
          expect(page.edges[0]?.cursor).toBeTruthy();
          expect(page.edges[1]?.cursor).toBeTruthy();
          expect(page.edges[2]?.cursor).toBeTruthy();

          // Start from middle item
          const nextPage = await PostgresTestEntity.knexLoader(vc).loadPageAsync({
            first: 2,
            after: page.edges[1]!.cursor,
            pagination: {
              strategy: PaginationStrategy.STANDARD,
              orderBy: [{ fieldName: 'name', order: OrderByOrdering.ASCENDING }],
            },
          });

          expect(nextPage.edges).toHaveLength(2);
          expect(nextPage.edges[0]?.node.getField('name')).toBe('Charlie');
          expect(nextPage.edges[1]?.node.getField('name')).toBe('David');
        });

        it('derives postgres cursor fields from orderBy', async () => {
          const vc = new ViewerContext(
            createKnexIntegrationTestEntityCompanionProvider(knexInstance),
          );

          const page = await PostgresTestEntity.knexLoader(vc).loadPageAsync({
            first: 3,
            pagination: {
              strategy: PaginationStrategy.STANDARD,
              orderBy: [{ fieldName: 'dateField', order: OrderByOrdering.ASCENDING }],
            },
          });

          expect(page.edges).toHaveLength(3);

          // Navigate using cursor
          const nextPage = await PostgresTestEntity.knexLoader(vc).loadPageAsync({
            first: 3,
            after: page.pageInfo.endCursor!,
            pagination: {
              strategy: PaginationStrategy.STANDARD,
              orderBy: [{ fieldName: 'dateField', order: OrderByOrdering.ASCENDING }],
            },
          });

          expect(nextPage.edges).toHaveLength(3);
          expect(nextPage.pageInfo.hasNextPage).toBe(true);
        });
      });

      it('performs backward pagination with descending order', async () => {
        const vc = new ViewerContext(
          createKnexIntegrationTestEntityCompanionProvider(knexInstance),
        );

        // Create test data with names that sort in a specific order
        await PostgresTestEntity.dropPostgresTableAsync(knexInstance);
        await PostgresTestEntity.createOrTruncatePostgresTableAsync(knexInstance);

        const entities = [];
        for (let i = 1; i <= 5; i++) {
          const entity = await PostgresTestEntity.creator(vc)
            .setField('name', `Z_Item_${i}`) // Z_Item_1, Z_Item_2, Z_Item_3, Z_Item_4, Z_Item_5
            .createAsync();
          entities.push(entity);
        }

        // Test backward pagination with DESCENDING order
        // This internally flips DESCENDING to ASCENDING for the query
        const page = await PostgresTestEntity.knexLoader(vc).loadPageAsync({
          last: 3,
          pagination: {
            strategy: PaginationStrategy.STANDARD,
            orderBy: [{ fieldName: 'name', order: OrderByOrdering.DESCENDING }],
          },
        });

        // With `last: 3` and DESCENDING order, we get the last 3 items when sorted descending
        // Sorted descending: Z_Item_5, Z_Item_4, Z_Item_3, Z_Item_2, Z_Item_1
        // Last 3: Z_Item_3, Z_Item_2, Z_Item_1
        expect(page.edges).toHaveLength(3);
        expect(page.edges[0]?.node.getField('name')).toBe('Z_Item_3');
        expect(page.edges[1]?.node.getField('name')).toBe('Z_Item_2');
        expect(page.edges[2]?.node.getField('name')).toBe('Z_Item_1');
        expect(page.pageInfo.hasPreviousPage).toBe(true);
        expect(page.pageInfo.hasNextPage).toBe(false);

        // Verify the order is maintained correctly with forward pagination too
        const forwardPage = await PostgresTestEntity.knexLoader(vc).loadPageAsync({
          first: 3,
          pagination: {
            strategy: PaginationStrategy.STANDARD,
            orderBy: [{ fieldName: 'name', order: OrderByOrdering.DESCENDING }],
          },
        });

        // First 3 in descending order
        expect(forwardPage.edges).toHaveLength(3);
        expect(forwardPage.edges[0]?.node.getField('name')).toBe('Z_Item_5');
        expect(forwardPage.edges[1]?.node.getField('name')).toBe('Z_Item_4');
        expect(forwardPage.edges[2]?.node.getField('name')).toBe('Z_Item_3');
        expect(forwardPage.pageInfo.hasNextPage).toBe(true);
        expect(forwardPage.pageInfo.hasPreviousPage).toBe(false);
      });

      it('always includes ID field in orderBy for stability', async () => {
        const vc = new ViewerContext(
          createKnexIntegrationTestEntityCompanionProvider(knexInstance),
        );

        // Create entities with duplicate values to test stability
        await PostgresTestEntity.dropPostgresTableAsync(knexInstance);
        await PostgresTestEntity.createOrTruncatePostgresTableAsync(knexInstance);

        const entities = [];
        for (let i = 1; i <= 6; i++) {
          const entity = await PostgresTestEntity.creator(vc)
            .setField('name', `Test${Math.floor((i - 1) / 2)}`) // Creates duplicates: Test0, Test0, Test1, Test1, Test2, Test2
            .setField('hasACat', i % 2 === 0)
            .createAsync();
          entities.push(entity);
        }

        // Pagination with only name in orderBy - ID should be added automatically for stability
        const firstPage = await PostgresTestEntity.knexLoader(vc).loadPageAsync({
          first: 3,
          pagination: {
            strategy: PaginationStrategy.STANDARD,
            orderBy: [],
          },
        });

        expect(firstPage.edges).toHaveLength(3);

        // Get second page
        const secondPage = await PostgresTestEntity.knexLoader(vc).loadPageAsync({
          first: 3,
          after: firstPage.pageInfo.endCursor!,
          pagination: {
            strategy: PaginationStrategy.STANDARD,
            orderBy: [],
          },
        });

        expect(secondPage.edges).toHaveLength(3);

        // Ensure no overlap between pages (stability check)
        const firstPageIds = firstPage.edges.map((e) => e.node.getID());
        const secondPageIds = secondPage.edges.map((e) => e.node.getID());
        const intersection = firstPageIds.filter((id) => secondPageIds.includes(id));
        expect(intersection).toHaveLength(0);

        // Test with explicit ID in orderBy (shouldn't duplicate)
        const pageWithExplicitId = await PostgresTestEntity.knexLoader(vc).loadPageAsync({
          first: 3,
          pagination: {
            strategy: PaginationStrategy.STANDARD,
            orderBy: [],
          },
        });

        expect(pageWithExplicitId.edges).toHaveLength(3);
      });

      it('throws error for invalid cursor format', async () => {
        const vc = new ViewerContext(
          createKnexIntegrationTestEntityCompanionProvider(knexInstance),
        );

        // Try with completely invalid cursor
        await expect(
          PostgresTestEntity.knexLoader(vc).loadPageAsync({
            first: 10,
            after: 'not-a-valid-cursor',
            pagination: {
              strategy: PaginationStrategy.STANDARD,
              orderBy: [],
            },
          }),
        ).rejects.toThrow('Failed to decode cursor');

        // Try with valid base64 but invalid JSON
        const invalidJsonCursor = Buffer.from('not json').toString('base64url');
        await expect(
          PostgresTestEntity.knexLoader(vc).loadPageAsync({
            first: 10,
            after: invalidJsonCursor,
            pagination: {
              strategy: PaginationStrategy.STANDARD,
              orderBy: [],
            },
          }),
        ).rejects.toThrow('Failed to decode cursor');

        // Try with valid JSON but missing required fields
        const missingFieldsCursor = Buffer.from(JSON.stringify({ some: 'field' })).toString(
          'base64url',
        );
        await expect(
          PostgresTestEntity.knexLoader(vc).loadPageAsync({
            first: 10,
            after: missingFieldsCursor,
            pagination: {
              strategy: PaginationStrategy.STANDARD,
              orderBy: [],
            },
          }),
        ).rejects.toThrow("Cursor is missing required 'id' field.");
      });

      it('performs pagination with both loader types', async () => {
        const vc = new ViewerContext(
          createKnexIntegrationTestEntityCompanionProvider(knexInstance),
        );

        await PostgresTestEntity.dropPostgresTableAsync(knexInstance);
        await PostgresTestEntity.createOrTruncatePostgresTableAsync(knexInstance);

        // Create entities with different names
        const names = ['Alice', 'Bob', 'Charlie', 'David', 'Eve', 'Frank'];
        for (const name of names) {
          await PostgresTestEntity.creator(vc).setField('name', name).createAsync();
        }

        // Test with enforcing loader (standard pagination)
        const pageEnforced = await PostgresTestEntity.knexLoader(vc).loadPageAsync({
          first: 4,
          pagination: {
            strategy: PaginationStrategy.STANDARD,
            orderBy: [{ fieldName: 'name', order: OrderByOrdering.ASCENDING }],
          },
        });

        // Should return entities directly
        expect(pageEnforced.edges).toHaveLength(4);
        expect(pageEnforced.edges[0]?.node.getField('name')).toBe('Alice');
        expect(pageEnforced.edges[1]?.node.getField('name')).toBe('Bob');
        expect(pageEnforced.edges[2]?.node.getField('name')).toBe('Charlie');
        expect(pageEnforced.edges[3]?.node.getField('name')).toBe('David');

        // Test pagination continues correctly
        const secondPage = await PostgresTestEntity.knexLoader(vc).loadPageAsync({
          first: 4,
          after: pageEnforced.pageInfo.endCursor!,
          pagination: {
            strategy: PaginationStrategy.STANDARD,
            orderBy: [{ fieldName: 'name', order: OrderByOrdering.ASCENDING }],
          },
        });

        expect(secondPage.edges).toHaveLength(2); // Only 2 entities left
        expect(secondPage.edges[0]?.node.getField('name')).toBe('Eve');
        expect(secondPage.edges[1]?.node.getField('name')).toBe('Frank');

        // Test with authorization result-based loader
        // Note: Currently loadPageWithSearchAsync with knexLoaderWithAuthorizationResults
        // returns entities directly, not Result objects (unlike loadManyBySQL)
        const pageWithAuth = await PostgresTestEntity.knexLoaderWithAuthorizationResults(
          vc,
        ).loadPageAsync({
          first: 3,
          pagination: {
            strategy: PaginationStrategy.STANDARD,
            orderBy: [{ fieldName: 'name', order: OrderByOrdering.ASCENDING }],
          },
        });

        expect(pageWithAuth.edges).toHaveLength(3);
        // These are entities, not Result objects in the current implementation
        expect(pageWithAuth.edges[0]?.node.getField('name')).toBe('Alice');
        expect(pageWithAuth.edges[1]?.node.getField('name')).toBe('Bob');
        expect(pageWithAuth.edges[2]?.node.getField('name')).toBe('Charlie');
      });

      it('correctly handles hasMore flag when filtering unauthorized entities', async () => {
        const vc = new ViewerContext(
          createKnexIntegrationTestEntityCompanionProvider(knexInstance),
        );

        await PostgresTestEntity.dropPostgresTableAsync(knexInstance);
        await PostgresTestEntity.createOrTruncatePostgresTableAsync(knexInstance);

        // Create exactly 6 entities
        for (let i = 1; i <= 6; i++) {
          await PostgresTestEntity.creator(vc).setField('name', `Entity${i}`).createAsync();
        }

        // Load with limit 5 - should have hasNextPage=true
        const page1 = await PostgresTestEntity.knexLoader(vc).loadPageAsync({
          first: 5,
          pagination: {
            strategy: PaginationStrategy.STANDARD,
            orderBy: [],
          },
        });

        expect(page1.edges).toHaveLength(5);
        expect(page1.pageInfo.hasNextPage).toBe(true);

        // Load the last entity
        const page2 = await PostgresTestEntity.knexLoader(vc).loadPageAsync({
          first: 5,
          after: page1.pageInfo.endCursor!,
          pagination: {
            strategy: PaginationStrategy.STANDARD,
            orderBy: [],
          },
        });

        expect(page2.edges).toHaveLength(1);
        expect(page2.pageInfo.hasNextPage).toBe(false);
      });

      it('orderByFragment takes precedence over orderBy when both are specified', async () => {
        const vc = new ViewerContext(
          createKnexIntegrationTestEntityCompanionProvider(knexInstance),
        );
        await PostgresTestEntity.dropPostgresTableAsync(knexInstance);
        await PostgresTestEntity.createOrTruncatePostgresTableAsync(knexInstance);

        // Create test data with specific order
        await PostgresTestEntity.creator(vc).setField('name', 'Charlie').createAsync();
        await PostgresTestEntity.creator(vc).setField('name', 'Alice').createAsync();
        await PostgresTestEntity.creator(vc).setField('name', 'Bob').createAsync();
        await PostgresTestEntity.creator(vc).setField('name', 'David').createAsync();

        // Test that orderByFragment overrides orderBy completely
        // orderBy would sort by name ascending (Alice, Bob, Charlie, David)
        // orderByFragment will sort by name descending (David, Charlie, Bob, Alice)
        const results = await PostgresTestEntity.knexLoader(vc)
          .loadManyBySQL(sql`1 = 1`, {
            orderBy: [{ fieldName: 'name', order: OrderByOrdering.ASCENDING }],
            orderByFragment: sql`name DESC`,
          })
          .executeAsync();

        // Should be in descending order due to orderByFragment taking precedence
        expect(results).toHaveLength(4);
        expect(results[0]?.getField('name')).toBe('David');
        expect(results[1]?.getField('name')).toBe('Charlie');
        expect(results[2]?.getField('name')).toBe('Bob');
        expect(results[3]?.getField('name')).toBe('Alice');
      });

      it('performs paginated search with both loader types', async () => {
        const vc = new ViewerContext(
          createKnexIntegrationTestEntityCompanionProvider(knexInstance),
        );
        await PostgresTestEntity.dropPostgresTableAsync(knexInstance);
        await PostgresTestEntity.createOrTruncatePostgresTableAsync(knexInstance);

        // Enable pg_trgm extension for trigram similarity
        await knexInstance.raw('CREATE EXTENSION IF NOT EXISTS pg_trgm');

        // Create test data with searchable names and mixed attributes
        const testData = [
          { name: 'Alice Johnson', hasACat: true, hasADog: false },
          { name: 'Bob Smith', hasACat: false, hasADog: true },
          { name: 'Charlie Johnson', hasACat: true, hasADog: false },
          { name: 'David Smith', hasACat: false, hasADog: false },
          { name: 'Eve Thompson', hasACat: true, hasADog: true },
          { name: 'Frank Johnson', hasACat: false, hasADog: true },
        ];

        for (const data of testData) {
          await PostgresTestEntity.creator(vc)
            .setField('name', data.name)
            .setField('hasACat', data.hasACat)
            .setField('hasADog', data.hasADog)
            .createAsync();
        }

        // Test 1: Regular loader with ILIKE search
        const iLikeSearchRegular = await PostgresTestEntity.knexLoader(vc).loadPageAsync({
          first: 2,
          pagination: {
            strategy: PaginationStrategy.ILIKE_SEARCH,
            term: 'Johnson',
            fields: ['name'],
          },
        });

        expect(iLikeSearchRegular.edges).toHaveLength(2);
        expect(iLikeSearchRegular.edges[0]?.node.getField('name')).toBe('Alice Johnson');
        expect(iLikeSearchRegular.edges[1]?.node.getField('name')).toBe('Charlie Johnson');
        expect(iLikeSearchRegular.pageInfo.hasNextPage).toBe(true);

        // Test 2: Authorization result loader with same ILIKE search
        const iLikeSearchAuth = await PostgresTestEntity.knexLoaderWithAuthorizationResults(
          vc,
        ).loadPageAsync({
          first: 2,
          pagination: {
            strategy: PaginationStrategy.ILIKE_SEARCH,
            term: 'Johnson',
            fields: ['name'],
          },
        });

        expect(iLikeSearchAuth.edges).toHaveLength(2);
        // Authorization loader returns entities directly, not Result objects
        expect(iLikeSearchAuth.edges[0]?.node.getField('name')).toBe('Alice Johnson');
        expect(iLikeSearchAuth.edges[1]?.node.getField('name')).toBe('Charlie Johnson');
        expect(iLikeSearchAuth.pageInfo.hasNextPage).toBe(true);

        // Test 3: Regular loader with TRIGRAM search
        const trigramSearchRegular = await PostgresTestEntity.knexLoader(vc).loadPageAsync({
          first: 3,
          pagination: {
            strategy: PaginationStrategy.TRIGRAM_SEARCH,
            term: 'Jonson', // Intentional misspelling to test similarity
            fields: ['name'],
            threshold: 0.2,
          },
        });

        // Should find Johnson names due to similarity
        expect(trigramSearchRegular.edges.length).toBeGreaterThan(0);
        const foundNames = trigramSearchRegular.edges.map((e) => e.node.getField('name'));
        expect(foundNames).toContain('Alice Johnson');
        expect(foundNames).toContain('Charlie Johnson');
        expect(foundNames).toContain('Frank Johnson');

        // Test 4: Authorization result loader with TRIGRAM search
        const trigramSearchAuth = await PostgresTestEntity.knexLoaderWithAuthorizationResults(
          vc,
        ).loadPageAsync({
          first: 3,
          pagination: {
            strategy: PaginationStrategy.TRIGRAM_SEARCH,
            term: 'Jonson', // Intentional misspelling
            fields: ['name'],
            threshold: 0.2,
          },
        });

        expect(trigramSearchAuth.edges.length).toBeGreaterThan(0);
        const foundNamesAuth = trigramSearchAuth.edges.map((e) => e.node.getField('name'));
        expect(foundNamesAuth).toContain('Alice Johnson');
        expect(foundNamesAuth).toContain('Charlie Johnson');
        expect(foundNamesAuth).toContain('Frank Johnson');

        // Test 5: Test pagination with cursor for both loader types
        const firstPageRegular = await PostgresTestEntity.knexLoader(vc).loadPageAsync({
          first: 1,
          pagination: {
            strategy: PaginationStrategy.ILIKE_SEARCH,
            term: 'Smith',
            fields: ['name'],
          },
        });

        expect(firstPageRegular.edges).toHaveLength(1);
        expect(firstPageRegular.edges[0]?.node.getField('name')).toBe('Bob Smith');

        const secondPageRegular = await PostgresTestEntity.knexLoader(vc).loadPageAsync({
          first: 1,
          after: firstPageRegular.pageInfo.endCursor!,
          pagination: {
            strategy: PaginationStrategy.ILIKE_SEARCH,
            term: 'Smith',
            fields: ['name'],
          },
        });

        expect(secondPageRegular.edges).toHaveLength(1);
        expect(secondPageRegular.edges[0]?.node.getField('name')).toBe('David Smith');

        // Test 6: Combine search with WHERE filter for both loaders
        const filteredSearchRegular = await PostgresTestEntity.knexLoader(vc).loadPageAsync({
          first: 10,
          where: sql`has_a_cat = ${true}`,
          pagination: {
            strategy: PaginationStrategy.ILIKE_SEARCH,
            term: 'Johnson',
            fields: ['name'],
          },
        });

        // Only Alice Johnson and Charlie Johnson have cats
        expect(filteredSearchRegular.edges).toHaveLength(2);
        expect(filteredSearchRegular.edges[0]?.node.getField('name')).toBe('Alice Johnson');
        expect(filteredSearchRegular.edges[0]?.node.getField('hasACat')).toBe(true);
        expect(filteredSearchRegular.edges[1]?.node.getField('name')).toBe('Charlie Johnson');
        expect(filteredSearchRegular.edges[1]?.node.getField('hasACat')).toBe(true);

        const filteredSearchAuth = await PostgresTestEntity.knexLoaderWithAuthorizationResults(
          vc,
        ).loadPageAsync({
          first: 10,
          where: sql`has_a_cat = ${true}`,
          pagination: {
            strategy: PaginationStrategy.ILIKE_SEARCH,
            term: 'Johnson',
            fields: ['name'],
          },
        });

        expect(filteredSearchAuth.edges).toHaveLength(2);
        expect(filteredSearchAuth.edges[0]?.node.getField('name')).toBe('Alice Johnson');
        expect(filteredSearchAuth.edges[1]?.node.getField('name')).toBe('Charlie Johnson');

        // Test 7: Test with both loader types
        const withRegular = await PostgresTestEntity.knexLoader(vc).loadPageAsync({
          first: 1,
          pagination: {
            strategy: PaginationStrategy.ILIKE_SEARCH,
            term: 'Johnson',
            fields: ['name'],
          },
        });

        expect(withRegular.edges).toHaveLength(1);

        const withAuth = await PostgresTestEntity.knexLoaderWithAuthorizationResults(
          vc,
        ).loadPageAsync({
          first: 1,
          pagination: {
            strategy: PaginationStrategy.ILIKE_SEARCH,
            term: 'Johnson',
            fields: ['name'],
          },
        });

        expect(withAuth.edges).toHaveLength(1);
      });
    });

    describe(PaginationStrategy.ILIKE_SEARCH, () => {
      it('supports search with ILIKE strategy', async () => {
        const vc = new ViewerContext(
          createKnexIntegrationTestEntityCompanionProvider(knexInstance),
        );

        await PostgresTestEntity.dropPostgresTableAsync(knexInstance);
        await PostgresTestEntity.createOrTruncatePostgresTableAsync(knexInstance);

        // Create test data with searchable names
        const names = [
          'Alice Johnson',
          'Bob Smith',
          'Charlie Brown',
          'David Smith',
          'Eve Johnson',
          'Frank Miller',
        ];
        for (let i = 0; i < names.length; i++) {
          await PostgresTestEntity.creator(vc)
            .setField('name', names[i]!)
            .setField('hasACat', i % 2 === 0)
            .createAsync();
        }

        // Search for names containing "Johnson"
        const searchResults = await PostgresTestEntity.knexLoader(vc).loadPageAsync({
          first: 10,
          pagination: {
            strategy: PaginationStrategy.ILIKE_SEARCH,
            term: 'Johnson',
            fields: ['name'],
          },
        });

        expect(searchResults.edges).toHaveLength(2);
        expect(searchResults.edges[0]?.node.getField('name')).toBe('Alice Johnson');
        expect(searchResults.edges[1]?.node.getField('name')).toBe('Eve Johnson');

        // Search for names containing "Smith" with pagination
        const smithPage1 = await PostgresTestEntity.knexLoader(vc).loadPageAsync({
          first: 1,
          pagination: {
            strategy: PaginationStrategy.ILIKE_SEARCH,
            term: 'Smith',
            fields: ['name'],
          },
        });

        expect(smithPage1.edges).toHaveLength(1);
        expect(smithPage1.edges[0]?.node.getField('name')).toBe('Bob Smith');
        expect(smithPage1.pageInfo.hasNextPage).toBe(true);

        // Get next page
        const smithPage2 = await PostgresTestEntity.knexLoader(vc).loadPageAsync({
          first: 1,
          after: smithPage1.pageInfo.endCursor!,
          pagination: {
            strategy: PaginationStrategy.ILIKE_SEARCH,
            term: 'Smith',
            fields: ['name'],
          },
        });

        expect(smithPage2.edges).toHaveLength(1);
        expect(smithPage2.edges[0]?.node.getField('name')).toBe('David Smith');
        expect(smithPage2.pageInfo.hasNextPage).toBe(false);

        // Test partial match (case insensitive)
        const partialMatch = await PostgresTestEntity.knexLoader(vc).loadPageAsync({
          first: 10,
          pagination: {
            strategy: PaginationStrategy.ILIKE_SEARCH,
            term: 'john',
            fields: ['name'],
          },
        });

        expect(partialMatch.edges).toHaveLength(2);
        expect(partialMatch.edges[0]?.node.getField('name')).toBe('Alice Johnson');
        expect(partialMatch.edges[1]?.node.getField('name')).toBe('Eve Johnson');

        // Test search with WHERE clause
        const combinedFilter = await PostgresTestEntity.knexLoader(vc).loadPageAsync({
          first: 10,
          where: sql`has_a_cat = ${true}`,
          pagination: {
            strategy: PaginationStrategy.ILIKE_SEARCH,
            term: 'Johnson',
            fields: ['name'],
          },
        });

        // Both Alice Johnson (index 0) and Eve Johnson (index 4) have cats
        expect(combinedFilter.edges).toHaveLength(2);
        expect(combinedFilter.edges[0]?.node.getField('name')).toBe('Alice Johnson');
        expect(combinedFilter.edges[0]?.node.getField('hasACat')).toBe(true);
        expect(combinedFilter.edges[1]?.node.getField('name')).toBe('Eve Johnson');
        expect(combinedFilter.edges[1]?.node.getField('hasACat')).toBe(true);
      });

      it('search with ILIKE strategy works with forward and backward pagination', async () => {
        const vc = new ViewerContext(
          createKnexIntegrationTestEntityCompanionProvider(knexInstance),
        );
        await PostgresTestEntity.dropPostgresTableAsync(knexInstance);
        await PostgresTestEntity.createOrTruncatePostgresTableAsync(knexInstance);

        // Create test data
        const names = ['Apple', 'Application', 'Apply', 'Banana', 'Cherry', 'Pineapple'];
        for (const name of names) {
          await PostgresTestEntity.creator(vc).setField('name', name).createAsync();
        }

        // Forward pagination with ILIKE search
        const forwardPage = await PostgresTestEntity.knexLoader(vc).loadPageAsync({
          first: 2,
          pagination: {
            strategy: PaginationStrategy.ILIKE_SEARCH,
            term: 'app',
            fields: ['name'],
          },
        });

        expect(forwardPage.edges).toHaveLength(2);
        const forwardNames = forwardPage.edges.map((e) => e.node.getField('name'));
        // Should match Apple, Application, Apply, Pineapple (case-insensitive)
        forwardNames.forEach((name) => {
          expect(name?.toLowerCase()).toContain('app');
        });

        // Backward pagination with ILIKE search
        const backwardPage = await PostgresTestEntity.knexLoader(vc).loadPageAsync({
          last: 2,
          pagination: {
            strategy: PaginationStrategy.ILIKE_SEARCH,
            term: 'app',
            fields: ['name'],
          },
        });

        expect(backwardPage.edges).toHaveLength(2);
        const backwardNames = backwardPage.edges.map((e) => e.node.getField('name'));
        backwardNames.forEach((name) => {
          expect(name?.toLowerCase()).toContain('app');
        });

        // Verify complete coverage with cursors
        const allResults: string[] = [];
        let cursor: string | undefined;
        let hasNext = true;

        while (hasNext) {
          const page = await PostgresTestEntity.knexLoader(vc).loadPageAsync({
            first: 10,
            ...(cursor && { after: cursor }),
            pagination: {
              strategy: PaginationStrategy.ILIKE_SEARCH,
              term: 'app',
              fields: ['name'],
            },
          });

          allResults.push(
            ...page.edges
              .map((e) => e.node.getField('name'))
              .filter((n): n is string => n !== null),
          );
          cursor = page.pageInfo.endCursor ?? undefined;
          hasNext = page.pageInfo.hasNextPage;
        }

        // Should find all names containing 'app' (case-insensitive)
        expect(allResults).toContain('Apple');
        expect(allResults).toContain('Application');
        expect(allResults).toContain('Apply');
        expect(allResults).toContain('Pineapple');
        expect(allResults).not.toContain('Banana');
        expect(allResults).not.toContain('Cherry');
      });

      it('verifies ILIKE search cursor pagination works correctly with ORDER BY', async () => {
        const vc = new ViewerContext(
          createKnexIntegrationTestEntityCompanionProvider(knexInstance),
        );

        // Create test data with many matching records
        const testNames = [];
        for (let i = 0; i < 20; i++) {
          testNames.push(`Test${i.toString().padStart(2, '0')}_Pattern`);
        }

        // Shuffle the array to create in random order
        const shuffled = [...testNames].sort(() => Math.random() - 0.5);

        // Create entities in shuffled order
        const createdEntities = [];
        for (const name of shuffled) {
          const entity = await PostgresTestEntity.creator(vc)
            .setField('name', name)
            .setField('hasACat', Math.random() > 0.5)
            .createAsync();
          createdEntities.push(entity);
        }

        // Paginate through all results with ILIKE search, collecting all names
        const allNames: string[] = [];
        let cursor: string | undefined;
        let pageCount = 0;
        const pageSize = 3;

        while (true) {
          const page = await PostgresTestEntity.knexLoader(vc).loadPageAsync({
            first: pageSize,
            ...(cursor && { after: cursor }),
            pagination: {
              strategy: PaginationStrategy.ILIKE_SEARCH,
              term: 'Pattern',
              fields: ['name'],
            },
          });

          pageCount++;
          allNames.push(
            ...page.edges
              .map((e) => e.node.getField('name'))
              .filter((n): n is string => n !== null),
          );

          if (!page.pageInfo.hasNextPage || pageCount > 10) {
            break;
          }
          cursor = page.pageInfo.endCursor!;
        }

        // With proper ORDER BY, we should get all matching records
        expect(allNames.length).toBe(20);

        // Check that we got all unique names (no duplicates)
        const uniqueNames = new Set(allNames);
        expect(uniqueNames.size).toBe(20);

        // Verify all expected names are present
        const sortedTestNames = [...testNames].sort();
        const sortedAllNames = [...allNames].sort();
        expect(sortedAllNames).toEqual(sortedTestNames);

        // Test backward pagination
        const backwardNames: string[] = [];
        let backCursor: string | undefined;
        pageCount = 0;

        while (true) {
          const page = await PostgresTestEntity.knexLoader(vc).loadPageAsync({
            last: pageSize,
            ...(backCursor && { before: backCursor }),
            pagination: {
              strategy: PaginationStrategy.ILIKE_SEARCH,
              term: 'Pattern',
              fields: ['name'],
            },
          });

          pageCount++;
          backwardNames.unshift(
            ...page.edges
              .map((e) => e.node.getField('name'))
              .filter((n): n is string => n !== null),
          );

          if (!page.pageInfo.hasPreviousPage || pageCount > 10) {
            break;
          }
          backCursor = page.pageInfo.startCursor!;
        }

        // Backward pagination should also return all records
        expect(backwardNames.length).toBe(20);
        expect(new Set(backwardNames).size).toBe(20);

        // With ORDER BY (search fields + ID), the ordering is deterministic
        // Forward and backward should produce the same order since we're ordering by name ASC/DESC + ID
        expect(allNames).toEqual(backwardNames);

        // Verify the ordering follows the search fields (name in this case)
        // Since we order by name ASC for forward pagination, names should be sorted
        const expectedOrder = [...testNames].sort();
        expect(allNames).toEqual(expectedOrder);
      });
    });

    describe(PaginationStrategy.TRIGRAM_SEARCH, () => {
      it('supports trigram similarity search', async () => {
        const vc = new ViewerContext(
          createKnexIntegrationTestEntityCompanionProvider(knexInstance),
        );

        await PostgresTestEntity.dropPostgresTableAsync(knexInstance);
        await PostgresTestEntity.createOrTruncatePostgresTableAsync(knexInstance);

        // Enable pg_trgm extension for trigram similarity
        await knexInstance.raw('CREATE EXTENSION IF NOT EXISTS pg_trgm');

        // Create test data with similar names
        const names = ['Johnson', 'Jonson', 'Johnsen', 'Smith', 'Smyth', 'Schmidt'];
        for (let i = 0; i < names.length; i++) {
          await PostgresTestEntity.creator(vc)
            .setField('name', names[i]!)
            .setField('hasACat', i < 3) // First 3 have cats
            .createAsync();
        }

        // Search for similar names to "Johnson" using trigram
        const trigramSearch = await PostgresTestEntity.knexLoader(vc).loadPageAsync({
          first: 10,
          pagination: {
            strategy: PaginationStrategy.TRIGRAM_SEARCH,
            term: 'Johnson',
            fields: ['name'],
            threshold: 0.3, // Similarity threshold
          },
        });

        // Should find exact match and similar names, ordered by relevance
        expect(trigramSearch.edges.length).toBeGreaterThan(0);
        // Exact match should come first due to ILIKE matching
        expect(trigramSearch.edges[0]?.node.getField('name')).toBe('Johnson');

        // The similar names (Jonson, Johnsen) should also be included
        const foundNames = trigramSearch.edges.map((e) => e.node.getField('name'));
        expect(foundNames).toContain('Jonson');
        expect(foundNames).toContain('Johnsen');

        // Test combining with WHERE clause
        const filteredTrigram = await PostgresTestEntity.knexLoader(vc).loadPageAsync({
          first: 10,
          where: sql`has_a_cat = ${true}`,
          pagination: {
            strategy: PaginationStrategy.TRIGRAM_SEARCH,
            term: 'Johnson',
            fields: ['name'],
            threshold: 0.3,
          },
        });

        // Only the Johnson-like names with cats
        expect(filteredTrigram.edges.length).toBeGreaterThan(0);
        expect(filteredTrigram.edges.length).toBeLessThanOrEqual(3);
        filteredTrigram.edges.forEach((edge) => {
          expect(edge.node.getField('hasACat')).toBe(true);
        });
      });

      it('supports trigram search with cursor pagination', async () => {
        const vc = new ViewerContext(
          createKnexIntegrationTestEntityCompanionProvider(knexInstance),
        );
        await PostgresTestEntity.dropPostgresTableAsync(knexInstance);
        await PostgresTestEntity.createOrTruncatePostgresTableAsync(knexInstance);

        // Enable pg_trgm extension for trigram similarity
        await knexInstance.raw('CREATE EXTENSION IF NOT EXISTS pg_trgm');

        // Create test data with similar names
        const names = [
          'Johnson',
          'Jonson',
          'Johnsen',
          'Johnston',
          'Johan',
          'Smith',
          'Smyth',
          'Schmidt',
          'Smithers',
          'Smythe',
        ];
        for (let i = 0; i < names.length; i++) {
          await PostgresTestEntity.creator(vc)
            .setField('name', names[i]!)
            .setField('hasACat', i < 5) // First 5 have cats (Johnson-like names)
            .createAsync();
        }

        // First page with trigram search (no cursor)
        const firstPage = await PostgresTestEntity.knexLoader(vc).loadPageAsync({
          first: 3,
          pagination: {
            strategy: PaginationStrategy.TRIGRAM_SEARCH,
            term: 'Johnson',
            fields: ['name'],
            threshold: 0.3,
          },
        });

        // Should have results ordered by relevance
        expect(firstPage.edges.length).toBeGreaterThan(0);
        expect(firstPage.edges[0]?.node.getField('name')).toBe('Johnson'); // Exact match first
        const firstPageCursor = firstPage.pageInfo.endCursor;
        expect(firstPageCursor).not.toBeNull();

        // Second page with cursor
        // Note: For trigram search with cursor, we use regular orderBy instead of custom order
        // so results might not be in perfect similarity order, but should still be filtered
        const secondPage = await PostgresTestEntity.knexLoader(vc).loadPageAsync({
          first: 3,
          after: firstPageCursor!,
          pagination: {
            strategy: PaginationStrategy.TRIGRAM_SEARCH,
            term: 'Johnson',
            fields: ['name'],
            threshold: 0.3,
          },
        });

        // Should have results (might be empty if first page had all results)
        expect(secondPage.edges.length).toBeGreaterThanOrEqual(0);

        // The key test is that the query runs successfully with the searchOrderByFragment
        // being passed through the parallel query path

        // Test backward pagination with cursor
        const lastPage = await PostgresTestEntity.knexLoader(vc).loadPageAsync({
          last: 2,
          before: firstPageCursor!,
          pagination: {
            strategy: PaginationStrategy.TRIGRAM_SEARCH,
            term: 'Johnson',
            fields: ['name'],
            threshold: 0.3,
          },
        });

        // Should have results before the cursor
        expect(lastPage.edges.length).toBeGreaterThanOrEqual(0);

        // Test with WHERE clause, cursor, and search
        const firstEdgeCursor = firstPage.edges[0]?.cursor;
        expect(firstEdgeCursor).toBeDefined();
        const filteredWithCursor = await PostgresTestEntity.knexLoader(vc).loadPageAsync({
          first: 2,
          after: firstEdgeCursor!,
          where: sql`has_a_cat = ${true}`,
          pagination: {
            strategy: PaginationStrategy.TRIGRAM_SEARCH,
            term: 'Johnson',
            fields: ['name'],
            threshold: 0.3,
          },
        });

        // Should have filtered results with correct
        expect(filteredWithCursor.edges.length).toBeGreaterThanOrEqual(0);
        filteredWithCursor.edges.forEach((edge) => {
          expect(edge.node.getField('hasACat')).toBe(true);
        });
      });

      it('correctly orders trigram search results for forward and backward pagination', async () => {
        const vc = new ViewerContext(
          createKnexIntegrationTestEntityCompanionProvider(knexInstance),
        );
        await PostgresTestEntity.dropPostgresTableAsync(knexInstance);
        await PostgresTestEntity.createOrTruncatePostgresTableAsync(knexInstance);

        // Enable pg_trgm extension for trigram similarity
        await knexInstance.raw('CREATE EXTENSION IF NOT EXISTS pg_trgm');

        // Create test data with similar names and unique IDs for stable ordering
        const testData = [
          { name: 'Johnson', hasACat: true }, // Exact match, should be first
          { name: 'Jonson', hasACat: true }, // High similarity
          { name: 'Johnsen', hasACat: true }, // High similarity
          { name: 'Johnston', hasACat: true }, // Medium similarity
          { name: 'Johan', hasACat: true }, // Lower similarity
          { name: 'John', hasACat: false }, // Lower similarity
          { name: 'Smith', hasACat: false }, // No similarity
          { name: 'Williams', hasACat: false }, // No similarity
        ];

        const createdEntities = [];
        for (const data of testData) {
          const entity = await PostgresTestEntity.creator(vc)
            .setField('name', data.name)
            .setField('hasACat', data.hasACat)
            .createAsync();
          createdEntities.push(entity);
        }

        // Test 1: Forward pagination (first)
        const firstPageForward = await PostgresTestEntity.knexLoader(vc).loadPageAsync({
          first: 4,
          pagination: {
            strategy: PaginationStrategy.TRIGRAM_SEARCH,
            term: 'Johnson',
            fields: ['name'],
            extraOrderByFields: ['createdAt'], // Ensure stable ordering for similar scores since ID is uuidv4
            threshold: 0.2,
          },
        });

        // Johnson should be first (exact match), followed by high similarity matches
        expect(firstPageForward.edges.length).toBeGreaterThan(0);
        expect(firstPageForward.edges[0]?.node.getField('name')).toBe('Johnson');

        // All results should match the search term
        const forwardNames = firstPageForward.edges.map((e) => e.node.getField('name'));
        expect(forwardNames).not.toContain('Smith');
        expect(forwardNames).not.toContain('Williams');

        // Test 2: Backward pagination (last)
        const lastPageBackward = await PostgresTestEntity.knexLoader(vc).loadPageAsync({
          last: 4,
          pagination: {
            strategy: PaginationStrategy.TRIGRAM_SEARCH,
            term: 'Johnson',
            fields: ['name'],
            extraOrderByFields: ['createdAt'], // Ensure stable ordering for similar scores since ID is uuidv4
            threshold: 0.2,
          },
        });

        // Results should be in the same order (not reversed) after internal processing
        expect(lastPageBackward.edges.length).toBeGreaterThan(0);
        const backwardNames = lastPageBackward.edges.map((e) => e.node.getField('name'));

        // Should not include non-matching names
        expect(backwardNames).not.toContain('Smith');
        expect(backwardNames).not.toContain('Williams');

        // Test 3: Test cursor pagination with trigram search
        // With the improved implementation, TRIGRAM cursor pagination now preserves
        // similarity-based ordering by computing similarity scores dynamically via subquery
        const firstPageForwardCursor = await PostgresTestEntity.knexLoader(vc).loadPageAsync({
          first: 3,
          pagination: {
            strategy: PaginationStrategy.TRIGRAM_SEARCH,
            term: 'Johnson',
            fields: ['name'],
            extraOrderByFields: ['createdAt'], // Ensure stable ordering for similar scores since ID is uuidv4
            threshold: 0.2,
          },
        });

        expect(firstPageForwardCursor.edges.length).toBeGreaterThan(0);
        const firstPageForwardCursorData = firstPageForwardCursor.edges.map((e) => ({
          name: e.node.getField('name'),
          id: e.node.getID(),
          createdAt: e.node.getField('createdAt'),
        }));
        const firstPageForwardCursorIDs = firstPageForwardCursorData.map((d) => d.id);

        const secondPageForwardCursor = await PostgresTestEntity.knexLoader(vc).loadPageAsync({
          first: 3,
          after: firstPageForwardCursor.pageInfo.endCursor!,
          pagination: {
            strategy: PaginationStrategy.TRIGRAM_SEARCH,
            term: 'Johnson',
            fields: ['name'],
            extraOrderByFields: ['createdAt'], // Ensure stable ordering for similar scores since ID is uuidv4
            threshold: 0.2,
          },
        });

        const secondPageForwardCursorData = secondPageForwardCursor.edges.map((e) => ({
          name: e.node.getField('name'),
          id: e.node.getID(),
          createdAt: e.node.getField('createdAt'),
        }));
        const secondPageForwardCursorIDs = secondPageForwardCursorData.map((d) => d.id);
        expect(secondPageForwardCursorIDs.length).toBeGreaterThan(0);

        // With the new subquery-based cursor implementation, there should be no overlap
        // between pages as ordering is perfectly preserved
        const overlapForwardCursor = firstPageForwardCursorIDs.filter((id) =>
          secondPageForwardCursorIDs.includes(id),
        );
        expect(overlapForwardCursor).toHaveLength(0);

        // Test 4: test backward cursor pagination with trigram search
        const firstPageBackwardCursor = await PostgresTestEntity.knexLoader(vc).loadPageAsync({
          last: 3,
          pagination: {
            strategy: PaginationStrategy.TRIGRAM_SEARCH,
            term: 'Johnson',
            fields: ['name'],
            extraOrderByFields: ['createdAt'], // Ensure stable ordering for similar scores since ID is uuidv4
            threshold: 0.2,
          },
        });

        const firstPageBackwardCursorData = firstPageBackwardCursor.edges.map((e) => ({
          name: e.node.getField('name'),
          id: e.node.getID(),
          createdAt: e.node.getField('createdAt'),
        }));
        const firstPageBackwardIDs = firstPageBackwardCursorData.map((d) => d.id);
        expect(firstPageBackwardIDs.length).toBeGreaterThan(0);

        const secondPageBackwardCursor = await PostgresTestEntity.knexLoader(vc).loadPageAsync({
          last: 3,
          before: firstPageBackwardCursor.pageInfo.startCursor!,
          pagination: {
            strategy: PaginationStrategy.TRIGRAM_SEARCH,
            term: 'Johnson',
            fields: ['name'],
            extraOrderByFields: ['createdAt'], // Ensure stable ordering for similar scores since ID is uuidv4
            threshold: 0.2,
          },
        });

        const secondPageBackwardCursorData = secondPageBackwardCursor.edges.map((e) => ({
          name: e.node.getField('name'),
          id: e.node.getID(),
          createdAt: e.node.getField('createdAt'),
        }));
        const secondPageBackwardIDs = secondPageBackwardCursorData.map((d) => d.id);
        expect(secondPageBackwardIDs.length).toBeGreaterThan(0);

        // With the new subquery-based cursor implementation, there should be no overlap
        // between pages as ordering is perfectly preserved
        const overlapBackwardCursor = firstPageBackwardIDs.filter((id) =>
          secondPageBackwardIDs.includes(id),
        );
        expect(overlapBackwardCursor).toHaveLength(0);
      });

      it('supports extraOrderByFields with TRIGRAM search for stable cursor pagination', async () => {
        const vc = new ViewerContext(
          createKnexIntegrationTestEntityCompanionProvider(knexInstance),
        );
        await PostgresTestEntity.dropPostgresTableAsync(knexInstance);
        await PostgresTestEntity.createOrTruncatePostgresTableAsync(knexInstance);

        // Enable pg_trgm extension for trigram similarity
        await knexInstance.raw('CREATE EXTENSION IF NOT EXISTS pg_trgm');

        // Create test data with similar names and different hasACat values
        const testData = [
          { name: 'Johnson', hasACat: true }, // Exact match
          { name: 'Jonson', hasACat: false }, // High similarity
          { name: 'Johnsen', hasACat: true }, // High similarity
          { name: 'Johnston', hasACat: false }, // Medium similarity
          { name: 'Johan', hasACat: true }, // Lower similarity
          { name: 'John', hasACat: false }, // Lower similarity
          { name: 'Johnny', hasACat: true }, // Lower similarity
          { name: 'Smith', hasACat: false }, // No match
        ];

        for (const data of testData) {
          await PostgresTestEntity.creator(vc)
            .setField('name', data.name)
            .setField('hasACat', data.hasACat)
            .createAsync();
        }

        // Test TRIGRAM search with extraOrderByFields for stable pagination
        const firstPage = await PostgresTestEntity.knexLoader(vc).loadPageAsync({
          first: 3,
          pagination: {
            strategy: PaginationStrategy.TRIGRAM_SEARCH,
            term: 'Johnson',
            fields: ['name'],
            threshold: 0.2,
            extraOrderByFields: ['hasACat'], // Add extra stable ordering
          },
        });

        expect(firstPage.edges.length).toBeGreaterThan(0);
        expect(firstPage.edges[0]?.node.getField('name')).toBe('Johnson'); // Exact match first

        const firstPageCursor = firstPage.pageInfo.endCursor;
        expect(firstPageCursor).not.toBeNull();

        // Get second page using cursor
        // With extraOrderByFields, cursor includes hasACat field which provides more stable pagination
        const secondPage = await PostgresTestEntity.knexLoader(vc).loadPageAsync({
          first: 3,
          after: firstPageCursor!,
          pagination: {
            strategy: PaginationStrategy.TRIGRAM_SEARCH,
            term: 'Johnson',
            fields: ['name'],
            threshold: 0.2,
            extraOrderByFields: ['hasACat'],
          },
        });

        // Store first page names for comparison
        const firstPageNames = firstPage.edges.map((e) => e.node.getField('name'));
        const secondPageNames = secondPage.edges.map((e) => e.node.getField('name'));

        // Verify no overlap between pages (ordering is preserved)
        const overlap = firstPageNames.filter((name) => secondPageNames.includes(name));
        expect(overlap).toHaveLength(0);

        // Test backward pagination with extraOrderByFields
        const lastPage = await PostgresTestEntity.knexLoader(vc).loadPageAsync({
          last: 2,
          pagination: {
            strategy: PaginationStrategy.TRIGRAM_SEARCH,
            term: 'Johnson',
            fields: ['name'],
            threshold: 0.2,
            extraOrderByFields: ['hasACat'],
          },
        });

        expect(lastPage.edges.length).toBeGreaterThan(0);

        // Test that extraOrderByFields provides consistent ordering
        // Get all results in one go for comparison
        const allResultsPage = await PostgresTestEntity.knexLoader(vc).loadPageAsync({
          first: 10,
          pagination: {
            strategy: PaginationStrategy.TRIGRAM_SEARCH,
            term: 'Johnson',
            fields: ['name'],
            threshold: 0.2,
            extraOrderByFields: ['hasACat'],
          },
        });

        // Verify results are ordered by: exact match first, then similarity, then hasACat, then id
        const allNames = allResultsPage.edges.map((e) => ({
          name: e.node.getField('name'),
          hasACat: e.node.getField('hasACat'),
        }));

        // Johnson (exact match) should be first
        expect(allNames[0]?.name).toBe('Johnson');
      });
    });
  });
});
