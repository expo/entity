import { ViewerContext } from '@expo/entity';
import { enforceAsyncResult } from '@expo/results';
import Knex from 'knex';

import InvalidTestEntity from '../testfixtures/InvalidTestEntity';
import { createKnexIntegrationTestEntityCompanionProvider } from '../testfixtures/createKnexIntegrationTestEntityCompanionProvider';

describe('postgres entity integration', () => {
  let knexInstance: Knex;

  beforeAll(() => {
    knexInstance = Knex({
      client: 'pg',
      connection: {
        user: process.env.PGUSER,
        password: process.env.PGPASSWORD,
        host: 'localhost',
        port: parseInt(process.env.PGPORT!, 10),
        database: process.env.PGDATABASE,
      },
    });
  });

  beforeEach(async () => {
    await InvalidTestEntity.createOrTruncatePostgresTable(knexInstance);
  });

  afterAll(async () => {
    await InvalidTestEntity.dropPostgresTable(knexInstance);
    knexInstance.destroy();
  });

  describe('invalid operation result counts', () => {
    it('throws after deletion of multiple rows or no rows', async () => {
      const vc = new ViewerContext(createKnexIntegrationTestEntityCompanionProvider(knexInstance));
      const entity1 = await enforceAsyncResult(
        InvalidTestEntity.creator(vc).setField('id', 1).setField('name', 'hello').createAsync()
      );
      await enforceAsyncResult(
        InvalidTestEntity.creator(vc).setField('id', 1).setField('name', 'world').createAsync()
      );

      await expect(InvalidTestEntity.deleteAsync(entity1)).rejects.toThrowError(
        'Excessive deletions from database adapter delete'
      );
    });

    it('throws after update of multiple rows', async () => {
      const vc = new ViewerContext(createKnexIntegrationTestEntityCompanionProvider(knexInstance));
      const entity1 = await enforceAsyncResult(
        InvalidTestEntity.creator(vc).setField('id', 1).setField('name', 'hello').createAsync()
      );
      await enforceAsyncResult(
        InvalidTestEntity.creator(vc).setField('id', 1).setField('name', 'world').createAsync()
      );

      await expect(
        InvalidTestEntity.updater(entity1).setField('name', 'blah').enforceUpdateAsync()
      ).rejects.toThrowError('Excessive results from database adapter update');
    });

    it('throws after update of no rows', async () => {
      const vc = new ViewerContext(createKnexIntegrationTestEntityCompanionProvider(knexInstance));
      const entity1 = await enforceAsyncResult(
        InvalidTestEntity.creator(vc).setField('id', 1).setField('name', 'hello').createAsync()
      );
      await InvalidTestEntity.deleteAsync(entity1);

      await expect(
        InvalidTestEntity.updater(entity1).setField('name', 'blah').enforceUpdateAsync()
      ).rejects.toThrowError('Empty results from database adapter update');
    });
  });
});
