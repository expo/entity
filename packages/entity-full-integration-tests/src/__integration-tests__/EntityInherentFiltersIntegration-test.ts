import { ViewerContext } from '@expo/entity';
import type { GenericRedisCacheContext } from '@expo/entity-cache-adapter-redis';
import { RedisCacheInvalidationStrategy } from '@expo/entity-cache-adapter-redis';
import nullthrows from '@expo/nullthrows';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import { Redis } from 'ioredis';
import type { Knex } from 'knex';
import knex from 'knex';
import { URL } from 'url';

import { createFullIntegrationTestEntityCompanionProvider } from '../__testfixtures__/createFullIntegrationTestEntityCompanionProvider.ts';
import PolyParentEntity from './entities/PolyParentEntity.ts';
import ScopeAChildEntity from './entities/ScopeAChildEntity.ts';
import ScopeBChildEntity from './entities/ScopeBChildEntity.ts';

async function createPostgresTablesAsync(knex: Knex): Promise<void> {
  await knex.schema.createTable('poly_parents', (table) => {
    table.uuid('id').defaultTo(knex.raw('gen_random_uuid()')).primary();
  });
  await knex.schema.createTable('poly_children', (table) => {
    table.uuid('id').defaultTo(knex.raw('gen_random_uuid()')).primary();
    table.uuid('parent_id').references('id').inTable('poly_parents');
    table.string('scope').notNullable();
  });
}

async function truncatePostgresTablesAsync(knex: Knex): Promise<void> {
  await knex.raw('TRUNCATE TABLE poly_children, poly_parents CASCADE');
}

async function dropPostgresTablesAsync(knex: Knex): Promise<void> {
  if (await knex.schema.hasTable('poly_children')) {
    await knex.schema.dropTable('poly_children');
  }
  if (await knex.schema.hasTable('poly_parents')) {
    await knex.schema.dropTable('poly_parents');
  }
}

describe('EntityConfiguration.inherentFilters (Postgres + Redis)', () => {
  let knexInstance: Knex;
  const redisClient = new Redis(new URL(process.env['REDIS_URL']!).toString());
  let genericRedisCacheContext: GenericRedisCacheContext;

  beforeAll(async () => {
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
      ttlSecondsPositive: 86400,
      ttlSecondsNegative: 600,
      invalidationConfig: {
        invalidationStrategy: RedisCacheInvalidationStrategy.CURRENT_CACHE_KEY_VERSION,
      },
    };
    await createPostgresTablesAsync(knexInstance);
  });

  beforeEach(async () => {
    await truncatePostgresTablesAsync(knexInstance);
    await redisClient.flushdb();
  });

  afterAll(async () => {
    await dropPostgresTablesAsync(knexInstance);
    await knexInstance.destroy();
    redisClient.disconnect();
  });

  it('loads only rows that match the inherent filter', async () => {
    const viewerContext = new ViewerContext(
      createFullIntegrationTestEntityCompanionProvider(knexInstance, genericRedisCacheContext),
    );

    const parent = await PolyParentEntity.creator(viewerContext).createAsync();
    const scopeARow = await ScopeAChildEntity.creator(viewerContext)
      .setField('parent_id', parent.getID())
      .setField('scope', 'A')
      .createAsync();
    const scopeBRow = await ScopeBChildEntity.creator(viewerContext)
      .setField('parent_id', parent.getID())
      .setField('scope', 'B')
      .createAsync();

    await expect(
      ScopeAChildEntity.loader(viewerContext).loadByIDNullableAsync(scopeARow.getID()),
    ).resolves.not.toBeNull();
    await expect(
      ScopeBChildEntity.loader(viewerContext).loadByIDNullableAsync(scopeBRow.getID()),
    ).resolves.not.toBeNull();

    // A wrong-scope id load returns null, not a constructor invariant throw — the SQL
    // WHERE clause AND's the inherent filter, so the row is invisible to the wrong class.
    await expect(
      ScopeAChildEntity.loader(viewerContext).loadByIDNullableAsync(scopeBRow.getID()),
    ).resolves.toBeNull();
    await expect(
      ScopeBChildEntity.loader(viewerContext).loadByIDNullableAsync(scopeARow.getID()),
    ).resolves.toBeNull();
  });

  it("cascade-delete via inboundEdges only deletes rows matching each class's inherent filter", async () => {
    const viewerContext = new ViewerContext(
      createFullIntegrationTestEntityCompanionProvider(knexInstance, genericRedisCacheContext),
    );

    const parent = await PolyParentEntity.creator(viewerContext).createAsync();
    const scopeARow = await ScopeAChildEntity.creator(viewerContext)
      .setField('parent_id', parent.getID())
      .setField('scope', 'A')
      .createAsync();
    const scopeBRow = await ScopeBChildEntity.creator(viewerContext)
      .setField('parent_id', parent.getID())
      .setField('scope', 'B')
      .createAsync();

    await PolyParentEntity.deleter(parent).deleteAsync();

    await expect(
      ScopeAChildEntity.loader(viewerContext).loadByIDNullableAsync(scopeARow.getID()),
    ).resolves.toBeNull();
    await expect(
      ScopeBChildEntity.loader(viewerContext).loadByIDNullableAsync(scopeBRow.getID()),
    ).resolves.toBeNull();
  });
});
