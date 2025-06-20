import { ViewerContext } from '@expo/entity';
import { enforceAsyncResult } from '@expo/results';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import { knex, Knex } from 'knex';
import nullthrows from 'nullthrows';

import InvalidTestEntity from '../__testfixtures__/InvalidTestEntity';
import { createKnexIntegrationTestEntityCompanionProvider } from '../__testfixtures__/createKnexIntegrationTestEntityCompanionProvider';

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
    await InvalidTestEntity.createOrTruncatePostgresTableAsync(knexInstance);
  });

  afterAll(async () => {
    await InvalidTestEntity.dropPostgresTableAsync(knexInstance);
    await knexInstance.destroy();
  });

  describe('invalid operation result counts', () => {
    it('throws after deletion of multiple rows or no rows', async () => {
      const vc = new ViewerContext(createKnexIntegrationTestEntityCompanionProvider(knexInstance));
      const entity1 = await enforceAsyncResult(
        InvalidTestEntity.creatorWithAuthorizationResults(vc)
          .setField('id', 1)
          .setField('name', 'hello')
          .createAsync(),
      );
      await enforceAsyncResult(
        InvalidTestEntity.creatorWithAuthorizationResults(vc)
          .setField('id', 1)
          .setField('name', 'world')
          .createAsync(),
      );

      await expect(InvalidTestEntity.deleter(entity1).deleteAsync()).rejects.toThrowError(
        'Excessive deletions from database adapter delete',
      );
    });

    it('throws after update of multiple rows', async () => {
      const vc = new ViewerContext(createKnexIntegrationTestEntityCompanionProvider(knexInstance));
      const entity1 = await enforceAsyncResult(
        InvalidTestEntity.creatorWithAuthorizationResults(vc)
          .setField('id', 1)
          .setField('name', 'hello')
          .createAsync(),
      );
      await enforceAsyncResult(
        InvalidTestEntity.creatorWithAuthorizationResults(vc)
          .setField('id', 1)
          .setField('name', 'world')
          .createAsync(),
      );

      await expect(
        InvalidTestEntity.updater(entity1).setField('name', 'blah').updateAsync(),
      ).rejects.toThrowError('Excessive results from database adapter update');
    });

    it('throws after update of no rows', async () => {
      const vc = new ViewerContext(createKnexIntegrationTestEntityCompanionProvider(knexInstance));
      const entity1 = await enforceAsyncResult(
        InvalidTestEntity.creatorWithAuthorizationResults(vc)
          .setField('id', 1)
          .setField('name', 'hello')
          .createAsync(),
      );
      await InvalidTestEntity.deleter(entity1).deleteAsync();

      await expect(
        InvalidTestEntity.updater(entity1).setField('name', 'blah').updateAsync(),
      ).rejects.toThrowError('Empty results from database adapter update');
    });
  });
});
