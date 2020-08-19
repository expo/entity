import {
  EntityPrivacyPolicy,
  ViewerContext,
  AlwaysAllowPrivacyPolicyRule,
  Entity,
  EntityCompanionDefinition,
  EntityConfiguration,
  DatabaseAdapterFlavor,
  CacheAdapterFlavor,
  UUIDField,
} from '@expo/entity';
import { RedisCacheAdapterContext } from '@expo/entity-cache-adapter-redis';
import Redis from 'ioredis';
import Knex from 'knex';
import { URL } from 'url';

import { createFullIntegrationTestEntityCompanionProvider } from '../testfixtures/createFullIntegrationTestEntityCompanionProvider';

interface TestFields {
  id: string;
  other_string: string;
  third_string: string;
}

class TestEntityPrivacyPolicy extends EntityPrivacyPolicy<
  TestFields,
  string,
  ViewerContext,
  TestEntity
> {
  protected readonly readRules = [new AlwaysAllowPrivacyPolicyRule()];
  protected readonly createRules = [new AlwaysAllowPrivacyPolicyRule()];
  protected readonly updateRules = [new AlwaysAllowPrivacyPolicyRule()];
  protected readonly deleteRules = [new AlwaysAllowPrivacyPolicyRule()];
}

class TestEntity extends Entity<TestFields, string, ViewerContext> {
  static getCompanionDefinition(): EntityCompanionDefinition<
    TestFields,
    string,
    ViewerContext,
    TestEntity,
    TestEntityPrivacyPolicy
  > {
    return testEntityCompanion;
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
    other_string: new UUIDField({
      columnName: 'other_string',
      cache: true,
    }),
    third_string: new UUIDField({
      columnName: 'third_string',
    }),
  },
  databaseAdapterFlavor: DatabaseAdapterFlavor.POSTGRES,
  cacheAdapterFlavor: CacheAdapterFlavor.REDIS,
});

const testEntityCompanion = new EntityCompanionDefinition({
  entityClass: TestEntity,
  entityConfiguration: testEntityConfiguration,
  privacyPolicyClass: TestEntityPrivacyPolicy,
});

async function createOrTruncatePostgresTables(knex: Knex): Promise<void> {
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"'); // for uuid_generate_v4()

  await knex.schema.createTable('testentities', (table) => {
    table.uuid('id').defaultTo(knex.raw('uuid_generate_v4()')).primary();
    table.string('other_string').notNullable();
    table.string('third_string').notNullable();
  });
  await knex.into('testentities').truncate();
}

async function dropPostgresTable(knex: Knex): Promise<void> {
  if (await knex.schema.hasTable('children')) {
    await knex.schema.dropTable('children');
  }
  if (await knex.schema.hasTable('parents')) {
    await knex.schema.dropTable('parents');
  }
}

describe('Entity cache inconsistency', () => {
  let knexInstance: Knex;
  let redisCacheAdapterContext: RedisCacheAdapterContext;

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
    redisCacheAdapterContext = {
      redisClient: new Redis(new URL(process.env.REDIS_URL!).toString()),
      makeKeyFn(...parts: string[]): string {
        const delimiter = ':';
        const escapedParts = parts.map((part) =>
          part.replace('\\', '\\\\').replace(delimiter, `\\${delimiter}`)
        );
        return escapedParts.join(delimiter);
      },
      cacheKeyPrefix: 'test-',
      cacheKeyVersion: 1,
      ttlSecondsPositive: 86400, // 1 day
      ttlSecondsNegative: 600, // 10 minutes
    };
  });

  beforeEach(async () => {
    await createOrTruncatePostgresTables(knexInstance);
    await redisCacheAdapterContext.redisClient.flushdb();
  });

  afterAll(async () => {
    await dropPostgresTable(knexInstance);
    knexInstance.destroy();
    redisCacheAdapterContext.redisClient.disconnect();
  });

  test('lots of updates in long-ish running transactions', async () => {
    const viewerContext = new ViewerContext(
      createFullIntegrationTestEntityCompanionProvider(knexInstance, redisCacheAdapterContext)
    );

    const entity1 = await TestEntity.creator(viewerContext)
      .setField('other_string', 'hello')
      .setField('third_string', 'wat')
      .enforceCreateAsync();

    // put entities in cache and dataloader
    await TestEntity.loader(viewerContext).enforcing().loadByIDAsync(entity1.getID());
    await TestEntity.loader(viewerContext)
      .enforcing()
      .loadByFieldEqualingAsync('other_string', 'hello');

    await Promise.all([
      // do a load after the transaction below updates the entity but before transaction commits to ensure
      // that the cache is cleared after the transaction commits rather than in the middle where the changes
      // may not be visible by other requests (ViewerContexts) which would cache the incorrect
      // value during the read-through cache.
      (async () => {
        await new Promise((r) => setTimeout(r, 100));
        const viewerContextInternal = new ViewerContext(
          createFullIntegrationTestEntityCompanionProvider(knexInstance, redisCacheAdapterContext)
        );
        await TestEntity.loader(viewerContextInternal).enforcing().loadByIDAsync(entity1.getID());
      })(),
      TestEntity.runInTransactionAsync(viewerContext, async (queryContext) => {
        await TestEntity.updater(entity1, queryContext)
          .setField('third_string', 'huh')
          .enforceUpdateAsync();

        // wait for 250 ms to ensure the transaction isn't committed until after load above occurs
        await new Promise((r) => setTimeout(r, 250));
      }),
    ]);

    // ensure cache consistency
    const viewerContextLast = new ViewerContext(
      createFullIntegrationTestEntityCompanionProvider(knexInstance, redisCacheAdapterContext)
    );

    const loadedById = await TestEntity.loader(viewerContextLast)
      .enforcing()
      .loadByIDAsync(entity1.getID());
    const loadedByField = await TestEntity.loader(viewerContextLast)
      .enforcing()
      .loadByFieldEqualingAsync('other_string', 'hello');

    expect(loadedById.getField('third_string')).toEqual('huh');
    expect(loadedByField!.getField('third_string')).toEqual('huh');
  });
});
