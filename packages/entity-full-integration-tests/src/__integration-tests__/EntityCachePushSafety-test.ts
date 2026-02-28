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
import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import Redis from 'ioredis';
import { knex, Knex } from 'knex';
import nullthrows from 'nullthrows';
import { URL } from 'url';

import { createFullIntegrationTestEntityCompanionProvider } from '../__testfixtures__/createFullIntegrationTestEntityCompanionProvider';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function createTestEntityDefinitonWithCacheKeyVersion(cacheKeyVersion: number) {
  interface TestFields {
    id: string;
    string_field: string;
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
    cacheKeyVersion,
    schema: {
      id: new UUIDField({
        columnName: 'id',
        cache: true,
      }),
      string_field: new StringField({
        columnName: 'string_field',
      }),
    },
    databaseAdapterFlavor: 'postgres',
    cacheAdapterFlavor: 'redis',
  });

  return { TestEntity };
}

async function createOrTruncatePostgresTablesAsync(knex: Knex): Promise<void> {
  await knex.schema.createTable('testentities', (table) => {
    table.uuid('id').defaultTo(knex.raw('gen_random_uuid()')).primary();
    table.string('string_field').notNullable();
  });
  await knex.into('testentities').truncate();
}

async function dropPostgresTableAsync(knex: Knex): Promise<void> {
  if (await knex.schema.hasTable('testentities')) {
    await knex.schema.dropTable('testentities');
  }
}

describe('Lack of entity cache push safety with RedisCacheInvalidationStrategy.CURRENT_CACHE_KEY_VERSION', () => {
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
          part.replaceAll('\\', '\\\\').replaceAll(delimiter, `\\${delimiter}`),
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

  it('does not cross-invalidates cache and thus has cache inconsistency', async () => {
    const preDeployCacheKeyVersion = 1;
    const newCacheKeyVersion = 2;

    const { TestEntity: TestEntityPreDeploy } =
      createTestEntityDefinitonWithCacheKeyVersion(preDeployCacheKeyVersion);
    const { TestEntity: TestEntityNew } =
      createTestEntityDefinitonWithCacheKeyVersion(newCacheKeyVersion);

    // Simulate a deploy of the app with a new cache key version. Old code version is still running on some machines and new code version is running on others.
    // This test is designed to simulate the worst case cache poisoning scenario during cache version changes.

    // request 1 creates and loads an entity on the old code version, caching it in cache key version 1
    const viewerContextRequest1 = new ViewerContext(
      createFullIntegrationTestEntityCompanionProvider(knexInstance, genericRedisCacheContext),
    );
    const entityReq1 = await TestEntityPreDeploy.creator(viewerContextRequest1)
      .setField('string_field', 'req1')
      .createAsync();
    const entityId = entityReq1.getID();
    const entityReq1Loaded =
      await TestEntityPreDeploy.loader(viewerContextRequest1).loadByIDAsync(entityId);
    expect(entityReq1Loaded).not.toBeNull();

    // request 2 loads the entity in the new code version (caching it in cache key version 2), updates it (invalidating in 2), and loads it again (caching it in cache key version 2)
    const viewerContextRequest2 = new ViewerContext(
      createFullIntegrationTestEntityCompanionProvider(knexInstance, genericRedisCacheContext),
    );
    const entityReq2 = await TestEntityNew.loader(viewerContextRequest2).loadByIDAsync(entityId);
    expect(entityReq2.getField('string_field')).toBe('req1');
    await TestEntityNew.updater(entityReq2).setField('string_field', 'req2').updateAsync();
    const entityReq2UpdatedLoaded =
      await TestEntityNew.loader(viewerContextRequest2).loadByIDAsync(entityId);
    expect(entityReq2UpdatedLoaded).not.toBeNull();

    // request 3 loads the entity in the old code version (loading it from cache key version 1)
    const viewerContextRequest3 = new ViewerContext(
      createFullIntegrationTestEntityCompanionProvider(knexInstance, genericRedisCacheContext),
    );
    const entityReq3 =
      await TestEntityPreDeploy.loader(viewerContextRequest3).loadByIDAsync(entityId);

    // in a consistent system this would be req2. This fails due to lack of cross-invalidation since the cache for pre-deploy is stale and wasn't invalidated.
    expect(entityReq3.getField('string_field')).toBe('req1');
  });
});

