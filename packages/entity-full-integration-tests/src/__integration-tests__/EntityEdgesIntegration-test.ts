import { ViewerContext } from '@expo/entity';
import {
  GenericRedisCacheContext,
  RedisCacheInvalidationStrategy,
} from '@expo/entity-cache-adapter-redis';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';

import { createFullIntegrationTestEntityCompanionProvider } from '../__testfixtures__/createFullIntegrationTestEntityCompanionProvider';
import ChildEntity from './entities/ChildEntity';
import ParentEntity from './entities/ParentEntity';
import {
  type Knex,
  type Redis,
  type StartedPostgreSqlContainer,
  type StartedRedisContainer,
  startServicesAsync,
} from './testcontainer';

async function createOrTruncatePostgresTablesAsync(knex: Knex): Promise<void> {
  await knex.schema.createTable('parents', (table) => {
    table.uuid('id').defaultTo(knex.raw('gen_random_uuid()')).primary();
  });
  await knex.into('parents').truncate();

  await knex.schema.createTable('children', (table) => {
    table.uuid('id').defaultTo(knex.raw('gen_random_uuid()')).primary();
    table.uuid('parent_id').references('id').inTable('parents').onDelete('cascade').unique();
  });
  await knex.into('children').truncate();
}

async function dropPostgresTableAsync(knex: Knex): Promise<void> {
  if (await knex.schema.hasTable('children')) {
    await knex.schema.dropTable('children');
  }
  if (await knex.schema.hasTable('parents')) {
    await knex.schema.dropTable('parents');
  }
}

describe('EntityMutator.processEntityDeletionForInboundEdgesAsync', () => {
  let postgresContainer: StartedPostgreSqlContainer;
  let redisContainer: StartedRedisContainer;
  let knexInstance: Knex;
  let redisClient: Redis;
  let genericRedisCacheContext: GenericRedisCacheContext;

  beforeAll(async () => {
    ({ knexInstance, redisClient, postgresContainer, redisContainer } = await startServicesAsync());
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
    await postgresContainer.stop();
    await redisContainer.stop();
  });

  describe('EntityEdgeDeletionBehavior.INVALIDATE_CACHE', () => {
    it('invalidates the cache', async () => {
      const viewerContext = new ViewerContext(
        createFullIntegrationTestEntityCompanionProvider(knexInstance, genericRedisCacheContext),
      );

      const parent = await ParentEntity.creator(viewerContext).createAsync();
      const child = await ChildEntity.creator(viewerContext)
        .setField('parent_id', parent.getID())
        .createAsync();

      await expect(
        ParentEntity.loader(viewerContext).loadByIDNullableAsync(parent.getID()),
      ).resolves.not.toBeNull();
      await expect(
        ChildEntity.loader(viewerContext).loadByFieldEqualingAsync('parent_id', parent.getID()),
      ).resolves.not.toBeNull();

      await ParentEntity.deleter(parent).deleteAsync();

      await expect(
        ParentEntity.loader(viewerContext).loadByIDNullableAsync(parent.getID()),
      ).resolves.toBeNull();

      await expect(
        ChildEntity.loader(viewerContext).loadByIDNullableAsync(child.getID()),
      ).resolves.toBeNull();
    });
  });
});
