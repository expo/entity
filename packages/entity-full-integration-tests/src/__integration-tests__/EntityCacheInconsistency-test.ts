import {
  EntityPrivacyPolicy,
  ViewerContext,
  AlwaysAllowPrivacyPolicyRule,
  Entity,
  EntityCompanionDefinition,
  EntityConfiguration,
  StringField,
  UUIDField,
} from '@expo/entity';
import {
  GenericRedisCacheContext,
  RedisCacheInvalidationStrategy,
} from '@expo/entity-cache-adapter-redis';
import { afterAll, beforeAll, beforeEach, describe, expect, test } from '@jest/globals';
import Redis from 'ioredis';
import { knex, Knex } from 'knex';
import nullthrows from 'nullthrows';
import { URL } from 'url';

import { createFullIntegrationTestEntityCompanionProvider } from '../__testfixtures__/createFullIntegrationTestEntityCompanionProvider';

interface TestFields {
  id: string;
  other_string: string;
  third_string: string;
}

class TestEntityPrivacyPolicy extends EntityPrivacyPolicy<
  TestFields,
  'id',
  ViewerContext,
  TestEntity
> {
  protected override readonly readRules = [
    new AlwaysAllowPrivacyPolicyRule<TestFields, 'id', ViewerContext, TestEntity>(),
  ];
  protected override readonly createRules = [
    new AlwaysAllowPrivacyPolicyRule<TestFields, 'id', ViewerContext, TestEntity>(),
  ];
  protected override readonly updateRules = [
    new AlwaysAllowPrivacyPolicyRule<TestFields, 'id', ViewerContext, TestEntity>(),
  ];
  protected override readonly deleteRules = [
    new AlwaysAllowPrivacyPolicyRule<TestFields, 'id', ViewerContext, TestEntity>(),
  ];
}

class TestEntity extends Entity<TestFields, 'id', ViewerContext> {
  static defineCompanionDefinition(): EntityCompanionDefinition<
    TestFields,
    'id',
    ViewerContext,
    TestEntity,
    TestEntityPrivacyPolicy
  > {
    return {
      entityClass: TestEntity,
      entityConfiguration: testEntityConfiguration,
      privacyPolicyClass: TestEntityPrivacyPolicy,
    };
  }
}

const testEntityConfiguration = new EntityConfiguration<TestFields, 'id'>({
  idField: 'id',
  tableName: 'testentities',
  schema: {
    id: new UUIDField({
      columnName: 'id',
      cache: true,
    }),
    other_string: new StringField({
      columnName: 'other_string',
      cache: true,
    }),
    third_string: new StringField({
      columnName: 'third_string',
    }),
  },
  databaseAdapterFlavor: 'postgres',
  cacheAdapterFlavor: 'redis',
});

async function createOrTruncatePostgresTablesAsync(knex: Knex): Promise<void> {
  await knex.schema.createTable('testentities', (table) => {
    table.uuid('id').defaultTo(knex.raw('gen_random_uuid()')).primary();
    table.string('other_string').notNullable().unique();
    table.string('third_string').notNullable();
  });
  await knex.into('testentities').truncate();
}

async function dropPostgresTableAsync(knex: Knex): Promise<void> {
  if (await knex.schema.hasTable('testentities')) {
    await knex.schema.dropTable('testentities');
  }
}

describe('Entity cache inconsistency', () => {
  let knexInstance: Knex;
  const redisClient = new Redis(new URL(process.env['REDIS_URL']!).toString());
  let genericRedisCacheContext: GenericRedisCacheContext;

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
    genericRedisCacheContext = {
      redisClient,
      makeKeyFn(...parts: string[]): string {
        const delimiter = ':';
        const escapedParts = parts.map((part) =>
          part.replace('\\', '\\\\').replace(delimiter, `\\${delimiter}`),
        );
        return escapedParts.join(delimiter);
      },
      cacheKeyPrefix: 'test-',
      ttlSecondsPositive: 86400, // 1 day
      ttlSecondsNegative: 600, // 10 minutes
      invalidationConfig: {
        invalidationStrategy: RedisCacheInvalidationStrategy.CURRENT_CACHE_KEY_VERSION,
      },
    };
  });

  beforeEach(async () => {
    await createOrTruncatePostgresTablesAsync(knexInstance);
    await redisClient.flushdb();
  });

  afterAll(async () => {
    await dropPostgresTableAsync(knexInstance);
    await knexInstance.destroy();
    redisClient.disconnect();
  });

  test('lots of updates in long-ish running transactions', async () => {
    const viewerContext = new ViewerContext(
      createFullIntegrationTestEntityCompanionProvider(knexInstance, genericRedisCacheContext),
    );

    const entity1 = await TestEntity.creator(viewerContext)
      .setField('other_string', 'hello')
      .setField('third_string', 'initial')
      .createAsync();

    // put entities in cache and dataloader
    await TestEntity.loader(viewerContext).loadByIDAsync(entity1.getID());
    await TestEntity.loader(viewerContext).loadByFieldEqualingAsync('other_string', 'hello');

    let openBarrier1: () => void;
    const barrier1 = new Promise<void>((resolve) => {
      openBarrier1 = resolve;
    });

    let openBarrier2: () => void;
    const barrier2 = new Promise<void>((resolve) => {
      openBarrier2 = resolve;
    });

    await Promise.all([
      // do a load after the transaction below updates the entity but before transaction commits to ensure
      // that the cache is cleared after the transaction commits rather than in the middle where the changes
      // may not be visible by other requests (ViewerContexts) which would cache the incorrect
      // value during the read-through cache.
      (async () => {
        await barrier1;

        const viewerContextInternal = new ViewerContext(
          createFullIntegrationTestEntityCompanionProvider(knexInstance, genericRedisCacheContext),
        );
        await TestEntity.loader(viewerContextInternal).loadByIDAsync(entity1.getID());

        openBarrier2!();
      })(),
      viewerContext.runInTransactionForDatabaseAdaptorFlavorAsync(
        'postgres',
        async (queryContext) => {
          await TestEntity.updater(entity1, queryContext)
            .setField('third_string', 'updated')
            .updateAsync();

          openBarrier1();

          // wait for to ensure the transaction isn't committed until after load above occurs
          await barrier2;
        },
      ),
    ]);

    // ensure cache consistency
    const viewerContextLast = new ViewerContext(
      createFullIntegrationTestEntityCompanionProvider(knexInstance, genericRedisCacheContext),
    );

    const loadedById = await TestEntity.loader(viewerContextLast).loadByIDAsync(entity1.getID());
    const loadedByField = await TestEntity.loader(viewerContextLast).loadByFieldEqualingAsync(
      'other_string',
      'hello',
    );

    expect(loadedById.getField('third_string')).toEqual('updated');
    expect(loadedByField!.getField('third_string')).toEqual('updated');
  });
});