describe('Entity cache push safety with RedisCacheInvalidationStrategy.SURROUNDING_CACHE_KEY_VERSIONS', () => {
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
          part.replaceAll('\\', '\\\\').replaceAll(delimiter, `\\${delimiter}`),
        );
        return escapedParts.join(delimiter);
      },
      cacheKeyPrefix: 'test-',
      ttlSecondsPositive: 86400, // 1 day
      ttlSecondsNegative: 600, // 10 minutes
      invalidationConfig: {
        invalidationStrategy: RedisCacheInvalidationStrategy.SURROUNDING_CACHE_KEY_VERSIONS,
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

  it('correctly cross-invalidates cache with new and old code (cache key) versions', async () => {
    const preDeployCacheKeyVersion = 1;
    const newCacheKeyVersion = 2;

    const { TestEntity: TestEntityPreDeploy } =
      createTestEntityDefinitonWithCacheKeyVersion(preDeployCacheKeyVersion);
    const { TestEntity: TestEntityNew } =
      createTestEntityDefinitonWithCacheKeyVersion(newCacheKeyVersion);

    // Simulate a deploy of the app with a new cache key version. Old code version is still running on some machines and new code version is running on others.
    // This test is designed to simulate the worst case cache poisoning scenario during cache version changes.

    // request 1 creates and loads an entity on the old code version, caching it in cache key version 1
    const viewerContextRequest1 = new ViewerContext(
      createFullIntegrationTestEntityCompanionProvider(knexInstance, genericRedisCacheContext),
    );
    const entityReq1 = await TestEntityPreDeploy.creator(viewerContextRequest1)
      .setField('string_field', 'req1')
      .createAsync();
    const entityId = entityReq1.getID();
    const entityReq1Loaded =
      await TestEntityPreDeploy.loader(viewerContextRequest1).loadByIDAsync(entityId);
    expect(entityReq1Loaded).not.toBeNull();

    // request 2 loads the entity in the new code version (caching it in cache key version 2), updates it (invalidating in both 1 and 2), and loads it again (caching it in cache key version 2)
    const viewerContextRequest2 = new ViewerContext(
      createFullIntegrationTestEntityCompanionProvider(knexInstance, genericRedisCacheContext),
    );
    const entityReq2 = await TestEntityNew.loader(viewerContextRequest2).loadByIDAsync(entityId);
    expect(entityReq2.getField('string_field')).toBe('req1');
    await TestEntityNew.updater(entityReq2).setField('string_field', 'req2').updateAsync();
    const entityReq2UpdatedLoaded =
      await TestEntityNew.loader(viewerContextRequest2).loadByIDAsync(entityId);
    expect(entityReq2UpdatedLoaded).not.toBeNull();

    // request 3 loads the entity in the old code version (caching it in cache key version 1), updates it (invalidating in both 1 and 2), and loads it again (caching it in cache key version 1)
    const viewerContextRequest3 = new ViewerContext(
      createFullIntegrationTestEntityCompanionProvider(knexInstance, genericRedisCacheContext),
    );
    const entityReq3 =
      await TestEntityPreDeploy.loader(viewerContextRequest3).loadByIDAsync(entityId);
    expect(entityReq3.getField('string_field')).toBe('req2'); // this would fail if cross-invalidation were not implemented since the cache for pre-deploy would be stale
    await TestEntityPreDeploy.updater(entityReq3).setField('string_field', 'req3').updateAsync();
    const entityReq3UpdatedLoaded =
      await TestEntityPreDeploy.loader(viewerContextRequest3).loadByIDAsync(entityId);
    expect(entityReq3UpdatedLoaded).not.toBeNull();

    // request 4 loads the entity in the new code version
    const viewerContextRequest4 = new ViewerContext(
      createFullIntegrationTestEntityCompanionProvider(knexInstance, genericRedisCacheContext),
    );
    const entityReq4 = await TestEntityNew.loader(viewerContextRequest4).loadByIDAsync(entityId);
    expect(entityReq4.getField('string_field')).toBe('req3');
    expect(entityReq4).not.toBeNull();
  });
});
