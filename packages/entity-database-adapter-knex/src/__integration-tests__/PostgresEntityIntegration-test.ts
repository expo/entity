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
});
