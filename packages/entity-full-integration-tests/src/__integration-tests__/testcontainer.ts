import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { RedisContainer, type StartedRedisContainer } from '@testcontainers/redis';
import { Redis } from 'ioredis';
import { knex, type Knex } from 'knex';

export type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
export type { StartedRedisContainer } from '@testcontainers/redis';
export type { Redis } from 'ioredis';
export type { Knex } from 'knex';

export async function startServicesAsync(): Promise<{
  knexInstance: Knex<any, unknown[]>;
  redisClient: Redis;
  postgresContainer: StartedPostgreSqlContainer;
  redisContainer: StartedRedisContainer;
}> {
  const postgresContainer = await new PostgreSqlContainer('postgres:14').start();
  const knexInstance = knex({
    client: 'pg',
    connection: {
      connectionString: postgresContainer.getConnectionUri(),
    },
  });
  const redisContainer = await new RedisContainer('redis').start();
  const redisClient = new Redis(redisContainer.getConnectionUrl());
  return { knexInstance, redisClient, postgresContainer, redisContainer };
}
