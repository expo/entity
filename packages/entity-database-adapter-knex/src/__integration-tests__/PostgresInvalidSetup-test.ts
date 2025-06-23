import { ViewerContext } from '@expo/entity';
import { enforceAsyncResult } from '@expo/results';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';

import { type Knex, type StartedPostgreSqlContainer, startPostgresAsync } from './testcontainer';
import { InvalidTestEntity } from '../__testfixtures__/InvalidTestEntity';
import { createKnexIntegrationTestEntityCompanionProvider } from '../__testfixtures__/createKnexIntegrationTestEntityCompanionProvider';

describe('postgres entity integration', () => {
  let container: StartedPostgreSqlContainer;
  let knexInstance: Knex;

  beforeAll(async () => {
    ({ container, knexInstance } = await startPostgresAsync());
  });

  beforeEach(async () => {
    await InvalidTestEntity.createOrTruncatePostgresTableAsync(knexInstance);
  });

  afterAll(async () => {
    await knexInstance.destroy();
    await container.stop();
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

      await expect(InvalidTestEntity.deleter(entity1).deleteAsync()).rejects.toThrow(
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
      ).rejects.toThrow('Excessive results from database adapter update');
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
      ).rejects.toThrow('Empty results from database adapter update');
    });
  });
});
