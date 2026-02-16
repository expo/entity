import { createWithUniqueConstraintRecoveryAsync, ViewerContext } from '@expo/entity';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import knex, { Knex } from 'knex';
import nullthrows from 'nullthrows';

import { PostgresUniqueTestEntity } from '../__testfixtures__/PostgresUniqueTestEntity';
import { createKnexIntegrationTestEntityCompanionProvider } from '../__testfixtures__/createKnexIntegrationTestEntityCompanionProvider';

describe(createWithUniqueConstraintRecoveryAsync, () => {
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

  describe.each([true, false])('is parallel creations %p', (parallel) => {
    it('recovers when the same entity is created twice outside of transaction', async () => {
      const vc1 = new ViewerContext(createKnexIntegrationTestEntityCompanionProvider(knexInstance));

      const args = {
        name: 'unique',
      };

      let createdEntities: [PostgresUniqueTestEntity, PostgresUniqueTestEntity];
      if (parallel) {
        createdEntities = await Promise.all([
          createWithUniqueConstraintRecoveryAsync(
            vc1,
            PostgresUniqueTestEntity,
            PostgresUniqueTestEntity.getByNameAsync,
            args,
            PostgresUniqueTestEntity.createWithNameAsync,
            args,
          ),
          createWithUniqueConstraintRecoveryAsync(
            vc1,
            PostgresUniqueTestEntity,
            PostgresUniqueTestEntity.getByNameAsync,
            args,
            PostgresUniqueTestEntity.createWithNameAsync,
            args,
          ),
        ]);
      } else {
        createdEntities = [
          await createWithUniqueConstraintRecoveryAsync(
            vc1,
            PostgresUniqueTestEntity,
            PostgresUniqueTestEntity.getByNameAsync,
            args,
            PostgresUniqueTestEntity.createWithNameAsync,
            args,
          ),
          await createWithUniqueConstraintRecoveryAsync(
            vc1,
            PostgresUniqueTestEntity,
            PostgresUniqueTestEntity.getByNameAsync,
            args,
            PostgresUniqueTestEntity.createWithNameAsync,
            args,
          ),
        ];
      }

      expect(createdEntities[0].getID()).toEqual(createdEntities[1].getID());
    });

    it('recovers when the same entity is created twice within same transaction', async () => {
      const vc1 = new ViewerContext(createKnexIntegrationTestEntityCompanionProvider(knexInstance));

      const args = {
        name: 'unique',
      };

      const createdEntities = await vc1.runInTransactionForDatabaseAdaptorFlavorAsync(
        'postgres',
        async (queryContext) => {
          if (parallel) {
            return await Promise.all([
              createWithUniqueConstraintRecoveryAsync(
                vc1,
                PostgresUniqueTestEntity,
                PostgresUniqueTestEntity.getByNameAsync,
                args,
                PostgresUniqueTestEntity.createWithNameAsync,
                args,
                queryContext,
              ),
              createWithUniqueConstraintRecoveryAsync(
                vc1,
                PostgresUniqueTestEntity,
                PostgresUniqueTestEntity.getByNameAsync,
                args,
                PostgresUniqueTestEntity.createWithNameAsync,
                args,
                queryContext,
              ),
            ]);
          } else {
            return [
              await createWithUniqueConstraintRecoveryAsync(
                vc1,
                PostgresUniqueTestEntity,
                PostgresUniqueTestEntity.getByNameAsync,
                args,
                PostgresUniqueTestEntity.createWithNameAsync,
                args,
                queryContext,
              ),
              await createWithUniqueConstraintRecoveryAsync(
                vc1,
                PostgresUniqueTestEntity,
                PostgresUniqueTestEntity.getByNameAsync,
                args,
                PostgresUniqueTestEntity.createWithNameAsync,
                args,
                queryContext,
              ),
            ];
          }
        },
      );

      expect(nullthrows(createdEntities[0]).getID()).toEqual(
        nullthrows(createdEntities[1]).getID(),
      );
    });

    it('recovers when the same entity is created twice within two transactions', async () => {
      const vc1 = new ViewerContext(createKnexIntegrationTestEntityCompanionProvider(knexInstance));

      const args = {
        name: 'unique',
      };

      let createdEntities: [PostgresUniqueTestEntity, PostgresUniqueTestEntity];
      if (parallel) {
        createdEntities = await Promise.all([
          vc1.runInTransactionForDatabaseAdaptorFlavorAsync('postgres', async (queryContext) => {
            return await createWithUniqueConstraintRecoveryAsync(
              vc1,
              PostgresUniqueTestEntity,
              PostgresUniqueTestEntity.getByNameAsync,
              args,
              PostgresUniqueTestEntity.createWithNameAsync,
              args,
              queryContext,
            );
          }),
          vc1.runInTransactionForDatabaseAdaptorFlavorAsync('postgres', async (queryContext) => {
            return await createWithUniqueConstraintRecoveryAsync(
              vc1,
              PostgresUniqueTestEntity,
              PostgresUniqueTestEntity.getByNameAsync,
              args,
              PostgresUniqueTestEntity.createWithNameAsync,
              args,
              queryContext,
            );
          }),
        ]);
      } else {
        createdEntities = [
          await vc1.runInTransactionForDatabaseAdaptorFlavorAsync(
            'postgres',
            async (queryContext) => {
              return await createWithUniqueConstraintRecoveryAsync(
                vc1,
                PostgresUniqueTestEntity,
                PostgresUniqueTestEntity.getByNameAsync,
                args,
                PostgresUniqueTestEntity.createWithNameAsync,
                args,
                queryContext,
              );
            },
          ),
          await vc1.runInTransactionForDatabaseAdaptorFlavorAsync(
            'postgres',
            async (queryContext) => {
              return await createWithUniqueConstraintRecoveryAsync(
                vc1,
                PostgresUniqueTestEntity,
                PostgresUniqueTestEntity.getByNameAsync,
                args,
                PostgresUniqueTestEntity.createWithNameAsync,
                args,
                queryContext,
              );
            },
          ),
        ];
      }

      expect(nullthrows(createdEntities[0]).getID()).toEqual(
        nullthrows(createdEntities[1]).getID(),
      );
    });
  });
});
