import { ViewerContext } from '@expo/entity';
import { enforceAsyncResult } from '@expo/results';
import { knex, Knex } from 'knex';
import nullthrows from 'nullthrows';

import InvalidTestEntity from '../testfixtures/InvalidTestEntity';
import { createKnexIntegrationTestEntityCompanionProvider } from '../testfixtures/createKnexIntegrationTestEntityCompanionProvider';

describe('postgres entity integration', () => {
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
    await InvalidTestEntity.createOrTruncatePostgresTable(knexInstance);
  });

  afterAll(async () => {
    await InvalidTestEntity.dropPostgresTable(knexInstance);
    await knexInstance.destroy();
  });

  describe('invalid operation result counts', () => {
    it('throws after deletion of multiple rows or no rows', async () => {
      const vc = new ViewerContext(createKnexIntegrationTestEntityCompanionProvider(knexInstance));
      const entity1 = await enforceAsyncResult(
        InvalidTestEntity.creator(
          vc,
          vc.getNonTransactionalQueryContextForDatabaseAdaptorFlavor('postgres')
        )
          .setField('id', 1)
          .setField('name', 'hello')
          .createAsync()
      );
      await enforceAsyncResult(
        InvalidTestEntity.creator(
          vc,
          vc.getNonTransactionalQueryContextForDatabaseAdaptorFlavor('postgres')
        )
          .setField('id', 1)
          .setField('name', 'world')
          .createAsync()
      );

      await expect(
        InvalidTestEntity.deleteAsync(
          entity1,
          vc.getNonTransactionalQueryContextForDatabaseAdaptorFlavor('postgres')
        )
      ).rejects.toThrowError('Excessive deletions from database adapter delete');
    });

    it('throws after update of multiple rows', async () => {
      const vc = new ViewerContext(createKnexIntegrationTestEntityCompanionProvider(knexInstance));
      const entity1 = await enforceAsyncResult(
        InvalidTestEntity.creator(
          vc,
          vc.getNonTransactionalQueryContextForDatabaseAdaptorFlavor('postgres')
        )
          .setField('id', 1)
          .setField('name', 'hello')
          .createAsync()
      );
      await enforceAsyncResult(
        InvalidTestEntity.creator(
          vc,
          vc.getNonTransactionalQueryContextForDatabaseAdaptorFlavor('postgres')
        )
          .setField('id', 1)
          .setField('name', 'world')
          .createAsync()
      );

      await expect(
        InvalidTestEntity.updater(
          entity1,
          vc.getNonTransactionalQueryContextForDatabaseAdaptorFlavor('postgres')
        )
          .setField('name', 'blah')
          .enforceUpdateAsync()
      ).rejects.toThrowError('Excessive results from database adapter update');
    });

    it('throws after update of no rows', async () => {
      const vc = new ViewerContext(createKnexIntegrationTestEntityCompanionProvider(knexInstance));
      const entity1 = await enforceAsyncResult(
        InvalidTestEntity.creator(
          vc,
          vc.getNonTransactionalQueryContextForDatabaseAdaptorFlavor('postgres')
        )
          .setField('id', 1)
          .setField('name', 'hello')
          .createAsync()
      );
      await InvalidTestEntity.deleteAsync(
        entity1,
        vc.getNonTransactionalQueryContextForDatabaseAdaptorFlavor('postgres')
      );

      await expect(
        InvalidTestEntity.updater(
          entity1,
          vc.getNonTransactionalQueryContextForDatabaseAdaptorFlavor('postgres')
        )
          .setField('name', 'blah')
          .enforceUpdateAsync()
      ).rejects.toThrowError('Empty results from database adapter update');
    });
  });
});
