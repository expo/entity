import { ViewerContext } from '@expo/entity';
import { knex, Knex } from 'knex';
import nullthrows from 'nullthrows';

import PostgresEntityQueryContextProvider from '../PostgresEntityQueryContextProvider';
import PostgresUniqueTestEntity from '../testfixtures/PostgresUniqueTestEntity';
import { createKnexIntegrationTestEntityCompanionProvider } from '../testfixtures/createKnexIntegrationTestEntityCompanionProvider';

describe(PostgresEntityQueryContextProvider, () => {
  let knexInstance: Knex;

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
  });

  beforeEach(async () => {
    await PostgresUniqueTestEntity.createOrTruncatePostgresTableAsync(knexInstance);
  });

  afterAll(async () => {
    await PostgresUniqueTestEntity.dropPostgresTableAsync(knexInstance);
    await knexInstance.destroy();
  });

  it('supports nested transactions', async () => {
    const vc1 = new ViewerContext(createKnexIntegrationTestEntityCompanionProvider(knexInstance));

    await PostgresUniqueTestEntity.creator(vc1).setField('name', 'unique').createAsync();

    const id = (
      await PostgresUniqueTestEntity.creator(vc1).setField('name', 'wat').createAsync()
    ).getID();

    await vc1.runInTransactionForDatabaseAdaptorFlavorAsync('postgres', async (queryContext) => {
      const entity = await PostgresUniqueTestEntity.loader(vc1, queryContext).loadByIDAsync(id);
      await PostgresUniqueTestEntity.updater(entity, queryContext)
        .setField('name', 'wat2')
        .updateAsync();

      // ensure the outer transaction is not aborted due to postgres error in inner transaction,
      // in this case the error triggered is a unique constraint violation
      try {
        await queryContext.runInNestedTransactionAsync(async (innerQueryContext) => {
          const entity = await PostgresUniqueTestEntity.loader(
            vc1,
            innerQueryContext,
          ).loadByIDAsync(id);
          await PostgresUniqueTestEntity.updater(entity, innerQueryContext)
            .setField('name', 'unique')
            .updateAsync();
        });
      } catch {}

      const entity2 = await PostgresUniqueTestEntity.loader(vc1, queryContext).loadByIDAsync(id);
      await PostgresUniqueTestEntity.updater(entity2, queryContext)
        .setField('name', 'wat3')
        .updateAsync();
    });

    const entityLoaded = await PostgresUniqueTestEntity.loader(vc1).loadByIDAsync(id);
    expect(entityLoaded.getField('name')).toEqual('wat3');
  });

  it('supports multi-nested transactions', async () => {
    const vc1 = new ViewerContext(createKnexIntegrationTestEntityCompanionProvider(knexInstance));

    const id = (
      await PostgresUniqueTestEntity.creator(vc1).setField('name', 'wat').createAsync()
    ).getID();

    await vc1.runInTransactionForDatabaseAdaptorFlavorAsync('postgres', async (queryContext) => {
      await queryContext.runInNestedTransactionAsync(async (innerQueryContext) => {
        await innerQueryContext.runInNestedTransactionAsync(async (innerQueryContex2) => {
          await innerQueryContex2.runInNestedTransactionAsync(async (innerQueryContex3) => {
            const entity = await PostgresUniqueTestEntity.loader(
              vc1,
              innerQueryContex3,
            ).loadByIDAsync(id);
            await PostgresUniqueTestEntity.updater(entity, innerQueryContex3)
              .setField('name', 'wat3')
              .updateAsync();
          });
        });
      });
    });

    const entityLoaded = await PostgresUniqueTestEntity.loader(vc1).loadByIDAsync(id);
    expect(entityLoaded.getField('name')).toEqual('wat3');
  });
});
