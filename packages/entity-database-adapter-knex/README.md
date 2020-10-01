# `@expo/entity-database-adapter-knex`

[Knex](http://knexjs.org/) database adapter for `@expo/entity`. Currently only used with Postgres client.

[Documentation](https://expo.github.io/entity/modules/_expo_entity_database_adapter_knex.html)

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