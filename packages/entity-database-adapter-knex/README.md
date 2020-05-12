# @expo/entity-database-adapter-knex

[http://knexjs.org/](Knex) database adapter for @expo/entity. Currently only used with Postgres client.

## Usage

During `EntityCompanionProvider` instantiation:

```typescript
import Knex from 'knex';

const knexInstance = Knex({
  client: 'pg',
  connection: {
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    host: process.env.PGHOST,
    port: parseInt(process.env.PGPORT!, 10),
    database: process.env.PGDATABASE,
  },
});

export const createDefaultEntityCompanionProvider = (
  metricsAdapter: IEntityMetricsAdapter = new NoOpEntityMetricsAdapter()
): EntityCompanionProvider => {
  return new EntityCompanionProvider(
    metricsAdapter,
    {
      // add the knex database adapter flavor
      [DatabaseAdapterFlavor.POSTGRES]: {
        adapter: PostgresEntityDatabaseAdapter,
        queryContextProvider: new PostgresEntityQueryContextProvider(knexInstance),
      },
    },
    {
      ...
    }
  );
};
```