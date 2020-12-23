import { ViewerContext } from '@expo/entity';
import {
  EntityDatabaseAdapterCheckConstraintError,
  EntityDatabaseAdapterExclusionConstraintError,
  EntityDatabaseAdapterForeignKeyConstraintError,
  EntityDatabaseAdapterNotNullConstraintError,
  EntityDatabaseAdapterTransientError,
  EntityDatabaseAdapterUniqueConstraintError,
  EntityDatabaseAdapterUnknownError,
} from '@expo/entity/build/errors/EntityDatabaseAdapterError';
import Knex from 'knex';

import ErrorsTestEntity from '../testfixtures/ErrorsTestEntity';
import { createKnexIntegrationTestEntityCompanionProvider } from '../testfixtures/createKnexIntegrationTestEntityCompanionProvider';

describe('postgres errors', () => {
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
    await ErrorsTestEntity.createOrTruncatePostgresTable(knexInstance);
  });

  afterAll(async () => {
    await ErrorsTestEntity.dropPostgresTable(knexInstance);
    await knexInstance.destroy();
  });

  it('throws EntityDatabaseAdapterTransientError on Knex timeout', async () => {
    const vc = new ViewerContext(createKnexIntegrationTestEntityCompanionProvider(knexInstance));
    await ErrorsTestEntity.creator(vc)
      .setField('id', 1)
      .setField('fieldNonNull', 'hello')
      .enforceCreateAsync();

    const shortTimeoutKnexInstance = Knex({
      client: 'pg',
      connection: {
        user: process.env.PGUSER,
        password: process.env.PGPASSWORD,
        host: 'localhost',
        port: parseInt(process.env.PGPORT!, 10),
        database: process.env.PGDATABASE,
      },
      acquireConnectionTimeout: 1,
    });
    const vc2 = new ViewerContext(
      createKnexIntegrationTestEntityCompanionProvider(shortTimeoutKnexInstance)
    );
    await expect(ErrorsTestEntity.loader(vc2).enforcing().loadByIDAsync(1)).rejects.toThrow(
      EntityDatabaseAdapterTransientError
    );
    await shortTimeoutKnexInstance.destroy();
  });

  it('throws EntityDatabaseAdapterNotNullConstraintError when not null is violated', async () => {
    const vc = new ViewerContext(createKnexIntegrationTestEntityCompanionProvider(knexInstance));
    await expect(
      ErrorsTestEntity.creator(vc)
        .setField('id', 1)
        .setField('fieldNonNull', null as any)
        .enforceCreateAsync()
    ).rejects.toThrow(EntityDatabaseAdapterNotNullConstraintError);
  });

  it('throws EntityDatabaseAdapterForeignKeyConstraintError when foreign key is violated', async () => {
    const vc = new ViewerContext(createKnexIntegrationTestEntityCompanionProvider(knexInstance));
    await expect(
      ErrorsTestEntity.creator(vc)
        .setField('id', 1)
        .setField('fieldNonNull', 'hello')
        .setField('fieldForeignKey', 2)
        .enforceCreateAsync()
    ).rejects.toThrow(EntityDatabaseAdapterForeignKeyConstraintError);
  });

  it('throws EntityDatabaseAdapterUniqueConstraintError when primary key unique constraint is violated', async () => {
    const vc = new ViewerContext(createKnexIntegrationTestEntityCompanionProvider(knexInstance));

    await ErrorsTestEntity.creator(vc)
      .setField('id', 1)
      .setField('fieldNonNull', 'hello')
      .enforceCreateAsync();

    await expect(
      ErrorsTestEntity.creator(vc)
        .setField('id', 1)
        .setField('fieldNonNull', 'hello')
        .enforceCreateAsync()
    ).rejects.toThrow(EntityDatabaseAdapterUniqueConstraintError);
  });

  it('throws EntityDatabaseAdapterUniqueConstraintError when unique constraint is violated', async () => {
    const vc = new ViewerContext(createKnexIntegrationTestEntityCompanionProvider(knexInstance));
    await ErrorsTestEntity.creator(vc)
      .setField('id', 2)
      .setField('fieldNonNull', 'hello')
      .setField('fieldUnique', 'hello')
      .enforceCreateAsync();

    await expect(
      ErrorsTestEntity.creator(vc)
        .setField('id', 1)
        .setField('fieldNonNull', 'hello')
        .setField('fieldUnique', 'hello')
        .enforceCreateAsync()
    ).rejects.toThrow(EntityDatabaseAdapterUniqueConstraintError);
  });

  it('throws EntityDatabaseAdapterCheckConstraintError when check constraint is violated', async () => {
    const vc = new ViewerContext(createKnexIntegrationTestEntityCompanionProvider(knexInstance));
    await expect(
      ErrorsTestEntity.creator(vc)
        .setField('id', 1)
        .setField('fieldNonNull', 'hello')
        .setField('checkLessThan5', 2)
        .enforceCreateAsync()
    ).resolves.toBeTruthy();

    await expect(
      ErrorsTestEntity.creator(vc)
        .setField('id', 2)
        .setField('fieldNonNull', 'hello')
        .setField('checkLessThan5', 10)
        .enforceCreateAsync()
    ).rejects.toThrow(EntityDatabaseAdapterCheckConstraintError);
  });

  it('throws EntityDatabaseAdapterExclusionConstraintError when exclusion constraint is violated', async () => {
    const vc = new ViewerContext(createKnexIntegrationTestEntityCompanionProvider(knexInstance));
    await expect(
      ErrorsTestEntity.creator(vc)
        .setField('id', 1)
        .setField('fieldNonNull', 'hello')
        .setField('fieldExclusion', 'what')
        .enforceCreateAsync()
    ).resolves.toBeTruthy();

    await expect(
      ErrorsTestEntity.creator(vc)
        .setField('id', 2)
        .setField('fieldNonNull', 'hello')
        .setField('fieldExclusion', 'what')
        .enforceCreateAsync()
    ).rejects.toThrow(EntityDatabaseAdapterExclusionConstraintError);
  });

  it('throws EntityDatabaseAdapterUnknownError otherwise', async () => {
    const vc = new ViewerContext(createKnexIntegrationTestEntityCompanionProvider(knexInstance));
    await expect(
      ErrorsTestEntity.creator(vc)
        .setField('id', 1)
        .setField('fieldNonNull', 'hello')
        .setField('nonExistentColumn', 'what')
        .enforceCreateAsync()
    ).rejects.toThrow(EntityDatabaseAdapterUnknownError);
  });
});