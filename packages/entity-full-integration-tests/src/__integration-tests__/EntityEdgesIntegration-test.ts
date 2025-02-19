import { ViewerContext } from '@expo/entity';
import { GenericRedisCacheContext } from '@expo/entity-cache-adapter-redis';
import Redis from 'ioredis';
import { knex, Knex } from 'knex';
import nullthrows from 'nullthrows';
import { URL } from 'url';

import ChildEntity from './entities/ChildEntity';
import ParentEntity from './entities/ParentEntity';
import { createFullIntegrationTestEntityCompanionProvider } from '../testfixtures/createFullIntegrationTestEntityCompanionProvider';

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

  describe('EntityEdgeDeletionBehavior.INVALIDATE_CACHE', () => {
    it('invalidates the cache', async () => {
      const viewerContext = new ViewerContext(
        createFullIntegrationTestEntityCompanionProvider(knexInstance, genericRedisCacheContext),
      );

      const parent = await ParentEntity.creator(viewerContext).enforcing().createAsync();
      const child = await ChildEntity.creator(viewerContext)
        .enforcing()
        .setField('parent_id', parent.getID())
        .createAsync();

      await expect(
        ParentEntity.loader(viewerContext).enforcing().loadByIDNullableAsync(parent.getID()),
      ).resolves.not.toBeNull();
      await expect(
        ChildEntity.loader(viewerContext)
          .enforcing()
          .loadByFieldEqualingAsync('parent_id', parent.getID()),
      ).resolves.not.toBeNull();

      await ParentEntity.deleter(parent).enforcing().deleteAsync();

      await expect(
        ParentEntity.loader(viewerContext).enforcing().loadByIDNullableAsync(parent.getID()),
      ).resolves.toBeNull();

      await expect(
        ChildEntity.loader(viewerContext).enforcing().loadByIDNullableAsync(child.getID()),
      ).resolves.toBeNull();
    });
  });
});
