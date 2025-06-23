import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { knex, Knex } from 'knex';

export type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
export type { Knex } from 'knex';

export function containerKnex(container: StartedPostgreSqlContainer, options?: Knex.Config): Knex {
  return knex({
    client: 'pg',
    connection: {
      connectionString: container.getConnectionUri(),
    },
    ...options,
  });
}

export async function startPostgresAsync(): Promise<{
  knexInstance: Knex;
  container: StartedPostgreSqlContainer;
}> {
  const container = await new PostgreSqlContainer('postgres:14').start();
  const knexInstance = containerKnex(container);
  return { container, knexInstance };
}
