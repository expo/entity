import { GenericRedisCacheContext } from '@expo/entity-cache-adapter-redis';
import Redis from 'ioredis';
import { knex, Knex } from 'knex';
import nullthrows from 'nullthrows';
import { URL } from 'url';

import ChildEntity from './entities/ChildEntity';
import ParentEntity from './entities/ParentEntity';
import TestViewerContext from './entities/TestViewerContext';
import { createFullIntegrationTestEntityCompanionProvider } from '../testfixtures/createFullIntegrationTestEntityCompanionProvider';

async function createOrTruncatePostgresTables(knex: Knex): Promise<void> {
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

async function dropPostgresTable(knex: Knex): Promise<void> {
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
          part.replace('\\', '\\\\').replace(delimiter, `\\${delimiter}`)
        );
        return escapedParts.join(delimiter);
      },
      cacheKeyPrefix: 'test-',
      ttlSecondsPositive: 86400, // 1 day
      ttlSecondsNegative: 600, // 10 minutes
    };
  });

  beforeEach(async () => {
    await createOrTruncatePostgresTables(knexInstance);
    await redisClient.flushdb();
  });

  afterAll(async () => {
    await dropPostgresTable(knexInstance);
    await knexInstance.destroy();
    redisClient.disconnect();
  });

  describe('EntityEdgeDeletionBehavior.INVALIDATE_CACHE', () => {
    it('invalidates the cache', async () => {
      const viewerContext = new TestViewerContext(
        createFullIntegrationTestEntityCompanionProvider(knexInstance, genericRedisCacheContext)
      );

      const parent = await ParentEntity.creator(
        viewerContext,
        viewerContext.getQueryContext()
      ).enforceCreateAsync();
      const child = await ChildEntity.creator(viewerContext, viewerContext.getQueryContext())
        .setField('parent_id', parent.getID())
        .enforceCreateAsync();

      await expect(
        ParentEntity.loader(viewerContext, viewerContext.getQueryContext())
          .enforcing()
          .loadByIDNullableAsync(parent.getID())
      ).resolves.not.toBeNull();
      await expect(
        ChildEntity.loader(viewerContext, viewerContext.getQueryContext())
          .enforcing()
          .loadByFieldEqualingAsync('parent_id', parent.getID())
      ).resolves.not.toBeNull();

      await ParentEntity.enforceDeleteAsync(parent, viewerContext.getQueryContext());

      await expect(
        ParentEntity.loader(viewerContext, viewerContext.getQueryContext())
          .enforcing()
          .loadByIDNullableAsync(parent.getID())
      ).resolves.toBeNull();

      await expect(
        ChildEntity.loader(viewerContext, viewerContext.getQueryContext())
          .enforcing()
          .loadByIDNullableAsync(child.getID())
      ).resolves.toBeNull();
    });
  });
});
