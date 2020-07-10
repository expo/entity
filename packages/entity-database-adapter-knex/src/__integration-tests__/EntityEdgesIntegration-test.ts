import {
  EntityPrivacyPolicy,
  ViewerContext,
  AlwaysAllowPrivacyPolicyRule,
  Entity,
  EntityCompanionDefinition,
  EntityConfiguration,
  DatabaseAdapterFlavor,
  CacheAdapterFlavor,
  UUIDField,
  EntityEdgeDeletionBehavior,
} from '@expo/entity';
import Knex from 'knex';

import { createKnexIntegrationTestEntityCompanionProvider } from '../testfixtures/createKnexIntegrationTestEntityCompanionProvider';

interface ParentFields {
  id: string;
}

interface ChildFields {
  id: string;
  parent_id: string;
}

class TestEntityPrivacyPolicy extends EntityPrivacyPolicy<any, string, ViewerContext, any, any> {
  protected readonly readRules = [new AlwaysAllowPrivacyPolicyRule()];
  protected readonly createRules = [new AlwaysAllowPrivacyPolicyRule()];
  protected readonly updateRules = [new AlwaysAllowPrivacyPolicyRule()];
  protected readonly deleteRules = [new AlwaysAllowPrivacyPolicyRule()];
}

class ParentEntity extends Entity<ParentFields, string, ViewerContext> {
  static getCompanionDefinition(): EntityCompanionDefinition<
    ParentFields,
    string,
    ViewerContext,
    ParentEntity,
    TestEntityPrivacyPolicy
  > {
    return parentEntityCompanion;
  }
}

class ChildEntity extends Entity<ChildFields, string, ViewerContext> {
  static getCompanionDefinition(): EntityCompanionDefinition<
    ChildFields,
    string,
    ViewerContext,
    ChildEntity,
    TestEntityPrivacyPolicy
  > {
    return childEntityCompanion;
  }
}

const parentEntityConfiguration = new EntityConfiguration<ParentFields>({
  idField: 'id',
  tableName: 'parents',
  inboundEdgeEntities: [ChildEntity],
  schema: {
    id: new UUIDField({
      columnName: 'id',
      cache: true,
    }),
  },
  databaseAdapterFlavor: DatabaseAdapterFlavor.POSTGRES,
  cacheAdapterFlavor: CacheAdapterFlavor.REDIS,
});

const childEntityConfiguration = new EntityConfiguration<ChildFields>({
  idField: 'id',
  tableName: 'children',
  schema: {
    id: new UUIDField({
      columnName: 'id',
      cache: true,
    }),
    parent_id: new UUIDField({
      columnName: 'parent_id',
      cache: true,
      association: {
        associatedEntityClass: ParentEntity,
        edgeDeletionBehavior: EntityEdgeDeletionBehavior.INVALIDATE_CACHE,
      },
    }),
  },
  databaseAdapterFlavor: DatabaseAdapterFlavor.POSTGRES,
  cacheAdapterFlavor: CacheAdapterFlavor.REDIS,
});

const parentEntityCompanion = new EntityCompanionDefinition({
  entityClass: ParentEntity,
  entityConfiguration: parentEntityConfiguration,
  privacyPolicyClass: TestEntityPrivacyPolicy,
});

const childEntityCompanion = new EntityCompanionDefinition({
  entityClass: ChildEntity,
  entityConfiguration: childEntityConfiguration,
  privacyPolicyClass: TestEntityPrivacyPolicy,
});

async function createOrTruncatePostgresTables(knex: Knex): Promise<void> {
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"'); // for uuid_generate_v4()

  await knex.schema.createTable('parents', (table) => {
    table.uuid('id').defaultTo(knex.raw('uuid_generate_v4()')).primary();
  });
  await knex.into('parents').truncate();

  await knex.schema.createTable('children', (table) => {
    table.uuid('id').defaultTo(knex.raw('uuid_generate_v4()')).primary();
    table.uuid('parent_id').references('id').inTable('parents').onDelete('cascade').unique();
  });
  await knex.into('children').truncate();
}

async function dropPostgresTable(knex: Knex): Promise<void> {
  if (await knex.schema.hasTable('children')) {
    await knex.schema.dropTable('children');
  }
  if (await knex.schema.hasTable('parents')) {
    await knex.schema.dropTable('parents');
  }
}

describe('EntityMutator.processEntityDeletionForInboundEdgesAsync', () => {
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
    await createOrTruncatePostgresTables(knexInstance);
  });

  afterAll(async () => {
    await dropPostgresTable(knexInstance);
    knexInstance.destroy();
  });

  describe('EntityEdgeDeletionBehavior.INVALIDATE_CACHE', () => {
    it('invalidates the cache', async () => {
      const viewerContext = new ViewerContext(
        createKnexIntegrationTestEntityCompanionProvider(knexInstance)
      );

      const parent = await ParentEntity.creator(viewerContext).enforceCreateAsync();
      const child = await ChildEntity.creator(viewerContext)
        .setField('parent_id', parent.getID())
        .enforceCreateAsync();

      await expect(
        ParentEntity.loader(viewerContext).enforcing().loadByIDNullableAsync(parent.getID())
      ).resolves.not.toBeNull();
      await expect(
        ChildEntity.loader(viewerContext)
          .enforcing()
          .loadByFieldEqualingAsync('parent_id', parent.getID())
      ).resolves.not.toBeNull();

      await ParentEntity.enforceDeleteAsync(parent);

      await expect(
        ParentEntity.loader(viewerContext).enforcing().loadByIDNullableAsync(parent.getID())
      ).resolves.toBeNull();

      await expect(
        ChildEntity.loader(viewerContext).enforcing().loadByIDNullableAsync(child.getID())
      ).resolves.toBeNull();
    });
  });
});
