import {
  EntityDatabaseAdapterCheckConstraintError,
  EntityDatabaseAdapterExclusionConstraintError,
  EntityDatabaseAdapterForeignKeyConstraintError,
  EntityDatabaseAdapterNotNullConstraintError,
  EntityDatabaseAdapterTransientError,
  EntityDatabaseAdapterUniqueConstraintError,
  EntityDatabaseAdapterUnknownError,
  ViewerContext,
} from '@expo/entity';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import { knex, Knex } from 'knex';
import nullthrows from 'nullthrows';

import { ErrorsTestEntity } from '../__testfixtures__/ErrorsTestEntity';
import { createKnexIntegrationTestEntityCompanionProvider } from '../__testfixtures__/createKnexIntegrationTestEntityCompanionProvider';

describe('postgres errors', () => {
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
    await ErrorsTestEntity.createOrTruncatePostgresTableAsync(knexInstance);
  });

  afterAll(async () => {
    await ErrorsTestEntity.dropPostgresTableAsync(knexInstance);
    await knexInstance.destroy();
  });

  it('throws EntityDatabaseAdapterTransientError on Knex timeout', async () => {
    const vc = new ViewerContext(createKnexIntegrationTestEntityCompanionProvider(knexInstance));
    await ErrorsTestEntity.creator(vc)
      .setField('id', 1)
      .setField('fieldNonNull', 'hello')
      .createAsync();

    const shortTimeoutKnexInstance = knex({
      client: 'pg',
      connection: {
        user: nullthrows(process.env['PGUSER']),
        password: nullthrows(process.env['PGPASSWORD']),
        host: 'localhost',
        port: parseInt(nullthrows(process.env['PGPORT']), 10),
        database: nullthrows(process.env['PGDATABASE']),
      },
      acquireConnectionTimeout: 1,
    });
    const vc2 = new ViewerContext(
      createKnexIntegrationTestEntityCompanionProvider(shortTimeoutKnexInstance),
    );
    await expect(ErrorsTestEntity.loader(vc2).loadByIDAsync(1)).rejects.toThrow(
      EntityDatabaseAdapterTransientError,
    );
    await shortTimeoutKnexInstance.destroy();
  });

  it('throws EntityDatabaseAdapterNotNullConstraintError when not null is violated', async () => {
    const vc = new ViewerContext(createKnexIntegrationTestEntityCompanionProvider(knexInstance));
    await expect(
      ErrorsTestEntity.creator(vc)
        .setField('id', 1)
        .setField('fieldNonNull', null as any)
        .createAsync(),
    ).rejects.toThrow(EntityDatabaseAdapterNotNullConstraintError);
  });

  it('throws EntityDatabaseAdapterForeignKeyConstraintError when foreign key is violated', async () => {
    const vc = new ViewerContext(createKnexIntegrationTestEntityCompanionProvider(knexInstance));
    await expect(
      ErrorsTestEntity.creator(vc)
        .setField('id', 1)
        .setField('fieldNonNull', 'hello')
        .setField('fieldForeignKey', 2)
        .createAsync(),
    ).rejects.toThrow(EntityDatabaseAdapterForeignKeyConstraintError);
  });

  it('throws EntityDatabaseAdapterUniqueConstraintError when primary key unique constraint is violated', async () => {
    const vc = new ViewerContext(createKnexIntegrationTestEntityCompanionProvider(knexInstance));

    await ErrorsTestEntity.creator(vc)
      .setField('id', 1)
      .setField('fieldNonNull', 'hello')
      .createAsync();

    await expect(
      ErrorsTestEntity.creator(vc)
        .setField('id', 1)
        .setField('fieldNonNull', 'hello')
        .createAsync(),
    ).rejects.toThrow(EntityDatabaseAdapterUniqueConstraintError);
  });

  it('throws EntityDatabaseAdapterUniqueConstraintError when unique constraint is violated', async () => {
    const vc = new ViewerContext(createKnexIntegrationTestEntityCompanionProvider(knexInstance));
    await ErrorsTestEntity.creator(vc)
      .setField('id', 2)
      .setField('fieldNonNull', 'hello')
      .setField('fieldUnique', 'hello')
      .createAsync();

    await expect(
      ErrorsTestEntity.creator(vc)
        .setField('id', 1)
        .setField('fieldNonNull', 'hello')
        .setField('fieldUnique', 'hello')
        .createAsync(),
    ).rejects.toThrow(EntityDatabaseAdapterUniqueConstraintError);
  });

  it('throws EntityDatabaseAdapterCheckConstraintError when check constraint is violated', async () => {
    const vc = new ViewerContext(createKnexIntegrationTestEntityCompanionProvider(knexInstance));
    await expect(
      ErrorsTestEntity.creator(vc)
        .setField('id', 1)
        .setField('fieldNonNull', 'hello')
        .setField('checkLessThan5', 2)
        .createAsync(),
    ).resolves.toBeTruthy();

    await expect(
      ErrorsTestEntity.creator(vc)
        .setField('id', 2)
        .setField('fieldNonNull', 'hello')
        .setField('checkLessThan5', 10)
        .createAsync(),
    ).rejects.toThrow(EntityDatabaseAdapterCheckConstraintError);
  });

  it('throws EntityDatabaseAdapterExclusionConstraintError when exclusion constraint is violated', async () => {
    const vc = new ViewerContext(createKnexIntegrationTestEntityCompanionProvider(knexInstance));
    await expect(
      ErrorsTestEntity.creator(vc)
        .setField('id', 1)
        .setField('fieldNonNull', 'hello')
        .setField('fieldExclusion', 'what')
        .createAsync(),
    ).resolves.toBeTruthy();

    await expect(
      ErrorsTestEntity.creator(vc)
        .setField('id', 2)
        .setField('fieldNonNull', 'hello')
        .setField('fieldExclusion', 'what')
        .createAsync(),
    ).rejects.toThrow(EntityDatabaseAdapterExclusionConstraintError);
  });

  it('throws EntityDatabaseAdapterUnknownError otherwise', async () => {
    const vc = new ViewerContext(createKnexIntegrationTestEntityCompanionProvider(knexInstance));
    await expect(
      ErrorsTestEntity.creator(vc)
        .setField('id', 1)
        .setField('fieldNonNull', 'hello')
        .setField('nonExistentColumn', 'what')
        .createAsync(),
    ).rejects.toThrow(EntityDatabaseAdapterUnknownError);
  });
});
