import { RedisContainer, type StartedRedisContainer } from '@testcontainers/redis';
import { Redis } from 'ioredis';

export type { StartedRedisContainer } from '@testcontainers/redis';
export type { Redis } from 'ioredis';

export async function startRedisAsync(): Promise<{
  redisClient: Redis;
  container: StartedRedisContainer;
}> {
  const container = await new RedisContainer('redis').start();
  const redisClient = new Redis(container.getConnectionUrl());
  return { redisClient, container };
}
