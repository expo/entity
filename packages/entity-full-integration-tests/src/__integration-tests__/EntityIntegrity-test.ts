import {
  EntityPrivacyPolicy,
  ViewerContext,
  AlwaysAllowPrivacyPolicyRule,
  Entity,
  EntityCompanionDefinition,
  EntityConfiguration,
  UUIDField,
} from '@expo/entity';
import {
  GenericRedisCacheContext,
  RedisCacheInvalidationStrategy,
} from '@expo/entity-cache-adapter-redis';
import Redis from 'ioredis';
import { knex, Knex } from 'knex';
import nullthrows from 'nullthrows';
import { URL } from 'url';
import { v4 as uuidv4 } from 'uuid';

import { createFullIntegrationTestEntityCompanionProvider } from '../testfixtures/createFullIntegrationTestEntityCompanionProvider';

interface TestFields {
  id: string;
}

class TestEntityPrivacyPolicy extends EntityPrivacyPolicy<
  TestFields,
  string,
  ViewerContext,
  TestEntity
> {
  protected override readonly readRules = [
    new AlwaysAllowPrivacyPolicyRule<TestFields, string, ViewerContext, TestEntity>(),
  ];
  protected override readonly createRules = [
    new AlwaysAllowPrivacyPolicyRule<TestFields, string, ViewerContext, TestEntity>(),
  ];
  protected override readonly updateRules = [
    new AlwaysAllowPrivacyPolicyRule<TestFields, string, ViewerContext, TestEntity>(),
  ];
  protected override readonly deleteRules = [
    new AlwaysAllowPrivacyPolicyRule<TestFields, string, ViewerContext, TestEntity>(),
  ];
}

class TestEntity extends Entity<TestFields, string, ViewerContext> {
  static defineCompanionDefinition(): EntityCompanionDefinition<
    TestFields,
    string,
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

const testEntityConfiguration = new EntityConfiguration<TestFields>({
  idField: 'id',
  tableName: 'testentities',
  schema: {
    id: new UUIDField({
      columnName: 'id',
      cache: true,
    }),
  },
  databaseAdapterFlavor: 'postgres',
  cacheAdapterFlavor: 'redis',
});

async function createOrTruncatePostgresTablesAsync(knex: Knex): Promise<void> {
  await knex.schema.createTable('testentities', (table) => {
    table.uuid('id').defaultTo(knex.raw('gen_random_uuid()')).primary();
  });
  await knex.into('testentities').truncate();
}

async function dropPostgresTableAsync(knex: Knex): Promise<void> {
  if (await knex.schema.hasTable('testentities')) {
    await knex.schema.dropTable('testentities');
  }
}

describe('Entity integrity', () => {
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
      invalidationStrategy: RedisCacheInvalidationStrategy.CURRENT_CACHE_KEY_VERSION,
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

  test('cannot update ID', async () => {
    const viewerContext = new ViewerContext(
      createFullIntegrationTestEntityCompanionProvider(knexInstance, genericRedisCacheContext),
    );

    const entity1 = await TestEntity.creator(viewerContext).createAsync();

    await expect(
      TestEntity.updater(entity1).setField('id', uuidv4()).updateAsync(),
    ).rejects.toThrow('id field updates not supported: (entityClass = TestEntity)');

    // ensure cache consistency
    const viewerContextLast = new ViewerContext(
      createFullIntegrationTestEntityCompanionProvider(knexInstance, genericRedisCacheContext),
    );

    const loadedById = await TestEntity.loader(viewerContextLast).loadByIDAsync(entity1.getID());

    expect(loadedById.getID()).toEqual(entity1.getID());
  });
});
